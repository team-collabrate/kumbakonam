import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@kumbakonam/shared";
import {
  getPairedPrinter,
  getPrinterName,
  isWebBluetoothSupported,
  printToDevice,
  requestPrinter,
  type PrinterConnection,
} from "../printing/webBluetoothPrinter";

export type PrinterStatus = "unsupported" | "checking" | "unpaired" | "connecting" | "ready" | "error";

export interface UsePrinterResult {
  status: PrinterStatus;
  error: string | null;
  deviceName: string | null;
  /** Opens the browser's Bluetooth picker — must be called from a user gesture (e.g. a button onClick). */
  connect: () => Promise<void>;
  print: (data: Uint8Array) => Promise<boolean>;
}

const MESSAGES = {
  noDevice: { en: "No printer selected.", ta: "பிரிண்டர் தேர்ந்தெடுக்கப்படவில்லை." },
  connectFailed: { en: "Could not connect to the printer.", ta: "பிரிண்டரை இணைக்க முடியவில்லை." },
  printFailed: {
    en: "Printer not responding. Check it's on and in range, then try again.",
    ta: "பிரிண்டர் பதிலளிக்கவில்லை. அது இயங்குகிறதா, அருகில் உள்ளதா எனப் பார்த்து மீண்டும் முயற்சிக்கவும்.",
  },
};

/** Bluetooth (BLE) pairing + ESC/POS printing, per TDD §6. */
export function usePrinter(): UsePrinterResult {
  const { language } = useLanguage();
  const [status, setStatus] = useState<PrinterStatus>("checking");
  const [error, setError] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const connectionRef = useRef<PrinterConnection | null>(null);

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
      try {
        // A dropped BLE link is re-established inside printToDevice, which
        // hands back fresh GATT objects — keep them or the next print
        // would reconnect all over again.
        connectionRef.current = await printToDevice(connectionRef.current, data);
        return true;
      } catch (err) {
        console.error("Print failed", err);
        setError(MESSAGES.printFailed[language]);
        setStatus("error");
        return false;
      }
    },
    [language],
  );

  return { status, error, deviceName, connect, print };
}
