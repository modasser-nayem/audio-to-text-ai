import { config } from "../config";
import WebSocket from "ws";
import { logger } from "../utils/logger";

// Thin helper to open a websocket to OpenAI Realtime endpoint and manage session lifecycle.
export function openOpenAIRealtimeSocket(sessionConfig: any) {
   if (!config.openaiApiKey) throw new Error("OPENAI_API_KEY not set");

   // Official endpoint pattern: wss://api.openai.com/v1/realtime?model=... (verify in docs)
   const model = "gpt-4o-realtime-preview"; //|| sessionConfig.model || "gpt-4o-realtime-preview";
   const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(
      model
   )}`;

   const ws = new WebSocket(url, {
      headers: {
         Authorization: `Bearer ${config.openaiApiKey}`,
         "OpenAI-Beta": "realtime=v1",
      },
   });

   ws.on("open", () => logger.info("Connected to OpenAI Realtime"));
   ws.on("error", (err) => logger.error({ err }, "OpenAI WS error"));
   ws.on("close", (code, reason) =>
      logger.info({ code, reason: reason.toString() }, "OpenAI WS closed")
   );

   return ws;
}
