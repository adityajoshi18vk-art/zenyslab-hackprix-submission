/**
 * Solana service for the Expo/web app.
 *
 * Architecture: We deliberately avoid importing @solana/web3.js here because
 * Metro bundler cannot resolve its Node-only dependencies (@noble/hashes, borsh, etc.).
 *
 * Web:
 *   1. The Express server (server/routes/solana.js) uses @solana/web3.js to build
 *      and serialize a Memo transaction, returning it as a base64 string.
 *   2. We decode the base64 → Uint8Array and pass it to Phantom's
 *      signAndSendTransaction(), which handles signing + broadcasting natively.
 *   3. The server /api/solana/confirm endpoint confirms the tx on-chain.
 *
 * Mobile (Android/iOS):
 *   1. The Express server generates an ephemeral NaCl Curve25519 keypair.
 *   2. The client opens a deep link redirecting to Phantom Wallet.
 *   3. Phantom Wallet redirects back to the client app using the custom scheme `echo://phantom-callback`.
 *   4. The client's React Native Linking handler catches the parameters (nonce, encrypted payload)
 *      and sends them to the server to decrypt using the derived shared secret.
 *   5. The server manages all transaction building, encryption, decryption, and confirmations.
 */

import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BuildTxResponse {
  transaction: string;        // base64-encoded serialized Transaction
  blockhash: string;
  lastValidBlockHeight: number;
}

interface SolanaProvider {
  isPhantom: boolean;
  connect(): Promise<{ publicKey: { toString(): string } }>;
  signAndSendTransaction(tx: unknown): Promise<{ signature: string }>;
}

// ─── Mobile Session State cache ──────────────────────────────────────────────

let currentSessionId: string | null = null;
let mobileWalletAddress: string | null = null;
let mobileSessionToken: string | null = null;

let connectPromiseHandlers: {
  resolve: (address: string) => void;
  reject: (err: any) => void;
} | null = null;

let publishPromiseHandlers: {
  resolve: (signature: string) => void;
  reject: (err: any) => void;
} | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPhantomProvider(): SolanaProvider {
  const provider =
    (window as any)?.phantom?.solana ?? (window as any)?.solana;

  if (!provider?.isPhantom) {
    throw new Error(
      'Phantom wallet not found. Please install the Phantom browser extension and refresh the page.'
    );
  }
  return provider as SolanaProvider;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ─── Mobile Deeplink Handlers ────────────────────────────────────────────────

async function handleIncomingUrl(url: string) {
  console.log('[Solana Mobile] Incoming Deep Link:', url);
  if (!url) return;

  const parsed = Linking.parse(url);
  const { queryParams } = parsed;
  if (!queryParams) return;

  // Check if this is a callback from Phantom
  if (url.includes('phantom-callback') || parsed.path === 'phantom-callback') {
    const {
      sessionId,
      phantom_encryption_public_key,
      nonce,
      data,
      errorCode,
      errorMessage
    } = queryParams as Record<string, string>;

    if (errorCode) {
      const errMessage = decodeURIComponent(errorMessage || 'User rejected the request');
      const err = new Error(errMessage);
      console.warn('[Solana Mobile] Phantom error code:', errorCode, errMessage);

      if (connectPromiseHandlers) {
        connectPromiseHandlers.reject(err);
        connectPromiseHandlers = null;
      }
      if (publishPromiseHandlers) {
        publishPromiseHandlers.reject(err);
        publishPromiseHandlers = null;
      }
      return;
    }

    // Connect flow callback
    if (connectPromiseHandlers && data && nonce && phantom_encryption_public_key) {
      try {
        console.log('[Solana Mobile] Forwarding connect callback data to server...');
        const res = await fetch(`${API_URL}/api/solana/mobile/connect-callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            phantom_encryption_public_key,
            nonce,
            data
          }),
        });

        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || 'Connection callback validation failed.');
        }

        mobileWalletAddress = resData.walletAddress;
        mobileSessionToken = resData.sessionToken;

        console.log('[Solana Mobile] Successfully connected mobile wallet:', mobileWalletAddress);
        connectPromiseHandlers.resolve(resData.walletAddress);
      } catch (err) {
        console.error('[Solana Mobile] Connect callback error:', err);
        connectPromiseHandlers.reject(err);
      } finally {
        connectPromiseHandlers = null;
      }
    }
    // Transaction signing flow callback
    else if (publishPromiseHandlers && data && nonce) {
      try {
        console.log('[Solana Mobile] Forwarding sign callback data to server...');
        const res = await fetch(`${API_URL}/api/solana/mobile/sign-callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            nonce,
            data
          }),
        });

        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || 'Transaction signing verification failed.');
        }

        console.log('[Solana Mobile] Mobile transaction confirmed:', resData.signature);
        publishPromiseHandlers.resolve(resData.signature);
      } catch (err) {
        console.error('[Solana Mobile] Sign callback error:', err);
        publishPromiseHandlers.reject(err);
      } finally {
        publishPromiseHandlers = null;
      }
    }
  }
}

/**
 * Initializes deep link listeners for mobile platforms.
 */
export const initSolanaMobileListener = () => {
  if (Platform.OS === 'web') return;

  console.log('[Solana Mobile] Registering deep link listeners...');
  const subscription = Linking.addEventListener('url', (event) => {
    handleIncomingUrl(event.url);
  });

  Linking.getInitialURL().then((url) => {
    if (url) {
      handleIncomingUrl(url);
    }
  });

  return () => {
    subscription.remove();
  };
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Connects to the Phantom wallet (Web extension or Mobile app via deep link).
 */
export const connectPhantom = async (): Promise<string> => {
  if (Platform.OS === 'web') {
    const provider = getPhantomProvider();
    const response = await provider.connect();
    return response.publicKey.toString();
  }

  // Mobile flow
  console.log('[Solana Mobile] Starting connection flow...');
  const redirectLink = Linking.createURL('phantom-callback');

  const res = await fetch(`${API_URL}/api/solana/mobile/connect-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ redirectLink }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to generate mobile connection link.');
  }

  const { url, sessionId } = data;
  currentSessionId = sessionId;

  return new Promise<string>((resolve, reject) => {
    connectPromiseHandlers = { resolve, reject };

    Linking.openURL(url).catch((err) => {
      connectPromiseHandlers = null;
      reject(new Error('Failed to open Phantom Wallet. Please make sure the Phantom app is installed on your device.'));
    });
  });
};

/**
 * Full transaction flow for Web or Mobile deep link execution.
 */
export async function publishToLedger(
  decision: string,
  blindSpots: string[],
  walletAddress: string
): Promise<string> {
  if (Platform.OS === 'web') {
    const provider = getPhantomProvider();

    // 1. Build transaction on the server
    const buildRes = await fetch(`${API_URL}/api/solana/build-tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, decision, blindSpots }),
    });

    const buildData = await buildRes.json();
    if (!buildRes.ok) {
      throw new Error(buildData.error ?? 'Failed to build transaction.');
    }

    const { transaction: base64Tx, blockhash, lastValidBlockHeight } =
      buildData as BuildTxResponse;

    // 2. Decode base64 → Uint8Array and hand to Phantom
    const txBytes = base64ToUint8Array(base64Tx);
    const { signature } = await provider.signAndSendTransaction({
      serialize: () => txBytes,
    } as unknown as Parameters<SolanaProvider['signAndSendTransaction']>[0]);

    // 3. Confirm on-chain via server
    const confirmRes = await fetch(`${API_URL}/api/solana/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signature, blockhash, lastValidBlockHeight }),
    });

    const confirmData = await confirmRes.json();
    if (!confirmRes.ok) {
      throw new Error(confirmData.error ?? 'Transaction confirmation failed.');
    }

    return signature;
  }

  // Mobile flow
  if (!currentSessionId || !mobileSessionToken) {
    throw new Error('No active Phantom session. Please reconnect your wallet.');
  }

  console.log('[Solana Mobile] Starting transaction sign flow...');
  const redirectLink = Linking.createURL('phantom-callback');

  const res = await fetch(`${API_URL}/api/solana/mobile/sign-tx-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: currentSessionId,
      walletAddress,
      decision,
      blindSpots,
      sessionToken: mobileSessionToken,
      redirectLink
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to build signing deep link.');
  }

  const { url } = data;

  return new Promise<string>((resolve, reject) => {
    publishPromiseHandlers = { resolve, reject };

    Linking.openURL(url).catch((err) => {
      publishPromiseHandlers = null;
      reject(new Error('Failed to open Phantom Wallet to sign the transaction.'));
    });
  });
}

/**
 * Returns the Solana Explorer URL for a confirmed devnet transaction.
 */
export const getSolanaExplorerUrl = (signature: string): string => {
  const cleanSig = signature.replace(/['"]/g, '').trim();
  return `https://explorer.solana.com/tx/${cleanSig}?cluster=devnet`;
};
