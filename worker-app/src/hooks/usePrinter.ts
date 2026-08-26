import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@kumbakonam/shared";
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

const MESSAGES = {
  noDevice: { en: "No device selected.", ta: "சாதனம் தேர்ந்தெடுக்கப்படவில்லை." },
  connectFailed: { en: "Could not connect to the printer.", ta: "பிரிண்டரை இணைக்க முடியவில்லை." },
  printFailed: {
    en: "Printer not responding. Check the connection and try again.",
    ta: "பிரிண்டர் பதிலளிக்கவில்லை. இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.",
  },
};

/** Web USB pairing + ESC/POS printing, per TDD §6. */
export function usePrinter(): UsePrinterResult {
  const { language } = useLanguage();
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
      setError(cancelled ? MESSAGES.noDevice[language] : MESSAGES.connectFailed[language]);
      setStatus(deviceRef.current ? "ready" : "unpaired");
    }
  }, [language]);

  const print = useCallback(async (data: Uint8Array): Promise<boolean> => {
    if (!deviceRef.current) return false;
    try {
      await printToDevice(deviceRef.current, data);
      return true;
    } catch (err) {
      console.error("Print failed", err);
      setError(MESSAGES.printFailed[language]);
      setStatus("error");
      return false;
    }
  }, [language]);

  return { status, error, deviceName, connect, print };
}
