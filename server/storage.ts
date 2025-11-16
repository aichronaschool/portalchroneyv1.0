// Reference: javascript_database blueprint - updated for chat application
import { 
  users, 
  conversations, 
  messages,
  products,
  faqs,
  leads,
  businessAccounts,
  widgetSettings,
  passwordResetTokens,
  websiteAnalysis,
  analyzedPages,
  trainingDocuments,
  categories,
  tags,
  productCategories,
  productTags,
  productRelationships,
  scheduleTemplates,
  slotOverrides,
  appointments,
  demoPages,
  publicChatLinks,
  type User, 
  type InsertUser,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type Product,
  type InsertProduct,
  type Faq,
  type InsertFaq,
  type Lead,
  type InsertLead,
  type BusinessAccount,
  type InsertBusinessAccount,
  type WidgetSettings,
  type InsertWidgetSettings,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type WebsiteAnalysis,
  type InsertWebsiteAnalysis,
  type AnalyzedPage,
  type InsertAnalyzedPage,
  type TrainingDocument,
  type InsertTrainingDocument,
  type Category,
  type InsertCategory,
  type Tag,
  type InsertTag,
  type ProductCategory,
  type InsertProductCategory,
  type ProductTag,
  type InsertProductTag,
  type ProductRelationship,
  type InsertProductRelationship,
  type ScheduleTemplate,
  type InsertScheduleTemplate,
  type SlotOverride,
  type InsertSlotOverride,
  type Appointment,
  type InsertAppointment,
  type DemoPage,
  type InsertDemoPage,
  type PublicChatLink,
  type InsertPublicChatLink
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, inArray, sql, and, or, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByBusinessAccountId(businessAccountId: string): Promise<User | undefined>;
  getUserByUsernameAndRole(username: string, role: string): Promise<User | undefined>;
  getSuperadmins(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  createUserWithTempPassword(user: InsertUser & { tempPassword: string; tempPasswordExpiry: Date; mustChangePassword: string }): Promise<User>;
  updateUserLastLogin(id: string): Promise<void>;
  updateUserPassword(id: string, passwordHash: string): Promise<void>;
  resetUserPassword(id: string, passwordHash: string, tempPassword: string, tempPasswordExpiry: Date): Promise<User>;
  clearTempPassword(id: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  getUsersByBusinessAccount(businessAccountId: string): Promise<User[]>;

  // Business Account methods
  createBusinessAccount(account: InsertBusinessAccount): Promise<BusinessAccount>;
  getBusinessAccount(id: string): Promise<BusinessAccount | undefined>;
  getAllBusinessAccounts(): Promise<BusinessAccount[]>;
  updateBusinessAccount(id: string, updates: Partial<{ name: string; website: string }>): Promise<BusinessAccount>;
  updateBusinessAccountDescription(id: string, description: string): Promise<BusinessAccount>;
  updateBusinessAccountStatus(id: string, status: string): Promise<BusinessAccount>;
  updateBusinessAccountFeatures(id: string, features: Partial<{ shopifyEnabled: string; appointmentsEnabled: string }>): Promise<BusinessAccount>;
  getBusinessAnalytics(businessAccountId?: string): Promise<any[]>;
  
  // Conversation methods
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: string, businessAccountId: string): Promise<Conversation | undefined>;
  getAllConversations(businessAccountId: string): Promise<Conversation[]>;
  getConversationsByBusinessAccount(businessAccountId: string, startDate?: string, endDate?: string): Promise<Conversation[]>;
  deleteConversation(id: string, businessAccountId: string): Promise<void>;
  updateConversationTimestamp(id: string): Promise<void>;
  updateConversationTitle(id: string, businessAccountId: string, title: string): Promise<Conversation>;
  
  // Message methods
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: string, businessAccountId: string): Promise<Message[]>;
  getMessagesByConversationIds(conversationIds: string[]): Promise<Message[]>;
  getMessageCountsForConversations(conversationIds: string[]): Promise<Record<string, number>>;
  deleteMessage(id: string, businessAccountId: string): Promise<void>;

  // Product methods
  createProduct(product: InsertProduct): Promise<Product>;
  getProduct(id: string, businessAccountId: string): Promise<Product | undefined>;
  getAllProducts(businessAccountId: string): Promise<Product[]>;
  updateProduct(id: string, businessAccountId: string, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string, businessAccountId: string): Promise<void>;

  // FAQ methods
  createFaq(faq: InsertFaq): Promise<Faq>;
  getFaq(id: string, businessAccountId: string): Promise<Faq | undefined>;
  getAllFaqs(businessAccountId: string): Promise<Faq[]>;
  updateFaq(id: string, businessAccountId: string, faq: Partial<InsertFaq>): Promise<Faq>;
  deleteFaq(id: string, businessAccountId: string): Promise<void>;

  // Lead methods
  createLead(lead: InsertLead): Promise<Lead>;
  getLead(id: string, businessAccountId: string): Promise<Lead | undefined>;
  getAllLeads(businessAccountId: string): Promise<Lead[]>;
  deleteLead(id: string, businessAccountId: string): Promise<void>;

  // Widget Settings methods
  getWidgetSettings(businessAccountId: string): Promise<WidgetSettings | undefined>;
  upsertWidgetSettings(businessAccountId: string, settings: Partial<InsertWidgetSettings>): Promise<WidgetSettings>;

  // Password Reset Token methods
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenAsUsed(token: string): Promise<void>;
  deleteExpiredPasswordResetTokens(): Promise<void>;

  // Website Analysis methods
  getWebsiteAnalysis(businessAccountId: string): Promise<WebsiteAnalysis | undefined>;
  upsertWebsiteAnalysis(businessAccountId: string, analysis: Partial<InsertWebsiteAnalysis>): Promise<WebsiteAnalysis>;
  updateWebsiteAnalysisStatus(businessAccountId: string, status: string, errorMessage?: string): Promise<void>;
  deleteWebsiteAnalysis(businessAccountId: string): Promise<void>;

  // Analyzed Pages methods
  createAnalyzedPage(analyzedPage: InsertAnalyzedPage): Promise<AnalyzedPage>;
  getAnalyzedPages(businessAccountId: string): Promise<AnalyzedPage[]>;
  deleteAnalyzedPage(id: string, businessAccountId: string): Promise<void>;
  deleteAnalyzedPages(businessAccountId: string): Promise<void>;

  // Training Documents methods
  createTrainingDocument(document: InsertTrainingDocument): Promise<TrainingDocument>;
  getTrainingDocument(id: string, businessAccountId: string): Promise<TrainingDocument | undefined>;
  getTrainingDocuments(businessAccountId: string): Promise<TrainingDocument[]>;
  updateTrainingDocumentStatus(id: string, status: string, errorMessage?: string): Promise<void>;
  updateTrainingDocumentContent(id: string, extractedText: string, summary: string, keyPoints: string): Promise<void>;
  deleteTrainingDocument(id: string, businessAccountId: string): Promise<void>;

  // Category methods
  createCategory(category: InsertCategory): Promise<Category>;
  getCategory(id: string, businessAccountId: string): Promise<Category | undefined>;
  getAllCategories(businessAccountId: string): Promise<Category[]>;
  updateCategory(id: string, businessAccountId: string, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string, businessAccountId: string): Promise<void>;

  // Tag methods
  createTag(tag: InsertTag): Promise<Tag>;
  getTag(id: string, businessAccountId: string): Promise<Tag | undefined>;
  getAllTags(businessAccountId: string): Promise<Tag[]>;
  updateTag(id: string, businessAccountId: string, tag: Partial<InsertTag>): Promise<Tag>;
  deleteTag(id: string, businessAccountId: string): Promise<void>;

  // Product-Category assignment methods
  assignProductToCategory(productId: string, categoryId: string): Promise<ProductCategory>;
  getProductCategories(productId: string): Promise<Category[]>;
  getCategoryProducts(categoryId: string, businessAccountId: string): Promise<Product[]>;
  removeProductFromCategory(productId: string, categoryId: string): Promise<void>;

  // Product-Tag assignment methods
  assignProductToTag(productId: string, tagId: string): Promise<ProductTag>;
  getProductTags(productId: string): Promise<Tag[]>;
  getTagProducts(tagId: string, businessAccountId: string): Promise<Product[]>;
  removeProductFromTag(productId: string, tagId: string): Promise<void>;

  // Product Relationship methods
  createProductRelationship(relationship: InsertProductRelationship): Promise<ProductRelationship>;
  getProductRelationship(id: string, businessAccountId: string): Promise<ProductRelationship | undefined>;
  getProductRelationships(productId: string, businessAccountId: string, relationshipType?: string): Promise<ProductRelationship[]>;
  updateProductRelationship(id: string, businessAccountId: string, relationship: Partial<InsertProductRelationship>): Promise<ProductRelationship>;
  deleteProductRelationship(id: string, businessAccountId: string): Promise<void>;
  
  // Get related products with details
  getRelatedProducts(productId: string, businessAccountId: string): Promise<{
    crossSell: Product[];
    similar: Product[];
    complement: Product[];
    bundle: Product[];
  }>;

  // Appointment System methods
  // Schedule Template methods
  createScheduleTemplate(template: InsertScheduleTemplate): Promise<ScheduleTemplate>;
  getScheduleTemplates(businessAccountId: string): Promise<ScheduleTemplate[]>;
  updateScheduleTemplate(id: string, businessAccountId: string, template: Partial<InsertScheduleTemplate>): Promise<ScheduleTemplate>;
  deleteScheduleTemplate(id: string, businessAccountId: string): Promise<void>;

  // Slot Override methods
  createSlotOverride(override: InsertSlotOverride): Promise<SlotOverride>;
  getSlotOverridesForRange(businessAccountId: string, startDate: Date, endDate: Date): Promise<SlotOverride[]>;
  updateSlotOverride(id: string, businessAccountId: string, override: Partial<InsertSlotOverride>): Promise<SlotOverride>;
  deleteSlotOverride(id: string, businessAccountId: string): Promise<void>;

  // Appointment methods
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointmentsForRange(businessAccountId: string, startDate: Date, endDate: Date): Promise<Appointment[]>;
  getAppointmentsByStatus(businessAccountId: string, status: string): Promise<Appointment[]>;
  updateAppointmentStatus(id: string, businessAccountId: string, status: string, cancellationReason?: string): Promise<Appointment>;
  getAllAppointments(businessAccountId: string): Promise<Appointment[]>;

  // Demo Page methods
  createDemoPage(demoPage: InsertDemoPage & { token: string }): Promise<DemoPage>;
  getDemoPage(id: string): Promise<DemoPage | undefined>;
  getDemoPageByToken(token: string): Promise<DemoPage | undefined>;
  getAllDemoPages(): Promise<DemoPage[]>;
  updateDemoPage(id: string, updates: Partial<{ title: string; description: string; appearance: string; isActive: string; expiresAt: Date | null }>): Promise<DemoPage>;
  updateDemoPageLastViewed(token: string): Promise<void>;
  regenerateDemoPageToken(id: string, newToken: string): Promise<DemoPage>;
  deleteDemoPage(id: string): Promise<void>;

  // Public Chat Link methods
  getOrCreatePublicChatLink(businessAccountId: string): Promise<PublicChatLink>;
  getPublicChatLinkByToken(token: string): Promise<PublicChatLink | undefined>;
  togglePublicChatLinkStatus(businessAccountId: string): Promise<PublicChatLink>;
  regeneratePublicChatLinkToken(businessAccountId: string, newToken: string): Promise<PublicChatLink>;
  updatePublicChatLinkAccess(token: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByBusinessAccountId(businessAccountId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.businessAccountId, businessAccountId));
    return user || undefined;
  }

  async getUserByUsernameAndRole(username: string, role: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(eq(users.username, username), eq(users.role, role))
    );
    return user || undefined;
  }

  async getSuperadmins(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'super_admin'));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createUserWithTempPassword(insertUser: InsertUser & { tempPassword: string; tempPasswordExpiry: Date; mustChangePassword: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, id));
  }

  async updateUserPassword(id: string, passwordHash: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        passwordHash,
        tempPassword: null,
        tempPasswordExpiry: null,
        mustChangePassword: "false"
      })
      .where(eq(users.id, id));
  }

  async resetUserPassword(id: string, passwordHash: string, tempPassword: string, tempPasswordExpiry: Date): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        passwordHash,
        tempPassword,
        tempPasswordExpiry,
        mustChangePassword: "true"
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async clearTempPassword(id: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        tempPassword: null,
        tempPasswordExpiry: null,
        mustChangePassword: "false"
      })
      .where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async getUsersByBusinessAccount(businessAccountId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.businessAccountId, businessAccountId));
  }

  // Business Account methods
  async createBusinessAccount(insertAccount: InsertBusinessAccount): Promise<BusinessAccount> {
    const [account] = await db
      .insert(businessAccounts)
      .values(insertAccount)
      .returning();
    return account;
  }

  async getBusinessAccount(id: string): Promise<BusinessAccount | undefined> {
    const [account] = await db
      .select()
      .from(businessAccounts)
      .where(eq(businessAccounts.id, id));
    return account || undefined;
  }

  async getAllBusinessAccounts(): Promise<BusinessAccount[]> {
    return await db
      .select()
      .from(businessAccounts)
      .orderBy(desc(businessAccounts.createdAt));
  }

  async updateBusinessAccount(id: string, updates: Partial<{ name: string; website: string }>): Promise<BusinessAccount> {
    const [account] = await db
      .update(businessAccounts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(businessAccounts.id, id))
      .returning();
    return account;
  }

  async updateBusinessAccountDescription(id: string, description: string): Promise<BusinessAccount> {
    const [account] = await db
      .update(businessAccounts)
      .set({ description, updatedAt: new Date() })
      .where(eq(businessAccounts.id, id))
      .returning();
    return account;
  }

  async updateBusinessAccountStatus(id: string, status: string): Promise<BusinessAccount> {
    const [account] = await db
      .update(businessAccounts)
      .set({ status, updatedAt: new Date() })
      .where(eq(businessAccounts.id, id))
      .returning();
    return account;
  }

  async updateBusinessAccountFeatures(id: string, features: Partial<{ shopifyEnabled: string; appointmentsEnabled: string }>): Promise<BusinessAccount> {
    const [account] = await db
      .update(businessAccounts)
      .set({ ...features, updatedAt: new Date() })
      .where(eq(businessAccounts.id, id))
      .returning();
    
    if (!account) {
      throw new Error("Business account not found");
    }
    
    return account;
  }

  async getBusinessAnalytics(businessAccountId?: string): Promise<any[]> {
    // Get business accounts - either specific one or all
    let accountsQuery = db
      .select()
      .from(businessAccounts);
    
    if (businessAccountId) {
      accountsQuery = accountsQuery.where(eq(businessAccounts.id, businessAccountId)) as any;
    }
    
    const accounts = await accountsQuery.orderBy(desc(businessAccounts.createdAt));

    // Get analytics for each business account
    const analyticsPromises = accounts.map(async (account) => {
      // Get user count and most recent login
      const accountUsers = await db
        .select({
          count: count(),
          maxLastLogin: sql<Date | null>`MAX(${users.lastLoginAt})`,
        })
        .from(users)
        .where(eq(users.businessAccountId, account.id));

      // Get individual users for the account
      const businessUsers = await db
        .select({
          id: users.id,
          username: users.username,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.businessAccountId, account.id))
        .orderBy(desc(users.lastLoginAt));

      // Get lead count
      const leadCount = await db
        .select({ count: count() })
        .from(leads)
        .where(eq(leads.businessAccountId, account.id));

      // Get conversation count
      const conversationCount = await db
        .select({ count: count() })
        .from(conversations)
        .where(eq(conversations.businessAccountId, account.id));

      // Get product count
      const productCount = await db
        .select({ count: count() })
        .from(products)
        .where(eq(products.businessAccountId, account.id));

      // Get FAQ count
      const faqCount = await db
        .select({ count: count() })
        .from(faqs)
        .where(eq(faqs.businessAccountId, account.id));

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
        faqCount: faqCount[0]?.count || 0,
      };
    });

    return await Promise.all(analyticsPromises);
  }

  async updateBusinessAccountOpenAIKey(id: string, openaiApiKey: string): Promise<BusinessAccount> {
    const [account] = await db
      .update(businessAccounts)
      .set({ openaiApiKey, updatedAt: new Date() })
      .where(eq(businessAccounts.id, id))
      .returning();
    return account;
  }

  async getBusinessAccountOpenAIKey(id: string): Promise<string | null> {
    const [account] = await db
      .select({ openaiApiKey: businessAccounts.openaiApiKey })
      .from(businessAccounts)
      .where(eq(businessAccounts.id, id));
    return account?.openaiApiKey || null;
  }

  // Conversation methods
  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(insertConversation)
      .returning();
    return conversation;
  }

  async getConversation(id: string, businessAccountId: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.businessAccountId, businessAccountId)));
    return conversation || undefined;
  }

  async getAllConversations(businessAccountId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.businessAccountId, businessAccountId))
      .orderBy(desc(conversations.updatedAt));
  }

  async getConversationsByBusinessAccount(
    businessAccountId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Conversation[]> {
    const conditions = [eq(conversations.businessAccountId, businessAccountId)];
    
    if (startDate) {
      conditions.push(gte(conversations.createdAt, new Date(startDate)));
    }
    
    if (endDate) {
      conditions.push(lte(conversations.createdAt, new Date(endDate)));
    }

    return await db
      .select()
      .from(conversations)
      .where(and(...conditions))
      .orderBy(desc(conversations.createdAt));
  }

  async deleteConversation(id: string, businessAccountId: string): Promise<void> {
    await db.delete(conversations).where(and(eq(conversations.id, id), eq(conversations.businessAccountId, businessAccountId)));
  }

  async updateConversationTimestamp(id: string): Promise<void> {
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, id));
  }

  async updateConversationTitle(id: string, businessAccountId: string, title: string): Promise<Conversation> {
    const [conversation] = await db
      .update(conversations)
      .set({ title, updatedAt: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.businessAccountId, businessAccountId)))
      .returning();
    return conversation;
  }

  // Message methods
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getMessagesByConversation(conversationId: string, businessAccountId: string): Promise<Message[]> {
    // Verify conversation belongs to business account first
    const conversation = await this.getConversation(conversationId, businessAccountId);
    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async getMessagesByConversationIds(conversationIds: string[]): Promise<Message[]> {
    if (conversationIds.length === 0) {
      return [];
    }

    return await db
      .select()
      .from(messages)
      .where(inArray(messages.conversationId, conversationIds))
      .orderBy(messages.createdAt);
  }

  async getMessageCountsForConversations(conversationIds: string[]): Promise<Record<string, number>> {
    if (conversationIds.length === 0) {
      return {};
    }

    const results = await db
      .select({
        conversationId: messages.conversationId,
        count: count()
      })
      .from(messages)
      .where(inArray(messages.conversationId, conversationIds))
      .groupBy(messages.conversationId);

    const countsMap: Record<string, number> = {};
    results.forEach(row => {
      countsMap[row.conversationId] = Number(row.count);
    });

    // Fill in zeros for conversations with no messages
    conversationIds.forEach(id => {
      if (!(id in countsMap)) {
        countsMap[id] = 0;
      }
    });

    return countsMap;
  }

  async deleteMessage(id: string, businessAccountId: string): Promise<void> {
    // First get the message to find its conversation
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, id));
    
    if (!message) {
      throw new Error('Message not found');
    }

    // Verify the conversation belongs to the business account
    const conversation = await this.getConversation(message.conversationId, businessAccountId);
    if (!conversation) {
      throw new Error('Message not found or access denied');
    }

    // Now safe to delete
    await db.delete(messages).where(eq(messages.id, id));
  }

  // Product methods
  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values(insertProduct)
      .returning();
    return product;
  }

  async getProduct(id: string, businessAccountId: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.businessAccountId, businessAccountId)));
    return product || undefined;
  }

  async getAllProducts(businessAccountId: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.businessAccountId, businessAccountId))
      .orderBy(desc(products.createdAt));
  }

  async updateProduct(id: string, businessAccountId: string, productData: Partial<InsertProduct>): Promise<Product> {
    const [product] = await db
      .update(products)
      .set({ ...productData, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.businessAccountId, businessAccountId)))
      .returning();
    return product;
  }

  async deleteProduct(id: string, businessAccountId: string): Promise<void> {
    await db.delete(products).where(and(eq(products.id, id), eq(products.businessAccountId, businessAccountId)));
  }

  // FAQ methods
  async createFaq(insertFaq: InsertFaq): Promise<Faq> {
    const [faq] = await db
      .insert(faqs)
      .values(insertFaq)
      .returning();
    return faq;
  }

  async getFaq(id: string, businessAccountId: string): Promise<Faq | undefined> {
    const [faq] = await db
      .select()
      .from(faqs)
      .where(and(eq(faqs.id, id), eq(faqs.businessAccountId, businessAccountId)));
    return faq || undefined;
  }

  // Get all PUBLISHED FAQs only (excludes draft_faqs table) - filtered by businessAccountId
  async getAllFaqs(businessAccountId: string): Promise<Faq[]> {
    return await db
      .select()
      .from(faqs) // Only queries 'faqs' table (published), NOT 'draft_faqs'
      .where(eq(faqs.businessAccountId, businessAccountId))
      .orderBy(desc(faqs.createdAt));
  }

  async updateFaq(id: string, businessAccountId: string, faqData: Partial<InsertFaq>): Promise<Faq> {
    const [faq] = await db
      .update(faqs)
      .set({ ...faqData, updatedAt: new Date() })
      .where(and(eq(faqs.id, id), eq(faqs.businessAccountId, businessAccountId)))
      .returning();
    return faq;
  }

  async deleteFaq(id: string, businessAccountId: string): Promise<void> {
    await db.delete(faqs).where(and(eq(faqs.id, id), eq(faqs.businessAccountId, businessAccountId)));
  }

  // Lead methods
  async createLead(insertLead: InsertLead): Promise<Lead> {
    const [lead] = await db
      .insert(leads)
      .values(insertLead)
      .returning();
    return lead;
  }

  async getLead(id: string, businessAccountId: string): Promise<Lead | undefined> {
    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), eq(leads.businessAccountId, businessAccountId)));
    return lead || undefined;
  }

  async getAllLeads(businessAccountId: string): Promise<Lead[]> {
    return await db
      .select()
      .from(leads)
      .where(eq(leads.businessAccountId, businessAccountId))
      .orderBy(desc(leads.createdAt));
  }

  async deleteLead(id: string, businessAccountId: string): Promise<void> {
    await db.delete(leads).where(and(eq(leads.id, id), eq(leads.businessAccountId, businessAccountId)));
  }

  // Widget Settings methods
  async getWidgetSettings(businessAccountId: string): Promise<WidgetSettings | undefined> {
    const [settings] = await db
      .select()
      .from(widgetSettings)
      .where(eq(widgetSettings.businessAccountId, businessAccountId));
    return settings || undefined;
  }

  async upsertWidgetSettings(businessAccountId: string, settingsData: Partial<InsertWidgetSettings>): Promise<WidgetSettings> {
    // Try to get existing settings
    const existing = await this.getWidgetSettings(businessAccountId);
    
    if (existing) {
      // Update existing
      const [updated] = await db
        .update(widgetSettings)
        .set({ ...settingsData, updatedAt: new Date() })
        .where(eq(widgetSettings.businessAccountId, businessAccountId))
        .returning();
      return updated;
    } else {
      // Create new with defaults
      const [created] = await db
        .insert(widgetSettings)
        .values({
          businessAccountId,
          chatColor: settingsData.chatColor || "#9333ea",
          welcomeMessageType: settingsData.welcomeMessageType || "custom",
          welcomeMessage: settingsData.welcomeMessage || "Hi! How can I help you today?",
          currency: settingsData.currency || "INR",
        })
        .returning();
      return created;
    }
  }

  // Shopify Integration methods
  async updateShopifyCredentials(businessAccountId: string, shopifyStoreUrl: string | null, shopifyAccessToken: string | null): Promise<WidgetSettings> {
    return await this.upsertWidgetSettings(businessAccountId, {
      shopifyStoreUrl,
      shopifyAccessToken,
    });
  }

  async getShopifyCredentials(businessAccountId: string): Promise<{ storeUrl: string | null; accessToken: string | null }> {
    const settings = await this.getWidgetSettings(businessAccountId);
    return {
      storeUrl: settings?.shopifyStoreUrl || null,
      accessToken: settings?.shopifyAccessToken || null,
    };
  }

  // Password Reset Token methods
  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [created] = await db
      .insert(passwordResetTokens)
      .values(token)
      .returning();
    return created;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [result] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return result;
  }

  async markPasswordResetTokenAsUsed(token: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.token, token));
  }

  async deleteExpiredPasswordResetTokens(): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(sql`${passwordResetTokens.expiresAt} < NOW()`);
  }

  // Website Analysis methods
  async getWebsiteAnalysis(businessAccountId: string): Promise<WebsiteAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(websiteAnalysis)
      .where(eq(websiteAnalysis.businessAccountId, businessAccountId));
    return analysis || undefined;
  }

  async upsertWebsiteAnalysis(businessAccountId: string, analysisData: Partial<InsertWebsiteAnalysis>): Promise<WebsiteAnalysis> {
    const existing = await this.getWebsiteAnalysis(businessAccountId);
    
    if (existing) {
      const [updated] = await db
        .update(websiteAnalysis)
        .set({ ...analysisData, updatedAt: new Date() })
        .where(eq(websiteAnalysis.businessAccountId, businessAccountId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(websiteAnalysis)
        .values({
          businessAccountId,
          websiteUrl: analysisData.websiteUrl || "",
          status: analysisData.status || "pending",
          ...analysisData,
        })
        .returning();
      return created;
    }
  }

  async updateWebsiteAnalysisStatus(businessAccountId: string, status: string, errorMessage?: string): Promise<void> {
    await db
      .update(websiteAnalysis)
      .set({ 
        status, 
        errorMessage: errorMessage || null,
        lastAnalyzedAt: status === 'completed' ? new Date() : null,
        updatedAt: new Date() 
      })
      .where(eq(websiteAnalysis.businessAccountId, businessAccountId));
  }

  async deleteWebsiteAnalysis(businessAccountId: string): Promise<void> {
    await db
      .delete(websiteAnalysis)
      .where(eq(websiteAnalysis.businessAccountId, businessAccountId));
  }

  // Analyzed Pages methods
  async createAnalyzedPage(analyzedPage: InsertAnalyzedPage): Promise<AnalyzedPage> {
    const [created] = await db
      .insert(analyzedPages)
      .values(analyzedPage)
      .returning();
    return created;
  }

  async getAnalyzedPages(businessAccountId: string): Promise<AnalyzedPage[]> {
    const pages = await db
      .select()
      .from(analyzedPages)
      .where(eq(analyzedPages.businessAccountId, businessAccountId))
      .orderBy(desc(analyzedPages.analyzedAt));
    return pages;
  }

  async deleteAnalyzedPage(id: string, businessAccountId: string): Promise<void> {
    await db
      .delete(analyzedPages)
      .where(
        and(
          eq(analyzedPages.id, id),
          eq(analyzedPages.businessAccountId, businessAccountId)
        )
      );
  }

  async deleteAnalyzedPages(businessAccountId: string): Promise<void> {
    await db
      .delete(analyzedPages)
      .where(eq(analyzedPages.businessAccountId, businessAccountId));
  }

  // Training Documents methods
  async createTrainingDocument(document: InsertTrainingDocument): Promise<TrainingDocument> {
    const [created] = await db
      .insert(trainingDocuments)
      .values(document)
      .returning();
    return created;
  }

  async getTrainingDocument(id: string, businessAccountId: string): Promise<TrainingDocument | undefined> {
    const [document] = await db
      .select()
      .from(trainingDocuments)
      .where(
        and(
          eq(trainingDocuments.id, id),
          eq(trainingDocuments.businessAccountId, businessAccountId)
        )
      );
    return document || undefined;
  }

  async getTrainingDocuments(businessAccountId: string): Promise<TrainingDocument[]> {
    const documents = await db
      .select()
      .from(trainingDocuments)
      .where(eq(trainingDocuments.businessAccountId, businessAccountId))
      .orderBy(desc(trainingDocuments.createdAt));
    return documents;
  }

  async updateTrainingDocumentStatus(id: string, status: string, errorMessage?: string): Promise<void> {
    await db
      .update(trainingDocuments)
      .set({
        uploadStatus: status,
        errorMessage: errorMessage || null,
        updatedAt: new Date()
      })
      .where(eq(trainingDocuments.id, id));
  }

  async updateTrainingDocumentContent(id: string, extractedText: string, summary: string, keyPoints: string): Promise<void> {
    await db
      .update(trainingDocuments)
      .set({
        extractedText,
        summary,
        keyPoints,
        uploadStatus: 'completed',
        processedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(trainingDocuments.id, id));
  }

  async deleteTrainingDocument(id: string, businessAccountId: string): Promise<void> {
    await db
      .delete(trainingDocuments)
      .where(
        and(
          eq(trainingDocuments.id, id),
          eq(trainingDocuments.businessAccountId, businessAccountId)
        )
      );
  }

  // Category methods
  async createCategory(category: InsertCategory): Promise<Category> {
    const [created] = await db
      .insert(categories)
      .values(category)
      .returning();
    return created;
  }

  async getCategory(id: string, businessAccountId: string): Promise<Category | undefined> {
    const [category] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, id),
          eq(categories.businessAccountId, businessAccountId)
        )
      );
    return category || undefined;
  }

  async getAllCategories(businessAccountId: string): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(eq(categories.businessAccountId, businessAccountId))
      .orderBy(categories.name);
  }

  async updateCategory(id: string, businessAccountId: string, category: Partial<InsertCategory>): Promise<Category> {
    const [updated] = await db
      .update(categories)
      .set({ ...category, updatedAt: new Date() })
      .where(
        and(
          eq(categories.id, id),
          eq(categories.businessAccountId, businessAccountId)
        )
      )
      .returning();
    return updated;
  }

  async deleteCategory(id: string, businessAccountId: string): Promise<void> {
    await db
      .delete(categories)
      .where(
        and(
          eq(categories.id, id),
          eq(categories.businessAccountId, businessAccountId)
        )
      );
  }

  // Tag methods
  async createTag(tag: InsertTag): Promise<Tag> {
    const [created] = await db
      .insert(tags)
      .values(tag)
      .returning();
    return created;
  }

  async getTag(id: string, businessAccountId: string): Promise<Tag | undefined> {
    const [tag] = await db
      .select()
      .from(tags)
      .where(
        and(
          eq(tags.id, id),
          eq(tags.businessAccountId, businessAccountId)
        )
      );
    return tag || undefined;
  }

  async getAllTags(businessAccountId: string): Promise<Tag[]> {
    return await db
      .select()
      .from(tags)
      .where(eq(tags.businessAccountId, businessAccountId))
      .orderBy(tags.name);
  }

  async updateTag(id: string, businessAccountId: string, tag: Partial<InsertTag>): Promise<Tag> {
    const [updated] = await db
      .update(tags)
      .set({ ...tag, updatedAt: new Date() })
      .where(
        and(
          eq(tags.id, id),
          eq(tags.businessAccountId, businessAccountId)
        )
      )
      .returning();
    return updated;
  }

  async deleteTag(id: string, businessAccountId: string): Promise<void> {
    await db
      .delete(tags)
      .where(
        and(
          eq(tags.id, id),
          eq(tags.businessAccountId, businessAccountId)
        )
      );
  }

  // Product-Category assignment methods
  async assignProductToCategory(productId: string, categoryId: string): Promise<ProductCategory> {
    const [assignment] = await db
      .insert(productCategories)
      .values({ productId, categoryId })
      .returning();
    return assignment;
  }

  async getProductCategories(productId: string): Promise<Category[]> {
    const result = await db
      .select({
        id: categories.id,
        businessAccountId: categories.businessAccountId,
        name: categories.name,
        description: categories.description,
        parentCategoryId: categories.parentCategoryId,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
      })
      .from(productCategories)
      .innerJoin(categories, eq(productCategories.categoryId, categories.id))
      .where(eq(productCategories.productId, productId));
    return result;
  }

  async getCategoryProducts(categoryId: string, businessAccountId: string): Promise<Product[]> {
    const result = await db
      .select({
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
        updatedAt: products.updatedAt,
      })
      .from(productCategories)
      .innerJoin(products, eq(productCategories.productId, products.id))
      .where(
        and(
          eq(productCategories.categoryId, categoryId),
          eq(products.businessAccountId, businessAccountId)
        )
      );
    return result;
  }

  async removeProductFromCategory(productId: string, categoryId: string): Promise<void> {
    await db
      .delete(productCategories)
      .where(
        and(
          eq(productCategories.productId, productId),
          eq(productCategories.categoryId, categoryId)
        )
      );
  }

  // Product-Tag assignment methods
  async assignProductToTag(productId: string, tagId: string): Promise<ProductTag> {
    const [assignment] = await db
      .insert(productTags)
      .values({ productId, tagId })
      .returning();
    return assignment;
  }

  async getProductTags(productId: string): Promise<Tag[]> {
    const result = await db
      .select({
        id: tags.id,
        businessAccountId: tags.businessAccountId,
        name: tags.name,
        color: tags.color,
        createdAt: tags.createdAt,
        updatedAt: tags.updatedAt,
      })
      .from(productTags)
      .innerJoin(tags, eq(productTags.tagId, tags.id))
      .where(eq(productTags.productId, productId));
    return result;
  }

  async getTagProducts(tagId: string, businessAccountId: string): Promise<Product[]> {
    const result = await db
      .select({
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
        updatedAt: products.updatedAt,
      })
      .from(productTags)
      .innerJoin(products, eq(productTags.productId, products.id))
      .where(
        and(
          eq(productTags.tagId, tagId),
          eq(products.businessAccountId, businessAccountId)
        )
      );
    return result;
  }

  async removeProductFromTag(productId: string, tagId: string): Promise<void> {
    await db
      .delete(productTags)
      .where(
        and(
          eq(productTags.productId, productId),
          eq(productTags.tagId, tagId)
        )
      );
  }

  // Product Relationship methods
  async createProductRelationship(relationship: InsertProductRelationship): Promise<ProductRelationship> {
    const [created] = await db
      .insert(productRelationships)
      .values(relationship)
      .returning();
    return created;
  }

  async getProductRelationship(id: string, businessAccountId: string): Promise<ProductRelationship | undefined> {
    const [relationship] = await db
      .select()
      .from(productRelationships)
      .where(
        and(
          eq(productRelationships.id, id),
          eq(productRelationships.businessAccountId, businessAccountId)
        )
      );
    return relationship || undefined;
  }

  async getProductRelationships(productId: string, businessAccountId: string, relationshipType?: string): Promise<ProductRelationship[]> {
    const conditions = [
      eq(productRelationships.sourceProductId, productId),
      eq(productRelationships.businessAccountId, businessAccountId)
    ];
    
    if (relationshipType) {
      conditions.push(eq(productRelationships.relationshipType, relationshipType));
    }

    return await db
      .select()
      .from(productRelationships)
      .where(and(...conditions))
      .orderBy(desc(productRelationships.weight));
  }

  async updateProductRelationship(id: string, businessAccountId: string, relationship: Partial<InsertProductRelationship>): Promise<ProductRelationship> {
    const [updated] = await db
      .update(productRelationships)
      .set({ ...relationship, updatedAt: new Date() })
      .where(
        and(
          eq(productRelationships.id, id),
          eq(productRelationships.businessAccountId, businessAccountId)
        )
      )
      .returning();
    return updated;
  }

  async deleteProductRelationship(id: string, businessAccountId: string): Promise<void> {
    await db
      .delete(productRelationships)
      .where(
        and(
          eq(productRelationships.id, id),
          eq(productRelationships.businessAccountId, businessAccountId)
        )
      );
  }

  // Get related products with details
  async getRelatedProducts(productId: string, businessAccountId: string): Promise<{
    crossSell: Product[];
    similar: Product[];
    complement: Product[];
    bundle: Product[];
  }> {
    // Get all relationships for this product
    const relationships = await this.getProductRelationships(productId, businessAccountId);
    
    // Group target product IDs by relationship type
    const crossSellIds: string[] = [];
    const similarIds: string[] = [];
    const complementIds: string[] = [];
    const bundleIds: string[] = [];

    for (const rel of relationships) {
      switch (rel.relationshipType) {
        case 'cross_sell':
          crossSellIds.push(rel.targetProductId);
          break;
        case 'similar':
          similarIds.push(rel.targetProductId);
          break;
        case 'complement':
          complementIds.push(rel.targetProductId);
          break;
        case 'bundle':
          bundleIds.push(rel.targetProductId);
          break;
      }
    }

    // Fetch actual product details for each type
    const [crossSell, similar, complement, bundle] = await Promise.all([
      crossSellIds.length > 0 
        ? db.select().from(products).where(
            and(
              inArray(products.id, crossSellIds),
              eq(products.businessAccountId, businessAccountId)
            )
          )
        : [],
      similarIds.length > 0
        ? db.select().from(products).where(
            and(
              inArray(products.id, similarIds),
              eq(products.businessAccountId, businessAccountId)
            )
          )
        : [],
      complementIds.length > 0
        ? db.select().from(products).where(
            and(
              inArray(products.id, complementIds),
              eq(products.businessAccountId, businessAccountId)
            )
          )
        : [],
      bundleIds.length > 0
        ? db.select().from(products).where(
            and(
              inArray(products.id, bundleIds),
              eq(products.businessAccountId, businessAccountId)
            )
          )
        : []
    ]);

    return {
      crossSell,
      similar,
      complement,
      bundle
    };
  }

  // Shopify Auto-Sync methods
  async getAccountsNeedingShopifySync(): Promise<{ id: string; name: string; shopifySyncFrequency: string | null }[]> {
    const now = new Date();

    const accounts = await db
      .select({
        id: businessAccounts.id,
        name: businessAccounts.name,
        shopifySyncFrequency: businessAccounts.shopifySyncFrequency,
        shopifyLastSyncedAt: businessAccounts.shopifyLastSyncedAt,
        shopifyAutoSyncEnabled: businessAccounts.shopifyAutoSyncEnabled,
        shopifySyncStatus: businessAccounts.shopifySyncStatus,
      })
      .from(businessAccounts)
      .where(
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
      const hoursSinceLastSync = (now.getTime() - lastSyncTime) / (1000 * 60 * 60);

      return hoursSinceLastSync >= frequencyHours;
    });

    return accountsNeedingSync.map((a) => ({
      id: a.id,
      name: a.name,
      shopifySyncFrequency: a.shopifySyncFrequency,
    }));
  }

  async updateShopifySyncStatus(businessAccountId: string, status: string): Promise<void> {
    await db
      .update(businessAccounts)
      .set({ shopifySyncStatus: status })
      .where(eq(businessAccounts.id, businessAccountId));
  }

  async updateShopifyLastSyncedAt(businessAccountId: string): Promise<void> {
    await db
      .update(businessAccounts)
      .set({ shopifyLastSyncedAt: new Date() })
      .where(eq(businessAccounts.id, businessAccountId));
  }

  async updateShopifyAutoSync(
    businessAccountId: string,
    enabled: boolean,
    frequency: number
  ): Promise<void> {
    await db
      .update(businessAccounts)
      .set({
        shopifyAutoSyncEnabled: enabled ? "true" : "false",
        shopifySyncFrequency: frequency.toString(),
      })
      .where(eq(businessAccounts.id, businessAccountId));
  }

  async getShopifyAutoSyncSettings(businessAccountId: string): Promise<{
    enabled: boolean;
    frequency: number;
    lastSyncedAt: Date | null;
    syncStatus: string | null;
  }> {
    const [account] = await db
      .select({
        shopifyAutoSyncEnabled: businessAccounts.shopifyAutoSyncEnabled,
        shopifySyncFrequency: businessAccounts.shopifySyncFrequency,
        shopifyLastSyncedAt: businessAccounts.shopifyLastSyncedAt,
        shopifySyncStatus: businessAccounts.shopifySyncStatus,
      })
      .from(businessAccounts)
      .where(eq(businessAccounts.id, businessAccountId));

    if (!account) {
      return {
        enabled: false,
        frequency: 24,
        lastSyncedAt: null,
        syncStatus: "idle",
      };
    }

    return {
      enabled: account.shopifyAutoSyncEnabled === "true",
      frequency: parseInt(account.shopifySyncFrequency || "24", 10),
      lastSyncedAt: account.shopifyLastSyncedAt,
      syncStatus: account.shopifySyncStatus,
    };
  }

  // Appointment System methods
  async createScheduleTemplate(template: InsertScheduleTemplate): Promise<ScheduleTemplate> {
    const [created] = await db.insert(scheduleTemplates).values(template).returning();
    return created;
  }

  async getScheduleTemplates(businessAccountId: string): Promise<ScheduleTemplate[]> {
    return await db
      .select()
      .from(scheduleTemplates)
      .where(eq(scheduleTemplates.businessAccountId, businessAccountId));
  }

  async updateScheduleTemplate(
    id: string,
    businessAccountId: string,
    template: Partial<InsertScheduleTemplate>
  ): Promise<ScheduleTemplate> {
    const [updated] = await db
      .update(scheduleTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(and(eq(scheduleTemplates.id, id), eq(scheduleTemplates.businessAccountId, businessAccountId)))
      .returning();
    return updated;
  }

  async deleteScheduleTemplate(id: string, businessAccountId: string): Promise<void> {
    await db
      .delete(scheduleTemplates)
      .where(and(eq(scheduleTemplates.id, id), eq(scheduleTemplates.businessAccountId, businessAccountId)));
  }

  async createSlotOverride(override: InsertSlotOverride): Promise<SlotOverride> {
    const [created] = await db.insert(slotOverrides).values(override).returning();
    return created;
  }

  async getSlotOverridesForRange(
    businessAccountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SlotOverride[]> {
    return await db
      .select()
      .from(slotOverrides)
      .where(
        and(
          eq(slotOverrides.businessAccountId, businessAccountId),
          gte(slotOverrides.slotDate, startDate),
          lte(slotOverrides.slotDate, endDate)
        )
      );
  }

  async updateSlotOverride(
    id: string,
    businessAccountId: string,
    override: Partial<InsertSlotOverride>
  ): Promise<SlotOverride> {
    const [updated] = await db
      .update(slotOverrides)
      .set({ ...override, updatedAt: new Date() })
      .where(and(eq(slotOverrides.id, id), eq(slotOverrides.businessAccountId, businessAccountId)))
      .returning();
    return updated;
  }

  async deleteSlotOverride(id: string, businessAccountId: string): Promise<void> {
    await db
      .delete(slotOverrides)
      .where(and(eq(slotOverrides.id, id), eq(slotOverrides.businessAccountId, businessAccountId)));
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [created] = await db.insert(appointments).values(appointment).returning();
    return created;
  }

  async getAppointmentsForRange(
    businessAccountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.businessAccountId, businessAccountId),
          gte(appointments.appointmentDate, startDate),
          lte(appointments.appointmentDate, endDate)
        )
      );
  }

  async getAppointmentsByStatus(businessAccountId: string, status: string): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.businessAccountId, businessAccountId), eq(appointments.status, status)));
  }

  async updateAppointmentStatus(
    id: string,
    businessAccountId: string,
    status: string,
    cancellationReason?: string
  ): Promise<Appointment> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (cancellationReason) {
      updateData.cancellationReason = cancellationReason;
    }

    const [updated] = await db
      .update(appointments)
      .set(updateData)
      .where(and(eq(appointments.id, id), eq(appointments.businessAccountId, businessAccountId)))
      .returning();
    return updated;
  }

  async getAllAppointments(businessAccountId: string): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.businessAccountId, businessAccountId))
      .orderBy(desc(appointments.appointmentDate));
  }

  // Demo Page methods
  async createDemoPage(demoPage: InsertDemoPage & { token: string }): Promise<DemoPage> {
    const [created] = await db
      .insert(demoPages)
      .values(demoPage)
      .returning();
    return created;
  }

  async getDemoPage(id: string): Promise<DemoPage | undefined> {
    const [page] = await db
      .select()
      .from(demoPages)
      .where(eq(demoPages.id, id));
    return page || undefined;
  }

  async getDemoPageByToken(token: string): Promise<DemoPage | undefined> {
    const [page] = await db
      .select()
      .from(demoPages)
      .where(eq(demoPages.token, token));
    return page || undefined;
  }

  async getAllDemoPages(): Promise<DemoPage[]> {
    return await db
      .select()
      .from(demoPages)
      .orderBy(desc(demoPages.createdAt));
  }

  async updateDemoPage(id: string, updates: Partial<{ title: string; description: string; appearance: string; isActive: string; expiresAt: Date | null }>): Promise<DemoPage> {
    const [updated] = await db
      .update(demoPages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(demoPages.id, id))
      .returning();
    return updated;
  }

  async updateDemoPageLastViewed(token: string): Promise<void> {
    await db
      .update(demoPages)
      .set({ lastViewedAt: new Date() })
      .where(eq(demoPages.token, token));
  }

  async regenerateDemoPageToken(id: string, newToken: string): Promise<DemoPage> {
    const [updated] = await db
      .update(demoPages)
      .set({ token: newToken, updatedAt: new Date() })
      .where(eq(demoPages.id, id))
      .returning();
    return updated;
  }

  async deleteDemoPage(id: string): Promise<void> {
    await db
      .delete(demoPages)
      .where(eq(demoPages.id, id));
  }

  // Public Chat Link methods
  async getOrCreatePublicChatLink(businessAccountId: string): Promise<PublicChatLink> {
    // Try to get existing link
    const [existing] = await db
      .select()
      .from(publicChatLinks)
      .where(eq(publicChatLinks.businessAccountId, businessAccountId));

    if (existing) {
      return existing;
    }

    // Create new link with random token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const [created] = await db
      .insert(publicChatLinks)
      .values({
        businessAccountId,
        token,
        isActive: "true",
      })
      .returning();
    return created;
  }

  async getPublicChatLinkByToken(token: string): Promise<PublicChatLink | undefined> {
    const [link] = await db
      .select()
      .from(publicChatLinks)
      .where(eq(publicChatLinks.token, token));
    return link;
  }

  async togglePublicChatLinkStatus(businessAccountId: string): Promise<PublicChatLink> {
    // Get current status
    const [current] = await db
      .select()
      .from(publicChatLinks)
      .where(eq(publicChatLinks.businessAccountId, businessAccountId));

    if (!current) {
      throw new Error("Public chat link not found");
    }

    // Toggle status
    const newStatus = current.isActive === "true" ? "false" : "true";
    const [updated] = await db
      .update(publicChatLinks)
      .set({ 
        isActive: newStatus,
        updatedAt: new Date()
      })
      .where(eq(publicChatLinks.businessAccountId, businessAccountId))
      .returning();
    return updated;
  }

  async regeneratePublicChatLinkToken(businessAccountId: string, newToken: string): Promise<PublicChatLink> {
    const [updated] = await db
      .update(publicChatLinks)
      .set({ 
        token: newToken,
        updatedAt: new Date()
      })
      .where(eq(publicChatLinks.businessAccountId, businessAccountId))
      .returning();
    return updated;
  }

  async updatePublicChatLinkAccess(token: string): Promise<void> {
    await db
      .update(publicChatLinks)
      .set({ 
        lastAccessedAt: new Date(),
        accessCount: sql`${publicChatLinks.accessCount} + 1`
      })
      .where(eq(publicChatLinks.token, token));
  }

  async updatePublicChatLinkPassword(businessAccountId: string, password: string | null): Promise<PublicChatLink> {
    const [updated] = await db
      .update(publicChatLinks)
      .set({ 
        password: password,
        updatedAt: new Date()
      })
      .where(eq(publicChatLinks.businessAccountId, businessAccountId))
      .returning();
    
    if (!updated) {
      throw new Error("Public chat link not found");
    }
    
    return updated;
  }
}

export const storage = new DatabaseStorage();
