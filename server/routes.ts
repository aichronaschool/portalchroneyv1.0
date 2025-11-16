import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  hashPassword,
  verifyPassword,
  createSession,
  validateSession,
  deleteSession,
  requireAuth,
  requireRole,
  requireBusinessAccount,
} from "./auth";
import { 
  insertProductSchema,
  insertFaqSchema,
  insertLeadSchema,
  insertUserSchema,
  insertCategorySchema,
  insertTagSchema,
  insertProductRelationshipSchema,
  insertScheduleTemplateSchema,
  insertSlotOverrideSchema,
  insertAppointmentSchema,
  insertTrainingDocumentSchema,
  insertSupportTicketSchema,
  insertTicketMessageSchema,
  insertTicketAttachmentSchema,
  insertCannedResponseSchema,
  insertTicketInsightSchema,
} from "@shared/schema";
import { z } from "zod";
import { chatService } from "./chatService";
import { llamaService } from "./llamaService";
import { conversationMemory } from "./conversationMemory";
import { businessContextCache } from "./services/businessContextCache";
import { pdfProcessingService } from "./services/pdfProcessingService";
import { ticketIntelligenceService } from "./services/ticketIntelligenceService";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID, randomBytes } from "crypto";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { WebSocketServer } from "ws";
import { realtimeVoiceService } from "./realtimeVoiceService";

const execAsync = promisify(exec);

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validation schema for website analysis content update
// All fields are optional and nullable to support legacy data with missing/null values
const updateWebsiteAnalysisSchema = z.object({
  businessName: z.string().optional().nullable().transform(val => val ?? ''),
  businessDescription: z.string().optional().nullable().transform(val => val ?? ''),
  targetAudience: z.string().optional().nullable().transform(val => val ?? ''),
  mainProducts: z.array(z.string()).optional().nullable().transform(val => val ?? []),
  mainServices: z.array(z.string()).optional().nullable().transform(val => val ?? []),
  keyFeatures: z.array(z.string()).optional().nullable().transform(val => val ?? []),
  uniqueSellingPoints: z.array(z.string()).optional().nullable().transform(val => val ?? []),
  contactInfo: z.object({
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
  }).optional().nullable().transform(val => val ?? {}),
  businessHours: z.string().optional().nullable().transform(val => val ?? ''),
  pricingInfo: z.string().optional().nullable().transform(val => val ?? ''),
  additionalInfo: z.string().optional().nullable().transform(val => val ?? ''),
});

// Helper function to generate intro messages for public chat
async function generateIntroMessage(businessAccountId: string): Promise<string> {
  try {
    const settings = await storage.getWidgetSettings(businessAccountId);
    const businessAccount = await storage.getBusinessAccount(businessAccountId);
    
    // Return custom welcome message if configured
    if (settings?.welcomeMessageType === 'custom' && settings.welcomeMessage) {
      return settings.welcomeMessage;
    }
    
    // Generate a dynamic intro message
    const businessName = businessAccount?.name || "our business";
    const intros = [
      `Hey there! Welcome to ${businessName}—happy to help you find exactly what you're looking for.`,
      `Hi! I'm Chroney, ${businessName}'s AI assistant. How can I help you today?`,
      `Welcome! Need help with anything at ${businessName}? I'm here to assist!`,
      `Hello! Thanks for visiting ${businessName}. What can I help you with?`,
      `Hey! Looking for something specific at ${businessName}? I'm here to help!`,
    ];
    
    return intros[Math.floor(Math.random() * intros.length)];
  } catch (error) {
    console.error('[Public Chat] Error generating intro:', error);
    return "Hey there! How can I help you today?";
  }
}

// Helper function to process public chat messages
async function processPublicChatMessage(
  message: string,
  businessAccountId: string,
  userId: string
): Promise<{ message: string; products?: any[] }> {
  try {
    // Get settings, API key, and business account
    const settings = await storage.getWidgetSettings(businessAccountId);
    const openaiApiKey = await storage.getBusinessAccountOpenAIKey(businessAccountId);
    const businessAccount = await storage.getBusinessAccount(businessAccountId);
    
    if (!openaiApiKey) {
      return {
        message: "I'm currently offline. Please try again later or contact us directly."
      };
    }

    if (!businessAccount) {
      return {
        message: "This chatbot is currently unavailable."
      };
    }
    
    // Process message using chat service
    const context = {
      userId,
      businessAccountId,
      openaiApiKey,
      personality: settings?.personality || 'friendly',
      companyDescription: businessAccount.description || '',
      currency: settings?.currency || 'USD',
      currencySymbol: settings?.currency === 'USD' ? '$' : '€',
      customInstructions: settings?.customInstructions || undefined,
    };

    const response = await chatService.processMessage(message, context);
    
    // Check if response contains product data
    if (typeof response === 'object' && 'products' in response) {
      return response as { message: string; products?: any[] };
    }
    
    return { message: response as string };
  } catch (error: any) {
    console.error('[Public Chat] Error processing message:', error);
    return {
      message: "Sorry, I'm having trouble connecting right now. Please try again."
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Widget routes (must be before authentication routes)
  app.get("/widget.js", (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // Don't cache - always fetch fresh
    res.setHeader('Pragma', 'no-cache'); // HTTP 1.0 backward compatibility
    res.setHeader('Expires', '0'); // Proxies
    res.sendFile(path.join(__dirname, '../public/widget.js'));
  });

  // Widget test page route
  app.get("/widget-test.html", (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(__dirname, '../widget-test.html'));
  });

  app.get("/widget/chat", async (req, res) => {
    const businessAccountId = req.query.businessAccountId as string;
    
    if (!businessAccountId) {
      return res.status(400).send('Missing businessAccountId parameter');
    }

    // Check if business account is active
    const businessAccount = await storage.getBusinessAccount(businessAccountId);
    if (!businessAccount) {
      return res.status(404).send('Business account not found');
    }
    if (businessAccount.status === 'suspended') {
      return res.status(403).send('This chatbot is currently unavailable');
    }

    // Use dynamic host from request, ensuring proper protocol
    const host = req.get('host');
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
    const embedUrl = `${protocol}://${host}/embed/chat?businessAccountId=${encodeURIComponent(businessAccountId)}`;
    
    console.log('[Widget] Generated embed URL:', embedUrl);
    
    // Serve a simple iframe loader
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hi Chroney Widget</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }
  </style>
</head>
<body>
  <iframe src="${embedUrl}" allow="clipboard-write" sandbox="allow-same-origin allow-scripts allow-forms allow-popups"></iframe>
</body>
</html>`);
  });

  // Widget API routes (no authentication required for public widgets)
  app.post("/api/chat/widget", async (req, res) => {
    try {
      const { message, businessAccountId } = req.body;
      
      if (!message || !businessAccountId) {
        return res.status(400).json({ error: "Message and businessAccountId required" });
      }

      // Use a generic widget user ID based on business account
      const widgetUserId = `widget_${businessAccountId}`;
      
      // Get widget settings and business account info
      const settings = await storage.getWidgetSettings(businessAccountId);
      const businessAccount = await storage.getBusinessAccount(businessAccountId);
      
      if (!businessAccount) {
        return res.status(404).json({ error: "Business account not found" });
      }

      // Check if business account is active
      if (businessAccount.status === 'suspended') {
        return res.status(403).json({ error: "This chatbot is currently unavailable" });
      }

      // Get the API key for this business account
      const openaiApiKey = await storage.getBusinessAccountOpenAIKey(businessAccountId);
      
      if (!openaiApiKey) {
        console.warn('[Widget Chat] No OpenAI API key found for business:', businessAccountId);
        return res.status(400).json({ error: "OpenAI API key not configured for this business account" });
      }

      // Process the message
      const result = await chatService.processMessage(message, {
        userId: widgetUserId,
        businessAccountId,
        personality: settings?.personality || 'friendly',
        companyDescription: businessAccount.description || '',
        openaiApiKey,
        currency: settings?.currency || 'USD',
        currencySymbol: settings?.currency === 'USD' ? '$' : '€',
        customInstructions: settings?.customInstructions || undefined,
      });

      // Return both response text and products if available
      if (typeof result === 'string') {
        res.json({ response: result });
      } else if (result && typeof result === 'object') {
        res.json({ 
          response: (result as any).response,
          products: (result as any).products || undefined
        });
      } else {
        res.json({ response: String(result) });
      }
    } catch (error: any) {
      console.error('[Widget Chat] Error:', error);
      res.status(500).json({ error: error.message || "Failed to process message" });
    }
  });

  app.post("/api/chat/widget/stream", async (req, res) => {
    try {
      const { message, businessAccountId, sessionId } = req.body;
      
      if (!message || !businessAccountId) {
        return res.status(400).json({ error: "Message and businessAccountId required" });
      }

      // Use unique session ID for each widget visit (resets on page refresh)
      const widgetUserId = sessionId ? `widget_session_${sessionId}` : `widget_${businessAccountId}`;
      
      // Get widget settings and business account info
      const settings = await storage.getWidgetSettings(businessAccountId);
      const businessAccount = await storage.getBusinessAccount(businessAccountId);
      
      if (!businessAccount) {
        return res.status(404).json({ error: "Business account not found" });
      }

      // Check if business account is active
      if (businessAccount.status === 'suspended') {
        return res.status(403).json({ error: "This chatbot is currently unavailable" });
      }

      // Get the API key for this business account
      const openaiApiKey = await storage.getBusinessAccountOpenAIKey(businessAccountId);
      
      if (!openaiApiKey) {
        console.warn('[Widget Stream] No OpenAI API key found for business:', businessAccountId);
        return res.status(400).json({ error: "OpenAI API key not configured for this business account" });
      }

      const personality = settings?.personality || 'friendly';
      const currency = settings?.currency || 'USD';
      const currencySymbols: Record<string, string> = {
        USD: "$", EUR: "€", GBP: "£", JPY: "¥", CNY: "¥", INR: "₹", AUD: "A$",
        CAD: "C$", CHF: "CHF", SEK: "kr", NZD: "NZ$", SGD: "S$", HKD: "HK$",
        NOK: "kr", MXN: "$", BRL: "R$", ZAR: "R", KRW: "₩", TRY: "₺",
        RUB: "₽", IDR: "Rp", THB: "฿", MYR: "RM"
      };
      const currencySymbol = currencySymbols[currency] || "$";

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Stream the response
      for await (const chunk of chatService.streamMessage(message, {
        userId: widgetUserId,
        businessAccountId,
        personality,
        companyDescription: businessAccount.description || '',
        openaiApiKey,
        currency,
        currencySymbol,
        customInstructions: settings?.customInstructions || undefined
      })) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.end();
    } catch (error: any) {
      console.error('[Widget Stream] Error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', data: error.message })}\n\n`);
      res.end();
    }
  });

  app.get("/api/chat/widget/intro", async (req, res) => {
    try {
      const { businessAccountId } = req.query;
      
      if (!businessAccountId) {
        return res.status(400).json({ error: "businessAccountId required" });
      }

      const settings = await storage.getWidgetSettings(businessAccountId as string);
      const businessAccount = await storage.getBusinessAccount(businessAccountId as string);
      
      if (!businessAccount) {
        return res.status(404).json({ error: "Business account not found" });
      }

      // Check if business account is active
      if (businessAccount.status === 'suspended') {
        return res.status(403).json({ error: "This chatbot is currently unavailable" });
      }

      // Check welcome message type
      if (settings?.welcomeMessageType === 'custom' && settings?.welcomeMessage) {
        return res.json({ intro: settings.welcomeMessage });
      }

      // Generate AI intro if needed and API key is available
      if (businessAccount.openaiApiKey) {
        try {
          const systemContext = businessAccount.description ? 
            `You are representing: ${businessAccount.description}` : 
            '';

          const introResponse = await llamaService.generateToolAwareResponse(
            "Generate a brief, friendly welcome message (1-2 sentences) for a customer visiting our website.",
            [],
            [],
            systemContext,
            settings?.personality || 'friendly',
            businessAccount.openaiApiKey
          );

          const intro = introResponse.content || "Hi! How can I help you today?";
          
          // Cache the intro in widget settings
          if (settings) {
            await storage.upsertWidgetSettings(businessAccountId as string, { cachedIntro: intro });
          }

          return res.json({ intro });
        } catch (error) {
          console.error('[Widget Intro] AI generation failed:', error);
        }
      }

      // Fallback to default message
      res.json({ intro: "Hi! How can I help you today?" });
    } catch (error: any) {
      console.error('[Widget Intro] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      // Database authentication
      const user = await storage.getUserByUsername(username);

      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Check if business account is active (for business users only)
      if (user.role === "business_user" && user.businessAccountId) {
        const businessAccount = await storage.getBusinessAccount(user.businessAccountId);
        if (businessAccount && businessAccount.status === "suspended") {
          return res.status(403).json({ error: "Your subscription has expired. Please contact support to reactivate your account." });
        }
      }

      const sessionToken = await createSession(user.id);

      // Update last login
      await storage.updateUserLastLogin(user.id);

      res.cookie("session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        businessAccountId: user.businessAccountId,
        mustChangePassword: user.mustChangePassword,
        tempPasswordExpiry: user.tempPasswordExpiry,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    try {
      const sessionToken = req.cookies?.session;
      if (sessionToken) {
        await deleteSession(sessionToken);
      }
      res.clearCookie("session");
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const sessionUser = req.user!;
    const { toMeResponseDto } = await import("@shared/dto/auth");
    const { toBusinessAccountDto } = await import("@shared/dto/businessAccount");
    
    // Fetch full user from database
    const user = await storage.getUser(sessionUser.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // If user has a business account, include feature flags
    if (user.businessAccountId) {
      const businessAccount = await storage.getBusinessAccount(user.businessAccountId);
      const dto = businessAccount ? toBusinessAccountDto(businessAccount) : null;
      res.json(toMeResponseDto(user, dto));
    } else {
      res.json(toMeResponseDto(user));
    }
  });

  // Chat endpoint
  app.post("/api/chat", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      const user = req.user!;
      
      if (!user.businessAccountId) {
        return res.status(403).json({ error: "Business account required" });
      }

      // Fetch personality, currency, and custom instructions from widget settings
      const widgetSettings = await storage.getWidgetSettings(user.businessAccountId);
      const personality = widgetSettings?.personality || 'friendly';
      const currency = widgetSettings?.currency || 'INR';
      const customInstructions = widgetSettings?.customInstructions || '';
      
      // Currency symbol mapping
      const currencySymbols: Record<string, string> = {
        'INR': '₹', 'USD': '$', 'AED': 'د.إ', 'EUR': '€', 'GBP': '£',
        'AUD': 'A$', 'CAD': 'C$', 'CHF': 'CHF', 'CNY': '¥', 'JPY': '¥',
        'KRW': '₩', 'SGD': 'S$', 'HKD': 'HK$', 'NZD': 'NZ$', 'SEK': 'kr',
        'NOK': 'kr', 'DKK': 'kr', 'PLN': 'zł', 'BRL': 'R$', 'MXN': '$',
        'ZAR': 'R', 'TRY': '₺', 'RUB': '₽'
      };
      const currencySymbol = currencySymbols[currency] || '$';
      
      const businessAccount = await storage.getBusinessAccount(user.businessAccountId);
      const companyDescription = businessAccount?.description || '';
      const openaiApiKey = await storage.getBusinessAccountOpenAIKey(user.businessAccountId);

      const response = await chatService.processMessage(message, {
        userId: user.id,
        businessAccountId: user.businessAccountId,
        personality,
        companyDescription,
        openaiApiKey,
        currency,
        currencySymbol,
        customInstructions
      });

      res.json({ 
        success: true,
        response 
      });
    } catch (error: any) {
      console.error('Chat error:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || "Failed to process message" 
      });
    }
  });

  // Chat status endpoint
  app.get("/api/chat/status", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      if (!user || !user.businessAccountId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check if OpenAI API key is configured for this business account
      const businessAccount = await storage.getBusinessAccount(user.businessAccountId);
      const hasApiKey = !!businessAccount?.openaiApiKey;

      res.json({
        connected: true,
        status: hasApiKey ? "online" : "offline"
      });
    } catch (error: any) {
      console.error('[Chat Status] Error:', error);
      res.json({
        connected: true,
        status: "offline"
      });
    }
  });

  // Phase 1: Memory reset endpoint to prevent context pollution
  app.post("/api/chat/reset", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Clear conversation memory for this user
      conversationMemory.clearConversation(userId);
      console.log(`[Chat] Memory reset for user ${userId}`);
      
      res.json({ success: true, message: "Memory cleared" });
    } catch (error: any) {
      console.error('Memory reset error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Voice API Routes - DEPRECATED
  // These REST endpoints are no longer used. Voice mode now uses OpenAI Realtime API
  // via WebSocket (handled by realtimeVoiceService and /ws/voice endpoint below).

  // Helper function for rotating intro messages (Phase 1 optimization)
  const getRandomIntroMessage = () => {
    const introMessages = [
      "Hey there! I'm Chroney, your AI assistant. I can help with products, FAQs, and more. What brings you here today?",
      "What's up! Chroney here. I know everything about our products and can answer your questions. How can I help?",
      "Yo! I'm Chroney, your friendly AI sidekick. Need product info? Have questions? Just ask!",
      "Sup, human? Chroney reporting for duty. Tell me what you need—products, FAQs, or just browsing—I'm here to help!",
      "Hey hey! Chroney here. Think of me as your personal shopping assistant. What can I help you discover today?"
    ];
    
    return introMessages[Math.floor(Math.random() * introMessages.length)];
  };

  // Chat intro message endpoint
  app.get("/api/chat/intro", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      // Get widget settings to check welcome message type
      let settings = await storage.getWidgetSettings(businessAccountId);
      
      // If no settings exist, create default ones
      if (!settings) {
        settings = await storage.upsertWidgetSettings(businessAccountId, {});
      }

      // If custom message type, return the custom welcome message
      if (settings.welcomeMessageType === "custom") {
        console.log(`[Intro API] Using custom welcome message`);
        return res.json({ intro: settings.welcomeMessage });
      }

      // Use rotating intro messages for better performance (Phase 1 optimization)
      const intro = getRandomIntroMessage();
      console.log(`[Intro API] Using rotating intro message: ${intro.substring(0, 50)}...`);
      res.json({ intro });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Chat streaming endpoint
  app.post("/api/chat/stream", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      const user = req.user!;
      
      if (!user.businessAccountId) {
        return res.status(403).json({ error: "Business account required" });
      }

      // Fetch personality, currency, and custom instructions from widget settings
      const widgetSettings = await storage.getWidgetSettings(user.businessAccountId);
      const personality = widgetSettings?.personality || 'friendly';
      const currency = widgetSettings?.currency || 'INR';
      const customInstructions = widgetSettings?.customInstructions || '';
      
      // Currency symbol mapping
      const currencySymbols: Record<string, string> = {
        'INR': '₹', 'USD': '$', 'AED': 'د.إ', 'EUR': '€', 'GBP': '£',
        'AUD': 'A$', 'CAD': 'C$', 'CHF': 'CHF', 'CNY': '¥', 'JPY': '¥',
        'KRW': '₩', 'SGD': 'S$', 'HKD': 'HK$', 'NZD': 'NZ$', 'SEK': 'kr',
        'NOK': 'kr', 'DKK': 'kr', 'PLN': 'zł', 'BRL': 'R$', 'MXN': '$',
        'ZAR': 'R', 'TRY': '₺', 'RUB': '₽'
      };
      const currencySymbol = currencySymbols[currency] || '$';
      
      const businessAccount = await storage.getBusinessAccount(user.businessAccountId);
      const companyDescription = businessAccount?.description || '';
      const openaiApiKey = await storage.getBusinessAccountOpenAIKey(user.businessAccountId);

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Stream the response
      for await (const chunk of chatService.streamMessage(message, {
        userId: user.id,
        businessAccountId: user.businessAccountId,
        personality,
        companyDescription,
        openaiApiKey,
        currency,
        currencySymbol,
        customInstructions
      })) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.end();
    } catch (error: any) {
      console.error('Chat streaming error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', data: error.message })}\n\n`);
      res.end();
    }
  });

  // SuperAdmin: Create business account (with user)
  app.post("/api/business-accounts", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { name, website, username } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Business name required" });
      }
      if (!website) {
        return res.status(400).json({ error: "Website URL required" });
      }
      if (!username) {
        return res.status(400).json({ error: "Username required" });
      }
      
      // Basic URL validation
      try {
        new URL(website);
      } catch {
        return res.status(400).json({ error: "Invalid website URL format" });
      }
      
      // Validate email format for username
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(username)) {
        return res.status(400).json({ error: "Username must be a valid email address" });
      }
      
      // Create business account
      const businessAccount = await storage.createBusinessAccount({ name, website, status: "active" });
      
      // Generate secure random password (12 characters: uppercase, lowercase, numbers, symbols)
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
      const password = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      
      // Create associated user
      const passwordHash = await hashPassword(password);
      const tempPasswordExpiry = new Date();
      tempPasswordExpiry.setDate(tempPasswordExpiry.getDate() + 30);
      
      const user = await storage.createUserWithTempPassword({
        username,
        passwordHash,
        tempPassword: password,
        tempPasswordExpiry,
        mustChangePassword: "true",
        role: "business_user",
        businessAccountId: businessAccount.id,
      });
      
      res.json({
        businessAccount,
        user,
        credentials: {
          username: user.username,
          tempPassword: password,
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SuperAdmin: Get all business accounts
  app.get("/api/business-accounts", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const accounts = await storage.getAllBusinessAccounts();
      const { toBusinessAccountDto } = await import("@shared/dto/businessAccount");
      const dtos = accounts.map(toBusinessAccountDto);
      res.json(dtos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SuperAdmin: Update business account
  app.put("/api/business-accounts/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, website } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Business name required" });
      }
      if (!website) {
        return res.status(400).json({ error: "Website URL required" });
      }
      
      // Basic URL validation
      try {
        new URL(website);
      } catch {
        return res.status(400).json({ error: "Invalid website URL format" });
      }
      
      const businessAccount = await storage.updateBusinessAccount(id, { name, website });
      const { toBusinessAccountDto } = await import("@shared/dto/businessAccount");
      res.json(toBusinessAccountDto(businessAccount));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SuperAdmin: Toggle business account status
  app.patch("/api/business-accounts/:id/status", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status || (status !== "active" && status !== "suspended")) {
        return res.status(400).json({ error: "Status must be 'active' or 'suspended'" });
      }
      
      const businessAccount = await storage.updateBusinessAccountStatus(id, status);
      const { toBusinessAccountDto } = await import("@shared/dto/businessAccount");
      res.json(toBusinessAccountDto(businessAccount));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SuperAdmin: Toggle business account feature settings
  app.patch("/api/business-accounts/:id/features", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { shopifyEnabled, appointmentsEnabled, voiceModeEnabled } = req.body;
      
      const updates: any = {};
      
      if (shopifyEnabled !== undefined) {
        if (typeof shopifyEnabled !== "boolean") {
          return res.status(400).json({ error: "shopifyEnabled must be a boolean" });
        }
        updates.shopifyEnabled = shopifyEnabled ? "true" : "false";
      }
      
      if (appointmentsEnabled !== undefined) {
        if (typeof appointmentsEnabled !== "boolean") {
          return res.status(400).json({ error: "appointmentsEnabled must be a boolean" });
        }
        updates.appointmentsEnabled = appointmentsEnabled ? "true" : "false";
      }
      
      if (voiceModeEnabled !== undefined) {
        if (typeof voiceModeEnabled !== "boolean") {
          return res.status(400).json({ error: "voiceModeEnabled must be a boolean" });
        }
        updates.voiceModeEnabled = voiceModeEnabled ? "true" : "false";
      }
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid feature settings provided" });
      }
      
      const businessAccount = await storage.updateBusinessAccountFeatures(id, updates);
      const { toBusinessAccountDto } = await import("@shared/dto/businessAccount");
      res.json(toBusinessAccountDto(businessAccount));
    } catch (error: any) {
      if (error.message === "Business account not found") {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // SuperAdmin: View business user password
  app.get("/api/business-accounts/:id/view-password", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const businessAccountId = req.params.id;
      
      // Find the user for this business account
      const user = await storage.getUserByBusinessAccountId(businessAccountId);
      if (!user) {
        return res.status(404).json({ error: "User not found for this business account" });
      }
      
      res.json({
        username: user.username,
        tempPassword: user.tempPassword,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SuperAdmin: Reset business user password (auto-generates new password)
  app.post("/api/business-accounts/:id/reset-password", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const businessAccountId = req.params.id;
      
      // Find the user for this business account
      const user = await storage.getUserByBusinessAccountId(businessAccountId);
      if (!user) {
        return res.status(404).json({ error: "User not found for this business account" });
      }
      
      // Generate secure random password (12 characters: uppercase, lowercase, numbers, symbols)
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
      const password = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      
      // Hash the new password
      const passwordHash = await hashPassword(password);
      const tempPasswordExpiry = new Date();
      tempPasswordExpiry.setDate(tempPasswordExpiry.getDate() + 30);
      
      // Update password
      await storage.resetUserPassword(user.id, passwordHash, password, tempPasswordExpiry);
      
      res.json({
        username: user.username,
        tempPassword: password,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SuperAdmin: Update API settings (OpenAI API key, Deepgram API key, and currency) for a business account
  app.patch("/api/business-accounts/:id/api-settings", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { openaiApiKey, deepgramApiKey, currency } = req.body;
      
      // Verify business account exists
      const businessAccount = await storage.getBusinessAccount(id);
      if (!businessAccount) {
        return res.status(404).json({ error: "Business account not found" });
      }
      
      // Update OpenAI API key if provided (encrypted in storage layer)
      if (openaiApiKey !== undefined) {
        if (openaiApiKey && typeof openaiApiKey !== 'string') {
          return res.status(400).json({ error: "OpenAI API key must be a string" });
        }
        await storage.updateBusinessAccountOpenAIKey(id, openaiApiKey || null);
      }
      
      // Update Deepgram API key if provided (encrypted in storage layer)
      if (deepgramApiKey !== undefined) {
        if (deepgramApiKey && typeof deepgramApiKey !== 'string') {
          return res.status(400).json({ error: "Deepgram API key must be a string" });
        }
        await storage.updateBusinessAccountDeepgramKey(id, deepgramApiKey || null);
      }
      
      // Update currency in widget settings if provided
      if (currency !== undefined) {
        if (typeof currency !== 'string') {
          return res.status(400).json({ error: "Currency must be a string" });
        }
        // Validate currency format (3-letter ISO code)
        if (currency && !/^[A-Z]{3}$/.test(currency)) {
          return res.status(400).json({ error: "Currency must be a valid 3-letter ISO code (e.g., USD, EUR)" });
        }
        await storage.upsertWidgetSettings(id, { currency });
      }
      
      // Fetch updated data
      const updated = await storage.getBusinessAccount(id);
      const widgetSettings = await storage.getWidgetSettings(id);
      
      // Return masked API keys for security
      res.json({
        businessAccountId: updated!.id,
        openaiApiKey: updated!.openaiApiKey ? `sk-...${updated!.openaiApiKey.slice(-4)}` : null,
        deepgramApiKey: updated!.deepgramApiKey ? `...${updated!.deepgramApiKey.slice(-4)}` : null,
        currency: widgetSettings?.currency || "USD",
      });
    } catch (error: any) {
      console.error('[SuperAdmin API Settings] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // SuperAdmin: Get API settings for a business account
  app.get("/api/business-accounts/:id/api-settings", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { id } = req.params;
      
      const businessAccount = await storage.getBusinessAccount(id);
      if (!businessAccount) {
        return res.status(404).json({ error: "Business account not found" });
      }
      
      const widgetSettings = await storage.getWidgetSettings(id);
      
      // Return masked API keys for security
      res.json({
        businessAccountId: businessAccount.id,
        businessName: businessAccount.name,
        openaiApiKey: businessAccount.openaiApiKey ? `sk-...${businessAccount.openaiApiKey.slice(-4)}` : null,
        hasOpenAIKey: !!businessAccount.openaiApiKey,
        deepgramApiKey: businessAccount.deepgramApiKey ? `...${businessAccount.deepgramApiKey.slice(-4)}` : null,
        hasDeepgramKey: !!businessAccount.deepgramApiKey,
        currency: widgetSettings?.currency || "USD",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // =============================================================================
  // DEMO PAGES - SuperAdmin Routes
  // =============================================================================

  // Helper: Generate secure random token for demo pages
  function generateDemoToken(): string {
    return randomBytes(32).toString('hex');
  }

  // SuperAdmin: Create a new demo page
  app.post("/api/super-admin/demo-pages", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { businessAccountId, title, description, appearance, expiresAt } = req.body;
      const userId = req.user!.id;

      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account ID is required" });
      }

      // Verify business account exists
      const businessAccount = await storage.getBusinessAccount(businessAccountId);
      if (!businessAccount) {
        return res.status(404).json({ error: "Business account not found" });
      }

      // Generate unique token
      const token = generateDemoToken();

      const demoPage = await storage.createDemoPage({
        businessAccountId,
        token,
        title: title || null,
        description: description || null,
        appearance: appearance || null,
        isActive: "true",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: userId,
      });

      res.status(201).json(demoPage);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SuperAdmin: Get all demo pages
  app.get("/api/super-admin/demo-pages", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const demoPages = await storage.getAllDemoPages();
      res.json(demoPages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SuperAdmin: Get specific demo page
  app.get("/api/super-admin/demo-pages/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const demoPage = await storage.getDemoPage(id);
      
      if (!demoPage) {
        return res.status(404).json({ error: "Demo page not found" });
      }

      res.json(demoPage);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SuperAdmin: Update demo page
  app.patch("/api/super-admin/demo-pages/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, appearance, isActive, expiresAt } = req.body;

      // Verify demo page exists
      const existing = await storage.getDemoPage(id);
      if (!existing) {
        return res.status(404).json({ error: "Demo page not found" });
      }

      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (appearance !== undefined) updates.appearance = appearance;
      if (isActive !== undefined) {
        if (typeof isActive !== "boolean") {
          return res.status(400).json({ error: "isActive must be a boolean" });
        }
        updates.isActive = isActive ? "true" : "false";
      }
      if (expiresAt !== undefined) {
        updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
      }

      const updated = await storage.updateDemoPage(id, updates);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SuperAdmin: Regenerate demo page token
  app.post("/api/super-admin/demo-pages/:id/regenerate-token", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { id } = req.params;

      // Verify demo page exists
      const existing = await storage.getDemoPage(id);
      if (!existing) {
        return res.status(404).json({ error: "Demo page not found" });
      }

      // Generate new token
      const newToken = generateDemoToken();
      const updated = await storage.regenerateDemoPageToken(id, newToken);

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SuperAdmin: Delete demo page
  app.delete("/api/super-admin/demo-pages/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { id } = req.params;

      // Verify demo page exists
      const existing = await storage.getDemoPage(id);
      if (!existing) {
        return res.status(404).json({ error: "Demo page not found" });
      }

      await storage.deleteDemoPage(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // =============================================================================
  // DEMO PAGES - Public Routes
  // =============================================================================

  // Public: Get demo page by token (no authentication required)
  app.get("/api/demo/by-token/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const demoPage = await storage.getDemoPageByToken(token);
      
      if (!demoPage) {
        return res.status(404).json({ error: "Demo page not found" });
      }

      // Check if demo page is active
      if (demoPage.isActive !== "true") {
        return res.status(404).json({ error: "Demo page not found" });
      }

      // Check if demo page has expired
      if (demoPage.expiresAt && new Date(demoPage.expiresAt) < new Date()) {
        return res.status(404).json({ error: "Demo page has expired" });
      }

      // Update last viewed timestamp
      await storage.updateDemoPageLastViewed(token);

      // Fetch business account and website analysis data
      const businessAccount = await storage.getBusinessAccount(demoPage.businessAccountId);
      if (!businessAccount) {
        return res.status(404).json({ error: "Business account not found" });
      }

      const websiteAnalysis = await storage.getWebsiteAnalysis(demoPage.businessAccountId);
      const widgetSettings = await storage.getWidgetSettings(demoPage.businessAccountId);

      // Return sanitized data (exclude sensitive fields)
      res.json({
        id: demoPage.id,
        title: demoPage.title || businessAccount.name,
        description: demoPage.description || businessAccount.description,
        appearance: demoPage.appearance ? JSON.parse(demoPage.appearance) : null,
        businessAccount: {
          id: businessAccount.id,
          name: businessAccount.name,
          website: businessAccount.website,
          description: businessAccount.description,
        },
        websiteAnalysis: websiteAnalysis ? {
          analyzedContent: websiteAnalysis.analyzedContent ? JSON.parse(websiteAnalysis.analyzedContent) : null,
        } : null,
        widgetSettings: widgetSettings ? {
          chatColor: widgetSettings.chatColor,
          chatColorEnd: widgetSettings.chatColorEnd,
          widgetHeaderText: widgetSettings.widgetHeaderText,
          buttonStyle: widgetSettings.buttonStyle,
          buttonAnimation: widgetSettings.buttonAnimation,
        } : null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Business User: Get or create public chat link
  app.get("/api/public-chat-link", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const user = req.user!;
      const businessAccountId = user.businessAccountId!;

      const link = await storage.getOrCreatePublicChatLink(businessAccountId);
      
      // Return the link with the full URL
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : req.protocol + '://' + req.get('host');
      
      res.json({
        ...link,
        url: `${baseUrl}/public-chat/${link.token}`
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Business User: Toggle public chat link status
  app.patch("/api/public-chat-link/toggle", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const user = req.user!;
      const businessAccountId = user.businessAccountId!;

      const link = await storage.togglePublicChatLinkStatus(businessAccountId);
      
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : req.protocol + '://' + req.get('host');
      
      res.json({
        ...link,
        url: `${baseUrl}/public-chat/${link.token}`
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Business User: Regenerate public chat link token
  app.post("/api/public-chat-link/regenerate", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const user = req.user!;
      const businessAccountId = user.businessAccountId!;

      // Generate new random token
      const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const link = await storage.regeneratePublicChatLinkToken(businessAccountId, newToken);
      
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : req.protocol + '://' + req.get('host');
      
      res.json({
        ...link,
        url: `${baseUrl}/public-chat/${link.token}`
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Business User: Update public chat link password
  app.patch("/api/public-chat-link/password", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const user = req.user!;
      const businessAccountId = user.businessAccountId!;
      const { password } = req.body;

      // Password can be null/empty to remove protection, or a string to set it
      const updatedLink = await storage.updatePublicChatLinkPassword(businessAccountId, password || null);
      
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : req.protocol + '://' + req.get('host');
      
      res.json({
        ...updatedLink,
        url: `${baseUrl}/public-chat/${updatedLink.token}`
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Public: Verify public chat password
  app.post("/api/public-chat/:token/verify-password", async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      const link = await storage.getPublicChatLinkByToken(token);
      
      if (!link || link.isActive !== "true") {
        return res.status(404).json({ error: "Chat link not found or disabled", verified: false });
      }

      // If no password is set on the link, allow access
      if (!link.password) {
        // Set signed verification cookie even for links without password
        res.cookie(`public_chat_verified_${token}`, 'true', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          signed: true,
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        return res.json({ verified: true });
      }

      // Check if provided password matches
      if (password === link.password) {
        // Set signed verification cookie to track successful password verification
        res.cookie(`public_chat_verified_${token}`, 'true', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          signed: true,
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        return res.json({ verified: true });
      }

      return res.status(401).json({ verified: false, error: "Incorrect password" });
    } catch (error: any) {
      res.status(500).json({ error: error.message, verified: false });
    }
  });

  // Public: Get chat data by token (no auth required)
  app.get("/api/public-chat/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const link = await storage.getPublicChatLinkByToken(token);
      
      if (!link) {
        return res.status(404).json({ error: "Chat link not found" });
      }

      // Check if link is active
      if (link.isActive !== "true") {
        return res.status(404).json({ error: "Chat link is disabled" });
      }

      // Update access tracking
      await storage.updatePublicChatLinkAccess(token);

      // Fetch business account and related data
      const businessAccount = await storage.getBusinessAccount(link.businessAccountId);
      if (!businessAccount) {
        return res.status(404).json({ error: "Business account not found" });
      }

      const websiteAnalysis = await storage.getWebsiteAnalysis(link.businessAccountId);
      const widgetSettings = await storage.getWidgetSettings(link.businessAccountId);

      // Return sanitized data for public access
      res.json({
        businessAccount: {
          id: businessAccount.id,
          name: businessAccount.name,
          website: businessAccount.website,
          description: businessAccount.description,
        },
        websiteAnalysis: websiteAnalysis ? {
          analyzedContent: websiteAnalysis.analyzedContent ? JSON.parse(websiteAnalysis.analyzedContent) : null,
        } : null,
        widgetSettings: widgetSettings ? {
          chatColor: widgetSettings.chatColor,
          chatColorEnd: widgetSettings.chatColorEnd,
          widgetHeaderText: widgetSettings.widgetHeaderText,
          currency: widgetSettings.currency,
        } : null,
        hasPassword: !!link.password,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Public: Get intro message for public chat (no auth required)
  app.get("/api/public-chat/:token/intro", async (req, res) => {
    try {
      const { token } = req.params;

      const link = await storage.getPublicChatLinkByToken(token);
      
      if (!link || link.isActive !== "true") {
        return res.status(404).json({ error: "Chat link not found or disabled" });
      }

      // Check password verification if password is set
      if (link.password) {
        const verificationCookie = req.signedCookies[`public_chat_verified_${token}`];
        if (verificationCookie !== 'true') {
          return res.status(403).json({ error: "Password verification required" });
        }
      }

      const businessAccountId = link.businessAccountId;
      const intro = await generateIntroMessage(businessAccountId);
      
      res.json({ intro });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Public: Send message in public chat (no auth required)
  app.post("/api/public-chat/:token/message", async (req, res) => {
    try {
      const { token } = req.params;
      const { message } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      const link = await storage.getPublicChatLinkByToken(token);
      
      if (!link || link.isActive !== "true") {
        return res.status(404).json({ error: "Chat link not found or disabled" });
      }

      // Check password verification if password is set
      if (link.password) {
        const verificationCookie = req.signedCookies[`public_chat_verified_${token}`];
        if (verificationCookie !== 'true') {
          return res.status(403).json({ error: "Password verification required" });
        }
      }

      const businessAccountId = link.businessAccountId;

      // Use a unique user ID for public chat based on the token
      // This allows the chat service to track conversations for each public session
      const publicUserId = `public_${token}`;

      // Process the message using the chat service
      const response = await processPublicChatMessage(message, businessAccountId, publicUserId);

      res.json(response);
    } catch (error: any) {
      console.error('[Public Chat] Error processing message:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // SuperAdmin: Create business user
  app.post("/api/business-accounts/:id/users", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { username, password } = req.body;
      const businessAccountId = req.params.id;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(username)) {
        return res.status(400).json({ error: "Username must be a valid email address" });
      }

      const passwordHash = await hashPassword(password);
      
      // Set temp password expiry to 30 days from now
      const tempPasswordExpiry = new Date();
      tempPasswordExpiry.setDate(tempPasswordExpiry.getDate() + 30);

      const user = await storage.createUserWithTempPassword({
        username,
        passwordHash,
        tempPassword: password,
        tempPasswordExpiry,
        mustChangePassword: "true",
        role: "business_user",
        businessAccountId,
      });

      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        businessAccountId: user.businessAccountId,
        credentials: {
          username,
          password, // Return plaintext password only on creation
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SuperAdmin: Get users for a business account
  app.get("/api/business-accounts/:id/users", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const users = await storage.getUsersByBusinessAccount(req.params.id);
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SuperAdmin: Get all users
  app.get("/api/users", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SuperAdmin: Get user credentials (temp password)
  app.get("/api/users/:id/credentials", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if temp password has expired
      const isExpired = user.tempPasswordExpiry && new Date(user.tempPasswordExpiry) < new Date();

      res.json({
        username: user.username,
        tempPassword: user.tempPassword,
        tempPasswordExpiry: user.tempPasswordExpiry,
        isExpired,
        hasCredentials: !!user.tempPassword
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SuperAdmin: Reset user password
  app.post("/api/users/:id/reset-password", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { password } = req.body;
      const userId = req.params.id;

      if (!password) {
        return res.status(400).json({ error: "Password required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const passwordHash = await hashPassword(password);
      
      // Set temp password expiry to 30 days from now
      const tempPasswordExpiry = new Date();
      tempPasswordExpiry.setDate(tempPasswordExpiry.getDate() + 30);

      // Update password hash AND set temp password
      const updatedUser = await storage.resetUserPassword(userId, passwordHash, password, tempPasswordExpiry);

      res.json({
        success: true,
        credentials: {
          username: updatedUser.username,
          password,
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Change password (for user's own password)
  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!newPassword) {
        return res.status(400).json({ error: "New password required" });
      }

      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Only verify current password if this is NOT a forced password change
      if (user.mustChangePassword !== "true" && currentPassword) {
        // Verify current password for regular password changes
        if (!(await verifyPassword(currentPassword, user.passwordHash))) {
          return res.status(401).json({ error: "Current password is incorrect" });
        }
      }

      // Hash and update new password
      const passwordHash = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, passwordHash);
      
      // Clear temporary password fields and mustChangePassword flag
      await storage.clearTempPassword(user.id);

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Forgot password - send reset link via email
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByUsername(email);
      
      // Always return success to prevent email enumeration attacks
      if (!user) {
        return res.json({ 
          success: true, 
          message: "If an account exists with this email, a password reset link has been sent" 
        });
      }

      // Generate reset token
      const resetToken = randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Token valid for 1 hour

      // Save reset token to database
      await storage.createPasswordResetToken({
        userId: user.id,
        token: resetToken,
        expiresAt,
      });

      // TODO: Implement password reset email functionality
      // Password reset tokens are generated and stored, but email sending is not yet implemented
      console.log(`[Password Reset] Token generated for ${user.username}: ${resetToken}`);
      console.log(`[Password Reset] Reset link: ${process.env.REPLIT_DEV_DOMAIN || 'localhost:5000'}/reset-password?token=${resetToken}`);

      res.json({ 
        success: true, 
        message: "If an account exists with this email, a password reset link has been sent" 
      });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: "An error occurred. Please try again later." });
    }
  });

  // Reset password - verify token and update password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long" });
      }

      // Get reset token from database
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken) {
        return res.status(400).json({ error: "Invalid or expired reset link" });
      }

      // Check if token has expired
      if (new Date() > new Date(resetToken.expiresAt)) {
        return res.status(400).json({ error: "Reset link has expired. Please request a new one" });
      }

      // Check if token has already been used
      if (resetToken.usedAt) {
        return res.status(400).json({ error: "This reset link has already been used" });
      }

      // Hash new password and update user
      const passwordHash = await hashPassword(newPassword);
      await storage.updateUserPassword(resetToken.userId, passwordHash);
      
      // Clear any temporary password flags
      await storage.clearTempPassword(resetToken.userId);

      // Mark token as used
      await storage.markPasswordResetTokenAsUsed(token);

      res.json({ success: true, message: "Password reset successful. You can now log in with your new password" });
    } catch (error: any) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: "An error occurred. Please try again later." });
    }
  });

  // Chat functionality has been removed

  // Configure multer for local file storage in Portfolio directory
  const portfolioDir = path.join(process.cwd(), "Portfolio");
  
  // Ensure Portfolio directory exists
  if (!fs.existsSync(portfolioDir)) {
    fs.mkdirSync(portfolioDir, { recursive: true });
  }

  const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, portfolioDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename with original extension
      const uniqueName = `${randomUUID()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  });

  const upload = multer({
    storage: multerStorage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      // Accept only image files
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
      }
    },
  });

  // Configure multer for Excel file uploads (memory storage)
  const excelUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      // Accept Excel and CSV files
      const allowedMimes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv', // .csv
      ];
      const allowedExtensions = ['.xlsx', '.xls', '.csv'];
      const fileExtension = path.extname(file.originalname).toLowerCase();
      
      if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed.'));
      }
    },
  });

  // Configure multer for PDF file uploads (training documents)
  const trainingDocsDir = path.join(process.cwd(), "uploads", "training-docs");
  
  // Ensure training-docs directory exists
  if (!fs.existsSync(trainingDocsDir)) {
    fs.mkdirSync(trainingDocsDir, { recursive: true });
  }

  const pdfStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, trainingDocsDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename with original extension
      const uniqueName = `${randomUUID()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  });

  const pdfUpload = multer({
    storage: pdfStorage,
    limits: {
      fileSize: 25 * 1024 * 1024, // 25MB limit
    },
    fileFilter: (req, file, cb) => {
      // Accept only PDF files
      const allowedMimes = ['application/pdf'];
      const allowedExtensions = ['.pdf'];
      const fileExtension = path.extname(file.originalname).toLowerCase();
      
      if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF files are allowed.'));
      }
    },
  });

  // Upload product image endpoint
  app.post("/api/upload-image", requireAuth, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const imageUrl = `/portfolio/${req.file.filename}`;
      res.json({ imageUrl });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      res.status(500).json({ error: error.message || "Failed to upload image" });
    }
  });

  // Delete product image endpoint
  app.delete("/api/delete-image", requireAuth, async (req, res) => {
    try {
      const { imageUrl } = req.body;
      
      if (!imageUrl) {
        return res.status(400).json({ error: "Image URL required" });
      }

      // Extract filename from imageUrl (e.g., "/portfolio/abc-123.jpg" -> "abc-123.jpg")
      const filename = imageUrl.replace('/portfolio/', '');
      
      // Sanitize filename to prevent directory traversal
      const sanitizedFilename = path.basename(filename);
      
      // Ensure filename doesn't start with a dot (hidden files)
      if (sanitizedFilename.startsWith('.')) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const filepath = path.join(portfolioDir, sanitizedFilename);
      
      // Verify the resolved path is within the Portfolio directory
      const normalizedPath = path.normalize(filepath);
      if (!normalizedPath.startsWith(portfolioDir)) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Delete file if it exists
      if (fs.existsSync(normalizedPath)) {
        fs.unlinkSync(normalizedPath);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting image:", error);
      res.status(500).json({ error: error.message || "Failed to delete image" });
    }
  });

  // Serve images from Portfolio directory
  app.get("/portfolio/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;
      
      // Sanitize filename to prevent directory traversal
      const sanitizedFilename = path.basename(filename);
      
      // Ensure filename doesn't start with a dot (hidden files)
      if (sanitizedFilename.startsWith('.')) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const filepath = path.join(portfolioDir, sanitizedFilename);
      
      // Verify the resolved path is within the Portfolio directory
      const normalizedPath = path.normalize(filepath);
      if (!normalizedPath.startsWith(portfolioDir)) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if file exists
      if (!fs.existsSync(normalizedPath)) {
        return res.status(404).json({ error: "Image not found" });
      }

      // Send file with appropriate headers
      res.sendFile(normalizedPath, {
        headers: {
          'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        }
      });
    } catch (error: any) {
      console.error("Error serving image:", error);
      res.status(500).json({ error: "Failed to serve image" });
    }
  });

  // Helper function to invalidate cached intro when products change
  const invalidateCachedIntro = async (businessAccountId: string) => {
    try {
      await storage.upsertWidgetSettings(businessAccountId, { cachedIntro: null });
    } catch (error) {
      console.error('[Cache] Failed to invalidate cached intro:', error);
    }
  };

  // Product routes
  app.post("/api/products", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      
      const validatedData = insertProductSchema.parse({
        ...req.body,
        businessAccountId
      });
      const product = await storage.createProduct(validatedData);
      
      // Invalidate cached intro since products changed
      await invalidateCachedIntro(businessAccountId);
      
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/products", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const products = await storage.getAllProducts(businessAccountId);
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const product = await storage.getProduct(req.params.id, businessAccountId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/products/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const product = await storage.updateProduct(req.params.id, businessAccountId, req.body);
      
      // Invalidate cached intro since product changed
      await invalidateCachedIntro(businessAccountId);
      
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/products/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      await storage.deleteProduct(req.params.id, businessAccountId);
      
      // Invalidate cached intro since product deleted
      await invalidateCachedIntro(businessAccountId);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Category routes
  app.post("/api/categories", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      
      const validatedData = insertCategorySchema.parse({
        ...req.body,
        businessAccountId
      });
      const category = await storage.createCategory(validatedData);
      res.json(category);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/categories", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const categories = await storage.getAllCategories(businessAccountId);
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/categories/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const category = await storage.updateCategory(req.params.id, businessAccountId, req.body);
      res.json(category);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/categories/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      await storage.deleteCategory(req.params.id, businessAccountId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Tag routes
  app.post("/api/tags", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      
      const validatedData = insertTagSchema.parse({
        ...req.body,
        businessAccountId
      });
      const tag = await storage.createTag(validatedData);
      res.json(tag);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/tags", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const tags = await storage.getAllTags(businessAccountId);
      res.json(tags);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/tags/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const tag = await storage.updateTag(req.params.id, businessAccountId, req.body);
      res.json(tag);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/tags/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      await storage.deleteTag(req.params.id, businessAccountId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Product-Category assignment routes
  app.post("/api/products/:productId/categories", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const { productId } = req.params;
      const { categoryId } = req.body;
      
      if (!categoryId) {
        return res.status(400).json({ error: "Category ID required" });
      }
      
      const assignment = await storage.assignProductToCategory(productId, categoryId);
      res.json(assignment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products/:productId/categories", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const { productId } = req.params;
      const categories = await storage.getProductCategories(productId);
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/products/:productId/categories/:categoryId", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const { productId, categoryId } = req.params;
      await storage.removeProductFromCategory(productId, categoryId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/products/:productId/categories", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const { productId } = req.params;
      const { categoryIds } = req.body;
      
      if (!Array.isArray(categoryIds)) {
        return res.status(400).json({ error: "categoryIds must be an array" });
      }
      
      // Remove all existing categories
      const existingCategories = await storage.getProductCategories(productId);
      for (const category of existingCategories) {
        await storage.removeProductFromCategory(productId, category.id);
      }
      
      // Add new categories
      for (const categoryId of categoryIds) {
        await storage.assignProductToCategory(productId, categoryId);
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Product-Tag assignment routes
  app.post("/api/products/:productId/tags", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const { productId } = req.params;
      const { tagId } = req.body;
      
      if (!tagId) {
        return res.status(400).json({ error: "Tag ID required" });
      }
      
      const assignment = await storage.assignProductToTag(productId, tagId);
      res.json(assignment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products/:productId/tags", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const { productId } = req.params;
      const tags = await storage.getProductTags(productId);
      res.json(tags);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/products/:productId/tags/:tagId", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const { productId, tagId } = req.params;
      await storage.removeProductFromTag(productId, tagId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/products/:productId/tags", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const { productId } = req.params;
      const { tagIds } = req.body;
      
      if (!Array.isArray(tagIds)) {
        return res.status(400).json({ error: "tagIds must be an array" });
      }
      
      // Remove all existing tags
      const existingTags = await storage.getProductTags(productId);
      for (const tag of existingTags) {
        await storage.removeProductFromTag(productId, tag.id);
      }
      
      // Add new tags
      for (const tagId of tagIds) {
        await storage.assignProductToTag(productId, tagId);
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Product Relationship routes
  app.post("/api/product-relationships", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      
      const validatedData = insertProductRelationshipSchema.parse({
        ...req.body,
        businessAccountId
      });
      const relationship = await storage.createProductRelationship(validatedData);
      res.json(relationship);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/products/:productId/relationships", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      
      const { productId } = req.params;
      const { type } = req.query;
      
      const relationships = await storage.getProductRelationships(
        productId,
        businessAccountId,
        type as string | undefined
      );
      res.json(relationships);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products/:productId/related", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      
      const { productId } = req.params;
      const relatedProducts = await storage.getRelatedProducts(productId, businessAccountId);
      res.json(relatedProducts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/product-relationships/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      
      const relationship = await storage.updateProductRelationship(
        req.params.id,
        businessAccountId,
        req.body
      );
      res.json(relationship);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/product-relationships/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      
      await storage.deleteProductRelationship(req.params.id, businessAccountId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // FAQ routes
  app.post("/api/faqs", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      
      const validatedData = insertFaqSchema.parse({
        ...req.body,
        businessAccountId
      });
      const faq = await storage.createFaq(validatedData);
      res.json(faq);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/faqs", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const faqs = await storage.getAllFaqs(businessAccountId);
      res.json(faqs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/faqs/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const faq = await storage.getFaq(req.params.id, businessAccountId);
      if (!faq) {
        return res.status(404).json({ error: "FAQ not found" });
      }
      res.json(faq);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/faqs/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const faq = await storage.updateFaq(req.params.id, businessAccountId, req.body);
      res.json(faq);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/faqs/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      await storage.deleteFaq(req.params.id, businessAccountId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Bulk add FAQs
  app.post("/api/faqs/bulk", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const { faqs } = req.body;
      const businessAccountId = req.user?.businessAccountId;
      
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      if (!faqs || !Array.isArray(faqs) || faqs.length === 0) {
        return res.status(400).json({ error: "FAQs array is required" });
      }

      // Add businessAccountId to each FAQ and insert
      const createdFaqs = [];
      for (const faq of faqs) {
        const faqData = {
          ...faq,
          businessAccountId
        };
        
        const result = insertFaqSchema.safeParse(faqData);
        if (!result.success) {
          continue; // Skip invalid FAQs
        }
        
        const created = await storage.createFaq(result.data);
        createdFaqs.push(created);
      }

      res.json({ 
        success: true,
        count: createdFaqs.length,
        faqs: createdFaqs
      });
    } catch (error: any) {
      console.error("Error bulk adding FAQs:", error);
      res.status(500).json({ error: error.message || "Failed to add FAQs" });
    }
  });

  // Training Documents routes
  app.post("/api/training-documents", requireAuth, requireBusinessAccount, pdfUpload.single('file'), async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      const userId = req.user?.id;
      
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      if (!userId) {
        return res.status(400).json({ error: "User not found" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "PDF file is required" });
      }

      // Create database record
      const documentData = insertTrainingDocumentSchema.parse({
        businessAccountId,
        filename: req.file.filename,
        originalFilename: req.file.originalname,
        fileSize: req.file.size.toString(),
        storageKey: req.file.path,
        uploadStatus: 'pending',
        uploadedBy: userId,
      });

      const document = await storage.createTrainingDocument(documentData);

      // Start background processing (don't await)
      pdfProcessingService.processDocument(
        document.id,
        req.file.path,
        businessAccountId,
        req.file.originalname
      ).catch(error => {
        console.error('Background PDF processing error:', error);
      });

      res.status(201).json(document);
    } catch (error: any) {
      console.error("Error uploading training document:", error);
      
      // Clean up uploaded file if database insert fails
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting uploaded file:', unlinkError);
        }
      }
      
      res.status(500).json({ error: error.message || "Failed to upload training document" });
    }
  });

  app.get("/api/training-documents", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const documents = await storage.getTrainingDocuments(businessAccountId);
      res.json(documents);
    } catch (error: any) {
      console.error("Error fetching training documents:", error);
      res.status(500).json({ error: error.message || "Failed to fetch training documents" });
    }
  });

  app.get("/api/training-documents/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const document = await storage.getTrainingDocument(req.params.id, businessAccountId);
      
      if (!document) {
        return res.status(404).json({ error: "Training document not found" });
      }

      res.json(document);
    } catch (error: any) {
      console.error("Error fetching training document:", error);
      res.status(500).json({ error: error.message || "Failed to fetch training document" });
    }
  });

  app.delete("/api/training-documents/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      // Get the document to retrieve the storage key
      const document = await storage.getTrainingDocument(req.params.id, businessAccountId);
      
      if (!document) {
        return res.status(404).json({ error: "Training document not found" });
      }

      // Delete the file from filesystem if it exists
      if (document.storageKey) {
        try {
          fs.unlinkSync(document.storageKey);
        } catch (fileError) {
          console.error('Error deleting file:', fileError);
          // Continue with database deletion even if file deletion fails
        }
      }

      // Delete from database
      await storage.deleteTrainingDocument(req.params.id, businessAccountId);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting training document:", error);
      res.status(500).json({ error: error.message || "Failed to delete training document" });
    }
  });

  // Lead routes
  app.post("/api/leads", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      
      const validatedData = insertLeadSchema.parse({
        ...req.body,
        businessAccountId
      });
      const lead = await storage.createLead(validatedData);
      res.json(lead);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/leads", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      
      const { fromDate, toDate } = req.query;
      
      // Get leads filtered by business account at database level
      const leads = await storage.getAllLeads(businessAccountId);
      
      // Filter by date range if provided
      let filteredLeads = leads;
      if (fromDate && typeof fromDate === 'string') {
        const from = new Date(fromDate);
        filteredLeads = filteredLeads.filter(lead => new Date(lead.createdAt) >= from);
      }
      if (toDate && typeof toDate === 'string') {
        const to = new Date(toDate);
        filteredLeads = filteredLeads.filter(lead => new Date(lead.createdAt) <= to);
      }
      
      res.json(filteredLeads);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/leads/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const lead = await storage.getLead(req.params.id, businessAccountId);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/leads/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      await storage.deleteLead(req.params.id, businessAccountId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Support Ticket routes
  app.post("/api/tickets", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      // Validate request body with Zod schema
      const validatedData = insertSupportTicketSchema.parse({
        ...req.body,
        businessAccountId,
        status: req.body.status || 'open',
        priority: req.body.priority || 'medium'
      });

      const ticket = await storage.createSupportTicket(validatedData);
      
      // Trigger AI analysis asynchronously
      if (ticket.subject && ticket.description) {
        ticketIntelligenceService.analyzeTicket(
          businessAccountId,
          ticket.id,
          ticket.subject,
          ticket.description,
          ticket.customerEmail || ''
        ).catch(error => console.error('Ticket analysis error:', error));
      }

      res.json(ticket);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/tickets", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const { status, priority, category } = req.query;
      const filters: any = {};
      
      if (status) filters.status = status as string;
      if (priority) filters.priority = priority as string;
      if (category) filters.category = category as string;

      const tickets = await storage.getAllSupportTickets(businessAccountId, filters);
      res.json(tickets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tickets/stats", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const stats = await storage.getTicketStats(businessAccountId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tickets/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const ticket = await storage.getSupportTicket(req.params.id, businessAccountId);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Get messages and attachments
      const [messages, attachments] = await Promise.all([
        storage.getTicketMessages(ticket.id, businessAccountId),
        storage.getTicketAttachments(ticket.id, businessAccountId)
      ]);

      res.json({ ...ticket, messages, attachments });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/tickets/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      // Validate update fields - make all fields optional for partial updates
      const validatedUpdates = insertSupportTicketSchema.partial().parse(req.body);

      const ticket = await storage.updateSupportTicket(req.params.id, businessAccountId, validatedUpdates);
      res.json(ticket);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/tickets/:id/status", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      const ticket = await storage.updateTicketStatus(req.params.id, businessAccountId, status);
      res.json(ticket);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/tickets/:id/priority", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const { priority } = req.body;
      if (!priority) {
        return res.status(400).json({ error: "Priority is required" });
      }

      const ticket = await storage.updateTicketPriority(req.params.id, businessAccountId, priority);
      res.json(ticket);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tickets/:id/resolve", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const { isAutoResolved, resolutionSummary } = req.body;
      const ticket = await storage.resolveTicket(
        req.params.id,
        businessAccountId,
        isAutoResolved || false,
        resolutionSummary
      );
      res.json(ticket);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tickets/:id/close", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const ticket = await storage.closeTicket(req.params.id, businessAccountId);
      res.json(ticket);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tickets/:id/reopen", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const ticket = await storage.reopenTicket(req.params.id, businessAccountId);
      res.json(ticket);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/tickets/:id/rating", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const { rating, feedback } = req.body;
      if (!rating) {
        return res.status(400).json({ error: "Rating is required" });
      }

      const ticket = await storage.updateTicketRating(req.params.id, rating, feedback);
      res.json(ticket);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Operations for tickets
  app.post("/api/tickets/:id/analyze", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const ticket = await storage.getSupportTicket(req.params.id, businessAccountId);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      const analysis = await ticketIntelligenceService.analyzeTicket(
        businessAccountId,
        ticket.id,
        ticket.subject,
        ticket.description,
        ticket.customerEmail || ''
      );

      res.json(analysis);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tickets/:id/auto-resolve", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const ticket = await storage.getSupportTicket(req.params.id, businessAccountId);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      const resolution = await ticketIntelligenceService.attemptAutoResolution(
        businessAccountId,
        ticket.id,
        ticket.subject,
        ticket.description
      );

      res.json(resolution);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tickets/:id/draft-response", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const ticket = await storage.getSupportTicket(req.params.id, businessAccountId);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      const messages = await storage.getTicketMessages(ticket.id, businessAccountId);
      const conversationHistory = messages.map(msg => ({
        role: msg.senderType === 'customer' ? 'customer' as const : 'agent' as const,
        content: msg.message
      }));

      const draftResponse = await ticketIntelligenceService.generateAIDraftResponse(
        businessAccountId,
        ticket.id,
        ticket.subject,
        ticket.description,
        conversationHistory
      );

      res.json({ draftResponse });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Ticket Messages
  app.post("/api/tickets/:id/messages", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      // Verify ticket exists and belongs to business
      const ticket = await storage.getSupportTicket(req.params.id, businessAccountId);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Validate request body with Zod schema
      const validatedData = insertTicketMessageSchema.parse({
        ...req.body,
        ticketId: req.params.id,
        isInternal: req.body.isInternal || 'false'
      });

      const message = await storage.createTicketMessage(validatedData);
      res.json(message);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/tickets/:id/messages", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const messages = await storage.getTicketMessages(req.params.id, businessAccountId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Ticket Attachments
  app.post("/api/tickets/:id/attachments", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      // Verify ticket exists and belongs to business
      const ticket = await storage.getSupportTicket(req.params.id, businessAccountId);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      const attachmentData = {
        ...req.body,
        ticketId: req.params.id
      };

      const attachment = await storage.createTicketAttachment(attachmentData);
      res.json(attachment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/tickets/:id/attachments", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const attachments = await storage.getTicketAttachments(req.params.id, businessAccountId);
      res.json(attachments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/tickets/attachments/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      await storage.deleteTicketAttachment(req.params.id, businessAccountId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Canned Responses
  app.post("/api/canned-responses", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const responseData = {
        ...req.body,
        businessAccountId
      };

      const cannedResponse = await storage.createCannedResponse(responseData);
      res.json(cannedResponse);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/canned-responses", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const responses = await storage.getAllCannedResponses(businessAccountId);
      res.json(responses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/canned-responses/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const response = await storage.getCannedResponse(req.params.id, businessAccountId);
      if (!response) {
        return res.status(404).json({ error: "Canned response not found" });
      }

      res.json(response);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/canned-responses/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const response = await storage.updateCannedResponse(req.params.id, businessAccountId, req.body);
      res.json(response);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/canned-responses/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      await storage.deleteCannedResponse(req.params.id, businessAccountId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/canned-responses/:id/use", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      await storage.incrementCannedResponseUsage(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Ticket Insights
  app.post("/api/ticket-insights", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const insightData = {
        ...req.body,
        businessAccountId
      };

      const insight = await storage.createTicketInsight(insightData);
      res.json(insight);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/ticket-insights", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const { status, insightType } = req.query;
      const filters: any = {};
      
      if (status) filters.status = status as string;
      if (insightType) filters.insightType = insightType as string;

      const insights = await storage.getAllTicketInsights(businessAccountId, filters);
      res.json(insights);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ticket-insights/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const insight = await storage.getTicketInsight(req.params.id, businessAccountId);
      if (!insight) {
        return res.status(404).json({ error: "Insight not found" });
      }

      res.json(insight);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/ticket-insights/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const insight = await storage.updateTicketInsight(req.params.id, businessAccountId, req.body);
      res.json(insight);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ticket-insights/:id/review", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      const userId = req.user?.id;
      if (!businessAccountId || !userId) {
        return res.status(400).json({ error: "Business account or user not found" });
      }

      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      const insight = await storage.markInsightAsReviewed(req.params.id, businessAccountId, userId, status);
      res.json(insight);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/ticket-insights/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      await storage.deleteTicketInsight(req.params.id, businessAccountId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Appointment Calendar routes
  // Schedule Template routes
  app.post("/api/schedule-templates", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      
      const validatedData = insertScheduleTemplateSchema.parse({
        ...req.body,
        businessAccountId
      });
      const template = await storage.createScheduleTemplate(validatedData);
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/schedule-templates", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const templates = await storage.getScheduleTemplates(businessAccountId);
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/schedule-templates/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const template = await storage.updateScheduleTemplate(req.params.id, businessAccountId, req.body);
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/schedule-templates/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      await storage.deleteScheduleTemplate(req.params.id, businessAccountId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Slot Override routes
  app.post("/api/slot-overrides", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      
      console.log('[Slot Override] Request body:', req.body);
      
      const validatedData = insertSlotOverrideSchema.parse({
        ...req.body,
        slotDate: new Date(req.body.slotDate),
        durationMinutes: String(req.body.durationMinutes),
        businessAccountId
      });
      const override = await storage.createSlotOverride(validatedData);
      res.json(override);
    } catch (error: any) {
      console.error('[Slot Override] Validation error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/slot-overrides", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate query parameters required" });
      }
      
      const overrides = await storage.getSlotOverridesForRange(
        businessAccountId,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(overrides);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/slot-overrides/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      
      const { id } = req.params;
      const validatedData = insertSlotOverrideSchema.parse({
        ...req.body,
        slotDate: new Date(req.body.slotDate),
        durationMinutes: String(req.body.durationMinutes),
        businessAccountId
      });
      
      const updated = await storage.updateSlotOverride(id, businessAccountId, validatedData);
      
      if (!updated) {
        return res.status(404).json({ error: "Override not found" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("[API] Update slot override error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/slot-overrides/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      await storage.deleteSlotOverride(req.params.id, businessAccountId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Appointment routes
  app.post("/api/appointments", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      
      const validatedData = insertAppointmentSchema.parse({
        ...req.body,
        businessAccountId
      });
      const appointment = await storage.createAppointment(validatedData);
      res.json(appointment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/appointments", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      
      const { startDate, endDate, status } = req.query;
      
      if (status && typeof status === 'string') {
        const appointments = await storage.getAppointmentsByStatus(businessAccountId, status);
        return res.json(appointments);
      }
      
      if (startDate && endDate) {
        const appointments = await storage.getAppointmentsForRange(
          businessAccountId,
          new Date(startDate as string),
          new Date(endDate as string)
        );
        return res.json(appointments);
      }
      
      const appointments = await storage.getAllAppointments(businessAccountId);
      res.json(appointments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/appointments/:id/status", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      
      const { status, cancellationReason } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      
      const appointment = await storage.updateAppointmentStatus(
        req.params.id,
        businessAccountId,
        status,
        cancellationReason
      );
      res.json(appointment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Conversations routes
  app.get("/api/conversations", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      
      const { fromDate, toDate } = req.query;
      
      // Get conversations filtered by business account at database level
      const conversations = await storage.getAllConversations(businessAccountId);
      
      // Filter by date range if provided
      let filteredConversations = conversations;
      if (fromDate && typeof fromDate === 'string') {
        const from = new Date(fromDate);
        filteredConversations = filteredConversations.filter(conv => new Date(conv.createdAt) >= from);
      }
      if (toDate && typeof toDate === 'string') {
        const to = new Date(toDate);
        filteredConversations = filteredConversations.filter(conv => new Date(conv.createdAt) <= to);
      }
      
      // Get message counts efficiently for all conversations
      const conversationIds = filteredConversations.map(conv => conv.id);
      const messageCounts = await storage.getMessageCountsForConversations(conversationIds);
      
      const conversationsWithCounts = filteredConversations.map(conv => ({
        ...conv,
        messageCount: messageCounts[conv.id] || 0
      }));
      
      res.json(conversationsWithCounts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/conversations/:id/messages", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      
      const conversationId = req.params.id;
      
      // Get messages - getMessagesByConversation now verifies access internally
      const messages = await storage.getMessagesByConversation(conversationId, businessAccountId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Business Account / About routes
  app.get("/api/about", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const account = await storage.getBusinessAccount(businessAccountId);
      if (!account) {
        return res.status(404).json({ error: "Business account not found" });
      }

      res.json({ 
        name: account.name,
        description: account.description || "",
        website: account.website || ""
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/about", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const { description } = req.body;
      if (typeof description !== 'string') {
        return res.status(400).json({ error: "Description must be a string" });
      }

      const account = await storage.updateBusinessAccountDescription(businessAccountId, description);
      res.json({ 
        name: account.name,
        description: account.description || ""
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Website Analysis routes
  app.get("/api/website-analysis", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const analysis = await storage.getWebsiteAnalysis(businessAccountId);
      if (!analysis) {
        return res.json({ 
          status: 'not_started',
          websiteUrl: '',
          analyzedContent: null 
        });
      }

      res.json({
        status: analysis.status,
        websiteUrl: analysis.websiteUrl,
        analyzedContent: analysis.analyzedContent ? JSON.parse(analysis.analyzedContent) : null,
        errorMessage: analysis.errorMessage,
        lastAnalyzedAt: analysis.lastAnalyzedAt,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/website-analysis", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const { websiteUrl, additionalPages, analyzeOnlyAdditional } = req.body;
      if (!websiteUrl || typeof websiteUrl !== 'string') {
        return res.status(400).json({ error: "Website URL is required" });
      }

      // Validate additional pages if provided
      let pagesToAnalyze: string[] = [];
      
      if (analyzeOnlyAdditional) {
        // Only analyze additional pages - don't include main URL
        if (!additionalPages || !Array.isArray(additionalPages) || additionalPages.length === 0) {
          return res.status(400).json({ error: "No additional pages provided" });
        }
        pagesToAnalyze = additionalPages;
      } else {
        // Full analysis - include main URL
        pagesToAnalyze = [websiteUrl];
        if (additionalPages && Array.isArray(additionalPages)) {
          pagesToAnalyze.push(...additionalPages);
        }
      }

      // Validate that all pages are from the same domain
      try {
        const baseUrl = new URL(websiteUrl);
        for (const page of pagesToAnalyze) {
          const pageUrl = new URL(page);
          if (pageUrl.hostname !== baseUrl.hostname) {
            return res.status(400).json({ 
              error: "All pages must be from the same domain as the configured website" 
            });
          }
        }
      } catch (error) {
        return res.status(400).json({ error: "Invalid URL format" });
      }

      // Get business account to retrieve OpenAI API key
      const businessAccount = await storage.getBusinessAccount(businessAccountId);
      if (!businessAccount?.openaiApiKey) {
        return res.status(400).json({ error: "OpenAI API key not configured. Please contact SuperAdmin to set it up." });
      }

      // Decrypt the OpenAI API key before using it
      const { decrypt } = await import("./services/encryptionService");
      const decryptedApiKey = decrypt(businessAccount.openaiApiKey);

      // Import the service here to avoid circular dependencies
      const { websiteAnalysisService } = await import("./websiteAnalysisService");

      // Save initial record
      await storage.upsertWebsiteAnalysis(businessAccountId, {
        websiteUrl,
        status: 'pending',
      });

      // Start analysis asynchronously (don't wait for it)
      // Determine which analysis method to use:
      // - If no additional pages specified, do full multi-page crawling (analyzeWebsite)
      // - If specific pages provided, analyze only those pages (analyzeWebsitePages)
      if (!additionalPages || additionalPages.length === 0) {
        // Full website analysis with automatic multi-page crawling
        websiteAnalysisService.analyzeWebsite(websiteUrl, businessAccountId, decryptedApiKey)
          .catch(error => {
            console.error('[Website Analysis] Error:', error);
          });
      } else {
        // Analyze specific pages only (manual page selection)
        const shouldAppend = analyzeOnlyAdditional || additionalPages?.length > 0;
        websiteAnalysisService.analyzeWebsitePages(pagesToAnalyze, businessAccountId, decryptedApiKey, shouldAppend)
          .catch(error => {
            console.error('[Website Analysis] Error:', error);
          });
      }

      const message = analyzeOnlyAdditional
        ? `Analyzing ${pagesToAnalyze.length} additional ${pagesToAnalyze.length === 1 ? 'page' : 'pages'}. Data will be merged with existing analysis...`
        : pagesToAnalyze.length > 1 
          ? `Website analysis started for ${pagesToAnalyze.length} pages. This may take a few minutes...`
          : 'Website analysis started. This may take a minute...';

      res.json({ 
        status: 'pending',
        message 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update website analysis content (edit extracted data)
  app.patch("/api/website-analysis", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const { analyzedContent } = req.body;
      if (!analyzedContent) {
        return res.status(400).json({ error: "Analyzed content is required" });
      }

      // Validate the content structure using Zod schema
      const validationResult = updateWebsiteAnalysisSchema.safeParse(analyzedContent);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid content format",
          details: validationResult.error.errors 
        });
      }

      // Get existing analysis
      const existingAnalysis = await storage.getWebsiteAnalysis(businessAccountId);
      if (!existingAnalysis) {
        return res.status(404).json({ error: "No website analysis found to update" });
      }

      // Update only the analyzed content (validated), preserving websiteUrl and status
      await storage.upsertWebsiteAnalysis(businessAccountId, {
        websiteUrl: existingAnalysis.websiteUrl,
        status: 'completed',
        analyzedContent: JSON.stringify(validationResult.data),
      });

      res.json({ 
        success: true,
        message: "Website analysis content updated successfully" 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete/reset website analysis (start fresh)
  app.delete("/api/website-analysis", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      // Delete the website analysis record
      await storage.deleteWebsiteAnalysis(businessAccountId);

      // Also delete all analyzed pages history
      await storage.deleteAnalyzedPages(businessAccountId);

      res.json({ 
        success: true,
        message: "Website analysis reset successfully" 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Analyzed Pages routes
  app.get("/api/analyzed-pages", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const pages = await storage.getAnalyzedPages(businessAccountId);
      res.json(pages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/analyzed-pages/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const { id } = req.params;
      await storage.deleteAnalyzedPage(id, businessAccountId);
      
      // Invalidate business context cache so Chroney doesn't use deleted page
      businessContextCache.invalidate(`business_context_${businessAccountId}`);
      
      res.json({ success: true, message: "Analyzed page deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Widget Settings routes
  // Public endpoint for widget settings (used by embed iframe)
  app.get("/api/widget-settings/public", async (req, res) => {
    try {
      const businessAccountId = req.query.businessAccountId as string;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account ID required" });
      }

      let settings = await storage.getWidgetSettings(businessAccountId);
      
      // If no settings exist, create default ones
      if (!settings) {
        settings = await storage.upsertWidgetSettings(businessAccountId, {});
      }

      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/widget-settings", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      let settings = await storage.getWidgetSettings(businessAccountId);
      
      // If no settings exist, create default ones
      if (!settings) {
        settings = await storage.upsertWidgetSettings(businessAccountId, {});
      }

      // Redact sensitive Twilio credentials from response
      const safeSettings = {
        ...settings,
        twilioAccountSid: settings.twilioAccountSid 
          ? `AC...${settings.twilioAccountSid.slice(-4)}`
          : null,
        twilioAuthToken: settings.twilioAuthToken 
          ? '••••••••'
          : null
      };

      res.json(safeSettings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/widget-settings", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const { 
        chatColor, chatColorEnd, widgetHeaderText, welcomeMessageType, welcomeMessage, 
        buttonStyle, buttonAnimation, personality, currency, customInstructions,
        appointmentBookingEnabled,
        enableCartRecovery, recoveryTriggerMinutes, recoveryDiscountType, recoveryDiscountValue,
        recoveryEmailEnabled, recoveryWhatsappEnabled, twilioAccountSid, twilioAuthToken, twilioWhatsappFrom,
        widgetWidth, widgetHeight, widgetPosition, bubbleSize, sizePreset, autoOpenChat
      } = req.body;
      
      const updateData: Partial<{ 
        chatColor: string; chatColorEnd: string; widgetHeaderText: string; 
        welcomeMessageType: string; welcomeMessage: string; buttonStyle: string; 
        buttonAnimation: string; personality: string; currency: string; 
        customInstructions: string; cachedIntro: string | null;
        appointmentBookingEnabled: string;
        enableCartRecovery: string; recoveryTriggerMinutes: string; 
        recoveryDiscountType: string; recoveryDiscountValue: string;
        recoveryEmailEnabled: string; recoveryWhatsappEnabled: string;
        twilioAccountSid: string; twilioAuthToken: string; twilioWhatsappFrom: string;
        widgetWidth: string; widgetHeight: string; widgetPosition: string;
        bubbleSize: string; sizePreset: string; autoOpenChat: string;
      }> = {};
      
      if (chatColor !== undefined) updateData.chatColor = chatColor;
      if (chatColorEnd !== undefined) updateData.chatColorEnd = chatColorEnd;
      if (widgetHeaderText !== undefined) updateData.widgetHeaderText = widgetHeaderText;
      if (welcomeMessageType !== undefined) updateData.welcomeMessageType = welcomeMessageType;
      if (welcomeMessage !== undefined) updateData.welcomeMessage = welcomeMessage;
      if (buttonStyle !== undefined) updateData.buttonStyle = buttonStyle;
      if (buttonAnimation !== undefined) updateData.buttonAnimation = buttonAnimation;
      if (personality !== undefined) updateData.personality = personality;
      if (currency !== undefined) updateData.currency = currency;
      if (customInstructions !== undefined) updateData.customInstructions = customInstructions;
      
      // Widget size and position settings
      if (widgetWidth !== undefined) updateData.widgetWidth = widgetWidth;
      if (widgetHeight !== undefined) updateData.widgetHeight = widgetHeight;
      if (widgetPosition !== undefined) updateData.widgetPosition = widgetPosition;
      if (bubbleSize !== undefined) updateData.bubbleSize = bubbleSize;
      if (sizePreset !== undefined) updateData.sizePreset = sizePreset;
      
      // Widget behavior settings
      if (autoOpenChat !== undefined) updateData.autoOpenChat = autoOpenChat;
      
      // Appointment booking toggle
      if (appointmentBookingEnabled !== undefined) updateData.appointmentBookingEnabled = appointmentBookingEnabled;
      
      // Cart recovery settings
      if (enableCartRecovery !== undefined) updateData.enableCartRecovery = enableCartRecovery;
      if (recoveryTriggerMinutes !== undefined) updateData.recoveryTriggerMinutes = recoveryTriggerMinutes;
      if (recoveryDiscountType !== undefined) updateData.recoveryDiscountType = recoveryDiscountType;
      if (recoveryDiscountValue !== undefined) updateData.recoveryDiscountValue = recoveryDiscountValue;
      if (recoveryEmailEnabled !== undefined) updateData.recoveryEmailEnabled = recoveryEmailEnabled;
      if (recoveryWhatsappEnabled !== undefined) updateData.recoveryWhatsappEnabled = recoveryWhatsappEnabled;
      
      // Twilio credentials (write-only, only save if provided)
      if (twilioAccountSid !== undefined && twilioAccountSid !== '••••••••' && twilioAccountSid !== '') {
        updateData.twilioAccountSid = twilioAccountSid;
      }
      if (twilioAuthToken !== undefined && twilioAuthToken !== '••••••••' && twilioAuthToken !== '') {
        updateData.twilioAuthToken = twilioAuthToken;
      }
      if (twilioWhatsappFrom !== undefined) updateData.twilioWhatsappFrom = twilioWhatsappFrom;

      // Invalidate cached intro when personality, welcomeMessageType, or customInstructions changes
      // This ensures the intro is regenerated with the new settings
      if (personality !== undefined || welcomeMessageType !== undefined || customInstructions !== undefined) {
        updateData.cachedIntro = null;
        
        // IMPORTANT: Also clear the business context cache so changes take effect immediately
        const { businessContextCache } = await import('./services/businessContextCache');
        const cacheKey = `business_context_${businessAccountId}`;
        businessContextCache.invalidate(cacheKey);
        console.log('[Cache] Cleared business context cache due to settings change');
      }

      const settings = await storage.upsertWidgetSettings(businessAccountId, updateData);
      
      // Redact sensitive Twilio credentials from response
      const safeSettings = {
        ...settings,
        twilioAccountSid: settings.twilioAccountSid 
          ? `AC...${settings.twilioAccountSid.slice(-4)}`
          : null,
        twilioAuthToken: settings.twilioAuthToken 
          ? '••••••••'
          : null
      };
      
      res.json(safeSettings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // OpenAI API Key settings routes
  app.get("/api/settings/openai-key", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const apiKey = await storage.getBusinessAccountOpenAIKey(businessAccountId);
      
      // Mask the API key for security - only show last 4 characters
      const maskedKey = apiKey 
        ? `sk-...${apiKey.slice(-4)}`
        : null;

      res.json({ 
        hasKey: !!apiKey,
        maskedKey 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/settings/openai-key", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const { apiKey } = req.body;
      
      // Validate API key format
      if (apiKey && typeof apiKey === 'string') {
        if (!apiKey.startsWith('sk-')) {
          return res.status(400).json({ error: "Invalid OpenAI API key format. Key should start with 'sk-'" });
        }
        if (apiKey.length < 20) {
          return res.status(400).json({ error: "Invalid OpenAI API key format. Key is too short." });
        }
      }

      // Save the API key (or null to remove it)
      const saveKey = apiKey && apiKey.trim() ? apiKey.trim() : null;
      await storage.updateBusinessAccountOpenAIKey(businessAccountId, saveKey as any);

      // Return masked version
      const maskedKey = saveKey 
        ? `sk-...${saveKey.slice(-4)}`
        : null;

      res.json({ 
        success: true,
        hasKey: !!saveKey,
        maskedKey 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Shopify Integration settings routes
  app.get("/api/settings/shopify", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const credentials = await storage.getShopifyCredentials(businessAccountId);
      
      // Mask the access token for security
      const maskedToken = credentials.accessToken 
        ? `${credentials.accessToken.slice(0, 8)}...${credentials.accessToken.slice(-4)}`
        : null;

      res.json({ 
        storeUrl: credentials.storeUrl,
        hasToken: !!credentials.accessToken,
        maskedToken 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/settings/shopify", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const { storeUrl, accessToken } = req.body;
      
      // Validate store URL format
      if (storeUrl && typeof storeUrl === 'string') {
        const trimmedUrl = storeUrl.trim().toLowerCase();
        if (!trimmedUrl.endsWith('.myshopify.com')) {
          return res.status(400).json({ 
            error: "Invalid Shopify store URL. It should end with '.myshopify.com'" 
          });
        }
      }

      // Save credentials (or null to remove them)
      const saveUrl = storeUrl && storeUrl.trim() ? storeUrl.trim() : null;
      const saveToken = accessToken && accessToken.trim() ? accessToken.trim() : null;
      
      await storage.updateShopifyCredentials(businessAccountId, saveUrl, saveToken);

      // Return masked version
      const maskedToken = saveToken 
        ? `${saveToken.slice(0, 8)}...${saveToken.slice(-4)}`
        : null;

      res.json({ 
        success: true,
        storeUrl: saveUrl,
        hasToken: !!saveToken,
        maskedToken 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Shopify product import endpoint
  app.post("/api/shopify/import", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      // Get Shopify credentials
      const credentials = await storage.getShopifyCredentials(businessAccountId);
      if (!credentials.storeUrl || !credentials.accessToken) {
        return res.status(400).json({ 
          error: "Shopify credentials not configured. Please add your store URL and access token in Settings first." 
        });
      }

      // Initialize Shopify service
      const { ShopifyService } = await import('./services/shopifyService');
      const shopifyService = new ShopifyService(credentials.storeUrl, credentials.accessToken);

      // Test connection first
      const isConnected = await shopifyService.testConnection();
      if (!isConnected) {
        return res.status(400).json({ 
          error: "Failed to connect to Shopify. Please verify:\n• Your store URL is correct (e.g., yourstore.myshopify.com)\n• Your access token starts with 'shpat_' and is valid\n• Your custom app has 'read_products' permission enabled\n• The app is installed in your Shopify store" 
        });
      }

      // Fetch products from Shopify
      const shopifyProducts = await shopifyService.fetchProducts(250);

      // Import products to database
      const importedCount = 0;
      const updatedCount = 0;
      const skippedCount = 0;

      for (const shopifyProduct of shopifyProducts) {
        try {
          // Check if product already exists by Shopify ID
          const existingProducts = await storage.getAllProducts(businessAccountId);
          const existing = existingProducts.find(p => p.shopifyProductId === shopifyProduct.shopifyId);

          if (existing) {
            // Update existing Shopify product
            await storage.updateProduct(existing.id, businessAccountId, {
              name: shopifyProduct.name,
              description: shopifyProduct.description,
              price: shopifyProduct.price || undefined,
              imageUrl: shopifyProduct.imageUrl || undefined,
              shopifyLastSyncedAt: new Date(),
            });
          } else {
            // Create new product
            await storage.createProduct({
              businessAccountId,
              name: shopifyProduct.name,
              description: shopifyProduct.description,
              price: shopifyProduct.price || undefined,
              imageUrl: shopifyProduct.imageUrl || undefined,
              source: 'shopify',
              shopifyProductId: shopifyProduct.shopifyId,
              shopifyLastSyncedAt: new Date(),
              isEditable: 'false',
            });
          }
        } catch (productError) {
          console.error('[Shopify Import] Failed to import product:', productError);
        }
      }

      res.json({ 
        success: true,
        message: `Successfully imported ${shopifyProducts.length} products from Shopify`,
        imported: shopifyProducts.length
      });
    } catch (error: any) {
      console.error('[Shopify Import] Error:', error);
      res.status(500).json({ error: error.message || 'Failed to import products from Shopify' });
    }
  });

  // Rate limiter for manual sync - max 1 sync per 5 minutes per account
  const syncRateLimiter = new Map<string, number>();
  const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

  // Manual Shopify sync now endpoint
  app.post("/api/shopify/sync-now", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      // Rate limit check
      const lastSync = syncRateLimiter.get(businessAccountId);
      const now = Date.now();
      if (lastSync && (now - lastSync) < SYNC_COOLDOWN_MS) {
        const remainingTime = Math.ceil((SYNC_COOLDOWN_MS - (now - lastSync)) / 1000 / 60);
        return res.status(429).json({ 
          success: false,
          error: `Please wait ${remainingTime} minute(s) before syncing again to avoid rate limits.` 
        });
      }

      // Set rate limit timestamp
      syncRateLimiter.set(businessAccountId, now);

      const { shopifySyncScheduler } = await import('./services/shopifySyncScheduler');
      const result = await shopifySyncScheduler.syncNow(businessAccountId);

      // Clear rate limit if sync failed (allow retry)
      if (!result.success) {
        syncRateLimiter.delete(businessAccountId);
      }

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      console.error('[Shopify Sync Now] Error:', error);
      // Clear rate limit on error to allow retry
      syncRateLimiter.delete(req.user?.businessAccountId || '');
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to sync products from Shopify' 
      });
    }
  });

  // Get Shopify auto-sync settings
  app.get("/api/shopify/auto-sync", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const settings = await storage.getShopifyAutoSyncSettings(businessAccountId);
      res.json(settings);
    } catch (error: any) {
      console.error('[Shopify Auto-Sync Settings] Error:', error);
      res.status(500).json({ error: error.message || 'Failed to get auto-sync settings' });
    }
  });

  // Update Shopify auto-sync settings
  app.put("/api/shopify/auto-sync", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const { enabled, frequency } = req.body;

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: "Invalid enabled value" });
      }

      const validFrequencies = [6, 12, 24, 48];
      if (!validFrequencies.includes(frequency)) {
        return res.status(400).json({ error: "Invalid frequency. Must be 6, 12, 24, or 48 hours" });
      }

      await storage.updateShopifyAutoSync(businessAccountId, enabled, frequency);

      const updated = await storage.getShopifyAutoSyncSettings(businessAccountId);
      res.json({ success: true, settings: updated });
    } catch (error: any) {
      console.error('[Shopify Auto-Sync Update] Error:', error);
      res.status(500).json({ error: error.message || 'Failed to update auto-sync settings' });
    }
  });

  // Excel product import endpoint
  app.post("/api/products/import-excel", requireAuth, requireBusinessAccount, excelUpload.single('file'), async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Import xlsx library
      const XLSX = await import('xlsx');
      
      // Parse the Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(worksheet) as any[];
      
      if (data.length === 0) {
        return res.status(400).json({ error: "Excel file is empty or invalid format" });
      }

      let importedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      for (const row of data) {
        try {
          // Validate required fields (case-insensitive column names)
          const rowData: any = {};
          for (const key in row as any) {
            rowData[key.toLowerCase().trim()] = (row as any)[key];
          }

          const name = rowData['name'] || rowData['product name'] || rowData['title'];
          const description = rowData['description'] || rowData['desc'] || '';
          const price = rowData['price'] || rowData['cost'] || null;
          const imageUrl = rowData['image'] || rowData['image url'] || rowData['imageurl'] || null;
          const categoriesStr = rowData['categories'] || rowData['category'] || '';
          const tagsStr = rowData['tags'] || rowData['tag'] || '';

          if (!name) {
            skippedCount++;
            errors.push(`Row skipped: Missing product name`);
            continue;
          }

          // Create product
          const product = await storage.createProduct({
            businessAccountId,
            name: String(name).trim(),
            description: String(description).trim(),
            price: price ? String(price) : undefined,
            imageUrl: imageUrl ? String(imageUrl).trim() : undefined,
            source: 'manual',
            isEditable: 'true',
          });

          // Handle categories (comma-separated)
          if (categoriesStr && String(categoriesStr).trim()) {
            const categoryNames = String(categoriesStr)
              .split(',')
              .map(c => c.trim())
              .filter(c => c.length > 0);

            for (const categoryName of categoryNames) {
              try {
                // Check if category exists
                const allCategories = await storage.getAllCategories(businessAccountId);
                let category = allCategories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());

                // Create category if it doesn't exist
                if (!category) {
                  category = await storage.createCategory({
                    businessAccountId,
                    name: categoryName,
                  });
                }

                // Associate product with category
                await storage.assignProductToCategory(product.id, category.id);
              } catch (catError) {
                console.error('[Excel Import] Failed to add category:', catError);
              }
            }
          }

          // Handle tags (comma-separated)
          if (tagsStr && String(tagsStr).trim()) {
            const tagNames = String(tagsStr)
              .split(',')
              .map(t => t.trim())
              .filter(t => t.length > 0);

            for (const tagName of tagNames) {
              try {
                // Check if tag exists
                const allTags = await storage.getAllTags(businessAccountId);
                let tag = allTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());

                // Create tag if it doesn't exist
                if (!tag) {
                  tag = await storage.createTag({
                    businessAccountId,
                    name: tagName,
                  });
                }

                // Associate product with tag
                await storage.assignProductToTag(product.id, tag.id);
              } catch (tagError) {
                console.error('[Excel Import] Failed to add tag:', tagError);
              }
            }
          }

          importedCount++;
        } catch (productError: any) {
          skippedCount++;
          errors.push(`Failed to import row: ${productError.message}`);
          console.error('[Excel Import] Failed to import row:', productError);
        }
      }

      res.json({ 
        success: true,
        message: `Successfully imported ${importedCount} products from Excel${skippedCount > 0 ? `, ${skippedCount} rows skipped` : ''}`,
        imported: importedCount,
        skipped: skippedCount,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined // Return first 10 errors
      });
    } catch (error: any) {
      console.error('[Excel Import] Error:', error);
      res.status(500).json({ error: error.message || 'Failed to import Excel file' });
    }
  });

  // Password change endpoint
  app.post("/api/settings/change-password", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { currentPassword, newPassword } = req.body;

      // Validate inputs
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters long" });
      }

      // Get user from database
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify current password
      const isValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await storage.updateUserPassword(userId, newPasswordHash);

      // Clear temporary password flags if present
      await storage.clearTempPassword(userId);

      res.json({ success: true, message: "Password changed successfully" });
    } catch (error: any) {
      // Don't leak internal error details
      res.status(500).json({ error: "An error occurred while changing your password. Please try again." });
    }
  });

  // SuperAdmin: Get business analytics/insights
  app.get("/api/super-admin/insights", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const businessAccountId = req.query.businessAccountId as string | undefined;
      const insights = await storage.getBusinessAnalytics(businessAccountId);
      res.json(insights);
    } catch (error: any) {
      console.error('[SuperAdmin Insights] Error:', error);
      res.status(500).json({ error: "Failed to fetch business insights" });
    }
  });

  // Database backup endpoint - Super Admin only
  app.get("/api/database/backup", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const timestamp = Date.now();
      const filename = `database_backup_${timestamp}.sql`;
      const backupPath = path.join(__dirname, '..', 'tmp', filename);

      // Create tmp directory if it doesn't exist
      const tmpDir = path.join(__dirname, '..', 'tmp');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      // Get database URL from environment
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        return res.status(500).json({ error: "Database URL not configured" });
      }

      // Run pg_dump to create backup
      await execAsync(`pg_dump "${databaseUrl}" > "${backupPath}"`);

      // Check if file was created
      if (!fs.existsSync(backupPath)) {
        return res.status(500).json({ error: "Failed to create backup file" });
      }

      // Set headers for file download
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Stream the file
      const fileStream = fs.createReadStream(backupPath);
      fileStream.pipe(res);

      // Clean up file after sending
      fileStream.on('end', () => {
        fs.unlink(backupPath, (err) => {
          if (err) console.error('Failed to delete backup file:', err);
        });
      });

    } catch (error: any) {
      console.error('[Database Backup] Error:', error);
      res.status(500).json({ error: "Failed to create database backup" });
    }
  });

  // AI Conversation Analysis endpoint
  app.get("/api/insights/conversation-analysis", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }

      const { fromDate, toDate } = req.query;

      // Get OpenAI API key for the business
      const encryptedOpenaiApiKey = await storage.getBusinessAccountOpenAIKey(businessAccountId);
      if (!encryptedOpenaiApiKey) {
        return res.status(400).json({ 
          error: "OpenAI API key not configured. Please contact SuperAdmin to set it up." 
        });
      }

      // Decrypt the OpenAI API key before using it
      const { decrypt } = await import("./services/encryptionService");
      const openaiApiKey = decrypt(encryptedOpenaiApiKey);

      // Fetch conversations with their messages
      const conversations = await storage.getConversationsByBusinessAccount(
        businessAccountId,
        fromDate as string,
        toDate as string
      );

      if (conversations.length === 0) {
        return res.json({
          topicsOfInterest: [],
          sentiment: {
            positive: 0,
            neutral: 100,
            negative: 0,
            overall: "neutral"
          },
          commonPatterns: [],
          engagementInsights: {
            avgMessagesPerConversation: 0,
            totalConversations: 0,
            mostActiveTopics: []
          }
        });
      }

      // Get messages for all conversations
      const conversationIds = conversations.map(c => c.id);
      const messages = await storage.getMessagesByConversationIds(conversationIds);

      // Prepare conversation data for AI analysis
      const conversationSummaries = conversations.slice(0, 50).map(conv => {
        const convMessages = messages.filter(m => m.conversationId === conv.id);
        return {
          title: conv.title,
          messageCount: convMessages.length,
          messages: convMessages.slice(0, 20).map(m => ({
            role: m.role,
            content: m.content.substring(0, 500) // Limit message length for token efficiency
          }))
        };
      });

      // Use OpenAI to analyze conversations
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: openaiApiKey });

      const prompt = `Analyze these customer conversations and provide insights:

${JSON.stringify(conversationSummaries, null, 2)}

Provide a comprehensive analysis with:
1. Top 5 topics users are most interested in
2. Overall sentiment breakdown (positive, neutral, negative percentages)
3. Common patterns or frequently asked questions
4. Engagement insights (what users care about most)

Format your response as JSON with this structure:
{
  "topicsOfInterest": ["topic 1", "topic 2", "topic 3", "topic 4", "topic 5"],
  "sentiment": {
    "positive": <percentage>,
    "neutral": <percentage>,
    "negative": <percentage>,
    "overall": "positive|neutral|negative"
  },
  "commonPatterns": ["pattern 1", "pattern 2", "pattern 3"],
  "engagementInsights": {
    "avgMessagesPerConversation": <number>,
    "totalConversations": ${conversations.length},
    "mostActiveTopics": ["topic 1", "topic 2", "topic 3"]
  },
  "summary": "Brief 2-3 sentence summary of overall conversation insights"
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert data analyst specializing in customer conversation analysis. Provide insights in valid JSON format only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      });

      const analysisText = completion.choices[0].message.content || '{}';
      const analysis = JSON.parse(analysisText);

      res.json(analysis);
    } catch (error: any) {
      console.error("Conversation analysis error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze conversations" });
    }
  });

  const httpServer = createServer(app);

  const wss = new WebSocketServer({ noServer: true });

  // Helper function to extract session cookie from cookie header
  function extractSessionCookie(cookieHeader?: string): string | null {
    if (!cookieHeader) return null;
    
    const cookies = cookieHeader.split(';').map(c => c.trim());
    for (const cookie of cookies) {
      const [name, value] = cookie.split('=');
      if (name === 'session') {
        return value;
      }
    }
    return null;
  }

  httpServer.on('upgrade', async (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    
    if (url.pathname === '/ws/voice') {
      try {
        const businessAccountId = url.searchParams.get('businessAccountId');
        const userId = url.searchParams.get('userId');

        if (!businessAccountId || !userId) {
          socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
          socket.destroy();
          return;
        }

        // SECURITY: Extract and validate session cookie
        const sessionToken = extractSessionCookie(request.headers.cookie);
        
        if (!sessionToken) {
          console.warn('[WebSocket] No session cookie provided for voice connection');
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        // SECURITY: Validate the session and get user
        const user = await validateSession(sessionToken);
        
        if (!user) {
          console.warn('[WebSocket] Invalid or expired session for voice connection');
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        // SECURITY: Verify user has access to the requested business account
        // Super admins can access any business account
        // Regular users can only access their own business account
        if (user.role !== 'super_admin' && user.businessAccountId !== businessAccountId) {
          console.warn('[WebSocket] User does not have access to business account:', {
            userId: user.id,
            userBusinessAccountId: user.businessAccountId,
            requestedBusinessAccountId: businessAccountId
          });
          socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
          socket.destroy();
          return;
        }

        // SECURITY: Verify the userId matches the authenticated user
        // (or allow super_admin to impersonate for testing)
        if (user.role !== 'super_admin' && user.id !== userId) {
          console.warn('[WebSocket] User ID mismatch:', {
            authenticatedUserId: user.id,
            requestedUserId: userId
          });
          socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
          socket.destroy();
          return;
        }

        console.log('[WebSocket] Voice connection authenticated:', {
          userId: user.id,
          businessAccountId,
          role: user.role
        });

        wss.handleUpgrade(request, socket, head, (ws) => {
          console.log('[WebSocket] Voice connection established');
          realtimeVoiceService.handleConnection(ws, businessAccountId, userId);
        });
      } catch (error: any) {
        console.error('[WebSocket] Upgrade error:', error);
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
      }
    } else {
      socket.destroy();
    }
  });

  return httpServer;
}
