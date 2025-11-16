// backend/elevenlabsWs.ts
import WebSocket, { WebSocketServer, RawData } from "ws";
import http from "http";
import { config } from "./config";
import { logger } from "./utils/logger";

// ElevenLabs Realtime STT WS URL
const ELEVENLABS_WS_URL = "wss://api.elevenlabs.io/v1/speech-to-text/realtime";

export function setupElevenLabsWsProxy(server: http.Server) {
   const wss = new WebSocketServer({ server, path: "/ws" });

   wss.on("connection", (client, req) => {
      logger.info({ addr: req.socket.remoteAddress }, "Client connected");

      if (wss.clients.size > config.maxClients) {
         client.close(1013, "server busy");
         return;
      }

      // Connect to ElevenLabs Realtime STT
      const elevenWs = new WebSocket(ELEVENLABS_WS_URL, {
         headers: {
            "xi-api-key": config.elevenLabsApiKey,
         },
      });

      let elevenReady = false;
      const messageQueue: any[] = [];

      elevenWs.on("open", () => {
         elevenReady = true;
         logger.info("ElevenLabs Realtime WS connected");

         // Send any queued messages
         messageQueue.forEach((msg) => elevenWs.send(JSON.stringify(msg)));
         messageQueue.length = 0;
      });

      elevenWs.on("message", (msg: RawData) => {
         // forward all transcription messages to frontend
         if (client.readyState === WebSocket.OPEN) {
            client.send(msg.toString());
         }
      });

      elevenWs.on("error", (err) => {
         logger.error({ err }, "ElevenLabs WS error");
      });

      elevenWs.on("close", (code, reason) => {
         logger.info(
            { code, reason: reason.toString() },
            "ElevenLabs WS closed"
         );
         if (client.readyState === WebSocket.OPEN) client.close();
      });

      client.on("message", (data: RawData) => {
         // Expect JSON control or binary audio from frontend
         if (typeof data === "string") {
            try {
               const obj = JSON.parse(data);
               if (elevenReady) {
                  elevenWs.send(JSON.stringify(obj));
               } else {
                  messageQueue.push(obj); // queue until ready
                  logger.warn("ElevenLabs WS not ready, message queued");
               }
            } catch (err) {
               logger.error("Failed to parse JSON from client", err);
            }
            return;
         }

         // Binary audio PCM16 from frontend
         let buffer: Buffer;
         if (Buffer.isBuffer(data)) buffer = data;
         else if (data instanceof ArrayBuffer) buffer = Buffer.from(data);
         else buffer = Buffer.from(data as any);

         // convert to base64 and send to ElevenLabs
         const base64 = buffer.toString("base64");
         const audioMessage = {
            audio: base64,
            commit: false,
            sampleRate: 16000,
         };

         if (elevenReady) {
            try {
               elevenWs.send(JSON.stringify(audioMessage));
            } catch (err) {
               logger.error("Failed to send audio to ElevenLabs", err);
            }
         } else {
            messageQueue.push(audioMessage);
         }
      });

      client.on("close", () => {
         logger.info("Client disconnected");
         if (elevenWs.readyState === WebSocket.OPEN) elevenWs.close();
      });
   });

   return wss;
}
