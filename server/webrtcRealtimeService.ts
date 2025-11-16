/**
 * WebRTC-based OpenAI Realtime Voice Service
 * Uses WebRTC for full-duplex OPUS audio streaming
 * No PCM16, no base64, no AudioWorklet
 */

import WebSocket from 'ws';
import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, MediaStream, nonstandard } from 'wrtc';
import { storage } from './storage';

const { RTCVideoSource, RTCAudioSource } = nonstandard;

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'interrupt';
  sdp?: string;
  candidate?: any;
}

interface VoiceSession {
  clientWs: WebSocket;
  clientPeerConnection: RTCPeerConnection;
  openaiWs: WebSocket | null;
  openaiPeerConnection: RTCPeerConnection | null;
  businessAccountId: string;
  userId: string;
  isConnected: boolean;
}

class WebRTCRealtimeService {
  private sessions: Map<string, VoiceSession>;

  constructor() {
    this.sessions = new Map();
    console.log('[WebRTC Realtime] Service initialized');
  }

  /**
   * Handle new WebSocket connection for signaling
   */
  async handleSignalingConnection(clientWs: WebSocket, businessAccountId: string, userId: string): Promise<void> {
    const sessionKey = `${userId}_${businessAccountId}_${Date.now()}`;
    
    console.log('[WebRTC Realtime] New signaling connection:', {
      businessAccountId,
      userId,
      sessionKey
    });

    // Get business-specific OpenAI API key
    const apiKey = await storage.getBusinessAccountOpenAIKey(businessAccountId);
    if (!apiKey) {
      console.error('[WebRTC Realtime] No API key configured for business account:', businessAccountId);
      clientWs.send(JSON.stringify({
        type: 'error',
        message: 'OpenAI API key not configured. Please contact support.'
      }));
      clientWs.close();
      return;
    }

    // Decrypt API key
    const { decrypt } = await import('./services/encryptionService');
    const decryptedKey = decrypt(apiKey);

    // Create WebRTC peer connection for client
    const clientPeerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    // Create session
    const session: VoiceSession = {
      clientWs,
      clientPeerConnection,
      openaiWs: null,
      openaiPeerConnection: null,
      businessAccountId,
      userId,
      isConnected: false
    };

    this.sessions.set(sessionKey, session);

    // Set up ICE candidate handling for client connection
    clientPeerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WebRTC Realtime] Sending ICE candidate to client');
        clientWs.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate
        }));
      }
    };

    // Handle incoming audio track from client (user's microphone)
    clientPeerConnection.ontrack = async (event) => {
      console.log('[WebRTC Realtime] Received track from client:', event.track.kind);
      
      if (event.track.kind === 'audio') {
        // Forward this track to OpenAI
        await this.setupOpenAIConnection(session, decryptedKey, event.streams[0]);
      }
    };

    // Set up signaling message handler
    this.setupSignalingHandlers(session, sessionKey);

    // Notify client ready
    clientWs.send(JSON.stringify({ type: 'ready' }));
  }

  /**
   * Set up OpenAI Realtime WebRTC connection
   */
  private async setupOpenAIConnection(session: VoiceSession, apiKey: string, clientAudioStream: MediaStream): Promise<void> {
    try {
      const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-mini';
      const wsUrl = `wss://api.openai.com/v1/realtime?model=${model}`;

      console.log('[WebRTC Realtime] Connecting to OpenAI:', model);

      // Create WebSocket to OpenAI for WebRTC signaling
      const openaiWs = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      session.openaiWs = openaiWs;

      openaiWs.on('open', async () => {
        console.log('[WebRTC Realtime] Connected to OpenAI WebSocket');
        
        // Create peer connection for OpenAI
        const openaiPeerConnection = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        session.openaiPeerConnection = openaiPeerConnection;

        // Add client's audio track to OpenAI peer connection
        clientAudioStream.getTracks().forEach(track => {
          console.log('[WebRTC Realtime] Adding client track to OpenAI peer connection');
          openaiPeerConnection.addTrack(track, clientAudioStream);
        });

        // Handle ICE candidates for OpenAI connection
        openaiPeerConnection.onicecandidate = (event) => {
          if (event.candidate && openaiWs.readyState === WebSocket.OPEN) {
            openaiWs.send(JSON.stringify({
              type: 'ice-candidate',
              candidate: event.candidate
            }));
          }
        };

        // Handle incoming audio track from OpenAI (assistant's voice)
        openaiPeerConnection.ontrack = (event) => {
          console.log('[WebRTC Realtime] Received track from OpenAI:', event.track.kind);
          
          if (event.track.kind === 'audio') {
            // Forward OpenAI's audio track to client
            session.clientPeerConnection.addTrack(event.track, event.streams[0]);
            
            // Notify client that assistant is speaking
            session.clientWs.send(JSON.stringify({ type: 'ai_speaking' }));
          }
        };

        // Create and send offer to OpenAI
        const offer = await openaiPeerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        });

        await openaiPeerConnection.setLocalDescription(offer);

        // Send offer to OpenAI with session configuration
        openaiWs.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['audio', 'text'],
            instructions: `You are Chroney, a helpful and friendly AI voice assistant.

## Speaking Style - CLARITY IS PRIORITY:

**Speak Clearly and Distinctly:**
- Enunciate each word clearly and precisely
- Speak at a moderate, measured pace
- Pause naturally between sentences
- Use clear, simple language

**Be Conversational Yet Professional:**
- Keep responses brief (1-3 sentences typically)
- Use contractions naturally (I'm, you're, it's)
- Show warmth and friendliness in your tone

**Important Rules:**
- NEVER use emojis or special characters
- Speak clearly enough for a phone call
- If interrupted, acknowledge gracefully and continue`,
            voice: 'alloy',
            input_audio_format: 'opus',
            output_audio_format: 'opus',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 700
            },
            temperature: 0.8,
            max_response_output_tokens: 1500
          }
        }));

        // Send WebRTC offer to OpenAI
        openaiWs.send(JSON.stringify({
          type: 'webrtc.offer',
          sdp: offer.sdp
        }));
      });

      openaiWs.on('message', async (data: WebSocket.Data) => {
        await this.handleOpenAIMessage(session, data);
      });

      openaiWs.on('error', (error) => {
        console.error('[WebRTC Realtime] OpenAI WebSocket error:', error);
        session.clientWs.send(JSON.stringify({
          type: 'error',
          message: 'Connection to OpenAI failed'
        }));
      });

      openaiWs.on('close', () => {
        console.log('[WebRTC Realtime] OpenAI WebSocket closed');
        session.isConnected = false;
      });

    } catch (error) {
      console.error('[WebRTC Realtime] Failed to setup OpenAI connection:', error);
      session.clientWs.send(JSON.stringify({
        type: 'error',
        message: 'Failed to connect to OpenAI'
      }));
    }
  }

  /**
   * Handle messages from OpenAI
   */
  private async handleOpenAIMessage(session: VoiceSession, data: WebSocket.Data): Promise<void> {
    try {
      const message = JSON.parse(data.toString());

      console.log('[WebRTC Realtime] OpenAI message:', message.type);

      switch (message.type) {
        case 'webrtc.answer':
          // Received SDP answer from OpenAI
          if (session.openaiPeerConnection && message.sdp) {
            const answer = new RTCSessionDescription({
              type: 'answer',
              sdp: message.sdp
            });
            await session.openaiPeerConnection.setRemoteDescription(answer);
            console.log('[WebRTC Realtime] Set OpenAI remote description');
            session.isConnected = true;
          }
          break;

        case 'ice-candidate':
          // Received ICE candidate from OpenAI
          if (session.openaiPeerConnection && message.candidate) {
            const candidate = new RTCIceCandidate(message.candidate);
            await session.openaiPeerConnection.addIceCandidate(candidate);
            console.log('[WebRTC Realtime] Added OpenAI ICE candidate');
          }
          break;

        case 'session.created':
        case 'session.updated':
          console.log('[WebRTC Realtime] OpenAI session ready');
          break;

        case 'conversation.item.input_audio_transcription.completed':
          // Forward user transcript to client
          session.clientWs.send(JSON.stringify({
            type: 'transcript',
            text: message.transcript || '',
            role: 'user',
            isFinal: true
          }));
          break;

        case 'response.audio_transcript.delta':
          // Forward AI transcript chunk to client
          session.clientWs.send(JSON.stringify({
            type: 'ai_transcript',
            text: message.delta || ''
          }));
          break;

        case 'response.done':
          // AI finished speaking
          session.clientWs.send(JSON.stringify({ type: 'ai_done' }));
          break;

        case 'error':
          console.error('[WebRTC Realtime] OpenAI error:', message.error);
          session.clientWs.send(JSON.stringify({
            type: 'error',
            message: message.error?.message || 'OpenAI API error'
          }));
          break;
      }
    } catch (error) {
      console.error('[WebRTC Realtime] Error handling OpenAI message:', error);
    }
  }

  /**
   * Set up signaling message handlers
   */
  private setupSignalingHandlers(session: VoiceSession, sessionKey: string): void {
    const { clientWs, clientPeerConnection } = session;

    clientWs.on('message', async (data: WebSocket.Data) => {
      try {
        const message: SignalingMessage = JSON.parse(data.toString());

        console.log('[WebRTC Realtime] Client signaling message:', message.type);

        switch (message.type) {
          case 'offer':
            // Received SDP offer from client
            if (message.sdp) {
              const offer = new RTCSessionDescription({
                type: 'offer',
                sdp: message.sdp
              });

              await clientPeerConnection.setRemoteDescription(offer);

              // Create answer
              const answer = await clientPeerConnection.createAnswer();
              await clientPeerConnection.setLocalDescription(answer);

              // Send answer back to client
              clientWs.send(JSON.stringify({
                type: 'answer',
                sdp: answer.sdp
              }));

              console.log('[WebRTC Realtime] Sent answer to client');
            }
            break;

          case 'ice-candidate':
            // Received ICE candidate from client
            if (message.candidate) {
              const candidate = new RTCIceCandidate(message.candidate);
              await clientPeerConnection.addIceCandidate(candidate);
              console.log('[WebRTC Realtime] Added client ICE candidate');
            }
            break;

          case 'interrupt':
            // User interrupted - send cancel to OpenAI
            if (session.openaiWs && session.openaiWs.readyState === WebSocket.OPEN) {
              session.openaiWs.send(JSON.stringify({
                type: 'response.cancel'
              }));
              console.log('[WebRTC Realtime] Sent interrupt to OpenAI');
            }
            break;
        }
      } catch (error) {
        console.error('[WebRTC Realtime] Error handling signaling message:', error);
      }
    });

    clientWs.on('close', () => {
      console.log('[WebRTC Realtime] Client signaling closed');
      this.cleanup(sessionKey);
    });

    clientWs.on('error', (error) => {
      console.error('[WebRTC Realtime] Client signaling error:', error);
      this.cleanup(sessionKey);
    });
  }

  /**
   * Clean up session resources
   */
  private cleanup(sessionKey: string): void {
    const session = this.sessions.get(sessionKey);
    if (!session) return;

    console.log('[WebRTC Realtime] Cleaning up session:', sessionKey);

    // Close client peer connection
    if (session.clientPeerConnection) {
      session.clientPeerConnection.close();
    }

    // Close OpenAI peer connection
    if (session.openaiPeerConnection) {
      session.openaiPeerConnection.close();
    }

    // Close OpenAI WebSocket
    if (session.openaiWs && session.openaiWs.readyState === WebSocket.OPEN) {
      session.openaiWs.close();
    }

    this.sessions.delete(sessionKey);

    console.log('[WebRTC Realtime] Cleanup complete. Active sessions:', this.sessions.size);
  }
}

export const webrtcRealtimeService = new WebRTCRealtimeService();
