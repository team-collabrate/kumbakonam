export function isWebUsbSupported(): boolean {
  return typeof navigator !== "undefined" && "usb" in navigator;
}

/**
 * We don't know the worker's printer model/vendor in advance, so the
 * picker must show every USB device rather than filtering by vendor ID —
 * a single filter object with no constraints (`{}`) matches everything.
 * (An empty `filters` array, by contrast, matches nothing per the WebUSB spec.)
 */
async function requestAnyUsbDevice(): Promise<USBDevice> {
  return navigator.usb.requestDevice({ filters: [{}] });
}

async function findOutEndpoint(
  device: USBDevice,
): Promise<{ interfaceNumber: number; endpointNumber: number }> {
  if (!device.configuration) {
    await device.selectConfiguration(1);
  }
  for (const iface of device.configuration!.interfaces) {
    for (const alt of iface.alternates) {
      const out = alt.endpoints.find((e) => e.direction === "out");
      if (out) {
        return { interfaceNumber: iface.interfaceNumber, endpointNumber: out.endpointNumber };
      }
    }
  }
  throw new Error("No USB OUT endpoint found on this device — is it a printer?");
}

async function preparePrinter(device: USBDevice): Promise<void> {
  if (!device.opened) {
    await device.open();
  }
  if (!device.configuration) {
    await device.selectConfiguration(1);
  }
  const { interfaceNumber } = await findOutEndpoint(device);
  const claimed = device.configuration!.interfaces.find(
    (i) => i.interfaceNumber === interfaceNumber,
  )?.claimed;
  if (!claimed) {
    await device.claimInterface(interfaceNumber);
  }
}

/** Opens the one-time browser device picker — must be called from a user gesture (click handler). */
export async function requestPrinter(): Promise<USBDevice> {
  const device = await requestAnyUsbDevice();
  await preparePrinter(device);
  return device;
}

/** Re-attaches to a previously-authorized printer without prompting the user again. */
export async function getPairedPrinter(): Promise<USBDevice | null> {
  const devices = await navigator.usb.getDevices();
  if (devices.length === 0) return null;
  const device = devices[0];
  await preparePrinter(device);
  return device;
}

export async function printToDevice(device: USBDevice, data: Uint8Array): Promise<void> {
  const { endpointNumber } = await findOutEndpoint(device);
  const result = await device.transferOut(endpointNumber, data);
  if (result.status !== "ok") {
    throw new Error(`USB transfer failed: ${result.status}`);
  }
}
