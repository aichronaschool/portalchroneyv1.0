import { createClient, LiveTranscriptionEvents, LiveTTSEvents } from '@deepgram/sdk';
import { conversationMemory } from './conversationMemory';
import { storage } from './storage';
import { chatService } from './chatService';
import type { ChatContext } from './chatService';
import WebSocket from 'ws';

interface VoiceSessionConfig {
  userId: string;
  businessAccountId: string;
  personality: string;
  companyDescription: string;
  currency: string;
  currencySymbol: string;
  customInstructions?: string;
  openaiApiKey?: string; // For LlamaService (AI responses)
  deepgramApiKey?: string; // For voice processing
}

export class DeepgramVoiceService {
  private deepgramApiKey: string;
  private sessions: Map<string, any> = new Map();

  constructor() {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      console.warn('[Deepgram] API key not configured. Voice features will be disabled.');
      this.deepgramApiKey = '';
    } else {
      this.deepgramApiKey = apiKey;
    }
  }

  /**
   * Check if Deepgram is configured
   */
  isConfigured(): boolean {
    return !!this.deepgramApiKey;
  }

  /**
   * Create a session token for frontend use
   * This allows the frontend to connect directly to Deepgram
   * 
   * TODO: Security improvement - This currently exposes the global Deepgram API key.
   * In production, this should use ephemeral tokens or implement a proxy server
   * to avoid exposing the API key to the frontend.
   */
  async createSessionToken(): Promise<string> {
    if (!this.deepgramApiKey) {
      throw new Error('Deepgram API key not configured');
    }

    return this.deepgramApiKey;
  }

  /**
   * Transcribe audio to text (Speech-to-Text)
   */
  async speechToText(audioBuffer: Buffer, language?: string): Promise<string> {
    if (!this.deepgramApiKey) {
      throw new Error('Deepgram API key not configured');
    }

    const deepgram = createClient(this.deepgramApiKey);

    try {
      const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: 'nova-2',
          smart_format: true,
          language: language || 'multi', // Auto-detect language or use specific one
          punctuate: true,
          diarize: false
        }
      );

      if (error) {
        console.error('[Deepgram STT] Error:', error);
        throw new Error(error.message || 'Failed to transcribe audio');
      }

      const transcript = result.results.channels[0].alternatives[0].transcript;
      console.log('[Deepgram STT] Transcribed:', transcript);
      return transcript;

    } catch (error: any) {
      console.error('[Deepgram STT] Exception:', error);
      throw error;
    }
  }

  /**
   * Start a live transcription session (Speech-to-Text)
   * Returns WebSocket connection for streaming audio
   */
  async startTranscriptionSession(
    config: VoiceSessionConfig,
    onTranscript: (transcript: string, isFinal: boolean) => void,
    onError: (error: any) => void
  ) {
    const apiKey = config.deepgramApiKey || this.deepgramApiKey;
    if (!apiKey) {
      throw new Error('Deepgram API key not configured');
    }

    const deepgram = createClient(apiKey);

    // Configure live transcription with multi-language support
    const connection = deepgram.listen.live({
      model: 'nova-3', // Latest high-accuracy model
      language: 'multi', // Automatic language detection
      punctuate: true,
      interim_results: true, // Get partial results for responsiveness
      endpointing: 300, // Detect end of speech after 300ms silence (faster response)
      utterance_end_ms: 1000, // Force-end utterances after 1 second for better responsiveness
      smart_format: true, // Format numbers, dates, etc.
      utterances: true // Segment by utterance
    });

    // Store session
    const sessionKey = `${config.userId}_${config.businessAccountId}`;
    this.sessions.set(sessionKey, {
      connection,
      config,
      conversationId: null
    });

    // Handle transcription events
    connection.on(LiveTranscriptionEvents.Open, () => {
      console.log('[Deepgram STT] Connection opened');
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      const isFinal = data.is_final;

      if (transcript && transcript.trim().length > 0) {
        console.log(`[Deepgram STT] ${isFinal ? 'Final' : 'Interim'}:`, transcript);
        onTranscript(transcript, isFinal);
      }
    });

    connection.on(LiveTranscriptionEvents.Error, (error: any) => {
      console.error('[Deepgram STT] Error:', error);
      onError(error);
    });

    connection.on(LiveTranscriptionEvents.Close, () => {
      console.log('[Deepgram STT] Connection closed');
      this.sessions.delete(sessionKey);
    });

    return connection;
  }

  /**
   * Generate speech from text (Text-to-Speech)
   * Returns audio buffer
   */
  async textToSpeech(
    text: string,
    voiceModel: string = 'aura-2-thalia-en', // Default professional voice
    apiKey?: string
  ): Promise<Buffer> {
    const key = apiKey || this.deepgramApiKey;
    if (!key) {
      throw new Error('Deepgram API key not configured');
    }

    const deepgram = createClient(key);

    try {
      const result = await deepgram.speak.request(
        { text },
        {
          model: voiceModel,
          encoding: 'linear16', // PCM 16-bit for web audio
          sample_rate: 24000, // 24kHz for quality
          container: 'wav'
        }
      );

      // Get audio stream and convert to buffer
      const stream = await result.getStream();
      if (!stream) {
        throw new Error('No audio stream received from Deepgram');
      }

      const buffer = await this.streamToBuffer(stream);

      console.log('[Deepgram TTS] Generated audio:', buffer.length, 'bytes');
      return buffer;

    } catch (error: any) {
      console.error('[Deepgram TTS] Exception:', error);
      throw error;
    }
  }

  /**
   * Generate speech with streaming (for real-time TTS)
   */
  async *streamTextToSpeech(
    textChunks: AsyncIterable<string>,
    voiceModel: string = 'aura-2-thalia-en',
    apiKey?: string
  ): AsyncGenerator<Buffer> {
    const key = apiKey || this.deepgramApiKey;
    if (!key) {
      throw new Error('Deepgram API key not configured');
    }

    const deepgram = createClient(key);

    // Create WebSocket connection for streaming TTS
    const connection = deepgram.speak.live({
      model: voiceModel,
      encoding: 'linear16',
      sample_rate: 24000
    });

    const audioChunks: Buffer[] = [];

    // Handle audio data
    connection.on(LiveTTSEvents.Open, () => {
      console.log('[Deepgram TTS Streaming] Connection opened');
    });
    
    connection.on('AudioData' as any, (data: any) => {
      audioChunks.push(Buffer.from(data));
    });

    // Wait for connection to open
    await new Promise<void>((resolve) => {
      connection.on(LiveTTSEvents.Open, () => {
        console.log('[Deepgram TTS Streaming] Connection opened');
        resolve();
      });
    });

    // Send text chunks
    for await (const text of textChunks) {
      connection.sendText(text);
    }

    // Flush and wait for all audio
    connection.flush();

    await new Promise<void>((resolve) => {
      connection.on(LiveTTSEvents.Close, () => {
        console.log('[Deepgram TTS Streaming] Connection closed');
        resolve();
      });
    });

    // Yield all audio chunks
    for (const chunk of audioChunks) {
      yield chunk;
    }
  }

  /**
   * Process user voice message and get AI response
   * This integrates voice with the existing chat pipeline
   */
  async processVoiceMessage(
    audioBuffer: Buffer,
    businessAccountId: string,
    userId: string,
    returnAudio: boolean = true
  ): Promise<{ transcript: string; response: string; audio?: Buffer; products?: any[] }> {
    // Step 1: Transcribe audio to text
    const transcript = await this.speechToText(audioBuffer);
    console.log('[Voice] Transcribed:', transcript);

    // Step 2: Get business configuration for chat context
    // Fetch widget settings for personality, currency, and custom instructions
    const settings = await storage.getWidgetSettings(businessAccountId);
    const businessAccount = await storage.getBusinessAccount(businessAccountId);
    const openaiApiKey = await storage.getBusinessAccountOpenAIKey(businessAccountId);
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured for this business account');
    }

    if (!businessAccount) {
      throw new Error('Business account not found');
    }

    console.log('[Voice] Processing voice message:', transcript);

    // Build chat context (matching the pattern from routes.ts)
    const chatContext: ChatContext = {
      userId,
      businessAccountId,
      openaiApiKey,
      personality: settings?.personality || 'friendly',
      companyDescription: businessAccount.description || '',
      currency: settings?.currency || 'USD',
      currencySymbol: settings?.currency === 'USD' ? '$' : '€',
      customInstructions: settings?.customInstructions || undefined
    };

    // Step 3: Use existing chat service to get AI response
    // This ensures full feature parity (appointments, leads, products, FAQs)
    const response = await chatService.processMessage(transcript, chatContext);

    // Extract response text and products if any
    let responseText: string;
    let products: any[] | undefined;

    if (typeof response === 'object' && response !== null && 'response' in response) {
      responseText = (response as { response: string; products?: any[] }).response;
      products = (response as { response: string; products?: any[] }).products;
    } else {
      responseText = response as string;
    }

    console.log('[Voice] AI response:', responseText.substring(0, 100) + '...');

    // Step 4: Generate speech audio if requested
    let audioResponse: Buffer | undefined;
    if (returnAudio && responseText) {
      try {
        audioResponse = await this.textToSpeech(
          responseText,
          'aura-2-thalia-en', // Can be customized based on personality or user preference
          this.deepgramApiKey // Use global Deepgram key for TTS
        );
        console.log('[Voice] Generated TTS audio');
      } catch (error) {
        console.error('[Voice] TTS generation failed:', error);
        // Continue without audio
      }
    }

    return {
      transcript,
      response: responseText,
      audio: audioResponse,
      products
    };
  }

  /**
   * Stream AI response with real-time TTS
   * This is for advanced streaming scenarios
   */
  async *streamVoiceResponse(
    transcript: string,
    config: VoiceSessionConfig
  ): AsyncGenerator<{ type: 'text' | 'audio'; data: string | Buffer; products?: any[] }> {
    console.log('[Voice Stream] Processing:', transcript);

    const chatContext: ChatContext = {
      userId: config.userId,
      businessAccountId: config.businessAccountId,
      personality: config.personality,
      companyDescription: config.companyDescription,
      openaiApiKey: config.openaiApiKey,
      currency: config.currency,
      currencySymbol: config.currencySymbol,
      customInstructions: config.customInstructions
    };

    // Buffer text chunks for TTS
    let textBuffer = '';
    let products: any[] | undefined;

    // Stream text response from chat service
    for await (const chunk of chatService.streamMessage(transcript, chatContext)) {
      if (chunk.type === 'content') {
        textBuffer += chunk.data;
        yield { type: 'text', data: chunk.data };
      } else if (chunk.type === 'products') {
        products = chunk.data;
        yield { type: 'text', data: '', products };
      }
    }

    // Generate TTS for the complete response
    if (textBuffer.trim()) {
      try {
        const audioBuffer = await this.textToSpeech(
          textBuffer,
          'aura-2-thalia-en',
          config.deepgramApiKey
        );
        yield { type: 'audio', data: audioBuffer };
      } catch (error) {
        console.error('[Voice Stream] TTS failed:', error);
      }
    }
  }

  /**
   * Helper: Convert readable stream to buffer
   */
  private async streamToBuffer(stream: ReadableStream): Promise<Buffer> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Close a transcription session
   */
  closeSession(userId: string, businessAccountId: string) {
    const sessionKey = `${userId}_${businessAccountId}`;
    const session = this.sessions.get(sessionKey);

    if (session?.connection) {
      session.connection.finish();
      this.sessions.delete(sessionKey);
      console.log('[Deepgram] Session closed:', sessionKey);
    }
  }

  /**
   * Get available voice models
   */
  getAvailableVoices(): string[] {
    return [
      'aura-2-thalia-en',     // Balanced, professional
      'aura-2-helios-en',     // Warm, conversational  
      'aura-2-perseus-en',    // Authoritative, clear
      'aura-2-luna-en',       // Calm, empathetic
      'aura-2-orpheus-en',    // Friendly, engaging
      'aura-2-angus-en',      // Deep, confident
      'aura-2-arcas-en',      // Professional, corporate
      'aura-2-stella-en'      // Bright, enthusiastic
    ];
  }
}

export const deepgramVoiceService = new DeepgramVoiceService();
