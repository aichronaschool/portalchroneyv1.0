# Voice Mode Debug Logging Guide

## Overview
Comprehensive debug logs have been added to help you analyze and fix how OpenAI voice speaks.

---

## 📊 What Gets Logged

### **1. Session Initialization**
When voice mode starts, you'll see:

```
[VOICE DEBUG] ========================================
[VOICE DEBUG] INITIALIZING VOICE SESSION
[VOICE DEBUG] ========================================
[VOICE DEBUG] Session Configuration: {
  voice: 'shimmer',
  temperature: 0.8,
  maxTokens: 600,
  vadThreshold: 0.5,
  silenceDuration: 700,
  audioFormat: 'pcm16'
}
[VOICE DEBUG] System instructions preview: You are Chroney, a friendly AI business assistant...
[VOICE DEBUG] ========================================
```

**What to Check:**
- ✅ Voice is set to 'shimmer' (or your preferred voice)
- ✅ Temperature is 0.8 (controls response variation)
- ✅ Max tokens is 600 (controls response length)
- ✅ System instructions match what you expect

---

### **2. User Input (When You Speak)**

```
[VOICE DEBUG] User speaking (interim): Hello
[VOICE DEBUG] User speaking (interim): Hello, can you
[VOICE DEBUG] User said: { text: 'Hello, can you help me?', wordCount: 5 }
```

**What to Check:**
- ✅ Your speech is being transcribed correctly
- ✅ Final transcript is complete and accurate
- ✅ No missing or garbled words

---

### **3. AI Response Start**

```
[VOICE DEBUG] ========================================
[VOICE DEBUG] AI RESPONSE STARTED
[VOICE DEBUG] Response ID: resp_abc123xyz
[VOICE DEBUG] Status: in_progress
[VOICE DEBUG] ========================================
```

**What to Check:**
- ✅ Response starts immediately after user stops speaking
- ✅ No delays or errors

---

### **4. AI Transcript Generation (What AI Says)**

```
[VOICE DEBUG] AI transcript delta: { text: 'Hi', length: 2 }
[VOICE DEBUG] AI transcript delta: { text: ' there', length: 6 }
[VOICE DEBUG] AI transcript delta: { text: '! How', length: 5 }
[VOICE DEBUG] AI transcript COMPLETE: {
  fullText: 'Hi there! How can I help you today?',
  wordCount: 7,
  charCount: 35
}
```

**What to Check:**
- ✅ **Response length**: Is it too long or too short?
- ✅ **Word choice**: Is it using natural, conversational language?
- ✅ **Relevance**: Does it answer the user's question?
- ✅ **Tone**: Is it warm and friendly?
- ✅ **Word count**: Should be ~10-20 words for natural voice

**Issues to Look For:**
- ❌ Responses over 50 words (too long, robotic)
- ❌ Technical jargon or formal language
- ❌ Irrelevant answers
- ❌ Missing pauses or natural breaks

---

### **5. Audio Chunk Streaming (How AI Speaks)**

```
[VOICE DEBUG] Audio chunk received: {
  base64Length: 1024,
  pcm16Bytes: 768,
  samples: 384,
  durationMs: '16.0ms'
}
[VOICE DEBUG] Audio chunk received: {
  base64Length: 2048,
  pcm16Bytes: 1536,
  samples: 768,
  durationMs: '32.0ms'
}
```

**What to Check:**
- ✅ **Chunk frequency**: Should receive chunks regularly (~every 20-50ms)
- ✅ **Chunk duration**: 10-50ms chunks are normal
- ✅ **No gaps**: Continuous stream without long pauses

**Issues to Look For:**
- ❌ Very large chunks (>100ms) = too fast/choppy
- ❌ Very small chunks (<5ms) = fragmented/stuttering
- ❌ Irregular timing = network issues

---

### **6. Response Completion**

```
[VOICE DEBUG] Audio playback complete
[VOICE DEBUG] ========================================
[VOICE DEBUG] AI RESPONSE COMPLETE
[VOICE DEBUG] Response ID: resp_abc123xyz
[VOICE DEBUG] Status: completed
[VOICE DEBUG] Token usage: {
  inputTokens: 45,
  outputTokens: 120,
  totalTokens: 165
}
[VOICE DEBUG] Ready for next turn
[VOICE DEBUG] ========================================
```

**What to Check:**
- ✅ **Output tokens**: Should be ~100-300 for natural voice
- ✅ **Response completes cleanly**: No errors or timeouts
- ✅ **Ready for next turn**: System is responsive

**Issues to Look For:**
- ❌ Output tokens > 500 = responses too long
- ❌ Errors or incomplete status
- ❌ Long delays before "Ready for next turn"

---

## 🔍 Common Issues and Solutions

### **Issue 1: AI Speaks Too Fast**
**Symptoms:**
- Large audio chunks (>100ms)
- Very high output token count (>500)
- User can't keep up

**Check Logs For:**
```
[VOICE DEBUG] AI transcript COMPLETE: {
  wordCount: 50+  // Too many words!
}
[VOICE DEBUG] Token usage: {
  outputTokens: 600+  // Max limit reached!
}
```

**Solution:**
- Reduce `max_response_output_tokens` (currently 600)
- Strengthen system instructions: "Keep responses to 1-2 sentences"
- Add more emphasis on brevity

---

### **Issue 2: AI Sounds Robotic/Unnatural**
**Symptoms:**
- Formal language in transcript
- No contractions
- Long, complex sentences

**Check Logs For:**
```
[VOICE DEBUG] AI transcript COMPLETE: {
  fullText: 'I would be delighted to assist you with your inquiry regarding...'
  // Too formal!
}
```

**Solution:**
- Increase temperature (try 0.9 for more natural variation)
- Strengthen instructions: "Use natural contractions (I'm, you're)"
- Add examples of casual speech in instructions

---

### **Issue 3: Irrelevant Responses**
**Symptoms:**
- AI doesn't answer the question
- Random topics

**Check Logs For:**
```
[VOICE DEBUG] User said: { text: 'What is your name?', wordCount: 4 }
[VOICE DEBUG] AI transcript COMPLETE: {
  fullText: 'The weather is nice today!'  // Irrelevant!
}
```

**Solution:**
- Lower temperature (try 0.6-0.7 for more focused responses)
- Strengthen instructions: "ALWAYS respond directly to user's question"
- Add more context about business role

---

### **Issue 4: Audio Quality Issues**
**Symptoms:**
- Choppy/stuttering playback
- Gaps in audio

**Check Logs For:**
```
[VOICE DEBUG] Audio chunk received: { durationMs: '200ms' }  // Too large!
// Or long gaps between chunks
```

**Solution:**
- Check network connection
- Verify WebSocket is stable
- Check client-side ring buffer (100ms should be enough)

---

## 🎯 How to Use These Logs

### **During Testing:**
1. **Start voice mode** and have a conversation
2. **Watch server logs** in real-time
3. **Note any issues** in the transcript or audio timing
4. **Correlate with logs** to find root cause

### **Example Debug Session:**

**Problem**: "AI speaks too fast"

**Steps:**
1. Look at logs during conversation
2. Find: `[VOICE DEBUG] AI transcript COMPLETE: { wordCount: 65 }`
3. Diagnosis: Response too long (should be ~10-20 words)
4. Solution: Reduce max_response_output_tokens from 600 to 400
5. Test again and check if wordCount decreases

---

## 📝 Quick Reference

**Good Response Pattern:**
```
[VOICE DEBUG] User said: { text: 'Hello', wordCount: 1 }
[VOICE DEBUG] AI RESPONSE STARTED
[VOICE DEBUG] AI transcript COMPLETE: {
  fullText: "Hi there! How can I help you?",
  wordCount: 7
}
[VOICE DEBUG] Token usage: { outputTokens: 120 }
[VOICE DEBUG] AI RESPONSE COMPLETE
```

**Bad Response Pattern (Too Long):**
```
[VOICE DEBUG] User said: { text: 'Hello', wordCount: 1 }
[VOICE DEBUG] AI RESPONSE STARTED
[VOICE DEBUG] AI transcript COMPLETE: {
  fullText: "Hello! I'm delighted to greet you today. I'm here to assist...",
  wordCount: 45  // Too many!
}
[VOICE DEBUG] Token usage: { outputTokens: 600 }  // Max limit!
[VOICE DEBUG] AI RESPONSE COMPLETE
```

---

## 🎛️ Tuning Parameters

Based on logs, adjust these in `server/openaiRealtimeService.ts`:

```typescript
temperature: 0.8          // 0.6-0.9 (higher = more varied)
max_response_output_tokens: 600  // 300-800 (lower = shorter)
silence_duration_ms: 700  // 500-1000 (higher = more patient)
threshold: 0.5            // 0.3-0.7 (higher = less sensitive)
```

**Recommended Settings for Natural Voice:**
- Temperature: 0.8
- Max tokens: 400-500
- Silence: 700ms
- Threshold: 0.5

---

## ✅ Success Metrics

Your voice mode is working well when logs show:

- ✅ Word count: 10-25 words per response
- ✅ Output tokens: 100-300 per response
- ✅ Audio chunks: Regular, 10-50ms each
- ✅ Response time: Complete within 2-3 seconds
- ✅ Natural language: Contractions, casual tone
- ✅ Relevant answers: Directly addresses user question

Happy debugging! 🎉
