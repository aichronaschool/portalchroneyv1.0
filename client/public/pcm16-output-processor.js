/**
 * Optimized PCM16 Output AudioWorklet Processor with Playback Speed Control
 * - Receives PCM16 audio chunks from main thread
 * - Maintains ring buffer for smooth playback
 * - Converts int16 to float32 for Web Audio output
 * - 1000ms buffer to handle OpenAI's large audio chunks (up to 650ms)
 * - Playback rate control (0.85x = 15% slower for natural speech)
 * - Uses linear interpolation for smooth speed adjustment
 */

class PCM16OutputProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Ring buffer for smooth playback (24000 samples = 1000ms @ 24kHz)
    // Large enough to hold OpenAI's biggest chunks (up to 650ms) with safety margin
    this.ringBuffer = new Float32Array(24000);
    this.writeIndex = 0;
    this.readIndex = 0;
    this.bufferedSamples = 0;
    
    // Playback state
    this.isPlaying = false;
    this.underrunCount = 0;
    
    // Playback speed control (0.85 = 15% slower for more natural speech)
    this.playbackRate = 0.85;
    this.readPosition = 0.0; // Fractional position for smooth speed adjustment
    
    // Listen for incoming PCM16 chunks
    this.port.onmessage = (event) => {
      if (event.data.audio) {
        this.addChunk(event.data.audio);
      } else if (event.data.command === 'start') {
        this.isPlaying = true;
      } else if (event.data.command === 'stop') {
        this.isPlaying = false;
        this.clear();
      } else if (event.data.playbackRate !== undefined) {
        this.playbackRate = event.data.playbackRate;
      }
    };
  }

  addChunk(pcm16Buffer) {
    const int16Array = new Int16Array(pcm16Buffer);
    
    // Convert int16 to float32 and add to ring buffer
    for (let i = 0; i < int16Array.length; i++) {
      const sample = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7FFF);
      
      this.ringBuffer[this.writeIndex] = sample;
      this.writeIndex = (this.writeIndex + 1) % this.ringBuffer.length;
      this.bufferedSamples = Math.min(this.bufferedSamples + 1, this.ringBuffer.length);
    }
    
    // Start playback when we have enough data (>20ms buffered)
    if (!this.isPlaying && this.bufferedSamples >= 480) {
      this.isPlaying = true;
      this.port.postMessage({ event: 'playback_started' });
    }
  }

  process(inputs, outputs) {
    const output = outputs[0];
    
    if (!output || !output[0]) {
      return true;
    }

    const outputChannel = output[0];
    
    if (!this.isPlaying || this.bufferedSamples === 0) {
      // Output silence
      outputChannel.fill(0);
      return true;
    }

    // Fill output buffer with playback rate control (linear interpolation)
    for (let i = 0; i < outputChannel.length; i++) {
      if (this.bufferedSamples > 1) {
        // Get integer and fractional parts of read position
        const readIndexInt = Math.floor(this.readPosition);
        const fraction = this.readPosition - readIndexInt;
        
        // Linear interpolation between current and next sample
        const currentIndex = (this.readIndex + readIndexInt) % this.ringBuffer.length;
        const nextIndex = (this.readIndex + readIndexInt + 1) % this.ringBuffer.length;
        
        const currentSample = this.ringBuffer[currentIndex];
        const nextSample = this.ringBuffer[nextIndex];
        
        outputChannel[i] = currentSample + fraction * (nextSample - currentSample);
        
        // Advance read position by playback rate
        this.readPosition += this.playbackRate;
        
        // When we've consumed a full sample, advance the buffer
        if (this.readPosition >= 1.0) {
          const samplesToConsume = Math.floor(this.readPosition);
          this.readIndex = (this.readIndex + samplesToConsume) % this.ringBuffer.length;
          this.bufferedSamples -= samplesToConsume;
          this.readPosition -= samplesToConsume;
          this.underrunCount = 0;
        }
      } else {
        // Buffer underrun - fill with silence
        outputChannel[i] = 0;
        this.underrunCount++;
        
        if (this.underrunCount > 480) { // 20ms of silence
          this.isPlaying = false;
          this.readPosition = 0.0;
          this.port.postMessage({ event: 'playback_ended' });
        }
      }
    }
    
    // Report buffer level periodically
    if (Math.random() < 0.01) { // ~1% of frames
      this.port.postMessage({ 
        event: 'buffer_level',
        bufferedMs: (this.bufferedSamples / 24) // Convert to milliseconds
      });
    }
    
    return true;
  }

  clear() {
    this.ringBuffer.fill(0);
    this.writeIndex = 0;
    this.readIndex = 0;
    this.readPosition = 0.0;
    this.bufferedSamples = 0;
    this.underrunCount = 0;
  }
}

registerProcessor('pcm16-output-processor', PCM16OutputProcessor);
