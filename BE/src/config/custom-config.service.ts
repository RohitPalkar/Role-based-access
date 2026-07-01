import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as CryptoJS from 'crypto-js';
import { logger } from 'src/logger/logger';
import { ENV_SECRET_KEY } from './constants';

@Injectable()
export class CustomConfigService {
  private readonly secretKey: string;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = ENV_SECRET_KEY;
  }

  /**
   * Retrieves and decrypts the value of an environment variable.
   *
   * @param key The name of the environment variable.
   * @returns The decrypted value of the environment variable.
   */
  getDecrypted(key: string): string {
    const encryptedValue = this.configService.get<string>(key);
    if (!encryptedValue) return '';
    const bytes = CryptoJS.AES.decrypt(encryptedValue, this.secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Encrypts a value and returns the encrypted string.
   *
   * @param value The value to encrypt.
   * @returns The encrypted string.
   */
  getEncrypted(value: string): string {
    return CryptoJS.AES.encrypt(value, this.secretKey).toString();
  }

  /**
   * Symmetric inverse of {@link getEncrypted} for arbitrary ciphertext
   * (NOT env-keyed; use {@link getDecrypted} for that). Unlike
   * {@link decryptData} this does NOT `JSON.parse` the result, so it
   * is suitable for decrypting opaque string secrets (e.g. an HMAC
   * key) that were stored via {@link getEncrypted}.
   *
   * @param cipherText AES ciphertext produced by {@link getEncrypted}.
   * @returns The decrypted UTF-8 string, or an empty string when the
   *          input is empty / the ciphertext cannot be decrypted.
   */
  decryptString(cipherText: string): string {
    if (!cipherText) return '';
    try {
      const bytes = CryptoJS.AES.decrypt(cipherText, this.secretKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      logger.error('decryptString failed:', error);
      return '';
    }
  }

  // Encrypt function
  encryptData(data) {
    const ciphertext = CryptoJS.AES.encrypt(
      JSON.stringify(data),
      this.secretKey,
    ).toString();
    return ciphertext;
  }

  // Decrypt function
  decryptData(cipherText: string) {
    try {
      const bytes = CryptoJS.AES.decrypt(cipherText, this.secretKey);
      const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      return decryptedData;
    } catch (error) {
      logger.error('decryption failed error:', error);
    }
  }

  // For regular (non-encrypted) config access
  get<T>(key: string): T {
    return this.configService.get<T>(key);
  }
}
