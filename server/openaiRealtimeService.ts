/**
 * OpenAI Realtime Voice API Integration
 * Full-duplex voice conversation with real-time transcription and audio streaming
 * Model: gpt-realtime-mini (configurable)
 */

import WebSocket from 'ws';
import { storage } from './storage';

interface VoiceConnection {
  clientWs: WebSocket;
  openaiWs: WebSocket | null;
  businessAccountId: string;
  userId: string;
  isConnected: boolean;
}

class OpenAIRealtimeService {
  private connections: Map<string, VoiceConnection>;

  constructor() {
    this.connections = new Map();
    console.log('[OpenAI Realtime] Service initialized');
  }

  /**
   * Handle new client WebSocket connection
   */
  async handleConnection(clientWs: WebSocket, businessAccountId: string, userId: string): Promise<void> {
    const connectionKey = `${userId}_${businessAccountId}_${Date.now()}`;
    
    console.log('[OpenAI Realtime] New connection:', {
      businessAccountId,
      userId,
      key: connectionKey
    });

    // Get business-specific OpenAI API key
    const apiKey = await storage.getBusinessAccountOpenAIKey(businessAccountId);
    if (!apiKey) {
      console.error('[OpenAI Realtime] No API key configured for business account:', businessAccountId);
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

    // Create connection object
    const connection: VoiceConnection = {
      clientWs,
      openaiWs: null,
      businessAccountId,
      userId,
      isConnected: false
    };

    this.connections.set(connectionKey, connection);

    try {
      // Connect to OpenAI Realtime API
      await this.connectToOpenAI(connection, decryptedKey);

      // Set up client WebSocket handlers
      this.setupClientHandlers(connection, connectionKey);

      // Notify client that service is ready
      clientWs.send(JSON.stringify({ type: 'ready' }));

    } catch (error) {
      console.error('[OpenAI Realtime] Connection setup error:', error);
      clientWs.send(JSON.stringify({
        type: 'error',
        message: 'Failed to connect to OpenAI Realtime API'
      }));
      this.cleanup(connectionKey);
    }
  }

  /**
   * Connect to OpenAI Realtime API
   */
  private async connectToOpenAI(connection: VoiceConnection, apiKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use gpt-realtime-mini model (cost-effective and fast)
      const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-mini';
      const wsUrl = `wss://api.openai.com/v1/realtime?model=${model}`;

      console.log('[OpenAI Realtime] Connecting to OpenAI:', model);

      const openaiWs = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      connection.openaiWs = openaiWs;

      openaiWs.on('open', () => {
        console.log('[OpenAI Realtime] Connected to OpenAI Realtime API');
        connection.isConnected = true;

        // Configure session with system instructions
        const sessionConfig = {
          type: 'session.update',
          session: {
            instructions: `You are Chroney, a helpful and friendly AI voice assistant.

## Speaking Style - CLARITY IS PRIORITY:

**Speak Clearly and Distinctly:**
- Enunciate each word clearly and precisely
- Speak at a moderate, measured pace
- Pause naturally between sentences
- Use clear, simple language
- Avoid mumbling or trailing off

**Be Conversational Yet Professional:**
- Keep responses brief (1-3 sentences typically)
- Use contractions naturally (I'm, you're, it's, that's)
- Show warmth and friendliness in your tone
- Be direct and helpful

**Important Rules:**
- NEVER use emojis or special characters
- Speak clearly enough for a phone call
- If interrupted, acknowledge gracefully and continue`,
            voice: 'alloy',
            modalities: ['audio', 'text'],
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
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
        };

        openaiWs.send(JSON.stringify(sessionConfig));
        resolve();
      });

      openaiWs.on('message', (data: WebSocket.Data) => {
        this.handleOpenAIMessage(connection, data);
      });

      openaiWs.on('error', (error) => {
        console.error('[OpenAI Realtime] OpenAI WebSocket error:', error);
        reject(error);
      });

      openaiWs.on('close', () => {
        console.log('[OpenAI Realtime] OpenAI WebSocket closed');
        connection.isConnected = false;
        if (connection.clientWs.readyState === WebSocket.OPEN) {
          connection.clientWs.send(JSON.stringify({
            type: 'error',
            message: 'Connection to OpenAI lost'
          }));
        }
      });
    });
  }

  /**
   * Set up client WebSocket event handlers
   */
  private setupClientHandlers(connection: VoiceConnection, connectionKey: string): void {
    const { clientWs, openaiWs } = connection;

    clientWs.on('message', (data: WebSocket.Data) => {
      if (!openaiWs || openaiWs.readyState !== WebSocket.OPEN) {
        console.warn('[OpenAI Realtime] OpenAI WebSocket not ready');
        return;
      }

      // Handle different message types
      if (Buffer.isBuffer(data)) {
        // Binary audio data from client (PCM16 at 24kHz)
        // Send directly to OpenAI
        openaiWs.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: data.toString('base64')
        }));
      } else {
        // JSON message
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'interrupt') {
            // User interrupted - cancel current response
            console.log('[OpenAI Realtime] User interrupted');
            openaiWs.send(JSON.stringify({
              type: 'response.cancel'
            }));
            openaiWs.send(JSON.stringify({
              type: 'input_audio_buffer.clear'
            }));
            // Acknowledge interrupt
            clientWs.send(JSON.stringify({ type: 'interrupt_ack' }));
          }
        } catch (error) {
          console.error('[OpenAI Realtime] Failed to parse client message:', error);
        }
      }
    });

    clientWs.on('close', () => {
      console.log('[OpenAI Realtime] Client disconnected');
      this.cleanup(connectionKey);
    });

    clientWs.on('error', (error) => {
      console.error('[OpenAI Realtime] Client WebSocket error:', error);
      this.cleanup(connectionKey);
    });
  }

  /**
   * Handle messages from OpenAI Realtime API
   */
  private handleOpenAIMessage(connection: VoiceConnection, data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      const { clientWs } = connection;

      if (clientWs.readyState !== WebSocket.OPEN) {
        return;
      }

      // Log event type for debugging
      console.log('[OpenAI Realtime] Event:', message.type);

      switch (message.type) {
        case 'session.created':
        case 'session.updated':
          console.log('[OpenAI Realtime] Session ready');
          break;

        case 'input_audio_buffer.speech_started':
          // User started speaking
          clientWs.send(JSON.stringify({ type: 'speech_started' }));
          break;

        case 'input_audio_buffer.speech_stopped':
          // User stopped speaking
          break;

        case 'conversation.item.input_audio_transcription.completed':
          // User transcript ready
          clientWs.send(JSON.stringify({
            type: 'transcript',
            text: message.transcript || '',
            isFinal: true
          }));
          break;

        case 'conversation.item.input_audio_transcription.delta':
          // Interim user transcript
          clientWs.send(JSON.stringify({
            type: 'transcript',
            text: message.delta || '',
            isFinal: false
          }));
          break;

        case 'response.audio_transcript.delta':
          // AI transcript chunk (streaming text)
          clientWs.send(JSON.stringify({
            type: 'ai_chunk',
            text: message.delta || ''
          }));
          break;

        case 'response.audio_transcript.done':
          // AI transcript complete
          console.log('[OpenAI Realtime] AI transcript complete');
          break;

        case 'response.audio.delta':
          // AI audio chunk (binary PCM16 data)
          if (message.delta) {
            const audioData = Buffer.from(message.delta, 'base64');
            clientWs.send(audioData);
          }
          break;

        case 'response.audio.done':
          // AI audio complete
          console.log('[OpenAI Realtime] AI audio complete');
          break;

        case 'response.done':
          // Response complete - notify client
          clientWs.send(JSON.stringify({ type: 'ai_done' }));
          break;

        case 'error':
          // Error from OpenAI
          console.error('[OpenAI Realtime] OpenAI error:', message.error);
          clientWs.send(JSON.stringify({
            type: 'error',
            message: message.error?.message || 'OpenAI API error'
          }));
          break;

        case 'rate_limits.updated':
          // Rate limit info (optional to handle)
          console.log('[OpenAI Realtime] Rate limits:', message.rate_limits);
          break;

        default:
          // Unknown event type
          console.log('[OpenAI Realtime] Unhandled event:', message.type);
          break;
      }
    } catch (error) {
      console.error('[OpenAI Realtime] Error handling OpenAI message:', error);
    }
  }

  /**
   * Clean up connection resources
   */
  private cleanup(connectionKey: string): void {
    const connection = this.connections.get(connectionKey);
    if (!connection) return;

    console.log('[OpenAI Realtime] Cleaning up connection:', connectionKey);

    // Close OpenAI WebSocket
    if (connection.openaiWs && connection.openaiWs.readyState === WebSocket.OPEN) {
      connection.openaiWs.close();
    }

    // Remove from connections map
    this.connections.delete(connectionKey);

    console.log('[OpenAI Realtime] Cleanup complete. Active connections:', this.connections.size);
  }
}

export const openaiRealtimeService = new OpenAIRealtimeService();
