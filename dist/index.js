var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  analyzedPages: () => analyzedPages,
  appointments: () => appointments,
  businessAccounts: () => businessAccounts,
  categories: () => categories,
  conversations: () => conversations,
  demoPages: () => demoPages,
  faqs: () => faqs,
  insertAnalyzedPageSchema: () => insertAnalyzedPageSchema,
  insertAppointmentSchema: () => insertAppointmentSchema,
  insertBusinessAccountSchema: () => insertBusinessAccountSchema,
  insertCategorySchema: () => insertCategorySchema,
  insertConversationSchema: () => insertConversationSchema,
  insertDemoPageSchema: () => insertDemoPageSchema,
  insertFaqSchema: () => insertFaqSchema,
  insertLeadSchema: () => insertLeadSchema,
  insertMessageSchema: () => insertMessageSchema,
  insertPasswordResetTokenSchema: () => insertPasswordResetTokenSchema,
  insertProductCategorySchema: () => insertProductCategorySchema,
  insertProductRelationshipSchema: () => insertProductRelationshipSchema,
  insertProductSchema: () => insertProductSchema,
  insertProductTagSchema: () => insertProductTagSchema,
  insertPublicChatLinkSchema: () => insertPublicChatLinkSchema,
  insertScheduleTemplateSchema: () => insertScheduleTemplateSchema,
  insertSessionSchema: () => insertSessionSchema,
  insertSlotOverrideSchema: () => insertSlotOverrideSchema,
  insertTagSchema: () => insertTagSchema,
  insertTrainingDocumentSchema: () => insertTrainingDocumentSchema,
  insertUserSchema: () => insertUserSchema,
  insertWebsiteAnalysisSchema: () => insertWebsiteAnalysisSchema,
  insertWidgetSettingsSchema: () => insertWidgetSettingsSchema,
  leads: () => leads,
  messages: () => messages,
  passwordResetTokens: () => passwordResetTokens,
  productCategories: () => productCategories,
  productRelationships: () => productRelationships,
  productTags: () => productTags,
  products: () => products,
  publicChatLinks: () => publicChatLinks,
  scheduleTemplates: () => scheduleTemplates,
  sessions: () => sessions,
  slotOverrides: () => slotOverrides,
  tags: () => tags,
  trainingDocuments: () => trainingDocuments,
  users: () => users,
  websiteAnalysis: () => websiteAnalysis,
  widgetSettings: () => widgetSettings
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var businessAccounts, users, sessions, passwordResetTokens, conversations, messages, products, faqs, leads, widgetSettings, websiteAnalysis, analyzedPages, trainingDocuments, categories, tags, productCategories, productTags, productRelationships, scheduleTemplates, slotOverrides, appointments, demoPages, publicChatLinks, insertBusinessAccountSchema, insertUserSchema, insertSessionSchema, insertPasswordResetTokenSchema, insertConversationSchema, insertMessageSchema, insertProductSchema, insertFaqSchema, insertLeadSchema, insertWidgetSettingsSchema, insertWebsiteAnalysisSchema, insertAnalyzedPageSchema, insertTrainingDocumentSchema, insertCategorySchema, insertTagSchema, insertProductCategorySchema, insertProductTagSchema, insertProductRelationshipSchema, insertScheduleTemplateSchema, insertSlotOverrideSchema, insertAppointmentSchema, insertDemoPageSchema, insertPublicChatLinkSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    businessAccounts = pgTable("business_accounts", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      website: text("website").notNull(),
      // Mandatory website URL for the business
      description: text("description").default(""),
      openaiApiKey: text("openai_api_key"),
      // Business-specific OpenAI API key
      status: text("status").notNull().default("active"),
      // 'active' | 'suspended'
      shopifyAutoSyncEnabled: text("shopify_auto_sync_enabled").notNull().default("false"),
      // 'true' | 'false'
      shopifySyncFrequency: numeric("shopify_sync_frequency", { precision: 5, scale: 0 }).default("24"),
      // Sync frequency in hours (6, 12, 24, 48)
      shopifyLastSyncedAt: timestamp("shopify_last_synced_at"),
      // When products were last synced from Shopify
      shopifySyncStatus: text("shopify_sync_status").default("idle"),
      // 'idle' | 'syncing' | 'completed' | 'failed'
      shopifyEnabled: text("shopify_enabled").notNull().default("false"),
      // 'true' | 'false' - SuperAdmin toggle for Shopify features (text for consistency with other flags)
      appointmentsEnabled: text("appointments_enabled").notNull().default("false"),
      // 'true' | 'false' - SuperAdmin toggle for Appointment features (text for consistency with other flags)
      voiceModeEnabled: text("voice_mode_enabled").notNull().default("true"),
      // 'true' | 'false' - SuperAdmin toggle for Voice Mode feature (text for consistency with other flags)
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    users = pgTable("users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      username: text("username").notNull().unique(),
      passwordHash: text("password_hash").notNull(),
      tempPassword: text("temp_password"),
      // Temporary password for viewing/copying
      tempPasswordExpiry: timestamp("temp_password_expiry"),
      // When temp password expires
      mustChangePassword: text("must_change_password").notNull().default("false"),
      // 'true' | 'false' - Force password change on next login
      role: text("role").notNull(),
      // 'super_admin' | 'business_user'
      businessAccountId: varchar("business_account_id").unique().references(() => businessAccounts.id, { onDelete: "cascade" }),
      // Unique constraint enforces 1:1 relationship (nulls allowed for superadmins)
      lastLoginAt: timestamp("last_login_at"),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    sessions = pgTable("sessions", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      sessionToken: text("session_token").notNull().unique(),
      expiresAt: timestamp("expires_at").notNull(),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    passwordResetTokens = pgTable("password_reset_tokens", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      token: text("token").notNull().unique(),
      expiresAt: timestamp("expires_at").notNull(),
      usedAt: timestamp("used_at"),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    conversations = pgTable("conversations", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessAccountId: varchar("business_account_id").references(() => businessAccounts.id, { onDelete: "cascade" }),
      title: text("title").notNull().default("New Chat"),
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    messages = pgTable("messages", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
      role: text("role").notNull(),
      // 'user' or 'assistant'
      content: text("content").notNull(),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    products = pgTable("products", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
      name: text("name").notNull(),
      description: text("description").notNull(),
      price: numeric("price", { precision: 10, scale: 2 }),
      imageUrl: text("image_url"),
      source: text("source").notNull().default("manual"),
      // 'manual' | 'shopify'
      shopifyProductId: text("shopify_product_id"),
      // Original Shopify product ID
      shopifyLastSyncedAt: timestamp("shopify_last_synced_at"),
      // When last synced from Shopify
      isEditable: text("is_editable").notNull().default("true"),
      // 'true' | 'false' - Whether user can edit this product
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    faqs = pgTable("faqs", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
      question: text("question").notNull(),
      answer: text("answer").notNull(),
      category: text("category"),
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    leads = pgTable("leads", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
      name: text("name"),
      // Optional - customer may not provide name
      email: text("email"),
      // Optional - customer may provide only phone
      phone: text("phone"),
      // Optional - customer may provide only email
      message: text("message"),
      conversationId: varchar("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    widgetSettings = pgTable("widget_settings", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessAccountId: varchar("business_account_id").notNull().unique().references(() => businessAccounts.id, { onDelete: "cascade" }),
      chatColor: text("chat_color").notNull().default("#9333ea"),
      // Start color for gradient
      chatColorEnd: text("chat_color_end").notNull().default("#3b82f6"),
      // End color for gradient
      widgetHeaderText: text("widget_header_text").notNull().default("Hi Chroney"),
      // Customizable header text
      welcomeMessageType: text("welcome_message_type").notNull().default("custom"),
      // 'custom' | 'ai_generated'
      welcomeMessage: text("welcome_message").notNull().default("Hi! How can I help you today?"),
      buttonStyle: text("button_style").notNull().default("circular"),
      // 'circular' | 'rounded' | 'pill' | 'minimal'
      buttonAnimation: text("button_animation").notNull().default("pulse"),
      // 'pulse' | 'bounce' | 'glow' | 'none'
      personality: text("personality").notNull().default("friendly"),
      // 'friendly' | 'professional' | 'funny' | 'polite' | 'casual'
      currency: text("currency").notNull().default("USD"),
      customInstructions: text("custom_instructions"),
      // Natural language instructions for customizing Chroney's behavior
      cachedIntro: text("cached_intro"),
      // Cached AI-generated intro message to avoid regenerating on every page load
      appointmentBookingEnabled: text("appointment_booking_enabled").notNull().default("true"),
      // 'true' | 'false' - Master toggle for appointment booking feature
      shopifyStoreUrl: text("shopify_store_url"),
      // e.g., "mystore.myshopify.com"
      shopifyAccessToken: text("shopify_access_token"),
      // Private app access token (encrypted)
      twilioAccountSid: text("twilio_account_sid"),
      // Twilio Account SID for WhatsApp
      twilioAuthToken: text("twilio_auth_token"),
      // Twilio Auth Token for WhatsApp
      twilioWhatsappFrom: text("twilio_whatsapp_from"),
      // Twilio WhatsApp number (e.g., whatsapp:+14155238886)
      // Widget size customization
      widgetWidth: numeric("widget_width", { precision: 5, scale: 0 }).notNull().default("400"),
      // Widget width in pixels
      widgetHeight: numeric("widget_height", { precision: 5, scale: 0 }).notNull().default("600"),
      // Widget height in pixels
      widgetPosition: text("widget_position").notNull().default("bottom-right"),
      // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
      bubbleSize: numeric("bubble_size", { precision: 3, scale: 0 }).notNull().default("60"),
      // Chat bubble button size in pixels
      sizePreset: text("size_preset").notNull().default("medium"),
      // 'small' | 'medium' | 'large' | 'custom'
      // Widget behavior
      autoOpenChat: text("auto_open_chat").notNull().default("false"),
      // 'true' | 'false' - Auto-open chat on page load
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    websiteAnalysis = pgTable("website_analysis", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessAccountId: varchar("business_account_id").notNull().unique().references(() => businessAccounts.id, { onDelete: "cascade" }),
      websiteUrl: text("website_url").notNull(),
      status: text("status").notNull().default("pending"),
      // 'pending' | 'analyzing' | 'completed' | 'failed'
      analyzedContent: text("analyzed_content"),
      // Structured JSON with extracted business information
      errorMessage: text("error_message"),
      // Store error if analysis fails
      lastAnalyzedAt: timestamp("last_analyzed_at"),
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    analyzedPages = pgTable("analyzed_pages", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
      pageUrl: text("page_url").notNull(),
      extractedContent: text("extracted_content"),
      analyzedAt: timestamp("analyzed_at").notNull().defaultNow(),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    trainingDocuments = pgTable("training_documents", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
      filename: text("filename").notNull(),
      originalFilename: text("original_filename").notNull(),
      fileSize: numeric("file_size", { precision: 10, scale: 0 }).notNull(),
      // File size in bytes
      storageKey: text("storage_key").notNull(),
      // Path to stored file
      uploadStatus: text("upload_status").notNull().default("pending"),
      // 'pending' | 'processing' | 'completed' | 'failed'
      extractedText: text("extracted_text"),
      // Full text extracted from PDF
      summary: text("summary"),
      // AI-generated summary
      keyPoints: text("key_points"),
      // AI-generated key points as JSON array
      errorMessage: text("error_message"),
      // Error details if processing fails
      uploadedBy: varchar("uploaded_by").notNull().references(() => users.id, { onDelete: "cascade" }),
      processedAt: timestamp("processed_at"),
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    categories = pgTable("categories", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
      name: text("name").notNull(),
      description: text("description"),
      parentCategoryId: varchar("parent_category_id").references(() => categories.id, { onDelete: "cascade" }),
      // Self-referencing for hierarchy
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    tags = pgTable("tags", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
      name: text("name").notNull(),
      color: text("color").default("#3b82f6"),
      // Optional color for visual organization
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    productCategories = pgTable("product_categories", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
      categoryId: varchar("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    productTags = pgTable("product_tags", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
      tagId: varchar("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    productRelationships = pgTable("product_relationships", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
      sourceProductId: varchar("source_product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
      targetProductId: varchar("target_product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
      relationshipType: text("relationship_type").notNull(),
      // 'cross_sell' | 'similar' | 'complement' | 'bundle'
      weight: numeric("weight", { precision: 3, scale: 2 }).default("1.00"),
      // Priority/strength of relationship (0-1)
      notes: text("notes"),
      // Optional notes about the relationship
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    scheduleTemplates = pgTable("schedule_templates", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
      dayOfWeek: numeric("day_of_week", { precision: 1, scale: 0 }).notNull(),
      // 0=Sunday, 1=Monday, ..., 6=Saturday
      startTime: text("start_time").notNull(),
      // "09:00" (24-hour format)
      endTime: text("end_time").notNull(),
      // "17:00" (24-hour format)
      slotDurationMinutes: numeric("slot_duration_minutes", { precision: 3, scale: 0 }).notNull().default("30"),
      // Default 30-minute slots
      isActive: text("is_active").notNull().default("true"),
      // 'true' | 'false'
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    slotOverrides = pgTable("slot_overrides", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
      slotDate: timestamp("slot_date").notNull(),
      // Specific date for this override
      slotTime: text("slot_time").notNull(),
      // "14:00" (24-hour format)
      durationMinutes: numeric("duration_minutes", { precision: 3, scale: 0 }).notNull().default("30"),
      isAvailable: text("is_available").notNull().default("true"),
      // 'true' = add slot, 'false' = block slot
      isAllDay: text("is_all_day").notNull().default("false"),
      // 'true' = block entire day, 'false' = specific time slot
      reason: text("reason"),
      // "Lunch break", "Extended hours", "Staff meeting", "Holiday", etc.
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    appointments = pgTable("appointments", {
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
      appointmentTime: text("appointment_time").notNull(),
      // "14:00" (24-hour format)
      durationMinutes: numeric("duration_minutes", { precision: 3, scale: 0 }).notNull().default("30"),
      // Status and metadata
      status: text("status").notNull().default("confirmed"),
      // 'confirmed' | 'cancelled' | 'completed' | 'no_show' | 'rescheduled'
      notes: text("notes"),
      // Patient's reason for visit or special requests
      cancellationReason: text("cancellation_reason"),
      reminderSentAt: timestamp("reminder_sent_at"),
      // When reminder was sent
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    demoPages = pgTable("demo_pages", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessAccountId: varchar("business_account_id").notNull().references(() => businessAccounts.id, { onDelete: "cascade" }),
      token: text("token").notNull().unique(),
      // Unique token for public shareable link
      title: text("title"),
      // Optional custom title for the demo
      description: text("description"),
      // Optional description
      appearance: text("appearance"),
      // JSON for optional theme overrides: { accentColor, heroImageUrl, sectionsVisibility }
      isActive: text("is_active").notNull().default("true"),
      // 'true' | 'false'
      expiresAt: timestamp("expires_at"),
      // Optional expiry date for the demo page
      lastViewedAt: timestamp("last_viewed_at"),
      // Track when demo was last accessed
      createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
      // SuperAdmin who created it
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    publicChatLinks = pgTable("public_chat_links", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessAccountId: varchar("business_account_id").notNull().unique().references(() => businessAccounts.id, { onDelete: "cascade" }),
      // One link per business account
      token: text("token").notNull().unique(),
      // Unique token for public shareable link
      isActive: text("is_active").notNull().default("true"),
      // 'true' | 'false' - Enable/disable the link
      password: text("password"),
      // Optional password for protected access
      lastAccessedAt: timestamp("last_accessed_at"),
      // Track when link was last used
      accessCount: numeric("access_count", { precision: 10, scale: 0 }).notNull().default("0"),
      // Number of times accessed
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    insertBusinessAccountSchema = createInsertSchema(businessAccounts).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertUserSchema = createInsertSchema(users).omit({
      id: true,
      tempPassword: true,
      tempPasswordExpiry: true,
      mustChangePassword: true,
      lastLoginAt: true,
      createdAt: true
    });
    insertSessionSchema = createInsertSchema(sessions).omit({
      id: true,
      createdAt: true
    });
    insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
      id: true,
      usedAt: true,
      createdAt: true
    });
    insertConversationSchema = createInsertSchema(conversations).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertMessageSchema = createInsertSchema(messages).omit({
      id: true,
      createdAt: true
    });
    insertProductSchema = createInsertSchema(products).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertFaqSchema = createInsertSchema(faqs).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertLeadSchema = createInsertSchema(leads).omit({
      id: true,
      createdAt: true
    });
    insertWidgetSettingsSchema = createInsertSchema(widgetSettings).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertWebsiteAnalysisSchema = createInsertSchema(websiteAnalysis).omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      lastAnalyzedAt: true
    });
    insertAnalyzedPageSchema = createInsertSchema(analyzedPages).omit({
      id: true,
      createdAt: true,
      analyzedAt: true
    });
    insertTrainingDocumentSchema = createInsertSchema(trainingDocuments).omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      processedAt: true
    });
    insertCategorySchema = createInsertSchema(categories).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertTagSchema = createInsertSchema(tags).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertProductCategorySchema = createInsertSchema(productCategories).omit({
      id: true,
      createdAt: true
    });
    insertProductTagSchema = createInsertSchema(productTags).omit({
      id: true,
      createdAt: true
    });
    insertProductRelationshipSchema = createInsertSchema(productRelationships).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertScheduleTemplateSchema = createInsertSchema(scheduleTemplates).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertSlotOverrideSchema = createInsertSchema(slotOverrides).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertAppointmentSchema = createInsertSchema(appointments).omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      reminderSentAt: true
    });
    insertDemoPageSchema = createInsertSchema(demoPages).omit({
      id: true,
      token: true,
      createdAt: true,
      updatedAt: true,
      lastViewedAt: true
    });
    insertPublicChatLinkSchema = createInsertSchema(publicChatLinks).omit({
      id: true,
      token: true,
      createdAt: true,
      updatedAt: true,
      lastAccessedAt: true,
      accessCount: true
    });
  }
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
var pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    neonConfig.webSocketConstructor = ws;
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema: schema_exports });
  }
});

// server/storage.ts
import { eq, desc, count, inArray, sql as sql2, and, or, gte, lte } from "drizzle-orm";
var DatabaseStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_schema();
    init_db();
    DatabaseStorage = class {
      // User methods
      async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user || void 0;
      }
      async getUserByUsername(username) {
        const [user] = await db.select().from(users).where(eq(users.username, username));
        return user || void 0;
      }
      async getUserByBusinessAccountId(businessAccountId) {
        const [user] = await db.select().from(users).where(eq(users.businessAccountId, businessAccountId));
        return user || void 0;
      }
      async getUserByUsernameAndRole(username, role) {
        const [user] = await db.select().from(users).where(
          and(eq(users.username, username), eq(users.role, role))
        );
        return user || void 0;
      }
      async getSuperadmins() {
        return await db.select().from(users).where(eq(users.role, "super_admin"));
      }
      async createUser(insertUser) {
        const [user] = await db.insert(users).values(insertUser).returning();
        return user;
      }
      async createUserWithTempPassword(insertUser) {
        const [user] = await db.insert(users).values(insertUser).returning();
        return user;
      }
      async updateUserLastLogin(id) {
        await db.update(users).set({ lastLoginAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id));
      }
      async updateUserPassword(id, passwordHash) {
        await db.update(users).set({
          passwordHash,
          tempPassword: null,
          tempPasswordExpiry: null,
          mustChangePassword: "false"
        }).where(eq(users.id, id));
      }
      async resetUserPassword(id, passwordHash, tempPassword, tempPasswordExpiry) {
        const [user] = await db.update(users).set({
          passwordHash,
          tempPassword,
          tempPasswordExpiry,
          mustChangePassword: "true"
        }).where(eq(users.id, id)).returning();
        return user;
      }
      async clearTempPassword(id) {
        await db.update(users).set({
          tempPassword: null,
          tempPasswordExpiry: null,
          mustChangePassword: "false"
        }).where(eq(users.id, id));
      }
      async getAllUsers() {
        return await db.select().from(users).orderBy(desc(users.createdAt));
      }
      async getUsersByBusinessAccount(businessAccountId) {
        return await db.select().from(users).where(eq(users.businessAccountId, businessAccountId));
      }
      // Business Account methods
      async createBusinessAccount(insertAccount) {
        const [account] = await db.insert(businessAccounts).values(insertAccount).returning();
        return account;
      }
      async getBusinessAccount(id) {
        const [account] = await db.select().from(businessAccounts).where(eq(businessAccounts.id, id));
        return account || void 0;
      }
      async getAllBusinessAccounts() {
        return await db.select().from(businessAccounts).orderBy(desc(businessAccounts.createdAt));
      }
      async updateBusinessAccount(id, updates) {
        const [account] = await db.update(businessAccounts).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(businessAccounts.id, id)).returning();
        return account;
      }
      async updateBusinessAccountDescription(id, description) {
        const [account] = await db.update(businessAccounts).set({ description, updatedAt: /* @__PURE__ */ new Date() }).where(eq(businessAccounts.id, id)).returning();
        return account;
      }
      async updateBusinessAccountStatus(id, status) {
        const [account] = await db.update(businessAccounts).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(eq(businessAccounts.id, id)).returning();
        return account;
      }
      async updateBusinessAccountFeatures(id, features) {
        const [account] = await db.update(businessAccounts).set({ ...features, updatedAt: /* @__PURE__ */ new Date() }).where(eq(businessAccounts.id, id)).returning();
        if (!account) {
          throw new Error("Business account not found");
        }
        return account;
      }
      async getBusinessAnalytics(businessAccountId) {
        let accountsQuery = db.select().from(businessAccounts);
        if (businessAccountId) {
          accountsQuery = accountsQuery.where(eq(businessAccounts.id, businessAccountId));
        }
        const accounts = await accountsQuery.orderBy(desc(businessAccounts.createdAt));
        const analyticsPromises = accounts.map(async (account) => {
          const accountUsers = await db.select({
            count: count(),
            maxLastLogin: sql2`MAX(${users.lastLoginAt})`
          }).from(users).where(eq(users.businessAccountId, account.id));
          const businessUsers = await db.select({
            id: users.id,
            username: users.username,
            lastLoginAt: users.lastLoginAt,
            createdAt: users.createdAt
          }).from(users).where(eq(users.businessAccountId, account.id)).orderBy(desc(users.lastLoginAt));
          const leadCount = await db.select({ count: count() }).from(leads).where(eq(leads.businessAccountId, account.id));
          const conversationCount = await db.select({ count: count() }).from(conversations).where(eq(conversations.businessAccountId, account.id));
          const productCount = await db.select({ count: count() }).from(products).where(eq(products.businessAccountId, account.id));
          const faqCount = await db.select({ count: count() }).from(faqs).where(eq(faqs.businessAccountId, account.id));
          return {
            id: account.id,
            name: account.name,
            website: account.website,
            status: account.status,
            createdAt: account.createdAt,
            userCount: accountUsers[0]?.count || 0,
            lastLogin: accountUsers[0]?.maxLastLogin || null,
            users: businessUsers,
            leadCount: leadCount[0]?.count || 0,
            conversationCount: conversationCount[0]?.count || 0,
            productCount: productCount[0]?.count || 0,
            faqCount: faqCount[0]?.count || 0
          };
        });
        return await Promise.all(analyticsPromises);
      }
      async updateBusinessAccountOpenAIKey(id, openaiApiKey) {
        const [account] = await db.update(businessAccounts).set({ openaiApiKey, updatedAt: /* @__PURE__ */ new Date() }).where(eq(businessAccounts.id, id)).returning();
        return account;
      }
      async getBusinessAccountOpenAIKey(id) {
        const [account] = await db.select({ openaiApiKey: businessAccounts.openaiApiKey }).from(businessAccounts).where(eq(businessAccounts.id, id));
        return account?.openaiApiKey || null;
      }
      // Conversation methods
      async createConversation(insertConversation) {
        const [conversation] = await db.insert(conversations).values(insertConversation).returning();
        return conversation;
      }
      async getConversation(id, businessAccountId) {
        const [conversation] = await db.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.businessAccountId, businessAccountId)));
        return conversation || void 0;
      }
      async getAllConversations(businessAccountId) {
        return await db.select().from(conversations).where(eq(conversations.businessAccountId, businessAccountId)).orderBy(desc(conversations.updatedAt));
      }
      async getConversationsByBusinessAccount(businessAccountId, startDate, endDate) {
        const conditions = [eq(conversations.businessAccountId, businessAccountId)];
        if (startDate) {
          conditions.push(gte(conversations.createdAt, new Date(startDate)));
        }
        if (endDate) {
          conditions.push(lte(conversations.createdAt, new Date(endDate)));
        }
        return await db.select().from(conversations).where(and(...conditions)).orderBy(desc(conversations.createdAt));
      }
      async deleteConversation(id, businessAccountId) {
        await db.delete(conversations).where(and(eq(conversations.id, id), eq(conversations.businessAccountId, businessAccountId)));
      }
      async updateConversationTimestamp(id) {
        await db.update(conversations).set({ updatedAt: /* @__PURE__ */ new Date() }).where(eq(conversations.id, id));
      }
      async updateConversationTitle(id, businessAccountId, title) {
        const [conversation] = await db.update(conversations).set({ title, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(conversations.id, id), eq(conversations.businessAccountId, businessAccountId))).returning();
        return conversation;
      }
      // Message methods
      async createMessage(insertMessage) {
        const [message] = await db.insert(messages).values(insertMessage).returning();
        return message;
      }
      async getMessagesByConversation(conversationId, businessAccountId) {
        const conversation = await this.getConversation(conversationId, businessAccountId);
        if (!conversation) {
          throw new Error("Conversation not found or access denied");
        }
        return await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
      }
      async getMessagesByConversationIds(conversationIds) {
        if (conversationIds.length === 0) {
          return [];
        }
        return await db.select().from(messages).where(inArray(messages.conversationId, conversationIds)).orderBy(messages.createdAt);
      }
      async getMessageCountsForConversations(conversationIds) {
        if (conversationIds.length === 0) {
          return {};
        }
        const results = await db.select({
          conversationId: messages.conversationId,
          count: count()
        }).from(messages).where(inArray(messages.conversationId, conversationIds)).groupBy(messages.conversationId);
        const countsMap = {};
        results.forEach((row) => {
          countsMap[row.conversationId] = Number(row.count);
        });
        conversationIds.forEach((id) => {
          if (!(id in countsMap)) {
            countsMap[id] = 0;
          }
        });
        return countsMap;
      }
      async deleteMessage(id, businessAccountId) {
        const [message] = await db.select().from(messages).where(eq(messages.id, id));
        if (!message) {
          throw new Error("Message not found");
        }
        const conversation = await this.getConversation(message.conversationId, businessAccountId);
        if (!conversation) {
          throw new Error("Message not found or access denied");
        }
        await db.delete(messages).where(eq(messages.id, id));
      }
      // Product methods
      async createProduct(insertProduct) {
        const [product] = await db.insert(products).values(insertProduct).returning();
        return product;
      }
      async getProduct(id, businessAccountId) {
        const [product] = await db.select().from(products).where(and(eq(products.id, id), eq(products.businessAccountId, businessAccountId)));
        return product || void 0;
      }
      async getAllProducts(businessAccountId) {
        return await db.select().from(products).where(eq(products.businessAccountId, businessAccountId)).orderBy(desc(products.createdAt));
      }
      async updateProduct(id, businessAccountId, productData) {
        const [product] = await db.update(products).set({ ...productData, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(products.id, id), eq(products.businessAccountId, businessAccountId))).returning();
        return product;
      }
      async deleteProduct(id, businessAccountId) {
        await db.delete(products).where(and(eq(products.id, id), eq(products.businessAccountId, businessAccountId)));
      }
      // FAQ methods
      async createFaq(insertFaq) {
        const [faq] = await db.insert(faqs).values(insertFaq).returning();
        return faq;
      }
      async getFaq(id, businessAccountId) {
        const [faq] = await db.select().from(faqs).where(and(eq(faqs.id, id), eq(faqs.businessAccountId, businessAccountId)));
        return faq || void 0;
      }
      // Get all PUBLISHED FAQs only (excludes draft_faqs table) - filtered by businessAccountId
      async getAllFaqs(businessAccountId) {
        return await db.select().from(faqs).where(eq(faqs.businessAccountId, businessAccountId)).orderBy(desc(faqs.createdAt));
      }
      async updateFaq(id, businessAccountId, faqData) {
        const [faq] = await db.update(faqs).set({ ...faqData, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(faqs.id, id), eq(faqs.businessAccountId, businessAccountId))).returning();
        return faq;
      }
      async deleteFaq(id, businessAccountId) {
        await db.delete(faqs).where(and(eq(faqs.id, id), eq(faqs.businessAccountId, businessAccountId)));
      }
      // Lead methods
      async createLead(insertLead) {
        const [lead] = await db.insert(leads).values(insertLead).returning();
        return lead;
      }
      async getLead(id, businessAccountId) {
        const [lead] = await db.select().from(leads).where(and(eq(leads.id, id), eq(leads.businessAccountId, businessAccountId)));
        return lead || void 0;
      }
      async getAllLeads(businessAccountId) {
        return await db.select().from(leads).where(eq(leads.businessAccountId, businessAccountId)).orderBy(desc(leads.createdAt));
      }
      async deleteLead(id, businessAccountId) {
        await db.delete(leads).where(and(eq(leads.id, id), eq(leads.businessAccountId, businessAccountId)));
      }
      // Widget Settings methods
      async getWidgetSettings(businessAccountId) {
        const [settings] = await db.select().from(widgetSettings).where(eq(widgetSettings.businessAccountId, businessAccountId));
        return settings || void 0;
      }
      async upsertWidgetSettings(businessAccountId, settingsData) {
        const existing = await this.getWidgetSettings(businessAccountId);
        if (existing) {
          const [updated] = await db.update(widgetSettings).set({ ...settingsData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(widgetSettings.businessAccountId, businessAccountId)).returning();
          return updated;
        } else {
          const [created] = await db.insert(widgetSettings).values({
            businessAccountId,
            chatColor: settingsData.chatColor || "#9333ea",
            welcomeMessageType: settingsData.welcomeMessageType || "custom",
            welcomeMessage: settingsData.welcomeMessage || "Hi! How can I help you today?",
            currency: settingsData.currency || "INR"
          }).returning();
          return created;
        }
      }
      // Shopify Integration methods
      async updateShopifyCredentials(businessAccountId, shopifyStoreUrl, shopifyAccessToken) {
        return await this.upsertWidgetSettings(businessAccountId, {
          shopifyStoreUrl,
          shopifyAccessToken
        });
      }
      async getShopifyCredentials(businessAccountId) {
        const settings = await this.getWidgetSettings(businessAccountId);
        return {
          storeUrl: settings?.shopifyStoreUrl || null,
          accessToken: settings?.shopifyAccessToken || null
        };
      }
      // Password Reset Token methods
      async createPasswordResetToken(token) {
        const [created] = await db.insert(passwordResetTokens).values(token).returning();
        return created;
      }
      async getPasswordResetToken(token) {
        const [result] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
        return result;
      }
      async markPasswordResetTokenAsUsed(token) {
        await db.update(passwordResetTokens).set({ usedAt: /* @__PURE__ */ new Date() }).where(eq(passwordResetTokens.token, token));
      }
      async deleteExpiredPasswordResetTokens() {
        await db.delete(passwordResetTokens).where(sql2`${passwordResetTokens.expiresAt} < NOW()`);
      }
      // Website Analysis methods
      async getWebsiteAnalysis(businessAccountId) {
        const [analysis] = await db.select().from(websiteAnalysis).where(eq(websiteAnalysis.businessAccountId, businessAccountId));
        return analysis || void 0;
      }
      async upsertWebsiteAnalysis(businessAccountId, analysisData) {
        const existing = await this.getWebsiteAnalysis(businessAccountId);
        if (existing) {
          const [updated] = await db.update(websiteAnalysis).set({ ...analysisData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(websiteAnalysis.businessAccountId, businessAccountId)).returning();
          return updated;
        } else {
          const [created] = await db.insert(websiteAnalysis).values({
            businessAccountId,
            websiteUrl: analysisData.websiteUrl || "",
            status: analysisData.status || "pending",
            ...analysisData
          }).returning();
          return created;
        }
      }
      async updateWebsiteAnalysisStatus(businessAccountId, status, errorMessage) {
        await db.update(websiteAnalysis).set({
          status,
          errorMessage: errorMessage || null,
          lastAnalyzedAt: status === "completed" ? /* @__PURE__ */ new Date() : null,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(websiteAnalysis.businessAccountId, businessAccountId));
      }
      async deleteWebsiteAnalysis(businessAccountId) {
        await db.delete(websiteAnalysis).where(eq(websiteAnalysis.businessAccountId, businessAccountId));
      }
      // Analyzed Pages methods
      async createAnalyzedPage(analyzedPage) {
        const [created] = await db.insert(analyzedPages).values(analyzedPage).returning();
        return created;
      }
      async getAnalyzedPages(businessAccountId) {
        const pages = await db.select().from(analyzedPages).where(eq(analyzedPages.businessAccountId, businessAccountId)).orderBy(desc(analyzedPages.analyzedAt));
        return pages;
      }
      async deleteAnalyzedPage(id, businessAccountId) {
        await db.delete(analyzedPages).where(
          and(
            eq(analyzedPages.id, id),
            eq(analyzedPages.businessAccountId, businessAccountId)
          )
        );
      }
      async deleteAnalyzedPages(businessAccountId) {
        await db.delete(analyzedPages).where(eq(analyzedPages.businessAccountId, businessAccountId));
      }
      // Training Documents methods
      async createTrainingDocument(document2) {
        const [created] = await db.insert(trainingDocuments).values(document2).returning();
        return created;
      }
      async getTrainingDocument(id, businessAccountId) {
        const [document2] = await db.select().from(trainingDocuments).where(
          and(
            eq(trainingDocuments.id, id),
            eq(trainingDocuments.businessAccountId, businessAccountId)
          )
        );
        return document2 || void 0;
      }
      async getTrainingDocuments(businessAccountId) {
        const documents = await db.select().from(trainingDocuments).where(eq(trainingDocuments.businessAccountId, businessAccountId)).orderBy(desc(trainingDocuments.createdAt));
        return documents;
      }
      async updateTrainingDocumentStatus(id, status, errorMessage) {
        await db.update(trainingDocuments).set({
          uploadStatus: status,
          errorMessage: errorMessage || null,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(trainingDocuments.id, id));
      }
      async updateTrainingDocumentContent(id, extractedText, summary, keyPoints) {
        await db.update(trainingDocuments).set({
          extractedText,
          summary,
          keyPoints,
          uploadStatus: "completed",
          processedAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(trainingDocuments.id, id));
      }
      async deleteTrainingDocument(id, businessAccountId) {
        await db.delete(trainingDocuments).where(
          and(
            eq(trainingDocuments.id, id),
            eq(trainingDocuments.businessAccountId, businessAccountId)
          )
        );
      }
      // Category methods
      async createCategory(category) {
        const [created] = await db.insert(categories).values(category).returning();
        return created;
      }
      async getCategory(id, businessAccountId) {
        const [category] = await db.select().from(categories).where(
          and(
            eq(categories.id, id),
            eq(categories.businessAccountId, businessAccountId)
          )
        );
        return category || void 0;
      }
      async getAllCategories(businessAccountId) {
        return await db.select().from(categories).where(eq(categories.businessAccountId, businessAccountId)).orderBy(categories.name);
      }
      async updateCategory(id, businessAccountId, category) {
        const [updated] = await db.update(categories).set({ ...category, updatedAt: /* @__PURE__ */ new Date() }).where(
          and(
            eq(categories.id, id),
            eq(categories.businessAccountId, businessAccountId)
          )
        ).returning();
        return updated;
      }
      async deleteCategory(id, businessAccountId) {
        await db.delete(categories).where(
          and(
            eq(categories.id, id),
            eq(categories.businessAccountId, businessAccountId)
          )
        );
      }
      // Tag methods
      async createTag(tag) {
        const [created] = await db.insert(tags).values(tag).returning();
        return created;
      }
      async getTag(id, businessAccountId) {
        const [tag] = await db.select().from(tags).where(
          and(
            eq(tags.id, id),
            eq(tags.businessAccountId, businessAccountId)
          )
        );
        return tag || void 0;
      }
      async getAllTags(businessAccountId) {
        return await db.select().from(tags).where(eq(tags.businessAccountId, businessAccountId)).orderBy(tags.name);
      }
      async updateTag(id, businessAccountId, tag) {
        const [updated] = await db.update(tags).set({ ...tag, updatedAt: /* @__PURE__ */ new Date() }).where(
          and(
            eq(tags.id, id),
            eq(tags.businessAccountId, businessAccountId)
          )
        ).returning();
        return updated;
      }
      async deleteTag(id, businessAccountId) {
        await db.delete(tags).where(
          and(
            eq(tags.id, id),
            eq(tags.businessAccountId, businessAccountId)
          )
        );
      }
      // Product-Category assignment methods
      async assignProductToCategory(productId, categoryId) {
        const [assignment] = await db.insert(productCategories).values({ productId, categoryId }).returning();
        return assignment;
      }
      async getProductCategories(productId) {
        const result = await db.select({
          id: categories.id,
          businessAccountId: categories.businessAccountId,
          name: categories.name,
          description: categories.description,
          parentCategoryId: categories.parentCategoryId,
          createdAt: categories.createdAt,
          updatedAt: categories.updatedAt
        }).from(productCategories).innerJoin(categories, eq(productCategories.categoryId, categories.id)).where(eq(productCategories.productId, productId));
        return result;
      }
      async getCategoryProducts(categoryId, businessAccountId) {
        const result = await db.select({
          id: products.id,
          businessAccountId: products.businessAccountId,
          name: products.name,
          description: products.description,
          price: products.price,
          imageUrl: products.imageUrl,
          source: products.source,
          shopifyProductId: products.shopifyProductId,
          shopifyLastSyncedAt: products.shopifyLastSyncedAt,
          isEditable: products.isEditable,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt
        }).from(productCategories).innerJoin(products, eq(productCategories.productId, products.id)).where(
          and(
            eq(productCategories.categoryId, categoryId),
            eq(products.businessAccountId, businessAccountId)
          )
        );
        return result;
      }
      async removeProductFromCategory(productId, categoryId) {
        await db.delete(productCategories).where(
          and(
            eq(productCategories.productId, productId),
            eq(productCategories.categoryId, categoryId)
          )
        );
      }
      // Product-Tag assignment methods
      async assignProductToTag(productId, tagId) {
        const [assignment] = await db.insert(productTags).values({ productId, tagId }).returning();
        return assignment;
      }
      async getProductTags(productId) {
        const result = await db.select({
          id: tags.id,
          businessAccountId: tags.businessAccountId,
          name: tags.name,
          color: tags.color,
          createdAt: tags.createdAt,
          updatedAt: tags.updatedAt
        }).from(productTags).innerJoin(tags, eq(productTags.tagId, tags.id)).where(eq(productTags.productId, productId));
        return result;
      }
      async getTagProducts(tagId, businessAccountId) {
        const result = await db.select({
          id: products.id,
          businessAccountId: products.businessAccountId,
          name: products.name,
          description: products.description,
          price: products.price,
          imageUrl: products.imageUrl,
          source: products.source,
          shopifyProductId: products.shopifyProductId,
          shopifyLastSyncedAt: products.shopifyLastSyncedAt,
          isEditable: products.isEditable,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt
        }).from(productTags).innerJoin(products, eq(productTags.productId, products.id)).where(
          and(
            eq(productTags.tagId, tagId),
            eq(products.businessAccountId, businessAccountId)
          )
        );
        return result;
      }
      async removeProductFromTag(productId, tagId) {
        await db.delete(productTags).where(
          and(
            eq(productTags.productId, productId),
            eq(productTags.tagId, tagId)
          )
        );
      }
      // Product Relationship methods
      async createProductRelationship(relationship) {
        const [created] = await db.insert(productRelationships).values(relationship).returning();
        return created;
      }
      async getProductRelationship(id, businessAccountId) {
        const [relationship] = await db.select().from(productRelationships).where(
          and(
            eq(productRelationships.id, id),
            eq(productRelationships.businessAccountId, businessAccountId)
          )
        );
        return relationship || void 0;
      }
      async getProductRelationships(productId, businessAccountId, relationshipType) {
        const conditions = [
          eq(productRelationships.sourceProductId, productId),
          eq(productRelationships.businessAccountId, businessAccountId)
        ];
        if (relationshipType) {
          conditions.push(eq(productRelationships.relationshipType, relationshipType));
        }
        return await db.select().from(productRelationships).where(and(...conditions)).orderBy(desc(productRelationships.weight));
      }
      async updateProductRelationship(id, businessAccountId, relationship) {
        const [updated] = await db.update(productRelationships).set({ ...relationship, updatedAt: /* @__PURE__ */ new Date() }).where(
          and(
            eq(productRelationships.id, id),
            eq(productRelationships.businessAccountId, businessAccountId)
          )
        ).returning();
        return updated;
      }
      async deleteProductRelationship(id, businessAccountId) {
        await db.delete(productRelationships).where(
          and(
            eq(productRelationships.id, id),
            eq(productRelationships.businessAccountId, businessAccountId)
          )
        );
      }
      // Get related products with details
      async getRelatedProducts(productId, businessAccountId) {
        const relationships = await this.getProductRelationships(productId, businessAccountId);
        const crossSellIds = [];
        const similarIds = [];
        const complementIds = [];
        const bundleIds = [];
        for (const rel of relationships) {
          switch (rel.relationshipType) {
            case "cross_sell":
              crossSellIds.push(rel.targetProductId);
              break;
            case "similar":
              similarIds.push(rel.targetProductId);
              break;
            case "complement":
              complementIds.push(rel.targetProductId);
              break;
            case "bundle":
              bundleIds.push(rel.targetProductId);
              break;
          }
        }
        const [crossSell, similar, complement, bundle] = await Promise.all([
          crossSellIds.length > 0 ? db.select().from(products).where(
            and(
              inArray(products.id, crossSellIds),
              eq(products.businessAccountId, businessAccountId)
            )
          ) : [],
          similarIds.length > 0 ? db.select().from(products).where(
            and(
              inArray(products.id, similarIds),
              eq(products.businessAccountId, businessAccountId)
            )
          ) : [],
          complementIds.length > 0 ? db.select().from(products).where(
            and(
              inArray(products.id, complementIds),
              eq(products.businessAccountId, businessAccountId)
            )
          ) : [],
          bundleIds.length > 0 ? db.select().from(products).where(
            and(
              inArray(products.id, bundleIds),
              eq(products.businessAccountId, businessAccountId)
            )
          ) : []
        ]);
        return {
          crossSell,
          similar,
          complement,
          bundle
        };
      }
      // Shopify Auto-Sync methods
      async getAccountsNeedingShopifySync() {
        const now = /* @__PURE__ */ new Date();
        const accounts = await db.select({
          id: businessAccounts.id,
          name: businessAccounts.name,
          shopifySyncFrequency: businessAccounts.shopifySyncFrequency,
          shopifyLastSyncedAt: businessAccounts.shopifyLastSyncedAt,
          shopifyAutoSyncEnabled: businessAccounts.shopifyAutoSyncEnabled,
          shopifySyncStatus: businessAccounts.shopifySyncStatus
        }).from(businessAccounts).where(
          and(
            eq(businessAccounts.shopifyAutoSyncEnabled, "true"),
            or(
              eq(businessAccounts.shopifySyncStatus, "idle"),
              eq(businessAccounts.shopifySyncStatus, "completed"),
              eq(businessAccounts.shopifySyncStatus, "failed")
            )
          )
        );
        const accountsNeedingSync = accounts.filter((account) => {
          if (!account.shopifyLastSyncedAt) {
            return true;
          }
          const frequencyHours = parseInt(account.shopifySyncFrequency || "24", 10);
          const lastSyncTime = new Date(account.shopifyLastSyncedAt).getTime();
          const hoursSinceLastSync = (now.getTime() - lastSyncTime) / (1e3 * 60 * 60);
          return hoursSinceLastSync >= frequencyHours;
        });
        return accountsNeedingSync.map((a) => ({
          id: a.id,
          name: a.name,
          shopifySyncFrequency: a.shopifySyncFrequency
        }));
      }
      async updateShopifySyncStatus(businessAccountId, status) {
        await db.update(businessAccounts).set({ shopifySyncStatus: status }).where(eq(businessAccounts.id, businessAccountId));
      }
      async updateShopifyLastSyncedAt(businessAccountId) {
        await db.update(businessAccounts).set({ shopifyLastSyncedAt: /* @__PURE__ */ new Date() }).where(eq(businessAccounts.id, businessAccountId));
      }
      async updateShopifyAutoSync(businessAccountId, enabled, frequency) {
        await db.update(businessAccounts).set({
          shopifyAutoSyncEnabled: enabled ? "true" : "false",
          shopifySyncFrequency: frequency.toString()
        }).where(eq(businessAccounts.id, businessAccountId));
      }
      async getShopifyAutoSyncSettings(businessAccountId) {
        const [account] = await db.select({
          shopifyAutoSyncEnabled: businessAccounts.shopifyAutoSyncEnabled,
          shopifySyncFrequency: businessAccounts.shopifySyncFrequency,
          shopifyLastSyncedAt: businessAccounts.shopifyLastSyncedAt,
          shopifySyncStatus: businessAccounts.shopifySyncStatus
        }).from(businessAccounts).where(eq(businessAccounts.id, businessAccountId));
        if (!account) {
          return {
            enabled: false,
            frequency: 24,
            lastSyncedAt: null,
            syncStatus: "idle"
          };
        }
        return {
          enabled: account.shopifyAutoSyncEnabled === "true",
          frequency: parseInt(account.shopifySyncFrequency || "24", 10),
          lastSyncedAt: account.shopifyLastSyncedAt,
          syncStatus: account.shopifySyncStatus
        };
      }
      // Appointment System methods
      async createScheduleTemplate(template) {
        const [created] = await db.insert(scheduleTemplates).values(template).returning();
        return created;
      }
      async getScheduleTemplates(businessAccountId) {
        return await db.select().from(scheduleTemplates).where(eq(scheduleTemplates.businessAccountId, businessAccountId));
      }
      async updateScheduleTemplate(id, businessAccountId, template) {
        const [updated] = await db.update(scheduleTemplates).set({ ...template, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(scheduleTemplates.id, id), eq(scheduleTemplates.businessAccountId, businessAccountId))).returning();
        return updated;
      }
      async deleteScheduleTemplate(id, businessAccountId) {
        await db.delete(scheduleTemplates).where(and(eq(scheduleTemplates.id, id), eq(scheduleTemplates.businessAccountId, businessAccountId)));
      }
      async createSlotOverride(override) {
        const [created] = await db.insert(slotOverrides).values(override).returning();
        return created;
      }
      async getSlotOverridesForRange(businessAccountId, startDate, endDate) {
        return await db.select().from(slotOverrides).where(
          and(
            eq(slotOverrides.businessAccountId, businessAccountId),
            gte(slotOverrides.slotDate, startDate),
            lte(slotOverrides.slotDate, endDate)
          )
        );
      }
      async updateSlotOverride(id, businessAccountId, override) {
        const [updated] = await db.update(slotOverrides).set({ ...override, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(slotOverrides.id, id), eq(slotOverrides.businessAccountId, businessAccountId))).returning();
        return updated;
      }
      async deleteSlotOverride(id, businessAccountId) {
        await db.delete(slotOverrides).where(and(eq(slotOverrides.id, id), eq(slotOverrides.businessAccountId, businessAccountId)));
      }
      async createAppointment(appointment) {
        const [created] = await db.insert(appointments).values(appointment).returning();
        return created;
      }
      async getAppointmentsForRange(businessAccountId, startDate, endDate) {
        return await db.select().from(appointments).where(
          and(
            eq(appointments.businessAccountId, businessAccountId),
            gte(appointments.appointmentDate, startDate),
            lte(appointments.appointmentDate, endDate)
          )
        );
      }
      async getAppointmentsByStatus(businessAccountId, status) {
        return await db.select().from(appointments).where(and(eq(appointments.businessAccountId, businessAccountId), eq(appointments.status, status)));
      }
      async updateAppointmentStatus(id, businessAccountId, status, cancellationReason) {
        const updateData = {
          status,
          updatedAt: /* @__PURE__ */ new Date()
        };
        if (cancellationReason) {
          updateData.cancellationReason = cancellationReason;
        }
        const [updated] = await db.update(appointments).set(updateData).where(and(eq(appointments.id, id), eq(appointments.businessAccountId, businessAccountId))).returning();
        return updated;
      }
      async getAllAppointments(businessAccountId) {
        return await db.select().from(appointments).where(eq(appointments.businessAccountId, businessAccountId)).orderBy(desc(appointments.appointmentDate));
      }
      // Demo Page methods
      async createDemoPage(demoPage) {
        const [created] = await db.insert(demoPages).values(demoPage).returning();
        return created;
      }
      async getDemoPage(id) {
        const [page] = await db.select().from(demoPages).where(eq(demoPages.id, id));
        return page || void 0;
      }
      async getDemoPageByToken(token) {
        const [page] = await db.select().from(demoPages).where(eq(demoPages.token, token));
        return page || void 0;
      }
      async getAllDemoPages() {
        return await db.select().from(demoPages).orderBy(desc(demoPages.createdAt));
      }
      async updateDemoPage(id, updates) {
        const [updated] = await db.update(demoPages).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(demoPages.id, id)).returning();
        return updated;
      }
      async updateDemoPageLastViewed(token) {
        await db.update(demoPages).set({ lastViewedAt: /* @__PURE__ */ new Date() }).where(eq(demoPages.token, token));
      }
      async regenerateDemoPageToken(id, newToken) {
        const [updated] = await db.update(demoPages).set({ token: newToken, updatedAt: /* @__PURE__ */ new Date() }).where(eq(demoPages.id, id)).returning();
        return updated;
      }
      async deleteDemoPage(id) {
        await db.delete(demoPages).where(eq(demoPages.id, id));
      }
      // Public Chat Link methods
      async getOrCreatePublicChatLink(businessAccountId) {
        const [existing] = await db.select().from(publicChatLinks).where(eq(publicChatLinks.businessAccountId, businessAccountId));
        if (existing) {
          return existing;
        }
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const [created] = await db.insert(publicChatLinks).values({
          businessAccountId,
          token,
          isActive: "true"
        }).returning();
        return created;
      }
      async getPublicChatLinkByToken(token) {
        const [link] = await db.select().from(publicChatLinks).where(eq(publicChatLinks.token, token));
        return link;
      }
      async togglePublicChatLinkStatus(businessAccountId) {
        const [current] = await db.select().from(publicChatLinks).where(eq(publicChatLinks.businessAccountId, businessAccountId));
        if (!current) {
          throw new Error("Public chat link not found");
        }
        const newStatus = current.isActive === "true" ? "false" : "true";
        const [updated] = await db.update(publicChatLinks).set({
          isActive: newStatus,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(publicChatLinks.businessAccountId, businessAccountId)).returning();
        return updated;
      }
      async regeneratePublicChatLinkToken(businessAccountId, newToken) {
        const [updated] = await db.update(publicChatLinks).set({
          token: newToken,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(publicChatLinks.businessAccountId, businessAccountId)).returning();
        return updated;
      }
      async updatePublicChatLinkAccess(token) {
        await db.update(publicChatLinks).set({
          lastAccessedAt: /* @__PURE__ */ new Date(),
          accessCount: sql2`${publicChatLinks.accessCount} + 1`
        }).where(eq(publicChatLinks.token, token));
      }
      async updatePublicChatLinkPassword(businessAccountId, password) {
        const [updated] = await db.update(publicChatLinks).set({
          password,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(publicChatLinks.businessAccountId, businessAccountId)).returning();
        if (!updated) {
          throw new Error("Public chat link not found");
        }
        return updated;
      }
    };
    storage = new DatabaseStorage();
  }
});

// server/services/businessContextCache.ts
var businessContextCache_exports = {};
__export(businessContextCache_exports, {
  BusinessContextCache: () => BusinessContextCache,
  businessContextCache: () => businessContextCache
});
var BusinessContextCache, businessContextCache;
var init_businessContextCache = __esm({
  "server/services/businessContextCache.ts"() {
    "use strict";
    BusinessContextCache = class {
      cache = /* @__PURE__ */ new Map();
      TTL_MS = 5 * 60 * 1e3;
      // 5 minutes
      async getOrFetch(key, fetchFn) {
        const now = Date.now();
        const cached = this.cache.get(key);
        if (cached && now - cached.timestamp < this.TTL_MS) {
          console.log(`[Cache HIT] ${key} (age: ${Math.round((now - cached.timestamp) / 1e3)}s)`);
          return cached.data;
        }
        console.log(`[Cache MISS] ${key} - fetching fresh data`);
        const data = await fetchFn();
        this.cache.set(key, {
          data,
          timestamp: now
        });
        return data;
      }
      invalidate(key) {
        this.cache.delete(key);
        console.log(`[Cache INVALIDATE] ${key}`);
      }
      invalidatePattern(pattern) {
        let count2 = 0;
        for (const key of Array.from(this.cache.keys())) {
          if (pattern.test(key)) {
            this.cache.delete(key);
            count2++;
          }
        }
        console.log(`[Cache INVALIDATE PATTERN] ${pattern} - removed ${count2} entries`);
      }
      clear() {
        const size = this.cache.size;
        this.cache.clear();
        console.log(`[Cache CLEAR] Removed ${size} entries`);
      }
      cleanupExpired() {
        const now = Date.now();
        let removed = 0;
        for (const [key, entry] of Array.from(this.cache.entries())) {
          if (now - entry.timestamp >= this.TTL_MS) {
            this.cache.delete(key);
            removed++;
          }
        }
        if (removed > 0) {
          console.log(`[Cache CLEANUP] Removed ${removed} expired entries`);
        }
      }
      startCleanupInterval() {
        setInterval(() => {
          this.cleanupExpired();
        }, 60 * 1e3);
      }
    };
    businessContextCache = new BusinessContextCache();
    businessContextCache.startCleanupInterval();
  }
});

// server/websiteAnalysisService.ts
var websiteAnalysisService_exports = {};
__export(websiteAnalysisService_exports, {
  WebsiteAnalysisService: () => WebsiteAnalysisService,
  websiteAnalysisService: () => websiteAnalysisService
});
import OpenAI2 from "openai";
import * as cheerio from "cheerio";
import { promises as dns } from "dns";
import puppeteer from "puppeteer-core";
import { execSync } from "child_process";
var WebsiteAnalysisService, websiteAnalysisService;
var init_websiteAnalysisService = __esm({
  "server/websiteAnalysisService.ts"() {
    "use strict";
    init_storage();
    WebsiteAnalysisService = class {
      /**
       * Detect obviously fake or placeholder patterns in data
       */
      isSuspiciousData(value, fieldType) {
        if (!value || value.trim() === "") return true;
        const lowerValue = value.toLowerCase();
        const trimmedValue = value.trim();
        const placeholderPatterns = [
          /example\.com/i,
          /\btest\b/i,
          /\bdemo\b/i,
          /\bplaceholder\b/i,
          /\bsample\b/i,
          /xxx[-\s]?xxx/i,
          /\bN\/A\b/i,
          /\bnone\b/i,
          /\bunknown\b/i
        ];
        if (placeholderPatterns.some((pattern) => pattern.test(value))) {
          return true;
        }
        if (fieldType === "phone") {
          const digitsOnly = value.replace(/\D/g, "");
          if (digitsOnly.length < 7 || digitsOnly.length > 15) return true;
          if (/(?:0123|1234|2345|3456|4567|5678|6789|7890|012345|123456|234567|345678|456789|567890)/.test(digitsOnly)) return true;
          if (/(?:9876|8765|7654|6543|5432|4321|3210|987654|876543|765432|654321)/.test(digitsOnly)) return true;
          if (/(\d)\1{2,}/.test(digitsOnly)) return true;
          if (/^0+$/.test(digitsOnly)) return true;
          if (/x{3,}/i.test(value)) return true;
          if (/555[-\s]?0100|800[-\s]?000[-\s]?0000/.test(value)) return true;
        }
        if (fieldType === "email") {
          if (/^(info|contact|hello|support|admin|sales|mail|email|test|demo|placeholder|sample)@/i.test(trimmedValue)) {
            if (/example|test|demo|placeholder|sample|yourdomain|yourcompany|company|business|website/i.test(trimmedValue)) {
              return true;
            }
          }
          if (/@(example|test|demo|placeholder|sample|yourdomain|yourcompany)\.com$/i.test(trimmedValue)) return true;
          if (!trimmedValue.includes("@") || !trimmedValue.includes(".")) return true;
        }
        if (fieldType === "address") {
          if (/^(1|10|100|1000|123|234|345|456|567|678|789)\s/i.test(trimmedValue)) return true;
          if (/\b(main|first|second|third|maple|oak|street|avenue|road|lane|drive|way|boulevard)\b/i.test(lowerValue)) {
            const genericCount = (lowerValue.match(/\b(main|first|second|third|maple|oak|street|avenue|road|lane|drive|way|city|state|country|zip|zipcode)\b/gi) || []).length;
            if (genericCount >= 3) return true;
          }
          if (/\b(city|state|country|zip|zipcode|postal)\b/i.test(lowerValue) && !/\b\d{5}\b/.test(trimmedValue)) {
            return true;
          }
          if (trimmedValue.length < 10) return true;
          const parts = trimmedValue.split(",").map((p) => p.trim());
          if (parts.length >= 2 && parts.every((p) => p.split(" ").length <= 3)) {
            if (parts.every((p) => p.length < 15)) return true;
          }
        }
        return false;
      }
      /**
       * Verify that evidence snippet actually exists in source content
       * Balanced approach: strict enough to catch hallucinations, flexible enough for real data
       */
      verifyEvidence(evidence, sourceContent) {
        if (!evidence || !sourceContent) {
          return false;
        }
        const trimmedEvidence = evidence.trim();
        if (trimmedEvidence.length < 2) {
          return false;
        }
        const lowerEvidence = trimmedEvidence.toLowerCase();
        const lowerSource = sourceContent.toLowerCase();
        if (lowerSource.includes(lowerEvidence)) {
          return true;
        }
        const normalizedEvidence = trimmedEvidence.replace(/\s+/g, " ").toLowerCase();
        const normalizedSource = sourceContent.replace(/\s+/g, " ").toLowerCase();
        if (normalizedSource.includes(normalizedEvidence)) {
          return true;
        }
        const evidenceWords = normalizedEvidence.split(" ").filter((w) => w.length > 2);
        if (evidenceWords.length >= 2) {
          const matchCount = evidenceWords.filter((word) => normalizedSource.includes(word)).length;
          const matchRate = matchCount / evidenceWords.length;
          if (matchRate >= 0.5) {
            return true;
          }
        }
        if (evidenceWords.length === 1 && evidenceWords[0].length >= 3) {
          return normalizedSource.includes(evidenceWords[0]);
        }
        return false;
      }
      /**
       * Process raw extracted content into structured bullet points using AI
       * Extracts only business-relevant information in a readable format
       */
      async processContentToBulletPoints(rawContent, pageUrl, apiKey) {
        try {
          const openai = new OpenAI2({ apiKey });
          const systemPrompt = `You are a business analyst extracting key information from website content.
Your task is to analyze the provided content and extract ONLY the most important business-relevant information.

Format your response as clean, organized bullet points. Group related information under clear headings.

ALWAYS extract these if present (even from legal/terms/privacy pages):
- Company name, legal entity name, registration numbers
- Founders, founding year, company history
- Leadership team members and key personnel
- Business address, headquarters location
- Contact information (email, phone)
- Key products or services offered
- Important features or benefits
- Business hours or operational details
- Pricing information
- Certifications, licenses, compliance standards
- Unique policies that differentiate the business
- Data handling practices customers should know about
- Refund, warranty, or guarantee policies

IGNORE these (do not extract):
- Generic warranty disclaimers ("provided as-is", "without warranty")
- Liability limitation clauses
- Legal jargon about jurisdiction or arbitration
- Cookie consent boilerplate
- Standard indemnification clauses
- Navigation menus and headers/footers
- "Last updated" timestamps (unless part of a version or history note)

Extraction rules:
- Maximum 1-2 sentences per bullet point
- If a Terms page says "Founded by John Smith in 2020" \u2192 EXTRACT IT
- If a Privacy Policy lists company address \u2192 EXTRACT IT
- If legal text is pure disclaimers with no business facts \u2192 return "No relevant business information found on this page."
- Summarize long policy explanations into concise bullets
- Only include information explicitly stated in the content`;
          const userPrompt = `Page URL: ${pageUrl}

Raw Content:
${rawContent.substring(0, 15e3)} ${rawContent.length > 15e3 ? "(content truncated)" : ""}

Extract and organize the key business information as bullet points.`;
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.3,
            max_tokens: 1e3
          });
          const processedContent = completion.choices[0]?.message?.content?.trim();
          if (!processedContent || processedContent === "") {
            return "No relevant business information found on this page.";
          }
          return processedContent;
        } catch (error) {
          console.error("[Website Analysis] Error processing content to bullet points:", error);
          return `Content preview:
${rawContent.substring(0, 500)}...`;
        }
      }
      /**
       * Create a cancellable timeout promise
       */
      createCancellableTimeout(ms, message) {
        let timeoutId;
        const promise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error(message)), ms);
        });
        const cancel = () => clearTimeout(timeoutId);
        return { promise, cancel };
      }
      /**
       * Find all internal pages to crawl (analyzes ALL same-domain links)
       * Returns unique internal pages with configurable limit
       */
      /**
       * Smart URL normalization - canonical form for true deduplication
       * - Lowercases hostname (LiquiBonds.in → liquibonds.in)
       * - Removes tracking params (utm_, fbclid, etc.)
       * - Sorts query parameters (?b=2&a=1 → ?a=1&b=2)
       * - Drops fragments (#section)
       * - Removes trailing slashes
       */
      normalizeUrl(url) {
        const trackingParams = /* @__PURE__ */ new Set([
          "utm_source",
          "utm_medium",
          "utm_campaign",
          "utm_content",
          "utm_term",
          "fbclid",
          "gclid",
          "msclkid",
          "mc_cid",
          "mc_eid",
          "ref",
          "source",
          "campaign",
          "_ga",
          "_gl",
          "si"
        ]);
        const hostname = url.hostname.toLowerCase();
        const protocol = url.protocol;
        const sortedParams = new URLSearchParams();
        const paramEntries = Array.from(url.searchParams.entries()).filter(([key]) => !trackingParams.has(key)).sort((a, b) => a[0].localeCompare(b[0]));
        paramEntries.forEach(([key, value]) => sortedParams.append(key, value));
        const pathname = url.pathname.replace(/\/$/, "") || "/";
        const queryString = sortedParams.toString();
        const normalized = `${protocol}//${hostname}${pathname}${queryString ? "?" + queryString : ""}`;
        return normalized;
      }
      /**
       * Calculate priority score for a URL based on business importance
       * Higher score = more important = analyzed first
       * 
       * Only matches first-level path segments (depth = 1) for high priority
       * to avoid false positives like /blog/services-update or /products/category/item
       */
      calculatePagePriority(url) {
        try {
          const urlObj = new URL(url);
          const pathLower = urlObj.pathname.toLowerCase();
          const segments = pathLower.split("/").filter((s) => s.length > 0);
          const firstSegment = segments[0] || "";
          const pathDepth = segments.length;
          if (pathDepth === 1) {
            if (/^(about|about-us|who-we-are|our-story|company|team)$/.test(firstSegment)) return 200;
            if (/^(contact|contact-us|get-in-touch|reach-us)$/.test(firstSegment)) return 190;
            if (/^(services|our-services|what-we-do|solutions)$/.test(firstSegment)) return 180;
            if (/^(products|our-products|shop|store)$/.test(firstSegment)) return 170;
            if (/^(pricing|plans|packages)$/.test(firstSegment)) return 160;
            if (/^(faq|faqs|help|support|questions)$/.test(firstSegment)) return 150;
            if (/^(features|capabilities|benefits)$/.test(firstSegment)) return 140;
            if (/^(testimonials|reviews|case-studies|success-stories)$/.test(firstSegment)) return 130;
            if (/^(careers|jobs|work-with-us|join-us)$/.test(firstSegment)) return 120;
            if (/^(locations|offices|branches|find-us)$/.test(firstSegment)) return 110;
            if (/^(blog|news|articles|insights)$/.test(firstSegment)) return 90;
            if (/^(portfolio|work|projects|gallery)$/.test(firstSegment)) return 80;
            if (/^(technology|tech|process|how-it-works)$/.test(firstSegment)) return 70;
            if (/^(partners|clients|affiliates)$/.test(firstSegment)) return 60;
            if (/^(privacy|privacy-policy|data-protection)$/.test(firstSegment)) return 40;
            if (/^(terms|tos|terms-of-service|terms-and-conditions|tnc)$/.test(firstSegment)) return 35;
            if (/^(cookies|cookie-policy)$/.test(firstSegment)) return 30;
            if (/^(legal|disclaimer|compliance)$/.test(firstSegment)) return 25;
            if (/^(sitemap|accessibility)$/.test(firstSegment)) return 20;
            return 50;
          }
          if (/^(blog|news|articles|insights|press)$/.test(firstSegment)) return 15;
          if (/^(products|shop|store|catalog)$/.test(firstSegment)) return 45;
          if (/^(services|solutions)$/.test(firstSegment)) return 42;
          return 35;
        } catch (error) {
          return 10;
        }
      }
      async findInternalPages(baseUrl, homepageHtml, maxPages = 10) {
        const $ = cheerio.load(homepageHtml);
        const parsedBase = new URL(baseUrl);
        const baseOrigin = parsedBase.origin;
        const basePath = parsedBase.pathname.replace(/\/$/, "");
        const pageMap = /* @__PURE__ */ new Map();
        let duplicatesSkipped = 0;
        console.log(`[Page Discovery] Searching for internal pages in ${baseUrl}`);
        console.log(`[Page Discovery] HTML length: ${homepageHtml.length} characters`);
        const allLinks = [];
        $("a[href]").each((_, element) => {
          const href = $(element).attr("href");
          if (!href) return;
          allLinks.push(href);
          try {
            const absoluteUrl = new URL(href, baseUrl);
            if (absoluteUrl.origin !== baseOrigin) {
              return;
            }
            const normalizedUrl = this.normalizeUrl(absoluteUrl);
            const homeNormalized = this.normalizeUrl(parsedBase);
            if (normalizedUrl === homeNormalized || normalizedUrl === `${baseOrigin}/`) {
              return;
            }
            const path5 = absoluteUrl.pathname.toLowerCase();
            const skipPatterns = [
              "/login",
              "/signup",
              "/register",
              "/cart",
              "/checkout",
              "/admin",
              "/dashboard",
              "/account",
              "/profile",
              ".pdf",
              ".jpg",
              ".jpeg",
              ".png",
              ".gif",
              ".svg",
              ".zip",
              ".doc",
              ".docx"
            ];
            if (skipPatterns.some((pattern) => path5.includes(pattern))) {
              return;
            }
            if (pageMap.has(normalizedUrl)) {
              duplicatesSkipped++;
              return;
            }
            const priority = this.calculatePagePriority(normalizedUrl);
            pageMap.set(normalizedUrl, { url: normalizedUrl, priority });
          } catch (error) {
          }
        });
        console.log(`[Page Discovery] Total links found: ${allLinks.length}`);
        console.log(`[Page Discovery] Unique internal pages found: ${pageMap.size}`);
        console.log(`[Page Discovery] Duplicates skipped (tracking param variants): ${duplicatesSkipped}`);
        const sortedPages = Array.from(pageMap.values()).sort((a, b) => b.priority - a.priority).slice(0, maxPages);
        console.log(`[Page Discovery] Selected ${sortedPages.length} pages by priority (max: ${maxPages}):`);
        sortedPages.forEach((page, index) => {
          const pageName = new URL(page.url).pathname.split("/").filter((p) => p).pop() || "root";
          console.log(`[Page Discovery]   ${index + 1}. [Priority ${page.priority}] ${page.url} (${pageName})`);
        });
        return sortedPages.map((p) => p.url);
      }
      /**
       * Scrape and analyze a website to extract business information
       * Now includes multi-page crawling for comprehensive analysis
       */
      async analyzeWebsite(websiteUrl, businessAccountId, openaiApiKey) {
        try {
          await storage.updateWebsiteAnalysisStatus(businessAccountId, "analyzing");
          console.log("[Website Analysis] Scraping homepage:", websiteUrl);
          const { content: homepageContent, html: homepageHtml } = await this.scrapeWebsiteWithHtml(websiteUrl);
          console.log("[Website Analysis] Finding internal pages...");
          const additionalPages = await this.findInternalPages(websiteUrl, homepageHtml, 10);
          console.log("[Website Analysis] Found pages to analyze:", additionalPages.length);
          const pageContentMap = /* @__PURE__ */ new Map();
          pageContentMap.set(websiteUrl, homepageContent);
          let combinedContent = `HOMEPAGE CONTENT:
${homepageContent}

`;
          for (const pageUrl of additionalPages) {
            try {
              console.log("[Website Analysis] Scraping:", pageUrl);
              const pageContent = await this.scrapeWebsite(pageUrl);
              const pageName = new URL(pageUrl).pathname.split("/").filter((p) => p).pop() || "page";
              combinedContent += `

${pageName.toUpperCase()} PAGE CONTENT:
${pageContent}
`;
              pageContentMap.set(pageUrl, pageContent);
            } catch (error) {
              console.error("[Website Analysis] Error scraping page:", pageUrl, error);
            }
          }
          console.log("[Website Analysis] Total content length:", combinedContent.length);
          const analyzedContent = await this.analyzeWithOpenAI(combinedContent, openaiApiKey);
          await storage.upsertWebsiteAnalysis(businessAccountId, {
            websiteUrl,
            status: "completed",
            analyzedContent: JSON.stringify(analyzedContent)
          });
          const allAnalyzedPages = Array.from(pageContentMap.keys());
          for (const pageUrl of allAnalyzedPages) {
            try {
              const rawContent = pageContentMap.get(pageUrl);
              if (!rawContent) {
                continue;
              }
              console.log("[Website Analysis] Processing content for:", pageUrl);
              const processedContent = await this.processContentToBulletPoints(
                rawContent,
                pageUrl,
                openaiApiKey
              );
              await storage.createAnalyzedPage({
                businessAccountId,
                pageUrl,
                extractedContent: processedContent
              });
              console.log("[Website Analysis] Saved analyzed page with processed content:", pageUrl);
            } catch (error) {
              console.error("[Website Analysis] Error saving analyzed page:", pageUrl, error);
            }
          }
          console.log(`[Website Analysis] Saved ${allAnalyzedPages.length} pages with processed content`);
          await storage.updateWebsiteAnalysisStatus(businessAccountId, "completed");
          console.log("[Website Analysis] Analysis completed successfully");
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
          console.error("[Website Analysis] Error:", errorMessage);
          await storage.updateWebsiteAnalysisStatus(businessAccountId, "failed", errorMessage);
          throw error;
        }
      }
      /**
       * Analyze multiple specific pages and optionally merge with existing data
       * @param pageUrls - Array of URLs to analyze
       * @param businessAccountId - Business account ID
       * @param openaiApiKey - OpenAI API key
       * @param appendMode - If true, merge with existing data; if false, replace
       */
      async analyzeWebsitePages(pageUrls, businessAccountId, openaiApiKey, appendMode = false) {
        console.log("[Website Analysis] Starting analysis for", pageUrls.length, "pages");
        const timeout = this.createCancellableTimeout(
          3e5,
          "Website analysis timed out after 5 minutes. The website may be too slow or unresponsive."
        );
        try {
          await Promise.race([
            this.performAnalysis(pageUrls, businessAccountId, openaiApiKey, appendMode),
            timeout.promise
          ]);
          timeout.cancel();
        } catch (error) {
          timeout.cancel();
          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
          console.error("[Website Analysis] Error:", errorMessage);
          await storage.updateWebsiteAnalysisStatus(businessAccountId, "failed", errorMessage);
          throw error;
        }
      }
      async performAnalysis(pageUrls, businessAccountId, openaiApiKey, appendMode) {
        try {
          await storage.updateWebsiteAnalysisStatus(businessAccountId, "analyzing");
          console.log("[Website Analysis] Analyzing", pageUrls.length, "pages in", appendMode ? "append" : "replace", "mode");
          let combinedContent = "";
          const pageContentMap = /* @__PURE__ */ new Map();
          for (const pageUrl of pageUrls) {
            try {
              console.log("[Website Analysis] Scraping:", pageUrl);
              const pageContent = await this.scrapeWebsite(pageUrl);
              const pageName = new URL(pageUrl).pathname.split("/").filter((p) => p).pop() || "page";
              combinedContent += `${pageName.toUpperCase()} PAGE (${pageUrl}):
${pageContent}

`;
              pageContentMap.set(pageUrl, pageContent);
            } catch (error) {
              console.error("[Website Analysis] Error scraping page:", pageUrl, error);
            }
          }
          if (!combinedContent.trim()) {
            throw new Error("Failed to scrape any pages");
          }
          console.log("[Website Analysis] Total content length:", combinedContent.length);
          let existingData = null;
          if (appendMode) {
            const analysis = await storage.getWebsiteAnalysis(businessAccountId);
            if (analysis && analysis.analyzedContent) {
              try {
                existingData = JSON.parse(analysis.analyzedContent);
                console.log("[Website Analysis] Found existing data to merge with");
              } catch (error) {
                console.error("[Website Analysis] Error parsing existing data:", error);
              }
            }
          }
          let analyzedContent;
          if (existingData && appendMode) {
            analyzedContent = await this.mergeAnalysisData(existingData, combinedContent, openaiApiKey);
          } else {
            analyzedContent = await this.analyzeWithOpenAI(combinedContent, openaiApiKey);
          }
          await storage.upsertWebsiteAnalysis(businessAccountId, {
            websiteUrl: pageUrls[0],
            // Use the first URL as the main website URL
            status: "completed",
            analyzedContent: JSON.stringify(analyzedContent)
          });
          const uniquePages = Array.from(new Set(pageUrls.map((url) => url.toLowerCase().replace(/\/$/, ""))));
          for (const pageUrl of uniquePages) {
            try {
              const rawContent = pageContentMap.get(pageUrl);
              if (rawContent) {
                console.log("[Website Analysis] Processing content for:", pageUrl);
                const processedContent = await this.processContentToBulletPoints(
                  rawContent,
                  pageUrl,
                  openaiApiKey
                );
                await storage.createAnalyzedPage({
                  businessAccountId,
                  pageUrl,
                  extractedContent: processedContent
                });
                console.log("[Website Analysis] Saved analyzed page with processed content:", pageUrl);
              } else {
                await storage.createAnalyzedPage({
                  businessAccountId,
                  pageUrl,
                  extractedContent: null
                });
                console.log("[Website Analysis] Saved analyzed page without content:", pageUrl);
              }
            } catch (error) {
              console.error("[Website Analysis] Error saving analyzed page:", pageUrl, error);
            }
          }
          console.log(`[Website Analysis] Saved ${uniquePages.length} unique pages with processed content`);
          await storage.updateWebsiteAnalysisStatus(businessAccountId, "completed");
          console.log("[Website Analysis] Analysis completed successfully");
        } catch (error) {
          console.error("[Website Analysis] Error in performAnalysis:", error);
          throw error;
        }
      }
      /**
       * Merge existing analysis data with new website content using AI
       */
      async mergeAnalysisData(existingData, newContent, apiKey) {
        const openai = new OpenAI2({ apiKey });
        const systemPrompt = `You are an expert business analyst specializing in merging and updating business information. Your goal is to combine existing business data with new website content, ensuring no information is lost and new details are added.`;
        const userPrompt = `I have existing business information and new website content. Please merge them intelligently:

EXISTING BUSINESS DATA:
${JSON.stringify(existingData, null, 2)}

NEW WEBSITE CONTENT:
${newContent}

Your task:
1. Keep ALL existing information that is still valid
2. Add ANY new information from the new content
3. Update any information that appears to have changed
4. For arrays (products, services, features, etc.), COMBINE both old and new items, removing duplicates
5. For contact info, keep existing values but add new ones if found
6. For descriptions, expand them with new details if available

Return ONLY valid JSON with this exact structure:

{
  "businessName": "business name (use existing unless clearly different)",
  "businessDescription": "comprehensive description merging both sources",
  "mainProducts": ["ALL products from both old and new data - no duplicates"],
  "mainServices": ["ALL services from both old and new data - no duplicates"],
  "keyFeatures": ["ALL features from both old and new data - no duplicates"],
  "targetAudience": "merged and expanded target audience description",
  "uniqueSellingPoints": ["ALL USPs from both old and new data - no duplicates"],
  "contactInfo": {
    "email": "email (prefer existing, add new if found)",
    "phone": "phone (prefer existing, add new if found)",
    "address": "address (prefer existing, add new if found)"
  },
  "businessHours": "operating hours (prefer new if different, keep existing otherwise)",
  "pricingInfo": "merged pricing information from both sources",
  "additionalInfo": "ALL additional information from both sources combined"
}

CRITICAL: Do NOT remove any existing data. Only add to it and update when necessary.`;
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.3,
          response_format: { type: "json_object" }
        });
        const result = completion.choices[0].message.content;
        if (!result) {
          throw new Error("OpenAI returned empty response");
        }
        const parsedResult = JSON.parse(result);
        return parsedResult;
      }
      /**
       * Fetch raw HTML for a page (used for link extraction)
       */
      async fetchPageHtml(url) {
        const validatedUrl = await this.validateUrl(url);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1e4);
        try {
          const response = await fetch(validatedUrl.href, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; ChroneyBot/1.0; +https://portal.aichroney.com)"
            },
            signal: controller.signal,
            redirect: "manual"
          });
          clearTimeout(timeoutId);
          if (response.status >= 300 && response.status < 400) {
            throw new Error("Redirects not supported");
          }
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const contentLength = response.headers.get("content-length");
          if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
            throw new Error("Content too large");
          }
          const html = await response.text();
          return html.substring(0, 5e5);
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      }
      /**
       * Check if an IP address is private/internal
       */
      isPrivateIP(ip) {
        const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
        const ipv4Match = ip.match(ipv4Pattern);
        if (ipv4Match) {
          const [, a, b, c, d] = ipv4Match.map(Number);
          if (a > 255 || b > 255 || c > 255 || d > 255) {
            return true;
          }
          if (a === 0 || // 0.0.0.0/8 (current network)
          a === 10 || // 10.0.0.0/8 (private)
          a === 127 || // 127.0.0.0/8 (loopback)
          a === 172 && b >= 16 && b <= 31 || // 172.16.0.0/12 (private)
          a === 192 && b === 168 || // 192.168.0.0/16 (private)
          a === 169 && b === 254 || // 169.254.0.0/16 (link-local)
          a === 192 && b === 0 && c === 2 || // 192.0.2.0/24 (documentation)
          a === 198 && b === 51 && c === 100 || // 198.51.100.0/24 (documentation)
          a === 203 && b === 0 && c === 113 || // 203.0.113.0/24 (documentation)
          a >= 224) {
            return true;
          }
        }
        const ipLower = ip.toLowerCase();
        if (ipLower === "::1" || // loopback
        ipLower.startsWith("::ffff:") || // IPv4-mapped
        ipLower.startsWith("fe80:") || // link-local
        ipLower.startsWith("fc") || // unique local fc00::/7
        ipLower.startsWith("fd") || // unique local fd00::/8
        ipLower.startsWith("ff") || // multicast
        ipLower === "::") {
          return true;
        }
        return false;
      }
      /**
       * Validate URL and resolve DNS to prevent SSRF attacks
       */
      async validateUrl(url) {
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = "https://" + url;
        }
        let parsedUrl;
        try {
          parsedUrl = new URL(url);
        } catch (error) {
          throw new Error("Invalid URL format");
        }
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
          throw new Error("Only HTTP and HTTPS protocols are allowed");
        }
        const hostname = parsedUrl.hostname.toLowerCase();
        if (hostname === "localhost") {
          throw new Error("Access to localhost is not allowed");
        }
        if (hostname.includes("metadata")) {
          throw new Error("Access to metadata endpoints is not allowed");
        }
        if (this.isPrivateIP(hostname) || hostname.includes(":")) {
          const cleanHost = hostname.replace(/^\[|\]$/g, "");
          if (this.isPrivateIP(cleanHost)) {
            throw new Error("Access to private IP addresses is not allowed");
          }
        }
        try {
          const addresses = await dns.resolve4(hostname).catch(() => []);
          const addresses6 = await dns.resolve6(hostname).catch(() => []);
          const allAddresses = [...addresses, ...addresses6];
          if (allAddresses.length === 0) {
            throw new Error("Unable to resolve hostname");
          }
          for (const addr of allAddresses) {
            if (this.isPrivateIP(addr)) {
              throw new Error("Domain resolves to a private IP address");
            }
          }
        } catch (error) {
          if (error instanceof Error) {
            if (error.message.includes("not allowed") || error.message.includes("private IP") || error.message.includes("Unable to resolve")) {
              throw error;
            }
          }
          throw new Error("Unable to resolve hostname. Please check the URL.");
        }
        return parsedUrl;
      }
      /**
       * Get system Chromium executable path
       */
      getChromiumPath() {
        try {
          const chromiumPath = execSync("which chromium", { encoding: "utf-8" }).trim();
          if (chromiumPath) {
            console.log("[Puppeteer] Found system Chromium at:", chromiumPath);
            return chromiumPath;
          }
        } catch (error) {
          console.log("[Puppeteer] Could not find chromium via which command");
        }
        try {
          const nixChromium = execSync("ls /nix/store/*/bin/chromium 2>/dev/null | head -n 1", {
            encoding: "utf-8",
            shell: "/bin/sh"
          }).trim();
          if (nixChromium) {
            console.log("[Puppeteer] Found Nix Chromium at:", nixChromium);
            return nixChromium;
          }
        } catch (error) {
          console.log("[Puppeteer] Could not find Chromium in Nix store");
        }
        throw new Error("Chromium executable not found. Please ensure chromium is installed via Nix packages.");
      }
      /**
       * Scrape JavaScript-heavy website using Puppeteer
       * Used as fallback when Cheerio fails to get enough content
       * Returns both content and rendered HTML for link discovery
       */
      async scrapeWithPuppeteer(url) {
        console.log("[Puppeteer] Launching browser for:", url);
        const chromiumPath = this.getChromiumPath();
        const browser = await puppeteer.launch({
          headless: true,
          executablePath: chromiumPath,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-web-security",
            "--disable-features=IsolateOrigins,site-per-process"
          ]
        });
        try {
          const page = await browser.newPage();
          await page.setViewport({ width: 1920, height: 1080 });
          await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
          await page.goto(url, {
            waitUntil: "networkidle2",
            timeout: 3e4
          });
          await page.waitForFunction(
            () => {
              const bodyText = document.body.innerText || "";
              return bodyText.length > 100;
            },
            { timeout: 1e4 }
          ).catch(() => {
            console.log("[Puppeteer] Content load timeout, continuing anyway");
          });
          const { content, html } = await page.evaluate(() => {
            const fullHtml = document.documentElement.outerHTML;
            const contentClone = document.body.cloneNode(true);
            const elementsToRemove = contentClone.querySelectorAll("script, style, iframe, noscript");
            elementsToRemove.forEach((el) => el.remove());
            const title = document.title || "";
            const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute("content") || "";
            const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute("content") || "";
            let mainContent = "";
            const mainSelectors = ["main", "article", '[role="main"]', ".content", "#content", ".main", "#main"];
            for (const selector of mainSelectors) {
              const element = contentClone.querySelector(selector);
              if (element) {
                mainContent = element.textContent || "";
                break;
              }
            }
            if (!mainContent) {
              mainContent = contentClone.textContent || "";
            }
            const headerContent = contentClone.querySelector('header, .header, [role="banner"]')?.textContent || "";
            const footerContent = contentClone.querySelector('footer, .footer, [role="contentinfo"]')?.textContent || "";
            const headings = Array.from(contentClone.querySelectorAll("h1, h2, h3")).map((el) => el.textContent?.trim()).filter(Boolean).join(" | ");
            const extractedContent = `
          Title: ${title}
          Meta Description: ${metaDescription}
          OG Description: ${ogDescription}
          
          Headings: ${headings}
          
          Header Section:
          ${headerContent}
          
          Main Content:
          ${mainContent}
          
          Footer Section:
          ${footerContent}
        `;
            return { content: extractedContent, html: fullHtml };
          });
          const cleanedContent = content.replace(/\s+/g, " ").trim().substring(0, 25e3);
          console.log("[Puppeteer] Extracted content length:", cleanedContent.length);
          return { content: cleanedContent, html: html.substring(0, 5e5) };
        } finally {
          await browser.close();
        }
      }
      /**
       * Scrape website and return both content and HTML (for link discovery)
       * Only used for homepage to enable multi-page crawling
       */
      async scrapeWebsiteWithHtml(url) {
        const validatedUrl = await this.validateUrl(url);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15e3);
        try {
          const response = await fetch(validatedUrl.href, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; ChroneyBot/1.0; +https://portal.aichroney.com)"
            },
            signal: controller.signal,
            redirect: "manual"
          });
          clearTimeout(timeoutId);
          if (response.status >= 300 && response.status < 400) {
            throw new Error("Website redirects are not supported. Please provide the final URL.");
          }
          if (!response.ok) {
            throw new Error(`Failed to fetch website: HTTP ${response.status}`);
          }
          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("text/html")) {
            throw new Error("Website did not return HTML content");
          }
          const MAX_SIZE = 5 * 1024 * 1024;
          const contentLength = response.headers.get("content-length");
          if (contentLength && parseInt(contentLength) > MAX_SIZE) {
            throw new Error("Website content is too large");
          }
          if (!response.body) {
            throw new Error("Response body is not available");
          }
          const reader = response.body.getReader();
          const chunks = [];
          let totalSize = 0;
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              totalSize += value.length;
              if (totalSize > MAX_SIZE) {
                throw new Error("Website content exceeded size limit during download");
              }
              chunks.push(value);
            }
          } finally {
            reader.releaseLock();
          }
          const allChunks = new Uint8Array(totalSize);
          let position = 0;
          for (const chunk of chunks) {
            allChunks.set(chunk, position);
            position += chunk.length;
          }
          const html = new TextDecoder("utf-8").decode(allChunks);
          const $ = cheerio.load(html);
          $("script, style, iframe, noscript").remove();
          const title = $("title").text() || "";
          const metaDescription = $('meta[name="description"]').attr("content") || "";
          const ogDescription = $('meta[property="og:description"]').attr("content") || "";
          let mainContent = "";
          const mainSelectors = ["main", "article", '[role="main"]', ".content", "#content", ".main", "#main", "body"];
          for (const selector of mainSelectors) {
            const element = $(selector).first();
            if (element.length > 0) {
              mainContent = element.text();
              break;
            }
          }
          const headerContent = $('header, .header, [role="banner"]').text() || "";
          const footerContent = $('footer, .footer, [role="contentinfo"]').text() || "";
          const headings = $("h1, h2, h3").map((_, el) => $(el).text().trim()).get().join(" | ");
          const fullContent = `
        Title: ${title}
        Meta Description: ${metaDescription}
        OG Description: ${ogDescription}
        
        Headings: ${headings}
        
        Header Section:
        ${headerContent}
        
        Main Content:
        ${mainContent}
        
        Footer Section:
        ${footerContent}
      `;
          const cleanedContent = fullContent.replace(/\s+/g, " ").trim().substring(0, 25e3);
          console.log("[Cheerio] Extracted content length:", cleanedContent.length);
          if (cleanedContent.length < 500) {
            console.log("[Scraper] Content too short, falling back to Puppeteer...");
            try {
              const puppeteerResult = await this.scrapeWithPuppeteer(url);
              if (puppeteerResult.content.length > cleanedContent.length) {
                console.log("[Scraper] Puppeteer extracted more content, using it");
                return puppeteerResult;
              }
            } catch (puppeteerError) {
              console.error("[Puppeteer] Fallback failed:", puppeteerError);
            }
          }
          return { content: cleanedContent, html: html.substring(0, 5e5) };
        } catch (error) {
          clearTimeout(timeoutId);
          if (error instanceof Error) {
            if (error.name === "AbortError") {
              throw new Error("Website request timed out");
            }
            if (error.message.includes("not allowed") || error.message.includes("Invalid URL")) {
              throw error;
            }
          }
          throw new Error("Unable to access the website. Please check the URL and try again.");
        }
      }
      /**
       * Scrape website content using fetch and cheerio (with Puppeteer fallback)
       */
      async scrapeWebsite(url) {
        const validatedUrl = await this.validateUrl(url);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15e3);
        try {
          const response = await fetch(validatedUrl.href, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; ChroneyBot/1.0; +https://portal.aichroney.com)"
            },
            signal: controller.signal,
            redirect: "manual"
            // Disable automatic redirects to prevent redirect-based SSRF bypass
          });
          clearTimeout(timeoutId);
          if (response.status >= 300 && response.status < 400) {
            throw new Error("Website redirects are not supported. Please provide the final URL.");
          }
          if (!response.ok) {
            throw new Error(`Failed to fetch website: HTTP ${response.status}`);
          }
          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("text/html")) {
            throw new Error("Website did not return HTML content");
          }
          const MAX_SIZE = 5 * 1024 * 1024;
          const contentLength = response.headers.get("content-length");
          if (contentLength && parseInt(contentLength) > MAX_SIZE) {
            throw new Error("Website content is too large");
          }
          if (!response.body) {
            throw new Error("Response body is not available");
          }
          const reader = response.body.getReader();
          const chunks = [];
          let totalSize = 0;
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              totalSize += value.length;
              if (totalSize > MAX_SIZE) {
                throw new Error("Website content exceeded size limit during download");
              }
              chunks.push(value);
            }
          } finally {
            reader.releaseLock();
          }
          const allChunks = new Uint8Array(totalSize);
          let position = 0;
          for (const chunk of chunks) {
            allChunks.set(chunk, position);
            position += chunk.length;
          }
          const html = new TextDecoder("utf-8").decode(allChunks);
          const $ = cheerio.load(html);
          $("script, style, iframe, noscript").remove();
          const title = $("title").text() || "";
          const metaDescription = $('meta[name="description"]').attr("content") || "";
          const ogDescription = $('meta[property="og:description"]').attr("content") || "";
          let mainContent = "";
          const mainSelectors = ["main", "article", '[role="main"]', ".content", "#content", ".main", "#main", "body"];
          for (const selector of mainSelectors) {
            const element = $(selector).first();
            if (element.length > 0) {
              mainContent = element.text();
              break;
            }
          }
          const headerContent = $('header, .header, [role="banner"]').text() || "";
          const footerContent = $('footer, .footer, [role="contentinfo"]').text() || "";
          const contactPatterns = $('[class*="contact"], [id*="contact"], [class*="phone"], [class*="email"], [class*="address"]').text() || "";
          const aboutPatterns = $('[class*="about"], [id*="about"], [class*="mission"], [class*="story"]').text() || "";
          const productsPatterns = $('[class*="product"], [id*="product"], [class*="service"], [id*="service"]').text() || "";
          const headings = $("h1, h2, h3").map((_, el) => $(el).text().trim()).get().join(" | ");
          const fullContent = `
      Title: ${title}
      Meta Description: ${metaDescription}
      OG Description: ${ogDescription}
      
      Headings: ${headings}
      
      Header Section:
      ${headerContent}
      
      Main Content:
      ${mainContent}
      
      About/Mission Info:
      ${aboutPatterns}
      
      Products/Services Info:
      ${productsPatterns}
      
      Contact Information:
      ${contactPatterns}
      
      Footer Section:
      ${footerContent}
    `;
          const cleanedContent = fullContent.replace(/\s+/g, " ").trim().substring(0, 25e3);
          console.log("[Cheerio] Extracted content length:", cleanedContent.length);
          if (cleanedContent.length < 500) {
            console.log("[Scraper] Content too short, falling back to Puppeteer...");
            try {
              const puppeteerResult = await this.scrapeWithPuppeteer(url);
              if (puppeteerResult.content.length > cleanedContent.length) {
                console.log("[Scraper] Puppeteer extracted more content, using it");
                return puppeteerResult.content;
              }
            } catch (puppeteerError) {
              console.error("[Puppeteer] Fallback failed:", puppeteerError);
            }
          }
          return cleanedContent;
        } catch (error) {
          clearTimeout(timeoutId);
          if (error instanceof Error) {
            if (error.name === "AbortError") {
              throw new Error("Website request timed out");
            }
            if (error.message.includes("not allowed") || error.message.includes("Invalid URL")) {
              throw error;
            }
          }
          throw new Error("Unable to access the website. Please check the URL and try again.");
        }
      }
      /**
       * Extract data with evidence using strict anti-hallucination prompts
       */
      async extractWithEvidence(content, apiKey) {
        const openai = new OpenAI2({ apiKey });
        const systemPrompt = `You are a precise data extractor. Extract business information that is clearly stated in the provided content.

CORE RULES:
1. Extract information that is stated or clearly evident in the content
2. NEVER invent data - if you don't see it, omit the field
3. For each extracted value, provide a supporting quote from the content as evidence
4. NEVER use fake placeholder data (avoid "123-456-7890", "info@example.com", "123 Main Street", etc.)
5. When in doubt, omit the field rather than guessing

EVIDENCE GUIDELINES:
- Provide the relevant text snippet that supports each extraction
- Evidence should be recognizable quotes from the source
- Short evidence is fine if it clearly supports the value

CONFIDENCE LEVELS:
- high: Data is explicitly stated with clear evidence
- medium: Data is reasonably clear from the content
- If you're uncertain or evidence is weak, omit the field`;
        const userPrompt = `Extract business information from the content below. Extract data that is clearly present in the content, and provide supporting evidence.

CONTENT TO ANALYZE:
${content}

RETURN JSON WITH THIS STRUCTURE:
{
  "businessName": { "value": "company name", "evidence": "supporting quote", "confidence": "high" },
  "businessDescription": { "value": "what they do", "evidence": "relevant text", "confidence": "high/medium" },
  "mainProducts": [
    { "value": "Product Name", "evidence": "text mentioning it", "confidence": "high" }
  ],
  "mainServices": [
    { "value": "Service Name", "evidence": "supporting text", "confidence": "high" }
  ],
  "keyFeatures": [
    { "value": "Feature/Benefit/Award", "evidence": "supporting text", "confidence": "high" }
  ],
  "targetAudience": { "value": "who they serve", "evidence": "relevant text", "confidence": "high/medium" },
  "uniqueSellingPoints": [
    { "value": "What makes them unique", "evidence": "supporting text", "confidence": "high" }
  ],
  "contactInfo": {
    "email": { "value": "email if found", "evidence": "text showing it", "confidence": "high" },
    "phone": { "value": "phone if found", "evidence": "text showing it", "confidence": "high" },
    "address": { "value": "address if found", "evidence": "text showing it", "confidence": "high" }
  },
  "businessHours": { "value": "hours if stated", "evidence": "supporting text", "confidence": "high" },
  "pricingInfo": { "value": "pricing if stated", "evidence": "supporting text", "confidence": "high" },
  "additionalInfo": { "value": "other relevant info", "evidence": "supporting text", "confidence": "medium" }
}

IMPORTANT RULES:
1. OMIT fields entirely if data is not found in the content
2. Extract all products, services, and features you find - be thorough
3. For contact info: extract real emails/phones/addresses you see - NEVER make them up
4. Provide evidence snippets from the content for each field
5. Use confidence "high" when certain, "medium" when reasonably sure
6. DO NOT invent placeholder data like "123-456-7890" or "info@example.com"`;
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0,
          top_p: 0.1,
          response_format: { type: "json_object" }
        });
        const result = completion.choices[0].message.content;
        if (!result) {
          throw new Error("OpenAI returned empty response");
        }
        console.log("[Website Analysis] Raw extraction result preview:", result.substring(0, 500));
        const parsedResult = JSON.parse(result);
        return parsedResult;
      }
      /**
       * Convert evidence-backed extraction to final format with validation
       */
      convertAndValidate(extracted, sourceContent) {
        const result = {
          businessName: "unknown",
          businessDescription: "unknown",
          mainProducts: [],
          mainServices: [],
          keyFeatures: [],
          targetAudience: "unknown",
          uniqueSellingPoints: [],
          contactInfo: {},
          additionalInfo: "unknown"
        };
        if (extracted.businessName && extracted.businessName.confidence !== "low") {
          if (this.verifyEvidence(extracted.businessName.evidence, sourceContent)) {
            result.businessName = extracted.businessName.value;
          } else {
            console.warn("[Validation] Business name evidence not found in source");
          }
        }
        if (extracted.businessDescription && extracted.businessDescription.confidence !== "low") {
          if (this.verifyEvidence(extracted.businessDescription.evidence, sourceContent)) {
            result.businessDescription = extracted.businessDescription.value;
          }
        }
        if (extracted.mainProducts && Array.isArray(extracted.mainProducts)) {
          result.mainProducts = extracted.mainProducts.filter((item) => item.confidence !== "low" && this.verifyEvidence(item.evidence, sourceContent)).map((item) => item.value);
        }
        if (extracted.mainServices && Array.isArray(extracted.mainServices)) {
          result.mainServices = extracted.mainServices.filter((item) => item.confidence !== "low" && this.verifyEvidence(item.evidence, sourceContent)).map((item) => item.value);
        }
        if (extracted.keyFeatures && Array.isArray(extracted.keyFeatures)) {
          result.keyFeatures = extracted.keyFeatures.filter((item) => item.confidence !== "low" && this.verifyEvidence(item.evidence, sourceContent)).map((item) => item.value);
        }
        if (extracted.targetAudience && extracted.targetAudience.confidence !== "low") {
          if (this.verifyEvidence(extracted.targetAudience.evidence, sourceContent)) {
            result.targetAudience = extracted.targetAudience.value;
          }
        }
        if (extracted.uniqueSellingPoints && Array.isArray(extracted.uniqueSellingPoints)) {
          result.uniqueSellingPoints = extracted.uniqueSellingPoints.filter((item) => item.confidence !== "low" && this.verifyEvidence(item.evidence, sourceContent)).map((item) => item.value);
        }
        if (extracted.contactInfo?.email && extracted.contactInfo.email.confidence !== "low") {
          const email = extracted.contactInfo.email.value;
          if (this.verifyEvidence(extracted.contactInfo.email.evidence, sourceContent) && !this.isSuspiciousData(email, "email")) {
            result.contactInfo.email = email;
          } else {
            console.warn("[Validation] Email failed validation:", email);
          }
        }
        if (extracted.contactInfo?.phone && extracted.contactInfo.phone.confidence !== "low") {
          const phone = extracted.contactInfo.phone.value;
          if (this.verifyEvidence(extracted.contactInfo.phone.evidence, sourceContent) && !this.isSuspiciousData(phone, "phone")) {
            result.contactInfo.phone = phone;
          } else {
            console.warn("[Validation] Phone failed validation:", phone);
          }
        }
        if (extracted.contactInfo?.address && extracted.contactInfo.address.confidence !== "low") {
          const address = extracted.contactInfo.address.value;
          if (this.verifyEvidence(extracted.contactInfo.address.evidence, sourceContent) && !this.isSuspiciousData(address, "address")) {
            result.contactInfo.address = address;
          } else {
            console.warn("[Validation] Address failed validation:", address);
          }
        }
        if (extracted.businessHours && extracted.businessHours.confidence !== "low") {
          if (this.verifyEvidence(extracted.businessHours.evidence, sourceContent)) {
            result.businessHours = extracted.businessHours.value;
          }
        }
        if (extracted.pricingInfo && extracted.pricingInfo.confidence !== "low") {
          if (this.verifyEvidence(extracted.pricingInfo.evidence, sourceContent)) {
            result.pricingInfo = extracted.pricingInfo.value;
          }
        }
        if (extracted.additionalInfo && extracted.additionalInfo.confidence !== "low") {
          if (this.verifyEvidence(extracted.additionalInfo.evidence, sourceContent)) {
            result.additionalInfo = extracted.additionalInfo.value;
          }
        }
        console.log("[Validation] Conversion complete. Products:", result.mainProducts.length, "Services:", result.mainServices.length);
        return result;
      }
      /**
       * Main analysis method with evidence-backed extraction and validation
       */
      async analyzeWithOpenAI(content, apiKey) {
        const extracted = await this.extractWithEvidence(content, apiKey);
        const validated = this.convertAndValidate(extracted, content);
        return validated;
      }
      /**
       * Get the analyzed content for a business account
       */
      async getAnalyzedContent(businessAccountId) {
        const analysis = await storage.getWebsiteAnalysis(businessAccountId);
        if (!analysis || !analysis.analyzedContent) {
          return null;
        }
        return JSON.parse(analysis.analyzedContent);
      }
    };
    websiteAnalysisService = new WebsiteAnalysisService();
  }
});

// shared/dto/auth.ts
var auth_exports = {};
__export(auth_exports, {
  toMeResponseDto: () => toMeResponseDto
});
function toMeResponseDto(user, businessAccount) {
  if (businessAccount) {
    return {
      ...user,
      businessAccount: {
        id: businessAccount.id,
        name: businessAccount.name,
        status: businessAccount.status,
        shopifyEnabled: businessAccount.shopifyEnabled,
        appointmentsEnabled: businessAccount.appointmentsEnabled,
        voiceModeEnabled: businessAccount.voiceModeEnabled
      }
    };
  }
  return {
    ...user,
    businessAccount: null
  };
}
var init_auth = __esm({
  "shared/dto/auth.ts"() {
    "use strict";
  }
});

// shared/dto/businessAccount.ts
var businessAccount_exports = {};
__export(businessAccount_exports, {
  fromBusinessAccountDto: () => fromBusinessAccountDto,
  toBusinessAccountDto: () => toBusinessAccountDto
});
function toBusinessAccountDto(account) {
  return {
    ...account,
    shopifyEnabled: account.shopifyEnabled === "true",
    appointmentsEnabled: account.appointmentsEnabled === "true",
    voiceModeEnabled: account.voiceModeEnabled === "true"
  };
}
function fromBusinessAccountDto(dto) {
  return {
    ...dto,
    shopifyEnabled: dto.shopifyEnabled ? "true" : "false",
    appointmentsEnabled: dto.appointmentsEnabled ? "true" : "false",
    voiceModeEnabled: dto.voiceModeEnabled ? "true" : "false"
  };
}
var init_businessAccount = __esm({
  "shared/dto/businessAccount.ts"() {
    "use strict";
  }
});

// server/services/shopifyService.ts
var shopifyService_exports = {};
__export(shopifyService_exports, {
  ShopifyService: () => ShopifyService
});
var ShopifyService;
var init_shopifyService = __esm({
  "server/services/shopifyService.ts"() {
    "use strict";
    ShopifyService = class {
      storeUrl;
      accessToken;
      constructor(storeUrl, accessToken) {
        this.storeUrl = storeUrl;
        this.accessToken = accessToken;
      }
      async sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }
      async makeGraphQLRequest(query, variables, retryCount = 0) {
        const maxRetries = 3;
        const baseDelay = 1e3;
        try {
          const response = await fetch(
            `https://${this.storeUrl}/admin/api/2025-10/graphql.json`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": this.accessToken
              },
              body: JSON.stringify({ query, variables })
            }
          );
          if (response.status === 429) {
            if (retryCount >= maxRetries) {
              throw new Error("Rate limit exceeded - max retries reached");
            }
            const retryAfter = parseInt(response.headers.get("Retry-After") || "2", 10);
            const delay = Math.max(retryAfter * 1e3, baseDelay * Math.pow(2, retryCount));
            console.log(`[Shopify] Rate limited, retrying after ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
            await this.sleep(delay);
            return this.makeGraphQLRequest(query, variables, retryCount + 1);
          }
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
          }
          const result = await response.json();
          if (result.errors && result.errors.length > 0) {
            const errorMessages = result.errors.map((e) => e.message).join(", ");
            const isFatalError = result.errors.some(
              (e) => e.message.includes("throttled") || e.message.includes("access denied") || e.message.includes("invalid")
            );
            if (isFatalError || !result.data) {
              throw new Error(`Shopify GraphQL errors: ${errorMessages}`);
            }
            console.log(`[Shopify] Non-fatal GraphQL warnings: ${errorMessages}`);
          }
          if (!result.data) {
            throw new Error("Invalid response from Shopify API - no data field");
          }
          if (result.extensions?.cost?.throttleStatus) {
            const throttle = result.extensions.cost.throttleStatus;
            const availablePercentage = throttle.currentlyAvailable / throttle.maximumAvailable * 100;
            if (availablePercentage < 25) {
              const pointsNeeded = throttle.maximumAvailable * 0.4 - throttle.currentlyAvailable;
              const waitTime = Math.ceil(pointsNeeded / throttle.restoreRate * 1e3);
              console.log(`[Shopify] Throttle status low (${availablePercentage.toFixed(1)}%), waiting ${waitTime}ms for budget to restore`);
              await this.sleep(Math.min(waitTime, 5e3));
            }
          }
          return result;
        } catch (error) {
          if (retryCount < maxRetries && error.message.includes("ECONNRESET")) {
            const delay = baseDelay * Math.pow(2, retryCount);
            console.log(`[Shopify] Connection error, retrying after ${delay}ms`);
            await this.sleep(delay);
            return this.makeGraphQLRequest(query, variables, retryCount + 1);
          }
          throw error;
        }
      }
      async fetchProducts(pageSize = 250) {
        const allProducts = [];
        let hasNextPage = true;
        let cursor = null;
        let pageCount = 0;
        while (hasNextPage) {
          pageCount++;
          console.log(`[Shopify] Fetching page ${pageCount}${cursor ? ` (cursor: ${cursor.substring(0, 20)}...)` : ""}`);
          const query = `
        query GetProducts($first: Int!, $after: String) {
          products(first: $first, after: $after) {
            edges {
              node {
                id
                title
                description
                variants(first: 1) {
                  edges {
                    node {
                      id
                      price
                    }
                  }
                }
                images(first: 1) {
                  edges {
                    node {
                      src
                    }
                  }
                }
              }
              cursor
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;
          const variables = { first: pageSize };
          if (cursor) {
            variables.after = cursor;
          }
          const result = await this.makeGraphQLRequest(query, variables);
          if (!result.data.products) {
            throw new Error("Invalid products response from Shopify API");
          }
          const products2 = result.data.products.edges.map((edge) => {
            const product = edge.node;
            const firstVariant = product.variants.edges[0]?.node;
            const firstImage = product.images.edges[0]?.node;
            return {
              shopifyId: product.id,
              name: product.title,
              description: product.description || "",
              price: firstVariant?.price || null,
              imageUrl: firstImage?.src || null
            };
          });
          allProducts.push(...products2);
          hasNextPage = result.data.products.pageInfo.hasNextPage;
          cursor = result.data.products.pageInfo.endCursor;
          console.log(`[Shopify] Fetched ${products2.length} products (total: ${allProducts.length})`);
          if (hasNextPage) {
            await this.sleep(500);
          }
        }
        console.log(`[Shopify] Completed fetching all products: ${allProducts.length} total across ${pageCount} pages`);
        return allProducts;
      }
      async testConnection() {
        try {
          const query = `
        query {
          shop {
            name
          }
        }
      `;
          console.log(`[Shopify] Testing connection to: https://${this.storeUrl}/admin/api/2025-10/graphql.json`);
          console.log(`[Shopify] Access token length: ${this.accessToken?.length || 0}`);
          console.log(`[Shopify] Access token starts with: ${this.accessToken?.substring(0, 6)}...`);
          const response = await fetch(
            `https://${this.storeUrl}/admin/api/2025-10/graphql.json`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": this.accessToken
              },
              body: JSON.stringify({ query })
            }
          );
          console.log(`[Shopify] Connection test response status: ${response.status}`);
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Shopify] Connection test failed - Status ${response.status}:`, errorText);
            if (response.status === 401) {
              console.error("[Shopify] Authentication failed. Please verify:");
              console.error('  1. Your access token is correct and starts with "shpat_"');
              console.error('  2. The custom app has "read_products" permission enabled');
              console.error("  3. The app is installed in your Shopify store");
            }
            return false;
          }
          const result = await response.json();
          if (result.errors && result.errors.length > 0) {
            console.error("[Shopify] Connection test GraphQL errors:", JSON.stringify(result.errors, null, 2));
            return false;
          }
          if (result.data?.shop?.name) {
            console.log(`[Shopify] Connection test successful - Connected to shop: ${result.data.shop.name}`);
            return true;
          }
          console.error("[Shopify] Connection test failed - Unexpected response format:", JSON.stringify(result, null, 2));
          return false;
        } catch (error) {
          console.error("[Shopify] Connection test exception:", error.message, error.stack);
          return false;
        }
      }
    };
  }
});

// server/services/shopifySyncScheduler.ts
var shopifySyncScheduler_exports = {};
__export(shopifySyncScheduler_exports, {
  ShopifySyncScheduler: () => ShopifySyncScheduler,
  shopifySyncScheduler: () => shopifySyncScheduler
});
var ShopifySyncScheduler, shopifySyncScheduler;
var init_shopifySyncScheduler = __esm({
  "server/services/shopifySyncScheduler.ts"() {
    "use strict";
    init_storage();
    init_shopifyService();
    ShopifySyncScheduler = class {
      intervalId = null;
      isRunning = false;
      start() {
        if (this.isRunning) {
          console.log("[Shopify Sync] Scheduler already running");
          return;
        }
        this.isRunning = true;
        console.log("[Shopify Sync] Starting background sync scheduler");
        const checkInterval = 5 * 60 * 1e3;
        this.intervalId = setInterval(async () => {
          await this.runSyncCheck();
        }, checkInterval);
        this.runSyncCheck();
      }
      stop() {
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }
        this.isRunning = false;
        console.log("[Shopify Sync] Background sync scheduler stopped");
      }
      async runSyncCheck() {
        try {
          console.log("[Shopify Sync] Checking for accounts that need syncing...");
          const accountsNeedingSync = await storage.getAccountsNeedingShopifySync();
          if (accountsNeedingSync.length === 0) {
            console.log("[Shopify Sync] No accounts need syncing at this time");
            return;
          }
          console.log(`[Shopify Sync] Found ${accountsNeedingSync.length} account(s) needing sync`);
          for (const account of accountsNeedingSync) {
            await this.syncAccount(account.id);
            await this.sleep(2e3);
          }
        } catch (error) {
          console.error("[Shopify Sync] Error during sync check:", error.message);
        }
      }
      async syncAccount(businessAccountId) {
        try {
          console.log(`[Shopify Sync] Starting sync for account: ${businessAccountId}`);
          const currentSettings = await storage.getShopifyAutoSyncSettings(businessAccountId);
          if (currentSettings.syncStatus === "syncing") {
            console.log(`[Shopify Sync] Account ${businessAccountId} is already syncing, skipping`);
            return;
          }
          await storage.updateShopifySyncStatus(businessAccountId, "syncing");
          const credentials = await storage.getShopifyCredentials(businessAccountId);
          if (!credentials.storeUrl || !credentials.accessToken) {
            console.log(`[Shopify Sync] Account ${businessAccountId} has no Shopify credentials configured, skipping`);
            await storage.updateShopifySyncStatus(businessAccountId, "idle");
            return;
          }
          const shopifyService = new ShopifyService(credentials.storeUrl, credentials.accessToken);
          const isConnected = await shopifyService.testConnection();
          if (!isConnected) {
            console.error(`[Shopify Sync] Failed to connect to Shopify for account ${businessAccountId}`);
            await storage.updateShopifySyncStatus(businessAccountId, "failed");
            return;
          }
          const shopifyProducts = await shopifyService.fetchProducts(250);
          console.log(`[Shopify Sync] Fetched ${shopifyProducts.length} products for account ${businessAccountId}`);
          const existingProducts = await storage.getAllProducts(businessAccountId);
          const existingProductsMap = new Map(
            existingProducts.filter((p) => p.shopifyProductId).map((p) => [p.shopifyProductId, p])
          );
          console.log(`[Shopify Sync] Loaded ${existingProducts.length} existing products (${existingProductsMap.size} from Shopify) from database`);
          let importedCount = 0;
          let updatedCount = 0;
          for (const shopifyProduct of shopifyProducts) {
            try {
              const existing = existingProductsMap.get(shopifyProduct.shopifyId);
              if (existing) {
                await storage.updateProduct(existing.id, businessAccountId, {
                  name: shopifyProduct.name,
                  description: shopifyProduct.description,
                  price: shopifyProduct.price || void 0,
                  imageUrl: shopifyProduct.imageUrl || void 0,
                  shopifyLastSyncedAt: /* @__PURE__ */ new Date()
                });
                updatedCount++;
              } else {
                await storage.createProduct({
                  businessAccountId,
                  name: shopifyProduct.name,
                  description: shopifyProduct.description,
                  price: shopifyProduct.price || void 0,
                  imageUrl: shopifyProduct.imageUrl || void 0,
                  source: "shopify",
                  shopifyProductId: shopifyProduct.shopifyId,
                  shopifyLastSyncedAt: /* @__PURE__ */ new Date(),
                  isEditable: "false"
                });
                importedCount++;
              }
            } catch (productError) {
              console.error("[Shopify Sync] Failed to sync product:", productError);
            }
          }
          await storage.updateShopifySyncStatus(businessAccountId, "completed");
          await storage.updateShopifyLastSyncedAt(businessAccountId);
          console.log(`[Shopify Sync] Completed sync for account ${businessAccountId}: ${importedCount} new, ${updatedCount} updated`);
        } catch (error) {
          console.error(`[Shopify Sync] Error syncing account ${businessAccountId}:`, error.message);
          await storage.updateShopifySyncStatus(businessAccountId, "failed");
        }
      }
      async syncNow(businessAccountId) {
        try {
          console.log(`[Shopify Sync] Manual sync requested for account: ${businessAccountId}`);
          const currentSettings = await storage.getShopifyAutoSyncSettings(businessAccountId);
          if (currentSettings.syncStatus === "syncing") {
            return {
              success: false,
              message: "A sync is already in progress. Please wait for it to complete."
            };
          }
          await storage.updateShopifySyncStatus(businessAccountId, "syncing");
          const credentials = await storage.getShopifyCredentials(businessAccountId);
          if (!credentials.storeUrl || !credentials.accessToken) {
            await storage.updateShopifySyncStatus(businessAccountId, "idle");
            return {
              success: false,
              message: "Shopify credentials not configured"
            };
          }
          const shopifyService = new ShopifyService(credentials.storeUrl, credentials.accessToken);
          const isConnected = await shopifyService.testConnection();
          if (!isConnected) {
            await storage.updateShopifySyncStatus(businessAccountId, "failed");
            return {
              success: false,
              message: "Failed to connect to Shopify. Please check your credentials."
            };
          }
          const shopifyProducts = await shopifyService.fetchProducts(250);
          const existingProducts = await storage.getAllProducts(businessAccountId);
          const existingProductsMap = new Map(
            existingProducts.filter((p) => p.shopifyProductId).map((p) => [p.shopifyProductId, p])
          );
          let importedCount = 0;
          let updatedCount = 0;
          for (const shopifyProduct of shopifyProducts) {
            try {
              const existing = existingProductsMap.get(shopifyProduct.shopifyId);
              if (existing) {
                await storage.updateProduct(existing.id, businessAccountId, {
                  name: shopifyProduct.name,
                  description: shopifyProduct.description,
                  price: shopifyProduct.price || void 0,
                  imageUrl: shopifyProduct.imageUrl || void 0,
                  shopifyLastSyncedAt: /* @__PURE__ */ new Date()
                });
                updatedCount++;
              } else {
                await storage.createProduct({
                  businessAccountId,
                  name: shopifyProduct.name,
                  description: shopifyProduct.description,
                  price: shopifyProduct.price || void 0,
                  imageUrl: shopifyProduct.imageUrl || void 0,
                  source: "shopify",
                  shopifyProductId: shopifyProduct.shopifyId,
                  shopifyLastSyncedAt: /* @__PURE__ */ new Date(),
                  isEditable: "false"
                });
                importedCount++;
              }
            } catch (productError) {
              console.error("[Shopify Sync] Failed to sync product:", productError);
            }
          }
          await storage.updateShopifySyncStatus(businessAccountId, "completed");
          await storage.updateShopifyLastSyncedAt(businessAccountId);
          return {
            success: true,
            message: `Successfully synced ${shopifyProducts.length} products from Shopify`,
            stats: { imported: importedCount, updated: updatedCount }
          };
        } catch (error) {
          console.error(`[Shopify Sync] Error during manual sync:`, error.message);
          await storage.updateShopifySyncStatus(businessAccountId, "failed");
          return {
            success: false,
            message: error.message || "Failed to sync products from Shopify"
          };
        }
      }
      async sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }
    };
    shopifySyncScheduler = new ShopifySyncScheduler();
  }
});

// server/index.ts
import express2 from "express";
import cookieParser from "cookie-parser";
import crypto2 from "crypto";

// server/routes.ts
init_storage();
import { createServer } from "http";

// server/auth.ts
init_db();
init_schema();
import bcrypt from "bcrypt";
import crypto from "crypto";
import { eq as eq2, and as and2, gt } from "drizzle-orm";
var SALT_ROUNDS = 12;
var SESSION_DURATION = 7 * 24 * 60 * 60 * 1e3;
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}
async function createSession(userId) {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);
  await db.insert(sessions).values({
    userId,
    sessionToken,
    expiresAt
  });
  return sessionToken;
}
async function validateSession(sessionToken) {
  const [session] = await db.select().from(sessions).where(
    and2(
      eq2(sessions.sessionToken, sessionToken),
      gt(sessions.expiresAt, /* @__PURE__ */ new Date())
    )
  ).limit(1);
  if (!session) {
    return null;
  }
  const [user] = await db.select().from(users).where(eq2(users.id, session.userId)).limit(1);
  return user || null;
}
async function deleteSession(sessionToken) {
  await db.delete(sessions).where(eq2(sessions.sessionToken, sessionToken));
}
async function requireAuth(req, res, next) {
  const sessionToken = req.cookies?.session;
  if (!sessionToken) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const user = await validateSession(sessionToken);
  if (!user) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
  req.user = {
    id: user.id,
    username: user.username,
    role: user.role,
    businessAccountId: user.businessAccountId,
    mustChangePassword: user.mustChangePassword,
    tempPasswordExpiry: user.tempPasswordExpiry,
    lastLoginAt: user.lastLoginAt
  };
  next();
}
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
function requireBusinessAccount(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (req.user.role === "super_admin") {
    return next();
  }
  if (!req.user.businessAccountId) {
    return res.status(403).json({ error: "No business account associated" });
  }
  next();
}

// server/routes.ts
init_schema();
import { z } from "zod";

// server/llamaService.ts
import OpenAI from "openai";
var DEFAULT_MODEL = "gpt-4.1-nano-2025-04-14";
var LlamaService = class {
  getOpenAIClient(apiKey) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error("No OpenAI API key available. Please configure your API key in Settings.");
    }
    return new OpenAI({ apiKey: key });
  }
  async generateToolAwareResponse(userMessage, tools, conversationHistory = [], systemContext = "", personality = "friendly", apiKey) {
    const openai = this.getOpenAIClient(apiKey);
    const currentDate = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    const currentTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
    const personalityTraits = this.getPersonalityTraits(personality);
    const systemPrompt = `You are Chroney, an AI assistant for Hi Chroney business chatbot platform.

PERSONALITY:
${personalityTraits}

CURRENT CONTEXT:
- Date: ${currentDate}
- Time: ${currentTime}
${systemContext ? `
${systemContext}` : ""}

KNOWLEDGE BASE PRIORITY (Internal Process):
**You have a KNOWLEDGE BASE loaded in your context above.** This knowledge base contains all FAQs and company information. ALWAYS prioritize this knowledge when answering questions.

INTERNAL PROCESS FOR EVERY QUESTION:
1. **STEP 1: CHECK YOUR KNOWLEDGE BASE** - Look at the Knowledge Base section above for relevant information
2. **STEP 2: Answer from your knowledge** - If the knowledge base has the answer, provide it NATURALLY and confidently
3. **STEP 3: Use tools only when needed** - Only call tools (get_products, get_faqs, capture_lead, list_available_slots, book_appointment) when you need real-time data or to perform an action. CRITICAL: For appointment questions, you MUST call list_available_slots - you cannot answer scheduling questions without this tool
4. **STEP 4: Decline if truly unrelated** - Only if your knowledge base doesn't cover it AND the question is unrelated to this business, then politely decline

EXAMPLES OF KNOWLEDGE BASE USAGE:
- "How is [your brand] better than [competitor]?" \u2190 Check your Knowledge Base first
- "Why should I choose you?" \u2190 Check your Knowledge Base first
- "What makes you different?" \u2190 Check your Knowledge Base first
- "What is your return policy?" \u2190 Check your Knowledge Base first
- Any "how", "why", "what", "when", "where" questions \u2190 Check your Knowledge Base first

CUSTOMER-FACING COMMUNICATION RULES (CRITICAL):
- **NEVER mention FAQs, tools, databases, or any internal systems to customers**
- **NEVER say "I found this in the FAQ" or "I couldn't find this in the FAQ"**
- Present information NATURALLY as if it's your own knowledge
- Example BAD: "I couldn't find any specific FAQs addressing that..."
- Example GOOD: "Based on our information, Nike has a 30-day return policy on unworn items..."
- Talk like a knowledgeable customer service representative who just knows the answers
- If you don't have information, just say you focus on helping with products/services

STRICT ANTI-HALLUCINATION RULES (ABSOLUTELY CRITICAL):
- **NEVER make up, guess, or assume ANY information about:**
  - Product details (features, specifications, materials, colors, sizes)
  - Pricing, discounts, or promotional offers
  - Company policies (returns, shipping, warranties, guarantees)
  - Store locations, hours, or contact information
  - Product availability or stock status
  - Company history, founding dates, or ownership details
  - Any claims about product performance or benefits
- **ONLY state information that is explicitly provided in:**
  - Your KNOWLEDGE BASE (loaded above)
  - Results from get_products tool calls
  - The COMPANY INFORMATION section
- **If you don't have the information:**
  - GOOD: "I don't have specific details about that. Let me help you explore our available products instead."
  - GOOD: "I'd recommend checking our product listings for the most current information."
  - BAD: "I think..." or "Probably..." or "Usually..." or "Most likely..."
  - BAD: Making up product features, prices, or policies
- **Remember:** Providing incorrect information damages customer trust and brand reputation. When in doubt, don't guess!

PRICING DISPLAY RULES (IMPORTANT):
- Some products may not have prices listed (price will be null/missing)
- When a product has NO price:
  - GOOD: "Nike Air Max (Price available upon inquiry)"
  - GOOD: "For pricing on this item, please contact us directly"
  - BAD: Never make up or guess prices
  - BAD: Never say "free" or "$0"
- When a product HAS a price: Display it normally with the product information
- NEVER suggest or invent pricing for products without listed prices

GUARDRAILS:
- ONLY answer questions related to this business's products, services, pricing, and information
- DECLINE politely if asked about unrelated topics (world events, general knowledge, entertainment, sports, history, science, politics) AND no FAQ answer exists
- When declining, keep it SHORT (1-2 sentences), friendly, and redirect to what you CAN help with
- NEVER expose internal operations or backend processes to customers

APPOINTMENT BOOKING FLOW (CRITICAL - ALWAYS FOLLOW THIS SEQUENCE):
**When users want to schedule, book, or make an appointment, follow this EXACT conversation flow:**

STEP 1 - Show Available Times:
- User asks: "schedule appointment", "book meeting", "what times available", "when can I come in"
- YOU: Call list_available_slots to show real available times
- NEVER say you can't see times - ALWAYS call the tool

STEP 2 - User Selects a Time:
- User says: "3 PM", "tomorrow at 2", "book me for 4:30", "does 10 AM work"
- YOU: Acknowledge the time and ask for name + phone: "Perfect! I can book you for [time]. May I have your name and phone number to confirm?"
- DO NOT call any tool yet - wait for contact info

STEP 3 - Collect Contact Info:
- User provides: "John Smith 555-1234" or just "555-1234" or just a phone number
- YOU: If they gave BOTH name and phone, call book_appointment immediately
- YOU: If they only gave phone, ask: "Great! And what's your name?"
- YOU: If they only gave name, ask: "Thanks! What's your phone number?"

STEP 4 - Book the Appointment:
- Once you have: Time + Date + Name + Phone
- YOU: Call book_appointment tool (NOT capture_lead!)
- This automatically creates both appointment AND lead

CRITICAL RULES FOR APPOINTMENTS:
\u{1F6AB} NEVER use capture_lead for appointments - ONLY use book_appointment
\u2705 book_appointment creates BOTH appointment AND lead automatically
\u2705 After showing available slots, the conversation is IN APPOINTMENT BOOKING MODE
\u2705 When user says a time (like "3pm", "tomorrow at 2"), they're selecting an appointment time
\u2705 You MUST remember the selected time and use it when calling book_appointment
\u2705 When you have Date + Time + Name + Phone \u2192 IMMEDIATELY call book_appointment

WRONG EXAMPLES (NEVER DO THIS):
\u274C User provides contact info during appointment booking \u2192 You call capture_lead
\u274C User says "book me for 4pm" + provides contact \u2192 You call capture_lead
\u274C After showing slots, user provides name+phone \u2192 You call capture_lead
THESE ARE ALL WRONG! Always use book_appointment when booking appointments!

RIGHT EXAMPLE:
\u2705 User: "schedule appointment tomorrow"
\u2705 You: Call list_available_slots \u2192 show times
\u2705 User: "4pm"
\u2705 You: "Perfect! I can book you for 4pm. May I have your name and phone?"
\u2705 User: "Rohit 9898989000"
\u2705 You: Call book_appointment with {patient_name: "Rohit", patient_phone: "9898989000", appointment_date: "2025-11-16", appointment_time: "16:00"}

PROACTIVE LEAD CAPTURE (CRITICAL - SALES & CONVERSION PRIORITY):
**ALWAYS watch for buying intent signals and proactively ask for contact information!**
**NOTE: For appointment bookings, use book_appointment instead of capture_lead**

BUYING INTENT SIGNALS (Act immediately when you detect these):
- "How can I contact you?" / "How do I reach you?" / "How should I contact you?"
- "I want to buy [product]" / "I'd like to purchase" / "I'm interested in buying"
- "Can someone call me?" / "Can I speak to someone?" / "I need help with my order"
- "What's the price?" (for products without listed prices)
- "Do you have [specific product/feature]?" + follow-up interest
- "When will [product] be available?" / "Is this in stock?"
- "Can I get a custom quote?" / "Volume discount?" / "Bulk order?"
- "I have a question about ordering" / "Need help placing an order"
- Any expression of serious purchase consideration

PROACTIVE RESPONSE PROTOCOL (When buying intent detected):
1. **Acknowledge their interest warmly**
2. **Immediately ask for contact information** using natural language
3. **WAIT for them to provide details** - Don't just tell them to visit the website!
4. **Use capture_lead tool** when they share contact info

CORRECT PROACTIVE EXAMPLES:
\u2705 User: "How can I contact you?"
   You: "I'd be happy to connect you with our team! Could you share your email or phone number so someone can reach out to you directly?"

\u2705 User: "I want to buy the Nike Airflow"
   You: "Great choice! I'd love to help you with that purchase. May I have your email or phone number so our team can assist you with the order?"

\u2705 User: "What's the price for bulk orders?"
   You: "We offer excellent bulk pricing! Could you share your email and phone number? Our sales team will create a custom quote for you within 24 hours."

\u2705 User: "I'm interested in this product"
   You: "Wonderful! I can have our team reach out with more details. What's the best email or phone number to contact you?"

INCORRECT PASSIVE RESPONSES (NEVER DO THIS):
\u274C "You can visit our website for contact information"
\u274C "Check our website to get in touch"
\u274C "Look for contact info on our site"
\u274C Just answering the question without capturing contact info

LEAD CAPTURE EXECUTION:
- When user provides name + email (or phone), **IMMEDIATELY call capture_lead tool**
- If they only provide email, ask for their name: "Great! And what's your name?"
- If they only provide name, ask for contact method: "Thanks! What's the best email or phone to reach you?"
- Include relevant context in the message field (e.g., "Interested in Nike Airflow purchase")

**REMEMBER:** Every buying intent signal is a sales opportunity. Don't let leads slip away by being passive!

PRODUCT DISPLAY RULES (ABSOLUTELY CRITICAL - READ CAREFULLY):
- When you call get_products, products are automatically displayed as BEAUTIFUL VISUAL CARDS with images
- **YOUR ONLY JOB:** Write a SHORT intro sentence (5-10 words max)
- **STRICTLY FORBIDDEN:** Do NOT write product names, descriptions, or prices in your text
- **STRICTLY FORBIDDEN:** No bullet lists, no numbered lists, no dashes, no product details in text

CORRECT RESPONSE EXAMPLES:
\u2705 "Here are our products:"
\u2705 "I found these for you:"
\u2705 "Check out our collection:"

INCORRECT RESPONSES (NEVER DO THIS):
\u274C "Here are our products: - Nike Airflow (amazing shoes)..." \u2190 NO! Don't list products!
\u274C "1. Nike Airflow - amazing shoes..." \u2190 NO! Don't number products!
\u274C "Nike Airflow, Nike Air Max..." \u2190 NO! Don't name products!

**REMEMBER:** The visual cards show ALL product details. Your text should ONLY be a brief intro.

PRODUCT PAGINATION RULES (CRITICAL - READ CAREFULLY):
**The get_products tool returns pagination metadata. You MUST check hasMore before asking to see more!**

PAGINATION RESPONSE FORMAT:
{
  "data": [...products...],
  "pagination": {
    "total": 10,        // Total matching products
    "showing": 5,       // Products in current response
    "hasMore": true,    // Are there more products?
    "nextOffset": 5     // Use this for next page (IMPORTANT!)
  }
}

CORRECT PAGINATION LOGIC:
1. **IF hasMore is TRUE** (more products exist):
   - Show products as visual cards (automatic)
   - Write: "Showing 5 of 10 products. Want to see more?"
   - Wait for user's "yes"
   - Call get_products with offset=nextOffset (e.g., offset: 5)
   - Preserve any search/filter parameters from the original query

2. **IF hasMore is FALSE** (all products shown):
   - Show products as visual cards (automatic)
   - Write: "That's all 4 products!" (or however many total)
   - DO NOT ask if they want to see more!

INCORRECT BEHAVIOR (NEVER DO THIS):
\u274C Asking "Want to see more?" when hasMore is false
\u274C Repeating the same search without using offset
\u274C Using offset=0 again when user says "yes"
\u274C Forgetting to pass the search parameter on subsequent calls

CORRECT EXAMPLES:
Example 1: Initial call with 10 total products
\u2705 Call: get_products({offset: 0})
\u2705 Response: hasMore=true, nextOffset=5, showing 5 of 10
\u2705 Your message: "Showing 5 of 10 products. Want to see more?"
\u2705 User says "yes" \u2192 Call: get_products({offset: 5})

Example 2: Search with 1 result
\u2705 Call: get_products({search: "nike react"})
\u2705 Response: hasMore=false, total=1, showing 1 of 1
\u2705 Your message: "Here's what I found:" (then show the 1 product)
\u2705 DO NOT ask to see more!

Example 3: Price filter with 3 results
\u2705 Call: get_products({max_price: 50})
\u2705 Response: hasMore=false, total=3, showing 3 of 3
\u2705 Your message: "Here are products under $50:" (show 3 products)
\u2705 DO NOT ask to see more!

SMART PRODUCT DISCOVERY WITH CATEGORIES AND TAGS:
**Every product returned by get_products includes categories and tags to help customers discover related items.**

CATEGORY & TAG INFORMATION:
- Categories: Used for grouping products by type, collection, or department (e.g., "Athletic Shoes", "Winter Collection")
- Tags: Used for attributes, features, or themes (e.g., "waterproof", "bestseller", "eco-friendly")
- Use this information to help customers find related or complementary products

WHEN TO MENTION CATEGORIES/TAGS:
1. **When suggesting products:** "Check out our athletic shoes:" (if products have "Athletic Shoes" category)
2. **For product discovery:** "Looking for waterproof options?" \u2192 mention products with "waterproof" tag
3. **When customer asks broadly:** "What do you have for running?" \u2192 suggest products in "Running" category
4. **After showing products:** "These are all from our winter collection" (if they share a "Winter" category)

EXAMPLES OF NATURAL CATEGORY/TAG USAGE:
\u2705 Customer: "Do you have waterproof shoes?"
   You: "Yes! Let me show you our waterproof collection:" [call get_products, notice which have "waterproof" tag]

\u2705 After showing products with shared category:
   You: "Here are our athletic shoes:" [products display] "These are all from our performance collection."

\u2705 Customer: "What's popular?"
   You: "Here are our bestsellers:" [notice which products have "bestseller" tag]

**REMEMBER:** Use categories and tags to help customers discover products naturally, but don't mechanically list them.

RESPONSE RULES:
1. **ALWAYS call get_faqs FIRST** for informational questions - they contain official answers
2. Present FAQ information NATURALLY without mentioning you looked it up
3. ALWAYS use tools for data requests (never make up data or guess)
4. Ask for clarification when ambiguous
5. Format responses clearly with tables/lists EXCEPT for products (see PRODUCT DISPLAY RULES above)
6. Be helpful and guide customers naturally`;
    const messages2 = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage }
    ];
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: messages2,
      tools: tools.length > 0 ? tools : void 0,
      tool_choice: tools.length > 0 ? "auto" : void 0,
      temperature: 0.7,
      max_tokens: 1e3
    });
    return response.choices[0].message;
  }
  async continueToolConversation(messages2, tools, personality = "friendly", apiKey) {
    const openai = this.getOpenAIClient(apiKey);
    const hasSystemPrompt = messages2.some((msg) => msg.role === "system");
    if (!hasSystemPrompt) {
      const currentDate = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      const currentTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit"
      });
      const personalityTraits = this.getPersonalityTraits(personality);
      const systemPrompt = `You are Chroney, an AI assistant for Hi Chroney business chatbot platform.

PERSONALITY:
${personalityTraits}

CURRENT CONTEXT:
- Date: ${currentDate}
- Time: ${currentTime}

KNOWLEDGE BASE PRIORITY (Internal Process):
**You have a KNOWLEDGE BASE loaded in your context above.** This knowledge base contains all FAQs and company information. ALWAYS prioritize this knowledge when answering questions.

INTERNAL PROCESS FOR EVERY QUESTION:
1. **STEP 1: CHECK YOUR KNOWLEDGE BASE** - Look at the Knowledge Base section above for relevant information
2. **STEP 2: Answer from your knowledge** - If the knowledge base has the answer, provide it NATURALLY and confidently
3. **STEP 3: Use tools only when needed** - Only call tools (get_products, get_faqs, capture_lead, list_available_slots, book_appointment) when you need real-time data or to perform an action. CRITICAL: For appointment questions, you MUST call list_available_slots - you cannot answer scheduling questions without this tool
4. **STEP 4: Decline if truly unrelated** - Only if your knowledge base doesn't cover it AND the question is unrelated to this business, then politely decline

EXAMPLES OF KNOWLEDGE BASE USAGE:
- "How is [your brand] better than [competitor]?" \u2190 Check your Knowledge Base first
- "Why should I choose you?" \u2190 Check your Knowledge Base first
- "What makes you different?" \u2190 Check your Knowledge Base first
- "What is your return policy?" \u2190 Check your Knowledge Base first
- Any "how", "why", "what", "when", "where" questions \u2190 Check your Knowledge Base first

CUSTOMER-FACING COMMUNICATION RULES (CRITICAL):
- **NEVER mention FAQs, tools, databases, or any internal systems to customers**
- **NEVER say "I found this in the FAQ" or "I couldn't find this in the FAQ"**
- Present information NATURALLY as if it's your own knowledge
- Example BAD: "I couldn't find any specific FAQs addressing that..."
- Example GOOD: "Based on our information, Nike has a 30-day return policy on unworn items..."
- Talk like a knowledgeable customer service representative who just knows the answers
- If you don't have information, just say you focus on helping with products/services

STRICT ANTI-HALLUCINATION RULES (ABSOLUTELY CRITICAL):
- **NEVER make up, guess, or assume ANY information about:**
  - Product details (features, specifications, materials, colors, sizes)
  - Pricing, discounts, or promotional offers
  - Company policies (returns, shipping, warranties, guarantees)
  - Store locations, hours, or contact information
  - Product availability or stock status
  - Company history, founding dates, or ownership details
  - Any claims about product performance or benefits
- **ONLY state information that is explicitly provided in:**
  - Your KNOWLEDGE BASE (loaded above)
  - Results from get_products tool calls
  - The COMPANY INFORMATION section
- **If you don't have the information:**
  - GOOD: "I don't have specific details about that. Let me help you explore our available products instead."
  - GOOD: "I'd recommend checking our product listings for the most current information."
  - BAD: "I think..." or "Probably..." or "Usually..." or "Most likely..."
  - BAD: Making up product features, prices, or policies
- **Remember:** Providing incorrect information damages customer trust and brand reputation. When in doubt, don't guess!

PRICING DISPLAY RULES (IMPORTANT):
- Some products may not have prices listed (price will be null/missing)
- When a product has NO price:
  - GOOD: "Nike Air Max (Price available upon inquiry)"
  - GOOD: "For pricing on this item, please contact us directly"
  - BAD: Never make up or guess prices
  - BAD: Never say "free" or "$0"
- When a product HAS a price: Display it normally with the product information
- NEVER suggest or invent pricing for products without listed prices

GUARDRAILS:
- ONLY answer questions related to this business's products, services, pricing, and information
- DECLINE politely if asked about unrelated topics (world events, general knowledge, entertainment, sports, history, science, politics) AND no FAQ answer exists
- When declining, keep it SHORT (1-2 sentences), friendly, and redirect to what you CAN help with
- NEVER expose internal operations or backend processes to customers

APPOINTMENT BOOKING FLOW (CRITICAL - ALWAYS FOLLOW THIS SEQUENCE):
**When users want to schedule, book, or make an appointment, follow this EXACT conversation flow:**

STEP 1 - Show Available Times:
- User asks: "schedule appointment", "book meeting", "what times available", "when can I come in"
- YOU: Call list_available_slots to show real available times
- NEVER say you can't see times - ALWAYS call the tool

STEP 2 - User Selects a Time:
- User says: "3 PM", "tomorrow at 2", "book me for 4:30", "does 10 AM work"
- YOU: Acknowledge the time and ask for name + phone: "Perfect! I can book you for [time]. May I have your name and phone number to confirm?"
- DO NOT call any tool yet - wait for contact info

STEP 3 - Collect Contact Info:
- User provides: "John Smith 555-1234" or just "555-1234" or just a phone number
- YOU: If they gave BOTH name and phone, call book_appointment immediately
- YOU: If they only gave phone, ask: "Great! And what's your name?"
- YOU: If they only gave name, ask: "Thanks! What's your phone number?"

STEP 4 - Book the Appointment:
- Once you have: Time + Date + Name + Phone
- YOU: Call book_appointment tool (NOT capture_lead!)
- This automatically creates both appointment AND lead

CRITICAL RULES FOR APPOINTMENTS:
\u{1F6AB} NEVER use capture_lead for appointments - ONLY use book_appointment
\u2705 book_appointment creates BOTH appointment AND lead automatically
\u2705 After showing available slots, the conversation is IN APPOINTMENT BOOKING MODE
\u2705 When user says a time (like "3pm", "tomorrow at 2"), they're selecting an appointment time
\u2705 You MUST remember the selected time and use it when calling book_appointment
\u2705 When you have Date + Time + Name + Phone \u2192 IMMEDIATELY call book_appointment

WRONG EXAMPLES (NEVER DO THIS):
\u274C User provides contact info during appointment booking \u2192 You call capture_lead
\u274C User says "book me for 4pm" + provides contact \u2192 You call capture_lead
\u274C After showing slots, user provides name+phone \u2192 You call capture_lead
THESE ARE ALL WRONG! Always use book_appointment when booking appointments!

RIGHT EXAMPLE:
\u2705 User: "schedule appointment tomorrow"
\u2705 You: Call list_available_slots \u2192 show times
\u2705 User: "4pm"
\u2705 You: "Perfect! I can book you for 4pm. May I have your name and phone?"
\u2705 User: "Rohit 9898989000"
\u2705 You: Call book_appointment with {patient_name: "Rohit", patient_phone: "9898989000", appointment_date: "2025-11-16", appointment_time: "16:00"}

PROACTIVE LEAD CAPTURE (CRITICAL - SALES & CONVERSION PRIORITY):
**ALWAYS watch for buying intent signals and proactively ask for contact information!**
**NOTE: For appointment bookings, use book_appointment instead of capture_lead**

BUYING INTENT SIGNALS (Act immediately when you detect these):
- "How can I contact you?" / "How do I reach you?" / "How should I contact you?"
- "I want to buy [product]" / "I'd like to purchase" / "I'm interested in buying"
- "Can someone call me?" / "Can I speak to someone?" / "I need help with my order"
- "What's the price?" (for products without listed prices)
- "Do you have [specific product/feature]?" + follow-up interest
- "When will [product] be available?" / "Is this in stock?"
- "Can I get a custom quote?" / "Volume discount?" / "Bulk order?"
- "I have a question about ordering" / "Need help placing an order"
- Any expression of serious purchase consideration

PROACTIVE RESPONSE PROTOCOL (When buying intent detected):
1. **Acknowledge their interest warmly**
2. **Immediately ask for contact information** using natural language
3. **WAIT for them to provide details** - Don't just tell them to visit the website!
4. **Use capture_lead tool** when they share contact info

CORRECT PROACTIVE EXAMPLES:
\u2705 User: "How can I contact you?"
   You: "I'd be happy to connect you with our team! Could you share your email or phone number so someone can reach out to you directly?"

\u2705 User: "I want to buy the Nike Airflow"
   You: "Great choice! I'd love to help you with that purchase. May I have your email or phone number so our team can assist you with the order?"

\u2705 User: "What's the price for bulk orders?"
   You: "We offer excellent bulk pricing! Could you share your email and phone number? Our sales team will create a custom quote for you within 24 hours."

\u2705 User: "I'm interested in this product"
   You: "Wonderful! I can have our team reach out with more details. What's the best email or phone number to contact you?"

INCORRECT PASSIVE RESPONSES (NEVER DO THIS):
\u274C "You can visit our website for contact information"
\u274C "Check our website to get in touch"
\u274C "Look for contact info on our site"
\u274C Just answering the question without capturing contact info

LEAD CAPTURE EXECUTION:
- When user provides name + email (or phone), **IMMEDIATELY call capture_lead tool**
- If they only provide email, ask for their name: "Great! And what's your name?"
- If they only provide name, ask for contact method: "Thanks! What's the best email or phone to reach you?"
- Include relevant context in the message field (e.g., "Interested in Nike Airflow purchase")

**REMEMBER:** Every buying intent signal is a sales opportunity. Don't let leads slip away by being passive!

PRODUCT DISPLAY RULES (ABSOLUTELY CRITICAL - READ CAREFULLY):
- When you call get_products, products are automatically displayed as BEAUTIFUL VISUAL CARDS with images
- **YOUR ONLY JOB:** Write a SHORT intro sentence (5-10 words max)
- **STRICTLY FORBIDDEN:** Do NOT write product names, descriptions, or prices in your text
- **STRICTLY FORBIDDEN:** No bullet lists, no numbered lists, no dashes, no product details in text

CORRECT RESPONSE EXAMPLES:
\u2705 "Here are our products:"
\u2705 "I found these for you:"
\u2705 "Check out our collection:"

INCORRECT RESPONSES (NEVER DO THIS):
\u274C "Here are our products: - Nike Airflow (amazing shoes)..." \u2190 NO! Don't list products!
\u274C "1. Nike Airflow - amazing shoes..." \u2190 NO! Don't number products!
\u274C "Nike Airflow, Nike Air Max..." \u2190 NO! Don't name products!

**REMEMBER:** The visual cards show ALL product details. Your text should ONLY be a brief intro.

PRODUCT PAGINATION RULES (CRITICAL - READ CAREFULLY):
**The get_products tool returns pagination metadata. You MUST check hasMore before asking to see more!**

PAGINATION RESPONSE FORMAT:
{
  "data": [...products...],
  "pagination": {
    "total": 10,        // Total matching products
    "showing": 5,       // Products in current response
    "hasMore": true,    // Are there more products?
    "nextOffset": 5     // Use this for next page (IMPORTANT!)
  }
}

CORRECT PAGINATION LOGIC:
1. **IF hasMore is TRUE** (more products exist):
   - Show products as visual cards (automatic)
   - Write: "Showing 5 of 10 products. Want to see more?"
   - Wait for user's "yes"
   - Call get_products with offset=nextOffset (e.g., offset: 5)
   - Preserve any search/filter parameters from the original query

2. **IF hasMore is FALSE** (all products shown):
   - Show products as visual cards (automatic)
   - Write: "That's all 4 products!" (or however many total)
   - DO NOT ask if they want to see more!

INCORRECT BEHAVIOR (NEVER DO THIS):
\u274C Asking "Want to see more?" when hasMore is false
\u274C Repeating the same search without using offset
\u274C Using offset=0 again when user says "yes"
\u274C Forgetting to pass the search parameter on subsequent calls

CORRECT EXAMPLES:
Example 1: Initial call with 10 total products
\u2705 Call: get_products({offset: 0})
\u2705 Response: hasMore=true, nextOffset=5, showing 5 of 10
\u2705 Your message: "Showing 5 of 10 products. Want to see more?"
\u2705 User says "yes" \u2192 Call: get_products({offset: 5})

Example 2: Search with 1 result
\u2705 Call: get_products({search: "nike react"})
\u2705 Response: hasMore=false, total=1, showing 1 of 1
\u2705 Your message: "Here's what I found:" (then show the 1 product)
\u2705 DO NOT ask to see more!

Example 3: Price filter with 3 results
\u2705 Call: get_products({max_price: 50})
\u2705 Response: hasMore=false, total=3, showing 3 of 3
\u2705 Your message: "Here are products under $50:" (show 3 products)
\u2705 DO NOT ask to see more!

SMART PRODUCT DISCOVERY WITH CATEGORIES AND TAGS:
**Every product returned by get_products includes categories and tags to help customers discover related items.**

CATEGORY & TAG INFORMATION:
- Categories: Used for grouping products by type, collection, or department (e.g., "Athletic Shoes", "Winter Collection")
- Tags: Used for attributes, features, or themes (e.g., "waterproof", "bestseller", "eco-friendly")
- Use this information to help customers find related or complementary products

WHEN TO MENTION CATEGORIES/TAGS:
1. **When suggesting products:** "Check out our athletic shoes:" (if products have "Athletic Shoes" category)
2. **For product discovery:** "Looking for waterproof options?" \u2192 mention products with "waterproof" tag
3. **When customer asks broadly:** "What do you have for running?" \u2192 suggest products in "Running" category
4. **After showing products:** "These are all from our winter collection" (if they share a "Winter" category)

EXAMPLES OF NATURAL CATEGORY/TAG USAGE:
\u2705 Customer: "Do you have waterproof shoes?"
   You: "Yes! Let me show you our waterproof collection:" [call get_products, notice which have "waterproof" tag]

\u2705 After showing products with shared category:
   You: "Here are our athletic shoes:" [products display] "These are all from our performance collection."

\u2705 Customer: "What's popular?"
   You: "Here are our bestsellers:" [notice which products have "bestseller" tag]

**REMEMBER:** Use categories and tags to help customers discover products naturally, but don't mechanically list them.

RESPONSE RULES:
1. **ALWAYS call get_faqs FIRST** for informational questions - they contain official answers
2. Present FAQ information NATURALLY without mentioning you looked it up
3. ALWAYS use tools for data requests (never make up data or guess)
4. Ask for clarification when ambiguous
5. Format responses clearly with tables/lists EXCEPT for products (see PRODUCT DISPLAY RULES above)
6. Be helpful and guide customers naturally`;
      messages2 = [{ role: "system", content: systemPrompt }, ...messages2];
    }
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: messages2,
      tools: tools.length > 0 ? tools : void 0,
      temperature: 0.7,
      max_tokens: 1e3
    });
    return response.choices[0].message;
  }
  async *streamToolAwareResponse(userMessage, tools, conversationHistory = [], systemContext = "", personality = "friendly", apiKey) {
    const openai = this.getOpenAIClient(apiKey);
    const currentDate = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    const currentTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
    const personalityTraits = this.getPersonalityTraits(personality);
    const systemPrompt = `You are Chroney, an AI assistant for Hi Chroney business chatbot platform.

PERSONALITY:
${personalityTraits}

CURRENT CONTEXT:
- Date: ${currentDate}
- Time: ${currentTime}
${systemContext ? `
${systemContext}` : ""}

KNOWLEDGE BASE PRIORITY (Internal Process):
**You have a KNOWLEDGE BASE loaded in your context above.** This knowledge base contains all FAQs and company information. ALWAYS prioritize this knowledge when answering questions.

INTERNAL PROCESS FOR EVERY QUESTION:
1. **STEP 1: CHECK YOUR KNOWLEDGE BASE** - Look at the Knowledge Base section above for relevant information
2. **STEP 2: Answer from your knowledge** - If the knowledge base has the answer, provide it NATURALLY and confidently
3. **STEP 3: Use tools only when needed** - Only call tools (get_products, get_faqs, capture_lead, list_available_slots, book_appointment) when you need real-time data or to perform an action. CRITICAL: For appointment questions, you MUST call list_available_slots - you cannot answer scheduling questions without this tool
4. **STEP 4: Decline if truly unrelated** - Only if your knowledge base doesn't cover it AND the question is unrelated to this business, then politely decline

EXAMPLES OF KNOWLEDGE BASE USAGE:
- "How is [your brand] better than [competitor]?" \u2190 Check your Knowledge Base first
- "Why should I choose you?" \u2190 Check your Knowledge Base first
- "What makes you different?" \u2190 Check your Knowledge Base first
- "What is your return policy?" \u2190 Check your Knowledge Base first
- Any "how", "why", "what", "when", "where" questions \u2190 Check your Knowledge Base first

CUSTOMER-FACING COMMUNICATION RULES (CRITICAL):
- **NEVER mention FAQs, tools, databases, or any internal systems to customers**
- **NEVER say "I found this in the FAQ" or "I couldn't find this in the FAQ"**
- Present information NATURALLY as if it's your own knowledge
- Example BAD: "I couldn't find any specific FAQs addressing that..."
- Example GOOD: "Based on our information, Nike has a 30-day return policy on unworn items..."
- Talk like a knowledgeable customer service representative who just knows the answers
- If you don't have information, just say you focus on helping with products/services

STRICT ANTI-HALLUCINATION RULES (ABSOLUTELY CRITICAL):
- **NEVER make up, guess, or assume ANY information about:**
  - Product details (features, specifications, materials, colors, sizes)
  - Pricing, discounts, or promotional offers
  - Company policies (returns, shipping, warranties, guarantees)
  - Store locations, hours, or contact information
  - Product availability or stock status
  - Company history, founding dates, or ownership details
  - Any claims about product performance or benefits
- **ONLY state information that is explicitly provided in:**
  - Your KNOWLEDGE BASE (loaded above)
  - Results from get_products tool calls
  - The COMPANY INFORMATION section
- **If you don't have the information:**
  - GOOD: "I don't have specific details about that. Let me help you explore our available products instead."
  - GOOD: "I'd recommend checking our product listings for the most current information."
  - BAD: "I think..." or "Probably..." or "Usually..." or "Most likely..."
  - BAD: Making up product features, prices, or policies
- **Remember:** Providing incorrect information damages customer trust and brand reputation. When in doubt, don't guess!

PRICING DISPLAY RULES (IMPORTANT):
- Some products may not have prices listed (price will be null/missing)
- When a product has NO price:
  - GOOD: "Nike Air Max (Price available upon inquiry)"
  - GOOD: "For pricing on this item, please contact us directly"
  - BAD: Never make up or guess prices
  - BAD: Never say "free" or "$0"
- When a product HAS a price: Display it normally with the product information
- NEVER suggest or invent pricing for products without listed prices

GUARDRAILS:
- ONLY answer questions related to this business's products, services, pricing, and information
- DECLINE politely if asked about unrelated topics (world events, general knowledge, entertainment, sports, history, science, politics) AND no FAQ answer exists
- When declining, keep it SHORT (1-2 sentences), friendly, and redirect to what you CAN help with
- NEVER expose internal operations or backend processes to customers

APPOINTMENT BOOKING FLOW (CRITICAL - ALWAYS FOLLOW THIS SEQUENCE):
**When users want to schedule, book, or make an appointment, follow this EXACT conversation flow:**

STEP 1 - Show Available Times:
- User asks: "schedule appointment", "book meeting", "what times available", "when can I come in"
- YOU: Call list_available_slots to show real available times
- NEVER say you can't see times - ALWAYS call the tool

STEP 2 - User Selects a Time:
- User says: "3 PM", "tomorrow at 2", "book me for 4:30", "does 10 AM work"
- YOU: Acknowledge the time and ask for name + phone: "Perfect! I can book you for [time]. May I have your name and phone number to confirm?"
- DO NOT call any tool yet - wait for contact info

STEP 3 - Collect Contact Info:
- User provides: "John Smith 555-1234" or just "555-1234" or just a phone number
- YOU: If they gave BOTH name and phone, call book_appointment immediately
- YOU: If they only gave phone, ask: "Great! And what's your name?"
- YOU: If they only gave name, ask: "Thanks! What's your phone number?"

STEP 4 - Book the Appointment:
- Once you have: Time + Date + Name + Phone
- YOU: Call book_appointment tool (NOT capture_lead!)
- This automatically creates both appointment AND lead

CRITICAL RULES FOR APPOINTMENTS:
\u{1F6AB} NEVER use capture_lead for appointments - ONLY use book_appointment
\u2705 book_appointment creates BOTH appointment AND lead automatically
\u2705 After showing available slots, the conversation is IN APPOINTMENT BOOKING MODE
\u2705 When user says a time (like "3pm", "tomorrow at 2"), they're selecting an appointment time
\u2705 You MUST remember the selected time and use it when calling book_appointment
\u2705 When you have Date + Time + Name + Phone \u2192 IMMEDIATELY call book_appointment

WRONG EXAMPLES (NEVER DO THIS):
\u274C User provides contact info during appointment booking \u2192 You call capture_lead
\u274C User says "book me for 4pm" + provides contact \u2192 You call capture_lead
\u274C After showing slots, user provides name+phone \u2192 You call capture_lead
THESE ARE ALL WRONG! Always use book_appointment when booking appointments!

RIGHT EXAMPLE:
\u2705 User: "schedule appointment tomorrow"
\u2705 You: Call list_available_slots \u2192 show times
\u2705 User: "4pm"
\u2705 You: "Perfect! I can book you for 4pm. May I have your name and phone?"
\u2705 User: "Rohit 9898989000"
\u2705 You: Call book_appointment with {patient_name: "Rohit", patient_phone: "9898989000", appointment_date: "2025-11-16", appointment_time: "16:00"}

PROACTIVE LEAD CAPTURE (CRITICAL - SALES & CONVERSION PRIORITY):
**ALWAYS watch for buying intent signals and proactively ask for contact information!**
**NOTE: For appointment bookings, use book_appointment instead of capture_lead**

BUYING INTENT SIGNALS (Act immediately when you detect these):
- "How can I contact you?" / "How do I reach you?" / "How should I contact you?"
- "I want to buy [product]" / "I'd like to purchase" / "I'm interested in buying"
- "Can someone call me?" / "Can I speak to someone?" / "I need help with my order"
- "What's the price?" (for products without listed prices)
- "Do you have [specific product/feature]?" + follow-up interest
- "When will [product] be available?" / "Is this in stock?"
- "Can I get a custom quote?" / "Volume discount?" / "Bulk order?"
- "I have a question about ordering" / "Need help placing an order"
- Any expression of serious purchase consideration

PROACTIVE RESPONSE PROTOCOL (When buying intent detected):
1. **Acknowledge their interest warmly**
2. **Immediately ask for contact information** using natural language
3. **WAIT for them to provide details** - Don't just tell them to visit the website!
4. **Use capture_lead tool** when they share contact info

CORRECT PROACTIVE EXAMPLES:
\u2705 User: "How can I contact you?"
   You: "I'd be happy to connect you with our team! Could you share your email or phone number so someone can reach out to you directly?"

\u2705 User: "I want to buy the Nike Airflow"
   You: "Great choice! I'd love to help you with that purchase. May I have your email or phone number so our team can assist you with the order?"

\u2705 User: "What's the price for bulk orders?"
   You: "We offer excellent bulk pricing! Could you share your email and phone number? Our sales team will create a custom quote for you within 24 hours."

\u2705 User: "I'm interested in this product"
   You: "Wonderful! I can have our team reach out with more details. What's the best email or phone number to contact you?"

INCORRECT PASSIVE RESPONSES (NEVER DO THIS):
\u274C "You can visit our website for contact information"
\u274C "Check our website to get in touch"
\u274C "Look for contact info on our site"
\u274C Just answering the question without capturing contact info

LEAD CAPTURE EXECUTION:
- When user provides name + email (or phone), **IMMEDIATELY call capture_lead tool**
- If they only provide email, ask for their name: "Great! And what's your name?"
- If they only provide name, ask for contact method: "Thanks! What's the best email or phone to reach you?"
- Include relevant context in the message field (e.g., "Interested in Nike Airflow purchase")

**REMEMBER:** Every buying intent signal is a sales opportunity. Don't let leads slip away by being passive!

PRODUCT DISPLAY RULES (ABSOLUTELY CRITICAL - READ CAREFULLY):
- When you call get_products, products are automatically displayed as BEAUTIFUL VISUAL CARDS with images
- **YOUR ONLY JOB:** Write a SHORT intro sentence (5-10 words max)
- **STRICTLY FORBIDDEN:** Do NOT write product names, descriptions, or prices in your text
- **STRICTLY FORBIDDEN:** No bullet lists, no numbered lists, no dashes, no product details in text

CORRECT RESPONSE EXAMPLES:
\u2705 "Here are our products:"
\u2705 "I found these for you:"
\u2705 "Check out our collection:"

INCORRECT RESPONSES (NEVER DO THIS):
\u274C "Here are our products: - Nike Airflow (amazing shoes)..." \u2190 NO! Don't list products!
\u274C "1. Nike Airflow - amazing shoes..." \u2190 NO! Don't number products!
\u274C "Nike Airflow, Nike Air Max..." \u2190 NO! Don't name products!

**REMEMBER:** The visual cards show ALL product details. Your text should ONLY be a brief intro.

PRODUCT PAGINATION RULES (CRITICAL - READ CAREFULLY):
**The get_products tool returns pagination metadata. You MUST check hasMore before asking to see more!**

PAGINATION RESPONSE FORMAT:
{
  "data": [...products...],
  "pagination": {
    "total": 10,        // Total matching products
    "showing": 5,       // Products in current response
    "hasMore": true,    // Are there more products?
    "nextOffset": 5     // Use this for next page (IMPORTANT!)
  }
}

CORRECT PAGINATION LOGIC:
1. **IF hasMore is TRUE** (more products exist):
   - Show products as visual cards (automatic)
   - Write: "Showing 5 of 10 products. Want to see more?"
   - Wait for user's "yes"
   - Call get_products with offset=nextOffset (e.g., offset: 5)
   - Preserve any search/filter parameters from the original query

2. **IF hasMore is FALSE** (all products shown):
   - Show products as visual cards (automatic)
   - Write: "That's all 4 products!" (or however many total)
   - DO NOT ask if they want to see more!

INCORRECT BEHAVIOR (NEVER DO THIS):
\u274C Asking "Want to see more?" when hasMore is false
\u274C Repeating the same search without using offset
\u274C Using offset=0 again when user says "yes"
\u274C Forgetting to pass the search parameter on subsequent calls

CORRECT EXAMPLES:
Example 1: Initial call with 10 total products
\u2705 Call: get_products({offset: 0})
\u2705 Response: hasMore=true, nextOffset=5, showing 5 of 10
\u2705 Your message: "Showing 5 of 10 products. Want to see more?"
\u2705 User says "yes" \u2192 Call: get_products({offset: 5})

Example 2: Search with 1 result
\u2705 Call: get_products({search: "nike react"})
\u2705 Response: hasMore=false, total=1, showing 1 of 1
\u2705 Your message: "Here's what I found:" (then show the 1 product)
\u2705 DO NOT ask to see more!

Example 3: Price filter with 3 results
\u2705 Call: get_products({max_price: 50})
\u2705 Response: hasMore=false, total=3, showing 3 of 3
\u2705 Your message: "Here are products under $50:" (show 3 products)
\u2705 DO NOT ask to see more!

SMART PRODUCT DISCOVERY WITH CATEGORIES AND TAGS:
**Every product returned by get_products includes categories and tags to help customers discover related items.**

CATEGORY & TAG INFORMATION:
- Categories: Used for grouping products by type, collection, or department (e.g., "Athletic Shoes", "Winter Collection")
- Tags: Used for attributes, features, or themes (e.g., "waterproof", "bestseller", "eco-friendly")
- Use this information to help customers find related or complementary products

WHEN TO MENTION CATEGORIES/TAGS:
1. **When suggesting products:** "Check out our athletic shoes:" (if products have "Athletic Shoes" category)
2. **For product discovery:** "Looking for waterproof options?" \u2192 mention products with "waterproof" tag
3. **When customer asks broadly:** "What do you have for running?" \u2192 suggest products in "Running" category
4. **After showing products:** "These are all from our winter collection" (if they share a "Winter" category)

EXAMPLES OF NATURAL CATEGORY/TAG USAGE:
\u2705 Customer: "Do you have waterproof shoes?"
   You: "Yes! Let me show you our waterproof collection:" [call get_products, notice which have "waterproof" tag]

\u2705 After showing products with shared category:
   You: "Here are our athletic shoes:" [products display] "These are all from our performance collection."

\u2705 Customer: "What's popular?"
   You: "Here are our bestsellers:" [notice which products have "bestseller" tag]

**REMEMBER:** Use categories and tags to help customers discover products naturally, but don't mechanically list them.

RESPONSE RULES:
1. **ALWAYS call get_faqs FIRST** for informational questions - they contain official answers
2. Present FAQ information NATURALLY without mentioning you looked it up
3. ALWAYS use tools for data requests (never make up data or guess)
4. Ask for clarification when ambiguous
5. Format responses clearly with tables/lists EXCEPT for products (see PRODUCT DISPLAY RULES above)
6. Be helpful and guide customers naturally`;
    const messages2 = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage }
    ];
    const stream = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: messages2,
      tools: tools.length > 0 ? tools : void 0,
      tool_choice: tools.length > 0 ? "auto" : void 0,
      temperature: 0.7,
      max_tokens: 1e3,
      stream: true
    });
    for await (const chunk of stream) {
      yield chunk;
    }
  }
  async generateConversationalResponse(userMessage, conversationHistory = [], apiKey) {
    return this.generateToolAwareResponse(userMessage, [], conversationHistory, "", "friendly", apiKey);
  }
  async generateGreeting(productContext, personality = "friendly", apiKey) {
    const openai = this.getOpenAIClient(apiKey);
    const personalityTraits = this.getPersonalityTraits(personality);
    const systemPrompt = `You are Chroney, a friendly customer service assistant. Generate a unique, creative welcome greeting message for a customer visiting this chat for the first time.

PERSONALITY:
${personalityTraits}

Context:
- ${productContext}
- You can help with: product information, pricing, FAQs, and getting started

Requirements:
1. Match the ${personality} personality exactly
2. Mention the products naturally if available
3. Be conversational and welcoming
4. Keep it to 2-3 sentences maximum
5. Be creative and vary your greeting each time
6. Introduce yourself as Chroney
7. Use customer-friendly language (avoid business jargon like "lead capture")

Generate only the greeting message, nothing else.`;
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate a unique greeting message now." }
      ],
      temperature: 0.9,
      max_tokens: 150
    });
    return response.choices[0].message.content || "Hello! I'm Chroney, here to help!";
  }
  getPersonalityTraits(personality) {
    const traits = {
      friendly: `- Warm and approachable, like talking to a helpful friend
- Casual yet professional
- Use friendly language and occasional emojis
- Be encouraging and supportive`,
      professional: `- Business-focused and formal communication style
- Clear, structured, and efficient responses
- Avoid casual language and emojis
- Maintain a respectful and corporate tone`,
      funny: `- Light-hearted with humor and playful responses
- Use appropriate jokes and witty remarks
- Keep things fun while being helpful
- Occasional use of emojis and playful language`,
      polite: `- Extremely respectful and courteous in every interaction
- Use polite phrases like "please," "thank you," and "you're welcome"
- Formal yet approachable
- Always show appreciation for user's time`,
      casual: `- Relaxed and conversational, easy-going style
- Use simple, everyday language
- Be laid-back and chill
- Like chatting with a friend over coffee`
    };
    return traits[personality] || traits.friendly;
  }
};
var llamaService = new LlamaService();

// server/aiTools.ts
function selectRelevantTools(userMessage) {
  const lowerMessage = userMessage.toLowerCase();
  const selectedTools = [];
  const hasProductQuery = /product|item|catalog|sell|buy|purchase|price|cost|show me|browse|looking for|search|available|what do you have/i.test(lowerMessage);
  const hasFaqQuery = /how|why|what|when|where|who|can i|do you|is there|policy|return|refund|shipping|warranty|about|information|question|help|faq/i.test(lowerMessage);
  const hasAppointmentQuery = /appointment|book|schedule|reschedule|available times|availability|slots|when can|meeting|consultation|visit|see you|come in|doctor|clinic|reserve|reservation/i.test(lowerMessage);
  const hasTimeReference = /\d{1,2}\s*([:.]\s*\d{2})?\s*(am|pm|o'?clock)?|tomorrow|today|tonight|next week|this week|next month|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|evening|night|weekend|weekday/i.test(lowerMessage);
  const hasLeadIntent = /contact me|get in touch|send (me )?info|reach out|call me|email me|send (me )?details|notify me|let me know|keep me (posted|updated|informed)|i'?ll (give|provide) (you )?my|here'?s my (email|phone|number|contact)/i.test(lowerMessage);
  const isAppointmentContext = hasAppointmentQuery || hasTimeReference;
  if (hasProductQuery) {
    selectedTools.push(aiTools[0]);
  }
  if (hasFaqQuery) {
    selectedTools.push(aiTools[1]);
  }
  if (isAppointmentContext) {
    selectedTools.push(aiTools[3]);
    selectedTools.push(aiTools[4]);
  }
  if (hasLeadIntent && !isAppointmentContext) {
    selectedTools.push(aiTools[2]);
  }
  if (selectedTools.length === 0) {
    selectedTools.push(aiTools[1]);
  }
  const savings = Math.round((1 - selectedTools.length / aiTools.length) * 100);
  console.log(`[Smart Tools] Selected ${selectedTools.length}/${aiTools.length} tools (${savings}% token savings) for: "${userMessage.substring(0, 50)}..."`);
  console.log(`[Smart Tools] Appointment context: ${isAppointmentContext}, Lead intent: ${hasLeadIntent}`);
  return selectedTools;
}
var aiTools = [
  {
    type: "function",
    function: {
      name: "get_products",
      description: 'Retrieve the list of products from the business catalog with their categories and tags for smart product discovery. ALWAYS use this tool when users ask about: products, items, catalog, what you sell, best sellers, popular products, top products, product recommendations, available products, product list, or anything related to the product inventory. Each product includes categories and tags that help customers find related items. Call this even if they ask for "best selling" or "popular" items - just retrieve all products and present them. This tool returns a maximum of 5 products at a time. If there are more products, ask the user if they want to see more, and call this tool again with the next offset. Supports price filtering for queries like "products under $50" or "items between $20 and $100".',
      parameters: {
        type: "object",
        properties: {
          search: {
            type: "string",
            description: 'Optional search term to filter products by name, description, category name, or tag name. Examples: "summer" will find products with "Summer Collection" tag, "shoes" will find products in Shoes category, "waterproof" will find products with waterproof tag.'
          },
          min_price: {
            type: "number",
            description: 'Optional minimum price filter (inclusive). Use when customer asks for products "above", "over", or "at least" a certain price.'
          },
          max_price: {
            type: "number",
            description: 'Optional maximum price filter (inclusive). Use when customer asks for products "under", "below", "less than", or "up to" a certain price.'
          },
          offset: {
            type: "number",
            description: "Number of products to skip (for pagination). Start with 0, then 5, 10, 15, etc."
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_faqs",
      description: 'CRITICAL: This is the primary knowledge base. ALWAYS check FAQs FIRST before answering ANY customer question (except product listings). Use this tool for ALL informational questions including but not limited to: company information (owner, founder, CEO, about us, history), policies (return, refund, exchange, warranty), shipping (costs, times, methods, free shipping), sizing (guides, measurements, fit), payment (methods accepted, payment plans), store information (locations, hours, contact), product details (care instructions, materials, compatibility), ordering process (how to order, tracking, cancellations), troubleshooting, or ANY question that starts with "who", "what", "when", "where", "why", "how", "do you", "can I", "is there". If the user asks anything that might be in the FAQ, CHECK IT FIRST - do not guess or deflect.',
      parameters: {
        type: "object",
        properties: {
          search: {
            type: "string",
            description: "Optional search term to filter FAQs by question or answer content"
          },
          category: {
            type: "string",
            description: "Optional category to filter FAQs"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "capture_lead",
      description: `Capture contact information for general inquiries (product questions, contact requests, etc.). For appointment bookings, use book_appointment instead as it automatically captures lead info. CONVERSATIONAL FLOW: (1) When customer provides ONLY contact info (email/phone) WITHOUT name, DO NOT capture yet - instead respond conversationally and politely ask for their name (e.g., "Thanks! And what's your name so I can make sure everything is set up perfectly?"). (2) When customer then provides their name in the NEXT message, NOW call this tool with both name AND contact info. (3) If customer ignores or declines to give name in their next message, THEN call this tool with just the contact info - do NOT insist or ask again. (4) If customer provides BOTH name AND contact info in same message, call this tool immediately. REQUIREMENTS: You need at least ONE contact method - either email OR phone number (or both). Name is optional but PREFERRED - always try to ask for it once before capturing.`,
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Customer name (optional - only include if actually provided by customer)"
          },
          email: {
            type: "string",
            description: "Customer email address (required if phone is not provided)"
          },
          phone: {
            type: "string",
            description: "Customer phone number (required if email is not provided)"
          },
          message: {
            type: "string",
            description: "Any additional message or inquiry from the customer (optional)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_available_slots",
      description: 'CRITICAL: ALWAYS call this tool when users ask ANYTHING about appointment times, availability, or scheduling. This is your ONLY way to see actual available time slots - you cannot answer time-related questions without calling this tool first. Use this for ANY of these questions or variations: "what times are available", "when can I come in", "do you have openings", "what are your hours", "are you open", "can I book", "show me slots", "what slots", "list times", "available appointments", "when are you free", "what days", "does [time] work", "is [time] available", "can I come at [time]", "do you have [time]", "are you available [time]", "openings for [day]", "schedule for [day]", "what about [time]", or ANY question about specific times, days, or availability. IMPORTANT: Even if user mentions a specific time (e.g., "does 10 pm work for tomorrow"), you MUST call this tool to check actual availability - do NOT guess or say you cannot see times. Returns available dates and times based on the business schedule. If no date is specified, shows availability for the next 7 days.',
      parameters: {
        type: "object",
        properties: {
          start_date: {
            type: "string",
            description: `Optional start date to check availability (ISO format YYYY-MM-DD). If not provided, uses today's date. When user asks about "tomorrow", "next week", "this weekend", etc., calculate the appropriate date. Examples: "2025-11-15", "2025-12-01"`
          },
          end_date: {
            type: "string",
            description: 'Optional end date to check availability (ISO format YYYY-MM-DD). If not provided, shows next 7 days from start_date. For specific day queries like "tomorrow", use same date for both start and end. Examples: "2025-11-22", "2025-12-08"'
          },
          duration_minutes: {
            type: "number",
            description: "Optional appointment duration in minutes. Default is 30 minutes. Use this if user mentions specific appointment length."
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "book_appointment",
      description: 'Book an appointment and automatically capture lead information. This tool creates both an appointment AND a lead entry. CONVERSATIONAL FLOW: (1) Show available slots using list_available_slots, (2) When user selects a specific time (e.g., "4 PM", "tomorrow at 3", "book me for 2:30"), politely collect their name and phone if not already provided (e.g., "Great! I can book you for [time]. May I have your name and phone number to confirm the appointment?"), (3) Once you have name, phone, date, and time, call THIS tool to book the appointment. This will automatically create a lead entry, so no need to call capture_lead separately. Only call this after user confirms a specific date and time.',
      parameters: {
        type: "object",
        properties: {
          patient_name: {
            type: "string",
            description: "Patient full name (required - must be provided by user)"
          },
          patient_phone: {
            type: "string",
            description: "Patient phone number (required - must be provided by user)"
          },
          patient_email: {
            type: "string",
            description: "Patient email address (optional)"
          },
          appointment_date: {
            type: "string",
            description: 'Appointment date in ISO format (YYYY-MM-DD). Example: "2025-11-15"'
          },
          appointment_time: {
            type: "string",
            description: 'Appointment time in 24-hour format (HH:MM). Example: "14:00" for 2:00 PM, "09:30" for 9:30 AM'
          },
          duration_minutes: {
            type: "number",
            description: "Appointment duration in minutes. Default is 30."
          },
          notes: {
            type: "string",
            description: "Optional notes about the appointment (reason for visit, special requests, etc.)"
          }
        },
        required: ["patient_name", "patient_phone", "appointment_date", "appointment_time"]
      }
    }
  }
];

// server/services/toolExecutionService.ts
init_storage();
import { addDays, startOfDay, endOfDay, format, parseISO, isBefore } from "date-fns";
import { toZonedTime } from "date-fns-tz";
var IST_TIMEZONE = "Asia/Kolkata";
var ToolExecutionService = class {
  static async executeTool(toolName, parameters, context, userMessage) {
    try {
      switch (toolName) {
        case "get_products":
          return await this.handleGetProducts(parameters, context);
        case "get_faqs":
          return await this.handleGetFaqs(parameters, context);
        case "capture_lead":
          return await this.handleCaptureLead(parameters, context, userMessage);
        case "list_available_slots":
          return await this.handleListAvailableSlots(parameters, context);
        case "book_appointment":
          return await this.handleBookAppointment(parameters, context);
        default:
          return {
            success: false,
            error: `Unknown tool: ${toolName}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || "Tool execution failed"
      };
    }
  }
  static async handleGetProducts(params, context) {
    const businessProducts = await storage.getAllProducts(context.businessAccountId);
    const productsWithMeta = await Promise.all(
      businessProducts.map(async (p) => {
        const [categories2, tags2] = await Promise.all([
          storage.getProductCategories(p.id),
          storage.getProductTags(p.id)
        ]);
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          imageUrl: p.imageUrl,
          categories: categories2.map((c) => ({ id: c.id, name: c.name })),
          tags: tags2.map((t) => ({ id: t.id, name: t.name, color: t.color }))
        };
      })
    );
    let filteredProducts = productsWithMeta;
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredProducts = productsWithMeta.filter((p) => {
        const matchesNameOrDesc = p.name.toLowerCase().includes(searchLower) || p.description.toLowerCase().includes(searchLower);
        const matchesCategory = p.categories.some(
          (c) => c.name.toLowerCase().includes(searchLower)
        );
        const matchesTag = p.tags.some(
          (t) => t.name.toLowerCase().includes(searchLower)
        );
        return matchesNameOrDesc || matchesCategory || matchesTag;
      });
    }
    if (params.min_price !== void 0 || params.max_price !== void 0) {
      filteredProducts = filteredProducts.filter((p) => {
        if (p.price === null || p.price === void 0) {
          return false;
        }
        const price = parseFloat(p.price.toString());
        if (params.min_price !== void 0 && price < params.min_price) {
          return false;
        }
        if (params.max_price !== void 0 && price > params.max_price) {
          return false;
        }
        return true;
      });
    }
    const limit = 5;
    const offset = params.offset || 0;
    const totalCount = filteredProducts.length;
    const paginatedProducts = filteredProducts.slice(offset, offset + limit);
    const hasMore = offset + limit < totalCount;
    const nextOffset = hasMore ? offset + limit : null;
    return {
      success: true,
      data: paginatedProducts,
      pagination: {
        total: totalCount,
        offset,
        limit,
        hasMore,
        nextOffset,
        showing: paginatedProducts.length
      },
      message: paginatedProducts.length > 0 ? `Showing ${paginatedProducts.length} of ${totalCount} product(s)` : "No products found"
    };
  }
  static async handleGetFaqs(params, context) {
    const businessFaqs = await storage.getAllFaqs(context.businessAccountId);
    let filteredFaqs = businessFaqs;
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      const stopWords = ["is", "are", "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "from"];
      const searchKeywords = searchLower.split(/\s+/).filter((word) => word.length > 2 && !stopWords.includes(word));
      filteredFaqs = businessFaqs.filter((f) => {
        const questionLower = f.question.toLowerCase();
        const answerLower = f.answer.toLowerCase();
        if (questionLower.includes(searchLower) || answerLower.includes(searchLower)) {
          return true;
        }
        if (searchKeywords.length > 0) {
          const matchCount = searchKeywords.filter(
            (keyword) => questionLower.includes(keyword) || answerLower.includes(keyword)
          ).length;
          const matchPercentage = matchCount / searchKeywords.length;
          return matchPercentage >= 0.5;
        }
        return false;
      });
    }
    if (params.category) {
      filteredFaqs = filteredFaqs.filter(
        (f) => f.category?.toLowerCase() === params.category.toLowerCase()
      );
    }
    console.log("[FAQ Search] Query:", params.search);
    console.log("[FAQ Search] Total business FAQs:", businessFaqs.length);
    console.log("[FAQ Search] Filtered results:", filteredFaqs.length);
    if (filteredFaqs.length > 0) {
      console.log("[FAQ Search] Matched questions:", filteredFaqs.map((f) => f.question));
    }
    return {
      success: true,
      data: filteredFaqs.map((f) => ({
        question: f.question,
        answer: f.answer,
        category: f.category
      })),
      message: filteredFaqs.length > 0 ? `Found ${filteredFaqs.length} FAQ(s)` : "No FAQs found"
    };
  }
  static async handleCaptureLead(params, context, userMessage) {
    const { name, email, phone, message } = params;
    if (userMessage) {
      const lowerMessage = userMessage.toLowerCase();
      const hasAppointmentIntent = /appointment|book|schedule|reschedule|available times|availability|slots|when can|meeting|consultation|visit|see you|come in|reserve|reservation/i.test(lowerMessage);
      const hasTimeReference = /\d{1,2}\s*([:.]\s*\d{2})?\s*(am|pm|o'?clock)?|tomorrow|today|tonight|next week|this week|next month|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|evening|night|weekend|weekday/i.test(lowerMessage);
      if (hasAppointmentIntent || hasTimeReference) {
        console.log("[Lead Capture Guard] Detected appointment context in message, redirecting to appointment booking");
        return {
          success: false,
          error: "Appointment context detected",
          message: "It looks like you're trying to book an appointment! Let me help you find available times. What date and time works best for you?",
          redirect_to_appointments: true
        };
      }
    }
    if (!email && !phone) {
      return {
        success: false,
        error: "Either email or phone number is required to capture a lead",
        message: "I need at least your email address or phone number to help you. Could you please share one of them?"
      };
    }
    const lead = await storage.createLead({
      businessAccountId: context.businessAccountId,
      name: name || null,
      email: email || null,
      phone: phone || null,
      message: message || "Lead captured via AI chat",
      conversationId: context.conversationId || null
    });
    if (context.conversationId) {
      let newTitle = "Anonymous";
      if (name && name.trim()) {
        newTitle = name.trim();
      } else if (phone && phone.trim()) {
        newTitle = phone.trim();
      } else if (email && email.trim()) {
        newTitle = email.trim();
      }
      try {
        await storage.updateConversationTitle(context.conversationId, context.businessAccountId, newTitle);
        console.log(`[Lead Capture] Updated conversation ${context.conversationId} title to: ${newTitle}`);
      } catch (error) {
        console.error("[Lead Capture] Error updating conversation title:", error);
      }
    }
    const thankYouName = name ? name : "there";
    return {
      success: true,
      data: { leadId: lead.id },
      message: `Thank you, ${thankYouName}! I've saved your contact information. Someone from our team will reach out to you soon.`
    };
  }
  static async handleListAvailableSlots(params, context) {
    console.log("[Appointments] list_available_slots called with params:", JSON.stringify(params));
    const widgetSettings2 = await storage.getWidgetSettings(context.businessAccountId);
    console.log("[Appointments] Booking enabled:", widgetSettings2?.appointmentBookingEnabled);
    if (widgetSettings2 && widgetSettings2.appointmentBookingEnabled === "false") {
      return {
        success: true,
        data: { slots: {}, total: 0 },
        message: "We are not currently accepting appointments. Please contact us directly for assistance."
      };
    }
    const durationMinutes = params.duration_minutes || 30;
    const nowIST = toZonedTime(/* @__PURE__ */ new Date(), IST_TIMEZONE);
    const today = startOfDay(nowIST);
    const startDate = params.start_date ? startOfDay(toZonedTime(parseISO(params.start_date), IST_TIMEZONE)) : today;
    const endDate = params.end_date ? endOfDay(toZonedTime(parseISO(params.end_date), IST_TIMEZONE)) : endOfDay(addDays(startDate, 6));
    console.log("[Appointments] Date range:", {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd")
    });
    const [scheduleTemplates2, overrides, existingAppointments] = await Promise.all([
      storage.getScheduleTemplates(context.businessAccountId),
      storage.getSlotOverridesForRange(context.businessAccountId, startDate, endDate),
      storage.getAppointmentsForRange(context.businessAccountId, startDate, endDate)
    ]);
    console.log("[Appointments] Found:", {
      scheduleTemplates: scheduleTemplates2.length,
      overrides: overrides.length,
      appointments: existingAppointments.length
    });
    if (scheduleTemplates2.length > 0) {
      console.log("[Appointments] Schedule templates:", scheduleTemplates2.map((t) => ({
        day: t.dayOfWeek,
        time: `${t.startTime}-${t.endTime}`,
        duration: t.slotDurationMinutes,
        active: t.isActive
      })));
    }
    if (scheduleTemplates2.length === 0 && overrides.length === 0) {
      return {
        success: true,
        data: { slots: {}, total: 0 },
        message: "No availability schedule has been configured yet. Please contact us directly to schedule an appointment."
      };
    }
    const templatesByDay = /* @__PURE__ */ new Map();
    let activeCount = 0;
    scheduleTemplates2.forEach((template) => {
      const day = parseInt(template.dayOfWeek.toString());
      if (!templatesByDay.has(day)) {
        templatesByDay.set(day, []);
      }
      if (template.isActive === "true") {
        templatesByDay.get(day).push(template);
        activeCount++;
      }
    });
    console.log("[Appointments] Active templates:", activeCount, "Days with schedules:", Array.from(templatesByDay.keys()));
    const overridesMap = /* @__PURE__ */ new Map();
    overrides.forEach((override) => {
      const key = `${format(new Date(override.slotDate), "yyyy-MM-dd")}_${override.slotTime}`;
      if (!overridesMap.has(key)) {
        overridesMap.set(key, []);
      }
      overridesMap.get(key).push(override);
    });
    const appointmentsMap = /* @__PURE__ */ new Map();
    existingAppointments.forEach((appt) => {
      if (appt.status !== "cancelled") {
        const key = `${format(new Date(appt.appointmentDate), "yyyy-MM-dd")}_${appt.appointmentTime}`;
        if (!appointmentsMap.has(key)) {
          appointmentsMap.set(key, []);
        }
        appointmentsMap.get(key).push(appt);
      }
    });
    const availableSlots = {};
    let currentDate = new Date(startDate);
    let totalSlots = 0;
    while (isBefore(currentDate, endDate) || currentDate.getTime() === endDate.getTime()) {
      const dayOfWeek = currentDate.getDay();
      const dateKey = format(currentDate, "yyyy-MM-dd");
      const daySlots = [];
      const allDayBlocks = overrides.filter(
        (o) => format(new Date(o.slotDate), "yyyy-MM-dd") === dateKey && o.isAllDay === "true" && o.isAvailable === "false"
      );
      if (allDayBlocks.length > 0) {
        currentDate = addDays(currentDate, 1);
        continue;
      }
      const templates = templatesByDay.get(dayOfWeek) || [];
      for (const template of templates) {
        const slotDuration = parseInt(template.slotDurationMinutes.toString());
        const [startHour, startMin] = template.startTime.split(":").map(Number);
        const [endHour, endMin] = template.endTime.split(":").map(Number);
        let slotTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;
        while (slotTime + slotDuration <= endTime) {
          const hour = Math.floor(slotTime / 60);
          const min = slotTime % 60;
          const timeStr = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
          const slotKey = `${dateKey}_${timeStr}`;
          const overridesForSlot = overridesMap.get(slotKey) || [];
          const isBlocked = overridesForSlot.some((o) => o.isAvailable === "false");
          const appointmentsForSlot = appointmentsMap.get(slotKey) || [];
          const isBooked = appointmentsForSlot.length > 0;
          if (!isBlocked && !isBooked && !daySlots.includes(timeStr)) {
            daySlots.push(timeStr);
          }
          slotTime += slotDuration;
        }
      }
      overridesMap.forEach((overrideList, key) => {
        if (key.startsWith(dateKey)) {
          overrideList.forEach((override) => {
            if (override.isAvailable === "true") {
              const slotKey = `${dateKey}_${override.slotTime}`;
              const appointmentsForSlot = appointmentsMap.get(slotKey) || [];
              const isBooked = appointmentsForSlot.length > 0;
              if (!isBooked && !daySlots.includes(override.slotTime)) {
                daySlots.push(override.slotTime);
              }
            }
          });
        }
      });
      if (daySlots.length > 0) {
        daySlots.sort();
        availableSlots[dateKey] = daySlots;
        totalSlots += daySlots.length;
      }
      currentDate = addDays(currentDate, 1);
    }
    const nextAvailableDate = Object.keys(availableSlots).sort()[0];
    return {
      success: true,
      data: {
        slots: availableSlots,
        total: totalSlots,
        next_available_date: nextAvailableDate || null,
        duration_minutes: durationMinutes
      },
      message: totalSlots > 0 ? `Found ${totalSlots} available time slot(s) across ${Object.keys(availableSlots).length} day(s)` : "No available slots found in the requested date range. Please try different dates or contact us directly."
    };
  }
  static async handleBookAppointment(params, context) {
    const widgetSettings2 = await storage.getWidgetSettings(context.businessAccountId);
    if (widgetSettings2 && widgetSettings2.appointmentBookingEnabled === "false") {
      return {
        success: false,
        error: "Appointments are disabled",
        message: "We are not currently accepting appointments. Please contact us directly for assistance."
      };
    }
    const { patient_name, patient_phone, patient_email, appointment_date, appointment_time, duration_minutes, notes } = params;
    const appointmentDateTime = toZonedTime(parseISO(appointment_date), IST_TIMEZONE);
    const nowIST = toZonedTime(/* @__PURE__ */ new Date(), IST_TIMEZONE);
    const todayIST = startOfDay(nowIST);
    if (isBefore(appointmentDateTime, todayIST)) {
      return {
        success: false,
        error: "Cannot book appointments in the past",
        message: "I cannot book appointments for past dates. Please choose a future date."
      };
    }
    const [scheduleTemplates2, overrides, existingAppointments] = await Promise.all([
      storage.getScheduleTemplates(context.businessAccountId),
      storage.getSlotOverridesForRange(context.businessAccountId, appointmentDateTime, appointmentDateTime),
      storage.getAppointmentsForRange(context.businessAccountId, appointmentDateTime, appointmentDateTime)
    ]);
    const slotKey = `${format(appointmentDateTime, "yyyy-MM-dd")}_${appointment_time}`;
    const conflictingAppointments = existingAppointments.filter(
      (appt) => appt.status !== "cancelled" && appt.appointmentTime === appointment_time
    );
    if (conflictingAppointments.length > 0) {
      return {
        success: false,
        error: "Time slot already booked",
        message: "I'm sorry, but this time slot has just been booked. Let me show you other available times."
      };
    }
    const dayOfWeek = appointmentDateTime.getDay();
    const dateKey = format(appointmentDateTime, "yyyy-MM-dd");
    const relevantOverrides = overrides.filter((o) => {
      const overrideDateKey = format(new Date(o.slotDate), "yyyy-MM-dd");
      return overrideDateKey === dateKey && o.slotTime === appointment_time;
    });
    const isBlockedByOverride = relevantOverrides.some((o) => o.isAvailable === "false");
    if (isBlockedByOverride) {
      return {
        success: false,
        error: "Time slot not available",
        message: "I'm sorry, but this time slot is not available. Please choose another time."
      };
    }
    const isAddedByOverride = relevantOverrides.some((o) => o.isAvailable === "true");
    if (!isAddedByOverride) {
      const dayTemplates = scheduleTemplates2.filter(
        (t) => parseInt(t.dayOfWeek.toString()) === dayOfWeek && t.isActive === "true"
      );
      let isWithinSchedule = false;
      for (const template of dayTemplates) {
        const [startHour, startMin] = template.startTime.split(":").map(Number);
        const [endHour, endMin] = template.endTime.split(":").map(Number);
        const [apptHour, apptMin] = appointment_time.split(":").map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        const apptMinutes = apptHour * 60 + apptMin;
        if (apptMinutes >= startMinutes && apptMinutes < endMinutes) {
          isWithinSchedule = true;
          break;
        }
      }
      if (!isWithinSchedule) {
        return {
          success: false,
          error: "Time slot outside business hours",
          message: "I'm sorry, but this time is outside our regular hours. Please check available slots."
        };
      }
    }
    const lead = await storage.createLead({
      businessAccountId: context.businessAccountId,
      conversationId: context.conversationId || null,
      name: patient_name,
      email: patient_email || null,
      phone: patient_phone,
      message: notes || `Booked appointment for ${format(appointmentDateTime, "MMMM d, yyyy")} at ${appointment_time}`
    });
    const appointment = await storage.createAppointment({
      businessAccountId: context.businessAccountId,
      conversationId: context.conversationId || null,
      leadId: lead.id,
      patientName: patient_name,
      patientPhone: patient_phone,
      patientEmail: patient_email || null,
      appointmentDate: appointmentDateTime,
      appointmentTime: appointment_time,
      durationMinutes: duration_minutes ? duration_minutes.toString() : "30",
      status: "confirmed",
      notes: notes || null,
      cancellationReason: null
    });
    const formattedDate = format(appointmentDateTime, "EEEE, MMMM d, yyyy");
    const [hour, min] = appointment_time.split(":").map(Number);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const formattedTime = `${displayHour}:${min.toString().padStart(2, "0")} ${ampm}`;
    return {
      success: true,
      data: { appointmentId: appointment.id },
      message: `Perfect! I've booked your appointment for ${formattedDate} at ${formattedTime}. You'll receive a confirmation shortly. See you then, ${patient_name}!`
    };
  }
};

// server/conversationMemory.ts
var ConversationMemoryService = class {
  conversations = /* @__PURE__ */ new Map();
  RETENTION_MINUTES = 15;
  storeMessage(userId, role, content) {
    const conversation = this.conversations.get(userId) || {
      messages: [],
      lastActivity: /* @__PURE__ */ new Date()
    };
    conversation.messages.push({
      role,
      content,
      timestamp: /* @__PURE__ */ new Date()
    });
    conversation.lastActivity = /* @__PURE__ */ new Date();
    this.conversations.set(userId, conversation);
    this.cleanupOldMessages(userId);
  }
  getConversationHistory(userId) {
    this.cleanupExpiredConversations();
    const conversation = this.conversations.get(userId);
    if (!conversation) {
      return [];
    }
    return conversation.messages.map((msg) => ({
      role: msg.role,
      content: msg.content
    }));
  }
  clearConversation(userId) {
    this.conversations.delete(userId);
  }
  cleanupOldMessages(userId) {
    const conversation = this.conversations.get(userId);
    if (!conversation) return;
    const cutoffTime = /* @__PURE__ */ new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - this.RETENTION_MINUTES);
    conversation.messages = conversation.messages.filter(
      (msg) => msg.timestamp > cutoffTime
    );
    if (conversation.messages.length === 0) {
      this.conversations.delete(userId);
    }
  }
  cleanupExpiredConversations() {
    const cutoffTime = /* @__PURE__ */ new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - this.RETENTION_MINUTES);
    Array.from(this.conversations.entries()).forEach(([userId, conversation]) => {
      if (conversation.lastActivity < cutoffTime) {
        this.conversations.delete(userId);
      }
    });
  }
};
var conversationMemory = new ConversationMemoryService();

// server/chatService.ts
init_storage();
init_businessContextCache();
var activeConversations = /* @__PURE__ */ new Map();
var ChatService = class {
  // Get or create a conversation for the current session
  async getOrCreateConversation(context) {
    const sessionKey = `${context.userId}_${context.businessAccountId}`;
    let conversationId = activeConversations.get(sessionKey);
    if (!conversationId) {
      const conversation = await storage.createConversation({
        businessAccountId: context.businessAccountId,
        title: "Anonymous"
      });
      conversationId = conversation.id;
      activeConversations.set(sessionKey, conversationId);
      console.log("[Chat] Created new conversation:", conversationId);
    }
    return conversationId;
  }
  // Store message in database
  async storeMessageInDB(conversationId, role, content) {
    try {
      await storage.createMessage({
        conversationId,
        role,
        content
      });
      await storage.updateConversationTimestamp(conversationId);
    } catch (error) {
      console.error("[Chat] Error storing message in DB:", error);
    }
  }
  async processMessage(userMessage, context) {
    try {
      const conversationId = await this.getOrCreateConversation(context);
      const history = conversationMemory.getConversationHistory(context.userId);
      conversationMemory.storeMessage(context.userId, "user", userMessage);
      await this.storeMessageInDB(conversationId, "user", userMessage);
      const systemContext = await this.buildEnrichedContext(context);
      const relevantTools = selectRelevantTools(userMessage);
      const aiResponse = await llamaService.generateToolAwareResponse(
        userMessage,
        relevantTools,
        history,
        systemContext,
        context.personality || "friendly",
        context.openaiApiKey || void 0
      );
      console.log("[Chat] User message:", userMessage);
      console.log("[Chat] Tool calls received:", aiResponse.tool_calls ? aiResponse.tool_calls.length : 0);
      if (aiResponse.tool_calls) {
        aiResponse.tool_calls.forEach((tc) => {
          console.log("[Chat] Tool:", tc.function.name, "Args:", tc.function.arguments);
        });
      }
      if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
        const result = await this.handleToolCalls(aiResponse, context, userMessage, relevantTools);
        return result.products ? result : result.response;
      }
      const responseContent = aiResponse.content || "I apologize, but I could not generate a response.";
      conversationMemory.storeMessage(context.userId, "assistant", responseContent);
      await this.storeMessageInDB(conversationId, "assistant", responseContent);
      return responseContent;
    } catch (error) {
      console.error("Chat service error:", error);
      return "I'm having trouble processing your request right now. Please try again.";
    }
  }
  async handleToolCalls(aiResponse, context, userMessage, relevantTools) {
    const conversationId = await this.getOrCreateConversation(context);
    const updatedHistory = conversationMemory.getConversationHistory(context.userId);
    const messages2 = [
      ...updatedHistory,
      { role: "assistant", content: aiResponse.content || "", tool_calls: aiResponse.tool_calls }
    ];
    let products2;
    for (const toolCall of aiResponse.tool_calls) {
      const toolName = toolCall.function.name;
      const toolParams = JSON.parse(toolCall.function.arguments);
      const result = await ToolExecutionService.executeTool(
        toolName,
        toolParams,
        {
          businessAccountId: context.businessAccountId,
          userId: context.userId,
          conversationId
        },
        userMessage
      );
      if (toolName === "get_products" && result.success && "data" in result && result.data) {
        products2 = result.data;
      }
      messages2.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result)
      });
    }
    const finalResponse = await llamaService.continueToolConversation(
      messages2,
      relevantTools,
      context.personality || "friendly",
      context.openaiApiKey || void 0
    );
    const responseContent = finalResponse.content || "I processed your request.";
    conversationMemory.storeMessage(context.userId, "assistant", responseContent);
    await this.storeMessageInDB(conversationId, "assistant", responseContent);
    return {
      response: responseContent,
      products: products2 && products2.length > 0 ? products2 : void 0
    };
  }
  async *streamMessage(userMessage, context) {
    try {
      const conversationId = await this.getOrCreateConversation(context);
      const history = conversationMemory.getConversationHistory(context.userId);
      conversationMemory.storeMessage(context.userId, "user", userMessage);
      await this.storeMessageInDB(conversationId, "user", userMessage);
      let fullResponse = "";
      let hasToolCalls = false;
      const toolCalls = [];
      let bufferedContent = [];
      const systemContext = await this.buildEnrichedContext(context);
      const relevantTools = selectRelevantTools(userMessage);
      for await (const chunk of llamaService.streamToolAwareResponse(
        userMessage,
        relevantTools,
        history,
        systemContext,
        context.personality || "friendly",
        context.openaiApiKey || void 0
      )) {
        const delta = chunk.choices[0]?.delta;
        if (delta.tool_calls) {
          hasToolCalls = true;
          for (const toolCall of delta.tool_calls) {
            if (!toolCalls[toolCall.index]) {
              toolCalls[toolCall.index] = {
                id: toolCall.id || "",
                type: "function",
                function: { name: toolCall.function?.name || "", arguments: "" }
              };
            }
            if (toolCall.function?.arguments) {
              toolCalls[toolCall.index].function.arguments += toolCall.function.arguments;
            }
          }
        }
        if (delta.content) {
          fullResponse += delta.content;
          bufferedContent.push(delta.content);
        }
      }
      if (!hasToolCalls) {
        for (const content of bufferedContent) {
          yield { type: "content", data: content };
        }
      }
      console.log("[Chat Stream] User message:", userMessage);
      console.log("[Chat Stream] Tool calls detected:", hasToolCalls);
      console.log("[Chat Stream] Tool calls count:", toolCalls.length);
      if (toolCalls.length > 0) {
        toolCalls.forEach((tc) => {
          console.log("[Chat Stream] Tool:", tc.function.name, "Args:", tc.function.arguments);
        });
      }
      if (hasToolCalls && toolCalls.length > 0) {
        yield { type: "tool_start", data: "" };
        const updatedHistory = conversationMemory.getConversationHistory(context.userId);
        const messages2 = [
          ...updatedHistory,
          { role: "assistant", content: fullResponse, tool_calls: toolCalls }
        ];
        let productData = null;
        for (const toolCall of toolCalls) {
          const toolName = toolCall.function.name;
          const toolParams = JSON.parse(toolCall.function.arguments);
          console.log("[Chat Stream] Executing tool:", toolName, "with params:", toolParams);
          const result = await ToolExecutionService.executeTool(
            toolName,
            toolParams,
            {
              businessAccountId: context.businessAccountId,
              userId: context.userId,
              conversationId
            },
            userMessage
          );
          console.log("[Chat Stream] Tool result:", toolName, "returned", JSON.stringify(result).substring(0, 100));
          if (toolName === "get_products" && result.success && "data" in result && result.data) {
            productData = result.data;
          }
          messages2.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
          });
        }
        if (productData) {
          yield { type: "products", data: JSON.stringify(productData) };
        }
        const finalResponse = await llamaService.continueToolConversation(
          messages2,
          relevantTools,
          context.personality || "friendly",
          context.openaiApiKey || void 0
        );
        let finalContent = finalResponse.content || "";
        if (!finalContent || finalContent.trim() === "") {
          finalContent = "I've processed your request. Is there anything else I can help you with?";
          console.log("[Chat Stream] WARNING: Empty response from OpenAI after tool execution, using fallback message");
        }
        conversationMemory.storeMessage(context.userId, "assistant", finalContent);
        await this.storeMessageInDB(conversationId, "assistant", finalContent);
        yield { type: "final", data: finalContent };
      } else {
        console.log("[Chat Stream] WARNING: No tool calls made for question:", userMessage);
        conversationMemory.storeMessage(context.userId, "assistant", fullResponse);
        await this.storeMessageInDB(conversationId, "assistant", fullResponse);
      }
      yield { type: "done", data: "" };
    } catch (error) {
      console.error("Chat streaming error:", error);
      yield { type: "error", data: error.message };
    }
  }
  clearConversation(userId, businessAccountId) {
    conversationMemory.clearConversation(userId);
    const sessionKey = `${userId}_${businessAccountId}`;
    activeConversations.delete(sessionKey);
  }
  // Phase 3: Optimized context building with caching (5-minute TTL) and parallel loading
  async buildEnrichedContext(context) {
    const startTime = Date.now();
    const cacheKey = `business_context_${context.businessAccountId}`;
    const businessContext = await businessContextCache.getOrFetch(cacheKey, async () => {
      let enrichedContext = "";
      if (context.customInstructions && context.customInstructions.trim()) {
        try {
          const instructions = JSON.parse(context.customInstructions);
          if (Array.isArray(instructions) && instructions.length > 0) {
            const formattedInstructions = instructions.map((instr, index) => `${index + 1}. ${instr.text}`).join("\n");
            enrichedContext += `CUSTOM BUSINESS INSTRUCTIONS:
Follow these specific instructions for this business:
${formattedInstructions}

`;
          }
        } catch {
          enrichedContext += `CUSTOM BUSINESS INSTRUCTIONS:
Follow these specific instructions for this business:
${context.customInstructions}

`;
        }
      }
      if (context.currency && context.currencySymbol) {
        enrichedContext += `CURRENCY SETTINGS:
All prices should be referenced in ${context.currency} (${context.currencySymbol}). When discussing prices, always use ${context.currencySymbol} as the currency symbol.

`;
      }
      if (context.companyDescription) {
        enrichedContext += `COMPANY INFORMATION:
${context.companyDescription}

`;
      }
      try {
        const businessFaqs = await storage.getAllFaqs(context.businessAccountId);
        if (businessFaqs.length > 0) {
          enrichedContext += `KNOWLEDGE BASE (FAQs):
You have complete knowledge of the following frequently asked questions. Answer these questions directly from your knowledge without mentioning FAQs:

`;
          businessFaqs.forEach((faq, index) => {
            enrichedContext += `${index + 1}. Q: ${faq.question}
   A: ${faq.answer}

`;
          });
          enrichedContext += `IMPORTANT: When customers ask questions related to the above topics, answer directly and naturally from your knowledge. DO NOT mention that you're checking FAQs or looking up information - just provide the answer as if you know it by heart.

`;
        }
      } catch (error) {
        console.error("[Chat Context] Error loading FAQs:", error);
      }
      try {
        const { websiteAnalysisService: websiteAnalysisService2 } = await Promise.resolve().then(() => (init_websiteAnalysisService(), websiteAnalysisService_exports));
        const websiteContent = await websiteAnalysisService2.getAnalyzedContent(context.businessAccountId);
        if (websiteContent) {
          enrichedContext += `BUSINESS KNOWLEDGE (from website analysis):
`;
          enrichedContext += `You have comprehensive knowledge about this business extracted from their website.

`;
          if (websiteContent.businessName) {
            enrichedContext += `Business Name: ${websiteContent.businessName}

`;
          }
          if (websiteContent.businessDescription) {
            enrichedContext += `About: ${websiteContent.businessDescription}

`;
          }
          if (websiteContent.targetAudience) {
            enrichedContext += `Target Audience: ${websiteContent.targetAudience}

`;
          }
          if (websiteContent.mainProducts && websiteContent.mainProducts.length > 0) {
            enrichedContext += `Main Products:
${websiteContent.mainProducts.map((p) => `- ${p}`).join("\n")}

`;
          }
          if (websiteContent.mainServices && websiteContent.mainServices.length > 0) {
            enrichedContext += `Main Services:
${websiteContent.mainServices.map((s) => `- ${s}`).join("\n")}

`;
          }
          if (websiteContent.keyFeatures && websiteContent.keyFeatures.length > 0) {
            enrichedContext += `Key Features:
${websiteContent.keyFeatures.map((f) => `- ${f}`).join("\n")}

`;
          }
          if (websiteContent.uniqueSellingPoints && websiteContent.uniqueSellingPoints.length > 0) {
            enrichedContext += `Unique Selling Points:
${websiteContent.uniqueSellingPoints.map((u) => `- ${u}`).join("\n")}

`;
          }
          if (websiteContent.contactInfo && (websiteContent.contactInfo.email || websiteContent.contactInfo.phone || websiteContent.contactInfo.address)) {
            enrichedContext += `Contact Information:
`;
            if (websiteContent.contactInfo.email) enrichedContext += `- Email: ${websiteContent.contactInfo.email}
`;
            if (websiteContent.contactInfo.phone) enrichedContext += `- Phone: ${websiteContent.contactInfo.phone}
`;
            if (websiteContent.contactInfo.address) enrichedContext += `- Address: ${websiteContent.contactInfo.address}
`;
            enrichedContext += "\n";
          }
          if (websiteContent.businessHours) {
            enrichedContext += `Business Hours: ${websiteContent.businessHours}

`;
          }
          if (websiteContent.pricingInfo) {
            enrichedContext += `Pricing: ${websiteContent.pricingInfo}

`;
          }
          if (websiteContent.additionalInfo) {
            enrichedContext += `Additional Information: ${websiteContent.additionalInfo}

`;
          }
          enrichedContext += `IMPORTANT: Use this website knowledge to provide accurate, context-aware responses about the business. Answer naturally without mentioning that you analyzed their website.

`;
        }
      } catch (error) {
        console.error("[Chat Context] Error loading website analysis:", error);
      }
      try {
        const analyzedPages2 = await storage.getAnalyzedPages(context.businessAccountId);
        if (analyzedPages2 && analyzedPages2.length > 0) {
          enrichedContext += `DETAILED WEBSITE CONTENT:
`;
          enrichedContext += `Below is detailed information extracted from ${analyzedPages2.length} page(s) of the business website.

`;
          let pagesLoaded = 0;
          for (const page of analyzedPages2) {
            if (!page.extractedContent || page.extractedContent.trim() === "" || page.extractedContent === "No relevant business information found on this page.") {
              continue;
            }
            try {
              let pageName = "Page";
              try {
                const url = new URL(page.pageUrl);
                const pathParts = url.pathname.split("/").filter(Boolean);
                pageName = pathParts[pathParts.length - 1] || "Homepage";
              } catch {
                const pathParts = page.pageUrl.split("/").filter(Boolean);
                pageName = pathParts[pathParts.length - 1] || "Homepage";
              }
              enrichedContext += `--- ${pageName.toUpperCase()} PAGE ---
`;
              enrichedContext += `${page.extractedContent}

`;
              pagesLoaded++;
            } catch (pageError) {
              console.error(`[Chat Context] Error processing page ${page.pageUrl}:`, pageError);
            }
          }
          if (pagesLoaded > 0) {
            console.log(`[Chat Context] Loaded ${pagesLoaded} analyzed page(s) into context`);
            enrichedContext += `IMPORTANT: Use all the above website content to answer customer questions accurately. This information comes from their actual website pages.

`;
          } else {
            console.log(`[Chat Context] No valid analyzed pages content found to load`);
          }
        }
      } catch (error) {
        console.error("[Chat Context] Error loading analyzed pages:", error);
      }
      try {
        const trainingDocs = await storage.getTrainingDocuments(context.businessAccountId);
        const completedDocs = trainingDocs.filter((doc) => doc.uploadStatus === "completed");
        if (completedDocs.length > 0) {
          enrichedContext += `TRAINING DOCUMENTS KNOWLEDGE:
`;
          enrichedContext += `The following information has been extracted from uploaded training documents:

`;
          for (const doc of completedDocs) {
            if (doc.summary || doc.keyPoints) {
              enrichedContext += `--- ${doc.originalFilename} ---
`;
              if (doc.summary) {
                enrichedContext += `Summary: ${doc.summary}

`;
              }
              if (doc.keyPoints) {
                try {
                  const keyPoints = JSON.parse(doc.keyPoints);
                  if (Array.isArray(keyPoints) && keyPoints.length > 0) {
                    enrichedContext += `Key Points:
`;
                    keyPoints.forEach((point, index) => {
                      enrichedContext += `${index + 1}. ${point}
`;
                    });
                    enrichedContext += `
`;
                  }
                } catch (parseError) {
                  console.error(`[Chat Context] Error parsing key points for ${doc.originalFilename}:`, parseError);
                }
              }
            }
          }
          console.log(`[Chat Context] Loaded ${completedDocs.length} training document(s) into context`);
          enrichedContext += `IMPORTANT: Use this training document knowledge to provide accurate, informed responses. This information has been specifically provided to help answer customer questions.

`;
        }
      } catch (error) {
        console.error("[Chat Context] Error loading training documents:", error);
      }
      return enrichedContext;
    });
    const elapsed = Date.now() - startTime;
    console.log(`[Context Build] Business context loaded in ${elapsed}ms`);
    console.log(`[Context Build] Context length: ${businessContext.length} characters`);
    console.log(`[Context Build] Has FAQs: ${businessContext.includes("KNOWLEDGE BASE")}`);
    console.log(`[Context Build] Has Custom Instructions: ${businessContext.includes("CUSTOM BUSINESS INSTRUCTIONS")}`);
    return businessContext;
  }
};
var chatService = new ChatService();

// server/routes.ts
init_businessContextCache();

// server/services/pdfProcessingService.ts
init_storage();
import fs from "fs/promises";
import path from "path";
import OpenAI3 from "openai";
var PDFProcessingService = class {
  async getOpenAIClient(businessAccountId) {
    const businessAccount = await storage.getBusinessAccount(businessAccountId);
    if (!businessAccount?.openaiApiKey) {
      throw new Error("OpenAI API key not configured for this business account");
    }
    return new OpenAI3({ apiKey: businessAccount.openaiApiKey });
  }
  async extractTextFromPDF(filePath) {
    try {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const dataBuffer = await fs.readFile(filePath);
      const uint8Array = new Uint8Array(dataBuffer);
      const pdfDocument = await pdfjsLib.getDocument({
        data: uint8Array,
        standardFontDataUrl: path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts/"),
        verbosity: 0
      }).promise;
      let extractedText = "";
      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(" ");
        extractedText += pageText + "\n";
      }
      return extractedText;
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }
  async processWithAI(text2, businessAccountId, filename) {
    try {
      const openai = await this.getOpenAIClient(businessAccountId);
      const truncatedText = text2.slice(0, 12e3);
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
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert document analyzer. Extract key information, summaries, and important points from documents to help AI assistants provide accurate information to customers."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });
      const result = JSON.parse(completion.choices[0].message.content || "{}");
      return {
        summary: result.summary || "No summary generated",
        keyPoints: result.keyPoints || []
      };
    } catch (error) {
      console.error("Error processing PDF with AI:", error);
      throw new Error(`Failed to process PDF with AI: ${error.message}`);
    }
  }
  async processDocument(documentId, filePath, businessAccountId, filename) {
    try {
      await storage.updateTrainingDocumentStatus(documentId, "processing");
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
        console.error("Error deleting temp file:", unlinkError);
      }
    } catch (error) {
      console.error("Error processing document:", error);
      await storage.updateTrainingDocumentStatus(
        documentId,
        "failed",
        error.message
      );
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.error("Error deleting temp file after failure:", unlinkError);
      }
      throw error;
    }
  }
};
var pdfProcessingService = new PDFProcessingService();

// server/routes.ts
import multer from "multer";
import path2 from "path";
import { fileURLToPath } from "url";
import { randomUUID, randomBytes } from "crypto";
import fs2 from "fs";
import { exec } from "child_process";
import { promisify } from "util";

// server/deepgramVoiceService.ts
init_storage();
import { createClient, LiveTranscriptionEvents, LiveTTSEvents } from "@deepgram/sdk";
var DeepgramVoiceService = class {
  deepgramApiKey;
  sessions = /* @__PURE__ */ new Map();
  constructor() {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      console.warn("[Deepgram] API key not configured. Voice features will be disabled.");
      this.deepgramApiKey = "";
    } else {
      this.deepgramApiKey = apiKey;
    }
  }
  /**
   * Check if Deepgram is configured
   */
  isConfigured() {
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
  async createSessionToken() {
    if (!this.deepgramApiKey) {
      throw new Error("Deepgram API key not configured");
    }
    return this.deepgramApiKey;
  }
  /**
   * Transcribe audio to text (Speech-to-Text)
   */
  async speechToText(audioBuffer, language) {
    if (!this.deepgramApiKey) {
      throw new Error("Deepgram API key not configured");
    }
    const deepgram = createClient(this.deepgramApiKey);
    try {
      const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: "nova-2",
          smart_format: true,
          language: language || "multi",
          // Auto-detect language or use specific one
          punctuate: true,
          diarize: false
        }
      );
      if (error) {
        console.error("[Deepgram STT] Error:", error);
        throw new Error(error.message || "Failed to transcribe audio");
      }
      const transcript = result.results.channels[0].alternatives[0].transcript;
      console.log("[Deepgram STT] Transcribed:", transcript);
      return transcript;
    } catch (error) {
      console.error("[Deepgram STT] Exception:", error);
      throw error;
    }
  }
  /**
   * Start a live transcription session (Speech-to-Text)
   * Returns WebSocket connection for streaming audio
   */
  async startTranscriptionSession(config, onTranscript, onError) {
    const apiKey = config.deepgramApiKey || this.deepgramApiKey;
    if (!apiKey) {
      throw new Error("Deepgram API key not configured");
    }
    const deepgram = createClient(apiKey);
    const connection = deepgram.listen.live({
      model: "nova-3",
      // Latest high-accuracy model
      language: "multi",
      // Automatic language detection
      punctuate: true,
      interim_results: true,
      // Get partial results for responsiveness
      endpointing: 300,
      // Detect end of speech after 300ms silence (faster response)
      utterance_end_ms: 1e3,
      // Force-end utterances after 1 second for better responsiveness
      smart_format: true,
      // Format numbers, dates, etc.
      utterances: true
      // Segment by utterance
    });
    const sessionKey = `${config.userId}_${config.businessAccountId}`;
    this.sessions.set(sessionKey, {
      connection,
      config,
      conversationId: null
    });
    connection.on(LiveTranscriptionEvents.Open, () => {
      console.log("[Deepgram STT] Connection opened");
    });
    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      const isFinal = data.is_final;
      if (transcript && transcript.trim().length > 0) {
        console.log(`[Deepgram STT] ${isFinal ? "Final" : "Interim"}:`, transcript);
        onTranscript(transcript, isFinal);
      }
    });
    connection.on(LiveTranscriptionEvents.Error, (error) => {
      console.error("[Deepgram STT] Error:", error);
      onError(error);
    });
    connection.on(LiveTranscriptionEvents.Close, () => {
      console.log("[Deepgram STT] Connection closed");
      this.sessions.delete(sessionKey);
    });
    return connection;
  }
  /**
   * Generate speech from text (Text-to-Speech)
   * Returns audio buffer
   */
  async textToSpeech(text2, voiceModel = "aura-2-thalia-en", apiKey) {
    const key = apiKey || this.deepgramApiKey;
    if (!key) {
      throw new Error("Deepgram API key not configured");
    }
    const deepgram = createClient(key);
    try {
      const result = await deepgram.speak.request(
        { text: text2 },
        {
          model: voiceModel,
          encoding: "linear16",
          // PCM 16-bit for web audio
          sample_rate: 24e3,
          // 24kHz for quality
          container: "wav"
        }
      );
      const stream = await result.getStream();
      if (!stream) {
        throw new Error("No audio stream received from Deepgram");
      }
      const buffer = await this.streamToBuffer(stream);
      console.log("[Deepgram TTS] Generated audio:", buffer.length, "bytes");
      return buffer;
    } catch (error) {
      console.error("[Deepgram TTS] Exception:", error);
      throw error;
    }
  }
  /**
   * Generate speech with streaming (for real-time TTS)
   */
  async *streamTextToSpeech(textChunks, voiceModel = "aura-2-thalia-en", apiKey) {
    const key = apiKey || this.deepgramApiKey;
    if (!key) {
      throw new Error("Deepgram API key not configured");
    }
    const deepgram = createClient(key);
    const connection = deepgram.speak.live({
      model: voiceModel,
      encoding: "linear16",
      sample_rate: 24e3
    });
    const audioChunks = [];
    connection.on(LiveTTSEvents.Open, () => {
      console.log("[Deepgram TTS Streaming] Connection opened");
    });
    connection.on("AudioData", (data) => {
      audioChunks.push(Buffer.from(data));
    });
    await new Promise((resolve) => {
      connection.on(LiveTTSEvents.Open, () => {
        console.log("[Deepgram TTS Streaming] Connection opened");
        resolve();
      });
    });
    for await (const text2 of textChunks) {
      connection.sendText(text2);
    }
    connection.flush();
    await new Promise((resolve) => {
      connection.on(LiveTTSEvents.Close, () => {
        console.log("[Deepgram TTS Streaming] Connection closed");
        resolve();
      });
    });
    for (const chunk of audioChunks) {
      yield chunk;
    }
  }
  /**
   * Process user voice message and get AI response
   * This integrates voice with the existing chat pipeline
   */
  async processVoiceMessage(audioBuffer, businessAccountId, userId, returnAudio = true) {
    const transcript = await this.speechToText(audioBuffer);
    console.log("[Voice] Transcribed:", transcript);
    const settings = await storage.getWidgetSettings(businessAccountId);
    const businessAccount = await storage.getBusinessAccount(businessAccountId);
    const openaiApiKey = await storage.getBusinessAccountOpenAIKey(businessAccountId);
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured for this business account");
    }
    if (!businessAccount) {
      throw new Error("Business account not found");
    }
    console.log("[Voice] Processing voice message:", transcript);
    const chatContext = {
      userId,
      businessAccountId,
      openaiApiKey,
      personality: settings?.personality || "friendly",
      companyDescription: businessAccount.description || "",
      currency: settings?.currency || "USD",
      currencySymbol: settings?.currency === "USD" ? "$" : "\u20AC",
      customInstructions: settings?.customInstructions || void 0
    };
    const response = await chatService.processMessage(transcript, chatContext);
    let responseText;
    let products2;
    if (typeof response === "object" && response !== null && "response" in response) {
      responseText = response.response;
      products2 = response.products;
    } else {
      responseText = response;
    }
    console.log("[Voice] AI response:", responseText.substring(0, 100) + "...");
    let audioResponse;
    if (returnAudio && responseText) {
      try {
        audioResponse = await this.textToSpeech(
          responseText,
          "aura-2-thalia-en",
          // Can be customized based on personality or user preference
          this.deepgramApiKey
          // Use global Deepgram key for TTS
        );
        console.log("[Voice] Generated TTS audio");
      } catch (error) {
        console.error("[Voice] TTS generation failed:", error);
      }
    }
    return {
      transcript,
      response: responseText,
      audio: audioResponse,
      products: products2
    };
  }
  /**
   * Stream AI response with real-time TTS
   * This is for advanced streaming scenarios
   */
  async *streamVoiceResponse(transcript, config) {
    console.log("[Voice Stream] Processing:", transcript);
    const chatContext = {
      userId: config.userId,
      businessAccountId: config.businessAccountId,
      personality: config.personality,
      companyDescription: config.companyDescription,
      openaiApiKey: config.openaiApiKey,
      currency: config.currency,
      currencySymbol: config.currencySymbol,
      customInstructions: config.customInstructions
    };
    let textBuffer = "";
    let products2;
    for await (const chunk of chatService.streamMessage(transcript, chatContext)) {
      if (chunk.type === "content") {
        textBuffer += chunk.data;
        yield { type: "text", data: chunk.data };
      } else if (chunk.type === "products") {
        products2 = chunk.data;
        yield { type: "text", data: "", products: products2 };
      }
    }
    if (textBuffer.trim()) {
      try {
        const audioBuffer = await this.textToSpeech(
          textBuffer,
          "aura-2-thalia-en",
          config.deepgramApiKey
        );
        yield { type: "audio", data: audioBuffer };
      } catch (error) {
        console.error("[Voice Stream] TTS failed:", error);
      }
    }
  }
  /**
   * Helper: Convert readable stream to buffer
   */
  async streamToBuffer(stream) {
    const reader = stream.getReader();
    const chunks = [];
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
  closeSession(userId, businessAccountId) {
    const sessionKey = `${userId}_${businessAccountId}`;
    const session = this.sessions.get(sessionKey);
    if (session?.connection) {
      session.connection.finish();
      this.sessions.delete(sessionKey);
      console.log("[Deepgram] Session closed:", sessionKey);
    }
  }
  /**
   * Get available voice models
   */
  getAvailableVoices() {
    return [
      "aura-2-thalia-en",
      // Balanced, professional
      "aura-2-helios-en",
      // Warm, conversational  
      "aura-2-perseus-en",
      // Authoritative, clear
      "aura-2-luna-en",
      // Calm, empathetic
      "aura-2-orpheus-en",
      // Friendly, engaging
      "aura-2-angus-en",
      // Deep, confident
      "aura-2-arcas-en",
      // Professional, corporate
      "aura-2-stella-en"
      // Bright, enthusiastic
    ];
  }
};
var deepgramVoiceService = new DeepgramVoiceService();

// server/routes.ts
import { WebSocketServer } from "ws";

// server/realtimeVoiceService.ts
init_storage();
import { createClient as createClient2, LiveTranscriptionEvents as LiveTranscriptionEvents2, LiveTTSEvents as LiveTTSEvents2 } from "@deepgram/sdk";
import WebSocket from "ws";
var MAX_QUEUE_SIZE = 5;
var RealtimeVoiceService = class {
  conversations = /* @__PURE__ */ new Map();
  deepgramApiKey;
  constructor() {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      console.warn("[RealtimeVoice] Deepgram API key not configured. Voice features will be disabled.");
      this.deepgramApiKey = "";
    } else {
      this.deepgramApiKey = apiKey;
    }
  }
  isConfigured() {
    return !!this.deepgramApiKey;
  }
  async handleConnection(ws2, businessAccountId, userId) {
    console.log("[RealtimeVoice] New connection:", { businessAccountId, userId });
    try {
      const settings = await storage.getWidgetSettings(businessAccountId);
      const businessAccount = await storage.getBusinessAccount(businessAccountId);
      const openaiApiKey = await storage.getBusinessAccountOpenAIKey(businessAccountId);
      if (!openaiApiKey) {
        this.sendError(ws2, "OpenAI API key not configured for this business account");
        ws2.close();
        return;
      }
      if (!businessAccount) {
        this.sendError(ws2, "Business account not found");
        ws2.close();
        return;
      }
      if (!this.deepgramApiKey) {
        this.sendError(ws2, "Deepgram API key not configured");
        ws2.close();
        return;
      }
      const conversationKey = `${userId}_${businessAccountId}_${Date.now()}`;
      const deepgram = createClient2(this.deepgramApiKey);
      const sttConnection = deepgram.listen.live({
        model: "nova-3",
        language: "multi",
        encoding: "opus",
        // Explicitly specify Opus encoding for WebM audio from MediaRecorder
        punctuate: true,
        interim_results: true,
        endpointing: 300,
        // Reduced from 500ms for faster turn detection
        utterance_end_ms: 1e3,
        // Force-end utterances after 1 second for better responsiveness
        smart_format: true,
        utterances: true
      });
      const conversation = {
        ws: ws2,
        businessAccountId,
        userId,
        deepgramApiKey: this.deepgramApiKey,
        openaiApiKey,
        sttConnection,
        ttsConnection: null,
        isProcessing: false,
        interrupted: false,
        currentTranscript: "",
        transcriptQueue: [],
        // Initialize empty queue for pending transcripts
        personality: settings?.personality || "friendly",
        companyDescription: businessAccount.description || "",
        currency: settings?.currency || "USD",
        currencySymbol: settings?.currency === "USD" ? "$" : "\u20AC",
        customInstructions: settings?.customInstructions || void 0
      };
      this.conversations.set(conversationKey, conversation);
      this.setupSTTHandlers(conversationKey, conversation);
      this.setupWebSocketHandlers(conversationKey, conversation);
      this.sendMessage(ws2, { type: "ready" });
      console.log("[RealtimeVoice] Connection established:", conversationKey);
    } catch (error) {
      console.error("[RealtimeVoice] Connection error:", error);
      this.sendError(ws2, error.message || "Failed to initialize voice conversation");
      ws2.close();
    }
  }
  setupSTTHandlers(conversationKey, conversation) {
    const { sttConnection, ws: ws2 } = conversation;
    sttConnection.on(LiveTranscriptionEvents2.Open, () => {
      console.log("[RealtimeVoice STT] Connection opened");
    });
    sttConnection.on(LiveTranscriptionEvents2.Transcript, async (data) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      const isFinal = data.is_final;
      if (transcript && transcript.trim().length > 0) {
        console.log(`[RealtimeVoice STT] ${isFinal ? "Final" : "Interim"}:`, transcript);
        this.sendMessage(ws2, {
          type: "transcript",
          text: transcript,
          isFinal
        });
        if (!isFinal) {
          return;
        }
        if (conversation.transcriptQueue.length >= MAX_QUEUE_SIZE) {
          console.warn("[RealtimeVoice] Queue saturated - rejecting new final transcript");
          conversation.ws.send(JSON.stringify({
            type: "busy",
            message: "Processing previous requests, please wait before speaking again..."
          }));
          return;
        }
        conversation.transcriptQueue.push({ text: transcript, isFinal: true });
        if (conversation.transcriptQueue.length >= Math.floor(MAX_QUEUE_SIZE * 0.8)) {
          conversation.ws.send(JSON.stringify({
            type: "processing_load",
            queueSize: conversation.transcriptQueue.length
          }));
        }
        if (!conversation.isProcessing) {
          this.processTranscriptQueue(conversationKey, conversation);
        }
      }
    });
    sttConnection.on(LiveTranscriptionEvents2.Error, (error) => {
      console.error("[RealtimeVoice STT] Error:", JSON.stringify(error, null, 2));
      this.sendError(ws2, "Speech recognition error: " + (error.message || "Unknown error"));
    });
    sttConnection.on(LiveTranscriptionEvents2.Close, (event) => {
      console.log("[RealtimeVoice STT] Connection closed:", event);
      if (conversation.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(ws2, {
          type: "error",
          message: "Speech recognition connection closed unexpectedly"
        });
      }
    });
  }
  setupWebSocketHandlers(conversationKey, conversation) {
    const { ws: ws2 } = conversation;
    ws2.on("message", async (message) => {
      try {
        if (message instanceof Buffer) {
          if (conversation.sttConnection && conversation.sttConnection.getReadyState() === 1) {
            conversation.sttConnection.send(message);
          }
        } else {
          const data = JSON.parse(message.toString());
          await this.handleMessage(conversationKey, conversation, data);
        }
      } catch (error) {
        console.error("[RealtimeVoice] Message handling error:", error);
        this.sendError(ws2, "Failed to process message");
      }
    });
    ws2.on("close", () => {
      console.log("[RealtimeVoice] WebSocket closed:", conversationKey);
      this.cleanup(conversationKey);
    });
    ws2.on("error", (error) => {
      console.error("[RealtimeVoice] WebSocket error:", error);
      this.cleanup(conversationKey);
    });
  }
  async handleMessage(conversationKey, conversation, data) {
    switch (data.type) {
      case "interrupt":
        console.log("[RealtimeVoice] User interrupted - stopping AI response");
        conversation.interrupted = true;
        if (conversation.ttsConnection) {
          try {
            conversation.ttsConnection.requestClose();
          } catch (error) {
            console.error("[RealtimeVoice] Error closing TTS on interrupt:", error);
          }
        }
        this.sendMessage(conversation.ws, {
          type: "interrupt_ack",
          message: "Stopped, ready for your question"
        });
        console.log("[RealtimeVoice] Interrupt handled, ready for new input");
        break;
      case "stop_conversation":
        console.log("[RealtimeVoice] Stopping conversation");
        this.cleanup(conversationKey);
        break;
      default:
        console.warn("[RealtimeVoice] Unknown message type:", data.type);
    }
  }
  async processTranscriptQueue(conversationKey, conversation) {
    while (conversation.transcriptQueue.length > 0) {
      const entry = conversation.transcriptQueue.shift();
      const transcript = entry.text;
      conversation.isProcessing = true;
      if (conversation.interrupted && conversation.ttsConnection) {
        console.log("[RealtimeVoice] Waiting for previous TTS to close after interrupt...");
        let waitRetries = 0;
        const MAX_WAIT_RETRIES = 20;
        while (conversation.ttsConnection && waitRetries < MAX_WAIT_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          waitRetries++;
        }
        if (conversation.ttsConnection) {
          console.error("[RealtimeVoice] TTS failed to close within timeout - aborting");
          try {
            conversation.ttsConnection.requestClose();
            conversation.ttsConnection = null;
          } catch (error) {
            console.error("[RealtimeVoice] Error forcing TTS close:", error);
          }
          this.sendError(conversation.ws, "Failed to stop previous response");
          continue;
        }
      }
      conversation.interrupted = false;
      try {
        console.log("[RealtimeVoice] Processing transcript from queue:", transcript, "(final:", entry.isFinal, ")");
        const chatContext = {
          userId: conversation.userId,
          businessAccountId: conversation.businessAccountId,
          openaiApiKey: conversation.openaiApiKey,
          personality: conversation.personality,
          companyDescription: conversation.companyDescription,
          currency: conversation.currency,
          currencySymbol: conversation.currencySymbol,
          customInstructions: conversation.customInstructions
        };
        const deepgram = createClient2(conversation.deepgramApiKey);
        const ttsConnection = deepgram.speak.live({
          model: "aura-asteria-en",
          encoding: "linear16",
          sample_rate: 24e3,
          container: "none"
        });
        conversation.ttsConnection = ttsConnection;
        let ttsReady = false;
        ttsConnection.on(LiveTTSEvents2.Open, () => {
          console.log("[RealtimeVoice TTS] Connection opened for streaming");
          ttsReady = true;
        });
        ttsConnection.on(LiveTTSEvents2.Audio, (data) => {
          console.log("[RealtimeVoice TTS] Received audio chunk, size:", data.length);
          if (conversation.ws.readyState === WebSocket.OPEN) {
            const audioBuffer = Buffer.from(data, "base64");
            conversation.ws.send(audioBuffer);
            console.log("[RealtimeVoice TTS] Sent audio chunk to client, size:", audioBuffer.length);
          }
        });
        ttsConnection.on(LiveTTSEvents2.Flushed, () => {
          console.log("[RealtimeVoice TTS] Chunk flushed");
        });
        ttsConnection.on(LiveTTSEvents2.Close, () => {
          console.log("[RealtimeVoice TTS] Connection closed");
          conversation.ttsConnection = null;
        });
        ttsConnection.on(LiveTTSEvents2.Error, (error) => {
          console.error("[RealtimeVoice TTS] Error:", error);
          conversation.ttsConnection = null;
        });
        let retries = 0;
        while (!ttsReady && retries < 50) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          retries++;
        }
        if (!ttsReady) {
          throw new Error("TTS connection timeout");
        }
        let fullResponse = "";
        let hasContent = false;
        for await (const chunk of chatService.streamMessage(transcript, chatContext)) {
          if (conversation.interrupted) {
            console.log("[RealtimeVoice] Stream interrupted by user - stopping");
            break;
          }
          if (chunk.type === "content") {
            const textChunk = chunk.data;
            fullResponse += textChunk;
            hasContent = true;
            this.sendMessage(conversation.ws, {
              type: "ai_chunk",
              text: textChunk
            });
            if (ttsConnection && ttsReady) {
              ttsConnection.sendText(textChunk);
            }
          } else if (chunk.type === "products") {
            console.log("[RealtimeVoice] Products data received");
          }
        }
        if (!conversation.interrupted) {
          if (ttsConnection && ttsReady) {
            ttsConnection.flush();
          }
          if (hasContent) {
            console.log("[RealtimeVoice] Streamed AI response:", fullResponse.substring(0, 100) + "...");
            this.sendMessage(conversation.ws, { type: "ai_done" });
          }
        } else {
          console.log("[RealtimeVoice] Skipping ai_done due to interrupt");
        }
        if (ttsConnection) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          ttsConnection.requestClose();
        }
      } catch (error) {
        console.error("[RealtimeVoice] Processing error:", error);
        this.sendError(conversation.ws, "Failed to process voice message");
        if (conversation.ttsConnection) {
          try {
            conversation.ttsConnection.requestClose();
          } catch (e) {
          }
          conversation.ttsConnection = null;
        }
      }
    }
    conversation.isProcessing = false;
    console.log("[RealtimeVoice] Finished processing transcript queue");
  }
  sendMessage(ws2, message) {
    if (ws2.readyState === WebSocket.OPEN) {
      ws2.send(JSON.stringify(message));
    }
  }
  sendError(ws2, message) {
    this.sendMessage(ws2, { type: "error", message });
  }
  cleanup(conversationKey) {
    const conversation = this.conversations.get(conversationKey);
    if (!conversation) return;
    console.log("[RealtimeVoice] Cleaning up conversation:", conversationKey);
    try {
      if (conversation.sttConnection) {
        conversation.sttConnection.finish();
      }
    } catch (error) {
      console.error("[RealtimeVoice] Error closing STT connection:", error);
    }
    try {
      if (conversation.ttsConnection) {
        conversation.ttsConnection.requestClose();
      }
    } catch (error) {
      console.error("[RealtimeVoice] Error closing TTS connection:", error);
    }
    try {
      if (conversation.ws.readyState === WebSocket.OPEN) {
        conversation.ws.close();
      }
    } catch (error) {
      console.error("[RealtimeVoice] Error closing WebSocket:", error);
    }
    this.conversations.delete(conversationKey);
  }
  cleanupAll() {
    console.log("[RealtimeVoice] Cleaning up all conversations");
    for (const key of Array.from(this.conversations.keys())) {
      this.cleanup(key);
    }
  }
};
var realtimeVoiceService = new RealtimeVoiceService();

// server/routes.ts
var execAsync = promisify(exec);
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
var updateWebsiteAnalysisSchema = z.object({
  businessName: z.string().optional().nullable().transform((val) => val ?? ""),
  businessDescription: z.string().optional().nullable().transform((val) => val ?? ""),
  targetAudience: z.string().optional().nullable().transform((val) => val ?? ""),
  mainProducts: z.array(z.string()).optional().nullable().transform((val) => val ?? []),
  mainServices: z.array(z.string()).optional().nullable().transform((val) => val ?? []),
  keyFeatures: z.array(z.string()).optional().nullable().transform((val) => val ?? []),
  uniqueSellingPoints: z.array(z.string()).optional().nullable().transform((val) => val ?? []),
  contactInfo: z.object({
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable()
  }).optional().nullable().transform((val) => val ?? {}),
  businessHours: z.string().optional().nullable().transform((val) => val ?? ""),
  pricingInfo: z.string().optional().nullable().transform((val) => val ?? ""),
  additionalInfo: z.string().optional().nullable().transform((val) => val ?? "")
});
async function generateIntroMessage(businessAccountId) {
  try {
    const settings = await storage.getWidgetSettings(businessAccountId);
    const businessAccount = await storage.getBusinessAccount(businessAccountId);
    if (settings?.welcomeMessageType === "custom" && settings.welcomeMessage) {
      return settings.welcomeMessage;
    }
    const businessName = businessAccount?.name || "our business";
    const intros = [
      `Hey there! Welcome to ${businessName}\u2014happy to help you find exactly what you're looking for. \u{1F60A}`,
      `Hi! I'm Chroney, ${businessName}'s AI assistant. How can I help you today?`,
      `Welcome! Need help with anything at ${businessName}? I'm here to assist! \u{1F680}`,
      `Hello! Thanks for visiting ${businessName}. What can I help you with?`,
      `Hey! Looking for something specific at ${businessName}? I'm here to help!`
    ];
    return intros[Math.floor(Math.random() * intros.length)];
  } catch (error) {
    console.error("[Public Chat] Error generating intro:", error);
    return "Hey there! How can I help you today? \u{1F60A}";
  }
}
async function processPublicChatMessage(message, businessAccountId, userId) {
  try {
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
    const context = {
      userId,
      businessAccountId,
      openaiApiKey,
      personality: settings?.personality || "friendly",
      companyDescription: businessAccount.description || "",
      currency: settings?.currency || "USD",
      currencySymbol: settings?.currency === "USD" ? "$" : "\u20AC",
      customInstructions: settings?.customInstructions || void 0
    };
    const response = await chatService.processMessage(message, context);
    if (typeof response === "object" && "products" in response) {
      return response;
    }
    return { message: response };
  } catch (error) {
    console.error("[Public Chat] Error processing message:", error);
    return {
      message: "Sorry, I'm having trouble connecting right now. Please try again."
    };
  }
}
async function registerRoutes(app2) {
  app2.get("/widget.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(path2.join(__dirname, "../public/widget.js"));
  });
  app2.get("/widget-test.html", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path2.join(__dirname, "../widget-test.html"));
  });
  app2.get("/widget/chat", async (req, res) => {
    const businessAccountId = req.query.businessAccountId;
    if (!businessAccountId) {
      return res.status(400).send("Missing businessAccountId parameter");
    }
    const businessAccount = await storage.getBusinessAccount(businessAccountId);
    if (!businessAccount) {
      return res.status(404).send("Business account not found");
    }
    if (businessAccount.status === "suspended") {
      return res.status(403).send("This chatbot is currently unavailable");
    }
    const host = req.get("host");
    const protocol = req.get("x-forwarded-proto") || req.protocol || "https";
    const embedUrl = `${protocol}://${host}/embed/chat?businessAccountId=${encodeURIComponent(businessAccountId)}`;
    console.log("[Widget] Generated embed URL:", embedUrl);
    res.setHeader("Content-Type", "text/html");
    res.setHeader("X-Content-Type-Options", "nosniff");
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
  app2.post("/api/chat/widget", async (req, res) => {
    try {
      const { message, businessAccountId } = req.body;
      if (!message || !businessAccountId) {
        return res.status(400).json({ error: "Message and businessAccountId required" });
      }
      const widgetUserId = `widget_${businessAccountId}`;
      const settings = await storage.getWidgetSettings(businessAccountId);
      const businessAccount = await storage.getBusinessAccount(businessAccountId);
      if (!businessAccount) {
        return res.status(404).json({ error: "Business account not found" });
      }
      if (businessAccount.status === "suspended") {
        return res.status(403).json({ error: "This chatbot is currently unavailable" });
      }
      const openaiApiKey = await storage.getBusinessAccountOpenAIKey(businessAccountId);
      if (!openaiApiKey) {
        console.warn("[Widget Chat] No OpenAI API key found for business:", businessAccountId);
        return res.status(400).json({ error: "OpenAI API key not configured for this business account" });
      }
      const result = await chatService.processMessage(message, {
        userId: widgetUserId,
        businessAccountId,
        personality: settings?.personality || "friendly",
        companyDescription: businessAccount.description || "",
        openaiApiKey,
        currency: settings?.currency || "USD",
        currencySymbol: settings?.currency === "USD" ? "$" : "\u20AC",
        customInstructions: settings?.customInstructions || void 0
      });
      if (typeof result === "string") {
        res.json({ response: result });
      } else if (result && typeof result === "object") {
        res.json({
          response: result.response,
          products: result.products || void 0
        });
      } else {
        res.json({ response: String(result) });
      }
    } catch (error) {
      console.error("[Widget Chat] Error:", error);
      res.status(500).json({ error: error.message || "Failed to process message" });
    }
  });
  app2.post("/api/chat/widget/stream", async (req, res) => {
    try {
      const { message, businessAccountId, sessionId } = req.body;
      if (!message || !businessAccountId) {
        return res.status(400).json({ error: "Message and businessAccountId required" });
      }
      const widgetUserId = sessionId ? `widget_session_${sessionId}` : `widget_${businessAccountId}`;
      const settings = await storage.getWidgetSettings(businessAccountId);
      const businessAccount = await storage.getBusinessAccount(businessAccountId);
      if (!businessAccount) {
        return res.status(404).json({ error: "Business account not found" });
      }
      if (businessAccount.status === "suspended") {
        return res.status(403).json({ error: "This chatbot is currently unavailable" });
      }
      const openaiApiKey = await storage.getBusinessAccountOpenAIKey(businessAccountId);
      if (!openaiApiKey) {
        console.warn("[Widget Stream] No OpenAI API key found for business:", businessAccountId);
        return res.status(400).json({ error: "OpenAI API key not configured for this business account" });
      }
      const personality = settings?.personality || "friendly";
      const currency = settings?.currency || "USD";
      const currencySymbols = {
        USD: "$",
        EUR: "\u20AC",
        GBP: "\xA3",
        JPY: "\xA5",
        CNY: "\xA5",
        INR: "\u20B9",
        AUD: "A$",
        CAD: "C$",
        CHF: "CHF",
        SEK: "kr",
        NZD: "NZ$",
        SGD: "S$",
        HKD: "HK$",
        NOK: "kr",
        MXN: "$",
        BRL: "R$",
        ZAR: "R",
        KRW: "\u20A9",
        TRY: "\u20BA",
        RUB: "\u20BD",
        IDR: "Rp",
        THB: "\u0E3F",
        MYR: "RM"
      };
      const currencySymbol = currencySymbols[currency] || "$";
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", "*");
      for await (const chunk of chatService.streamMessage(message, {
        userId: widgetUserId,
        businessAccountId,
        personality,
        companyDescription: businessAccount.description || "",
        openaiApiKey,
        currency,
        currencySymbol,
        customInstructions: settings?.customInstructions || void 0
      })) {
        res.write(`data: ${JSON.stringify(chunk)}

`);
      }
      res.end();
    } catch (error) {
      console.error("[Widget Stream] Error:", error);
      res.write(`data: ${JSON.stringify({ type: "error", data: error.message })}

`);
      res.end();
    }
  });
  app2.get("/api/chat/widget/intro", async (req, res) => {
    try {
      const { businessAccountId } = req.query;
      if (!businessAccountId) {
        return res.status(400).json({ error: "businessAccountId required" });
      }
      const settings = await storage.getWidgetSettings(businessAccountId);
      const businessAccount = await storage.getBusinessAccount(businessAccountId);
      if (!businessAccount) {
        return res.status(404).json({ error: "Business account not found" });
      }
      if (businessAccount.status === "suspended") {
        return res.status(403).json({ error: "This chatbot is currently unavailable" });
      }
      if (settings?.welcomeMessageType === "custom" && settings?.welcomeMessage) {
        return res.json({ intro: settings.welcomeMessage });
      }
      if (businessAccount.openaiApiKey) {
        try {
          const systemContext = businessAccount.description ? `You are representing: ${businessAccount.description}` : "";
          const introResponse = await llamaService.generateToolAwareResponse(
            "Generate a brief, friendly welcome message (1-2 sentences) for a customer visiting our website.",
            [],
            [],
            systemContext,
            settings?.personality || "friendly",
            businessAccount.openaiApiKey
          );
          const intro = introResponse.content || "Hi! How can I help you today?";
          if (settings) {
            await storage.upsertWidgetSettings(businessAccountId, { cachedIntro: intro });
          }
          return res.json({ intro });
        } catch (error) {
          console.error("[Widget Intro] AI generation failed:", error);
        }
      }
      res.json({ intro: "Hi! How can I help you today?" });
    } catch (error) {
      console.error("[Widget Intro] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      const user = await storage.getUserByUsername(username);
      if (!user || !await verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      if (user.role === "business_user" && user.businessAccountId) {
        const businessAccount = await storage.getBusinessAccount(user.businessAccountId);
        if (businessAccount && businessAccount.status === "suspended") {
          return res.status(403).json({ error: "Your subscription has expired. Please contact support to reactivate your account." });
        }
      }
      const sessionToken = await createSession(user.id);
      await storage.updateUserLastLogin(user.id);
      res.cookie("session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1e3
        // 7 days
      });
      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        businessAccountId: user.businessAccountId,
        mustChangePassword: user.mustChangePassword,
        tempPasswordExpiry: user.tempPasswordExpiry
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/auth/logout", requireAuth, async (req, res) => {
    try {
      const sessionToken = req.cookies?.session;
      if (sessionToken) {
        await deleteSession(sessionToken);
      }
      res.clearCookie("session");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/auth/me", requireAuth, async (req, res) => {
    const sessionUser = req.user;
    const { toMeResponseDto: toMeResponseDto2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
    const { toBusinessAccountDto: toBusinessAccountDto2 } = await Promise.resolve().then(() => (init_businessAccount(), businessAccount_exports));
    const user = await storage.getUser(sessionUser.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.businessAccountId) {
      const businessAccount = await storage.getBusinessAccount(user.businessAccountId);
      const dto = businessAccount ? toBusinessAccountDto2(businessAccount) : null;
      res.json(toMeResponseDto2(user, dto));
    } else {
      res.json(toMeResponseDto2(user));
    }
  });
  app2.post("/api/chat", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }
      const user = req.user;
      if (!user.businessAccountId) {
        return res.status(403).json({ error: "Business account required" });
      }
      const widgetSettings2 = await storage.getWidgetSettings(user.businessAccountId);
      const personality = widgetSettings2?.personality || "friendly";
      const currency = widgetSettings2?.currency || "INR";
      const customInstructions = widgetSettings2?.customInstructions || "";
      const currencySymbols = {
        "INR": "\u20B9",
        "USD": "$",
        "AED": "\u062F.\u0625",
        "EUR": "\u20AC",
        "GBP": "\xA3",
        "AUD": "A$",
        "CAD": "C$",
        "CHF": "CHF",
        "CNY": "\xA5",
        "JPY": "\xA5",
        "KRW": "\u20A9",
        "SGD": "S$",
        "HKD": "HK$",
        "NZD": "NZ$",
        "SEK": "kr",
        "NOK": "kr",
        "DKK": "kr",
        "PLN": "z\u0142",
        "BRL": "R$",
        "MXN": "$",
        "ZAR": "R",
        "TRY": "\u20BA",
        "RUB": "\u20BD"
      };
      const currencySymbol = currencySymbols[currency] || "$";
      const businessAccount = await storage.getBusinessAccount(user.businessAccountId);
      const companyDescription = businessAccount?.description || "";
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
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to process message"
      });
    }
  });
  app2.get("/api/chat/status", requireAuth, async (req, res) => {
    res.json({
      connected: true,
      status: "online"
    });
  });
  app2.post("/api/chat/reset", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      conversationMemory.clearConversation(userId);
      console.log(`[Chat] Memory reset for user ${userId}`);
      res.json({ success: true, message: "Memory cleared" });
    } catch (error) {
      console.error("Memory reset error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/voice/token", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      if (!deepgramVoiceService.isConfigured()) {
        return res.status(503).json({ error: "Voice service not configured" });
      }
      const token = await deepgramVoiceService.createSessionToken();
      res.json({ token });
    } catch (error) {
      console.error("[Voice API] Token error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/voice/process", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const user = req.user;
      const { audioData, returnAudio = true } = req.body;
      if (!audioData) {
        return res.status(400).json({ error: "Audio data required" });
      }
      if (typeof audioData !== "string") {
        return res.status(400).json({ error: "Audio data must be a base64 string" });
      }
      const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Pattern.test(audioData)) {
        return res.status(400).json({ error: "Invalid base64 audio data format" });
      }
      const MAX_AUDIO_SIZE = 10 * 1024 * 1024;
      if (audioData.length > MAX_AUDIO_SIZE) {
        return res.status(400).json({
          error: "Audio data exceeds maximum size limit of 10MB"
        });
      }
      if (!deepgramVoiceService.isConfigured()) {
        return res.status(503).json({ error: "Voice service not configured" });
      }
      let audioBuffer;
      try {
        audioBuffer = Buffer.from(audioData, "base64");
      } catch (decodeError) {
        return res.status(400).json({ error: "Failed to decode base64 audio data" });
      }
      if (audioBuffer.length === 0) {
        return res.status(400).json({ error: "Audio data is empty" });
      }
      const result = await deepgramVoiceService.processVoiceMessage(
        audioBuffer,
        user.businessAccountId,
        user.id,
        returnAudio
      );
      res.json({
        transcript: result.transcript,
        response: result.response,
        audio: result.audio ? result.audio.toString("base64") : void 0,
        products: result.products
      });
    } catch (error) {
      console.error("[Voice API] Processing error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  const getRandomIntroMessage = () => {
    const introMessages = [
      "Hey there! I'm Chroney, your AI assistant. I can help with products, FAQs, and more. What brings you here today? \u{1F680}",
      "What's up! Chroney here \u{1F3AF}. I know everything about our products and can answer your questions. How can I help?",
      "Yo! I'm Chroney, your friendly AI sidekick \u{1F913}. Need product info? Have questions? Just ask!",
      "Sup, human? Chroney reporting for duty \u{1F916}. Tell me what you need\u2014products, FAQs, or just browsing\u2014I'm here to help!",
      "Hey hey! Chroney here \u{1F576}\uFE0F. Think of me as your personal shopping assistant. What can I help you discover today?"
    ];
    return introMessages[Math.floor(Math.random() * introMessages.length)];
  };
  app2.get("/api/chat/intro", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      let settings = await storage.getWidgetSettings(businessAccountId);
      if (!settings) {
        settings = await storage.upsertWidgetSettings(businessAccountId, {});
      }
      if (settings.welcomeMessageType === "custom") {
        console.log(`[Intro API] Using custom welcome message`);
        return res.json({ intro: settings.welcomeMessage });
      }
      const intro = getRandomIntroMessage();
      console.log(`[Intro API] Using rotating intro message: ${intro.substring(0, 50)}...`);
      res.json({ intro });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/chat/stream", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }
      const user = req.user;
      if (!user.businessAccountId) {
        return res.status(403).json({ error: "Business account required" });
      }
      const widgetSettings2 = await storage.getWidgetSettings(user.businessAccountId);
      const personality = widgetSettings2?.personality || "friendly";
      const currency = widgetSettings2?.currency || "INR";
      const customInstructions = widgetSettings2?.customInstructions || "";
      const currencySymbols = {
        "INR": "\u20B9",
        "USD": "$",
        "AED": "\u062F.\u0625",
        "EUR": "\u20AC",
        "GBP": "\xA3",
        "AUD": "A$",
        "CAD": "C$",
        "CHF": "CHF",
        "CNY": "\xA5",
        "JPY": "\xA5",
        "KRW": "\u20A9",
        "SGD": "S$",
        "HKD": "HK$",
        "NZD": "NZ$",
        "SEK": "kr",
        "NOK": "kr",
        "DKK": "kr",
        "PLN": "z\u0142",
        "BRL": "R$",
        "MXN": "$",
        "ZAR": "R",
        "TRY": "\u20BA",
        "RUB": "\u20BD"
      };
      const currencySymbol = currencySymbols[currency] || "$";
      const businessAccount = await storage.getBusinessAccount(user.businessAccountId);
      const companyDescription = businessAccount?.description || "";
      const openaiApiKey = await storage.getBusinessAccountOpenAIKey(user.businessAccountId);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
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
        res.write(`data: ${JSON.stringify(chunk)}

`);
      }
      res.end();
    } catch (error) {
      console.error("Chat streaming error:", error);
      res.write(`data: ${JSON.stringify({ type: "error", data: error.message })}

`);
      res.end();
    }
  });
  app2.post("/api/business-accounts", requireAuth, requireRole("super_admin"), async (req, res) => {
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
      try {
        new URL(website);
      } catch {
        return res.status(400).json({ error: "Invalid website URL format" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(username)) {
        return res.status(400).json({ error: "Username must be a valid email address" });
      }
      const businessAccount = await storage.createBusinessAccount({ name, website, status: "active" });
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
      const password = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      const passwordHash = await hashPassword(password);
      const tempPasswordExpiry = /* @__PURE__ */ new Date();
      tempPasswordExpiry.setDate(tempPasswordExpiry.getDate() + 30);
      const user = await storage.createUserWithTempPassword({
        username,
        passwordHash,
        tempPassword: password,
        tempPasswordExpiry,
        mustChangePassword: "true",
        role: "business_user",
        businessAccountId: businessAccount.id
      });
      res.json({
        businessAccount,
        user,
        credentials: {
          username: user.username,
          tempPassword: password
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/business-accounts", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const accounts = await storage.getAllBusinessAccounts();
      const { toBusinessAccountDto: toBusinessAccountDto2 } = await Promise.resolve().then(() => (init_businessAccount(), businessAccount_exports));
      const dtos = accounts.map(toBusinessAccountDto2);
      res.json(dtos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.put("/api/business-accounts/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, website } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Business name required" });
      }
      if (!website) {
        return res.status(400).json({ error: "Website URL required" });
      }
      try {
        new URL(website);
      } catch {
        return res.status(400).json({ error: "Invalid website URL format" });
      }
      const businessAccount = await storage.updateBusinessAccount(id, { name, website });
      const { toBusinessAccountDto: toBusinessAccountDto2 } = await Promise.resolve().then(() => (init_businessAccount(), businessAccount_exports));
      res.json(toBusinessAccountDto2(businessAccount));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/business-accounts/:id/status", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status || status !== "active" && status !== "suspended") {
        return res.status(400).json({ error: "Status must be 'active' or 'suspended'" });
      }
      const businessAccount = await storage.updateBusinessAccountStatus(id, status);
      const { toBusinessAccountDto: toBusinessAccountDto2 } = await Promise.resolve().then(() => (init_businessAccount(), businessAccount_exports));
      res.json(toBusinessAccountDto2(businessAccount));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/business-accounts/:id/features", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { shopifyEnabled, appointmentsEnabled, voiceModeEnabled } = req.body;
      const updates = {};
      if (shopifyEnabled !== void 0) {
        if (typeof shopifyEnabled !== "boolean") {
          return res.status(400).json({ error: "shopifyEnabled must be a boolean" });
        }
        updates.shopifyEnabled = shopifyEnabled ? "true" : "false";
      }
      if (appointmentsEnabled !== void 0) {
        if (typeof appointmentsEnabled !== "boolean") {
          return res.status(400).json({ error: "appointmentsEnabled must be a boolean" });
        }
        updates.appointmentsEnabled = appointmentsEnabled ? "true" : "false";
      }
      if (voiceModeEnabled !== void 0) {
        if (typeof voiceModeEnabled !== "boolean") {
          return res.status(400).json({ error: "voiceModeEnabled must be a boolean" });
        }
        updates.voiceModeEnabled = voiceModeEnabled ? "true" : "false";
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid feature settings provided" });
      }
      const businessAccount = await storage.updateBusinessAccountFeatures(id, updates);
      const { toBusinessAccountDto: toBusinessAccountDto2 } = await Promise.resolve().then(() => (init_businessAccount(), businessAccount_exports));
      res.json(toBusinessAccountDto2(businessAccount));
    } catch (error) {
      if (error.message === "Business account not found") {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/business-accounts/:id/view-password", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const businessAccountId = req.params.id;
      const user = await storage.getUserByBusinessAccountId(businessAccountId);
      if (!user) {
        return res.status(404).json({ error: "User not found for this business account" });
      }
      res.json({
        username: user.username,
        tempPassword: user.tempPassword
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/business-accounts/:id/reset-password", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const businessAccountId = req.params.id;
      const user = await storage.getUserByBusinessAccountId(businessAccountId);
      if (!user) {
        return res.status(404).json({ error: "User not found for this business account" });
      }
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
      const password = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      const passwordHash = await hashPassword(password);
      const tempPasswordExpiry = /* @__PURE__ */ new Date();
      tempPasswordExpiry.setDate(tempPasswordExpiry.getDate() + 30);
      await storage.resetUserPassword(user.id, passwordHash, password, tempPasswordExpiry);
      res.json({
        username: user.username,
        tempPassword: password
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  function generateDemoToken() {
    return randomBytes(32).toString("hex");
  }
  app2.post("/api/super-admin/demo-pages", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { businessAccountId, title, description, appearance, expiresAt } = req.body;
      const userId = req.user.id;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account ID is required" });
      }
      const businessAccount = await storage.getBusinessAccount(businessAccountId);
      if (!businessAccount) {
        return res.status(404).json({ error: "Business account not found" });
      }
      const token = generateDemoToken();
      const demoPage = await storage.createDemoPage({
        businessAccountId,
        token,
        title: title || null,
        description: description || null,
        appearance: appearance || null,
        isActive: "true",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: userId
      });
      res.status(201).json(demoPage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/super-admin/demo-pages", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const demoPages2 = await storage.getAllDemoPages();
      res.json(demoPages2);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/super-admin/demo-pages/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const demoPage = await storage.getDemoPage(id);
      if (!demoPage) {
        return res.status(404).json({ error: "Demo page not found" });
      }
      res.json(demoPage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/super-admin/demo-pages/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, appearance, isActive, expiresAt } = req.body;
      const existing = await storage.getDemoPage(id);
      if (!existing) {
        return res.status(404).json({ error: "Demo page not found" });
      }
      const updates = {};
      if (title !== void 0) updates.title = title;
      if (description !== void 0) updates.description = description;
      if (appearance !== void 0) updates.appearance = appearance;
      if (isActive !== void 0) {
        if (typeof isActive !== "boolean") {
          return res.status(400).json({ error: "isActive must be a boolean" });
        }
        updates.isActive = isActive ? "true" : "false";
      }
      if (expiresAt !== void 0) {
        updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
      }
      const updated = await storage.updateDemoPage(id, updates);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/super-admin/demo-pages/:id/regenerate-token", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getDemoPage(id);
      if (!existing) {
        return res.status(404).json({ error: "Demo page not found" });
      }
      const newToken = generateDemoToken();
      const updated = await storage.regenerateDemoPageToken(id, newToken);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/super-admin/demo-pages/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getDemoPage(id);
      if (!existing) {
        return res.status(404).json({ error: "Demo page not found" });
      }
      await storage.deleteDemoPage(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/demo/by-token/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const demoPage = await storage.getDemoPageByToken(token);
      if (!demoPage) {
        return res.status(404).json({ error: "Demo page not found" });
      }
      if (demoPage.isActive !== "true") {
        return res.status(404).json({ error: "Demo page not found" });
      }
      if (demoPage.expiresAt && new Date(demoPage.expiresAt) < /* @__PURE__ */ new Date()) {
        return res.status(404).json({ error: "Demo page has expired" });
      }
      await storage.updateDemoPageLastViewed(token);
      const businessAccount = await storage.getBusinessAccount(demoPage.businessAccountId);
      if (!businessAccount) {
        return res.status(404).json({ error: "Business account not found" });
      }
      const websiteAnalysis2 = await storage.getWebsiteAnalysis(demoPage.businessAccountId);
      const widgetSettings2 = await storage.getWidgetSettings(demoPage.businessAccountId);
      res.json({
        id: demoPage.id,
        title: demoPage.title || businessAccount.name,
        description: demoPage.description || businessAccount.description,
        appearance: demoPage.appearance ? JSON.parse(demoPage.appearance) : null,
        businessAccount: {
          id: businessAccount.id,
          name: businessAccount.name,
          website: businessAccount.website,
          description: businessAccount.description
        },
        websiteAnalysis: websiteAnalysis2 ? {
          analyzedContent: websiteAnalysis2.analyzedContent ? JSON.parse(websiteAnalysis2.analyzedContent) : null
        } : null,
        widgetSettings: widgetSettings2 ? {
          chatColor: widgetSettings2.chatColor,
          chatColorEnd: widgetSettings2.chatColorEnd,
          widgetHeaderText: widgetSettings2.widgetHeaderText,
          buttonStyle: widgetSettings2.buttonStyle,
          buttonAnimation: widgetSettings2.buttonAnimation
        } : null
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/public-chat-link", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const user = req.user;
      const businessAccountId = user.businessAccountId;
      const link = await storage.getOrCreatePublicChatLink(businessAccountId);
      const baseUrl = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : req.protocol + "://" + req.get("host");
      res.json({
        ...link,
        url: `${baseUrl}/public-chat/${link.token}`
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/public-chat-link/toggle", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const user = req.user;
      const businessAccountId = user.businessAccountId;
      const link = await storage.togglePublicChatLinkStatus(businessAccountId);
      const baseUrl = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : req.protocol + "://" + req.get("host");
      res.json({
        ...link,
        url: `${baseUrl}/public-chat/${link.token}`
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/public-chat-link/regenerate", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const user = req.user;
      const businessAccountId = user.businessAccountId;
      const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const link = await storage.regeneratePublicChatLinkToken(businessAccountId, newToken);
      const baseUrl = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : req.protocol + "://" + req.get("host");
      res.json({
        ...link,
        url: `${baseUrl}/public-chat/${link.token}`
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/public-chat-link/password", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const user = req.user;
      const businessAccountId = user.businessAccountId;
      const { password } = req.body;
      const updatedLink = await storage.updatePublicChatLinkPassword(businessAccountId, password || null);
      const baseUrl = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : req.protocol + "://" + req.get("host");
      res.json({
        ...updatedLink,
        url: `${baseUrl}/public-chat/${updatedLink.token}`
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/public-chat/:token/verify-password", async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;
      const link = await storage.getPublicChatLinkByToken(token);
      if (!link || link.isActive !== "true") {
        return res.status(404).json({ error: "Chat link not found or disabled", verified: false });
      }
      if (!link.password) {
        res.cookie(`public_chat_verified_${token}`, "true", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          signed: true,
          maxAge: 24 * 60 * 60 * 1e3
          // 24 hours
        });
        return res.json({ verified: true });
      }
      if (password === link.password) {
        res.cookie(`public_chat_verified_${token}`, "true", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          signed: true,
          maxAge: 24 * 60 * 60 * 1e3
          // 24 hours
        });
        return res.json({ verified: true });
      }
      return res.status(401).json({ verified: false, error: "Incorrect password" });
    } catch (error) {
      res.status(500).json({ error: error.message, verified: false });
    }
  });
  app2.get("/api/public-chat/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const link = await storage.getPublicChatLinkByToken(token);
      if (!link) {
        return res.status(404).json({ error: "Chat link not found" });
      }
      if (link.isActive !== "true") {
        return res.status(404).json({ error: "Chat link is disabled" });
      }
      await storage.updatePublicChatLinkAccess(token);
      const businessAccount = await storage.getBusinessAccount(link.businessAccountId);
      if (!businessAccount) {
        return res.status(404).json({ error: "Business account not found" });
      }
      const websiteAnalysis2 = await storage.getWebsiteAnalysis(link.businessAccountId);
      const widgetSettings2 = await storage.getWidgetSettings(link.businessAccountId);
      res.json({
        businessAccount: {
          id: businessAccount.id,
          name: businessAccount.name,
          website: businessAccount.website,
          description: businessAccount.description
        },
        websiteAnalysis: websiteAnalysis2 ? {
          analyzedContent: websiteAnalysis2.analyzedContent ? JSON.parse(websiteAnalysis2.analyzedContent) : null
        } : null,
        widgetSettings: widgetSettings2 ? {
          chatColor: widgetSettings2.chatColor,
          chatColorEnd: widgetSettings2.chatColorEnd,
          widgetHeaderText: widgetSettings2.widgetHeaderText,
          currency: widgetSettings2.currency
        } : null,
        hasPassword: !!link.password
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/public-chat/:token/intro", async (req, res) => {
    try {
      const { token } = req.params;
      const link = await storage.getPublicChatLinkByToken(token);
      if (!link || link.isActive !== "true") {
        return res.status(404).json({ error: "Chat link not found or disabled" });
      }
      if (link.password) {
        const verificationCookie = req.signedCookies[`public_chat_verified_${token}`];
        if (verificationCookie !== "true") {
          return res.status(403).json({ error: "Password verification required" });
        }
      }
      const businessAccountId = link.businessAccountId;
      const intro = await generateIntroMessage(businessAccountId);
      res.json({ intro });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/public-chat/:token/message", async (req, res) => {
    try {
      const { token } = req.params;
      const { message } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }
      const link = await storage.getPublicChatLinkByToken(token);
      if (!link || link.isActive !== "true") {
        return res.status(404).json({ error: "Chat link not found or disabled" });
      }
      if (link.password) {
        const verificationCookie = req.signedCookies[`public_chat_verified_${token}`];
        if (verificationCookie !== "true") {
          return res.status(403).json({ error: "Password verification required" });
        }
      }
      const businessAccountId = link.businessAccountId;
      const publicUserId = `public_${token}`;
      const response = await processPublicChatMessage(message, businessAccountId, publicUserId);
      res.json(response);
    } catch (error) {
      console.error("[Public Chat] Error processing message:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/business-accounts/:id/users", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { username, password } = req.body;
      const businessAccountId = req.params.id;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(username)) {
        return res.status(400).json({ error: "Username must be a valid email address" });
      }
      const passwordHash = await hashPassword(password);
      const tempPasswordExpiry = /* @__PURE__ */ new Date();
      tempPasswordExpiry.setDate(tempPasswordExpiry.getDate() + 30);
      const user = await storage.createUserWithTempPassword({
        username,
        passwordHash,
        tempPassword: password,
        tempPasswordExpiry,
        mustChangePassword: "true",
        role: "business_user",
        businessAccountId
      });
      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        businessAccountId: user.businessAccountId,
        credentials: {
          username,
          password
          // Return plaintext password only on creation
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/business-accounts/:id/users", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const users2 = await storage.getUsersByBusinessAccount(req.params.id);
      res.json(users2);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/users", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/users/:id/credentials", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const isExpired = user.tempPasswordExpiry && new Date(user.tempPasswordExpiry) < /* @__PURE__ */ new Date();
      res.json({
        username: user.username,
        tempPassword: user.tempPassword,
        tempPasswordExpiry: user.tempPasswordExpiry,
        isExpired,
        hasCredentials: !!user.tempPassword
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/users/:id/reset-password", requireAuth, requireRole("super_admin"), async (req, res) => {
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
      const tempPasswordExpiry = /* @__PURE__ */ new Date();
      tempPasswordExpiry.setDate(tempPasswordExpiry.getDate() + 30);
      const updatedUser = await storage.resetUserPassword(userId, passwordHash, password, tempPasswordExpiry);
      res.json({
        success: true,
        credentials: {
          username: updatedUser.username,
          password
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!newPassword) {
        return res.status(400).json({ error: "New password required" });
      }
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      if (user.mustChangePassword !== "true" && currentPassword) {
        if (!await verifyPassword(currentPassword, user.passwordHash)) {
          return res.status(401).json({ error: "Current password is incorrect" });
        }
      }
      const passwordHash = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, passwordHash);
      await storage.clearTempPassword(user.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const user = await storage.getUserByUsername(email);
      if (!user) {
        return res.json({
          success: true,
          message: "If an account exists with this email, a password reset link has been sent"
        });
      }
      const resetToken = randomUUID();
      const expiresAt = /* @__PURE__ */ new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      await storage.createPasswordResetToken({
        userId: user.id,
        token: resetToken,
        expiresAt
      });
      console.log(`[Password Reset] Token generated for ${user.username}: ${resetToken}`);
      console.log(`[Password Reset] Reset link: ${process.env.REPLIT_DEV_DOMAIN || "localhost:5000"}/reset-password?token=${resetToken}`);
      res.json({
        success: true,
        message: "If an account exists with this email, a password reset link has been sent"
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "An error occurred. Please try again later." });
    }
  });
  app2.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long" });
      }
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ error: "Invalid or expired reset link" });
      }
      if (/* @__PURE__ */ new Date() > new Date(resetToken.expiresAt)) {
        return res.status(400).json({ error: "Reset link has expired. Please request a new one" });
      }
      if (resetToken.usedAt) {
        return res.status(400).json({ error: "This reset link has already been used" });
      }
      const passwordHash = await hashPassword(newPassword);
      await storage.updateUserPassword(resetToken.userId, passwordHash);
      await storage.clearTempPassword(resetToken.userId);
      await storage.markPasswordResetTokenAsUsed(token);
      res.json({ success: true, message: "Password reset successful. You can now log in with your new password" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "An error occurred. Please try again later." });
    }
  });
  const portfolioDir = path2.join(process.cwd(), "Portfolio");
  if (!fs2.existsSync(portfolioDir)) {
    fs2.mkdirSync(portfolioDir, { recursive: true });
  }
  const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, portfolioDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${randomUUID()}${path2.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  });
  const upload = multer({
    storage: multerStorage,
    limits: {
      fileSize: 10 * 1024 * 1024
      // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."));
      }
    }
  });
  const excelUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024
      // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        // .xlsx
        "application/vnd.ms-excel",
        // .xls
        "text/csv"
        // .csv
      ];
      const allowedExtensions = [".xlsx", ".xls", ".csv"];
      const fileExtension = path2.extname(file.originalname).toLowerCase();
      if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed."));
      }
    }
  });
  const trainingDocsDir = path2.join(process.cwd(), "uploads", "training-docs");
  if (!fs2.existsSync(trainingDocsDir)) {
    fs2.mkdirSync(trainingDocsDir, { recursive: true });
  }
  const pdfStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, trainingDocsDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${randomUUID()}${path2.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  });
  const pdfUpload = multer({
    storage: pdfStorage,
    limits: {
      fileSize: 25 * 1024 * 1024
      // 25MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = ["application/pdf"];
      const allowedExtensions = [".pdf"];
      const fileExtension = path2.extname(file.originalname).toLowerCase();
      if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Only PDF files are allowed."));
      }
    }
  });
  app2.post("/api/upload-image", requireAuth, upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const imageUrl = `/portfolio/${req.file.filename}`;
      res.json({ imageUrl });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ error: error.message || "Failed to upload image" });
    }
  });
  app2.delete("/api/delete-image", requireAuth, async (req, res) => {
    try {
      const { imageUrl } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ error: "Image URL required" });
      }
      const filename = imageUrl.replace("/portfolio/", "");
      const sanitizedFilename = path2.basename(filename);
      if (sanitizedFilename.startsWith(".")) {
        return res.status(403).json({ error: "Access denied" });
      }
      const filepath = path2.join(portfolioDir, sanitizedFilename);
      const normalizedPath = path2.normalize(filepath);
      if (!normalizedPath.startsWith(portfolioDir)) {
        return res.status(403).json({ error: "Access denied" });
      }
      if (fs2.existsSync(normalizedPath)) {
        fs2.unlinkSync(normalizedPath);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting image:", error);
      res.status(500).json({ error: error.message || "Failed to delete image" });
    }
  });
  app2.get("/portfolio/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;
      const sanitizedFilename = path2.basename(filename);
      if (sanitizedFilename.startsWith(".")) {
        return res.status(403).json({ error: "Access denied" });
      }
      const filepath = path2.join(portfolioDir, sanitizedFilename);
      const normalizedPath = path2.normalize(filepath);
      if (!normalizedPath.startsWith(portfolioDir)) {
        return res.status(403).json({ error: "Access denied" });
      }
      if (!fs2.existsSync(normalizedPath)) {
        return res.status(404).json({ error: "Image not found" });
      }
      res.sendFile(normalizedPath, {
        headers: {
          "Cache-Control": "public, max-age=31536000"
          // Cache for 1 year
        }
      });
    } catch (error) {
      console.error("Error serving image:", error);
      res.status(500).json({ error: "Failed to serve image" });
    }
  });
  const invalidateCachedIntro = async (businessAccountId) => {
    try {
      await storage.upsertWidgetSettings(businessAccountId, { cachedIntro: null });
    } catch (error) {
      console.error("[Cache] Failed to invalidate cached intro:", error);
    }
  };
  app2.post("/api/products", requireAuth, requireBusinessAccount, async (req, res) => {
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
      await invalidateCachedIntro(businessAccountId);
      res.json(product);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.get("/api/products", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const products2 = await storage.getAllProducts(businessAccountId);
      res.json(products2);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/products/:id", requireAuth, requireBusinessAccount, async (req, res) => {
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
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/products/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const product = await storage.updateProduct(req.params.id, businessAccountId, req.body);
      await invalidateCachedIntro(businessAccountId);
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/products/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      await storage.deleteProduct(req.params.id, businessAccountId);
      await invalidateCachedIntro(businessAccountId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/categories", requireAuth, requireBusinessAccount, async (req, res) => {
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
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.get("/api/categories", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const categories2 = await storage.getAllCategories(businessAccountId);
      res.json(categories2);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/categories/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const category = await storage.updateCategory(req.params.id, businessAccountId, req.body);
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/categories/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      await storage.deleteCategory(req.params.id, businessAccountId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/tags", requireAuth, requireBusinessAccount, async (req, res) => {
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
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.get("/api/tags", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const tags2 = await storage.getAllTags(businessAccountId);
      res.json(tags2);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/tags/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const tag = await storage.updateTag(req.params.id, businessAccountId, req.body);
      res.json(tag);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/tags/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      await storage.deleteTag(req.params.id, businessAccountId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/products/:productId/categories", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const { productId } = req.params;
      const { categoryId } = req.body;
      if (!categoryId) {
        return res.status(400).json({ error: "Category ID required" });
      }
      const assignment = await storage.assignProductToCategory(productId, categoryId);
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/products/:productId/categories", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const { productId } = req.params;
      const categories2 = await storage.getProductCategories(productId);
      res.json(categories2);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/products/:productId/categories/:categoryId", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const { productId, categoryId } = req.params;
      await storage.removeProductFromCategory(productId, categoryId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.put("/api/products/:productId/categories", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const { productId } = req.params;
      const { categoryIds } = req.body;
      if (!Array.isArray(categoryIds)) {
        return res.status(400).json({ error: "categoryIds must be an array" });
      }
      const existingCategories = await storage.getProductCategories(productId);
      for (const category of existingCategories) {
        await storage.removeProductFromCategory(productId, category.id);
      }
      for (const categoryId of categoryIds) {
        await storage.assignProductToCategory(productId, categoryId);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/products/:productId/tags", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const { productId } = req.params;
      const { tagId } = req.body;
      if (!tagId) {
        return res.status(400).json({ error: "Tag ID required" });
      }
      const assignment = await storage.assignProductToTag(productId, tagId);
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/products/:productId/tags", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const { productId } = req.params;
      const tags2 = await storage.getProductTags(productId);
      res.json(tags2);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/products/:productId/tags/:tagId", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const { productId, tagId } = req.params;
      await storage.removeProductFromTag(productId, tagId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.put("/api/products/:productId/tags", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const { productId } = req.params;
      const { tagIds } = req.body;
      if (!Array.isArray(tagIds)) {
        return res.status(400).json({ error: "tagIds must be an array" });
      }
      const existingTags = await storage.getProductTags(productId);
      for (const tag of existingTags) {
        await storage.removeProductFromTag(productId, tag.id);
      }
      for (const tagId of tagIds) {
        await storage.assignProductToTag(productId, tagId);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/product-relationships", requireAuth, requireBusinessAccount, async (req, res) => {
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
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.get("/api/products/:productId/relationships", requireAuth, requireBusinessAccount, async (req, res) => {
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
        type
      );
      res.json(relationships);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/products/:productId/related", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const { productId } = req.params;
      const relatedProducts = await storage.getRelatedProducts(productId, businessAccountId);
      res.json(relatedProducts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/product-relationships/:id", requireAuth, requireBusinessAccount, async (req, res) => {
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
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/product-relationships/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      await storage.deleteProductRelationship(req.params.id, businessAccountId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/faqs", requireAuth, requireBusinessAccount, async (req, res) => {
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
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.get("/api/faqs", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const faqs2 = await storage.getAllFaqs(businessAccountId);
      res.json(faqs2);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/faqs/:id", requireAuth, requireBusinessAccount, async (req, res) => {
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
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/faqs/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const faq = await storage.updateFaq(req.params.id, businessAccountId, req.body);
      res.json(faq);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/faqs/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      await storage.deleteFaq(req.params.id, businessAccountId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/faqs/bulk", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const { faqs: faqs2 } = req.body;
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      if (!faqs2 || !Array.isArray(faqs2) || faqs2.length === 0) {
        return res.status(400).json({ error: "FAQs array is required" });
      }
      const createdFaqs = [];
      for (const faq of faqs2) {
        const faqData = {
          ...faq,
          businessAccountId
        };
        const result = insertFaqSchema.safeParse(faqData);
        if (!result.success) {
          continue;
        }
        const created = await storage.createFaq(result.data);
        createdFaqs.push(created);
      }
      res.json({
        success: true,
        count: createdFaqs.length,
        faqs: createdFaqs
      });
    } catch (error) {
      console.error("Error bulk adding FAQs:", error);
      res.status(500).json({ error: error.message || "Failed to add FAQs" });
    }
  });
  app2.post("/api/training-documents", requireAuth, requireBusinessAccount, pdfUpload.single("file"), async (req, res) => {
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
      const documentData = insertTrainingDocumentSchema.parse({
        businessAccountId,
        filename: req.file.filename,
        originalFilename: req.file.originalname,
        fileSize: req.file.size.toString(),
        storageKey: req.file.path,
        uploadStatus: "pending",
        uploadedBy: userId
      });
      const document2 = await storage.createTrainingDocument(documentData);
      pdfProcessingService.processDocument(
        document2.id,
        req.file.path,
        businessAccountId,
        req.file.originalname
      ).catch((error) => {
        console.error("Background PDF processing error:", error);
      });
      res.status(201).json(document2);
    } catch (error) {
      console.error("Error uploading training document:", error);
      if (req.file?.path) {
        try {
          fs2.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error("Error deleting uploaded file:", unlinkError);
        }
      }
      res.status(500).json({ error: error.message || "Failed to upload training document" });
    }
  });
  app2.get("/api/training-documents", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const documents = await storage.getTrainingDocuments(businessAccountId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching training documents:", error);
      res.status(500).json({ error: error.message || "Failed to fetch training documents" });
    }
  });
  app2.get("/api/training-documents/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const document2 = await storage.getTrainingDocument(req.params.id, businessAccountId);
      if (!document2) {
        return res.status(404).json({ error: "Training document not found" });
      }
      res.json(document2);
    } catch (error) {
      console.error("Error fetching training document:", error);
      res.status(500).json({ error: error.message || "Failed to fetch training document" });
    }
  });
  app2.delete("/api/training-documents/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const document2 = await storage.getTrainingDocument(req.params.id, businessAccountId);
      if (!document2) {
        return res.status(404).json({ error: "Training document not found" });
      }
      if (document2.storageKey) {
        try {
          fs2.unlinkSync(document2.storageKey);
        } catch (fileError) {
          console.error("Error deleting file:", fileError);
        }
      }
      await storage.deleteTrainingDocument(req.params.id, businessAccountId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting training document:", error);
      res.status(500).json({ error: error.message || "Failed to delete training document" });
    }
  });
  app2.post("/api/leads", requireAuth, requireBusinessAccount, async (req, res) => {
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
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.get("/api/leads", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const { fromDate, toDate } = req.query;
      const leads2 = await storage.getAllLeads(businessAccountId);
      let filteredLeads = leads2;
      if (fromDate && typeof fromDate === "string") {
        const from = new Date(fromDate);
        filteredLeads = filteredLeads.filter((lead) => new Date(lead.createdAt) >= from);
      }
      if (toDate && typeof toDate === "string") {
        const to = new Date(toDate);
        filteredLeads = filteredLeads.filter((lead) => new Date(lead.createdAt) <= to);
      }
      res.json(filteredLeads);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/leads/:id", requireAuth, requireBusinessAccount, async (req, res) => {
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
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/leads/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      await storage.deleteLead(req.params.id, businessAccountId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/schedule-templates", requireAuth, requireBusinessAccount, async (req, res) => {
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
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.get("/api/schedule-templates", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const templates = await storage.getScheduleTemplates(businessAccountId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/schedule-templates/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const template = await storage.updateScheduleTemplate(req.params.id, businessAccountId, req.body);
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/schedule-templates/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      await storage.deleteScheduleTemplate(req.params.id, businessAccountId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/slot-overrides", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      console.log("[Slot Override] Request body:", req.body);
      const validatedData = insertSlotOverrideSchema.parse({
        ...req.body,
        slotDate: new Date(req.body.slotDate),
        durationMinutes: String(req.body.durationMinutes),
        businessAccountId
      });
      const override = await storage.createSlotOverride(validatedData);
      res.json(override);
    } catch (error) {
      console.error("[Slot Override] Validation error:", error);
      res.status(400).json({ error: error.message });
    }
  });
  app2.get("/api/slot-overrides", requireAuth, requireBusinessAccount, async (req, res) => {
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
        new Date(startDate),
        new Date(endDate)
      );
      res.json(overrides);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/slot-overrides/:id", requireAuth, requireBusinessAccount, async (req, res) => {
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
    } catch (error) {
      console.error("[API] Update slot override error:", error);
      res.status(400).json({ error: error.message });
    }
  });
  app2.delete("/api/slot-overrides/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      await storage.deleteSlotOverride(req.params.id, businessAccountId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/appointments", requireAuth, requireBusinessAccount, async (req, res) => {
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
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.get("/api/appointments", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const { startDate, endDate, status } = req.query;
      if (status && typeof status === "string") {
        const appointments3 = await storage.getAppointmentsByStatus(businessAccountId, status);
        return res.json(appointments3);
      }
      if (startDate && endDate) {
        const appointments3 = await storage.getAppointmentsForRange(
          businessAccountId,
          new Date(startDate),
          new Date(endDate)
        );
        return res.json(appointments3);
      }
      const appointments2 = await storage.getAllAppointments(businessAccountId);
      res.json(appointments2);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/appointments/:id/status", requireAuth, requireBusinessAccount, async (req, res) => {
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
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/conversations", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const { fromDate, toDate } = req.query;
      const conversations2 = await storage.getAllConversations(businessAccountId);
      let filteredConversations = conversations2;
      if (fromDate && typeof fromDate === "string") {
        const from = new Date(fromDate);
        filteredConversations = filteredConversations.filter((conv) => new Date(conv.createdAt) >= from);
      }
      if (toDate && typeof toDate === "string") {
        const to = new Date(toDate);
        filteredConversations = filteredConversations.filter((conv) => new Date(conv.createdAt) <= to);
      }
      const conversationIds = filteredConversations.map((conv) => conv.id);
      const messageCounts = await storage.getMessageCountsForConversations(conversationIds);
      const conversationsWithCounts = filteredConversations.map((conv) => ({
        ...conv,
        messageCount: messageCounts[conv.id] || 0
      }));
      res.json(conversationsWithCounts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/conversations/:id/messages", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const conversationId = req.params.id;
      const messages2 = await storage.getMessagesByConversation(conversationId, businessAccountId);
      res.json(messages2);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/about", requireAuth, requireBusinessAccount, async (req, res) => {
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
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/about", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const { description } = req.body;
      if (typeof description !== "string") {
        return res.status(400).json({ error: "Description must be a string" });
      }
      const account = await storage.updateBusinessAccountDescription(businessAccountId, description);
      res.json({
        name: account.name,
        description: account.description || ""
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/website-analysis", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const analysis = await storage.getWebsiteAnalysis(businessAccountId);
      if (!analysis) {
        return res.json({
          status: "not_started",
          websiteUrl: "",
          analyzedContent: null
        });
      }
      res.json({
        status: analysis.status,
        websiteUrl: analysis.websiteUrl,
        analyzedContent: analysis.analyzedContent ? JSON.parse(analysis.analyzedContent) : null,
        errorMessage: analysis.errorMessage,
        lastAnalyzedAt: analysis.lastAnalyzedAt
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/website-analysis", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const { websiteUrl, additionalPages, analyzeOnlyAdditional } = req.body;
      if (!websiteUrl || typeof websiteUrl !== "string") {
        return res.status(400).json({ error: "Website URL is required" });
      }
      let pagesToAnalyze = [];
      if (analyzeOnlyAdditional) {
        if (!additionalPages || !Array.isArray(additionalPages) || additionalPages.length === 0) {
          return res.status(400).json({ error: "No additional pages provided" });
        }
        pagesToAnalyze = additionalPages;
      } else {
        pagesToAnalyze = [websiteUrl];
        if (additionalPages && Array.isArray(additionalPages)) {
          pagesToAnalyze.push(...additionalPages);
        }
      }
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
      const businessAccount = await storage.getBusinessAccount(businessAccountId);
      if (!businessAccount?.openaiApiKey) {
        return res.status(400).json({ error: "OpenAI API key not configured. Please set it in Settings first." });
      }
      const { websiteAnalysisService: websiteAnalysisService2 } = await Promise.resolve().then(() => (init_websiteAnalysisService(), websiteAnalysisService_exports));
      await storage.upsertWebsiteAnalysis(businessAccountId, {
        websiteUrl,
        status: "pending"
      });
      if (!additionalPages || additionalPages.length === 0) {
        websiteAnalysisService2.analyzeWebsite(websiteUrl, businessAccountId, businessAccount.openaiApiKey).catch((error) => {
          console.error("[Website Analysis] Error:", error);
        });
      } else {
        const shouldAppend = analyzeOnlyAdditional || additionalPages?.length > 0;
        websiteAnalysisService2.analyzeWebsitePages(pagesToAnalyze, businessAccountId, businessAccount.openaiApiKey, shouldAppend).catch((error) => {
          console.error("[Website Analysis] Error:", error);
        });
      }
      const message = analyzeOnlyAdditional ? `Analyzing ${pagesToAnalyze.length} additional ${pagesToAnalyze.length === 1 ? "page" : "pages"}. Data will be merged with existing analysis...` : pagesToAnalyze.length > 1 ? `Website analysis started for ${pagesToAnalyze.length} pages. This may take a few minutes...` : "Website analysis started. This may take a minute...";
      res.json({
        status: "pending",
        message
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/website-analysis", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const { analyzedContent } = req.body;
      if (!analyzedContent) {
        return res.status(400).json({ error: "Analyzed content is required" });
      }
      const validationResult = updateWebsiteAnalysisSchema.safeParse(analyzedContent);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Invalid content format",
          details: validationResult.error.errors
        });
      }
      const existingAnalysis = await storage.getWebsiteAnalysis(businessAccountId);
      if (!existingAnalysis) {
        return res.status(404).json({ error: "No website analysis found to update" });
      }
      await storage.upsertWebsiteAnalysis(businessAccountId, {
        websiteUrl: existingAnalysis.websiteUrl,
        status: "completed",
        analyzedContent: JSON.stringify(validationResult.data)
      });
      res.json({
        success: true,
        message: "Website analysis content updated successfully"
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/website-analysis", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      await storage.deleteWebsiteAnalysis(businessAccountId);
      await storage.deleteAnalyzedPages(businessAccountId);
      res.json({
        success: true,
        message: "Website analysis reset successfully"
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/analyzed-pages", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const pages = await storage.getAnalyzedPages(businessAccountId);
      res.json(pages);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/analyzed-pages/:id", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const { id } = req.params;
      await storage.deleteAnalyzedPage(id, businessAccountId);
      businessContextCache.invalidate(`business_context_${businessAccountId}`);
      res.json({ success: true, message: "Analyzed page deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/widget-settings/public", async (req, res) => {
    try {
      const businessAccountId = req.query.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account ID required" });
      }
      let settings = await storage.getWidgetSettings(businessAccountId);
      if (!settings) {
        settings = await storage.upsertWidgetSettings(businessAccountId, {});
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/widget-settings", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      let settings = await storage.getWidgetSettings(businessAccountId);
      if (!settings) {
        settings = await storage.upsertWidgetSettings(businessAccountId, {});
      }
      const safeSettings = {
        ...settings,
        twilioAccountSid: settings.twilioAccountSid ? `AC...${settings.twilioAccountSid.slice(-4)}` : null,
        twilioAuthToken: settings.twilioAuthToken ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : null
      };
      res.json(safeSettings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/widget-settings", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const {
        chatColor,
        chatColorEnd,
        widgetHeaderText,
        welcomeMessageType,
        welcomeMessage,
        buttonStyle,
        buttonAnimation,
        personality,
        currency,
        customInstructions,
        appointmentBookingEnabled,
        enableCartRecovery,
        recoveryTriggerMinutes,
        recoveryDiscountType,
        recoveryDiscountValue,
        recoveryEmailEnabled,
        recoveryWhatsappEnabled,
        twilioAccountSid,
        twilioAuthToken,
        twilioWhatsappFrom,
        widgetWidth,
        widgetHeight,
        widgetPosition,
        bubbleSize,
        sizePreset,
        autoOpenChat
      } = req.body;
      const updateData = {};
      if (chatColor !== void 0) updateData.chatColor = chatColor;
      if (chatColorEnd !== void 0) updateData.chatColorEnd = chatColorEnd;
      if (widgetHeaderText !== void 0) updateData.widgetHeaderText = widgetHeaderText;
      if (welcomeMessageType !== void 0) updateData.welcomeMessageType = welcomeMessageType;
      if (welcomeMessage !== void 0) updateData.welcomeMessage = welcomeMessage;
      if (buttonStyle !== void 0) updateData.buttonStyle = buttonStyle;
      if (buttonAnimation !== void 0) updateData.buttonAnimation = buttonAnimation;
      if (personality !== void 0) updateData.personality = personality;
      if (currency !== void 0) updateData.currency = currency;
      if (customInstructions !== void 0) updateData.customInstructions = customInstructions;
      if (widgetWidth !== void 0) updateData.widgetWidth = widgetWidth;
      if (widgetHeight !== void 0) updateData.widgetHeight = widgetHeight;
      if (widgetPosition !== void 0) updateData.widgetPosition = widgetPosition;
      if (bubbleSize !== void 0) updateData.bubbleSize = bubbleSize;
      if (sizePreset !== void 0) updateData.sizePreset = sizePreset;
      if (autoOpenChat !== void 0) updateData.autoOpenChat = autoOpenChat;
      if (appointmentBookingEnabled !== void 0) updateData.appointmentBookingEnabled = appointmentBookingEnabled;
      if (enableCartRecovery !== void 0) updateData.enableCartRecovery = enableCartRecovery;
      if (recoveryTriggerMinutes !== void 0) updateData.recoveryTriggerMinutes = recoveryTriggerMinutes;
      if (recoveryDiscountType !== void 0) updateData.recoveryDiscountType = recoveryDiscountType;
      if (recoveryDiscountValue !== void 0) updateData.recoveryDiscountValue = recoveryDiscountValue;
      if (recoveryEmailEnabled !== void 0) updateData.recoveryEmailEnabled = recoveryEmailEnabled;
      if (recoveryWhatsappEnabled !== void 0) updateData.recoveryWhatsappEnabled = recoveryWhatsappEnabled;
      if (twilioAccountSid !== void 0 && twilioAccountSid !== "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" && twilioAccountSid !== "") {
        updateData.twilioAccountSid = twilioAccountSid;
      }
      if (twilioAuthToken !== void 0 && twilioAuthToken !== "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" && twilioAuthToken !== "") {
        updateData.twilioAuthToken = twilioAuthToken;
      }
      if (twilioWhatsappFrom !== void 0) updateData.twilioWhatsappFrom = twilioWhatsappFrom;
      if (personality !== void 0 || welcomeMessageType !== void 0 || customInstructions !== void 0) {
        updateData.cachedIntro = null;
        const { businessContextCache: businessContextCache2 } = await Promise.resolve().then(() => (init_businessContextCache(), businessContextCache_exports));
        const cacheKey = `business_context_${businessAccountId}`;
        businessContextCache2.invalidate(cacheKey);
        console.log("[Cache] Cleared business context cache due to settings change");
      }
      const settings = await storage.upsertWidgetSettings(businessAccountId, updateData);
      const safeSettings = {
        ...settings,
        twilioAccountSid: settings.twilioAccountSid ? `AC...${settings.twilioAccountSid.slice(-4)}` : null,
        twilioAuthToken: settings.twilioAuthToken ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : null
      };
      res.json(safeSettings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/settings/openai-key", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const apiKey = await storage.getBusinessAccountOpenAIKey(businessAccountId);
      const maskedKey = apiKey ? `sk-...${apiKey.slice(-4)}` : null;
      res.json({
        hasKey: !!apiKey,
        maskedKey
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.put("/api/settings/openai-key", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const { apiKey } = req.body;
      if (apiKey && typeof apiKey === "string") {
        if (!apiKey.startsWith("sk-")) {
          return res.status(400).json({ error: "Invalid OpenAI API key format. Key should start with 'sk-'" });
        }
        if (apiKey.length < 20) {
          return res.status(400).json({ error: "Invalid OpenAI API key format. Key is too short." });
        }
      }
      const saveKey = apiKey && apiKey.trim() ? apiKey.trim() : null;
      await storage.updateBusinessAccountOpenAIKey(businessAccountId, saveKey);
      const maskedKey = saveKey ? `sk-...${saveKey.slice(-4)}` : null;
      res.json({
        success: true,
        hasKey: !!saveKey,
        maskedKey
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/settings/shopify", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const credentials = await storage.getShopifyCredentials(businessAccountId);
      const maskedToken = credentials.accessToken ? `${credentials.accessToken.slice(0, 8)}...${credentials.accessToken.slice(-4)}` : null;
      res.json({
        storeUrl: credentials.storeUrl,
        hasToken: !!credentials.accessToken,
        maskedToken
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.put("/api/settings/shopify", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const { storeUrl, accessToken } = req.body;
      if (storeUrl && typeof storeUrl === "string") {
        const trimmedUrl = storeUrl.trim().toLowerCase();
        if (!trimmedUrl.endsWith(".myshopify.com")) {
          return res.status(400).json({
            error: "Invalid Shopify store URL. It should end with '.myshopify.com'"
          });
        }
      }
      const saveUrl = storeUrl && storeUrl.trim() ? storeUrl.trim() : null;
      const saveToken = accessToken && accessToken.trim() ? accessToken.trim() : null;
      await storage.updateShopifyCredentials(businessAccountId, saveUrl, saveToken);
      const maskedToken = saveToken ? `${saveToken.slice(0, 8)}...${saveToken.slice(-4)}` : null;
      res.json({
        success: true,
        storeUrl: saveUrl,
        hasToken: !!saveToken,
        maskedToken
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/shopify/import", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const credentials = await storage.getShopifyCredentials(businessAccountId);
      if (!credentials.storeUrl || !credentials.accessToken) {
        return res.status(400).json({
          error: "Shopify credentials not configured. Please add your store URL and access token in Settings first."
        });
      }
      const { ShopifyService: ShopifyService2 } = await Promise.resolve().then(() => (init_shopifyService(), shopifyService_exports));
      const shopifyService = new ShopifyService2(credentials.storeUrl, credentials.accessToken);
      const isConnected = await shopifyService.testConnection();
      if (!isConnected) {
        return res.status(400).json({
          error: "Failed to connect to Shopify. Please verify:\n\u2022 Your store URL is correct (e.g., yourstore.myshopify.com)\n\u2022 Your access token starts with 'shpat_' and is valid\n\u2022 Your custom app has 'read_products' permission enabled\n\u2022 The app is installed in your Shopify store"
        });
      }
      const shopifyProducts = await shopifyService.fetchProducts(250);
      const importedCount = 0;
      const updatedCount = 0;
      const skippedCount = 0;
      for (const shopifyProduct of shopifyProducts) {
        try {
          const existingProducts = await storage.getAllProducts(businessAccountId);
          const existing = existingProducts.find((p) => p.shopifyProductId === shopifyProduct.shopifyId);
          if (existing) {
            await storage.updateProduct(existing.id, businessAccountId, {
              name: shopifyProduct.name,
              description: shopifyProduct.description,
              price: shopifyProduct.price || void 0,
              imageUrl: shopifyProduct.imageUrl || void 0,
              shopifyLastSyncedAt: /* @__PURE__ */ new Date()
            });
          } else {
            await storage.createProduct({
              businessAccountId,
              name: shopifyProduct.name,
              description: shopifyProduct.description,
              price: shopifyProduct.price || void 0,
              imageUrl: shopifyProduct.imageUrl || void 0,
              source: "shopify",
              shopifyProductId: shopifyProduct.shopifyId,
              shopifyLastSyncedAt: /* @__PURE__ */ new Date(),
              isEditable: "false"
            });
          }
        } catch (productError) {
          console.error("[Shopify Import] Failed to import product:", productError);
        }
      }
      res.json({
        success: true,
        message: `Successfully imported ${shopifyProducts.length} products from Shopify`,
        imported: shopifyProducts.length
      });
    } catch (error) {
      console.error("[Shopify Import] Error:", error);
      res.status(500).json({ error: error.message || "Failed to import products from Shopify" });
    }
  });
  const syncRateLimiter = /* @__PURE__ */ new Map();
  const SYNC_COOLDOWN_MS = 5 * 60 * 1e3;
  app2.post("/api/shopify/sync-now", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const lastSync = syncRateLimiter.get(businessAccountId);
      const now = Date.now();
      if (lastSync && now - lastSync < SYNC_COOLDOWN_MS) {
        const remainingTime = Math.ceil((SYNC_COOLDOWN_MS - (now - lastSync)) / 1e3 / 60);
        return res.status(429).json({
          success: false,
          error: `Please wait ${remainingTime} minute(s) before syncing again to avoid rate limits.`
        });
      }
      syncRateLimiter.set(businessAccountId, now);
      const { shopifySyncScheduler: shopifySyncScheduler2 } = await Promise.resolve().then(() => (init_shopifySyncScheduler(), shopifySyncScheduler_exports));
      const result = await shopifySyncScheduler2.syncNow(businessAccountId);
      if (!result.success) {
        syncRateLimiter.delete(businessAccountId);
      }
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("[Shopify Sync Now] Error:", error);
      syncRateLimiter.delete(req.user?.businessAccountId || "");
      res.status(500).json({
        success: false,
        error: error.message || "Failed to sync products from Shopify"
      });
    }
  });
  app2.get("/api/shopify/auto-sync", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const settings = await storage.getShopifyAutoSyncSettings(businessAccountId);
      res.json(settings);
    } catch (error) {
      console.error("[Shopify Auto-Sync Settings] Error:", error);
      res.status(500).json({ error: error.message || "Failed to get auto-sync settings" });
    }
  });
  app2.put("/api/shopify/auto-sync", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const { enabled, frequency } = req.body;
      if (typeof enabled !== "boolean") {
        return res.status(400).json({ error: "Invalid enabled value" });
      }
      const validFrequencies = [6, 12, 24, 48];
      if (!validFrequencies.includes(frequency)) {
        return res.status(400).json({ error: "Invalid frequency. Must be 6, 12, 24, or 48 hours" });
      }
      await storage.updateShopifyAutoSync(businessAccountId, enabled, frequency);
      const updated = await storage.getShopifyAutoSyncSettings(businessAccountId);
      res.json({ success: true, settings: updated });
    } catch (error) {
      console.error("[Shopify Auto-Sync Update] Error:", error);
      res.status(500).json({ error: error.message || "Failed to update auto-sync settings" });
    }
  });
  app2.post("/api/products/import-excel", requireAuth, requireBusinessAccount, excelUpload.single("file"), async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      if (data.length === 0) {
        return res.status(400).json({ error: "Excel file is empty or invalid format" });
      }
      let importedCount = 0;
      let skippedCount = 0;
      const errors = [];
      for (const row of data) {
        try {
          const rowData = {};
          for (const key in row) {
            rowData[key.toLowerCase().trim()] = row[key];
          }
          const name = rowData["name"] || rowData["product name"] || rowData["title"];
          const description = rowData["description"] || rowData["desc"] || "";
          const price = rowData["price"] || rowData["cost"] || null;
          const imageUrl = rowData["image"] || rowData["image url"] || rowData["imageurl"] || null;
          const categoriesStr = rowData["categories"] || rowData["category"] || "";
          const tagsStr = rowData["tags"] || rowData["tag"] || "";
          if (!name) {
            skippedCount++;
            errors.push(`Row skipped: Missing product name`);
            continue;
          }
          const product = await storage.createProduct({
            businessAccountId,
            name: String(name).trim(),
            description: String(description).trim(),
            price: price ? String(price) : void 0,
            imageUrl: imageUrl ? String(imageUrl).trim() : void 0,
            source: "manual",
            isEditable: "true"
          });
          if (categoriesStr && String(categoriesStr).trim()) {
            const categoryNames = String(categoriesStr).split(",").map((c) => c.trim()).filter((c) => c.length > 0);
            for (const categoryName of categoryNames) {
              try {
                const allCategories = await storage.getAllCategories(businessAccountId);
                let category = allCategories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
                if (!category) {
                  category = await storage.createCategory({
                    businessAccountId,
                    name: categoryName
                  });
                }
                await storage.assignProductToCategory(product.id, category.id);
              } catch (catError) {
                console.error("[Excel Import] Failed to add category:", catError);
              }
            }
          }
          if (tagsStr && String(tagsStr).trim()) {
            const tagNames = String(tagsStr).split(",").map((t) => t.trim()).filter((t) => t.length > 0);
            for (const tagName of tagNames) {
              try {
                const allTags = await storage.getAllTags(businessAccountId);
                let tag = allTags.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
                if (!tag) {
                  tag = await storage.createTag({
                    businessAccountId,
                    name: tagName
                  });
                }
                await storage.assignProductToTag(product.id, tag.id);
              } catch (tagError) {
                console.error("[Excel Import] Failed to add tag:", tagError);
              }
            }
          }
          importedCount++;
        } catch (productError) {
          skippedCount++;
          errors.push(`Failed to import row: ${productError.message}`);
          console.error("[Excel Import] Failed to import row:", productError);
        }
      }
      res.json({
        success: true,
        message: `Successfully imported ${importedCount} products from Excel${skippedCount > 0 ? `, ${skippedCount} rows skipped` : ""}`,
        imported: importedCount,
        skipped: skippedCount,
        errors: errors.length > 0 ? errors.slice(0, 10) : void 0
        // Return first 10 errors
      });
    } catch (error) {
      console.error("[Excel Import] Error:", error);
      res.status(500).json({ error: error.message || "Failed to import Excel file" });
    }
  });
  app2.post("/api/settings/change-password", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters long" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const isValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      const newPasswordHash = await hashPassword(newPassword);
      await storage.updateUserPassword(userId, newPasswordHash);
      await storage.clearTempPassword(userId);
      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      res.status(500).json({ error: "An error occurred while changing your password. Please try again." });
    }
  });
  app2.get("/api/super-admin/insights", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const businessAccountId = req.query.businessAccountId;
      const insights = await storage.getBusinessAnalytics(businessAccountId);
      res.json(insights);
    } catch (error) {
      console.error("[SuperAdmin Insights] Error:", error);
      res.status(500).json({ error: "Failed to fetch business insights" });
    }
  });
  app2.get("/api/database/backup", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const timestamp2 = Date.now();
      const filename = `database_backup_${timestamp2}.sql`;
      const backupPath = path2.join(__dirname, "..", "tmp", filename);
      const tmpDir = path2.join(__dirname, "..", "tmp");
      if (!fs2.existsSync(tmpDir)) {
        fs2.mkdirSync(tmpDir, { recursive: true });
      }
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        return res.status(500).json({ error: "Database URL not configured" });
      }
      await execAsync(`pg_dump "${databaseUrl}" > "${backupPath}"`);
      if (!fs2.existsSync(backupPath)) {
        return res.status(500).json({ error: "Failed to create backup file" });
      }
      res.setHeader("Content-Type", "application/sql");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      const fileStream = fs2.createReadStream(backupPath);
      fileStream.pipe(res);
      fileStream.on("end", () => {
        fs2.unlink(backupPath, (err) => {
          if (err) console.error("Failed to delete backup file:", err);
        });
      });
    } catch (error) {
      console.error("[Database Backup] Error:", error);
      res.status(500).json({ error: "Failed to create database backup" });
    }
  });
  app2.get("/api/insights/conversation-analysis", requireAuth, requireBusinessAccount, async (req, res) => {
    try {
      const businessAccountId = req.user?.businessAccountId;
      if (!businessAccountId) {
        return res.status(400).json({ error: "Business account not found" });
      }
      const { fromDate, toDate } = req.query;
      const openaiApiKey = await storage.getBusinessAccountOpenAIKey(businessAccountId);
      if (!openaiApiKey) {
        return res.status(400).json({
          error: "OpenAI API key not configured. Please add your API key in Settings to enable AI insights."
        });
      }
      const conversations2 = await storage.getConversationsByBusinessAccount(
        businessAccountId,
        fromDate,
        toDate
      );
      if (conversations2.length === 0) {
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
      const conversationIds = conversations2.map((c) => c.id);
      const messages2 = await storage.getMessagesByConversationIds(conversationIds);
      const conversationSummaries = conversations2.slice(0, 50).map((conv) => {
        const convMessages = messages2.filter((m) => m.conversationId === conv.id);
        return {
          title: conv.title,
          messageCount: convMessages.length,
          messages: convMessages.slice(0, 20).map((m) => ({
            role: m.role,
            content: m.content.substring(0, 500)
            // Limit message length for token efficiency
          }))
        };
      });
      const OpenAI4 = (await import("openai")).default;
      const openai = new OpenAI4({ apiKey: openaiApiKey });
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
    "totalConversations": ${conversations2.length},
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
      const analysisText = completion.choices[0].message.content || "{}";
      const analysis = JSON.parse(analysisText);
      res.json(analysis);
    } catch (error) {
      console.error("Conversation analysis error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze conversations" });
    }
  });
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ noServer: true });
  function extractSessionCookie(cookieHeader) {
    if (!cookieHeader) return null;
    const cookies = cookieHeader.split(";").map((c) => c.trim());
    for (const cookie of cookies) {
      const [name, value] = cookie.split("=");
      if (name === "session") {
        return value;
      }
    }
    return null;
  }
  httpServer.on("upgrade", async (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname === "/ws/voice") {
      try {
        const businessAccountId = url.searchParams.get("businessAccountId");
        const userId = url.searchParams.get("userId");
        if (!businessAccountId || !userId) {
          socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
          socket.destroy();
          return;
        }
        const sessionToken = extractSessionCookie(request.headers.cookie);
        if (!sessionToken) {
          console.warn("[WebSocket] No session cookie provided for voice connection");
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
        const user = await validateSession(sessionToken);
        if (!user) {
          console.warn("[WebSocket] Invalid or expired session for voice connection");
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
        if (user.role !== "super_admin" && user.businessAccountId !== businessAccountId) {
          console.warn("[WebSocket] User does not have access to business account:", {
            userId: user.id,
            userBusinessAccountId: user.businessAccountId,
            requestedBusinessAccountId: businessAccountId
          });
          socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
          socket.destroy();
          return;
        }
        if (user.role !== "super_admin" && user.id !== userId) {
          console.warn("[WebSocket] User ID mismatch:", {
            authenticatedUserId: user.id,
            requestedUserId: userId
          });
          socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
          socket.destroy();
          return;
        }
        console.log("[WebSocket] Voice connection authenticated:", {
          userId: user.id,
          businessAccountId,
          role: user.role
        });
        wss.handleUpgrade(request, socket, head, (ws2) => {
          console.log("[WebSocket] Voice connection established");
          realtimeVoiceService.handleConnection(ws2, businessAccountId, userId);
        });
      } catch (error) {
        console.error("[WebSocket] Upgrade error:", error);
        socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
        socket.destroy();
      }
    } else {
      socket.destroy();
    }
  });
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs3 from "fs";
import path4 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path3 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path3.resolve(import.meta.dirname, "client", "src"),
      "@shared": path3.resolve(import.meta.dirname, "shared"),
      "@assets": path3.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path3.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path3.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  const publicPath = path4.resolve(import.meta.dirname, "..", "public");
  app2.use(express.static(publicPath));
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path4.resolve(import.meta.dirname, "public");
  if (!fs3.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/init.ts
init_storage();
async function initializeDatabase() {
  try {
    const superadmins = await storage.getSuperadmins();
    if (superadmins.length === 0) {
      console.log("[INIT] No superadmin found. Creating default superadmin account...");
      const username = process.env.SUPERADMIN_USERNAME || "admin";
      const password = process.env.SUPERADMIN_PASSWORD || "admin123";
      const passwordHash = await hashPassword(password);
      await storage.createUser({
        username,
        passwordHash,
        role: "super_admin",
        businessAccountId: null
      });
      console.log(`[INIT] \u2713 Default superadmin created with username: ${username}`);
      console.log(`[INIT] \u26A0\uFE0F  Please log in and change the password immediately!`);
      if (!process.env.SUPERADMIN_USERNAME || !process.env.SUPERADMIN_PASSWORD) {
        console.log("[INIT] \u26A0\uFE0F  Using default credentials. Set SUPERADMIN_USERNAME and SUPERADMIN_PASSWORD environment variables for better security.");
      }
    } else {
      console.log(`[INIT] \u2713 Found ${superadmins.length} superadmin account(s)`);
    }
  } catch (error) {
    console.error("[INIT] Error initializing database:", error);
    throw error;
  }
}

// server/index.ts
init_shopifySyncScheduler();
var app = express2();
var COOKIE_SECRET = process.env.COOKIE_SECRET || (() => {
  const randomSecret = crypto2.randomBytes(32).toString("hex");
  if (process.env.NODE_ENV === "production") {
    throw new Error("COOKIE_SECRET environment variable must be set in production");
  }
  console.warn("[Security] Using randomly generated cookie secret. Set COOKIE_SECRET env var for production.");
  return randomSecret;
})();
app.use((req, res, next) => {
  const isWidgetRoute = req.path.startsWith("/widget") || req.path.startsWith("/api/chat/widget") || req.path === "/api/widget-settings/public";
  if (isWidgetRoute) {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  } else {
    const origin = req.headers.origin;
    const allowedOrigins = [
      process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null,
      process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : null,
      "http://localhost:5000",
      "http://localhost:5173"
    ].filter(Boolean);
    if (!origin || allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin || "*");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie");
    }
  }
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use(cookieParser(COOKIE_SECRET));
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  await initializeDatabase();
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
    shopifySyncScheduler.start();
  });
})();
