/**
 * POST /api/solana/build-tx
 * Builds a Solana Memo transaction on devnet and returns:
 *   { transaction: "<base64>", blockhash: "<string>" }
 * The client passes this to Phantom to sign, then sends the signature back
 * to /api/solana/confirm for confirmation.
 *
 * Body: { walletAddress, decision, blindSpots }
 */

const express = require('express');
const {
  Connection,
  Transaction,
  TransactionInstruction,
  PublicKey,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} = require('@solana/web3.js');
const nacl = require('tweetnacl');
const bs58 = require('bs58');

const router = express.Router();
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

// In-memory store for Phantom mobile session states:
// sessionId -> { dappKeyPair, phantomPublicKey, sessionToken, sharedSecret, pendingTx, walletAddress }
const mobileSessions = new Map();

// ─── POST /api/solana/build-tx ──────────────────────────────────────────────
router.post('/build-tx', async (req, res) => {
  const { walletAddress, decision, blindSpots } = req.body;

  if (!walletAddress || !decision || !Array.isArray(blindSpots)) {
    return res.status(400).json({ error: 'walletAddress, decision, and blindSpots are required.' });
  }

  try {
    const feePayer = new PublicKey(walletAddress);

    // Check devnet balance
    const lamports = await connection.getBalance(feePayer);
    const sol = lamports / LAMPORTS_PER_SOL;
    if (sol === 0) {
      return res.status(402).json({
        error: `You need devnet SOL. Visit faucet.solana.com and paste your wallet address: ${walletAddress}`,
        code: 'NO_SOL',
      });
    }

    // Build memo data
    const memoData = JSON.stringify({
      app: 'echo',
      decision,
      blindSpots,
      ts: Date.now(),
    });

    // Build memo instruction
    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memoData, 'utf-8'),
    });

    // Build transaction
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer,
    }).add(memoInstruction);

    // Serialize for client-side signing (requireAllSignatures=false so Phantom can add the sig)
    const serializedTx = transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
    const base64Tx = serializedTx.toString('base64');

    res.json({ transaction: base64Tx, blockhash, lastValidBlockHeight });
  } catch (err) {
    console.error('[Solana] build-tx error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/solana/confirm ───────────────────────────────────────────────
router.post('/confirm', async (req, res) => {
  const { signature, blockhash, lastValidBlockHeight } = req.body;
  if (!signature) {
    return res.status(400).json({ error: 'signature is required.' });
  }
  try {
    const result = await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed'
    );
    if (result.value.err) {
      return res.status(400).json({ error: `Transaction failed: ${JSON.stringify(result.value.err)}` });
    }
    res.json({ confirmed: true, signature });
  } catch (err) {
    console.error('[Solana] confirm error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/solana/mobile/connect-url ─────────────────────────────────────
router.post('/mobile/connect-url', (req, res) => {
  const { redirectLink } = req.body;
  if (!redirectLink) {
    return res.status(400).json({ error: 'redirectLink is required' });
  }

  try {
    // Generate ephemeral keypair for the dApp
    const dappKeyPair = nacl.box.keyPair();
    const dappPubKeyBase58 = bs58.encode(dappKeyPair.publicKey);

    // Generate a unique session ID
    const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Save the session keypair
    mobileSessions.set(sessionId, {
      dappKeyPair,
      redirectLink,
    });

    // Construct the Phantom connect URL
    const appUrl = 'https://echo.app';
    const connectUrl = `https://phantom.app/ul/v1/connect?` + new URLSearchParams({
      app_url: appUrl,
      dapp_encryption_public_key: dappPubKeyBase58,
      redirect_link: `${redirectLink}?sessionId=${sessionId}`,
    }).toString();

    res.json({ url: connectUrl, sessionId });
  } catch (err) {
    console.error('[Solana Mobile] connect-url error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/solana/mobile/connect-callback ────────────────────────────────
router.post('/mobile/connect-callback', (req, res) => {
  const { sessionId, phantom_encryption_public_key, nonce, data } = req.body;

  if (!sessionId || !phantom_encryption_public_key || !nonce || !data) {
    return res.status(400).json({ error: 'sessionId, phantom_encryption_public_key, nonce, and data are required.' });
  }

  const session = mobileSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found or expired.' });
  }

  try {
    const dappKeyPair = session.dappKeyPair;
    const phantomPubBytes = bs58.decode(phantom_encryption_public_key);
    const nonceBytes = bs58.decode(nonce);
    const dataBytes = bs58.decode(data);

    // Derive shared secret
    const sharedSecret = nacl.box.before(phantomPubBytes, dappKeyPair.secretKey);

    // Decrypt the payload
    const decryptedBytes = nacl.box.open.after(dataBytes, nonceBytes, sharedSecret);
    if (!decryptedBytes) {
      throw new Error('Failed to decrypt payload. Keys or nonce might be incorrect.');
    }

    const decryptedStr = Buffer.from(decryptedBytes).toString('utf-8');
    const decryptedJson = JSON.parse(decryptedStr);

    const { public_key, session: sessionToken } = decryptedJson;

    // Update session in memory with derived secret, session token, and public key
    session.phantomPublicKey = phantom_encryption_public_key;
    session.sessionToken = sessionToken;
    session.walletAddress = public_key;
    session.sharedSecret = sharedSecret;

    res.json({ walletAddress: public_key, sessionToken });
  } catch (err) {
    console.error('[Solana Mobile] Connect callback decryption error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/solana/mobile/sign-tx-url ─────────────────────────────────────
router.post('/mobile/sign-tx-url', async (req, res) => {
  const { sessionId, walletAddress, decision, blindSpots, sessionToken, redirectLink } = req.body;

  if (!sessionId || !walletAddress || !decision || !Array.isArray(blindSpots) || !sessionToken || !redirectLink) {
    return res.status(400).json({ error: 'sessionId, walletAddress, decision, blindSpots, sessionToken, and redirectLink are required.' });
  }

  const session = mobileSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found or expired.' });
  }

  try {
    const feePayer = new PublicKey(walletAddress);

    // Check devnet balance
    const lamports = await connection.getBalance(feePayer);
    const sol = lamports / LAMPORTS_PER_SOL;
    if (sol === 0) {
      return res.status(402).json({
        error: `You need devnet SOL. Visit faucet.solana.com and paste your wallet address: ${walletAddress}`,
        code: 'NO_SOL',
      });
    }

    // Build memo data
    const memoData = JSON.stringify({
      app: 'echo',
      decision,
      blindSpots,
      ts: Date.now(),
    });

    // Build memo instruction
    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memoData, 'utf-8'),
    });

    // Build transaction
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer,
    }).add(memoInstruction);

    // For deep linking, the transaction must be base58 encoded
    const serializedTx = transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
    const base58Tx = bs58.encode(serializedTx);

    // Prepare encryption payload
    const payloadObj = {
      transaction: base58Tx,
      session: sessionToken,
    };
    const payloadStr = JSON.stringify(payloadObj);
    const payloadBytes = Buffer.from(payloadStr, 'utf-8');

    // Encrypt payload using tweetnacl
    const nonceBytes = nacl.randomBytes(24);
    const nonceBase58 = bs58.encode(nonceBytes);

    const sharedSecret = session.sharedSecret;
    const encryptedBytes = nacl.box.after(payloadBytes, nonceBytes, sharedSecret);
    const encryptedBase58 = bs58.encode(encryptedBytes);

    const dappPubKeyBase58 = bs58.encode(session.dappKeyPair.publicKey);

    // Construct deep link URL to signAndSendTransaction
    const signUrl = `https://phantom.app/ul/v1/signAndSendTransaction?` + new URLSearchParams({
      dapp_encryption_public_key: dappPubKeyBase58,
      nonce: nonceBase58,
      redirect_link: `${redirectLink}?sessionId=${sessionId}`,
      payload: encryptedBase58,
    }).toString();

    // Store transaction info to confirm later
    session.pendingTx = {
      blockhash,
      lastValidBlockHeight
    };

    res.json({ url: signUrl });
  } catch (err) {
    console.error('[Solana Mobile] sign-tx-url error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/solana/mobile/sign-callback ───────────────────────────────────
router.post('/mobile/sign-callback', async (req, res) => {
  const { sessionId, nonce, data } = req.body;

  if (!sessionId || !nonce || !data) {
    return res.status(400).json({ error: 'sessionId, nonce, and data are required.' });
  }

  const session = mobileSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found or expired.' });
  }

  try {
    const nonceBytes = bs58.decode(nonce);
    const dataBytes = bs58.decode(data);
    const sharedSecret = session.sharedSecret;

    // Decrypt callback payload
    const decryptedBytes = nacl.box.open.after(dataBytes, nonceBytes, sharedSecret);
    if (!decryptedBytes) {
      throw new Error('Failed to decrypt payload. Nonce or shared secret might be incorrect.');
    }

    const decryptedStr = Buffer.from(decryptedBytes).toString('utf-8');
    const decryptedJson = JSON.parse(decryptedStr);

    // Decrypted contains signature
    const { signature } = decryptedJson;

    if (!signature) {
      throw new Error('No signature returned from Phantom Wallet.');
    }

    const pendingTx = session.pendingTx;
    if (!pendingTx) {
      throw new Error('No pending transaction details to confirm.');
    }

    const { blockhash, lastValidBlockHeight } = pendingTx;

    // Confirm on-chain
    const result = await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed'
    );
    if (result.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(result.value.err)}`);
    }

    // Clear pending transaction info
    session.pendingTx = null;

    res.json({ confirmed: true, signature });
  } catch (err) {
    console.error('[Solana Mobile] sign callback error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
