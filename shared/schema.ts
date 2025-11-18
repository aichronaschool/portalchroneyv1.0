import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, uuid, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Business Accounts table
export const businessAccounts = pgTable("business_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  website: text("website").notNull(), // Mandatory website URL for the business
  description: text("description").default(""),
  openaiApiKey: text("openai_api_key"), // Business-specific OpenAI API key (encrypted)
  status: text("status").notNull().default("active"), // 'active' | 'suspended'
  shopifyAutoSyncEnabled: text("shopify_auto_sync_enabled").notNull().default("false"), // 'true' | 'false'
  shopifySyncFrequency: numeric("shopify_sync_frequency", { precision: 5, scale: 0 }).default("24"), // Sync frequency in hours (6, 12, 24, 48)
  shopifyLastSyncedAt: timestamp("shopify_last_synced_at"), // When products were last synced from Shopify
  shopifySyncStatus: text("shopify_sync_status").default("idle"), // 'idle' | 'syncing' | 'completed' | 'failed'
  shopifyEnabled: text("shopify_enabled").notNull().default("false"), // 'true' | 'false' - SuperAdmin toggle for Shopify features (text for consistency with other flags)
  appointmentsEnabled: text("appointments_enabled").notNull().default("false"), // 'true' | 'false' - SuperAdmin toggle for Appointment features (text for consistency with other flags)
  voiceModeEnabled: text("voice_mode_enabled").notNull().default("true"), // 'true' | 'false' - SuperAdmin toggle for Voice Mode feature (text for consistency with other flags)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Users table with roles and business account association
// One user per business account (1:1 relationship)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  tempPassword: text("temp_password"), // Temporary password for viewing/copying
  tempPasswordExpiry: timestamp("temp_password_expiry"), // When temp password expires
  mustChangePassword: text("must_change_password").notNull().default("false"), // 'true' | 'false' - Force password change on next login
  role: text("role").notNull(), // 'super_admin' | 'business_user'
  businessAccountId: varchar("business_account_id").unique().references(() => businessAccounts.id, { onDelete: "cascade" }), // Unique constraint enforces 1:1 relationship (nulls allowed for superadmins)
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Sessions table for authentication
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionToken: text("session_token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessAccountId: varchar("business_account_id").references(() => businessAccounts.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New Chat"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }),
  imageUrl: text("image_url"),
  source: text("source").notNull().default("manual"), // 'manual' | 'shopify'
  shopifyProductId: text("shopify_product_id"), // Original Shopify product ID
  shopifyLastSyncedAt: timestamp("shopify_last_synced_at"), // When last synced from Shopify
  isEditable: text("is_editable").notNull().default("true"), // 'true' | 'false' - Whether user can edit this product
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const faqs = pgTable("faqs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
  name: text("name"), // Optional - customer may not provide name
  email: text("email"), // Optional - customer may provide only phone
  phone: text("phone"), // Optional - customer may provide only email
  message: text("message"),
  conversationId: varchar("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const widgetSettings = pgTable("widget_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessAccountId: varchar("business_account_id").notNull().unique().references(() => businessAccounts.id, { onDelete: "cascade" }),
  chatColor: text("chat_color").notNull().default("#9333ea"), // Start color for gradient
  chatColorEnd: text("chat_color_end").notNull().default("#3b82f6"), // End color for gradient
  widgetHeaderText: text("widget_header_text").notNull().default("Hi Chroney"), // Customizable header text
  welcomeMessageType: text("welcome_message_type").notNull().default("custom"), // 'custom' | 'ai_generated'
  welcomeMessage: text("welcome_message").notNull().default("Hi! How can I help you today?"),
  buttonStyle: text("button_style").notNull().default("circular"), // 'circular' | 'rounded' | 'pill' | 'minimal'
  buttonAnimation: text("button_animation").notNull().default("pulse"), // 'pulse' | 'bounce' | 'glow' | 'none'
  personality: text("personality").notNull().default("friendly"), // 'friendly' | 'professional' | 'funny' | 'polite' | 'casual'
  currency: text("currency").notNull().default("USD"),
  customInstructions: text("custom_instructions"), // Natural language instructions for customizing Chroney's behavior
  cachedIntro: text("cached_intro"), // Cached AI-generated intro message to avoid regenerating on every page load
  appointmentBookingEnabled: text("appointment_booking_enabled").notNull().default("true"), // 'true' | 'false' - Master toggle for appointment booking feature
  shopifyStoreUrl: text("shopify_store_url"), // e.g., "mystore.myshopify.com"
  shopifyAccessToken: text("shopify_access_token"), // Private app access token (encrypted)
  twilioAccountSid: text("twilio_account_sid"), // Twilio Account SID for WhatsApp
  twilioAuthToken: text("twilio_auth_token"), // Twilio Auth Token for WhatsApp
  twilioWhatsappFrom: text("twilio_whatsapp_from"), // Twilio WhatsApp number (e.g., whatsapp:+14155238886)
  
  // Widget size customization
  widgetWidth: numeric("widget_width", { precision: 5, scale: 0 }).notNull().default("400"), // Widget width in pixels
  widgetHeight: numeric("widget_height", { precision: 5, scale: 0 }).notNull().default("600"), // Widget height in pixels
  widgetPosition: text("widget_position").notNull().default("bottom-right"), // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  bubbleSize: numeric("bubble_size", { precision: 3, scale: 0 }).notNull().default("60"), // Chat bubble button size in pixels
  sizePreset: text("size_preset").notNull().default("medium"), // 'small' | 'medium' | 'large' | 'custom'
  
  // Widget behavior
  autoOpenChat: text("auto_open_chat").notNull().default("false"), // 'true' | 'false' - Auto-open chat on page load
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const websiteAnalysis = pgTable("website_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessAccountId: varchar("business_account_id").notNull().unique().references(() => businessAccounts.id, { onDelete: "cascade" }),
  websiteUrl: text("website_url").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'analyzing' | 'completed' | 'failed'
  analyzedContent: text("analyzed_content"), // Structured JSON with extracted business information
  errorMessage: text("error_message"), // Store error if analysis fails
  lastAnalyzedAt: timestamp("last_analyzed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const analyzedPages = pgTable("analyzed_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
  pageUrl: text("page_url").notNull(),
  extractedContent: text("extracted_content"),
  analyzedAt: timestamp("analyzed_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Training Documents - PDF uploads for AI knowledge base
export const trainingDocuments = pgTable("training_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  fileSize: numeric("file_size", { precision: 10, scale: 0 }).notNull(), // File size in bytes
  storageKey: text("storage_key").notNull(), // Path to stored file
  uploadStatus: text("upload_status").notNull().default("pending"), // 'pending' | 'processing' | 'completed' | 'failed'
  extractedText: text("extracted_text"), // Full text extracted from PDF
  summary: text("summary"), // AI-generated summary
  keyPoints: text("key_points"), // AI-generated key points as JSON array
  errorMessage: text("error_message"), // Error details if processing fails
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Product Categories - Hierarchical categories for organizing products
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  parentCategoryId: varchar("parent_category_id").references((): any => categories.id, { onDelete: "cascade" }), // Self-referencing for hierarchy
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Product Tags - Flexible labels for products
export const tags = pgTable("tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").default("#3b82f6"), // Optional color for visual organization
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Junction table: Products <-> Categories (many-to-many)
export const productCategories = pgTable("product_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Junction table: Products <-> Tags (many-to-many)
export const productTags = pgTable("product_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  tagId: varchar("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Product Relationships - Cross-sell, similar products, bundles, complements
export const productRelationships = pgTable("product_relationships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
  sourceProductId: varchar("source_product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  targetProductId: varchar("target_product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  relationshipType: text("relationship_type").notNull(), // 'cross_sell' | 'similar' | 'complement' | 'bundle'
  weight: numeric("weight", { precision: 3, scale: 2 }).default("1.00"), // Priority/strength of relationship (0-1)
  notes: text("notes"), // Optional notes about the relationship
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Appointment System Tables

// Weekly schedule template - recurring availability hours
export const scheduleTemplates = pgTable("schedule_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
  dayOfWeek: numeric("day_of_week", { precision: 1, scale: 0 }).notNull(), // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime: text("start_time").notNull(), // "09:00" (24-hour format)
  endTime: text("end_time").notNull(), // "17:00" (24-hour format)
  slotDurationMinutes: numeric("slot_duration_minutes", { precision: 3, scale: 0 }).notNull().default("30"), // Default 30-minute slots
  isActive: text("is_active").notNull().default("true"), // 'true' | 'false'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Slot overrides - add or block specific time slots
export const slotOverrides = pgTable("slot_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
  slotDate: timestamp("slot_date").notNull(), // Specific date for this override
  slotTime: text("slot_time").notNull(), // "14:00" (24-hour format)
  durationMinutes: numeric("duration_minutes", { precision: 3, scale: 0 }).notNull().default("30"),
  isAvailable: text("is_available").notNull().default("true"), // 'true' = add slot, 'false' = block slot
  isAllDay: text("is_all_day").notNull().default("false"), // 'true' = block entire day, 'false' = specific time slot
  reason: text("reason"), // "Lunch break", "Extended hours", "Staff meeting", "Holiday", etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Appointments - booked time slots
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
  conversationId: varchar("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
  leadId: varchar("lead_id").references(() => leads.id, { onDelete: "set null" }),
  
  // Patient information
  patientName: text("patient_name").notNull(),
  patientPhone: text("patient_phone").notNull(),
  patientEmail: text("patient_email"),
  
  // Appointment timing
  appointmentDate: timestamp("appointment_date").notNull(),
  appointmentTime: text("appointment_time").notNull(), // "14:00" (24-hour format)
  durationMinutes: numeric("duration_minutes", { precision: 3, scale: 0 }).notNull().default("30"),
  
  // Status and metadata
  status: text("status").notNull().default("confirmed"), // 'confirmed' | 'cancelled' | 'completed' | 'no_show' | 'rescheduled'
  notes: text("notes"), // Patient's reason for visit or special requests
  cancellationReason: text("cancellation_reason"),
  reminderSentAt: timestamp("reminder_sent_at"), // When reminder was sent
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Demo Pages - SuperAdmin shareable demo pages with embedded chat widget
export const demoPages = pgTable("demo_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(), // Unique token for public shareable link
  title: text("title"), // Optional custom title for the demo
  description: text("description"), // Optional description
  appearance: text("appearance"), // JSON for optional theme overrides: { accentColor, heroImageUrl, sectionsVisibility }
  isActive: text("is_active").notNull().default("true"), // 'true' | 'false'
  expiresAt: timestamp("expires_at"), // Optional expiry date for the demo page
  lastViewedAt: timestamp("last_viewed_at"), // Track when demo was last accessed
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }), // SuperAdmin who created it
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Public Chat Links - Business users' shareable public chat links
export const publicChatLinks = pgTable("public_chat_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessAccountId: varchar("business_account_id").notNull().unique().references(() => businessAccounts.id, { onDelete: "cascade" }), // One link per business account
  token: text("token").notNull().unique(), // Unique token for public shareable link
  isActive: text("is_active").notNull().default("true"), // 'true' | 'false' - Enable/disable the link
  password: text("password"), // Optional password for protected access
  lastAccessedAt: timestamp("last_accessed_at"), // Track when link was last used
  accessCount: numeric("access_count", { precision: 10, scale: 0 }).notNull().default("0"), // Number of times accessed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Support Tickets System Tables

// Support Tickets - Main ticket management table
export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
  ticketNumber: numeric("ticket_number", { precision: 10, scale: 0 }).notNull(), // Sequential ticket number for easy reference
  conversationId: varchar("conversation_id").references(() => conversations.id, { onDelete: "set null" }), // Optional link to original conversation
  
  // Customer information
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  
  // Ticket details
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  
  // Status and priority
  status: text("status").notNull().default("open"), // 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'
  priority: text("priority").notNull().default("medium"), // 'low' | 'medium' | 'high' | 'urgent'
  category: text("category").notNull().default("general"), // 'technical' | 'billing' | 'feature_request' | 'bug_report' | 'complaint' | 'general'
  
  // AI-powered features
  aiPriority: text("ai_priority"), // AI-suggested priority
  aiCategory: text("ai_category"), // AI-suggested category
  sentimentScore: numeric("sentiment_score", { precision: 3, scale: 2 }), // -1.00 to 1.00 (negative to positive)
  emotionalState: text("emotional_state"), // 'happy' | 'neutral' | 'frustrated' | 'angry'
  churnRisk: text("churn_risk").notNull().default("low"), // 'low' | 'medium' | 'high' | 'critical'
  aiAnalysis: text("ai_analysis"), // JSON with AI insights, keywords, suggested actions
  aiDraftedResponse: text("ai_drafted_response"), // AI-generated suggested response
  
  // Auto-resolution tracking
  autoResolved: text("auto_resolved").notNull().default("false"), // 'true' | 'false' - Whether AI resolved without human intervention
  autoResolvedAt: timestamp("auto_resolved_at"),
  autoResolutionSummary: text("auto_resolution_summary"), // Summary of how AI resolved the issue
  
  // Assignment and workflow
  assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: "set null" }), // Optional assignment to team member
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  
  // Customer satisfaction
  customerRating: numeric("customer_rating", { precision: 1, scale: 0 }), // 1-5 star rating
  customerFeedback: text("customer_feedback"), // Optional feedback from customer
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Ticket Messages - Conversation thread for each ticket
export const ticketMessages = pgTable("ticket_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  
  // Sender information
  senderId: varchar("sender_id"), // User ID or customer identifier (can be null for anonymous)
  senderType: text("sender_type").notNull(), // 'customer' | 'business_user' | 'ai' | 'system'
  senderName: text("sender_name").notNull(),
  senderEmail: text("sender_email"),
  
  // Message content
  message: text("message").notNull(),
  messageType: text("message_type").notNull().default("response"), // 'response' | 'internal_note' | 'status_update' | 'system'
  isInternal: text("is_internal").notNull().default("false"), // 'true' | 'false' - Internal notes not visible to customer
  
  // AI features
  aiDrafted: text("ai_drafted").notNull().default("false"), // 'true' | 'false' - Whether this was AI-generated
  aiConfidence: numeric("ai_confidence", { precision: 3, scale: 2 }), // 0.00 to 1.00 confidence score
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Ticket Attachments - File uploads for tickets
export const ticketAttachments = pgTable("ticket_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  messageId: varchar("message_id").references(() => ticketMessages.id, { onDelete: "cascade" }), // Optional link to specific message
  
  // File information
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  fileSize: numeric("file_size", { precision: 10, scale: 0 }).notNull(), // File size in bytes
  storageKey: text("storage_key").notNull(), // Path to stored file
  mimeType: text("mime_type").notNull(),
  
  // Uploader information
  uploadedBy: varchar("uploaded_by"), // User ID or customer identifier
  uploaderType: text("uploader_type").notNull(), // 'customer' | 'business_user'
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Canned Responses - Template responses for quick replies
export const cannedResponses = pgTable("canned_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
  
  // Response details
  title: text("title").notNull(), // Short title/identifier
  content: text("content").notNull(), // Response template content
  category: text("category"), // Optional category for organization
  
  // Usage tracking
  useCount: numeric("use_count", { precision: 10, scale: 0 }).notNull().default("0"),
  lastUsedAt: timestamp("last_used_at"),
  
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Ticket Insights - AI-generated insights and recommendations
export const ticketInsights = pgTable("ticket_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
  
  // Insight details
  insightType: text("insight_type").notNull(), // 'faq_suggestion' | 'trend_alert' | 'churn_warning' | 'product_issue' | 'policy_recommendation'
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("medium"), // 'low' | 'medium' | 'high'
  
  // Supporting data
  relatedTicketIds: text("related_ticket_ids"), // JSON array of ticket IDs
  suggestedAction: text("suggested_action"), // AI-recommended action
  impact: text("impact"), // Estimated business impact
  
  // AI generation tracking
  aiGenerated: text("ai_generated").notNull().default("true"), // 'true' | 'false' - Whether this insight was AI-generated
  
  // Status tracking
  status: text("status").notNull().default("pending"), // 'pending' | 'reviewed' | 'applied' | 'dismissed'
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Insert schemas
export const insertBusinessAccountSchema = createInsertSchema(businessAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  tempPassword: true,
  tempPasswordExpiry: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  usedAt: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFaqSchema = createInsertSchema(faqs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
});

export const insertWidgetSettingsSchema = createInsertSchema(widgetSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWebsiteAnalysisSchema = createInsertSchema(websiteAnalysis).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastAnalyzedAt: true,
});

export const insertAnalyzedPageSchema = createInsertSchema(analyzedPages).omit({
  id: true,
  createdAt: true,
  analyzedAt: true,
});

export const insertTrainingDocumentSchema = createInsertSchema(trainingDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  processedAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductCategorySchema = createInsertSchema(productCategories).omit({
  id: true,
  createdAt: true,
});

export const insertProductTagSchema = createInsertSchema(productTags).omit({
  id: true,
  createdAt: true,
});

export const insertProductRelationshipSchema = createInsertSchema(productRelationships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScheduleTemplateSchema = createInsertSchema(scheduleTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSlotOverrideSchema = createInsertSchema(slotOverrides).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reminderSentAt: true,
});

export const insertDemoPageSchema = createInsertSchema(demoPages).omit({
  id: true,
  token: true,
  createdAt: true,
  updatedAt: true,
  lastViewedAt: true,
});

export const insertPublicChatLinkSchema = createInsertSchema(publicChatLinks).omit({
  id: true,
  token: true,
  createdAt: true,
  updatedAt: true,
  lastAccessedAt: true,
  accessCount: true,
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  ticketNumber: true,
  createdAt: true,
  updatedAt: true,
  autoResolvedAt: true,
  resolvedAt: true,
  closedAt: true,
});

export const insertTicketMessageSchema = createInsertSchema(ticketMessages).omit({
  id: true,
  createdAt: true,
});

export const insertTicketAttachmentSchema = createInsertSchema(ticketAttachments).omit({
  id: true,
  createdAt: true,
});

export const insertCannedResponseSchema = createInsertSchema(cannedResponses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  useCount: true,
  lastUsedAt: true,
});

export const insertTicketInsightSchema = createInsertSchema(ticketInsights).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
});

// Types
export type InsertBusinessAccount = z.infer<typeof insertBusinessAccountSchema>;
export type BusinessAccount = typeof businessAccounts.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertFaq = z.infer<typeof insertFaqSchema>;
export type Faq = typeof faqs.$inferSelect;

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

export type InsertWidgetSettings = z.infer<typeof insertWidgetSettingsSchema>;
export type WidgetSettings = typeof widgetSettings.$inferSelect;

export type InsertWebsiteAnalysis = z.infer<typeof insertWebsiteAnalysisSchema>;
export type WebsiteAnalysis = typeof websiteAnalysis.$inferSelect;

export type InsertAnalyzedPage = z.infer<typeof insertAnalyzedPageSchema>;
export type AnalyzedPage = typeof analyzedPages.$inferSelect;

export type InsertTrainingDocument = z.infer<typeof insertTrainingDocumentSchema>;
export type TrainingDocument = typeof trainingDocuments.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tags.$inferSelect;

export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;
export type ProductCategory = typeof productCategories.$inferSelect;

export type InsertProductTag = z.infer<typeof insertProductTagSchema>;
export type ProductTag = typeof productTags.$inferSelect;

export type InsertProductRelationship = z.infer<typeof insertProductRelationshipSchema>;
export type ProductRelationship = typeof productRelationships.$inferSelect;

export type InsertScheduleTemplate = z.infer<typeof insertScheduleTemplateSchema>;
export type ScheduleTemplate = typeof scheduleTemplates.$inferSelect;

export type InsertSlotOverride = z.infer<typeof insertSlotOverrideSchema>;
export type SlotOverride = typeof slotOverrides.$inferSelect;

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export type InsertDemoPage = z.infer<typeof insertDemoPageSchema>;
export type DemoPage = typeof demoPages.$inferSelect;

export type InsertPublicChatLink = z.infer<typeof insertPublicChatLinkSchema>;
export type PublicChatLink = typeof publicChatLinks.$inferSelect;

export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

export type InsertTicketMessage = z.infer<typeof insertTicketMessageSchema>;
export type TicketMessage = typeof ticketMessages.$inferSelect;

export type InsertTicketAttachment = z.infer<typeof insertTicketAttachmentSchema>;
export type TicketAttachment = typeof ticketAttachments.$inferSelect;

export type InsertCannedResponse = z.infer<typeof insertCannedResponseSchema>;
export type CannedResponse = typeof cannedResponses.$inferSelect;

export type InsertTicketInsight = z.infer<typeof insertTicketInsightSchema>;
export type TicketInsight = typeof ticketInsights.$inferSelect;
