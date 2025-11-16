class PCM16AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sampleRate = 24000;
  }

  process(inputs, outputs) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const audioData = input[0];
      
      const pcm16 = new Int16Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        const s = Math.max(-1, Math.min(1, audioData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    }
    
    return true;
  }
}

registerProcessor('pcm16-audio-processor', PCM16AudioProcessor);
