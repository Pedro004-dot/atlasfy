import crypto from 'crypto';

/**
 * Service for encrypting and decrypting sensitive data
 * Uses AES-256-GCM for authenticated encryption
 */
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16;  // 128 bits
  private readonly tagLength = 16; // 128 bits
  
  private readonly encryptionKey: Buffer;

  constructor() {
    const key = process.env.WHATSAPP_ENCRYPTION_KEY;
    if (!key || key.length !== 64) { // 32 bytes = 64 hex chars
      throw new Error('WHATSAPP_ENCRYPTION_KEY must be a 64-character hexadecimal string');
    }
    this.encryptionKey = Buffer.from(key, 'hex');
  }

  /**
   * Encrypts a string and returns encrypted data with IV and auth tag
   * Format: iv:authTag:encryptedData (all base64 encoded)
   */
  encrypt(plaintext: string): string {
    try {
      // Generate random IV for each encryption
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey, { iv });
      
      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      // Get the authentication tag
      const authTag = cipher.getAuthTag();
      
      // Combine IV, auth tag, and encrypted data
      const result = `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
      
      return result;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypts encrypted data
   * Expected format: iv:authTag:encryptedData (all base64 encoded)
   */
  decrypt(encryptedData: string): string {
    try {
      // Split the encrypted data
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivBase64, authTagBase64, encrypted] = parts;
      
      // Convert from base64
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');
      
      // Validate lengths
      if (iv.length !== this.ivLength) {
        throw new Error('Invalid IV length');
      }
      if (authTag.length !== this.tagLength) {
        throw new Error('Invalid auth tag length');
      }
      
      // Create decipher
      const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey, { iv });
      decipher.setAuthTag(authTag);
      
      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Generates a secure random key for encryption
   * Returns a 64-character hexadecimal string (32 bytes)
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validates if a string can be decrypted (basic format check)
   */
  canDecrypt(encryptedData: string): boolean {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) return false;
      
      // Check if parts are valid base64
      parts.forEach(part => {
        Buffer.from(part, 'base64');
      });
      
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let encryptionService: EncryptionService;

export function getEncryptionService(): EncryptionService {
  if (!encryptionService) {
    encryptionService = new EncryptionService();
  }
  return encryptionService;
}

// Utility functions for easy use
export const encrypt = (data: string): string => {
  return getEncryptionService().encrypt(data);
};

export const decrypt = (encryptedData: string): string => {
  return getEncryptionService().decrypt(encryptedData);
};

// Types for TypeScript
export interface EncryptedData {
  iv: string;
  authTag: string;
  encrypted: string;
}

export interface EncryptionResult {
  success: boolean;
  data?: string;
  error?: string;
}

export interface DecryptionResult {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * Safe encryption function that returns result object
 */
export function safeEncrypt(plaintext: string): EncryptionResult {
  try {
    const encrypted = encrypt(plaintext);
    return { success: true, data: encrypted };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown encryption error' 
    };
  }
}

/**
 * Safe decryption function that returns result object
 */
export function safeDecrypt(encryptedData: string): DecryptionResult {
  try {
    const decrypted = decrypt(encryptedData);
    return { success: true, data: decrypted };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown decryption error' 
    };
  }
}