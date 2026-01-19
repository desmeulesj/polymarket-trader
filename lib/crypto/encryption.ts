import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

function getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is not set');
    }
    if (key.length !== 64) {
        throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    return Buffer.from(key, 'hex');
}

/**
 * Encrypts plaintext using AES-256-GCM
 * Output format: salt (32 bytes) + iv (16 bytes) + authTag (16 bytes) + ciphertext
 * All encoded as base64
 */
export function encrypt(plaintext: string): string {
    const key = getEncryptionKey();
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive a key from the master key and salt
    const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');

    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);

    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Combine all parts: salt + iv + authTag + encrypted
    const combined = Buffer.concat([salt, iv, authTag, encrypted]);

    return combined.toString('base64');
}

/**
 * Decrypts ciphertext encrypted with the encrypt function
 */
export function decrypt(encryptedData: string): string {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract parts
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    // Derive the same key
    const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');

    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
    ]);

    return decrypted.toString('utf8');
}

/**
 * Hash a value (one-way, for non-reversible storage)
 */
export function hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Mask sensitive data for logging (shows first/last 4 chars only)
 */
export function maskSensitive(value: string): string {
    if (value.length <= 8) {
        return '****';
    }
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
