let mediaStream;
let audioContext;
let processor;
let ws;

async function startMic() {
   mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
   audioContext = new AudioContext({ sampleRate: 24000 });

   const source = audioContext.createMediaStreamSource(mediaStream);

   processor = audioContext.createScriptProcessor(4096, 1, 1);
   source.connect(processor);
   processor.connect(audioContext.destination);

   processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const pcm16 = convertFloat32ToPCM16(input);

      ws.send(
         JSON.stringify({
            type: "input_audio_buffer.append",
            audio: btoa(String.fromCharCode(...pcm16)),
         })
      );
   };

   ws.send(JSON.stringify({ type: "input_audio_buffer.start" }));
}

function convertFloat32ToPCM16(float32Array) {
   const pcm16 = new Int16Array(float32Array.length);
   for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
   }
   return new Uint8Array(pcm16.buffer);
}
