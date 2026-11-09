/**
 * The shared base64 helpers of the Image Studio services (US-10.5 DD-9). Pure: no `window.` / `document.` access.
 * Standard alphabet with padding, the same encoding the BFF upload route and the stored `inlineData.data` use.
 */

/** Slice size for `String.fromCharCode(...)`, so a multi-megabyte image does not overflow the call stack. */
const SLICE = 0x8000;

/** Base64 of a byte array, built in slices so a multi-megabyte image does not overflow the call stack. */
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += SLICE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + SLICE));
  }
  return btoa(binary);
}

/** The bytes of a standard base64 string. */
export function fromBase64(data: string): Uint8Array {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
