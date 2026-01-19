import { ethers } from 'ethers';
import crypto from 'crypto';
import { L2Credentials, DeriveApiKeyResponse, AuthenticationError } from './types';

// EIP-712 Domain for Polymarket
const EIP712_DOMAIN = {
    name: 'ClobAuthDomain',
    version: '1',
    chainId: 137, // Polygon mainnet
};

const EIP712_TYPES = {
    ClobAuth: [
        { name: 'address', type: 'address' },
        { name: 'timestamp', type: 'string' },
        { name: 'nonce', type: 'uint256' },
        { name: 'message', type: 'string' },
    ],
};

/**
 * Sign an L1 authentication message using EIP-712
 */
export async function signL1Message(
    privateKey: string,
    nonce: number = 0
): Promise<{ signature: string; timestamp: string; nonce: number }> {
    const wallet = new ethers.Wallet(privateKey);
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const message = {
        address: wallet.address,
        timestamp,
        nonce,
        message: 'This message attests that I control the given wallet',
    };

    const signature = await wallet.signTypedData(
        EIP712_DOMAIN,
        EIP712_TYPES,
        message
    );

    return { signature, timestamp, nonce };
}

/**
 * Derive L2 API credentials from private key
 * This calls the Polymarket API to get API key, secret, and passphrase
 */
export async function deriveL2Credentials(
    privateKey: string,
    clobUrl: string
): Promise<L2Credentials> {
    try {
        const wallet = new ethers.Wallet(privateKey);
        const { signature, timestamp, nonce } = await signL1Message(privateKey);

        const response = await fetch(`${clobUrl}/auth/derive-api-key`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                address: wallet.address,
                signature,
                timestamp,
                nonce,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new AuthenticationError(`Failed to derive API key: ${error}`);
        }

        const data = await response.json() as DeriveApiKeyResponse;

        return {
            apiKey: data.apiKey,
            apiSecret: data.secret,
            passphrase: data.passphrase,
        };
    } catch (error) {
        if (error instanceof AuthenticationError) throw error;
        throw new AuthenticationError(`L2 credential derivation failed: ${error}`);
    }
}

/**
 * Generate L2 authentication headers for CLOB API requests
 */
export function generateL2Headers(
    apiKey: string,
    apiSecret: string,
    passphrase: string,
    method: string,
    path: string,
    body?: string
): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // Create the signature payload: timestamp + method + path + body
    const payload = timestamp + method.toUpperCase() + path + (body || '');

    // HMAC-SHA256 signature
    // Secret is usually base64 encoded, so we verify and decode it if necessary
    // However, Node crypto handles string keys as binary or utf8.
    // Polymarket docs imply decoding base64 if provided as such.
    const secretBuffer = Buffer.from(apiSecret, 'base64');

    const signature = crypto
        .createHmac('sha256', secretBuffer)
        .update(payload)
        .digest('base64');

    return {
        'POLY-API-KEY': apiKey,
        'POLY-SIGNATURE': signature,
        'POLY-TIMESTAMP': timestamp,
        'POLY-PASSPHRASE': passphrase,
    };
}

/**
 * Get wallet address from private key
 */
export function getWalletAddress(privateKey: string): string {
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
}

/**
 * Validate private key format
 */
export function isValidPrivateKey(privateKey: string): boolean {
    try {
        // Remove 0x prefix if present
        const key = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
        new ethers.Wallet(key);
        return true;
    } catch {
        return false;
    }
}

/**
 * Create order signature for submitting orders
 */
export async function signOrder(
    privateKey: string,
    orderData: {
        salt: string;
        maker: string;
        signer: string;
        taker: string;
        tokenId: string;
        makerAmount: string;
        takerAmount: string;
        expiration: string;
        nonce: string;
        feeRateBps: string;
        side: number;
        signatureType: number;
    }
): Promise<string> {
    const wallet = new ethers.Wallet(privateKey);

    const ORDER_TYPES = {
        Order: [
            { name: 'salt', type: 'uint256' },
            { name: 'maker', type: 'address' },
            { name: 'signer', type: 'address' },
            { name: 'taker', type: 'address' },
            { name: 'tokenId', type: 'uint256' },
            { name: 'makerAmount', type: 'uint256' },
            { name: 'takerAmount', type: 'uint256' },
            { name: 'expiration', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'feeRateBps', type: 'uint256' },
            { name: 'side', type: 'uint8' },
            { name: 'signatureType', type: 'uint8' },
        ],
    };

    const ORDER_DOMAIN = {
        name: 'Polymarket CTF Exchange',
        version: '1',
        chainId: 137,
    };

    const signature = await wallet.signTypedData(
        ORDER_DOMAIN,
        ORDER_TYPES,
        orderData
    );

    return signature;
}
