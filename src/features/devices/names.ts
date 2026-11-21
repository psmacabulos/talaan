/** Most gates and monitors one school can have, revoked ones included (Step 59.13). */
export const MAX_DEVICES_PER_SCHOOL = 25;

export const DEVICE_NAME_MAX_LENGTH = 60;

/** A name as stored: no spaces at either end and no double spaces inside. */
export function cleanDeviceName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/**
 * What makes two names "the same" within a school: ignoring upper and lower
 * case and stray spaces, on both sides, so an older row saved with a
 * trailing space still counts.
 */
export function deviceNameKey(name: string): string {
  return cleanDeviceName(name).toLowerCase();
}

export const DEVICE_NAME_IN_USE_MESSAGE = "A device with this name already exists at your school. Choose a different name.";

export const DEVICE_LIMIT_MESSAGE = `Your school has reached the limit of ${MAX_DEVICES_PER_SCHOOL} devices. Ask us if you need more.`;
