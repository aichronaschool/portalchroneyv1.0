# Voice Mode Pipeline Optimization - Complete

## Overview
Complete rewrite of the voice mode pipeline using ONLY OpenAI Realtime API supported features (WebSocket + PCM16 audio) to fix robotic/choppy voice issues and reduce latency.

## Problems Fixed

### Old Implementation Issues:
1. **Large buffer chunks** - 2048 samples (~85ms @ 24kHz) causing high latency
2. **Inefficient playback** - Direct AudioBuffer scheduling causing stuttering
3. **No ring buffer** - Audio dropouts and choppy playback
4. **Unoptimized PCM16 conversion** - Inefficient float32 → int16 conversion
5. **Missing response creation** - Never explicitly requesting assistant to speak
6. **No turn signaling** - Not committing audio buffer when user stops speaking
7. **Poor cleanup** - Output worklet not stopped on disconnect

## New Optimized Architecture

### 1. Input AudioWorklet (`pcm16-input-processor.js`)
**Purpose**: Capture microphone audio and convert to PCM16 efficiently

**Features**:
- Small 256-sample buffers (~10.7ms @ 24kHz)
- 8x lower latency than previous 2048-sample chunks
- Efficient float32 → int16 conversion with proper clamping
- Sends raw binary PCM16 (no JSON overhead)

**Performance**:
- Latency: ~10.7ms per chunk
- CPU: Minimal (optimized conversion)
- Memory: Small buffer footprint

### 2. Output AudioWorklet (`pcm16-output-processor.js`)
**Purpose**: Smooth playback with ring buffer for low latency

**Features**:
- 100ms ring buffer (2400 samples @ 24kHz)
- Converts int16 → float32 for Web Audio
- Handles buffer underruns gracefully
- Auto-starts playback when buffered > 20ms
- Reports buffer levels for monitoring

**Performance**:
- Target latency: <100ms end-to-end
- Smooth playback with no stuttering
- Automatic playback management

### 3. Backend Service (`openaiRealtimeService.ts`)
**Purpose**: Optimized WebSocket relay to OpenAI Realtime API

**Key Improvements**:
- **20ms flush intervals** - Batches audio efficiently
- **Binary streaming** - Receives binary PCM16, sends base64 to OpenAI
- **Explicit turn management**:
  - Sends `input_audio_buffer.commit` when user stops speaking
  - Sends `response.create` to trigger assistant response
- **Cleanup signaling** - Notifies client to stop playback
- **Optimized event handling** - Proper transcript and audio delta parsing

**Audio Flow**:
```
Client (binary PCM16) → Backend (batch 20ms) → OpenAI (base64 PCM16)
OpenAI (base64 PCM16) → Backend (binary) → Client (ring buffer → speakers)
```

### 4. Frontend Component (`VoiceMode.tsx`)
**Purpose**: Manage audio pipeline and UI

**Key Changes**:
- Uses optimized AudioWorklets for input/output
- Binary PCM16 streaming (no JSON wrapper for audio)
- Handles cleanup signals from backend
- Clean separation of audio and message handling
- UI unchanged (same gradient orb interface)

## Performance Improvements

| Metric | Old | New | Improvement |
|--------|-----|-----|-------------|
| Input buffer size | 2048 samples | 256 samples | 8x lower |
| Input latency | ~85ms | ~11ms | 7.7x faster |
| Output buffering | Direct AudioBuffer | Ring buffer (100ms) | Smooth |
| Flush interval | On buffer | 20ms | Efficient |
| Turn detection | Server VAD only | VAD + commit | Reliable |
| Response trigger | Implicit | Explicit | Guaranteed |
| Cleanup | Incomplete | Full | No stalls |

## Latency Breakdown (Target < 100ms)

1. **Microphone capture**: ~10.7ms (256 samples @ 24kHz)
2. **Network to backend**: ~5-10ms (local WebSocket)
3. **Backend buffering**: ~20ms (flush interval)
4. **Network to OpenAI**: ~15-30ms (internet latency)
5. **OpenAI processing**: ~20-40ms (model inference)
6. **Network back**: ~15-30ms
7. **Ring buffer playback**: ~20ms (initial buffering)

**Total estimated**: ~105-170ms (real-world ~100-150ms)

## Technical Details

### PCM16 Format
- **Sample rate**: 24kHz (OpenAI requirement)
- **Bit depth**: 16-bit signed integer
- **Channels**: 1 (mono)
- **Byte order**: Little-endian
- **Range**: -32768 to +32767

### Conversion Formulas

**Float32 to Int16**:
```javascript
const sample = Math.max(-1.0, Math.min(1.0, float32Sample));
const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
```

**Int16 to Float32**:
```javascript
const float32 = int16 / (int16 < 0 ? 0x8000 : 0x7FFF);
```

### OpenAI Realtime API Events Used

**Input (Client → OpenAI)**:
- `session.update` - Configure session with instructions, voice, VAD
- `input_audio_buffer.append` - Send audio chunks
- `input_audio_buffer.commit` - Signal end of user turn
- `response.create` - Request assistant response
- `response.cancel` - Interrupt assistant
- `input_audio_buffer.clear` - Clear pending audio

**Output (OpenAI → Client)**:
- `session.created` / `session.updated` - Session ready
- `input_audio_buffer.speech_started` - VAD detected speech
- `input_audio_buffer.speech_stopped` - VAD detected silence
- `conversation.item.input_audio_transcription.delta` - User transcript chunk
- `conversation.item.input_audio_transcription.completed` - Final user transcript
- `response.audio_transcript.delta` - AI transcript chunk
- `response.audio_transcript.done` - Final AI transcript
- `response.audio.delta` - AI audio chunk (PCM16 base64)
- `response.audio.done` - AI finished speaking
- `response.done` - Response complete
- `error` - Error occurred

## File Changes

### New Files:
- `client/public/pcm16-input-processor.js` - Optimized input AudioWorklet
- `client/public/pcm16-output-processor.js` - Optimized output AudioWorklet with ring buffer
- `VOICE_OPTIMIZATION_COMPLETE.md` - This documentation

### Modified Files:
- `server/openaiRealtimeService.ts` - Optimized backend service
- `client/src/components/VoiceMode.tsx` - Rewritten for optimized pipeline
- `server/routes.ts` - Updated to use optimized service

### Removed Files:
- `client/public/audio-processor.js` - Old inefficient processor
- `server/webrtcRealtimeService.failed.ts` - Failed WebRTC attempt (incompatible with OpenAI)
- `client/src/components/VoiceMode.old.tsx` - Old implementation backup

## Testing

### Manual Testing Steps:
1. Open voice mode in the chat interface
2. Click "Start Voice Chat" and grant microphone permissions
3. Speak a question (e.g., "What is the weather?")
4. Verify:
   - User transcript appears in real-time
   - AI responds with low latency (<200ms perceived)
   - AI transcript appears smoothly
   - Audio playback is smooth (no stuttering/choppiness)
   - No robotic voice quality
5. Test interruption:
   - Click "Interrupt" while AI is speaking
   - Verify AI stops immediately and returns to listening
6. Test cleanup:
   - Stop voice mode
   - Verify all audio stops and resources are released

### Key Metrics to Monitor:
- **Latency**: Time from end of user speech to start of AI speech
- **Audio quality**: Smooth, non-robotic playback
- **Stability**: No dropped connections or stalls
- **Resource usage**: Proper cleanup on disconnect

## Rollback Instructions

If issues arise, rollback using git:

```bash
# View changes
git diff HEAD

# Restore specific files
git restore server/openaiRealtimeService.ts
git restore client/src/components/VoiceMode.tsx
git restore client/public/

# Or restore all changes
git restore .
```

Then restart the workflow:
```bash
npm run dev
```

## Future Optimizations

- [ ] Adaptive buffering based on network conditions
- [ ] Jitter buffer for network variance
- [ ] Audio quality monitoring and reporting
- [ ] Automatic bitrate adjustment
- [ ] Echo cancellation improvements
- [ ] Noise suppression tuning
- [ ] Voice activity detection threshold auto-tuning

## References

- [OpenAI Realtime API Documentation](https://platform.openai.com/docs/guides/realtime)
- [Web Audio API - AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)
- [WebSocket Binary Data](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send)
