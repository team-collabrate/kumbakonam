import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@kumbakonam/shared";
import {
  getPairedPrinter,
  getPrinterName,
  isWebBluetoothSupported,
  printToDevice,
  requestPrinter,
  type PrinterConnection,
  type PrintEvent,
} from "../printing/webBluetoothPrinter";

export type PrinterStatus = "unsupported" | "checking" | "unpaired" | "connecting" | "ready" | "error";

/** Live numbers for the on-screen speed display — see PrintDiagnosticsOverlay.
 *  Recomputed from real bytes-sent-so-far / elapsed-so-far on every chunk,
 *  not from a fixed per-chunk time estimate, so it stays accurate even if
 *  printToDevice steps down to a smaller chunk size mid-receipt (see
 *  CHUNK_FALLBACKS in webBluetoothPrinter.ts). */
export interface PrintProgress {
  chunkIndex: number;
  bytesSent: number;
  totalBytes: number;
  elapsedMs: number;
  kbPerSec: number;
  /** null until at least one chunk has gone out — nothing to extrapolate from yet. */
  etaMs: number | null;
  /** How many times the printer has refused the current chunk size and
   *  forced a smaller one (see CHUNK_FALLBACKS in webBluetoothPrinter.ts).
   *  A print that's much slower than CHUNK_SIZE/CHUNK_DELAY_MS alone would
   *  predict is usually this — most of the receipt going out in much
   *  smaller pieces than configured, not the configured delay itself. */
  fallbackCount: number;
}

export interface UsePrinterResult {
  status: PrinterStatus;
  error: string | null;
  deviceName: string | null;
  /** Opens the browser's Bluetooth picker — must be called from a user gesture (e.g. a button onClick). */
  connect: () => Promise<void>;
  print: (data: Uint8Array) => Promise<boolean>;
  /** [PRINT START] / per-chunk / [COMPLETE] lines from the most recent print — cleared at the start of the next one. */
  printLogs: string[];
  /** null when nothing is printing (before the first print, and again once one finishes). */
  printProgress: PrintProgress | null;
}

const MESSAGES = {
  noDevice: { en: "No printer selected.", ta: "பிரிண்டர் தேர்ந்தெடுக்கப்படவில்லை." },
  connectFailed: { en: "Could not connect to the printer.", ta: "பிரிண்டரை இணைக்க முடியவில்லை." },
  printFailed: {
    en: "Printer not responding. Check it's on and in range, then try again.",
    ta: "பிரிண்டர் பதிலளிக்கவில்லை. அது இயங்குகிறதா, அருகில் உள்ளதா எனப் பார்த்து மீண்டும் முயற்சிக்கவும்.",
  },
};

/** How often chunk progress is allowed to trigger a re-render. At the
 *  current CHUNK_SIZE (128B) a real receipt is 300-400+ chunks — flushing
 *  React state on every single one would mean that many re-renders (and
 *  that many array-copying setPrintLogs calls) in the ~15-20s a print
 *  takes, which is a real jank risk on the exact low-end Android tablets
 *  this app targets. The full log is still captured immediately in
 *  logsRef; this only throttles how often the *screen* catches up to it,
 *  which is enough to still read as live. */
const UI_FLUSH_INTERVAL_MS = 150;

/** Bluetooth (BLE) pairing + ESC/POS printing, per TDD §6. */
export function usePrinter(): UsePrinterResult {
  const { language } = useLanguage();
  const [status, setStatus] = useState<PrinterStatus>("checking");
  const [error, setError] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [printLogs, setPrintLogs] = useState<string[]>([]);
  const [printProgress, setPrintProgress] = useState<PrintProgress | null>(null);
  const connectionRef = useRef<PrinterConnection | null>(null);
  const logsRef = useRef<string[]>([]);
  const lastFlushRef = useRef(0);
  const lastChunkIndexRef = useRef(0);
  const fallbackCountRef = useRef(0);

  useEffect(() => {
    if (!isWebBluetoothSupported()) {
      setStatus("unsupported");
      return;
    }
    getPairedPrinter()
      .then((connection) => {
        if (connection) {
          connectionRef.current = connection;
          setDeviceName(getPrinterName(connection));
          setStatus("ready");
        } else {
          setStatus("unpaired");
        }
      })
      .catch(() => setStatus("unpaired"));
  }, []);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    try {
      const connection = await requestPrinter();
      connectionRef.current = connection;
      setDeviceName(getPrinterName(connection));
      setStatus("ready");
    } catch (err) {
      console.error("Printer connect failed", err);
      // Dismissing the Bluetooth picker rejects with NotFoundError — that's a
      // deliberate cancel, not a fault, so it gets a calmer message.
      const cancelled = err instanceof Error && err.name === "NotFoundError";
      setError(cancelled ? MESSAGES.noDevice[language] : MESSAGES.connectFailed[language]);
      setStatus(connectionRef.current ? "ready" : "unpaired");
    }
  }, [language]);

  const print = useCallback(
    async (data: Uint8Array): Promise<boolean> => {
      if (!connectionRef.current) return false;

      logsRef.current = [`[PRINT START] Size: ${(data.length / 1024).toFixed(1)} KB`];
      lastFlushRef.current = 0;
      lastChunkIndexRef.current = 0;
      fallbackCountRef.current = 0;
      setPrintLogs(logsRef.current);
      setPrintProgress({
        chunkIndex: 0,
        bytesSent: 0,
        totalBytes: data.length,
        elapsedMs: 0,
        kbPerSec: 0,
        etaMs: null,
        fallbackCount: 0,
      });

      const onProgress = (event: PrintEvent) => {
        if (event.kind === "fallback") {
          fallbackCountRef.current += 1;
          logsRef.current.push(`[RETRY] ${event.fromSize}-byte write refused; falling back to ${event.toSize} bytes`);
          // Rare and diagnostically important — always flush immediately
          // rather than waiting for the next throttled tick, unlike the
          // routine per-chunk case below.
          lastFlushRef.current = performance.now();
          setPrintLogs([...logsRef.current]);
          setPrintProgress((prev) => (prev ? { ...prev, fallbackCount: fallbackCountRef.current } : prev));
          return;
        }

        lastChunkIndexRef.current = event.chunkIndex;
        logsRef.current.push(`Chunk ${event.chunkIndex}: ${event.chunkBytes} bytes sent`);

        const seconds = event.elapsedMs / 1000;
        const kbPerSec = seconds > 0 ? event.bytesSent / 1024 / seconds : 0;
        const remainingBytes = event.totalBytes - event.bytesSent;
        const etaMs = kbPerSec > 0 ? (remainingBytes / 1024 / kbPerSec) * 1000 : null;

        // Real-time, but throttled — see UI_FLUSH_INTERVAL_MS above. The
        // final chunk always flushes immediately regardless of the timer,
        // so the on-screen numbers never lag behind a print that already
        // finished.
        const now = performance.now();
        const isLastChunk = event.bytesSent >= event.totalBytes;
        if (isLastChunk || now - lastFlushRef.current >= UI_FLUSH_INTERVAL_MS) {
          lastFlushRef.current = now;
          setPrintLogs([...logsRef.current]);
          setPrintProgress({
            chunkIndex: event.chunkIndex,
            bytesSent: event.bytesSent,
            totalBytes: event.totalBytes,
            elapsedMs: event.elapsedMs,
            kbPerSec,
            etaMs,
            fallbackCount: fallbackCountRef.current,
          });
        }
      };

      try {
        // A dropped BLE link is re-established inside printToDevice, which
        // hands back fresh GATT objects — keep them or the next print
        // would reconnect all over again.
        const printStartedAt = performance.now();
        connectionRef.current = await printToDevice(connectionRef.current, data, onProgress);

        const elapsedMs = performance.now() - printStartedAt;
        const kbPerSec = elapsedMs > 0 ? data.length / 1024 / (elapsedMs / 1000) : 0;
        // fallbackCount, not chunk count, is the honest explanation when
        // this is much slower than CHUNK_SIZE/CHUNK_DELAY_MS alone would
        // predict — worth it right on the completion line, not just
        // buried in the per-event log above.
        logsRef.current.push(
          `[COMPLETE] ${data.length} bytes in ${Math.round(elapsedMs)}ms = ${kbPerSec.toFixed(1)} KB/s` +
            (fallbackCountRef.current > 0 ? ` (${fallbackCountRef.current} chunk-size fallback(s))` : ""),
        );
        setPrintLogs([...logsRef.current]);
        setPrintProgress({
          chunkIndex: lastChunkIndexRef.current,
          bytesSent: data.length,
          totalBytes: data.length,
          elapsedMs,
          kbPerSec,
          etaMs: 0,
          fallbackCount: fallbackCountRef.current,
        });
        return true;
      } catch (err) {
        console.error("Print failed", err);
        setError(MESSAGES.printFailed[language]);
        setStatus("error");
        logsRef.current.push(`[FAILED] ${err instanceof Error ? err.message : String(err)}`);
        setPrintLogs([...logsRef.current]);
        return false;
      }
    },
    [language],
  );

  return { status, error, deviceName, connect, print, printLogs, printProgress };
}
