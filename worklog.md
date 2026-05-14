---
Task ID: 1
Agent: Main Agent
Task: Add Alexa-like voice assistant with always-listening mode + TTS + vertical scrolling

Work Log:
- Read existing VoiceModule.tsx (transcription-only mode), Voice API route, SDK type definitions
- Read ASR and LLM skill documentation for z-ai-web-dev-sdk integration patterns
- Created `/src/app/api/voice/tts/route.ts` — TTS endpoint using z-ai-web-dev-sdk
- Created `/src/app/api/voice/assistant/route.ts` — Full voice assistant pipeline (ASR → LLM → TTS) with two modes: audio input and text input
- Discovered that z-ai-web-dev-sdk TTS returns raw Response object (not parsed data) — fixed both TTS route and assistant route to call `.arrayBuffer()` on the response
- Discovered default voice "alloy" is not supported by Z-AI TTS API — changed to "tongtong" (the Z-AI default)
- Discovered response_format "mp3" is not supported — removed the parameter, letting API use default (wav)
- Completely rewrote VoiceModule.tsx with:
  - Two modes: "Assistant" (voice conversation) and "Transcribe" (transcription only)
  - Always-listening toggle (like Alexa) with silence detection
  - Continuous recording loop: listen → detect silence → transcribe → LLM response → TTS speech → resume listening
  - Voice message conversation history with play/pause audio
  - Text input fallback for typing messages
  - Visual feedback for states: idle (gray), listening (cyan), processing (amber), speaking (emerald)
  - Audio level visualization with color-coded states
  - Voice selector with Z-AI voices (tongtong, xiaoyi, xiaomei, etc.)
  - Conversation clear button
- Verified all module components already have proper vertical scrolling (ScrollArea with flex-1 min-h-0 or overflow-y-auto)
- Fixed package.json dev script (removed `| tee dev.log` that was causing background process issues)
- End-to-end test: text→assistant API returns text response + WAV audio base64 successfully
- Lint passes with zero errors

Stage Summary:
- **TTS API** (`/api/voice/tts`): POST with text/voice/speed → returns base64 WAV audio
- **Voice Assistant API** (`/api/voice/assistant`): POST with text or audioBase64 → returns transcription + LLM response + optional TTS audio
  - Two modes: audio input (ASR→LLM→TTS) and text input (LLM→TTS)
  - generateSpeech flag controls whether TTS audio is generated
  - TTS failures are non-fatal (text response still returned)
- **VoiceModule** (complete rewrite): Alexa-like always-listening voice assistant
  - Toggle "Always Listening" for hands-free operation
  - Push-to-talk button for single interactions
  - Silence detection auto-stops recording after 2s of silence
  - Audio playback of AI responses
  - Text input as alternative to voice
  - 7 Z-AI voice options
  - Conversation history with play/pause per message
  - State indicators: idle/listening/processing/speaking with color coding
  - Preserved transcription-only mode as "Transcribe" tab
- **Scrolling**: All 14 module components already have proper vertical scrolling
- **Dev server fix**: Removed `tee` pipe from dev script that caused background process crashes
