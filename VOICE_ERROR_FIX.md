# Voice Mode Error Fix - "Conversation already has an active response"

## Problem
Users were seeing this error during voice conversations:
```
Error: Conversation already has an active response in progress: resp_xxx. 
Wait until the response is finished before creating a new one.
```

## Root Cause
OpenAI's server-side Voice Activity Detection (VAD) was firing `input_audio_buffer.speech_stopped` events while an assistant response was still being generated. This happened because:

1. User speaks → VAD detects speech start
2. User stops → VAD detects speech stop → We create response
3. **Assistant starts responding** (response in progress)
4. VAD incorrectly detects "speech" again (background noise, echo, or AI's own voice)
5. VAD fires `speech_stopped` → We try to create ANOTHER response
6. **ERROR**: Can't create response while one is active

## The Fix

Added **response state tracking** to prevent concurrent response creation:

### 1. Added Response Tracking Flag
```typescript
interface VoiceConnection {
  // ... existing fields
  responseInProgress: boolean; // Track if assistant is currently responding
}
```

### 2. Set Flag When Creating Response
```typescript
case 'input_audio_buffer.speech_stopped':
  if (connection.hasAudioInCurrentTurn && !connection.responseInProgress) {
    // Only create response if no response is active
    connection.openaiWs.send({ type: 'response.create' });
    connection.responseInProgress = true; // Mark as in progress
  } else if (connection.responseInProgress) {
    console.log('Response already in progress, skipping commit');
  }
```

### 3. Reset Flag When Response Completes
```typescript
case 'response.done':
  connection.responseInProgress = false; // Allow new responses
  console.log('Response complete, ready for next turn');
```

## State Flow

**Before Fix** (BROKEN):
```
User speaks → VAD stop → Create response → Response starts
  ↓
VAD fires again (false positive) → Try to create response
  ↓
ERROR: Response already in progress
```

**After Fix** (WORKING):
```
User speaks → VAD stop → Create response → Set flag
  ↓
VAD fires again (false positive) → Check flag → Skip (response in progress)
  ↓
Response completes → Clear flag → Ready for next turn ✓
```

## Code Changes

**File**: `server/openaiRealtimeService.ts`

1. Added `responseInProgress: boolean` to `VoiceConnection` interface
2. Initialize to `false` when creating connection
3. Set to `true` when sending `response.create`
4. Set to `false` when receiving `response.done`
5. Check before creating new response

## Testing

To verify the fix works:

1. Start voice mode
2. Have a back-and-forth conversation (multiple turns)
3. Verify no "conversation_already_has_active_response" errors appear
4. Check logs show "Response already in progress, skipping commit" instead of errors

## Related Errors Also Fixed

This fix also prevents:
- `input_audio_buffer_commit_empty` errors (from attempting to commit when VAD fires incorrectly)
- Multiple simultaneous responses
- Conversation state corruption

## Impact

✅ **Eliminates error messages** shown to users  
✅ **Prevents response interruption** from VAD false positives  
✅ **Improves conversation flow** by ensuring clean turn-taking  
✅ **Reduces OpenAI API errors** and potential rate limiting  

## Notes

- OpenAI's server-side VAD is sensitive and can detect background noise, echo, or even the AI's own voice as "speech"
- This is expected behavior - the fix handles it gracefully
- The `hasAudioInCurrentTurn` flag prevents empty commits
- The `responseInProgress` flag prevents concurrent responses
- Both flags work together for robust turn management
