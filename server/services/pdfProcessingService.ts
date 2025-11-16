import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import { storage } from '../storage';

export interface ProcessedPDFResult {
  extractedText: string;
  summary: string;
  keyPoints: string[];
}

export class PDFProcessingService {
  private async getOpenAIClient(businessAccountId: string): Promise<OpenAI> {
    const businessAccount = await storage.getBusinessAccount(businessAccountId);
    
    if (!businessAccount?.openaiApiKey) {
      throw new Error('OpenAI API key not configured for this business account');
    }

    return new OpenAI({ apiKey: businessAccount.openaiApiKey });
  }

  async extractTextFromPDF(filePath: string): Promise<string> {
    try {
      // Use pdfjs-dist directly for reliable text extraction
      const pdfjsLib: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
      
      const dataBuffer = await fs.readFile(filePath);
      const uint8Array = new Uint8Array(dataBuffer);
      
      // Configure PDF.js with standard font URL to avoid warnings
      const pdfDocument = await pdfjsLib.getDocument({
        data: uint8Array,
        standardFontDataUrl: path.join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/'),
        verbosity: 0,
      }).promise;
      
      let extractedText = '';
      
      // Iterate through all pages and extract text
      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        extractedText += pageText + '\n';
      }
      
      return extractedText;
    } catch (error: any) {
      console.error('Error extracting text from PDF:', error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  async processWithAI(text: string, businessAccountId: string, filename: string): Promise<{ summary: string; keyPoints: string[] }> {
    try {
      const openai = await this.getOpenAIClient(businessAccountId);

      const truncatedText = text.slice(0, 12000);

      const prompt = `Analyze this document (${filename}) and provide:
1. A comprehensive summary (2-3 paragraphs)
2. Key points and important information (as a list)

Document content:
${truncatedText}

Provide a JSON response in this format:
{
  "summary": "Your summary here",
  "keyPoints": ["Point 1", "Point 2", "Point 3", ...]
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert document analyzer. Extract key information, summaries, and important points from documents to help AI assistants provide accurate information to customers.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        summary: result.summary || 'No summary generated',
        keyPoints: result.keyPoints || []
      };
    } catch (error: any) {
      console.error('Error processing PDF with AI:', error);
      throw new Error(`Failed to process PDF with AI: ${error.message}`);
    }
  }

  async processDocument(
    documentId: string,
    filePath: string,
    businessAccountId: string,
    filename: string
  ): Promise<void> {
    try {
      await storage.updateTrainingDocumentStatus(documentId, 'processing');

      const extractedText = await this.extractTextFromPDF(filePath);

      const { summary, keyPoints } = await this.processWithAI(
        extractedText,
        businessAccountId,
        filename
      );

      await storage.updateTrainingDocumentContent(
        documentId,
        extractedText,
        summary,
        JSON.stringify(keyPoints)
      );

      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.error('Error deleting temp file:', unlinkError);
      }

    } catch (error: any) {
      console.error('Error processing document:', error);
      await storage.updateTrainingDocumentStatus(
        documentId,
        'failed',
        error.message
      );

      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.error('Error deleting temp file after failure:', unlinkError);
      }

      throw error;
    }
  }
}

export const pdfProcessingService = new PDFProcessingService();
