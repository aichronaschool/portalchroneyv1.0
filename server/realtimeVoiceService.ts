import WebSocket from 'ws';
import { storage } from './storage';
import { conversationMemory } from './conversationMemory';

interface VoiceConversation {
  clientWs: WebSocket; // WebSocket to client (browser)
  openaiWs: WebSocket | null; // WebSocket to OpenAI Realtime API
  businessAccountId: string;
  userId: string;
  openaiApiKey: string;
  sessionId: string | null;
  personality?: string;
  companyDescription?: string;
  currency?: string;
  currencySymbol?: string;
  customInstructions?: string;
  isProcessing: boolean;
}

export class RealtimeVoiceService {
  private conversations: Map<string, VoiceConversation> = new Map();

  constructor() {
    console.log('[RealtimeVoice] Service initialized with OpenAI Realtime API');
  }

  isConfigured(): boolean {
    // Always configured since we only need OpenAI API key (no Deepgram needed)
    return true;
  }

  async handleConnection(clientWs: WebSocket, businessAccountId: string, userId: string) {
    console.log('[RealtimeVoice] New connection:', { businessAccountId, userId });

    try {
      const settings = await storage.getWidgetSettings(businessAccountId);
      const businessAccount = await storage.getBusinessAccount(businessAccountId);
      const encryptedOpenaiApiKey = await storage.getBusinessAccountOpenAIKey(businessAccountId);

      if (!encryptedOpenaiApiKey) {
        this.sendError(clientWs, 'OpenAI API key not configured for this business account');
        clientWs.close();
        return;
      }

      if (!businessAccount) {
        this.sendError(clientWs, 'Business account not found');
        clientWs.close();
        return;
      }

      // Decrypt API key
      const { decrypt } = await import('./services/encryptionService');
      const openaiApiKey = decrypt(encryptedOpenaiApiKey);

      const conversationKey = `${userId}_${businessAccountId}_${Date.now()}`;

      // Create conversation object (OpenAI WebSocket will be created when needed)
      const conversation: VoiceConversation = {
        clientWs,
        openaiWs: null,
        businessAccountId,
        userId,
        openaiApiKey,
        sessionId: null,
        personality: settings?.personality || 'friendly',
        companyDescription: businessAccount.description || '',
        currency: settings?.currency || 'USD',
        currencySymbol: settings?.currency === 'USD' ? '$' : '€',
        customInstructions: settings?.customInstructions || undefined,
        isProcessing: false
      };

      this.conversations.set(conversationKey, conversation);

      // Connect to OpenAI Realtime API
      await this.connectToOpenAI(conversationKey, conversation);

      // Setup client WebSocket handlers
      this.setupClientHandlers(conversationKey, conversation);

      // Send ready signal to client
      this.sendToClient(clientWs, { type: 'ready' });

      console.log('[RealtimeVoice] Connection established:', conversationKey);

    } catch (error: any) {
      console.error('[RealtimeVoice] Connection error:', error);
      this.sendError(clientWs, error.message || 'Failed to initialize voice conversation');
      clientWs.close();
    }
  }

  private async connectToOpenAI(conversationKey: string, conversation: VoiceConversation) {
    const url = 'wss://api.openai.com/v1/realtime?model=gpt-realtime-mini';
    
    console.log('[RealtimeVoice] Connecting to OpenAI Realtime API...');

    const openaiWs = new WebSocket(url, {
      headers: {
        'Authorization': `Bearer ${conversation.openaiApiKey}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    conversation.openaiWs = openaiWs;

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('OpenAI connection timeout'));
      }, 10000);

      openaiWs.on('open', () => {
        clearTimeout(timeout);
        console.log('[RealtimeVoice] Connected to OpenAI Realtime API');

        // Build system instructions
        const systemInstructions = this.buildSystemInstructions(conversation);

        // Configure session
        const sessionConfig = {
          type: 'session.update',
          session: {
            instructions: systemInstructions,
            voice: 'shimmer', // Warm, expressive, natural-sounding voice
            modalities: ['audio', 'text'],
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad', // Server-side voice activity detection
              threshold: 0.5, // Balanced sensitivity
              prefix_padding_ms: 300, // Capture speech start smoothly
              silence_duration_ms: 700, // Wait 700ms before responding (more natural)
              create_response: true // Automatically create response when speech ends
            },
            temperature: 0.9, // Higher temperature for more natural, varied responses
            max_response_output_tokens: 1500 // Limit length to keep responses conversational
          }
        };

        openaiWs.send(JSON.stringify(sessionConfig));
        console.log('[RealtimeVoice] Session configured');
        resolve();
      });

      openaiWs.on('message', (data: any) => {
        this.handleOpenAIMessage(conversationKey, conversation, data);
      });

      openaiWs.on('error', (error) => {
        clearTimeout(timeout);
        console.error('[RealtimeVoice] OpenAI WebSocket error:', error);
        this.sendError(conversation.clientWs, 'Voice service error');
        reject(error);
      });

      openaiWs.on('close', () => {
        console.log('[RealtimeVoice] OpenAI WebSocket closed');
        conversation.openaiWs = null;
      });
    });
  }

  private buildSystemInstructions(conversation: VoiceConversation): string {
    const { personality, companyDescription, customInstructions, currencySymbol } = conversation;

    // Build natural, conversational instructions inspired by ChatGPT's Advanced Voice Mode
    let instructions = `You are Chroney, a helpful and friendly AI voice assistant for ${companyDescription || 'a business'}. You're having a natural voice conversation - like a phone call with a helpful friend.

## Your Communication Style:

**Be Genuinely Human-Like:**
- Speak at a relaxed, natural pace - like you're chatting over coffee, not reading a script
- Use natural speech patterns with slight pauses and conversational rhythm
- Show genuine warmth and personality in your tone
- React naturally to what the person says - be enthusiastic when appropriate, empathetic when needed
- Use filler words occasionally (like "well", "you know", "hmm") to sound more natural
- Vary your sentence structure and length to avoid sounding robotic

**Keep It Conversational:**
- Responses should feel like natural conversation, not presentations
- Keep answers brief - 1-3 sentences typically, unless more detail is specifically requested
- Use contractions naturally (I'm, you're, it's, that's)
- Ask follow-up questions when appropriate to keep the conversation flowing
- Acknowledge what they said before answering ("That's a great question!", "I see what you mean")

**Express Personality:**
`;
    
    // Add personality-specific traits
    if (personality === 'friendly') {
      instructions += `- Be warm, upbeat, and genuinely interested in helping
- Use an encouraging, supportive tone
- Show enthusiasm when appropriate
- Make the person feel heard and valued\n\n`;
    } else if (personality === 'professional') {
      instructions += `- Be polite, respectful, and competent
- Maintain a professional yet personable tone
- Be clear and efficient without being cold
- Project confidence and reliability\n\n`;
    } else if (personality === 'casual') {
      instructions += `- Be relaxed, friendly, and easy-going
- Keep things light and conversational
- Use casual language naturally
- Be approachable and down-to-earth\n\n`;
    }

    instructions += `**Product Recommendations:**
- When suggesting products, mention 1-2 options with brief, natural descriptions
- Talk about products like you're recommending something to a friend
- Prices in ${currencySymbol}

**Important Conversation Rules:**
- NEVER use emojis, emoticons, or special characters
- Don't read out URLs or technical codes
- If interrupted, gracefully acknowledge and move on
- Stay focused on being genuinely helpful
- Keep responses conversational, not formal or scripted`;

    // Add custom business instructions
    if (customInstructions) {
      instructions += `\n\n**Additional Business Context:**\n${customInstructions}`;
    }

    return instructions;
  }

  private handleOpenAIMessage(conversationKey: string, conversation: VoiceConversation, data: any) {
    try {
      const event = JSON.parse(data.toString());
      console.log('[RealtimeVoice] OpenAI event:', event.type);

      switch (event.type) {
        case 'session.created':
          console.log('[RealtimeVoice] Session created:', event.session.id);
          conversation.sessionId = event.session.id;
          break;

        case 'session.updated':
          console.log('[RealtimeVoice] Session updated');
          break;

        case 'input_audio_buffer.speech_started':
          console.log('[RealtimeVoice] User started speaking');
          this.sendToClient(conversation.clientWs, { type: 'speech_started' });
          break;

        case 'input_audio_buffer.speech_stopped':
          console.log('[RealtimeVoice] User stopped speaking');
          break;

        case 'input_audio_buffer.committed':
          console.log('[RealtimeVoice] Audio buffer committed');
          this.sendToClient(conversation.clientWs, { 
            type: 'transcript',
            text: '',
            isFinal: false
          });
          break;

        case 'conversation.item.input_audio_transcription.completed':
          // User's speech transcribed
          const userTranscript = event.transcript;
          console.log('[RealtimeVoice] User transcript:', userTranscript);
          
          this.sendToClient(conversation.clientWs, {
            type: 'transcript',
            text: userTranscript,
            isFinal: true
          });
          break;

        case 'response.created':
          console.log('[RealtimeVoice] Response created');
          conversation.isProcessing = true;
          break;

        case 'response.output_item.added':
          console.log('[RealtimeVoice] Output item added');
          break;

        case 'response.content_part.added':
          console.log('[RealtimeVoice] Content part added');
          break;

        case 'response.audio_transcript.delta':
          // AI's speech transcript chunk
          const transcriptDelta = event.delta;
          console.log('[RealtimeVoice] AI transcript delta:', transcriptDelta);
          
          this.sendToClient(conversation.clientWs, {
            type: 'ai_chunk',
            text: transcriptDelta
          });
          break;

        case 'response.audio.delta':
          // AI's audio chunk (base64 encoded PCM16)
          const audioDelta = event.delta;
          
          // Decode base64 and send binary audio to client
          const audioBuffer = Buffer.from(audioDelta, 'base64');
          if (conversation.clientWs.readyState === WebSocket.OPEN) {
            conversation.clientWs.send(audioBuffer);
          }
          break;

        case 'response.audio_transcript.done':
          console.log('[RealtimeVoice] AI transcript complete');
          break;

        case 'response.audio.done':
          console.log('[RealtimeVoice] AI audio complete');
          break;

        case 'response.done':
          console.log('[RealtimeVoice] Response complete');
          conversation.isProcessing = false;
          
          this.sendToClient(conversation.clientWs, { type: 'ai_done' });
          break;

        case 'rate_limits.updated':
          // Rate limit info - can be logged if needed
          break;

        case 'error':
          console.error('[RealtimeVoice] OpenAI error:', event.error);
          this.sendError(conversation.clientWs, event.error.message || 'Voice processing error');
          break;

        default:
          // Log unknown events for debugging
          console.log('[RealtimeVoice] Unknown event type:', event.type);
      }
    } catch (error) {
      console.error('[RealtimeVoice] Error handling OpenAI message:', error);
    }
  }

  private setupClientHandlers(conversationKey: string, conversation: VoiceConversation) {
    const { clientWs, openaiWs } = conversation;

    clientWs.on('message', async (data: any) => {
      if (data instanceof Buffer) {
        // Binary audio data from client - forward to OpenAI
        if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
          // Convert audio to base64 for OpenAI
          const base64Audio = data.toString('base64');
          
          const audioAppend = {
            type: 'input_audio_buffer.append',
            audio: base64Audio
          };
          
          openaiWs.send(JSON.stringify(audioAppend));
        }
      } else {
        // JSON message from client
        try {
          const message = JSON.parse(data.toString());
          await this.handleClientMessage(conversationKey, conversation, message);
        } catch (error) {
          console.error('[RealtimeVoice] Error parsing client message:', error);
        }
      }
    });

    clientWs.on('close', () => {
      console.log('[RealtimeVoice] Client disconnected');
      this.cleanup(conversationKey);
    });

    clientWs.on('error', (error) => {
      console.error('[RealtimeVoice] Client WebSocket error:', error);
      this.cleanup(conversationKey);
    });
  }

  private async handleClientMessage(
    conversationKey: string,
    conversation: VoiceConversation,
    message: any
  ) {
    const { openaiWs } = conversation;

    console.log('[RealtimeVoice] Client message:', message.type);

    switch (message.type) {
      case 'interrupt':
        // User interrupted AI - cancel current response and clear audio buffer
        console.log('[RealtimeVoice] User interrupted AI');
        
        if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
          // Cancel any in-progress response
          openaiWs.send(JSON.stringify({
            type: 'response.cancel'
          }));
          
          // Clear the input audio buffer to prevent stale audio from being processed
          openaiWs.send(JSON.stringify({
            type: 'input_audio_buffer.clear'
          }));
          
          console.log('[RealtimeVoice] Sent response.cancel and buffer.clear to OpenAI');
        }
        
        conversation.isProcessing = false;
        
        // Acknowledge interrupt to client
        this.sendToClient(conversation.clientWs, { type: 'interrupt_ack' });
        break;

      case 'commit_audio':
        // Manual commit (if not using server VAD)
        if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
          openaiWs.send(JSON.stringify({
            type: 'input_audio_buffer.commit'
          }));
        }
        break;

      default:
        console.log('[RealtimeVoice] Unknown client message type:', message.type);
    }
  }

  private sendToClient(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, message: string) {
    this.sendToClient(ws, { type: 'error', message });
  }

  private cleanup(conversationKey: string) {
    const conversation = this.conversations.get(conversationKey);
    if (!conversation) return;

    console.log('[RealtimeVoice] Cleaning up conversation:', conversationKey);

    try {
      // Close OpenAI WebSocket
      if (conversation.openaiWs) {
        conversation.openaiWs.close();
        conversation.openaiWs = null;
      }

      // Close client WebSocket if still open
      if (conversation.clientWs && conversation.clientWs.readyState === WebSocket.OPEN) {
        conversation.clientWs.close();
      }
    } catch (error) {
      console.error('[RealtimeVoice] Cleanup error:', error);
    }

    this.conversations.delete(conversationKey);
  }
}

export const realtimeVoiceService = new RealtimeVoiceService();
