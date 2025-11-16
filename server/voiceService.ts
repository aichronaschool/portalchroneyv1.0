import WebSocket from 'ws';
import { aiTools } from './aiTools';
import { ToolExecutionService } from './services/toolExecutionService';
import { conversationMemory } from './conversationMemory';
import { storage } from './storage';
import { businessContextCache } from './services/businessContextCache';

interface VoiceSessionConfig {
  userId: string;
  businessAccountId: string;
  personality: string;
  companyDescription: string;
  openaiApiKey?: string;
  customInstructions?: string;
}

interface VoiceChunk {
  type: 'audio' | 'transcript' | 'tool_call' | 'error' | 'session_ready';
  data: any;
}

export class VoiceService {
  private ws: WebSocket | null = null;
  private sessionConfig: VoiceSessionConfig | null = null;
  private conversationId: string | null = null;
  private activeSessionKey: string | null = null;

  /**
   * Create a client auth token for OpenAI Realtime API
   * This token is used by the frontend to connect directly to OpenAI
   */
  async createClientToken(apiKey: string): Promise<string> {
    // For OpenAI Realtime API, we use ephemeral tokens
    // The frontend will connect directly to OpenAI's WebSocket
    return apiKey; // In production, you'd create an ephemeral token
  }

  /**
   * Initialize a voice session with business context
   */
  async initializeSession(config: VoiceSessionConfig): Promise<WebSocket> {
    this.sessionConfig = config;
    this.activeSessionKey = `${config.userId}_${config.businessAccountId}`;

    // Get or create conversation
    const conversation = await storage.createConversation({
      businessAccountId: config.businessAccountId,
      title: 'Voice Conversation'
    });
    this.conversationId = conversation.id;

    const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Connect to OpenAI Realtime API
    const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
    this.ws = new WebSocket(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket not initialized'));
        return;
      }

      this.ws.on('open', async () => {
        console.log('[Voice] Connected to OpenAI Realtime API');
        
        // Build system context with business information
        const systemContext = await this.buildSystemContext(config);
        
        // Configure session with business context and tools
        const sessionUpdate = {
          type: 'session.update',
          session: {
            modalities: ['audio', 'text'],
            instructions: systemContext,
            voice: 'alloy', // Default voice, can be customized
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad', // Server-side voice activity detection
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            },
            tools: this.convertToRealtimeTools(aiTools),
            tool_choice: 'auto',
            temperature: 0.8
          }
        };

        this.ws?.send(JSON.stringify(sessionUpdate));
        console.log('[Voice] Session configured with business context and tools');
        
        resolve(this.ws!);
      });

      this.ws.on('error', (error) => {
        console.error('[Voice] WebSocket error:', error);
        reject(error);
      });

      // Handle messages from OpenAI
      this.ws.on('message', async (data) => {
        await this.handleRealtimeMessage(data.toString());
      });

      this.ws.on('close', () => {
        console.log('[Voice] WebSocket connection closed');
        this.cleanup();
      });
    });
  }

  /**
   * Build system context with business information, FAQs, and custom instructions
   */
  private async buildSystemContext(config: VoiceSessionConfig): Promise<string> {
    const { businessAccountId, personality, companyDescription, customInstructions } = config;

    // Get business context from cache
    const faqs = await businessContextCache.getOrFetch(
      `faqs_${businessAccountId}`,
      () => storage.getAllFaqs(businessAccountId)
    );

    const websiteAnalysis = await businessContextCache.getOrFetch(
      `website_analysis_${businessAccountId}`,
      () => storage.getWebsiteAnalysis(businessAccountId)
    );

    // Build comprehensive system prompt
    let context = `You are Chroney, an AI voice assistant for this business.

PERSONALITY: ${this.getPersonalityTraits(personality)}

CURRENT CONTEXT:
- Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Time: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}

`;

    // Add company description
    if (companyDescription) {
      context += `\nCOMPANY INFORMATION:\n${companyDescription}\n`;
    }

    // Add custom instructions
    if (customInstructions) {
      context += `\nCUSTOM BUSINESS INSTRUCTIONS:\n${customInstructions}\n`;
    }

    // Add FAQs knowledge base
    if (faqs.length > 0) {
      context += `\nKNOWLEDGE BASE (FAQs):\n`;
      faqs.forEach((faq, index) => {
        context += `${index + 1}. Q: ${faq.question}\n   A: ${faq.answer}\n\n`;
      });
    }

    // Add website analysis if available
    if (websiteAnalysis && websiteAnalysis.analyzedContent) {
      context += `\nWEBSITE ANALYSIS:\n${websiteAnalysis.analyzedContent}\n`;
    }

    context += `\nIMPORTANT VOICE ASSISTANT GUIDELINES:
- Speak naturally and conversationally
- Keep responses concise and clear for voice interaction
- Always respond in the same language the user speaks (automatic language detection)
- When switching languages, maintain conversation context
- For appointment booking, use the list_available_slots and book_appointment tools
- For lead capture, use the capture_lead tool when users provide contact information
- For product inquiries, use the get_products tool
- Be proactive in helping users accomplish their goals
- Confirm important information (appointments, contact details) before finalizing

TOOL USAGE RULES:
1. For appointment questions: ALWAYS call list_available_slots first
2. For booking: Call book_appointment with the chosen slot
3. For lead capture: Use capture_lead when users provide name, email, or phone
4. For products: Use get_products to show available items
`;

    return context;
  }

  /**
   * Convert existing aiTools to OpenAI Realtime API format
   */
  private convertToRealtimeTools(tools: any[]): any[] {
    return tools.map(tool => ({
      type: 'function',
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters
    }));
  }

  /**
   * Handle incoming messages from OpenAI Realtime API
   */
  private async handleRealtimeMessage(message: string) {
    try {
      const event = JSON.parse(message);
      
      // Log important events
      if (event.type !== 'response.audio.delta' && event.type !== 'input_audio_buffer.speech_started') {
        console.log('[Voice] Event:', event.type);
      }

      // Handle different event types
      switch (event.type) {
        case 'session.created':
          console.log('[Voice] Session created:', event.session.id);
          break;

        case 'session.updated':
          console.log('[Voice] Session updated');
          break;

        case 'conversation.item.input_audio_transcription.completed':
          // User's speech was transcribed
          const userTranscript = event.transcript;
          console.log('[Voice] User said:', userTranscript);
          
          // Store in conversation memory
          if (this.sessionConfig) {
            conversationMemory.storeMessage(this.sessionConfig.userId, 'user', userTranscript);
            if (this.conversationId) {
              await storage.createMessage({
                conversationId: this.conversationId,
                role: 'user',
                content: userTranscript
              });
            }
          }
          break;

        case 'response.function_call_arguments.done':
          // AI wants to call a tool
          await this.handleToolCall(event);
          break;

        case 'response.audio_transcript.done':
          // AI's full response transcript is ready
          const assistantTranscript = event.transcript;
          console.log('[Voice] AI said:', assistantTranscript);
          
          // Store in conversation memory
          if (this.sessionConfig) {
            conversationMemory.storeMessage(this.sessionConfig.userId, 'assistant', assistantTranscript);
            if (this.conversationId) {
              await storage.createMessage({
                conversationId: this.conversationId,
                role: 'assistant',
                content: assistantTranscript
              });
            }
          }
          break;

        case 'response.done':
          console.log('[Voice] Response completed');
          break;

        case 'error':
          console.error('[Voice] API Error:', event.error);
          break;
      }
    } catch (error) {
      console.error('[Voice] Error handling message:', error);
    }
  }

  /**
   * Execute tool calls requested by the AI
   */
  private async handleToolCall(event: any) {
    const { call_id, name, arguments: argsString } = event;
    
    console.log('[Voice] Tool call:', name, argsString);

    try {
      const args = JSON.parse(argsString);
      
      if (!this.sessionConfig) {
        throw new Error('Session not configured');
      }

      // Execute the tool using existing ToolExecutionService
      // Note: Voice service doesn't have access to the original user message at this point
      const result = await ToolExecutionService.executeTool(
        name,
        args,
        {
          businessAccountId: this.sessionConfig.businessAccountId,
          userId: this.sessionConfig.userId,
          conversationId: this.conversationId!
        },
        undefined
      );

      // Send tool result back to OpenAI
      const toolOutput = {
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: call_id,
          output: JSON.stringify(result)
        }
      };

      this.ws?.send(JSON.stringify(toolOutput));
      
      // Request new response from AI with tool result
      this.ws?.send(JSON.stringify({ type: 'response.create' }));

      console.log('[Voice] Tool result sent:', name, result);
    } catch (error: any) {
      console.error('[Voice] Tool execution error:', error);
      
      // Send error back to AI
      const errorOutput = {
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: call_id,
          output: JSON.stringify({ error: error.message })
        }
      };
      this.ws?.send(JSON.stringify(errorOutput));
    }
  }

  /**
   * Send audio data to OpenAI
   */
  sendAudio(audioBase64: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[Voice] WebSocket not ready');
      return;
    }

    const message = {
      type: 'input_audio_buffer.append',
      audio: audioBase64
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Commit audio buffer (tell OpenAI we're done sending this chunk)
   */
  commitAudio() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: 'input_audio_buffer.commit'
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Cancel current response
   */
  cancelResponse() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: 'response.cancel'
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Get personality traits for system prompt
   */
  private getPersonalityTraits(personality: string): string {
    const traits: Record<string, string> = {
      friendly: 'Warm, helpful, and approachable - like a knowledgeable friend',
      professional: 'Business-focused, concise, and respectful',
      casual: 'Relaxed, conversational, and easy-going',
      enthusiastic: 'Energetic, positive, and encouraging',
      helpful: 'Solution-oriented, patient, and supportive'
    };

    return traits[personality] || traits.friendly;
  }

  /**
   * Close the WebSocket connection
   */
  close() {
    if (this.ws) {
      this.ws.close();
      this.cleanup();
    }
  }

  /**
   * Cleanup session resources
   */
  private cleanup() {
    this.ws = null;
    this.sessionConfig = null;
    this.conversationId = null;
    this.activeSessionKey = null;
  }

  /**
   * Get WebSocket instance (for proxying messages)
   */
  getWebSocket(): WebSocket | null {
    return this.ws;
  }
}

export const voiceService = new VoiceService();
