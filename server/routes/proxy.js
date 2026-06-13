/**
 * Server-side API Proxy Router
 * Keeps secret API keys safe on the backend.
 */

const express = require('express');
const multer = require('multer');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const SARVAM_API_BASE = 'https://api.sarvam.ai';
const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

const GEMINI_SYSTEM_INSTRUCTION = `You are Echo, an AI-powered Decision Blind Spot Detector.
Your task is to analyse a proposed organisational, institutional, or governmental decision and:
1. Identify ALL affected stakeholder groups — both direct and indirect.
2. Highlight groups that decision-makers commonly overlook (isOverlooked: true).
3. Analyse how each group is impacted (positive, negative, or mixed).
4. Detect conflicts where one group benefits at the direct expense of another.
5. Generate an authentic first-person voice quote from each group's perspective.

Be thorough, empathetic, and balanced. Prioritise overlooked groups such as:
disabled individuals, commuters, part-time workers, caregivers, scholarship holders,
contractual staff, international students, rural communities, and elderly individuals.

For voiceArchetype, assign one of: student | worker | authority | parent | default`;

const GEMINI_PROMPT_TEMPLATE = (decision) => `
Analyse this proposed decision:
"${decision}"

Return ONLY a valid JSON object (no markdown, no explanation) with this exact shape:
{
  "stakeholders": [
    {
      "id": "sh-1",
      "name": "Group Name",
      "role": "Brief role description (max 10 words)",
      "impact": "positive" | "negative" | "mixed",
      "isOverlooked": true | false,
      "voiceArchetype": "student" | "worker" | "authority" | "parent" | "default",
      "description": "2-3 sentence structural impact analysis.",
      "voiceQuote": "First-person quote, 1-2 sentences, authentic and specific."
    }
  ],
  "conflicts": [
    {
      "groupA": "Group name",
      "groupB": "Group name",
      "reason": "1-2 sentence explanation of the conflict."
    }
  ],
  "blindSpots": ["Group name 1", "Group name 2"],
  "summary": "Two-sentence overall analysis of this decision's impact."
}

Include 5-9 stakeholder groups. Include 1-3 conflict pairs if they exist.
Ensure blindSpots lists only the names of stakeholders where isOverlooked is true.
`;

// ─── 1. GEMINI PROXIES ───────────────────────────────────────────────────────

router.post('/gemini/analyze', async (req, res) => {
  const { decisionText } = req.body;
  if (!decisionText || decisionText.trim().length < 10) {
    return res.status(400).json({ error: 'Decision text is too short. Please provide more detail.' });
  }

  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing Gemini API key on server.' });
  }

  try {
    const requestBody = {
      system_instruction: {
        parts: [{ text: GEMINI_SYSTEM_INSTRUCTION }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: GEMINI_PROMPT_TEMPLATE(decisionText.trim()) }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return res.status(response.status).json({ error: `Gemini API error: ${errorBody}` });
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return res.status(500).json({ error: 'Gemini returned an empty response.' });
    }

    // Parse the JSON from the response text
    let parsed;
    try {
      const cleaned = rawText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse Gemini response as JSON.' });
    }

    if (!Array.isArray(parsed.stakeholders) || parsed.stakeholders.length === 0) {
      return res.status(500).json({ error: 'Gemini returned an invalid stakeholder list.' });
    }

    const normalised = parsed.stakeholders.map((s, i) => ({
      ...s,
      id: `sh-live-${Date.now()}-${i}`,
      voiceArchetype: s.voiceArchetype ?? 'default',
    }));

    const simulationId = `sim-live-${Date.now()}`;

    res.json({
      id: simulationId,
      decisionTitle: decisionText.length > 80 ? decisionText.substring(0, 80) + '…' : decisionText,
      decisionText,
      description: parsed.summary ?? '',
      timestamp: new Date().toISOString(),
      stakeholders: normalised,
      conflicts: parsed.conflicts ?? [],
      blindSpots: parsed.blindSpots ?? [],
      summary: parsed.summary ?? '',
    });
  } catch (err) {
    console.error('[Proxy Gemini analyze] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/gemini/refine', async (req, res) => {
  const { rawText } = req.body;
  const trimmed = rawText ? rawText.trim() : '';
  if (!trimmed) {
    return res.json({ refinedText: '' });
  }

  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing Gemini API key on server.' });
  }

  try {
    const requestBody = {
      system_instruction: {
        parts: [{
          text: "You are a speech transcription refinement assistant.\n" +
            "The user spoke a decision proposal in English, Hindi, Telugu, or another language, which was transcribed using an automated tool. The transcription may contain phonetic errors, spelling mistakes, or missing punctuation.\n" +
            "Your task is to:\n" +
            "1. Correct all spelling, grammar, phonetic mistakes, and punctuation.\n" +
            "2. If the input transcript is in Hindi, Telugu, or any other language, translate it into clean, natural English.\n" +
            "3. Deduce what decision proposal the user was trying to say based on context.\n" +
            "4. Keep the user's original intent intact.\n" +
            "5. Output ONLY the refined, clean English transcript. Do not add any conversational text, explanations, or metadata."
        }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: `Refine this raw transcription of a decision proposal:\n"${trimmed}"` }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return res.status(response.status).json({ error: `Gemini API error: ${errorBody}` });
    }

    const data = await response.json();
    const refined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    res.json({ refinedText: refined ? refined.trim() : trimmed });
  } catch (err) {
    console.error('[Proxy Gemini refine] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── 2. SARVAM PROXIES ───────────────────────────────────────────────────────

async function translateText(text, targetLang, apiKey) {
  const response = await fetch(`${SARVAM_API_BASE}/translate`, {
    method: 'POST',
    headers: {
      'API-Subscription-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      source_language_code: 'en-IN',
      target_language_code: targetLang,
      speaker_gender: 'Female',
      mode: 'formal',
      enable_preprocessing: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Sarvam translate error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data?.translated_text;
}

async function generateSarvamTTS(text, lang, apiKey) {
  const response = await fetch(`${SARVAM_API_BASE}/text-to-speech`, {
    method: 'POST',
    headers: {
      'API-Subscription-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: [text],
      target_language_code: lang,
      speaker: lang === 'hi-IN' ? 'anushka' : 'arya',
      pitch: 0,
      pace: 1.0,
      loudness: 1.5,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      model: 'bulbul:v2',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Sarvam TTS error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data?.audios?.[0];
}

router.post('/sarvam/translate-and-speak', async (req, res) => {
  const { englishText, targetLang } = req.body;
  if (!englishText || !targetLang) {
    return res.status(400).json({ error: 'englishText and targetLang are required.' });
  }

  const apiKey = process.env.EXPO_PUBLIC_SARVAM_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing Sarvam API key on server.' });
  }

  try {
    const translatedText = await translateText(englishText, targetLang, apiKey);
    if (!translatedText) {
      return res.status(500).json({ error: 'Translation returned empty result.' });
    }

    const base64Audio = await generateSarvamTTS(translatedText, targetLang, apiKey);
    if (!base64Audio) {
      return res.status(500).json({ error: 'TTS returned empty audio.' });
    }

    res.json({ base64Audio });
  } catch (err) {
    console.error('[Proxy Sarvam translate-and-speak] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/sarvam/speech-to-text', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Audio file upload is required.' });
  }

  const apiKey = process.env.EXPO_PUBLIC_SARVAM_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing Sarvam API key on server.' });
  }

  try {
    const languageCode = req.body.language_code || 'unknown';

    // Build native FormData using Node.js global Blob/FormData
    const formData = new FormData();
    const fileBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('file', fileBlob, req.file.originalname || 'audio.webm');
    formData.append('model', 'saaras:v3');
    formData.append('language_code', languageCode);

    const response = await fetch(`${SARVAM_API_BASE}/speech-to-text`, {
      method: 'POST',
      headers: {
        'API-Subscription-Key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return res.status(response.status).json({ error: `Sarvam STT error (${response.status}): ${errorBody}` });
    }

    const data = await response.json();
    res.json({ transcript: data?.transcript || '' });
  } catch (err) {
    console.error('[Proxy Sarvam speech-to-text] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── 3. ELEVENLABS PROXY ─────────────────────────────────────────────────────

function getElevenLabsVoiceId(archetype) {
  const voiceMap = {
    student: process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_STUDENT,
    worker: process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_WORKER,
    authority: process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_AUTHORITY,
    parent: process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_PARENT,
    default: process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_DEFAULT,
  };

  return voiceMap[archetype] ?? voiceMap.default;
}

router.post('/elevenlabs/generate-voice', async (req, res) => {
  const { text, archetype, options } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'text is required.' });
  }

  const apiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing ElevenLabs API key on server.' });
  }

  const voiceId = getElevenLabsVoiceId(archetype || 'default');
  if (!voiceId) {
    return res.status(500).json({ error: `Missing ElevenLabs voice ID configuration for archetype "${archetype || 'default'}"` });
  }

  try {
    const opts = options || {};
    const requestBody = {
      text: text.substring(0, 1000),
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: opts.stability ?? 0.5,
        similarity_boost: opts.similarityBoost ?? 0.75,
        style: opts.style ?? 0.0,
        use_speaker_boost: opts.useSpeakerBoost ?? true,
      },
    };

    const response = await fetch(
      `${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      return res.status(response.status).json({ error: `ElevenLabs error (${response.status}): ${errorBody}` });
    }

    const audioBuffer = await response.arrayBuffer();
    
    // Convert arraybuffer to base64
    const bytes = new Uint8Array(audioBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Audio = btoa(binary);

    res.json({ base64Audio });
  } catch (err) {
    console.error('[Proxy ElevenLabs generate-voice] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
