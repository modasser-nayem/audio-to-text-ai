# Realtime OpenAI bridge (Express + TypeScript)

This repository implements a secure WebSocket bridge between your Flutter client and OpenAI Realtime API for live speech transcription.

Key features:

-  Per-client OpenAI session
-  Binary audio forwarding (PCM16 base64)
-  Health endpoint and basic rate limiting
-  Example Dockerfile and compose

Important: consult OpenAI Realtime docs for exact event envelopes, session.update fields like `input_audio_transcription`, and model names. See official docs: https://platform.openai.com/docs/guides/realtime and https://platform.openai.com/docs/guides/realtime-transcription
