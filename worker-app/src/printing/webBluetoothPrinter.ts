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

/** BLE caps a single ATT write, so a receipt has to go out in pieces.
 *  180 sits comfortably under the negotiated MTU on Chrome/Android while
 *  keeping a ~600-byte bill to a handful of writes. */
const CHUNK_SIZE = 180;

/** Cheap printers have small input buffers; a short gap between chunks stops
 *  them overflowing and printing garbage halfway down the receipt. */
const CHUNK_DELAY_MS = 12;

export interface PrinterConnection {
  device: BluetoothDevice;
  characteristic: BluetoothRemoteGATTCharacteristic;
}

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
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
): Promise<PrinterConnection> {
  // BLE links drop when the printer sleeps or wanders out of range; silently
  // reconnecting is far better counter UX than an error the worker can't act on.
  let active = connection;
  if (!connection.device.gatt?.connected) {
    active = await connect(connection.device);
  }

  const { characteristic } = active;
  const canWriteWithResponse = characteristic.properties.write;

  for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
    const chunk = data.slice(offset, offset + CHUNK_SIZE);
    if (canWriteWithResponse) {
      await characteristic.writeValueWithResponse(chunk);
    } else {
      await characteristic.writeValueWithoutResponse(chunk);
      await sleep(CHUNK_DELAY_MS);
    }
  }

  return active;
}
