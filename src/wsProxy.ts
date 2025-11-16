import WebSocket, { WebSocketServer, RawData } from "ws";
import http from "http";
import { config } from "./config";
import { logger } from "./utils/logger";
import { openOpenAIRealtimeSocket } from "./services/openaiClient";

export function setupWsProxy(server: http.Server) {
   const wss = new WebSocketServer({ server, path: "/ws" });

   wss.on("connection", (client, req) => {
      logger.info({ addr: req.socket.remoteAddress }, "Client connected");

      if (wss.clients.size > config.maxClients) {
         client.close(1013, "server busy");
         return;
      }

      // Create OpenAI realtime socket per client (use a supported realtime model)
      const model = "gpt-5-nano-2025-08-07";
      const aiWs = openOpenAIRealtimeSocket(model);

      let aiReady = false;

      aiWs.on("open", () => {
         aiReady = true;
         logger.info("OpenAI Realtime WS connected");
         // Optionally you can create session server-side, but we forward client's start message.
      });

      aiWs.on("message", (msg: RawData) => {
         // Forward raw message back to client as text
         if (client.readyState === WebSocket.OPEN) {
            client.send(msg.toString());
         }
      });

      aiWs.on("error", (err) => {
         logger.error({ err }, "OpenAI WS error");
      });

      aiWs.on("close", (code, reason) => {
         logger.info({ code, reason: reason.toString() }, "OpenAI WS closed");
         if (client.readyState === WebSocket.OPEN) client.close();
      });

      client.on("message", (data: RawData) => {
         // If client sends JSON (control) forward it to OpenAI as-is
         if (typeof data === "string") {
            try {
               // Forward control messages (like start, input_audio_buffer.commit, response.create ...)
               if (!aiReady) {
                  // still buffer or warn
                  logger.warn("AI WS not ready, forwarding control when ready");
               }
               aiWs.send(data);
            } catch (e) {
               logger.error("Failed to forward control to OpenAI", e);
            }
            return;
         }

         // If client sends binary PCM16 ArrayBuffer/Buffer -> convert to base64 and send as append envelope
         let buffer: Buffer;
         if (Buffer.isBuffer(data)) {
            buffer = data;
         } else if (data instanceof ArrayBuffer) {
            buffer = Buffer.from(data);
         } else if (Array.isArray(data)) {
            buffer = Buffer.concat(data);
         } else {
            buffer = Buffer.from(data as any);
         }

         // Convert to base64
         const base64 = buffer.toString("base64");
         const envelope = {
            type: "input_audio_buffer.append",
            audio: base64,
         };

         try {
            aiWs.send(JSON.stringify(envelope));
         } catch (e) {
            logger.error("Failed to send audio append to OpenAI", e);
         }
      });

      client.on("close", () => {
         logger.info("Client disconnected");
         if (aiWs.readyState === WebSocket.OPEN) aiWs.close();
      });
   });

   return wss;
}
