// AudioWorklet processor for capturing PCM16 audio at 24kHz for OpenAI Realtime API
class PCM16AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048; // Process in chunks
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  /**
   * Convert Float32 audio samples to Int16 PCM format
   */
  float32ToInt16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp to [-1, 1] range and convert to 16-bit integer
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    // Check if we have input audio
    if (!input || !input[0]) {
      return true;
    }

    const inputChannel = input[0]; // Mono audio (channel 0)

    // Accumulate samples into buffer
    for (let i = 0; i < inputChannel.length; i++) {
      this.buffer[this.bufferIndex++] = inputChannel[i];

      // When buffer is full, convert and send to main thread
      if (this.bufferIndex >= this.bufferSize) {
        // Convert Float32 to Int16 PCM
        const pcm16Data = this.float32ToInt16(this.buffer);
        
        // Send binary data to main thread
        this.port.postMessage({
          type: 'audio',
          data: pcm16Data.buffer
        }, [pcm16Data.buffer]); // Transfer ownership for performance

        // Reset buffer
        this.bufferIndex = 0;
        this.buffer = new Float32Array(this.bufferSize);
      }
    }

    return true; // Keep processor alive
  }
}

registerProcessor('pcm16-audio-processor', PCM16AudioProcessor);
