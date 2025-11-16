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
  
  // WebRTC References
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAIMessageIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasPermissionRef = useRef(false);
  const isOnlineRef = useRef(false);
  
  const { toast } = useToast();

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentTranscript]);

  // Initialize WebRTC connection
  useEffect(() => {
    if (!isOpen) return;

    connectSignaling();

    return () => {
      cleanup();
    };
  }, [isOpen, userId, businessAccountId]);

  const connectSignaling = () => {
    setIsConnecting(true);
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/voice?businessAccountId=${businessAccountId}&userId=${userId}`;
    
    console.log('[WebRTC VoiceMode] Connecting to signaling server:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WebRTC VoiceMode] Signaling WebSocket connected');
      setIsConnecting(false);
      setIsOnline(true);
      isOnlineRef.current = true;
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        await handleSignalingMessage(data);
      } catch (error) {
        console.error('[WebRTC VoiceMode] Failed to parse signaling message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[WebRTC VoiceMode] Signaling WebSocket error:', error);
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
      console.log('[WebRTC VoiceMode] Signaling WebSocket closed');
      setIsOnline(false);
      isOnlineRef.current = false;
      setIsConnecting(false);
      setState('idle');
      setCurrentTranscript('');
    };
  };

  const handleSignalingMessage = async (data: any) => {
    console.log('[WebRTC VoiceMode] Received signaling message:', data.type);

    switch (data.type) {
      case 'ready':
        console.log('[WebRTC VoiceMode] Signaling server ready');
        // Auto-start if we already have permission
        if (hasPermissionRef.current === true) {
          try {
            await setupWebRTC();
          } catch (error) {
            console.error('[WebRTC VoiceMode] Auto-start failed:', error);
            setState('idle');
          }
        }
        break;

      case 'answer':
        // Received SDP answer from backend
        if (peerConnectionRef.current && data.sdp) {
          const answer = new RTCSessionDescription({
            type: 'answer',
            sdp: data.sdp
          });
          await peerConnectionRef.current.setRemoteDescription(answer);
          console.log('[WebRTC VoiceMode] Set remote description (answer)');
        }
        break;

      case 'ice-candidate':
        // Received ICE candidate from backend
        if (peerConnectionRef.current && data.candidate) {
          const candidate = new RTCIceCandidate(data.candidate);
          await peerConnectionRef.current.addIceCandidate(candidate);
          console.log('[WebRTC VoiceMode] Added ICE candidate');
        }
        break;

      case 'transcript':
        // User transcript from OpenAI
        if (data.isFinal) {
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
          setCurrentTranscript(data.text);
        }
        break;

      case 'ai_transcript':
        // AI transcript chunk
        setState('speaking');
        
        if (!currentAIMessageIdRef.current) {
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
          setMessages(prev => prev.map(msg => 
            msg.id === currentAIMessageIdRef.current
              ? { ...msg, text: msg.text + data.text }
              : msg
          ));
        }
        break;

      case 'ai_speaking':
        setState('speaking');
        break;

      case 'ai_done':
        currentAIMessageIdRef.current = null;
        console.log('[WebRTC VoiceMode] AI done, ready for next turn');
        if (isOnlineRef.current && hasPermissionRef.current) {
          setState('listening');
        } else {
          setState('idle');
        }
        break;

      case 'error':
        toast({
          title: "Error",
          description: data.message || "Voice processing error",
          variant: "destructive"
        });
        setState('idle');
        break;
    }
  };

  const setupWebRTC = async () => {
    try {
      console.log('[WebRTC VoiceMode] Setting up WebRTC connection...');

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      setHasPermission(true);
      hasPermissionRef.current = true;
      localStreamRef.current = stream;

      // Create RTCPeerConnection
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      peerConnectionRef.current = peerConnection;

      // Add local audio track
      stream.getTracks().forEach(track => {
        console.log('[WebRTC VoiceMode] Adding local track:', track.kind);
        peerConnection.addTrack(track, stream);
      });

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          console.log('[WebRTC VoiceMode] Sending ICE candidate to backend');
          wsRef.current.send(JSON.stringify({
            type: 'ice-candidate',
            candidate: event.candidate
          }));
        }
      };

      // Handle remote audio track (from OpenAI assistant)
      peerConnection.ontrack = (event) => {
        console.log('[WebRTC VoiceMode] Received remote track:', event.track.kind);
        
        if (event.track.kind === 'audio') {
          // Create AudioContext for playback
          if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext();
          }

          // Create audio element for remote stream
          const remoteAudio = new Audio();
          remoteAudio.srcObject = event.streams[0];
          remoteAudio.autoplay = true;
          remoteAudioRef.current = remoteAudio;

          // Play the audio
          remoteAudio.play().catch(error => {
            console.error('[WebRTC VoiceMode] Error playing remote audio:', error);
          });

          console.log('[WebRTC VoiceMode] Remote audio playback started');
        }
      };

      // Create and send offer
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });

      await peerConnection.setLocalDescription(offer);

      // Send offer to backend via signaling WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'offer',
          sdp: offer.sdp
        }));
        console.log('[WebRTC VoiceMode] Sent offer to backend');
      }

      setState('listening');
      
    } catch (error: any) {
      console.error('[WebRTC VoiceMode] WebRTC setup error:', error);
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

  const handleInterrupt = () => {
    console.log('[WebRTC VoiceMode] User interrupted! Sending cancel...');
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
    
    currentAIMessageIdRef.current = null;
    setState('listening');
    
    toast({
      title: "Listening",
      description: "Go ahead, I'm listening!",
      duration: 1000
    });
  };

  const cleanup = () => {
    console.log('[WebRTC VoiceMode] Cleaning up resources...');
    
    try {
      // Stop remote audio
      if (remoteAudioRef.current) {
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
        remoteAudioRef.current = null;
      }

      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Stop local media stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('[WebRTC VoiceMode] Stopped media track:', track.kind);
        });
        localStreamRef.current = null;
      }

      // Close WebSocket
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close();
        }
        wsRef.current = null;
      }

      // Close AudioContext
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().then(() => {
          console.log('[WebRTC VoiceMode] AudioContext closed');
        }).catch((error) => {
          console.error('[WebRTC VoiceMode] Error closing AudioContext:', error);
        });
        audioContextRef.current = null;
      }

      // Reset all state
      setState('idle');
      setMessages([]);
      setCurrentTranscript('');
      setIsOnline(false);
      isOnlineRef.current = false;
      setIsConnecting(false);

      console.log('[WebRTC VoiceMode] Cleanup complete');
    } catch (error) {
      console.error('[WebRTC VoiceMode] Error during cleanup:', error);
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
            data-testid="button-close-voice"
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
                  await setupWebRTC();
                } else if (state === 'speaking') {
                  handleInterrupt();
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

              {/* Content inside circle */}
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
