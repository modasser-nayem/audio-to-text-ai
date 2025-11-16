import WebSocket from "ws";
import fs from "fs";

const ws = new WebSocket("ws://localhost:3000/realtime");

ws.on("open", () => {
   console.log("Connected!");

   ws.send(
      JSON.stringify({
         type: "start",
         model: "gpt-4o-mini-transcribe",
         audio: { sample_rate: 16000 },
      })
   );

   const audioStream = fs.readFileSync("./sample.wav");
   ws.send(audioStream);

   ws.send(JSON.stringify({ type: "stop" }));
});

ws.on("message", (msg) => {
   console.log("SERVER:", msg.toString());
});
