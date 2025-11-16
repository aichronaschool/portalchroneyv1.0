import { storage } from '../storage';
import { ilike, or } from 'drizzle-orm';
import { addDays, startOfDay, endOfDay, format, parseISO, isAfter, isBefore } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const IST_TIMEZONE = 'Asia/Kolkata';

interface ToolExecutionContext {
  businessAccountId: string;
  userId: string;
  conversationId?: string;
}

export class ToolExecutionService {
  static async executeTool(
    toolName: string,
    parameters: any,
    context: ToolExecutionContext,
    userMessage?: string
  ) {
    try {
      switch (toolName) {
        case 'get_products':
          return await this.handleGetProducts(parameters, context);
        
        case 'get_faqs':
          return await this.handleGetFaqs(parameters, context);
        
        case 'capture_lead':
          return await this.handleCaptureLead(parameters, context, userMessage);
        
        case 'list_available_slots':
          return await this.handleListAvailableSlots(parameters, context);
        
        case 'book_appointment':
          return await this.handleBookAppointment(parameters, context);
        
        default:
          return {
            success: false,
            error: `Unknown tool: ${toolName}`
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Tool execution failed'
      };
    }
  }

  private static async handleGetProducts(params: any, context: ToolExecutionContext) {
    // Get products filtered by business account at database level
    const businessProducts = await storage.getAllProducts(context.businessAccountId);

    // Fetch categories and tags for ALL products first (needed for search)
    const productsWithMeta = await Promise.all(
      businessProducts.map(async (p) => {
        const [categories, tags] = await Promise.all([
          storage.getProductCategories(p.id),
          storage.getProductTags(p.id)
        ]);

        return {
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          imageUrl: p.imageUrl,
          categories: categories.map(c => ({ id: c.id, name: c.name })),
          tags: tags.map(t => ({ id: t.id, name: t.name, color: t.color }))
        };
      })
    );

    // Apply search if provided - search across name, description, categories, and tags
    let filteredProducts = productsWithMeta;
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredProducts = productsWithMeta.filter(p => {
        // Search in name and description
        const matchesNameOrDesc = p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower);
        
        // Search in category names
        const matchesCategory = p.categories.some(c => 
          c.name.toLowerCase().includes(searchLower)
        );
        
        // Search in tag names
        const matchesTag = p.tags.some(t => 
          t.name.toLowerCase().includes(searchLower)
        );
        
        return matchesNameOrDesc || matchesCategory || matchesTag;
      });
    }

    // Apply price filters if provided
    if (params.min_price !== undefined || params.max_price !== undefined) {
      filteredProducts = filteredProducts.filter(p => {
        // Skip products without prices when filtering by price
        if (p.price === null || p.price === undefined) {
          return false;
        }
        
        const price = parseFloat(p.price.toString());
        
        // Check minimum price
        if (params.min_price !== undefined && price < params.min_price) {
          return false;
        }
        
        // Check maximum price
        if (params.max_price !== undefined && price > params.max_price) {
          return false;
        }
        
        return true;
      });
    }

    // Apply pagination - max 5 products per request
    const limit = 5;
    const offset = params.offset || 0;
    const totalCount = filteredProducts.length;
    const paginatedProducts = filteredProducts.slice(offset, offset + limit);
    const hasMore = (offset + limit) < totalCount;
    const nextOffset = hasMore ? offset + limit : null;

    return {
      success: true,
      data: paginatedProducts,
      pagination: {
        total: totalCount,
        offset: offset,
        limit: limit,
        hasMore: hasMore,
        nextOffset: nextOffset,
        showing: paginatedProducts.length
      },
      message: paginatedProducts.length > 0 
        ? `Showing ${paginatedProducts.length} of ${totalCount} product(s)` 
        : 'No products found'
    };
  }

  private static async handleGetFaqs(params: any, context: ToolExecutionContext) {
    // Get FAQs filtered by business account at database level
    const businessFaqs = await storage.getAllFaqs(context.businessAccountId);

    // Apply search if provided - use keyword-based matching for better results
    let filteredFaqs = businessFaqs;
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      
      // Extract keywords from search (remove common words)
      const stopWords = ['is', 'are', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'from'];
      const searchKeywords = searchLower
        .split(/\s+/)
        .filter((word: string) => word.length > 2 && !stopWords.includes(word));
      
      filteredFaqs = businessFaqs.filter(f => {
        const questionLower = f.question.toLowerCase();
        const answerLower = f.answer.toLowerCase();
        
        // First try exact substring match
        if (questionLower.includes(searchLower) || answerLower.includes(searchLower)) {
          return true;
        }
        
        // Then try keyword matching - at least 50% of keywords must match
        if (searchKeywords.length > 0) {
          const matchCount = searchKeywords.filter((keyword: string) => 
            questionLower.includes(keyword) || answerLower.includes(keyword)
          ).length;
          const matchPercentage = matchCount / searchKeywords.length;
          return matchPercentage >= 0.5; // At least 50% of keywords must match
        }
        
        return false;
      });
    }

    // Apply category filter if provided
    if (params.category) {
      filteredFaqs = filteredFaqs.filter(f => 
        f.category?.toLowerCase() === params.category.toLowerCase()
      );
    }

    console.log('[FAQ Search] Query:', params.search);
    console.log('[FAQ Search] Total business FAQs:', businessFaqs.length);
    console.log('[FAQ Search] Filtered results:', filteredFaqs.length);
    if (filteredFaqs.length > 0) {
      console.log('[FAQ Search] Matched questions:', filteredFaqs.map(f => f.question));
    }

    return {
      success: true,
      data: filteredFaqs.map(f => ({
        question: f.question,
        answer: f.answer,
        category: f.category
      })),
      message: filteredFaqs.length > 0 
        ? `Found ${filteredFaqs.length} FAQ(s)` 
        : 'No FAQs found'
    };
  }

  private static async handleCaptureLead(params: any, context: ToolExecutionContext, userMessage?: string) {
    const { name, email, phone, message } = params;

    // POST-SELECTION GUARD: Check if this is actually an appointment request
    // This is a safety net in case tool selection incorrectly chose capture_lead
    if (userMessage) {
      const lowerMessage = userMessage.toLowerCase();
      
      // Check for appointment/scheduling intent
      const hasAppointmentIntent = /appointment|book|schedule|reschedule|available times|availability|slots|when can|meeting|consultation|visit|see you|come in|reserve|reservation/i.test(lowerMessage);
      
      // Check for time references that suggest appointment booking
      const hasTimeReference = /\d{1,2}\s*([:.]\s*\d{2})?\s*(am|pm|o'?clock)?|tomorrow|today|tonight|next week|this week|next month|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|evening|night|weekend|weekday/i.test(lowerMessage);
      
      if (hasAppointmentIntent || hasTimeReference) {
        console.log('[Lead Capture Guard] Detected appointment context in message, redirecting to appointment booking');
        return {
          success: false,
          error: 'Appointment context detected',
          message: 'It looks like you\'re trying to book an appointment! Let me help you find available times. What date and time works best for you?',
          redirect_to_appointments: true
        };
      }
    }

    // Validate that at least email OR phone is provided
    if (!email && !phone) {
      return {
        success: false,
        error: 'Either email or phone number is required to capture a lead',
        message: 'I need at least your email address or phone number to help you. Could you please share one of them?'
      };
    }

    const lead = await storage.createLead({
      businessAccountId: context.businessAccountId,
      name: name || null,
      email: email || null,
      phone: phone || null,
      message: message || 'Lead captured via AI chat',
      conversationId: context.conversationId || null
    });

    // Update conversation title based on priority: name > phone > email
    if (context.conversationId) {
      let newTitle = 'Anonymous';
      
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
        console.error('[Lead Capture] Error updating conversation title:', error);
      }
    }

    // Create personalized thank you message
    const thankYouName = name ? name : 'there';
    return {
      success: true,
      data: { leadId: lead.id },
      message: `Thank you, ${thankYouName}! I've saved your contact information. Someone from our team will reach out to you soon.`
    };
  }

  private static async handleListAvailableSlots(params: any, context: ToolExecutionContext) {
    console.log('[Appointments] list_available_slots called with params:', JSON.stringify(params));
    
    // Check if appointment booking is enabled
    const widgetSettings = await storage.getWidgetSettings(context.businessAccountId);
    console.log('[Appointments] Booking enabled:', widgetSettings?.appointmentBookingEnabled);
    
    if (widgetSettings && widgetSettings.appointmentBookingEnabled === 'false') {
      return {
        success: true,
        data: { slots: {}, total: 0 },
        message: 'We are not currently accepting appointments. Please contact us directly for assistance.'
      };
    }

    const durationMinutes = params.duration_minutes || 30;
    
    const nowIST = toZonedTime(new Date(), IST_TIMEZONE);
    const today = startOfDay(nowIST);
    const startDate = params.start_date ? startOfDay(toZonedTime(parseISO(params.start_date), IST_TIMEZONE)) : today;
    const endDate = params.end_date ? endOfDay(toZonedTime(parseISO(params.end_date), IST_TIMEZONE)) : endOfDay(addDays(startDate, 6));
    
    console.log('[Appointments] Date range:', { 
      startDate: format(startDate, 'yyyy-MM-dd'), 
      endDate: format(endDate, 'yyyy-MM-dd') 
    });
    
    const [scheduleTemplates, overrides, existingAppointments] = await Promise.all([
      storage.getScheduleTemplates(context.businessAccountId),
      storage.getSlotOverridesForRange(context.businessAccountId, startDate, endDate),
      storage.getAppointmentsForRange(context.businessAccountId, startDate, endDate),
    ]);

    console.log('[Appointments] Found:', {
      scheduleTemplates: scheduleTemplates.length,
      overrides: overrides.length,
      appointments: existingAppointments.length
    });

    if (scheduleTemplates.length > 0) {
      console.log('[Appointments] Schedule templates:', scheduleTemplates.map(t => ({
        day: t.dayOfWeek,
        time: `${t.startTime}-${t.endTime}`,
        duration: t.slotDurationMinutes,
        active: t.isActive
      })));
    }

    if (scheduleTemplates.length === 0 && overrides.length === 0) {
      return {
        success: true,
        data: { slots: {}, total: 0 },
        message: 'No availability schedule has been configured yet. Please contact us directly to schedule an appointment.'
      };
    }

    const templatesByDay = new Map<number, typeof scheduleTemplates>();
    let activeCount = 0;
    scheduleTemplates.forEach(template => {
      const day = parseInt(template.dayOfWeek.toString());
      if (!templatesByDay.has(day)) {
        templatesByDay.set(day, []);
      }
      if (template.isActive === 'true') {
        templatesByDay.get(day)!.push(template);
        activeCount++;
      }
    });
    
    console.log('[Appointments] Active templates:', activeCount, 'Days with schedules:', Array.from(templatesByDay.keys()));

    const overridesMap = new Map<string, typeof overrides>();
    overrides.forEach(override => {
      const key = `${format(new Date(override.slotDate), 'yyyy-MM-dd')}_${override.slotTime}`;
      if (!overridesMap.has(key)) {
        overridesMap.set(key, []);
      }
      overridesMap.get(key)!.push(override);
    });

    const appointmentsMap = new Map<string, typeof existingAppointments>();
    existingAppointments.forEach(appt => {
      if (appt.status !== 'cancelled') {
        const key = `${format(new Date(appt.appointmentDate), 'yyyy-MM-dd')}_${appt.appointmentTime}`;
        if (!appointmentsMap.has(key)) {
          appointmentsMap.set(key, []);
        }
        appointmentsMap.get(key)!.push(appt);
      }
    });

    const availableSlots: Record<string, string[]> = {};
    let currentDate = new Date(startDate);
    let totalSlots = 0;

    while (isBefore(currentDate, endDate) || currentDate.getTime() === endDate.getTime()) {
      const dayOfWeek = currentDate.getDay();
      const dateKey = format(currentDate, 'yyyy-MM-dd');
      const daySlots: string[] = [];

      // Check if entire day is blocked via all-day override
      const allDayBlocks = overrides.filter(o => 
        format(new Date(o.slotDate), 'yyyy-MM-dd') === dateKey && 
        o.isAllDay === 'true' && 
        o.isAvailable === 'false'
      );
      
      // Skip this entire day if it has an all-day block
      if (allDayBlocks.length > 0) {
        currentDate = addDays(currentDate, 1);
        continue;
      }

      const templates = templatesByDay.get(dayOfWeek) || [];
      for (const template of templates) {
        const slotDuration = parseInt(template.slotDurationMinutes.toString());
        const [startHour, startMin] = template.startTime.split(':').map(Number);
        const [endHour, endMin] = template.endTime.split(':').map(Number);
        
        let slotTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;

        while (slotTime + slotDuration <= endTime) {
          const hour = Math.floor(slotTime / 60);
          const min = slotTime % 60;
          const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
          const slotKey = `${dateKey}_${timeStr}`;
          
          const overridesForSlot = overridesMap.get(slotKey) || [];
          const isBlocked = overridesForSlot.some(o => o.isAvailable === 'false');
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
          overrideList.forEach(override => {
            if (override.isAvailable === 'true') {
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
      message: totalSlots > 0 
        ? `Found ${totalSlots} available time slot(s) across ${Object.keys(availableSlots).length} day(s)` 
        : 'No available slots found in the requested date range. Please try different dates or contact us directly.'
    };
  }

  private static async handleBookAppointment(params: any, context: ToolExecutionContext) {
    // Check if appointment booking is enabled
    const widgetSettings = await storage.getWidgetSettings(context.businessAccountId);
    if (widgetSettings && widgetSettings.appointmentBookingEnabled === 'false') {
      return {
        success: false,
        error: 'Appointments are disabled',
        message: 'We are not currently accepting appointments. Please contact us directly for assistance.'
      };
    }

    const { patient_name, patient_phone, patient_email, appointment_date, appointment_time, duration_minutes, notes } = params;

    const appointmentDateTime = toZonedTime(parseISO(appointment_date), IST_TIMEZONE);
    const nowIST = toZonedTime(new Date(), IST_TIMEZONE);
    const todayIST = startOfDay(nowIST);
    
    if (isBefore(appointmentDateTime, todayIST)) {
      return {
        success: false,
        error: 'Cannot book appointments in the past',
        message: 'I cannot book appointments for past dates. Please choose a future date.'
      };
    }

    const [scheduleTemplates, overrides, existingAppointments] = await Promise.all([
      storage.getScheduleTemplates(context.businessAccountId),
      storage.getSlotOverridesForRange(context.businessAccountId, appointmentDateTime, appointmentDateTime),
      storage.getAppointmentsForRange(context.businessAccountId, appointmentDateTime, appointmentDateTime),
    ]);

    const slotKey = `${format(appointmentDateTime, 'yyyy-MM-dd')}_${appointment_time}`;
    const conflictingAppointments = existingAppointments.filter(
      appt => appt.status !== 'cancelled' && appt.appointmentTime === appointment_time
    );

    if (conflictingAppointments.length > 0) {
      return {
        success: false,
        error: 'Time slot already booked',
        message: 'I\'m sorry, but this time slot has just been booked. Let me show you other available times.'
      };
    }

    const dayOfWeek = appointmentDateTime.getDay();
    const dateKey = format(appointmentDateTime, 'yyyy-MM-dd');
    
    const relevantOverrides = overrides.filter(o => {
      const overrideDateKey = format(new Date(o.slotDate), 'yyyy-MM-dd');
      return overrideDateKey === dateKey && o.slotTime === appointment_time;
    });

    const isBlockedByOverride = relevantOverrides.some(o => o.isAvailable === 'false');
    if (isBlockedByOverride) {
      return {
        success: false,
        error: 'Time slot not available',
        message: 'I\'m sorry, but this time slot is not available. Please choose another time.'
      };
    }

    const isAddedByOverride = relevantOverrides.some(o => o.isAvailable === 'true');
    
    if (!isAddedByOverride) {
      const dayTemplates = scheduleTemplates.filter(
        t => parseInt(t.dayOfWeek.toString()) === dayOfWeek && t.isActive === 'true'
      );

      let isWithinSchedule = false;
      for (const template of dayTemplates) {
        const [startHour, startMin] = template.startTime.split(':').map(Number);
        const [endHour, endMin] = template.endTime.split(':').map(Number);
        const [apptHour, apptMin] = appointment_time.split(':').map(Number);
        
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
          error: 'Time slot outside business hours',
          message: 'I\'m sorry, but this time is outside our regular hours. Please check available slots.'
        };
      }
    }

    // First, create a lead for this appointment booking
    const lead = await storage.createLead({
      businessAccountId: context.businessAccountId,
      conversationId: context.conversationId || null,
      name: patient_name,
      email: patient_email || null,
      phone: patient_phone,
      message: notes || `Booked appointment for ${format(appointmentDateTime, 'MMMM d, yyyy')} at ${appointment_time}`,
    });

    // Then create the appointment linked to the lead
    const appointment = await storage.createAppointment({
      businessAccountId: context.businessAccountId,
      conversationId: context.conversationId || null,
      leadId: lead.id,
      patientName: patient_name,
      patientPhone: patient_phone,
      patientEmail: patient_email || null,
      appointmentDate: appointmentDateTime,
      appointmentTime: appointment_time,
      durationMinutes: duration_minutes ? duration_minutes.toString() : '30',
      status: 'confirmed',
      notes: notes || null,
      cancellationReason: null,
    });

    const formattedDate = format(appointmentDateTime, 'EEEE, MMMM d, yyyy');
    const [hour, min] = appointment_time.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    const formattedTime = `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;

    return {
      success: true,
      data: { appointmentId: appointment.id },
      message: `Perfect! I've booked your appointment for ${formattedDate} at ${formattedTime}. You'll receive a confirmation shortly. See you then, ${patient_name}!`
    };
  }
}
