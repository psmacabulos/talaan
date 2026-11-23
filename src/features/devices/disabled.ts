/**
 * What a gate or monitor is told when its key is real but the office has
 * disabled the device (Step 59.14): a 403 with this code, never the 401 a
 * wrong or unknown key gets. The difference matters to the tablet: a 401
 * makes it forget its key, a disabled answer makes it wait, keeping the
 * key, so enabling the device again brings it back by itself.
 */
export const DEVICE_DISABLED_CODE = "device_disabled";

export const DEVICE_DISABLED_MESSAGE = "This device is disabled. Ask the office to enable it.";
