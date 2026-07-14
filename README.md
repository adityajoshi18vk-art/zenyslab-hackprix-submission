<div align="center">
  <h1>Echo</h1>
  <h3>Decision Blind Spot Detector</h3>
  <p><i>Identifying hidden gaps and overlooked stakeholders in policy decisions.</i></p>
  <br />
</div>

## Overview

Approximately 73% of policy failures are attributed to overlooked stakeholders. In public administration, institutions, and corporations, decision-making processes often prioritize the most prominent voices, leaving critical perspectives unheard.

**Echo** is an AI-driven system designed to detect decision blind spots. Rather than prescribing specific outcomes, the platform systematically identifies underrepresented stakeholders. By analyzing proposed policies, Echo automatically maps affected demographics, highlights potential conflicts of interest, measures equity metrics, and generates optimized "Shadow Policies" to ensure comprehensive community inclusion.

---

## Core Features

- **Stakeholder Detection**: Automatically identifies demographics and groups that may be structurally excluded from a proposed policy, such as rural workforces, caregivers, or individuals with disabilities.
- **Equity Index Scoring**: Calculates a quantitative equity score (ranging from 0 to 100) that dynamically adjusts based on the severity of negative impacts and the exclusion of key stakeholders.
- **Simulated Stakeholder Deliberation**: Generates representative AI personas for affected cohorts and utilizes advanced text-to-speech synthesis to articulate localized concerns and potential conflicts.
- **Optimized Policy Formulation**: Generates alternative "Shadow Policies" designed to mitigate identified conflicts, incorporate excluded groups, and enhance overall policy fairness.
- **Multilingual Voice Input**: Supports natural language policy submissions with high-accuracy transcription in English, Hindi, and Telugu.
- **Immutable Ledger Logging**: Hashes and records all policy analyses and modifications on the Solana blockchain to establish a transparent, permanent record of institutional accountability.

---

## Tech Stack

Echo is architected with a decoupled, scalable design featuring a responsive mobile-first frontend and a secure backend service.

### Frontend
- **React Native and Expo Web**: Cross-platform UI with responsive layouts.
- **TypeScript**: Strict type safety and robust data models.
- **Solana Web3.js**: Client-side blockchain transaction logging.

### Backend and Database
- **Node.js and Express**: Express proxy server for secure API key management and response formatting.
- **MongoDB**: Document storage for simulation history.

### AI and APIs
- **Gemini 2.0 Flash**: Reasoning and contextual analysis of policy impacts.
- **Groq AI (LLaMA 3.1 8B)**: High-throughput inference for rapid stakeholder analysis, policy formulation, and translation.
- **Sarvam AI**: Speech-to-text transcription optimized for regional Indian languages.
- **ElevenLabs**: Speech synthesis for simulated stakeholder feedback.

### Deployment
- **Vultr**: Cloud infrastructure for the Node.js backend.
- **Vercel**: Content delivery network (CDN) hosting for the web client.

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB connection string
- API credentials for Groq, Sarvam AI, and ElevenLabs
- A Solana-compatible wallet configured for Devnet testing

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/f4w4z/Echo.git
   cd Echo
   ```

2. **Install dependencies:**
   ```bash
   npm install
   cd server && npm install
   cd ..
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory and add:
   ```env
   # API Keys
   GROQ_API_KEY=your_groq_api_key
   SARVAM_API_KEY=your_sarvam_api_key
   ELEVENLABS_API_KEY=your_elevenlabs_api_key

   # MongoDB
   MONGODB_URI=your_mongodb_connection_string

   # Solana Configuration
   EXPO_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
   EXPO_PUBLIC_PROGRAM_ID=your_deployed_program_id
   ```

4. **Start the Development Services:**
   Execute the following commands in separate terminal sessions.
   
   Terminal 1 (Backend):
   ```bash
   cd server
   npm run dev
   ```

   Terminal 2 (Frontend):
   ```bash
   npm run web
   ```

5. **Open in Browser:**
   Navigate to `http://localhost:8081` (or the port specified by Expo) to use the app.

---

## System Architecture and Workflow

1. **Input**: The user provides a policy proposal via audio input in English, Hindi, or Telugu.
2. **Transcription**: The audio payload is routed through the Express gateway to Sarvam AI for multilingual speech-to-text transcription.
3. **Intent Refinement**: The transcribed text is processed by Gemini 2.0 Flash to normalize syntax and clarify the policy objective.
4. **Stakeholder Analysis**: Gemini executes parallel evaluation workflows to assess stakeholder impacts, severity levels, and potential socio-economic conflicts.
5. **Localization**: The generated analysis is localized to the target language utilizing structured JSON payloads.
6. **Persistence and Ledgering**: The analytical simulation is stored in MongoDB, and a cryptographic verification hash is committed to the Solana Devnet to ensure public auditing capabilities.

---

<div align="center">
  <p>Developed by ZenysLab</p>
</div>
