/**
 * Classic Bluetooth (RFCOMM/SPP) transport for the ESC/POS receipt bytes —
 * only reachable at all once the app is running inside the native Android
 * shell (see main.tsx / capacitor.config.ts), never from a plain browser
 * tab. webBluetoothPrinter.ts stays as the fallback for that case.
 *
 * This exists because Web Bluetooth (webBluetoothPrinter.ts) is BLE/GATT
 * only — a hard browser-level restriction, not a setting — and every
 * chunk-size/delay/heating-time tuning round this printer went through
 * was working around GATT's small per-write limit, something classic SPP
 * doesn't have at all: it's a plain stream socket, and the OS handles
 * fragmentation and flow control underneath it. Confirmed by decompiling
 * the old native app (vpos), which printed to this exact printer with
 * nothing more than:
 *
 *   BluetoothSocket socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
 *   socket.connect();
 *   OutputStream out = socket.getOutputStream();
 *   out.write(wholeReceiptBytes);
 *   out.flush();
 *
 * — one write, no chunk size, no delay. printClassic() below is that same
 * shape, via @fmesasc/capacitor-bluetooth-serial (a fork of
 * @e-is/capacitor-bluetooth-serial chosen specifically because the
 * upstream write() only accepts a JS string and converts it with
 * `value.getBytes(StandardCharsets.UTF_8)` — lossy for raw binary raster
 * data, since bytes >= 0x80 don't round-trip through UTF-8 as single
 * bytes. This fork's write() also accepts a plain `number[]`, converted
 * on the native side with `(byte) array.optInt(i)` — a real byte-for-byte
 * copy, verified by reading that fork's actual Android source before
 * depending on it).
 */
import { BluetoothSerial, type BluetoothDevice as ScannedDevice } from "@fmesasc/capacitor-bluetooth-serial";

export interface ClassicPrinterConnection {
  address: string;
  name: string;
}

const STORAGE_KEY = "kumbakonam.classicPrinterAddress";

/** The last address a print actually succeeded to — not proof it's still in
 *  range, just where to try reconnecting without asking the worker to pick
 *  it from the list again on every app load. */
export function getStoredPrinterAddress(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storePrinterAddress(address: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, address);
  } catch {
    // Falls back to asking again next load — not worth surfacing.
  }
}

/** Turns Bluetooth on if it's off, requesting the runtime permission first
 *  if Android hasn't granted it yet (BLUETOOTH_CONNECT/SCAN on API 31+,
 *  BLUETOOTH/BLUETOOTH_ADMIN/ACCESS_FINE_LOCATION below it — the plugin's
 *  own manifest declares all of these; see android/app's merged manifest
 *  after a build, not this repo's hand-maintained one). */
export async function ensureBluetoothEnabled(): Promise<void> {
  const state = await BluetoothSerial.enable();
  if (!state.enabled) {
    throw new Error("Bluetooth is off, or permission to use it was refused.");
  }
}

/** Nearby classic-Bluetooth devices — includes already-paired ones and
 *  whatever a live scan turns up. No service-UUID filtering (unlike Web
 *  Bluetooth's requestDevice(), which needed acceptAllDevices for the same
 *  reason): plenty of printers don't advertise in a way that would survive
 *  filtering, and this list is short enough on a real device that
 *  filtering isn't worth the risk of hiding the one that matters. */
export async function scanForPrinters(): Promise<ClassicPrinterConnection[]> {
  await ensureBluetoothEnabled();
  const result = await BluetoothSerial.scan();
  return result.devices.map((d: ScannedDevice) => ({
    address: d.address,
    name: d.name || d.address,
  }));
}

/** Secure RFCOMM first, insecure as the fallback — matches the old app's
 *  own connect order (see this file's top comment), which tried secure,
 *  then insecure, then finally looped channels 1-5 on the plain SPP UUID.
 *  This plugin only exposes the first two of those, which is what covers
 *  the vast majority of real printers; a device needing the channel-probe
 *  fallback too would need a further plugin change, not a code change
 *  here. */
async function connectWithFallback(address: string): Promise<void> {
  try {
    await BluetoothSerial.connect({ address });
  } catch (err) {
    console.warn(`Secure RFCOMM connect failed for ${address}, trying insecure`, err);
    await BluetoothSerial.connectInsecure({ address });
  }
}

export async function connectClassic(address: string): Promise<ClassicPrinterConnection> {
  await ensureBluetoothEnabled();
  await connectWithFallback(address);
  storePrinterAddress(address);
  return { address, name: address };
}

/** Re-attaches to the last address that worked, without prompting — the
 *  classic-SPP equivalent of webBluetoothPrinter.ts's getPairedPrinter().
 *  A classic RFCOMM connect is a single socket-open, not BLE's multi
 *  round-trip service/characteristic discovery, so unlike the BLE path
 *  this has never needed a background keep-alive watcher to avoid a slow
 *  reconnect sitting on the print button's critical path. */
export async function getStoredPrinterConnection(): Promise<ClassicPrinterConnection | null> {
  const address = getStoredPrinterAddress();
  if (!address) return null;
  try {
    await ensureBluetoothEnabled();
    const already = await BluetoothSerial.isConnected({ address });
    if (!already.connected) {
      await connectWithFallback(address);
    }
    return { address, name: address };
  } catch (err) {
    console.warn("Reconnecting to the stored classic printer failed", err);
    return null;
  }
}

/**
 * Sends the ESC/POS byte stream in a single write — no chunking, no
 * per-write delay, no ATT/GATT size ceiling to work around. If the link
 * has dropped, reconnects first (a fast, single-step RFCOMM connect, not
 * BLE's slower service discovery).
 */
export async function printClassic(connection: ClassicPrinterConnection, data: Uint8Array): Promise<void> {
  const { address } = connection;
  const connected = await BluetoothSerial.isConnected({ address });
  if (!connected.connected) {
    await connectWithFallback(address);
  }
  await BluetoothSerial.write({ address, value: Array.from(data) });
}

export async function disconnectClassic(address: string): Promise<void> {
  await BluetoothSerial.disconnect({ address });
}
