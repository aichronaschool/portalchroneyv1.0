// Phase 3 Task 10: Smart tool selection for 40-70% token savings
export function selectRelevantTools(userMessage: string): typeof aiTools {
  const lowerMessage = userMessage.toLowerCase();
  const selectedTools = [];
  
  // Tool selection logic based on query analysis
  const hasProductQuery = /product|item|catalog|sell|buy|purchase|price|cost|show me|browse|looking for|search|available|what do you have/i.test(lowerMessage);
  const hasFaqQuery = /how|why|what|when|where|who|can i|do you|is there|policy|return|refund|shipping|warranty|about|information|question|help|faq/i.test(lowerMessage);
  
  // STRENGTHENED: Broader appointment detection to catch more time-based patterns
  // Matches: appointment keywords, scheduling terms, time references, day references
  const hasAppointmentQuery = /appointment|book|schedule|reschedule|available times|availability|slots|when can|meeting|consultation|visit|see you|come in|doctor|clinic|reserve|reservation/i.test(lowerMessage);
  
  // STRENGTHENED: Enhanced time reference detection for appointment context
  // Matches: specific times (4pm, 3:30, 16:00), relative dates (tomorrow, next week), days (Monday), time periods
  const hasTimeReference = /\d{1,2}\s*([:.]\s*\d{2})?\s*(am|pm|o'?clock)?|tomorrow|today|tonight|next week|this week|next month|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|evening|night|weekend|weekday/i.test(lowerMessage);
  
  // STRENGTHENED: Detect explicit lead capture intent
  // Only include capture_lead when user explicitly wants to be contacted or provide contact info
  const hasLeadIntent = /contact me|get in touch|send (me )?info|reach out|call me|email me|send (me )?details|notify me|let me know|keep me (posted|updated|informed)|i'?ll (give|provide) (you )?my|here'?s my (email|phone|number|contact)/i.test(lowerMessage);
  
  // Detect if this is an appointment-related context (scheduling intent or time reference)
  const isAppointmentContext = hasAppointmentQuery || hasTimeReference;
  
  // Always include relevant tools based on query
  if (hasProductQuery) {
    selectedTools.push(aiTools[0]); // get_products
  }
  
  if (hasFaqQuery) {
    selectedTools.push(aiTools[1]); // get_faqs
  }
  
  // Include appointment tools when user asks about scheduling OR mentions time/date
  // This ensures book_appointment is available when user says "4pm", "tomorrow", etc.
  if (isAppointmentContext) {
    selectedTools.push(aiTools[3]); // list_available_slots
    selectedTools.push(aiTools[4]); // book_appointment
  }
  
  // GATED: Only include capture_lead when there's explicit lead intent AND no appointment context
  // This prevents capture_lead from being available during appointment conversations
  if (hasLeadIntent && !isAppointmentContext) {
    selectedTools.push(aiTools[2]); // capture_lead
  }
  
  // If no specific tools match, include get_faqs as fallback (knowledge base)
  if (selectedTools.length === 0) {
    selectedTools.push(aiTools[1]); // get_faqs is our primary knowledge source
  }
  
  const savings = Math.round((1 - selectedTools.length / aiTools.length) * 100);
  console.log(`[Smart Tools] Selected ${selectedTools.length}/${aiTools.length} tools (${savings}% token savings) for: "${userMessage.substring(0, 50)}..."`);
  console.log(`[Smart Tools] Appointment context: ${isAppointmentContext}, Lead intent: ${hasLeadIntent}`);
  
  return selectedTools;
}

export const aiTools = [
  {
    type: 'function',
    function: {
      name: 'get_products',
      description: 'Retrieve the list of products from the business catalog with their categories and tags for smart product discovery. ALWAYS use this tool when users ask about: products, items, catalog, what you sell, best sellers, popular products, top products, product recommendations, available products, product list, or anything related to the product inventory. Each product includes categories and tags that help customers find related items. Call this even if they ask for "best selling" or "popular" items - just retrieve all products and present them. This tool returns a maximum of 5 products at a time. If there are more products, ask the user if they want to see more, and call this tool again with the next offset. Supports price filtering for queries like "products under $50" or "items between $20 and $100".',
      parameters: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description: 'Optional search term to filter products by name, description, category name, or tag name. Examples: "summer" will find products with "Summer Collection" tag, "shoes" will find products in Shoes category, "waterproof" will find products with waterproof tag.'
          },
          min_price: {
            type: 'number',
            description: 'Optional minimum price filter (inclusive). Use when customer asks for products "above", "over", or "at least" a certain price.'
          },
          max_price: {
            type: 'number',
            description: 'Optional maximum price filter (inclusive). Use when customer asks for products "under", "below", "less than", or "up to" a certain price.'
          },
          offset: {
            type: 'number',
            description: 'Number of products to skip (for pagination). Start with 0, then 5, 10, 15, etc.'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_faqs',
      description: 'CRITICAL: This is the primary knowledge base. ALWAYS check FAQs FIRST before answering ANY customer question (except product listings). Use this tool for ALL informational questions including but not limited to: company information (owner, founder, CEO, about us, history), policies (return, refund, exchange, warranty), shipping (costs, times, methods, free shipping), sizing (guides, measurements, fit), payment (methods accepted, payment plans), store information (locations, hours, contact), product details (care instructions, materials, compatibility), ordering process (how to order, tracking, cancellations), troubleshooting, or ANY question that starts with "who", "what", "when", "where", "why", "how", "do you", "can I", "is there". If the user asks anything that might be in the FAQ, CHECK IT FIRST - do not guess or deflect.',
      parameters: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description: 'Optional search term to filter FAQs by question or answer content'
          },
          category: {
            type: 'string',
            description: 'Optional category to filter FAQs'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'capture_lead',
      description: 'Capture contact information for general inquiries (product questions, contact requests, etc.). For appointment bookings, use book_appointment instead as it automatically captures lead info. CONVERSATIONAL FLOW: (1) When customer provides ONLY contact info (email/phone) WITHOUT name, DO NOT capture yet - instead respond conversationally and politely ask for their name (e.g., "Thanks! And what\'s your name so I can make sure everything is set up perfectly?"). (2) When customer then provides their name in the NEXT message, NOW call this tool with both name AND contact info. (3) If customer ignores or declines to give name in their next message, THEN call this tool with just the contact info - do NOT insist or ask again. (4) If customer provides BOTH name AND contact info in same message, call this tool immediately. REQUIREMENTS: You need at least ONE contact method - either email OR phone number (or both). Name is optional but PREFERRED - always try to ask for it once before capturing.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Customer name (optional - only include if actually provided by customer)'
          },
          email: {
            type: 'string',
            description: 'Customer email address (required if phone is not provided)'
          },
          phone: {
            type: 'string',
            description: 'Customer phone number (required if email is not provided)'
          },
          message: {
            type: 'string',
            description: 'Any additional message or inquiry from the customer (optional)'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_available_slots',
      description: 'CRITICAL: ALWAYS call this tool when users ask ANYTHING about appointment times, availability, or scheduling. This is your ONLY way to see actual available time slots - you cannot answer time-related questions without calling this tool first. Use this for ANY of these questions or variations: "what times are available", "when can I come in", "do you have openings", "what are your hours", "are you open", "can I book", "show me slots", "what slots", "list times", "available appointments", "when are you free", "what days", "does [time] work", "is [time] available", "can I come at [time]", "do you have [time]", "are you available [time]", "openings for [day]", "schedule for [day]", "what about [time]", or ANY question about specific times, days, or availability. IMPORTANT: Even if user mentions a specific time (e.g., "does 10 pm work for tomorrow"), you MUST call this tool to check actual availability - do NOT guess or say you cannot see times. Returns available dates and times based on the business schedule. If no date is specified, shows availability for the next 7 days.',
      parameters: {
        type: 'object',
        properties: {
          start_date: {
            type: 'string',
            description: 'Optional start date to check availability (ISO format YYYY-MM-DD). If not provided, uses today\'s date. When user asks about "tomorrow", "next week", "this weekend", etc., calculate the appropriate date. Examples: "2025-11-15", "2025-12-01"'
          },
          end_date: {
            type: 'string',
            description: 'Optional end date to check availability (ISO format YYYY-MM-DD). If not provided, shows next 7 days from start_date. For specific day queries like "tomorrow", use same date for both start and end. Examples: "2025-11-22", "2025-12-08"'
          },
          duration_minutes: {
            type: 'number',
            description: 'Optional appointment duration in minutes. Default is 30 minutes. Use this if user mentions specific appointment length.'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'book_appointment',
      description: 'Book an appointment and automatically capture lead information. This tool creates both an appointment AND a lead entry. CONVERSATIONAL FLOW: (1) Show available slots using list_available_slots, (2) When user selects a specific time (e.g., "4 PM", "tomorrow at 3", "book me for 2:30"), politely collect their name and phone if not already provided (e.g., "Great! I can book you for [time]. May I have your name and phone number to confirm the appointment?"), (3) Once you have name, phone, date, and time, call THIS tool to book the appointment. This will automatically create a lead entry, so no need to call capture_lead separately. Only call this after user confirms a specific date and time.',
      parameters: {
        type: 'object',
        properties: {
          patient_name: {
            type: 'string',
            description: 'Patient full name (required - must be provided by user)'
          },
          patient_phone: {
            type: 'string',
            description: 'Patient phone number (required - must be provided by user)'
          },
          patient_email: {
            type: 'string',
            description: 'Patient email address (optional)'
          },
          appointment_date: {
            type: 'string',
            description: 'Appointment date in ISO format (YYYY-MM-DD). Example: "2025-11-15"'
          },
          appointment_time: {
            type: 'string',
            description: 'Appointment time in 24-hour format (HH:MM). Example: "14:00" for 2:00 PM, "09:30" for 9:30 AM'
          },
          duration_minutes: {
            type: 'number',
            description: 'Appointment duration in minutes. Default is 30.'
          },
          notes: {
            type: 'string',
            description: 'Optional notes about the appointment (reason for visit, special requests, etc.)'
          }
        },
        required: ['patient_name', 'patient_phone', 'appointment_date', 'appointment_time']
      }
    }
  }
];
