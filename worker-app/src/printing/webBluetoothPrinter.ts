// Bluetooth transport for the ESC/POS receipt bytes (TDD §6).
//
// Web Bluetooth talks BLE/GATT only — it cannot reach classic Bluetooth
// (SPP/RFCOMM) printers. Most modern pocket thermal printers are BLE; older
// ones that pair as a serial port are not reachable from any browser, and the
// on-screen bill stays the fallback for those.

/** BLE thermal printers cluster around a handful of vendor service UUIDs.
 *  A service must be declared up front or getPrimaryServices() won't return it. */
const KNOWN_PRINTER_SERVICES: string[] = [
  "000018f0-0000-1000-8000-00805f9b34fb", // the common ESC/POS BLE service
  "0000ff00-0000-1000-8000-00805f9b34fb", // Goojprt / Zjiang style
  "0000ffe0-0000-1000-8000-00805f9b34fb", // HM-10 style serial bridge
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC / Microchip transparent UART
  "6e400001-b5a3-f393-e0a9-e50e24dcca9e", // Nordic UART
];

/**
 * Bytes per BLE write.
 *
 * This is the single biggest lever on how long a bill takes to print, and it
 * is not really about bandwidth. Every acknowledged write costs at least one
 * BLE connection interval — 7.5ms on a fast link, 40ms+ on a power-saving
 * one — so *the number of writes*, not the number of bytes, sets the floor.
 * A receipt with a logo is ~50 KB: at 180 bytes that is 300+ round trips and
 * a visible wait at the counter, which is what staff were feeling.
 *
 * 512 (the largest value an ATT attribute can hold) was the starting point,
 * but on the printer actually in use it still overran the input buffer even
 * with the delay below in place — a chunk this large is a lot for a small
 * buffer to absorb in one write, no matter the gap after it. Dropped to 128
 * to trade some of that speed for not printing garbage. CHUNK_FALLBACKS
 * still steps down further from here if even 128 is refused.
 */
const CHUNK_SIZE = 128;

/**
 * Progressively smaller writes to fall back to, ending at the 20 bytes a
 * default 23-byte MTU allows.
 *
 * Retrying a rejected write at a smaller size is safe: the printer is being
 * fed one flat byte stream, so where the chunk boundaries fall carries no
 * meaning, and a write that was refused delivered nothing to re-send.
 */
const CHUNK_FALLBACKS = [512, 256, 128, 64, 20];

/** Cheap printers have small input buffers; a gap between chunks stops them
 *  overflowing and printing garbage halfway down the receipt. Raised from
 *  12ms — even with every chunk now acknowledged (see write() below) and
 *  CHUNK_SIZE cut to 128, the buffer still needed more breathing room than
 *  12ms gave it between writes. */
const CHUNK_DELAY_MS = 50;

export interface PrinterConnection {
  device: BluetoothDevice;
  characteristic: BluetoothRemoteGATTCharacteristic;
}

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

export interface BluetoothDiagnostics {
  /** The browser exposes the Web Bluetooth API at all. */
  supported: boolean;
  /** A Bluetooth radio is present and switched on. `null` when unknowable. */
  adapterAvailable: boolean | null;
  /** Web Bluetooth is refused outright on plain http:// origins. */
  secureContext: boolean;
  /** Android is the only mobile platform where Chrome ships Web Bluetooth. */
  android: boolean;
  /** Firefox and Safari have never shipped Web Bluetooth. */
  likelyUnsupportedBrowser: boolean;
}

/** Explains an empty device picker — the failure modes are indistinguishable
 *  from inside requestDevice(), which just resolves to "user picked nothing". */
export async function getBluetoothDiagnostics(): Promise<BluetoothDiagnostics> {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const supported = isWebBluetoothSupported();

  let adapterAvailable: boolean | null = null;
  if (supported && typeof navigator.bluetooth.getAvailability === "function") {
    try {
      adapterAvailable = await navigator.bluetooth.getAvailability();
    } catch {
      adapterAvailable = null;
    }
  }

  return {
    supported,
    adapterAvailable,
    secureContext: typeof window !== "undefined" && window.isSecureContext,
    android: /Android/i.test(ua),
    likelyUnsupportedBrowser: /Firefox|FxiOS|CriOS/i.test(ua) || (/Safari/i.test(ua) && !/Chrome/i.test(ua)),
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Finds the first characteristic on the device that we're allowed to write to. */
async function findWritableCharacteristic(
  server: BluetoothRemoteGATTServer,
): Promise<BluetoothRemoteGATTCharacteristic> {
  const services = await server.getPrimaryServices();
  for (const service of services) {
    let characteristics: BluetoothRemoteGATTCharacteristic[];
    try {
      characteristics = await service.getCharacteristics();
    } catch {
      continue; // service exposes nothing readable to us — try the next one
    }
    for (const characteristic of characteristics) {
      const { write, writeWithoutResponse } = characteristic.properties;
      if (write || writeWithoutResponse) return characteristic;
    }
  }
  throw new Error("No writable characteristic found — is this a BLE thermal printer?");
}

async function connect(device: BluetoothDevice): Promise<PrinterConnection> {
  if (!device.gatt) {
    throw new Error("This device doesn't expose a GATT server.");
  }
  const server = device.gatt.connected ? device.gatt : await device.gatt.connect();
  const characteristic = await findWritableCharacteristic(server);
  return { device, characteristic };
}

/** Opens the browser's Bluetooth picker — must run inside a user gesture (a click). */
export async function requestPrinter(): Promise<PrinterConnection> {
  // The printer model isn't known in advance, so show every nearby device
  // rather than filtering by service — plenty of printers don't advertise
  // their service UUID and would be invisible behind a filter.
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: KNOWN_PRINTER_SERVICES,
  });
  return connect(device);
}

/** Re-attaches to an already-permitted printer without prompting again.
 *  getDevices() is not in every Chrome build, so absence is not an error. */
export async function getPairedPrinter(): Promise<PrinterConnection | null> {
  if (!isWebBluetoothSupported() || typeof navigator.bluetooth.getDevices !== "function") {
    return null;
  }
  let devices: BluetoothDevice[];
  try {
    devices = await navigator.bluetooth.getDevices();
  } catch {
    return null;
  }
  if (devices.length === 0) return null;
  // Reconnecting needs the printer to be in range and awake; if it isn't,
  // fall back to "unpaired" so the worker is offered the picker again.
  try {
    return await connect(devices[0]);
  } catch {
    return null;
  }
}

export function getPrinterName(connection: PrinterConnection): string {
  return connection.device.name ?? "Bluetooth printer";
}

/** Reported after every chunk write, for usePrinter's on-screen speed
 *  display — see that hook for why this is a callback rather than an
 *  event stream: it needs to run synchronously in step with the loop
 *  below, not buffered and replayed after the fact. */
export interface PrintChunkProgress {
  chunkIndex: number;
  chunkBytes: number;
  bytesSent: number;
  totalBytes: number;
  /** Since printToDevice() started, not since this specific chunk. */
  elapsedMs: number;
}

/**
 * Sends the ESC/POS byte stream to the printer, chunked to fit BLE writes.
 *
 * Prefers writeValueWithResponse: waiting for each ACK gives natural flow
 * control, which matters more than raw speed on printers with tiny buffers.
 * Returns the connection actually used, since a dropped link is re-established
 * here and yields fresh GATT objects the caller should hold onto.
 */
export async function printToDevice(
  connection: PrinterConnection,
  data: Uint8Array,
  onProgress?: (progress: PrintChunkProgress) => void,
): Promise<PrinterConnection> {
  // BLE links drop when the printer sleeps or wanders out of range; silently
  // reconnecting is far better counter UX than an error the worker can't act on.
  let active = connection;
  if (!connection.device.gatt?.connected) {
    active = await connect(connection.device);
  }

  const { characteristic } = active;
  const canWriteWithResponse = characteristic.properties.write;

  // Uint8Array is generic over its buffer since TS 5.7, and BufferSource
  // rejects the SharedArrayBuffer case — so this has to be the narrow form
  // that `data.slice()` actually returns, not a bare Uint8Array.
  const write = async (chunk: Uint8Array<ArrayBuffer>) => {
    if (canWriteWithResponse) {
      await characteristic.writeValueWithResponse(chunk);
    } else {
      await characteristic.writeValueWithoutResponse(chunk);
    }
    await sleep(CHUNK_DELAY_MS);
  };

  // Starts optimistic and only shrinks. Once a size is known to work on this
  // link it is kept for the rest of the receipt, so a printer that needs
  // small writes pays the discovery cost once rather than on every chunk.
  let size = CHUNK_SIZE;
  let offset = 0;
  let chunkIndex = 0;
  const startedAt = performance.now();

  while (offset < data.length) {
    const chunk = data.slice(offset, offset + size);
    try {
      await write(chunk);
      offset += chunk.length;
      chunkIndex += 1;
      onProgress?.({
        chunkIndex,
        chunkBytes: chunk.length,
        bytesSent: offset,
        totalBytes: data.length,
        elapsedMs: performance.now() - startedAt,
      });
    } catch (err) {
      const next = CHUNK_FALLBACKS.find((candidate) => candidate < size);
      if (next === undefined) throw err; // already as small as BLE allows
      console.warn(`Printer refused a ${size}-byte write; retrying at ${next}.`);
      size = next;
    }
  }

  return active;
}
