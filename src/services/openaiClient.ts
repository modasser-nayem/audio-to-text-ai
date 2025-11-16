import WebSocket from "ws";
import { config } from "../config";
import { logger } from "../utils/logger";

/**
 * Create a WebSocket connected to OpenAI Realtime endpoint for a given model.
 * Caller is responsible for listening for 'open', 'message', 'close', 'error'.
 */
export function openOpenAIRealtimeSocket(model: string) {
   if (!config.openaiApiKey) throw new Error("OPENAI_API_KEY not set");
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
