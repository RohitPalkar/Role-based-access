import { ENV_SECRET_KEY } from 'src/config/constants';
import * as CryptoJS from 'crypto-js';

const keyHex =
  process?.env?.ENCRYPTION_KEY ??
  '69e6fb53e592405520b1f34f55ae0e8189bff1e83295bf6f27fe0c8239506b19'; // 32 bytes hex for AES-256
const toBase64 = (arr: Uint8Array) => btoa(String.fromCharCode(...arr));

const fromBase64 = (str: string) =>
  Uint8Array.from(atob(str), (c) => c.charCodeAt(0));

const keyBytes = Uint8Array.from(Buffer.from(keyHex, 'hex'));

/**
 * Import a CryptoKey for AES-GCM
 */
async function importKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * Function to encrypt response payloads
 * @param text string to encrypt
 * @returns encrypted string in the format iv:ciphertext (both base64)
 */
export async function encryptResponse(text: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(text);
  const key = await importKey();

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data,
  );

  const encryptedBytes = new Uint8Array(encryptedBuffer);
  return [toBase64(iv), toBase64(encryptedBytes)].join(':');
}

/**
 * Function to decrypt request payloads
 * @param payload encrypted string in the format iv:ciphertext (both base64)
 * @returns decrypted plaintext string
 */
export async function decryptRequest(payload: string): Promise<string> {
  const [ivB64, dataB64] = payload.split(':');
  const iv = fromBase64(ivB64);
  const data = fromBase64(dataB64);
  const key = await importKey();

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data,
  );

  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Encrypts personalDetails object
 */
export async function encryptPersonalDetails(
  personalDetails: any,
): Promise<string> {
  if (!personalDetails || Object.keys(personalDetails).length === 0) {
    return null;
  }
  const jsonString = JSON.stringify(personalDetails);
  return await encryptResponse(jsonString);
}

/**
 * Decrypts personalDetails string back to object
 */
export async function decryptPersonalDetails(encrypted: string): Promise<any> {
  if (!encrypted) {
    return null;
  }
  const decrypted = await decryptRequest(encrypted);
  return JSON.parse(decrypted);
}

/**
 * Encrypts all applicants' personalDetails in booking object
 */
export async function encryptBookingApplicants(updateData: any): Promise<any> {
  const encrypted = { ...updateData };

  for (const applicantKey of [
    'applicant1',
    'applicant2',
    'applicant3',
    'applicant4',
  ]) {
    const applicant = encrypted[applicantKey];
    if (applicant?.personalDetails) {
      const personalDetails = await encryptPersonalDetails(
        applicant.personalDetails,
      );
      // assign back only once
      encrypted[applicantKey] = { ...applicant, personalDetails };
    }
  }

  return encrypted;
}

/**
 * Decrypts all applicants' personalDetails in booking object
 */
export async function decryptBookingApplicants(booking: any): Promise<any> {
  if (!booking) return booking;

  const decrypted = { ...booking };

  for (const applicantKey of [
    'applicant1',
    'applicant2',
    'applicant3',
    'applicant4',
  ]) {
    const applicant = decrypted[applicantKey];
    if (
      applicant?.personalDetails &&
      typeof applicant.personalDetails === 'string'
    ) {
      const personalDetails = await decryptPersonalDetails(
        applicant.personalDetails,
      );
      decrypted[applicantKey] = { ...applicant, personalDetails };
    }
  }

  return decrypted;
}

export function decryptEnv(value?: string): string | undefined {
  if (!value) return value;

  const secret = ENV_SECRET_KEY;
  if (!secret) return value;

  try {
    const bytes = CryptoJS.AES.decrypt(value, secret);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    // Decryption failed or value was not encrypted
    if (!decrypted) {
      return value;
    }

    return decrypted;
  } catch {
    // Never break app startup because of env issues
    return value;
  }
}
