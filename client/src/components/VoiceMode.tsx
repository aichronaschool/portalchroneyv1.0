import { X, Mic, Brain, Volume2, Hand } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isFinal?: boolean;
}

interface VoiceModeProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  businessAccountId: string;
  widgetHeaderText?: string;
  chatColor?: string;
  chatColorEnd?: string;
}

export function VoiceMode({
  isOpen,
  onClose,
  userId,
  businessAccountId,
  widgetHeaderText = "Hi Chroney",
  chatColor = "#9333ea",
  chatColorEnd = "#3b82f6"
}: VoiceModeProps) {
  const [state, setState] = useState<VoiceState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const nextPlaybackTimeRef = useRef<number>(0);
  const audioChunkBufferRef = useRef<Uint8Array[]>([]);
  const shouldAutoRestartRef = useRef(false);
  const isOnlineRef = useRef(false);
  const hasPermissionRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentAIMessageIdRef = useRef<string | null>(null);
  const vadAnalyserRef = useRef<AnalyserNode | null>(null);
  const vadIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingInterruptRef = useRef(false); // Track interrupt state to ignore late chunks
  const stateRef = useRef(state); // Mutable ref for VAD to check current state
  const bufferedTranscriptRef = useRef<{text: string, isFinal: boolean} | null>(null); // Buffer transcripts during interrupt
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null); // For capturing raw PCM audio
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null); // Fallback for older browsers
  const mediaSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const { toast } = useToast();
  
  // Keep stateRef in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentTranscript]);

  // Preload AudioContext on mount to eliminate initialization delay
  // OpenAI Realtime API uses 24kHz PCM16 audio
  useEffect(() => {
    if (isOpen && !audioContextRef.current) {
      try {
        // Use 24kHz sample rate to match OpenAI Realtime API requirements
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        console.log('[VoiceMode] AudioContext preloaded, sampleRate:', audioContextRef.current.sampleRate);
      } catch (error) {
        console.error('[VoiceMode] Failed to preload AudioContext:', error);
      }
    }
  }, [isOpen]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!isOpen) return;

    connectWebSocket();

    return () => {
      cleanup();
    };
  }, [isOpen, userId, businessAccountId]);

  const connectWebSocket = () => {
    setIsConnecting(true);
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/voice?businessAccountId=${businessAccountId}&userId=${userId}`;
    
    console.log('[VoiceMode] Connecting to:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[VoiceMode] WebSocket connected');
      setIsConnecting(false);
      setIsOnline(true);
      isOnlineRef.current = true;
    };

    ws.onmessage = async (event) => {
      if (event.data instanceof Blob) {
        // Binary audio data
        const arrayBuffer = await event.data.arrayBuffer();
        await handleAudioChunk(arrayBuffer);
      } else {
        // JSON message
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (error) {
          console.error('[VoiceMode] Failed to parse message:', error);
        }
      }
    };

    ws.onerror = (error) => {
      console.error('[VoiceMode] WebSocket error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to voice service",
        variant: "destructive"
      });
      setIsConnecting(false);
      setIsOnline(false);
      isOnlineRef.current = false;
    };

    ws.onclose = () => {
      console.log('[VoiceMode] WebSocket closed');
      setIsOnline(false);
      isOnlineRef.current = false;
      setIsConnecting(false);
      
      // Reset state to idle when connection closes
      setState('idle');
      setCurrentTranscript('');
    };
  };

  const handleMessage = async (data: any) => {
    console.log('[VoiceMode] Received message:', data.type);

    switch (data.type) {
      case 'ready':
        console.log('[VoiceMode] Service ready');
        // Enable auto-restart for continuous conversation
        shouldAutoRestartRef.current = true;
        
        // Try auto-start, but if it fails (e.g., no user interaction yet), just stay idle
        // User can tap the orb to start manually
        if (hasPermissionRef.current === true) {
          // We already have permission, auto-start
          try {
            console.log('[VoiceMode] Auto-starting with existing permission...');
            await startRecording();
            console.log('[VoiceMode] Auto-start successful');
          } catch (error) {
            console.error('[VoiceMode] Auto-start failed:', error);
            setState('idle');
          }
        } else {
          // First time - need user interaction for mic permission
          console.log('[VoiceMode] Waiting for user interaction to request microphone...');
          setState('idle');
        }
        break;

      case 'transcript':
        // Buffer final transcripts while interrupt is pending
        if (pendingInterruptRef.current && data.isFinal) {
          console.log('[VoiceMode] Buffering transcript during interrupt:', data.text);
          bufferedTranscriptRef.current = { text: data.text, isFinal: true };
          return;
        }
        
        // Update current transcript
        if (data.isFinal) {
          // Add final user message
          const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: data.text,
            timestamp: new Date(),
            isFinal: true
          };
          setMessages(prev => [...prev, userMessage]);
          setCurrentTranscript('');
          setState('thinking');
        } else {
          // Show interim transcript
          setCurrentTranscript(data.text);
        }
        break;

      case 'ai_chunk':
        // Ignore late chunks if we're pending an interrupt
        if (pendingInterruptRef.current) {
          console.log('[VoiceMode] Ignoring late ai_chunk after interrupt');
          return;
        }
        
        // AI streaming chunk - accumulate text for real-time display
        setState('speaking');
        
        // Start voice activity detection to allow user interruption
        if (!vadIntervalRef.current && mediaStreamRef.current) {
          startVoiceActivityDetection();
        }
        
        if (!currentAIMessageIdRef.current) {
          // First chunk - create new AI message
          const messageId = Date.now().toString();
          currentAIMessageIdRef.current = messageId;
          const aiMessage: Message = {
            id: messageId,
            role: 'assistant',
            text: data.text,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
        } else {
          // Subsequent chunks - append to existing message
          setMessages(prev => prev.map(msg => 
            msg.id === currentAIMessageIdRef.current
              ? { ...msg, text: msg.text + data.text }
              : msg
          ));
        }
        break;

      case 'ai_speaking':
        // Legacy full-text mode (keep for backwards compatibility)
        setState('speaking');
        const aiMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          text: data.text,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        break;

      case 'ai_done':
        // Ignore if we're pending an interrupt
        if (pendingInterruptRef.current) {
          console.log('[VoiceMode] Ignoring ai_done after interrupt');
          return;
        }
        
        // AI finished speaking
        currentAIMessageIdRef.current = null;
        
        // Stop voice activity detection
        stopVoiceActivityDetection();
        
        // Microphone is already running from when user last spoke
        // Just transition state back to listening without restarting recorder
        console.log('[VoiceMode] AI done, transitioning back to listening...');
        
        if (shouldAutoRestartRef.current && isOnlineRef.current && hasPermissionRef.current) {
          console.log('[VoiceMode] Ready for next turn (mic already active)...');
          setState('listening');
        } else {
          console.log('[VoiceMode] Not restarting - conditions not met');
          setState('idle');
        }
        break;

      case 'interrupt_ack':
        // Server acknowledged interrupt - clear pending flag and replay buffered transcript
        console.log('[VoiceMode] Interrupt acknowledged by server');
        pendingInterruptRef.current = false;
        currentAIMessageIdRef.current = null;
        
        // Replay buffered transcript if any
        if (bufferedTranscriptRef.current) {
          console.log('[VoiceMode] Replaying buffered transcript:', bufferedTranscriptRef.current.text);
          const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: bufferedTranscriptRef.current.text,
            timestamp: new Date(),
            isFinal: true
          };
          setMessages(prev => [...prev, userMessage]);
          bufferedTranscriptRef.current = null;
          setState('thinking');
        } else {
          setState('listening');
        }
        break;

      case 'busy':
        // Queue is saturated - notify user and reset to idle
        toast({
          title: "Processing Previous Requests",
          description: data.message || "Please wait before speaking again...",
          variant: "default"
        });
        setState('idle');
        setCurrentTranscript('');
        stopRecording();
        break;

      case 'processing_load':
        // Queue is getting full - subtle warning
        console.warn('[VoiceMode] High processing load, queue size:', data.queueSize);
        break;

      case 'error':
        toast({
          title: "Error",
          description: data.message || "Voice processing error",
          variant: "destructive"
        });
        setState('idle');
        stopRecording();
        break;
    }
  };

  const handleAudioChunk = async (arrayBuffer: ArrayBuffer) => {
    try {
      // Drop audio if we're pending an interrupt
      if (pendingInterruptRef.current) {
        console.log('[VoiceMode] Dropping audio chunk - interrupt pending');
        return;
      }
      
      if (!audioContextRef.current) {
        // Create AudioContext at 24kHz to match OpenAI's output
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        console.log('[VoiceMode] AudioContext created for playback, sampleRate:', audioContextRef.current.sampleRate);
      }

      // OpenAI sends PCM16 (Int16Array) audio at 24kHz
      // Convert raw bytes to Int16Array
      const pcm16Data = new Int16Array(arrayBuffer);
      
      // Validate expected sample count (should be ~0.2s chunks at 24kHz = ~4800 samples)
      const expectedSamplesPerChunk = 4800; // 0.2s * 24000Hz
      const tolerance = 0.2; // Allow 20% variance
      if (Math.abs(pcm16Data.length - expectedSamplesPerChunk) > expectedSamplesPerChunk * tolerance) {
        console.warn(`[VoiceMode] Unexpected sample count: ${pcm16Data.length} (expected ~${expectedSamplesPerChunk})`);
      }
      
      // Convert Int16 PCM to Float32 for Web Audio API
      const float32Data = new Float32Array(pcm16Data.length);
      for (let i = 0; i < pcm16Data.length; i++) {
        // Convert from Int16 [-32768, 32767] to Float32 [-1, 1]
        float32Data[i] = pcm16Data[i] / (pcm16Data[i] < 0 ? 32768 : 32767);
      }

      // Create AudioBuffer at 24kHz (matching OpenAI's output)
      const audioBuffer = audioContextRef.current.createBuffer(
        1, // Mono
        float32Data.length,
        24000 // Sample rate: 24kHz
      );
      
      // Validate audio buffer sample rate matches expected 24kHz
      if (audioBuffer.sampleRate !== 24000) {
        console.error(`[VoiceMode] Sample rate mismatch: ${audioBuffer.sampleRate}Hz (expected 24000Hz)`);
      }
      
      // Copy Float32 data into buffer
      audioBuffer.getChannelData(0).set(float32Data);

      // Add to queue for playback
      audioQueueRef.current.push(audioBuffer);

      // Start playback if not already playing
      if (!isPlayingRef.current) {
        playNextAudioChunk();
      }
    } catch (error) {
      console.error('[VoiceMode] Audio chunk handling error:', error);
    }
  };


  // Voice Activity Detection for interruption handling
  const startVoiceActivityDetection = () => {
    if (!mediaStreamRef.current || !audioContextRef.current) return;
    
    try {
      // Create analyser for VAD
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      
      // Connect microphone to analyser (but not to destination to avoid echo)
      const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
      source.connect(analyser);
      vadAnalyserRef.current = analyser;
      
      // Monitor audio levels to detect user speech
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const VOICE_THRESHOLD = 40; // Adjust based on testing
      const SILENCE_FRAMES_NEEDED = 3; // Debounce false positives
      let silenceFrames = SILENCE_FRAMES_NEEDED;
      
      vadIntervalRef.current = setInterval(() => {
        // Use ref to check state (avoid closure issues)
        if (stateRef.current !== 'speaking') {
          stopVoiceActivityDetection();
          return;
        }
        
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        if (average > VOICE_THRESHOLD) {
          silenceFrames = 0; // Reset debounce
          // User is speaking! Interrupt AI
          handleInterruption();
        } else {
          silenceFrames++;
        }
      }, 100); // Check every 100ms
      
      console.log('[VoiceMode] Voice activity detection started');
    } catch (error) {
      console.error('[VoiceMode] Failed to start VAD:', error);
    }
  };

  const stopVoiceActivityDetection = () => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    vadAnalyserRef.current = null;
    console.log('[VoiceMode] Voice activity detection stopped');
  };

  const handleInterruption = () => {
    console.log('[VoiceMode] User interrupted! Stopping AI response...');
    
    // Set pending interrupt flag to ignore late chunks
    pendingInterruptRef.current = true;
    
    // Reset buffered transcript to prepare for new user speech
    bufferedTranscriptRef.current = null;
    
    // Stop VAD to prevent multiple interruptions
    stopVoiceActivityDetection();
    
    // Stop current audio playback
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop();
      } catch (e) {
        // Already stopped
      }
      currentAudioSourceRef.current = null;
    }
    
    // Clear audio queue
    audioQueueRef.current = [];
    audioChunkBufferRef.current = [];
    isPlayingRef.current = false;
    nextPlaybackTimeRef.current = 0;
    currentAIMessageIdRef.current = null;
    
    // Send interrupt signal to server
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
    
    // Transition to listening state
    setState('listening');
    
    toast({
      title: "Listening",
      description: "Go ahead, I'm listening!",
      duration: 1000
    });
  };

  const playNextAudioChunk = () => {
    // Exit early if interrupt is pending - don't play residual audio
    if (pendingInterruptRef.current) {
      console.log('[VoiceMode] Skipping playback - interrupt pending');
      isPlayingRef.current = false;
      currentAudioSourceRef.current = null;
      audioQueueRef.current = [];
      return;
    }
    
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      currentAudioSourceRef.current = null;
      return;
    }

    isPlayingRef.current = true;
    const audioBuffer = audioQueueRef.current.shift()!;
    
    if (!audioContextRef.current) return;

    const currentTime = audioContextRef.current.currentTime;
    
    // Initialize nextPlaybackTime if this is the first chunk
    if (nextPlaybackTimeRef.current === 0) {
      nextPlaybackTimeRef.current = currentTime;
    }
    
    // Check if this chunk is late (would overlap with current playback)
    if (nextPlaybackTimeRef.current < currentTime) {
      const latency = currentTime - nextPlaybackTimeRef.current;
      console.warn(`[VoiceMode] Late audio chunk detected, latency: ${(latency * 1000).toFixed(0)}ms - dropping chunk to prevent overlap`);
      
      // Drop this chunk and reset playback time to current time
      nextPlaybackTimeRef.current = currentTime;
      
      // Try next chunk immediately
      playNextAudioChunk();
      return;
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    
    currentAudioSourceRef.current = source;
    
    // Always schedule at nextPlaybackTime (monotonically increasing)
    const scheduleTime = nextPlaybackTimeRef.current;
    
    source.onended = () => {
      currentAudioSourceRef.current = null;
      playNextAudioChunk();
    };

    source.start(scheduleTime);
    
    // Always advance playback time monotonically (never go backwards)
    nextPlaybackTimeRef.current = scheduleTime + audioBuffer.duration;
  };

  /**
   * Convert Float32 audio samples to Int16 PCM format
   */
  const float32ToInt16 = (float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp to [-1, 1] range and convert to 16-bit integer
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  };

  const resampleTo24kHz = (inputBuffer: Float32Array, inputSampleRate: number): Float32Array => {
    const targetSampleRate = 24000;
    
    // If already at target rate, return as-is
    if (inputSampleRate === targetSampleRate) {
      return inputBuffer;
    }

    // Calculate the ratio and output length
    const ratio = inputSampleRate / targetSampleRate;
    const outputLength = Math.floor(inputBuffer.length / ratio);
    const output = new Float32Array(outputLength);

    // Simple linear interpolation resampling
    for (let i = 0; i < outputLength; i++) {
      const sourceIndex = i * ratio;
      const index1 = Math.floor(sourceIndex);
      const index2 = Math.min(index1 + 1, inputBuffer.length - 1);
      const fraction = sourceIndex - index1;
      
      // Linear interpolation between two samples
      output[i] = inputBuffer[index1] * (1 - fraction) + inputBuffer[index2] * fraction;
    }

    console.log(`[VoiceMode] Resampled ${inputBuffer.length} samples @ ${inputSampleRate}Hz → ${output.length} samples @ ${targetSampleRate}Hz`);
    return output;
  };

  const startRecording = async () => {
    try {
      console.log('[VoiceMode] Starting recording...');
      
      // Safety guard: Don't create duplicate recorders
      if (audioWorkletNodeRef.current || scriptProcessorRef.current) {
        console.warn('[VoiceMode] Audio processor already active, skipping startRecording');
        return;
      }

      console.log('[VoiceMode] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000, // Request 24kHz for OpenAI Realtime API
          channelCount: 1 // Mono audio
        } 
      });
      
      setHasPermission(true);
      hasPermissionRef.current = true;
      mediaStreamRef.current = stream;

      // Create AudioContext at 24kHz if not already created
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        console.log('[VoiceMode] AudioContext created, sampleRate:', audioContextRef.current.sampleRate);
      }

      // Verify we got 24kHz (some browsers might use a different rate)
      const actualSampleRate = audioContextRef.current.sampleRate;
      console.log('[VoiceMode] Actual AudioContext sample rate:', actualSampleRate);
      
      if (actualSampleRate !== 24000) {
        console.warn('[VoiceMode] Sample rate mismatch! Expected 24000, got', actualSampleRate);
        toast({
          title: "Audio Configuration Warning",
          description: `Browser is using ${actualSampleRate}Hz instead of 24kHz. Audio quality may vary.`,
          variant: "default"
        });
      }

      const source = audioContextRef.current.createMediaStreamSource(stream);
      mediaSourceRef.current = source;

      // Try to use AudioWorklet first (modern approach)
      let workletLoaded = false;
      if (audioContextRef.current.audioWorklet) {
        try {
          await audioContextRef.current.audioWorklet.addModule('/audio-processor.js');
          workletLoaded = true;
          console.log('[VoiceMode] AudioWorklet loaded successfully');
        } catch (error) {
          console.warn('[VoiceMode] AudioWorklet failed to load, falling back to ScriptProcessor:', error);
        }
      }

      if (workletLoaded && audioContextRef.current.audioWorklet) {
        // Use AudioWorklet (preferred method)
        const workletNode = new AudioWorkletNode(audioContextRef.current, 'pcm16-audio-processor');
        audioWorkletNodeRef.current = workletNode;

        workletNode.port.onmessage = (event) => {
          if (event.data.type === 'audio' && wsRef.current?.readyState === WebSocket.OPEN) {
            // Send PCM16 binary data directly to server
            wsRef.current.send(event.data.data);
          }
        };

        source.connect(workletNode);
        workletNode.connect(audioContextRef.current.destination); // Also output to speakers for monitoring (optional)
        
        console.log('[VoiceMode] Using AudioWorklet for audio capture');
      } else {
        // Fallback to ScriptProcessorNode (deprecated but widely supported)
        const bufferSize = 2048;
        const processor = audioContextRef.current.createScriptProcessor(bufferSize, 1, 1);
        scriptProcessorRef.current = processor;

        processor.onaudioprocess = (event) => {
          const inputData = event.inputBuffer.getChannelData(0);
          const inputSampleRate = audioContextRef.current!.sampleRate;
          
          // Resample to 24kHz if needed (critical for OpenAI Realtime API)
          const resampled24kHz = resampleTo24kHz(inputData, inputSampleRate);
          
          // Convert Float32 to Int16 PCM
          const pcm16Data = float32ToInt16(resampled24kHz);
          
          // Send to server
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(pcm16Data.buffer);
          }
        };

        source.connect(processor);
        processor.connect(audioContextRef.current.destination);
        
        console.log('[VoiceMode] Using ScriptProcessor for audio capture (fallback)');
      }

      setState('listening');
      
    } catch (error: any) {
      console.error('[VoiceMode] Microphone error:', error);
      setHasPermission(false);
      hasPermissionRef.current = false;
      
      if (error.name === 'NotAllowedError') {
        toast({
          title: "Microphone Access Denied",
          description: "Please allow microphone permissions in your browser settings.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Microphone Error",
          description: "Failed to access microphone. Please check your settings.",
          variant: "destructive"
        });
      }
    }
  };

  const stopRecording = (): Promise<void> => {
    return new Promise((resolve) => {
      try {
        console.log('[VoiceMode] Stopping recording...');

        // Disconnect and clean up audio nodes
        if (audioWorkletNodeRef.current) {
          audioWorkletNodeRef.current.disconnect();
          audioWorkletNodeRef.current.port.onmessage = null;
          audioWorkletNodeRef.current = null;
          console.log('[VoiceMode] AudioWorklet node cleaned up');
        }

        if (scriptProcessorRef.current) {
          scriptProcessorRef.current.disconnect();
          scriptProcessorRef.current.onaudioprocess = null;
          scriptProcessorRef.current = null;
          console.log('[VoiceMode] ScriptProcessor node cleaned up');
        }

        if (mediaSourceRef.current) {
          mediaSourceRef.current.disconnect();
          mediaSourceRef.current = null;
          console.log('[VoiceMode] MediaSource node cleaned up');
        }

        // Stop all media stream tracks to release microphone
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => {
            track.stop();
            console.log('[VoiceMode] Stopped media track:', track.kind);
          });
          mediaStreamRef.current = null;
        }

        resolve();
        
      } catch (error) {
        console.error('[VoiceMode] Error stopping recording:', error);
        // Clean up on error
        audioWorkletNodeRef.current = null;
        scriptProcessorRef.current = null;
        mediaSourceRef.current = null;
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
        resolve();
      }
    });
  };

  const cleanup = () => {
    console.log('[VoiceMode] Cleaning up resources...');
    
    // Disable auto-restart when cleaning up
    shouldAutoRestartRef.current = false;
    
    try {
      // Stop voice activity detection
      stopVoiceActivityDetection();
      
      // Stop any ongoing audio playback
      if (currentAudioSourceRef.current) {
        try {
          currentAudioSourceRef.current.stop();
        } catch (e) {
          // Source may already be stopped
        }
        currentAudioSourceRef.current = null;
      }

      // Clear audio queue and chunk buffer
      audioQueueRef.current = [];
      audioChunkBufferRef.current = [];
      isPlayingRef.current = false;
      nextPlaybackTimeRef.current = 0;

      // Stop recording and release microphone
      stopRecording();

      // Close WebSocket connection
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close();
        }
        wsRef.current = null;
      }

      // Suspend and close audio context to release audio resources
      if (audioContextRef.current) {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().then(() => {
            console.log('[VoiceMode] AudioContext closed');
          }).catch((error) => {
            console.error('[VoiceMode] Error closing AudioContext:', error);
          });
        }
        audioContextRef.current = null;
      }

      // Reset all state
      setState('idle');
      setMessages([]);
      setCurrentTranscript('');
      setIsOnline(false);
      isOnlineRef.current = false;
      setIsConnecting(false);

      console.log('[VoiceMode] Cleanup complete');
    } catch (error) {
      console.error('[VoiceMode] Error during cleanup:', error);
    }
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getOrbStyle = () => {
    const baseSize = 280;
    let scale = 1;
    let pulseSpeed = '3s';

    switch (state) {
      case 'listening':
        scale = 1.1;
        pulseSpeed = '0.8s';
        break;
      case 'thinking':
        scale = 1.05;
        pulseSpeed = '1.5s';
        break;
      case 'speaking':
        scale = 1.08;
        pulseSpeed = '1s';
        break;
      default:
        scale = 1;
        pulseSpeed = '3s';
    }

    return {
      width: `${baseSize}px`,
      height: `${baseSize}px`,
      transform: `scale(${scale})`,
      animationDuration: pulseSpeed
    };
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{widgetHeaderText}</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnecting ? 'Connecting...' : isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-gray-600 hover:text-gray-900"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Animated Orb */}
          <div className="relative flex items-center justify-center mb-12">
            <motion.div
              className="rounded-full orb-pulse cursor-pointer relative flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${chatColor}, ${chatColorEnd})`,
                ...getOrbStyle()
              }}
              animate={{
                scale: state === 'listening' ? [1, 1.05, 1] : state === 'speaking' ? [1, 1.03, 1] : [1, 1.02, 1],
              }}
              transition={{
                duration: state === 'listening' ? 0.8 : state === 'speaking' ? 1 : 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              onClick={async () => {
                if (state === 'idle' && isOnline && !isConnecting) {
                  shouldAutoRestartRef.current = true;
                  setState('listening');
                  await startRecording();
                }
              }}
              data-testid="voice-orb"
            >
              {/* Inner glow */}
              <div 
                className="absolute inset-0 rounded-full blur-3xl opacity-40"
                style={{
                  background: `linear-gradient(135deg, ${chatColor}, ${chatColorEnd})`,
                }}
              />

              {/* Content inside circle - Beautiful and Classy */}
              <motion.div 
                className="relative z-10 flex flex-col items-center justify-center gap-4"
                animate={{
                  opacity: state === 'idle' ? [0.7, 1, 0.7] : 1,
                }}
                transition={{
                  duration: 2,
                  repeat: state === 'idle' ? Infinity : 0,
                  ease: "easeInOut"
                }}
              >
                {state === 'idle' && (
                  <>
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Hand className="w-16 h-16 text-white/90" strokeWidth={1.5} />
                    </motion.div>
                    <div className="text-center px-8">
                      <p className="text-white text-xl font-light tracking-wide">Click to Start</p>
                      <p className="text-white/80 text-lg font-extralight mt-1">Speaking</p>
                    </div>
                  </>
                )}
                {state === 'listening' && (
                  <>
                    <motion.div
                      animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Mic className="w-16 h-16 text-white" strokeWidth={1.5} />
                    </motion.div>
                    <div className="text-center px-8">
                      <p className="text-white text-2xl font-light tracking-wide">Listening</p>
                      <p className="text-white/80 text-sm font-extralight mt-2">I'm all ears...</p>
                    </div>
                  </>
                )}
                {state === 'thinking' && (
                  <>
                    <motion.div
                      animate={{ 
                        rotate: [0, 360]
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Brain className="w-16 h-16 text-white" strokeWidth={1.5} />
                    </motion.div>
                    <div className="text-center px-8">
                      <p className="text-white text-2xl font-light tracking-wide">Thinking</p>
                      <p className="text-white/80 text-sm font-extralight mt-2">Processing your request</p>
                    </div>
                  </>
                )}
                {state === 'speaking' && (
                  <>
                    <motion.div
                      animate={{ 
                        scale: [1, 1.15, 1]
                      }}
                      transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Volume2 className="w-16 h-16 text-white" strokeWidth={1.5} />
                    </motion.div>
                    <div className="text-center px-8">
                      <p className="text-white text-2xl font-light tracking-wide">Speaking</p>
                      <p className="text-white/80 text-sm font-extralight mt-2">Chroney is responding</p>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          </div>

          {/* Transcript Display */}
          <div className="absolute bottom-32 left-0 right-0 max-h-64 overflow-y-auto px-6">
            <div className="max-w-2xl mx-auto space-y-4">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <div 
                      className={`inline-block px-4 py-2 rounded-2xl ${
                        msg.role === 'user' 
                          ? 'text-white' 
                          : 'bg-white/80 backdrop-blur-sm text-gray-900 shadow-sm'
                      }`}
                      style={msg.role === 'user' ? { 
                        background: `linear-gradient(to right, ${chatColor}, ${chatColorEnd})` 
                      } : undefined}
                    >
                      <p className="text-sm">{msg.text}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 px-2">{formatTime(msg.timestamp)}</p>
                  </div>
                </motion.div>
              ))}

              {/* Current interim transcript */}
              {currentTranscript && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-end"
                >
                  <div className="max-w-[80%] text-right">
                    <div 
                      className="inline-block px-4 py-2 rounded-2xl text-white opacity-70"
                      style={{ background: `linear-gradient(to right, ${chatColor}, ${chatColorEnd})` }}
                    >
                      <p className="text-sm">{currentTranscript}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Microphone permission error */}
        {hasPermission === false && (
          <div className="p-6 bg-white/80 backdrop-blur-sm border-t border-gray-200">
            <p className="text-center text-sm text-red-600">
              Microphone access denied. Please enable it in your browser settings.
            </p>
          </div>
        )}

        <style>{`
          .orb-pulse {
            box-shadow: 0 0 60px rgba(147, 51, 234, 0.4),
                        0 0 120px rgba(59, 130, 246, 0.3),
                        0 0 180px rgba(147, 51, 234, 0.2);
            position: relative;
          }
          
          .orb-pulse::before {
            content: '';
            position: absolute;
            inset: -20px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(147, 51, 234, 0.1) 0%, transparent 70%);
            animation: pulse-ring 3s ease-in-out infinite;
            pointer-events: none;
          }
          
          @keyframes pulse-ring {
            0%, 100% {
              opacity: 0.3;
              transform: scale(1);
            }
            50% {
              opacity: 0.6;
              transform: scale(1.05);
            }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
