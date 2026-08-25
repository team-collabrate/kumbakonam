import { useCallback, useEffect, useRef, useState } from "react";
import { getPairedPrinter, isWebUsbSupported, printToDevice, requestPrinter } from "../printing/webUsbPrinter";

export type PrinterStatus = "unsupported" | "checking" | "unpaired" | "connecting" | "ready" | "error";

export interface UsePrinterResult {
  status: PrinterStatus;
  error: string | null;
  deviceName: string | null;
  /** Opens the browser's device picker — must be called from a user gesture (e.g. a button onClick). */
  connect: () => Promise<void>;
  print: (data: Uint8Array) => Promise<boolean>;
}

/** Web USB pairing + ESC/POS printing, per TDD §6. */
export function usePrinter(): UsePrinterResult {
  const [status, setStatus] = useState<PrinterStatus>("checking");
  const [error, setError] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const deviceRef = useRef<USBDevice | null>(null);

  useEffect(() => {
    if (!isWebUsbSupported()) {
      setStatus("unsupported");
      return;
    }
    getPairedPrinter()
      .then((device) => {
        if (device) {
          deviceRef.current = device;
          setDeviceName(device.productName ?? "USB printer");
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
      const device = await requestPrinter();
      deviceRef.current = device;
      setDeviceName(device.productName ?? "USB printer");
      setStatus("ready");
    } catch (err) {
      console.error("Printer connect failed", err);
      const cancelled = err instanceof Error && err.name === "NotFoundError";
      setError(cancelled ? "No device selected." : "Could not connect to the printer.");
      setStatus(deviceRef.current ? "ready" : "unpaired");
    }
  }, []);

  const print = useCallback(async (data: Uint8Array): Promise<boolean> => {
    if (!deviceRef.current) return false;
    try {
      await printToDevice(deviceRef.current, data);
      return true;
    } catch (err) {
      console.error("Print failed", err);
      setError("Printer not responding. Check the connection and try again.");
      setStatus("error");
      return false;
    }
  }, []);

  return { status, error, deviceName, connect, print };
}
