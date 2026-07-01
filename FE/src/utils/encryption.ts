const keyHex = import.meta.env.VITE_APP_ENCRYPTION_KEY;
export const enableEncryption = import.meta.env.VITE_APP_ENABLE_ENCRYPTION === 'true';
console.log('enableEncryption', enableEncryption);

// Convert hex string → Uint8Array

function hexToBytes(hex: string): Uint8Array {
  if (!hex || hex.length % 2 !== 0) return new Uint8Array();
  const bytes = new Uint8Array(hex.length / 2);

  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

const toBase64 = (arr: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < arr.length; i += 1) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
};

const fromBase64 = (str: string): Uint8Array => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));

const keyBytes = hexToBytes(keyHex);

// Import AES-GCM key from raw bytes
async function importKey(): Promise<CryptoKey> {
  const keyBuffer = keyBytes.slice().buffer; // ✅ always an ArrayBuffer

  return crypto.subtle.importKey('raw', keyBuffer, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

// Encrypt text → "iv:data"
export async function encryptText(text: string): Promise<string> {
  if (!enableEncryption) return text;

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const key = await importKey();

  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  return `${toBase64(iv)}:${toBase64(new Uint8Array(encrypted))}`;
}

// Decrypt "iv:data" → original text
export async function decryptText(payload: string): Promise<string> {
  if (!enableEncryption) return payload;

  const [ivB64, dataB64] = payload.split(':');

  // ✅ Ensure ArrayBuffer-backed Uint8Arrays
  const iv = fromBase64(ivB64).slice();
  const data = fromBase64(dataB64).slice();

  const key = await importKey();

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);

  return new TextDecoder().decode(decrypted);
}

export function maybeParseJSON(value: any) {
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
