/**
 * Optimized PCM16 Input AudioWorklet Processor
 * - Converts float32 audio to PCM16 at 24kHz
 * - Uses small buffer chunks (256 samples = ~10.7ms @ 24kHz)
 * - Efficient conversion with proper clamping
 * - Low latency design for real-time streaming
 */

class PCM16InputProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 256; // ~10.7ms at 24kHz (low latency)
    this.buffer = [];
  }

  process(inputs, outputs) {
    const input = inputs[0];
    
    if (!input || !input[0]) {
      return true;
    }

    const samples = input[0]; // Mono channel
    
    // Accumulate samples
    for (let i = 0; i < samples.length; i++) {
      this.buffer.push(samples[i]);
      
      // Send when buffer is full
      if (this.buffer.length >= this.bufferSize) {
        this.flushBuffer();
      }
    }
    
    return true;
  }

  flushBuffer() {
    if (this.buffer.length === 0) return;

    // Convert float32 (-1.0 to 1.0) to int16 (-32768 to 32767)
    const pcm16 = new Int16Array(this.buffer.length);
    
    for (let i = 0; i < this.buffer.length; i++) {
      // Clamp to [-1.0, 1.0] and convert to int16
      const sample = Math.max(-1.0, Math.min(1.0, this.buffer[i]));
      pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }

    // Send PCM16 data to main thread
    this.port.postMessage({ 
      audio: pcm16.buffer,
      sampleCount: pcm16.length 
    }, [pcm16.buffer]);

    // Clear buffer
    this.buffer = [];
  }
}

registerProcessor('pcm16-input-processor', PCM16InputProcessor);
