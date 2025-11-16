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
  
  // Refs for WebSocket and audio processing
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputWorkletRef = useRef<AudioWorkletNode | null>(null);
  const outputWorkletRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentAIMessageIdRef = useRef<string | null>(null);
  const stateRef = useRef(state);
  
  const { toast } = useToast();
  
  // Keep stateRef in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentTranscript]);

  // Preload AudioContext on mount (24kHz for OpenAI Realtime API)
  useEffect(() => {
    if (isOpen && !audioContextRef.current) {
      try {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        console.log('[VoiceMode] AudioContext initialized, sampleRate:', audioContextRef.current.sampleRate);
      } catch (error) {
        console.error('[VoiceMode] Failed to initialize AudioContext:', error);
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
    ws.binaryType = 'arraybuffer'; // Receive binary PCM16 data
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[VoiceMode] WebSocket connected');
      setIsConnecting(false);
    };

    ws.onmessage = async (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Binary PCM16 audio data from OpenAI
        await handleAudioChunk(event.data);
      } else {
        // JSON message
        try {
          const message = JSON.parse(event.data);
          console.log('[VoiceMode] Received message:', message.type);
          handleJSONMessage(message);
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
    };

    ws.onclose = () => {
      console.log('[VoiceMode] WebSocket closed');
      setIsOnline(false);
      setIsConnecting(false);
    };
  };

  const handleJSONMessage = (message: any) => {
    switch (message.type) {
      case 'ready':
        console.log('[VoiceMode] Service ready');
        setIsOnline(true);
        // Wait for user interaction before requesting mic
        console.log('[VoiceMode] Waiting for user interaction to request microphone...');
        break;

      case 'speech_started':
        console.log('[VoiceMode] Voice activity detected');
        setState('thinking');
        break;

      case 'user_transcript':
        handleUserTranscript(message.text, message.isFinal);
        break;

      case 'ai_transcript':
        handleAITranscript(message.text, message.isFinal);
        break;

      case 'ai_done':
        console.log('[VoiceMode] AI done, transitioning back to listening...');
        setState('listening');
        break;

      case 'interrupt_ack':
        console.log('[VoiceMode] Interrupt acknowledged');
        break;

      case 'cleanup':
        console.log('[VoiceMode] Server requested cleanup');
        // Stop output worklet playback
        if (outputWorkletRef.current) {
          outputWorkletRef.current.port.postMessage({ command: 'stop' });
        }
        setState('idle');
        break;

      case 'error':
        console.error('[VoiceMode] Server error:', message.message);
        toast({
          title: "Error",
          description: message.message,
          variant: "destructive"
        });
        break;
    }
  };

  const handleUserTranscript = (text: string, isFinal: boolean) => {
    if (!text) return;

    if (isFinal) {
      // Add final user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        text: text,
        timestamp: new Date(),
        isFinal: true
      };
      setMessages(prev => [...prev, userMessage]);
      setCurrentTranscript('');
    } else {
      // Show interim transcript
      setCurrentTranscript(text);
    }
  };

  const handleAITranscript = (text: string, isFinal: boolean) => {
    if (!text) return;

    if (isFinal) {
      // Finalize AI message
      if (currentAIMessageIdRef.current) {
        setMessages(prev => prev.map(msg => 
          msg.id === currentAIMessageIdRef.current
            ? { ...msg, text, isFinal: true }
            : msg
        ));
        currentAIMessageIdRef.current = null;
        setState('listening');
      }
    } else {
      // Update or create AI message
      if (!currentAIMessageIdRef.current) {
        const aiMessageId = Date.now().toString();
        currentAIMessageIdRef.current = aiMessageId;
        
        const aiMessage: Message = {
          id: aiMessageId,
          role: 'assistant',
          text: text,
          timestamp: new Date(),
          isFinal: false
        };
        setMessages(prev => [...prev, aiMessage]);
        setState('speaking');
      } else {
        setMessages(prev => prev.map(msg => 
          msg.id === currentAIMessageIdRef.current
            ? { ...msg, text }
            : msg
        ));
      }
    }
  };

  const handleAudioChunk = async (arrayBuffer: ArrayBuffer) => {
    if (!outputWorkletRef.current) return;

    // Send PCM16 audio to output worklet for playback
    outputWorkletRef.current.port.postMessage({ audio: arrayBuffer });
  };

  const startRecording = async () => {
    console.log('[VoiceMode] Starting recording...');
    
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast({
        title: "Connection Error",
        description: "Not connected to voice service",
        variant: "destructive"
      });
      return;
    }

    if (!audioContextRef.current) {
      toast({
        title: "Audio Error",
        description: "Audio system not initialized",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('[VoiceMode] Requesting microphone access...');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      mediaStreamRef.current = stream;
      setHasPermission(true);
      console.log('[VoiceMode] Microphone access granted');

      // Resume AudioContext if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      console.log('[VoiceMode] Actual AudioContext sample rate:', audioContextRef.current.sampleRate);

      // Load input AudioWorklet
      try {
        await audioContextRef.current.audioWorklet.addModule('/pcm16-input-processor.js');
        console.log('[VoiceMode] Input AudioWorklet loaded');
      } catch (error) {
        console.warn('[VoiceMode] Input AudioWorklet already loaded or error:', error);
      }

      // Load output AudioWorklet
      try {
        await audioContextRef.current.audioWorklet.addModule('/pcm16-output-processor.js');
        console.log('[VoiceMode] Output AudioWorklet loaded');
      } catch (error) {
        console.warn('[VoiceMode] Output AudioWorklet already loaded or error:', error);
      }

      // Create input worklet node for capturing audio
      const inputWorklet = new AudioWorkletNode(audioContextRef.current, 'pcm16-input-processor');
      inputWorkletRef.current = inputWorklet;

      // Send PCM16 audio to backend via WebSocket
      inputWorklet.port.onmessage = (event) => {
        if (event.data.audio && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          // Send raw binary PCM16 data (no JSON wrapper)
          wsRef.current.send(event.data.audio);
        }
      };

      // Create output worklet node for playback
      const outputWorklet = new AudioWorkletNode(audioContextRef.current, 'pcm16-output-processor');
      outputWorkletRef.current = outputWorklet;

      // Connect output to speakers
      outputWorklet.connect(audioContextRef.current.destination);

      // Start output worklet
      outputWorklet.port.postMessage({ command: 'start' });

      // Connect microphone to input worklet
      const source = audioContextRef.current.createMediaStreamSource(stream);
      mediaSourceRef.current = source;
      source.connect(inputWorklet);

      console.log('[VoiceMode] Audio pipeline ready');
      setState('listening');

    } catch (error) {
      console.error('[VoiceMode] Failed to start recording:', error);
      setHasPermission(false);
      toast({
        title: "Microphone Error",
        description: "Please allow microphone access to use voice mode",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    console.log('[VoiceMode] Stopping recording...');

    // Stop input worklet
    if (inputWorkletRef.current) {
      inputWorkletRef.current.disconnect();
      inputWorkletRef.current = null;
    }

    // Stop output worklet
    if (outputWorkletRef.current) {
      outputWorkletRef.current.port.postMessage({ command: 'stop' });
      outputWorkletRef.current.disconnect();
      outputWorkletRef.current = null;
    }

    // Stop media source
    if (mediaSourceRef.current) {
      mediaSourceRef.current.disconnect();
      mediaSourceRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        console.log('[VoiceMode] Stopped media track:', track.kind);
        track.stop();
      });
      mediaStreamRef.current = null;
    }

    setState('idle');
    console.log('[VoiceMode] Recording stopped');
  };

  const handleInterrupt = () => {
    console.log('[VoiceMode] User initiated interrupt');
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }

    // Clear current AI message
    if (currentAIMessageIdRef.current) {
      setMessages(prev => prev.filter(msg => msg.id !== currentAIMessageIdRef.current));
      currentAIMessageIdRef.current = null;
    }

    setState('listening');
  };

  const cleanup = () => {
    console.log('[VoiceMode] Cleaning up resources...');

    stopRecording();

    // Close WebSocket
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    // Close AudioContext
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsOnline(false);
    setMessages([]);
    setCurrentTranscript('');
    console.log('[VoiceMode] Cleanup complete');
  };

  // Gradient colors for animated orb
  const gradientStart = chatColor || "#9333ea";
  const gradientEnd = chatColorEnd || "#3b82f6";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">{widgetHeaderText} Voice</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                data-testid="button-close-voice"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto">
              {/* Animated Gradient Orb */}
              <div className="relative w-64 h-64 mb-8">
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
                    filter: 'blur(40px)',
                    opacity: 0.7
                  }}
                  animate={{
                    scale: state === 'speaking' ? [1, 1.2, 1] : state === 'listening' ? [1, 1.1, 1] : 1,
                    opacity: state === 'idle' ? 0.3 : 0.7
                  }}
                  transition={{
                    duration: state === 'speaking' ? 1.5 : 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <motion.div
                  className="absolute inset-8 rounded-full flex items-center justify-center bg-card/80 backdrop-blur-sm border border-border/50"
                  animate={{
                    borderColor: state === 'speaking' ? gradientEnd : state === 'listening' ? gradientStart : 'hsl(var(--border))'
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {state === 'idle' && <Hand className="h-16 w-16 text-muted-foreground" />}
                  {state === 'listening' && <Mic className="h-16 w-16 text-primary animate-pulse" />}
                  {state === 'thinking' && <Brain className="h-16 w-16 text-primary animate-pulse" />}
                  {state === 'speaking' && <Volume2 className="h-16 w-16 text-primary animate-pulse" />}
                </motion.div>
              </div>

              {/* Status Text */}
              <div className="text-center mb-6">
                <p className="text-lg font-medium text-foreground">
                  {state === 'idle' && (isConnecting ? 'Connecting...' : !hasPermission ? 'Tap to start' : 'Ready')}
                  {state === 'listening' && 'Listening...'}
                  {state === 'thinking' && 'Processing...'}
                  {state === 'speaking' && 'Speaking...'}
                </p>
                {!isOnline && !isConnecting && (
                  <p className="text-sm text-muted-foreground mt-2">Not connected</p>
                )}
              </div>

              {/* Connection Status */}
              {hasPermission === false && (
                <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md mb-4">
                  Microphone access denied. Please allow access and try again.
                </div>
              )}

              {/* Messages */}
              <div className="w-full max-h-64 overflow-y-auto space-y-3 mb-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                    </div>
                  </div>
                ))}
                {currentTranscript && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] px-4 py-2 rounded-lg bg-primary/70 text-primary-foreground">
                      <p className="text-sm italic">{currentTranscript}</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Controls */}
              <div className="flex gap-3">
                {state === 'idle' && (
                  <Button
                    onClick={startRecording}
                    disabled={!isOnline || isConnecting}
                    size="lg"
                    data-testid="button-start-voice"
                  >
                    <Mic className="mr-2 h-5 w-5" />
                    Start Voice Chat
                  </Button>
                )}
                
                {state !== 'idle' && (
                  <>
                    <Button
                      onClick={stopRecording}
                      variant="destructive"
                      size="lg"
                      data-testid="button-stop-voice"
                    >
                      Stop
                    </Button>
                    
                    {(state === 'thinking' || state === 'speaking') && (
                      <Button
                        onClick={handleInterrupt}
                        variant="outline"
                        size="lg"
                        data-testid="button-interrupt"
                      >
                        <Hand className="mr-2 h-5 w-5" />
                        Interrupt
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
