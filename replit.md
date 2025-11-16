# Hi Chroney - AI Business Chatbot Platform

## Overview
Hi Chroney is a multi-tenant AI chatbot platform designed for businesses to enhance customer engagement and lead generation. It provides an AI-powered conversational interface for managing products, FAQs, and leads. Key capabilities include dynamic product showcasing, knowledge base Q&A, automated lead capture, and an AI-powered appointment booking system. The platform offers a secure, role-based access control system and aims to deliver efficient, intelligent solutions for business growth and improved customer interaction.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

### Database Restoration (November 16, 2025)
- Successfully imported database backup from previous instance
- Database now contains:
  - 9 users across multiple business accounts
  - 8 business accounts (including chrona.in, socialkit.co.in, induceindia.com, onlinejain.com, and others)
  - 2 products
  - Historical conversations, FAQs, leads, and appointments
- All schemas (public, import_staging, staging) have been restored
- Database schema includes additional columns not present in the initial Drizzle schema (e.g., analyzed_pages.page_category, business_accounts.show_cart_recovery, widget_settings.shopify_* fields)

### OpenAI Realtime API Migration & Voice Mode Revamp (November 16, 2025)
- **Complete Migration to OpenAI Realtime API**: Fully migrated from Deepgram to OpenAI's Realtime API for all voice functionality
  - Uses `gpt-realtime-mini` model for natural, conversational voice interactions
  - Single API handles both speech-to-text and text-to-speech (no separate TTS/STT services needed)
  - Removed all Deepgram dependencies and UI components from SuperAdmin panel

- **ChatGPT Advanced Voice Mode Experience**: Completely revamped voice mode to match ChatGPT's natural conversation quality
  - **Voice Selection**: Using "shimmer" voice (warm, expressive, natural-sounding)
  - **System Instructions**: Completely redesigned to create human-like conversations:
    - Natural speech patterns with conversational rhythm
    - Uses filler words ("well", "you know", "hmm") for authenticity
    - Shows genuine emotion and personality
    - Responds like talking to a helpful friend on a phone call
    - Varies sentence structure to avoid robotic speech
  - **Optimized Turn Detection**: 
    - 700ms silence duration for more natural conversation flow
    - Balanced sensitivity (0.5 threshold) for smooth interruptions
    - 300ms prefix padding to capture speech start smoothly
  - **Enhanced Naturalness**:
    - Temperature increased to 0.9 for varied, natural responses
    - Response length limited to 1500 tokens for conversational brevity
    - Personality-driven interactions (friendly, professional, or casual)
  - **Conversation Flow**: Feels like a real phone conversation with natural pauses, acknowledgments, and follow-up questions

- **SuperAdmin API Keys Enhancement**:
  - **SuperAdmin-Only Control**: Comprehensive API Keys management interface in SuperAdmin panel
  - SuperAdmin can now manage two types of settings per business account:
    - OpenAI API Key (for AI chatbot AND voice mode functionality)
    - Currency (for product pricing display)
  - **Security & Encryption**:
    - All API keys encrypted using AES-256-GCM and stored in business_accounts table
    - UI displays masked API keys (last 4 characters only) for security
    - Show/hide toggle functionality for API key visibility
    - Backend validates and encrypts all API keys before storage
  - **Implementation Details**:
    - Fixed critical bug: OpenAI keys properly decrypted before use via `decryptApiKeyIfNeeded()`
    - Voice mode uses business-specific OpenAI API keys (decrypted at runtime)
    - All OpenAI API calls properly decrypt business API keys
  - **Business User Settings Cleanup**:
    - Removed OpenAI API Key and Currency settings from business user Settings page
    - Business users can now only change their password in Settings
    - All API key and currency management exclusively controlled by SuperAdmin
  - **Important Notes**:
    - Startup warnings "API key not configured" are expected and harmless
    - Business-specific API keys take precedence over global environment variables
    - Database schema includes `openai_api_key` and `currency` columns in business_accounts table

## System Architecture

### UI/UX Decisions
The frontend is built with React 18, TypeScript, Vite, Shadcn UI (Radix UI), and Tailwind CSS, supporting light/dark modes. The design emphasizes conversational clarity with a fixed gradient header, role-based sidebar, and a responsive, centered layout. AI responses are card-based, and user input uses gradient bubbles. The navigation prioritizes Home, Insights, Conversations, Leads, Admin sections, Train Chroney, Products, FAQs, Shopify, Calendar, Website Scan, and Widget. A modern, split-layout login page features an auto-rotating use case carousel and glassmorphism design. Specific UI implementations include a two-column calendar page with visual indicators, a Google-style weekly schedule interface with an explicit edit mode, and a Widget Studio with a split-screen layout and live preview for customization (including size, position, style, behavior, and auto-open settings). The Website Analysis page features a gradient hero section, tabbed organization, and organized business profile cards.

### Technical Implementations
The backend uses Express.js with Node.js, implementing session-based authentication with httpOnly cookies, bcrypt hashing, and role-based access control. APIs support authentication, SuperAdmin business account management, and CRUD operations for conversations, messages, products, FAQs, and leads, with multi-tenancy enforced by `businessAccountId` filtering.

### Feature Specifications
-   **Multi-Tenant Authentication & Admin Dashboards**: SuperAdmins manage business accounts and users; Business Users manage products, FAQs, leads, company descriptions, and chatbot training.
-   **Account Management**: SuperAdmins can suspend business accounts and toggle features like Shopify and Appointments per business account, affecting sidebar visibility.
-   **Insights & Demos**: SuperAdmins have a comprehensive insights dashboard and can create shareable demo pages with token-based public URLs. Business users have an insights dashboard tracking key metrics.
-   **Shareable Public Chat Links**: Business users can generate and share unique public chat links for unauthenticated access to their AI chatbot, with optional password protection, access control, and tracking. Password protection uses signed cookies with server-side enforcement to prevent bypass attacks.
-   **Chroney AI Chat**: Powered by OpenAI GPT-4.1 nano, featuring context-aware typing indicators, tool-based function calling (products, FAQs, lead capture, appointment booking), 15-minute conversation memory, and word-by-word streaming.
-   **Real-Time Conversational Voice Mode**: ChatGPT Advanced Voice Mode experience with full-screen interface featuring animated gradient orb. Powered by OpenAI's Realtime API (gpt-realtime-mini model) with WebSocket-based bidirectional audio streaming for seamless, natural conversation. Architecture: MediaRecorder (WebM/Opus, 50ms timeslice) → WebSocket → OpenAI Realtime API (server-side VAD with 700ms silence detection). Features conversational AI instructions designed for human-like interactions with natural speech patterns, filler words, emotional expressiveness, and personality-driven responses. Voice selection uses "shimmer" (warm, expressive, natural-sounding). Optimized turn detection with 700ms silence duration, 0.5 threshold, and 300ms prefix padding for smooth conversation flow. Enhanced naturalness with 0.9 temperature for varied responses and 1500 token limit for conversational brevity. Visual states (idle/listening/thinking/speaking), real-time transcript display with interim/final distinction, session-based WebSocket authentication, complete resource cleanup, and full feature parity with text chat (appointments, leads, products, FAQs). Supports 36+ languages with automatic detection, microphone permission handling, and graceful fallback to text-only mode. Voice mode automatically starts recording when opened (after mic permission grant), and microphone auto-restarts after each AI response for continuous conversation without manual interaction.
-   **AI-Powered Appointment Booking**: A comprehensive scheduling system with conversational booking, weekly schedule templates, slot overrides, and a calendar management page. All times are handled in IST.
-   **Training & Configuration**: Business Users can train Chroney using natural language and customize chatbot appearance and behavior via the Widget Studio (Style, Behavior, Embed tabs with live preview). The Behavior tab includes chat auto-open settings to control whether the widget automatically opens on page load. API keys and currency settings are managed exclusively by SuperAdmin through the API Keys interface.
-   **Data Management**: Supports product image uploads, optional pricing, intelligent product cataloging with categories/tags/relationships, proactive AI-driven lead capture, and direct FAQ management.
-   **Conversations & Leads**: A two-panel interface for viewing searchable/filterable conversation lists and full message histories. Leads are linked directly to their generating conversations for quick context review.
-   **Website Analysis**: Allows Business Users to scrape and analyze website content using OpenAI GPT-4o with an evidence-backed anti-hallucination system, multi-page crawling, and smart URL normalization.
-   **PDF Training Documents**: Business Users can upload PDF documents for Chroney to extract and integrate knowledge using pdf-parse and OpenAI GPT-4o-mini.
-   **Shopify Integration**: Provides an overview of sync status, a product table for Shopify products, and settings for credentials and auto-sync, enabling automatic background synchronization.
-   **Security & Data Isolation**: Secure password reset functionality. All business data is isolated by `businessAccountId` at the database level.

### System Design Choices
-   **Database**: PostgreSQL with Drizzle ORM and Neon serverless driver, enforcing multi-tenancy and UUID primary keys.
-   **Data Validation**: Zod schemas for end-to-end type safety.
-   **State Management**: TanStack Query for server state; local React state for UI.
-   **Security**: bcrypt for password hashing; `httpOnly`, `secure`, `sameSite=strict` session cookies; signed cookies for public chat password verification; cryptographically random cookie secrets; role-based middleware and database-level filtering. Production deployments require COOKIE_SECRET environment variable.
-   **Chat Performance Optimizations**: Achieved through rotating intro messages, context-aware typing indicators, automatic memory reset, word-by-word animation, business context caching, parallel context loading, and smart tool selection.

## External Dependencies

-   **AI Services**: OpenAI API (GPT-4.1 nano for chat, GPT-4o for analysis, GPT-4o-mini for training, gpt-realtime-mini for voice mode with integrated speech-to-text and text-to-speech).
-   **E-commerce Integration**: Shopify GraphQL Admin API (`@shopify/shopify-api`).
-   **Database Services**: Neon Serverless PostgreSQL.
-   **Web Scraping**: cheerio.
-   **File Upload**: multer.
-   **Security Libraries**: `bcrypt`, `cookie-parser`.
-   **UI Component Libraries**: Radix UI.
-   **Styling & Fonts**: Google Fonts, Tailwind CSS, PostCSS.