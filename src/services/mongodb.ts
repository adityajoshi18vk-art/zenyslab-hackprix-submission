/**
 * Echo – Decision Blind Spot Detector
 * MongoDB persistence service.
 *
 * The Expo app cannot use the native `mongodb` driver because it relies on
 * Node.js built-ins (net, tls, dns) unavailable in React Native.
 * Instead, this service calls the local Express API server (server/index.js)
 * over plain HTTP.
 *
 * Server must be running:
 *   cd server && npm install && npm run dev
 *
 * Environment variable (root .env):
 *   EXPO_PUBLIC_API_URL=http://localhost:3000   ← defaults to this if not set
 *
 * The app falls back to mock data (empty history) if the server is unreachable.
 */

import { SimulationRecord } from '@/constants/mockData';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/**
 * Base URL of the Express API server.
 * Override with EXPO_PUBLIC_API_URL in .env to point at a deployed server.
 * For Android emulator use http://10.0.2.2:3000 (loopback alias).
 * For physical device use your machine's LAN IP, e.g. http://192.168.1.x:3000
 */
function getApiUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

const ENDPOINT = () => `${getApiUrl()}/api/simulations`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strips client-only fields before sending to the server. */
function toPayload(record: SimulationRecord): Record<string, unknown> {
  const { mongoId, ...rest } = record;
  return rest;
}

// ---------------------------------------------------------------------------
// Public API — mirrors the previous Data API service interface
// ---------------------------------------------------------------------------

/**
 * Saves a new simulation to MongoDB via the Express API.
 * Returns the MongoDB-generated document ID (_id as string).
 * Throws on network or server errors.
 */
export async function saveSimulation(record: SimulationRecord): Promise<string> {
  const response = await fetch(ENDPOINT(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toPayload(record)),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Echo API error (${response.status}): ${text}`);
  }

  const data: { mongoId: string } = await response.json();
  return data.mongoId;
}

/**
 * Retrieves all simulations, sorted by createdAt desc (most recent first).
 * Returns an empty array if the server is unreachable — app runs in demo mode.
 */
export async function listSimulations(): Promise<SimulationRecord[]> {
  try {
    const response = await fetch(ENDPOINT(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Echo API error (${response.status}): ${text}`);
    }

    const records: SimulationRecord[] = await response.json();
    return records;
  } catch (error) {
    // Server not running or unreachable — graceful degradation to empty history
    console.warn('[Echo] listSimulations: server unreachable, using empty history.', error);
    return [];
  }
}

/**
 * Deletes a single simulation by its MongoDB document ID.
 * Throws on network or server errors.
 */
export async function deleteSimulation(mongoId: string): Promise<void> {
  const response = await fetch(`${ENDPOINT()}/${mongoId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Echo API error (${response.status}): ${text}`);
  }
}
