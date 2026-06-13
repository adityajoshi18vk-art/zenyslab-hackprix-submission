/**
 * Sarvam AI multilingual service for Hindi and Telugu perspectives.
 *
 * Step 1: Translate English voice quote → Hindi or Telugu
 * Step 2: Generate TTS audio in that language
 *
 * API docs: https://docs.sarvam.ai
 */

import { getApiUrl } from './mongodb';

export type SarvamLanguage = 'hi-IN' | 'te-IN';

export const SARVAM_LANGUAGE_LABELS: Record<SarvamLanguage, string> = {
  'hi-IN': 'Hindi (हिंदी)',
  'te-IN': 'Telugu (తెలుగు)',
};

/**
 * Translates an English voice quote and generates TTS audio in the target language via the secure server proxy.
 */
export async function translateAndSpeak(
  englishText: string,
  targetLang: SarvamLanguage
): Promise<string> {
  const response = await fetch(`${getApiUrl()}/api/proxy/sarvam/translate-and-speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ englishText, targetLang }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Sarvam translate/TTS error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data.base64Audio;
}

/**
 * Transcribes audio file into English text using Sarvam AI via the secure server proxy.
 */
export async function speechToText(
  audioInput: string | Blob,
  languageCode: string = 'unknown'
): Promise<string> {
  const formData = new FormData();
  
  if (typeof audioInput === 'string') {
    // Mobile: local file URI
    const filename = audioInput.split('/').pop() || 'audio.wav';
    const ext = (filename.split('.').pop() || 'wav').toLowerCase();
    
    let type = 'audio/wav';
    if (ext === 'm4a') {
      type = 'audio/x-m4a';
    } else if (ext === 'mp3') {
      type = 'audio/mpeg';
    } else if (ext === 'caf') {
      type = 'audio/x-caf';
    } else if (ext === '3gp') {
      type = 'audio/3gpp';
    } else if (ext === 'webm') {
      type = 'audio/webm';
    } else if (ext === 'ogg' || ext === 'opus') {
      type = 'audio/ogg';
    }

    formData.append('file', {
      uri: audioInput,
      name: filename,
      type,
    } as any);
  } else {
    // Web: Blob/File object
    formData.append('file', audioInput, 'audio.webm');
  }
  
  formData.append('language_code', languageCode);

  const response = await fetch(`${getApiUrl()}/api/proxy/sarvam/speech-to-text`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Sarvam STT error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data.transcript || '';
}
