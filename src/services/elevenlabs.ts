/**
 * ElevenLabs Text-to-Speech service.
 *
 * Each stakeholder archetype maps to a distinct voice persona configured
 * in your ElevenLabs account. Audio is returned as a base64-encoded string
 * which can be written to the filesystem via expo-file-system and played
 * with expo-av.
 *
 * API docs: https://elevenlabs.io/docs/api-reference/text-to-speech
 */

import { VoiceArchetype } from '@/constants/mockData';

import { getApiUrl } from './mongodb';

export interface ElevenLabsVoiceOptions {
  stability?: number;        // 0-1, default 0.5
  similarityBoost?: number;  // 0-1, default 0.75
  style?: number;            // 0-1, default 0.0
  useSpeakerBoost?: boolean; // default true
}

/**
 * Generates speech audio for a given text using ElevenLabs via the secure server proxy.
 *
 * @param text - The voice quote to narrate (max ~500 chars recommended)
 * @param archetype - Stakeholder archetype used to select the voice persona
 * @param options - Optional voice tuning parameters
 * @returns Base64-encoded MP3 audio string
 */
export async function generateVoice(
  text: string,
  archetype: VoiceArchetype = 'default',
  options: ElevenLabsVoiceOptions = {}
): Promise<string> {
  const response = await fetch(`${getApiUrl()}/api/proxy/elevenlabs/generate-voice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, archetype, options }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`ElevenLabs proxy error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data.base64Audio;
}
