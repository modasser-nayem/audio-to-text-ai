import WebSocket, { WebSocketServer, RawData } from "ws";
import http from "http";
import { openOpenAIRealtimeSocket } from "./services/openaiClient";
import { logger } from "./utils/logger";

export function setupWsProxy(server: http.Server) {
   const wss = new WebSocketServer({ server, path: "/ws" });

   wss.on("connection", (client, req) => {
      logger.info({ addr: req.socket.remoteAddress }, "Client connected");

      // OpenAI WS per client
      const aiWs = openOpenAIRealtimeSocket({
         model: "gpt-4o-mini-transcribe",
      });

      let aiReady = false;

      aiWs.on("open", () => {
         aiReady = true;
         logger.info("OpenAI Realtime WS connected");
      });

      aiWs.on("error", (err) => {
         logger.error("OpenAI WS error", err);
         if (client.readyState === WebSocket.OPEN) client.close();
      });

      // Forward client → AI
      client.on("message", (data: RawData) => {
         if (!aiReady) {
            logger.warn("AI WS not ready, ignoring audio chunk");
            return;
         }

         if (typeof data === "string") {
            // JSON control messages
            try {
               aiWs.send(data);
            } catch (e) {
               logger.error("Failed to send JSON to AI", e);
            }
            return;
         }

         // Binary audio → normalize RawData to Buffer
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

         const base64 = buffer.toString("base64");
         const envelope = {
            type: "input_audio_buffer.append",
            audio: base64,
         };

         try {
            aiWs.send(JSON.stringify(envelope));
         } catch (e) {
            logger.error("Failed to send audio to AI", e);
         }
      });

      // Forward AI → client
      aiWs.on("message", (msg: RawData) => {
         if (client.readyState === WebSocket.OPEN) {
            client.send(msg.toString());
         }
      });

      client.on("close", () => {
         logger.info("Client disconnected");
         if (aiWs.readyState === WebSocket.OPEN) aiWs.close();
      });

      aiWs.on("close", () => {
         logger.info("AI WS closed");
         if (client.readyState === WebSocket.OPEN) client.close();
      });
   });

   return wss;
}
