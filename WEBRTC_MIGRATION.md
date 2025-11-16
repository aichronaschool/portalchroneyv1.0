# WebRTC Migration for Voice Mode

## Overview
Complete architectural migration from PCM16/AudioWorklet to WebRTC-based implementation for OpenAI Realtime Voice Mode.

## What Changed

### Backend (server/)
1. **New Service**: `server/webrtcRealtimeService.ts`
   - WebRTC peer connection relay between client and OpenAI
   - Handles WebRTC signaling (offer/answer/ICE candidates)
   - Uses OPUS audio codec @ 48kHz (native WebRTC format)
   - No PCM16 conversion, no base64 encoding, no AudioWorklet

2. **Updated Routes**: `server/routes.ts`
   - `/ws/voice` endpoint now handles WebRTC signaling only
   - Validates sessions and business account API keys
   - Creates WebRTC relay sessions

3. **Removed Files**:
   - `server/openaiRealtimeService.ts` → backed up to `.old.ts`
   - Uses new WebRTC service instead

### Frontend (client/src/)
1. **New Component**: `client/src/components/VoiceMode.tsx` (replaced)
   - Implements WebRTC RTCPeerConnection
   - Sends/receives audio via WebRTC DataChannel
   - Native browser WebRTC (no custom audio processing)
   - UI unchanged (same animated gradient orb and controls)

2. **Removed Files**:
   - `client/public/audio-processor.js` (AudioWorklet processor)
   - Old `VoiceMode.tsx` → backed up to `.old.tsx`

## Architecture

### Old Architecture (PCM16)
```
Frontend → WebSocket → Backend → WebSocket → OpenAI
         (PCM16 base64)        (PCM16 base64)
         AudioWorklet          Raw audio processing
```

### New Architecture (WebRTC)
```
Frontend ←→ WebRTC RTCPeerConnection ←→ Backend ←→ OpenAI
         (OPUS @ 48kHz)              (WebRTC Relay)
         Native browser WebRTC        Signaling only
```

## Technical Details

### Audio Format
- **Codec**: OPUS (native WebRTC)
- **Sample Rate**: 48kHz (WebRTC default)
- **Channels**: 1 (mono)
- **Transport**: RTP over WebRTC DataChannel

### WebRTC Flow
1. Client creates RTCPeerConnection
2. Client sends offer via WebSocket signaling
3. Backend relays offer to OpenAI
4. OpenAI sends answer back to client
5. ICE candidates exchanged for NAT traversal
6. Direct WebRTC audio streaming established

### Session Management
- Business account validation
- Encrypted API key decryption
- Session cleanup on disconnect
- Error handling and reconnection

## Installation Requirements

### Critical: wrtc Package
The backend requires the `wrtc` package for Node.js WebRTC support:

```bash
npm install wrtc
```

**Note**: This package has native dependencies and may fail in some environments (like Replit). The code includes graceful fallback handling:
- If wrtc is not installed, the service logs an error
- WebRTC functionality will not work without wrtc
- For production, ensure wrtc is properly installed

### System Dependencies (if wrtc fails)
If `npm install wrtc` fails, you may need system-level dependencies:
- Build tools (gcc, g++, make)
- Python 2.7 or 3.x
- OpenSSL development headers

## Testing

1. **Start the application**:
   ```bash
   npm run dev
   ```

2. **Open voice mode** in the chat interface

3. **Click the voice button** to start a WebRTC session

4. **Verify logs** for WebRTC connection messages:
   ```
   [WebRTC Realtime] New signaling connection
   [WebRTC Realtime] Sending offer to client
   [WebRTC Realtime] Connected to OpenAI WebSocket
   [WebRTC Realtime] Received track from client: audio
   ```

## Known Issues

1. **wrtc Package Installation**:
   - Native dependencies may fail in Replit/containerized environments
   - Requires proper build tools and system libraries
   - Fallback to stub implementation if unavailable

2. **OpenAI Realtime API Compatibility**:
   - OpenAI's Realtime API may require PCM16 format
   - WebRTC OPUS format may not be supported
   - This implementation assumes OpenAI supports WebRTC (verify with docs)

3. **Browser Compatibility**:
   - Requires modern browser with WebRTC support
   - Microphone permissions required
   - HTTPS/secure context required for getUserMedia

## Rollback Instructions

If you need to rollback to the PCM16/AudioWorklet implementation:

1. Restore old service:
   ```bash
   mv server/openaiRealtimeService.old.ts server/openaiRealtimeService.ts
   ```

2. Restore old component:
   ```bash
   mv client/src/components/VoiceMode.old.tsx client/src/components/VoiceMode.tsx
   ```

3. Restore audio processor:
   - Recreate `client/public/audio-processor.js` from backup

4. Update routes to use old service

## Future Improvements

- [ ] Add proper TypeScript types for wrtc package
- [ ] Implement automatic codec negotiation
- [ ] Add WebRTC stats monitoring
- [ ] Implement ICE restart on connection failure
- [ ] Add TURN server support for strict NAT environments
- [ ] Verify OpenAI Realtime API WebRTC compatibility

## References
- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime)
- [WebRTC API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [wrtc Package](https://www.npmjs.com/package/wrtc)
