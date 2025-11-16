import { createClient, LiveTranscriptionEvents, LiveTTSEvents } from '@deepgram/sdk';
import WebSocket from 'ws';
import { storage } from './storage';
import { chatService } from './chatService';
import type { ChatContext } from './chatService';
import { conversationMemory } from './conversationMemory';

// Maximum queue size to prevent unbounded growth
const MAX_QUEUE_SIZE = 5;

interface TranscriptQueueEntry {
  text: string;
  isFinal: boolean;
}

interface VoiceConversation {
  ws: WebSocket;
  businessAccountId: string;
  userId: string;
  deepgramApiKey: string;
  openaiApiKey: string;
  sttConnection: any;
  ttsConnection: any;
  isProcessing: boolean;
  interrupted: boolean; // Flag to stop ongoing AI stream
  currentTranscript: string;
  transcriptQueue: TranscriptQueueEntry[]; // Queue for pending transcripts with metadata
  personality?: string;
  companyDescription?: string;
  currency?: string;
  currencySymbol?: string;
  customInstructions?: string;
}

export class RealtimeVoiceService {
  private conversations: Map<string, VoiceConversation> = new Map();
  private deepgramApiKey: string;

  constructor() {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      console.warn('[RealtimeVoice] Deepgram API key not configured. Voice features will be disabled.');
      this.deepgramApiKey = '';
    } else {
      this.deepgramApiKey = apiKey;
    }
  }

  isConfigured(): boolean {
    return !!this.deepgramApiKey;
  }

  async handleConnection(ws: WebSocket, businessAccountId: string, userId: string) {
    console.log('[RealtimeVoice] New connection:', { businessAccountId, userId });

    try {
      const settings = await storage.getWidgetSettings(businessAccountId);
      const businessAccount = await storage.getBusinessAccount(businessAccountId);
      const openaiApiKey = await storage.getBusinessAccountOpenAIKey(businessAccountId);

      if (!openaiApiKey) {
        this.sendError(ws, 'OpenAI API key not configured for this business account');
        ws.close();
        return;
      }

      if (!businessAccount) {
        this.sendError(ws, 'Business account not found');
        ws.close();
        return;
      }

      if (!this.deepgramApiKey) {
        this.sendError(ws, 'Deepgram API key not configured');
        ws.close();
        return;
      }

      const conversationKey = `${userId}_${businessAccountId}_${Date.now()}`;
      const deepgram = createClient(this.deepgramApiKey);

      // AUDIO FORMAT HANDLING:
      // - Client sends audio/webm with Opus codec (from MediaRecorder)
      // - Deepgram's nova-3 model supports Opus format natively
      // - Using 'encoding' parameter to explicitly specify the format for better compatibility
      // - Deepgram will handle the WebM container and Opus codec automatically
      const sttConnection = deepgram.listen.live({
        model: 'nova-3',
        language: 'multi',
        encoding: 'opus', // Explicitly specify Opus encoding for WebM audio from MediaRecorder
        punctuate: true,
        interim_results: true,
        endpointing: 300, // Reduced from 500ms for faster turn detection
        utterance_end_ms: 1000, // Force-end utterances after 1 second for better responsiveness
        smart_format: true,
        utterances: true
      });

      const conversation: VoiceConversation = {
        ws,
        businessAccountId,
        userId,
        deepgramApiKey: this.deepgramApiKey,
        openaiApiKey,
        sttConnection,
        ttsConnection: null,
        isProcessing: false,
        interrupted: false,
        currentTranscript: '',
        transcriptQueue: [], // Initialize empty queue for pending transcripts
        personality: settings?.personality || 'friendly',
        companyDescription: businessAccount.description || '',
        currency: settings?.currency || 'USD',
        currencySymbol: settings?.currency === 'USD' ? '$' : '€',
        customInstructions: settings?.customInstructions || undefined
      };

      this.conversations.set(conversationKey, conversation);

      this.setupSTTHandlers(conversationKey, conversation);

      this.setupWebSocketHandlers(conversationKey, conversation);

      this.sendMessage(ws, { type: 'ready' });

      console.log('[RealtimeVoice] Connection established:', conversationKey);

    } catch (error: any) {
      console.error('[RealtimeVoice] Connection error:', error);
      this.sendError(ws, error.message || 'Failed to initialize voice conversation');
      ws.close();
    }
  }

  private setupSTTHandlers(conversationKey: string, conversation: VoiceConversation) {
    const { sttConnection, ws } = conversation;

    sttConnection.on(LiveTranscriptionEvents.Open, () => {
      console.log('[RealtimeVoice STT] Connection opened');
    });

    sttConnection.on(LiveTranscriptionEvents.Transcript, async (data: any) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      const isFinal = data.is_final;

      if (transcript && transcript.trim().length > 0) {
        console.log(`[RealtimeVoice STT] ${isFinal ? 'Final' : 'Interim'}:`, transcript);

        this.sendMessage(ws, {
          type: 'transcript',
          text: transcript,
          isFinal
        });

        // Only process FINAL transcripts - interims are for display only
        if (!isFinal) {
          return;
        }

        // Enforce queue limit with proper back-pressure (finals only in queue)
        if (conversation.transcriptQueue.length >= MAX_QUEUE_SIZE) {
          // Queue is full - reject new final transcript
          console.warn('[RealtimeVoice] Queue saturated - rejecting new final transcript');
          conversation.ws.send(JSON.stringify({ 
            type: 'busy',
            message: 'Processing previous requests, please wait before speaking again...'
          }));
          return; // Reject - do not add to queue
        }
        
        // Add final transcript to queue
        conversation.transcriptQueue.push({ text: transcript, isFinal: true });
        
        // Notify client if queue is getting full (80% capacity)
        if (conversation.transcriptQueue.length >= Math.floor(MAX_QUEUE_SIZE * 0.8)) {
          conversation.ws.send(JSON.stringify({ 
            type: 'processing_load', 
            queueSize: conversation.transcriptQueue.length 
          }));
        }
        
        // Start processing queue if not already processing
        if (!conversation.isProcessing) {
          this.processTranscriptQueue(conversationKey, conversation);
        }
      }
    });

    sttConnection.on(LiveTranscriptionEvents.Error, (error: any) => {
      console.error('[RealtimeVoice STT] Error:', JSON.stringify(error, null, 2));
      this.sendError(ws, 'Speech recognition error: ' + (error.message || 'Unknown error'));
    });

    sttConnection.on(LiveTranscriptionEvents.Close, (event: any) => {
      console.log('[RealtimeVoice STT] Connection closed:', event);
      // If STT closes unexpectedly, notify the client
      if (conversation.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(ws, { 
          type: 'error', 
          message: 'Speech recognition connection closed unexpectedly' 
        });
      }
    });
  }

  private setupWebSocketHandlers(conversationKey: string, conversation: VoiceConversation) {
    const { ws } = conversation;

    ws.on('message', async (message: WebSocket.Data) => {
      try {
        if (message instanceof Buffer) {
          if (conversation.sttConnection && conversation.sttConnection.getReadyState() === 1) {
            conversation.sttConnection.send(message);
          }
        } else {
          const data = JSON.parse(message.toString());
          await this.handleMessage(conversationKey, conversation, data);
        }
      } catch (error: any) {
        console.error('[RealtimeVoice] Message handling error:', error);
        this.sendError(ws, 'Failed to process message');
      }
    });

    ws.on('close', () => {
      console.log('[RealtimeVoice] WebSocket closed:', conversationKey);
      this.cleanup(conversationKey);
    });

    ws.on('error', (error) => {
      console.error('[RealtimeVoice] WebSocket error:', error);
      this.cleanup(conversationKey);
    });
  }

  private async handleMessage(conversationKey: string, conversation: VoiceConversation, data: any) {
    switch (data.type) {
      case 'interrupt':
        console.log('[RealtimeVoice] User interrupted - stopping AI response');
        
        // Set interrupt flag to stop ongoing stream
        conversation.interrupted = true;
        
        // Stop TTS streaming
        if (conversation.ttsConnection) {
          try {
            conversation.ttsConnection.requestClose();
            // Do NOT set to null here - let the Close event handler do it
            // This allows the wait loop to detect in-flight connections
          } catch (error) {
            console.error('[RealtimeVoice] Error closing TTS on interrupt:', error);
          }
        }
        
        // Don't clear transcript queue - preserve any new user speech that arrived during interrupt
        // The current iteration will exit due to interrupted flag, and new transcripts will be processed
        // conversation.transcriptQueue = []; // REMOVED - preserve queue
        
        // Send acknowledgment
        this.sendMessage(conversation.ws, {
          type: 'interrupt_ack',
          message: 'Stopped, ready for your question'
        });
        
        console.log('[RealtimeVoice] Interrupt handled, ready for new input');
        break;

      case 'stop_conversation':
        console.log('[RealtimeVoice] Stopping conversation');
        this.cleanup(conversationKey);
        break;

      default:
        console.warn('[RealtimeVoice] Unknown message type:', data.type);
    }
  }

  private async processTranscriptQueue(conversationKey: string, conversation: VoiceConversation) {
    // Process transcripts from queue one at a time
    while (conversation.transcriptQueue.length > 0) {
      const entry = conversation.transcriptQueue.shift()!;
      const transcript = entry.text;
      conversation.isProcessing = true;
      
      // Wait for previous TTS to fully close if interrupted
      if (conversation.interrupted && conversation.ttsConnection) {
        console.log('[RealtimeVoice] Waiting for previous TTS to close after interrupt...');
        let waitRetries = 0;
        const MAX_WAIT_RETRIES = 20;
        while (conversation.ttsConnection && waitRetries < MAX_WAIT_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 50));
          waitRetries++;
        }
        
        // If TTS still not closed, treat as hard failure
        if (conversation.ttsConnection) {
          console.error('[RealtimeVoice] TTS failed to close within timeout - aborting');
          try {
            conversation.ttsConnection.requestClose();
            conversation.ttsConnection = null;
          } catch (error) {
            console.error('[RealtimeVoice] Error forcing TTS close:', error);
          }
          // Keep interrupted=true and skip this transcript
          this.sendError(conversation.ws, 'Failed to stop previous response');
          continue; // Skip to next transcript
        }
      }
      
      // Clear interrupt flag only after previous TTS is confirmed closed
      conversation.interrupted = false;

      try {
        console.log('[RealtimeVoice] Processing transcript from queue:', transcript, '(final:', entry.isFinal, ')');

        const chatContext: ChatContext = {
          userId: conversation.userId,
          businessAccountId: conversation.businessAccountId,
          openaiApiKey: conversation.openaiApiKey,
          personality: conversation.personality,
          companyDescription: conversation.companyDescription,
          currency: conversation.currency,
          currencySymbol: conversation.currencySymbol,
          customInstructions: conversation.customInstructions
        };

        // Initialize TTS connection once for streaming chunks
        const deepgram = createClient(conversation.deepgramApiKey);
        const ttsConnection = deepgram.speak.live({
          model: 'aura-asteria-en',
          encoding: 'linear16',
          sample_rate: 24000,
          container: 'none'
        });

        conversation.ttsConnection = ttsConnection;
        let ttsReady = false;

        // Setup TTS event handlers
        ttsConnection.on(LiveTTSEvents.Open, () => {
          console.log('[RealtimeVoice TTS] Connection opened for streaming');
          ttsReady = true;
        });

        ttsConnection.on(LiveTTSEvents.Audio, (data: any) => {
          console.log('[RealtimeVoice TTS] Received audio chunk, size:', data.length);
          if (conversation.ws.readyState === WebSocket.OPEN) {
            // Deepgram provides base64 encoded audio
            const audioBuffer = Buffer.from(data, 'base64');
            conversation.ws.send(audioBuffer);
            console.log('[RealtimeVoice TTS] Sent audio chunk to client, size:', audioBuffer.length);
          }
        });

        ttsConnection.on(LiveTTSEvents.Flushed, () => {
          console.log('[RealtimeVoice TTS] Chunk flushed');
        });

        ttsConnection.on(LiveTTSEvents.Close, () => {
          console.log('[RealtimeVoice TTS] Connection closed');
          conversation.ttsConnection = null;
        });

        ttsConnection.on(LiveTTSEvents.Error, (error: any) => {
          console.error('[RealtimeVoice TTS] Error:', error);
          conversation.ttsConnection = null;
        });

        // Wait for TTS connection to be ready
        let retries = 0;
        while (!ttsReady && retries < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }

        if (!ttsReady) {
          throw new Error('TTS connection timeout');
        }

        let fullResponse = '';
        let hasContent = false;

        // Stream AI chunks immediately as they arrive
        for await (const chunk of chatService.streamMessage(transcript, chatContext)) {
          // Check if user interrupted
          if (conversation.interrupted) {
            console.log('[RealtimeVoice] Stream interrupted by user - stopping');
            break;
          }
          
          if (chunk.type === 'content') {
            const textChunk = chunk.data;
            fullResponse += textChunk;
            hasContent = true;

            // Send text chunk to client immediately
            this.sendMessage(conversation.ws, {
              type: 'ai_chunk',
              text: textChunk
            });

            // Send chunk to TTS immediately for audio generation
            if (ttsConnection && ttsReady) {
              ttsConnection.sendText(textChunk);
            }
          } else if (chunk.type === 'products') {
            // Products data - log but don't speak
            console.log('[RealtimeVoice] Products data received');
          }
        }

        // Only send completion if not interrupted
        if (!conversation.interrupted) {
          // Flush TTS to ensure all audio is sent
          if (ttsConnection && ttsReady) {
            ttsConnection.flush();
          }

          if (hasContent) {
            console.log('[RealtimeVoice] Streamed AI response:', fullResponse.substring(0, 100) + '...');
            
            // Signal that AI is done speaking
            this.sendMessage(conversation.ws, { type: 'ai_done' });
          }
        } else {
          console.log('[RealtimeVoice] Skipping ai_done due to interrupt');
        }

        // Close TTS connection gracefully
        if (ttsConnection) {
          // Wait a bit for final audio to be sent before closing
          await new Promise(resolve => setTimeout(resolve, 500));
          // Use requestClose() method to properly close the TTS stream
          ttsConnection.requestClose();
        }

      } catch (error: any) {
        console.error('[RealtimeVoice] Processing error:', error);
        this.sendError(conversation.ws, 'Failed to process voice message');
        
        // Clean up TTS connection on error
        if (conversation.ttsConnection) {
          try {
            conversation.ttsConnection.requestClose();
          } catch (e) {
            // Ignore cleanup errors
          }
          conversation.ttsConnection = null;
        }
        // Continue processing remaining transcripts even if one fails
      }
    }

    conversation.isProcessing = false;
    console.log('[RealtimeVoice] Finished processing transcript queue');
  }


  private sendMessage(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, message: string) {
    this.sendMessage(ws, { type: 'error', message });
  }

  private cleanup(conversationKey: string) {
    const conversation = this.conversations.get(conversationKey);
    if (!conversation) return;

    console.log('[RealtimeVoice] Cleaning up conversation:', conversationKey);

    try {
      if (conversation.sttConnection) {
        conversation.sttConnection.finish();
      }
    } catch (error) {
      console.error('[RealtimeVoice] Error closing STT connection:', error);
    }

    try {
      if (conversation.ttsConnection) {
        conversation.ttsConnection.requestClose();
      }
    } catch (error) {
      console.error('[RealtimeVoice] Error closing TTS connection:', error);
    }

    try {
      if (conversation.ws.readyState === WebSocket.OPEN) {
        conversation.ws.close();
      }
    } catch (error) {
      console.error('[RealtimeVoice] Error closing WebSocket:', error);
    }

    this.conversations.delete(conversationKey);
  }

  cleanupAll() {
    console.log('[RealtimeVoice] Cleaning up all conversations');
    for (const key of Array.from(this.conversations.keys())) {
      this.cleanup(key);
    }
  }
}

export const realtimeVoiceService = new RealtimeVoiceService();
