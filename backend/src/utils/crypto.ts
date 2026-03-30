/**
 * Encryption Utility using AES-256-GCM
 * Used to encrypt sensitive data like Discord tokens and API keys
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { env } from '@/config/env';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT = 'sabbylink-salt-v1'; // Static salt for deterministic key derivation

class EncryptionUtil {
  private key: Buffer;

  constructor(secretKey: string) {
    // Derive 256-bit key from secret using scrypt
    this.key = scryptSync(secretKey, SALT, KEY_LENGTH);
  }

  /**
   * Encrypt plaintext string
   * Returns format: iv:authTag:ciphertext (all hex-encoded)
   */
  encrypt(plaintext: string): string {
    try {
      const iv = randomBytes(IV_LENGTH);
      const cipher = createCipheriv(ALGORITHM, this.key, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Format: iv:authTag:ciphertext
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      throw new Error(`Encryption failed: ${error}`);
    }
  }

  /**
   * Decrypt ciphertext
   * Expects format: iv:authTag:ciphertext (all hex-encoded)
   */
  decrypt(ciphertext: string): string {
    try {
      const parts = ciphertext.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid ciphertext format');
      }

      const [ivHex, authTagHex, encrypted] = parts;
      
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error}`);
    }
  }

  /**
   * Encrypt object to JSON string
   */
  encryptObject<T>(obj: T): string {
    return this.encrypt(JSON.stringify(obj));
  }

  /**
   * Decrypt JSON string to object
   */
  decryptObject<T>(ciphertext: string): T {
    const decrypted = this.decrypt(ciphertext);
    return JSON.parse(decrypted);
  }
}

// Export singleton instance
export const encryption = new EncryptionUtil(env.ENCRYPTION_KEY);

// Export class for testing
export { EncryptionUtil };
