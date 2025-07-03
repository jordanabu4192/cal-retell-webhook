const chrono = require('chrono-node');
const { google } = require('googleapis');

const {
  handleCalculateSolarSavings,
  handleScoreSolarLead,
  handleBookSolarConsultation,
  handleSendSolarInfo,
  handleCalculateFinancingOptions,
  handleLookupLocalIncentives
} = require('./lead-qualification');

const gmail = google.gmail({ version: 'v1' });

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Retell-Signature');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (name === 'send_confirmation_email') {
  const result = await handleSendConfirmationEmail(args);
  return res.json(result);
}
  
  if (req.method === 'GET') {
    return res.json({ message: 'Cal.com Retell webhook server is running!' });
  }
  
  if (req.method === 'POST') {
    try {
      console.log('Received request:', req.body);
      
      const { name, args } = req.body;
      
// Handle direct parameter format from Retell
if (!req.body.name && req.body.monthly_electric_bill !== undefined) {
  // This is a calculate_solar_savings call
  const result = await handleCalculateSolarSavings(req.body);
  return res.json(result);
}

if (!process.env.RETELL_API_KEY) {
  throw new Error('[startup] Missing RETELL_API_KEY environment variable.');
}

if (!process.env.CAL_API_KEY) {
  throw new Error('[startup] Missing CAL_API_KEY environment variable. Please add it to your Vercel project.');
}

if (!req.body.name && req.body.homeowner !== undefined) {
  // This is a score_solar_lead call  
  const result = await handleScoreSolarLead(req.body);
  return res.json(result);
}

if (!req.body.name && req.body.date !== undefined) {
  // This is a check_availability call
  const result = await handleCheckAvailability(req.body);
  return res.json(result);
}

if (req.body.name !== undefined && req.body.email !== undefined && req.body.preferred_time !== undefined) {
  // This is a book_solar_consultation call
  const result = await handleBookSolarConsultation(req.body);
  return res.json(result);
}

      if (name === 'reschedule_booking') {
        const result = await handleRescheduleBooking(args);
        return res.json(result);
      }
      
      if (name === 'find_booking_by_date') {
        const result = await handleFindBookingByDate(args);
        return res.json(result);
      }
      
      if (name === 'check_availability') {
  const result = await handleCheckAvailability(args);
  return res.json(result);
}

      if (name === 'book_appointment') {
  const result = await handleBookAppointment(args);
  return res.json(result);
}
      
if (name === 'cancel_booking') {
        const result = await handleCancelBooking(args);
        return res.json(result);
      }
      
      if (name === 'get_tomorrow_appointments') {
        const result = await handleGetTomorrowAppointments(args);
        return res.json(result);
      }

      if (name === 'trigger_reminders') {         
        const result = await handleTriggerReminders(args); 
        return res.json(result);       
      } 

      if (name === 'test_create_call') {
  const result = await handleTestCreateCall(args);
  return res.json(result);
}

if (name === 'calculate_solar_savings') {
 const result = await handleCalculateSolarSavings(args);
 return res.json(result);
}

if (name === 'calculate_financing_options') {
  const result = await handleCalculateFinancingOptions(args);
  return res.json(result);
}

if (name === 'lookup_local_incentives') {
  const result = await handleLookupLocalIncentives(args);
  return res.json(result);
}

if (name === 'score_solar_lead') {
 const result = await handleScoreSolarLead(args);
 return res.json(result);
}

if (name === 'book_solar_consultation') {
 const result = await handleBookSolarConsultation(args);
 return res.json(result);
}

if (name === 'send_solar_info') {
 const result = await handleSendSolarInfo(args);
 return res.json(result);
}

      return res.status(400).json({ error: "Unknown function" });
      
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
  
  return res.status(405).json({ error: "Method not allowed" });
};

// ---- NEW: Improved Timezone Utility with Chrono ----
function parseToUTC(dateTimeString, timezone = 'America/Denver') {
  console.log(`[parseToUTC] Parsing: "${dateTimeString}" in timezone: ${timezone}`);
  
  // Chrono can handle natural language and standard formats
  const parsed = chrono.parseDate(dateTimeString, new Date(), { timezone });
  
  if (!parsed) {
    console.error(`[parseToUTC] Could not parse: ${dateTimeString}`);
    throw new Error(`Could not parse date/time: ${dateTimeString}`);
  }
  
  const utcString = parsed.toISOString();
  console.log(`[parseToUTC] Result: ${utcString}`);
  return utcString;
}

function parseToMountainTime(dateTimeString) {
  const parsed = chrono.parseDate(dateTimeString, new Date(), { timezone: 'America/Denver' });
  
  if (!parsed) {
    throw new Error(`Could not parse date/time: ${dateTimeString}`);
  }
  
  return parsed;
}

// ---- UPDATED: Reschedule with Chrono ----
async function handleRescheduleBooking(args) {
  const { booking_uid, new_start_time, rescheduled_by, reason } = args;
  
  console.log('Rescheduling booking:', booking_uid, 'to:', new_start_time);
  
  // Validate required fields
  if (!booking_uid) {
    return {
      success: false,
      error: "Booking ID is required",
      message: "I need your booking ID to reschedule. Can you provide that?"
    };
  }
  
  if (!new_start_time) {
    return {
      success: false,
      error: "New appointment time is required", 
      message: "I need to know what time you'd like to reschedule to. When works better for you?"
    };
  }
  
  try {
    // Use chrono to parse the new time
    const utcTime = parseToUTC(new_start_time);
    
    const response = await fetch(`https://api.cal.com/v2/bookings/${booking_uid}/reschedule`, {
      method: 'POST',
      headers: {
        'cal-api-version': '2024-08-13',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CAL_API_KEY}`
      },
      body: JSON.stringify({
        start: utcTime,
        rescheduledBy: rescheduled_by || "user",
        reschedulingReason: reason || "Rescheduled by request"
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Cal.com API error:', response.status);
      console.error('Cal.com error details:', errorData);
      
      if (response.status === 404) {
        return {
          success: false,
          error: "Booking not found",
          message: "I couldn't find a booking with that ID. Can you double-check your booking number?"
        };
      }
      if (response.status === 400) {
        return {
          success: false,
          error: "Time slot unavailable",
          message: "That time slot might not be available. Can you suggest another time?"
        };
      }
      
      return {
        success: false,
        error: `Cal.com API error: ${response.status}`,
        message: "I'm having trouble with the booking system. Please try again in a moment."
      };
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      const booking = result.data;
      const newDateTime = new Date(booking.start).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/Denver'
      });
      
      return {
        success: true,
        message: `Perfect! I've successfully rescheduled your booking to ${newDateTime}. Your booking ID is ${booking.uid}.`,
        booking_details: {
          booking_id: booking.uid,
          new_datetime: newDateTime,
          original_request: new_start_time
        }
      };
    } else {
      return {
        success: false,
        error: "Rescheduling failed",
        message: "I encountered an issue while rescheduling your booking. Please try again."
      };
    }
    
  } catch (error) {
    console.error('Reschedule error:', error);
    
    // Check if it's a chrono parsing error
    if (error.message.includes('Could not parse date/time')) {
      return {
        success: false,
        error: "Invalid date/time format",
        message: "I'm sorry, I couldn't understand that date and time format. Could you try something like 'July 9th at 2 PM'?"
      };
    }
    
    return {
      success: false,
      error: error.message,
      message: "I'm sorry, I'm having trouble connecting to the booking system right now. Please try again in a few minutes."
    };
  }
}
// ---- UPDATED: Find Booking with Chrono ----
async function handleFindBookingByDate(args) {
  const { email, appointment_date, appointment_time } = args;
  
  console.log('Finding booking for:', email, appointment_date, appointment_time);
  
  // Validate required fields
  if (!email) {
    return {
      success: false,
      error: "Email is required",
      message: "I need your email address to find your appointment."
    };
  }
  
  if (!appointment_date || !appointment_time) {
    return {
      success: false,
      error: "Date and time are required",
      message: "I need both the date and time of your appointment to find it."
    };
  }
  
  try {
    // First, get all bookings for this email
    const response = await fetch(`https://api.cal.com/v2/bookings?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'cal-api-version': '2024-08-13',
        'Authorization': `Bearer ${process.env.CAL_API_KEY}`
      }
    });
    
    if (!response.ok) {
      console.error('Cal.com API error:', response.status);
      return {
        success: false,
        error: `Cal.com API error: ${response.status}`,
        message: "I'm having trouble accessing the booking system. Please try again in a moment."
      };
    }
    
    const result = await response.json();
    const bookings = result.data || [];
    
    console.log('Found bookings:', bookings.length);
    
    // Filter for active bookings only
    const activeBookings = bookings.filter(booking => 
      booking.status === 'accepted' && new Date(booking.start) > new Date()
    );
    
    console.log('Active future bookings:', activeBookings.length);
    
    if (activeBookings.length === 0) {
      return {
        success: false,
        error: "No active bookings found",
        message: "I couldn't find any upcoming appointments for that email address. Could you double-check the email or provide your booking confirmation number?"
      };
    }
    
    // Try to match the date and time using chrono
    const matchedBooking = findBestMatch(activeBookings, appointment_date, appointment_time);
    
    if (matchedBooking) {
      const bookingDateTime = new Date(matchedBooking.start).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/Denver'
      });
      
      return {
        success: true,
        message: `Found your appointment! It's scheduled for ${bookingDateTime}.`,
        booking_uid: matchedBooking.uid,
        booking_details: bookingDateTime,
        search_criteria: {
          email: email,
          requested_date: appointment_date,
          requested_time: appointment_time
        }
      };
    } else {
      // If no exact match, provide helpful info about available appointments
      const availableAppointments = activeBookings.map(booking => {
        return new Date(booking.start).toLocaleString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'America/Denver'
        });
      }).join(', ');
      
      return {
        success: false,
        error: "No matching appointment found",
        message: `I couldn't find an appointment matching ${appointment_date} at ${appointment_time}. I found these upcoming appointments for ${email}: ${availableAppointments}. Could you clarify which one you meant?`,
        available_appointments: activeBookings.map(booking => ({
          booking_uid: booking.uid,
          datetime: new Date(booking.start).toLocaleString('en-US', {
            weekday: 'long',
            month: 'long', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZone: 'America/Denver'
          })
        }))
      };
    }
    
  } catch (error) {
    console.error('Find booking error:', error);
    
    return {
      success: false,
      error: error.message,
      message: "I'm having trouble finding your appointment. Please try again or contact our office directly."
    };
  }
}

// ---- UPDATED: Best Match with Chrono ----
function findBestMatch(bookings, dateStr, timeStr) {
  console.log('Searching for:', dateStr, timeStr);
  
  try {
    // Use chrono to parse the search terms
    const searchDateTime = chrono.parseDate(`${dateStr} ${timeStr}`, new Date(), { timezone: 'America/Denver' });
    
    if (!searchDateTime) {
      console.log('Could not parse search date/time with chrono');
      return bookings.length > 0 ? bookings[0] : null;
    }
    
    console.log('Parsed search datetime:', searchDateTime);
    
    // Find the booking that's closest to the search time
    let bestMatch = null;
    let smallestDiff = Infinity;
    
    for (const booking of bookings) {
      const bookingDate = new Date(booking.start);
      const timeDiff = Math.abs(bookingDate.getTime() - searchDateTime.getTime());
      
      console.log('Checking booking:', {
        uid: booking.uid,
        start: booking.start,
        timeDiff: timeDiff / (1000 * 60) // minutes
      });
      
      // If within 2 hours (accounting for timezone differences)
      if (timeDiff < 2 * 60 * 60 * 1000 && timeDiff < smallestDiff) {
        bestMatch = booking;
        smallestDiff = timeDiff;
      }
    }
    
    if (bestMatch) {
      console.log('Found best match:', bestMatch.uid, 'with diff:', smallestDiff / (1000 * 60), 'minutes');
      return bestMatch;
    }
    
    console.log('No close match found, returning first active booking');
    return bookings.length > 0 ? bookings[0] : null;
    
  } catch (error) {
    console.error('Error in findBestMatch:', error);
    return bookings.length > 0 ? bookings[0] : null;
  }
}

// ---- UPDATED: Check Availability with Chrono ----
async function handleCheckAvailability(args) {
  const { date, start_time, end_time, timezone = "America/Denver" } = args;
  
  console.log('Checking availability for:', date, start_time, timezone);
  
  try {
    // Parse the date with chrono
    const dateObj = chrono.parseDate(date, new Date(), { timezone });
    
    if (!dateObj) {
      return {
        available: false,
        availability_details: {
          available: false,
          message: "I couldn't understand that date. Please try something like 'July 8th' or 'tomorrow'."
        },
        date_checked: date
      };
    }
    
    // Check business hours
    const businessHours = getBusinessHoursAvailability(dateObj, start_time, end_time);
    
    if (!businessHours.available) {
      return {
        available: false,
        availability_details: businessHours,
        date_checked: date
      };
    }
    
    // Check for existing bookings
    const startOfDay = new Date(dateObj);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateObj);
    endOfDay.setHours(23, 59, 59, 999);
    
    const response = await fetch(`https://api.cal.com/v2/bookings?start=${startOfDay.toISOString()}&end=${endOfDay.toISOString()}`, {
      method: 'GET',
      headers: {
        'cal-api-version': '2024-08-13',
        'Authorization': `Bearer ${process.env.CAL_API_KEY}`
      }
    });
    
    let bookingConflicts = 0;
    if (response.ok) {
      const bookingsData = await response.json();
      const dayBookings = bookingsData.data || [];
      bookingConflicts = dayBookings.filter(booking => booking.status === 'accepted').length;
      console.log(`Found ${bookingConflicts} existing bookings on ${date}`);
    }
    
    const availabilityInfo = {
      ...businessHours,
      existing_bookings: bookingConflicts,
      message: bookingConflicts > 0 
        ? `${businessHours.message}. We have ${bookingConflicts} appointment(s) already booked for this day.`
        : `${businessHours.message}. This day looks wide open!`
    };
    
    return {
      available: true,
      availability_details: availabilityInfo,
      date_checked: date
    };
    
  } catch (error) {
    console.error('Check availability error:', error);
    
    return {
      available: false,
      availability_details: {
        available: false,
        message: "I'm having trouble checking that date. Please try again."
      },
      date_checked: date
    };
  }
}

// ---- UPDATED: Business Hours with Date Object ----
function getBusinessHoursAvailability(dateObj, requestedStart, requestedEnd) {
  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
  
  console.log('Date:', dateObj.toDateString(), 'Day of week:', dayOfWeek);
  
  if (dayOfWeek === 0) { // Sunday
    return {
      available: false,
      message: "We're closed on Sundays",
      business_hours: "Closed"
    };
  }
  
  let hours = '';
  if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday-Friday
    hours = "9:00 AM to 5:00 PM";
  } else if (dayOfWeek === 6) { // Saturday
    hours = "9:00 AM to 4:00 PM";
  }
  
  return {
    available: true,
    message: `Available during business hours: ${hours}`,
    business_hours: hours,
    date: dateObj.toDateString()
  };
}

// ---- UPDATED: Book Appointment with Chrono ----
async function handleBookAppointment(args) {
  const { 
    name, 
    email, 
    phone, 
    appointment_date, 
    appointment_time, 
    reason,
    notes,
    start 
  } = args;

  console.log('[book_appointment] Booking appointment for:', name, email);

  // Validate required fields
  if (!name || !email || (!start && (!appointment_date || !appointment_time))) {
    return {
      success: false,
      error: "I need the patient's name, email, and either an ISO start time or both appointment date and time."
    };
  }

  let appointmentDateTime;
  
  try {
    if (start) {
      // Direct ISO datetime provided
      appointmentDateTime = start;
      console.log('[book_appointment] Using ISO start:', appointmentDateTime);
    } else {
      // Combine date and time strings and let chrono parse it
      const combinedDateTime = `${appointment_date} ${appointment_time}`;
      appointmentDateTime = parseToUTC(combinedDateTime);
      console.log('[book_appointment] Parsed with chrono:', combinedDateTime, '→', appointmentDateTime);
    }

    const bookingData = {
      start: appointmentDateTime,
      eventTypeId: 2694982,
      attendee: {
        name: name,
        email: email,
        timeZone: "America/Denver"
      },
      metadata: {
        phone: phone || '',
        reason: reason || 'General appointment',
        notes: notes || ''
      }
    };

    const response = await fetch('https://api.cal.com/v2/bookings', {
      method: 'POST',
      headers: {
        'cal-api-version': '2024-08-13',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CAL_API_KEY}`
      },
      body: JSON.stringify(bookingData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Cal.com booking error:', response.status, errorData);
      
      if (response.status === 400) {
        return {
          success: false,
          error: "That time slot is not available. Please choose a different time during our business hours."
        };
      }
      if (response.status === 409) {
        return {
          success: false,
          error: "That time slot is already booked. Please choose another time."
        };
      }
      
      throw new Error(`Cal.com API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      const booking = result.data;
      const confirmationTime = new Date(booking.start).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/Denver'
      });
      
      return {
        success: true,
        booking_id: booking.uid,
        confirmation_message: `Perfect! I've successfully booked your appointment for ${confirmationTime}. Your confirmation number is ${booking.uid}. You'll receive an email confirmation shortly.`,
        appointment_details: {
          date_time: confirmationTime,
          patient_name: name,
          patient_email: email,
          booking_id: booking.uid
        }
      };
    } else {
      return {
        success: false,
        error: "There was an issue booking your appointment. Please try again or call our office directly."
      };
    }
    
  } catch (error) {
    console.error('Book appointment error:', error);
    return {
      success: false,
      error: "I'm having trouble parsing that date and time. Could you try a different format like 'July 8th at 3 PM'?"
    };
  }
}

// ---- UNCHANGED: Cancel Booking ----
async function handleCancelBooking(args) {
  const { booking_uid, cancellation_reason = "Cancelled by patient" } = args;
  
  console.log('Cancelling booking:', args);
  
  // Validate required fields
  if (!booking_uid) {
    return {
      success: false,
      error: "Booking ID is required",
      message: "I need your booking ID to cancel the appointment. Can you provide that?"
    };
  }

  try {
    const response = await fetch(`https://api.cal.com/v2/bookings/${booking_uid}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CAL_API_KEY}`,
        'Content-Type': 'application/json',
        'cal-api-version': '2024-08-13'
      },
      body: JSON.stringify({
        cancellationReason: cancellation_reason
      })
    });

    console.log('Cal.com response status:', response.status);
    
    if (!response.ok) {
      console.error('Cal.com API error:', response.status);
      
      if (response.status === 404) {
        return {
          success: false,
          error: "Booking not found",
          message: "I couldn't find a booking with that ID. Can you double-check your booking number?"
        };
      }
      
      if (response.status === 400) {
        return {
          success: false,
          error: "Cannot cancel booking",
          message: "This appointment cannot be cancelled. It may have already been cancelled or completed."
        };
      }
      
      return {
        success: false,
        error: `Cal.com API error: ${response.status}`,
        message: "I'm having trouble with the booking system right now. Please try again in a moment."
      };
    }
    
    const result = await response.json();
    console.log('Cal.com response:', result);
    
    if (result.status === 'success') {
      // Get appointment details if available
      const appointmentInfo = result.data ? ` (Booking ID: ${result.data.uid || booking_uid})` : ` (Booking ID: ${booking_uid})`;
      
      return {
        success: true,
        message: `Your appointment has been successfully cancelled${appointmentInfo}. You should receive a cancellation confirmation email shortly.`,
        booking_details: result.data,
        cancellation_reason: cancellation_reason
      };
    } else {
      return {
        success: false,
        error: "Cancellation failed",
        message: "I'm having trouble cancelling your appointment right now. Please try again or contact our office directly."
      };
    }
    
  } catch (error) {
    console.error('Cancel booking error:', error);
    
    return {
      success: false,
      error: error.message,
      message: "I'm having trouble connecting to the booking system. Please try again in a few minutes or contact our office directly."
    };
  }
}

// ---- UNCHANGED: Get Tomorrow Appointments ----
async function handleGetTomorrowAppointments(args) {
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Start of tomorrow
    
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(tomorrow.getDate() + 1);
    dayAfter.setHours(0, 0, 0, 0); // Start of day after tomorrow
    
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    console.log('Looking for appointments on:', tomorrowStr);
    
    const response = await fetch('https://api.cal.com/v2/bookings', {
      headers: {
        'Authorization': `Bearer ${process.env.CAL_API_KEY}`,
        'Content-Type': 'application/json',
        'cal-api-version': '2024-08-13'
      }
    });
    
    const result = await response.json();
    
    // Filter for tomorrow's appointments only
    const tomorrowAppointments = result.data?.filter(booking => {
      const bookingDate = new Date(booking.start);
      return bookingDate >= tomorrow && bookingDate < dayAfter && booking.status === 'accepted';
    }) || [];
    
    return { success: true, appointments: tomorrowAppointments };
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return { success: false, error: "Could not fetch appointments" };
  }
}

// ---- UNCHANGED: Trigger Reminders ----
async function handleTriggerReminders(args) {
  try {
    // Get tomorrow's appointments
    const appointmentsResult = await handleGetTomorrowAppointments({});
    if (!appointmentsResult.success) {
      return { success: false, error: "Could not fetch appointments" };
    }

    const results = [];
    for (const appointment of appointmentsResult.appointments) {
      // Extract phone from metadata and convert to E.164
      let phone = appointment.metadata?.phone || appointment.attendees[0]?.phoneNumber;
      if (phone) {
        // Remove all non-digits and add +1
        phone = '+1' + phone.replace(/\D/g, '');
      }
      console.log('Calling phone:', phone);
      
      // Trigger Retell outbound call
      const callResult = await fetch('https://api.retellai.com/v2/create-phone-call', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RETELL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from_number: '+15056056546',
          to_number: phone,
          override_agent_id: 'agent_2647fcddc05b42bbf5096eeae3',
          retell_llm_dynamic_variables: {
  patient_name: appointment.attendees[0].name,
  appointment_date: new Date(appointment.start).toLocaleDateString(),
  appointment_time: new Date(appointment.start).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Denver'
  }),
  booking_uid: appointment.uid,
  current_date: new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Denver'
  })
}
        })
      });
      
      console.log('Call response status:', callResult.status);
      const responseText = await callResult.text();
      console.log('Call response text:', responseText.substring(0, 200));
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        result = { error: 'Invalid JSON response', responseText: responseText.substring(0, 100) };
      }
      
      results.push({ 
        patient: appointment.attendees[0].name, 
        phone: phone,
        status: callResult.status, 
        result: result 
      });
    }
    
    return { success: true, calls_triggered: results.length, results };
  } catch (error) {
    console.error('Trigger reminders error:', error);
    return { success: false, error: `Detailed error: ${error.message}` };
  }
}

// ---- UNCHANGED: Test Create Call ----
async function handleTestCreateCall(args) {
  try {
    const { phone_number, agent_id } = args;
    
    const response = await fetch('https://api.retellai.com/v2/create-phone-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RETELL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from_number: '+15056056546',
        to_number: phone_number,
        override_agent_id: agent_id || 'agent_2647fcddc05b42bbf5096eeae3'
      })
    });
    
    const result = await response.json();
    return { success: true, call_result: result };
  } catch (error) {
    console.error('Test call error:', error);
    return { success: false, error: error.message };
  }
}

function parseToUTC(dateTimeString, timezone = 'America/Denver') {
  console.log(`[parseToUTC] Parsing: "${dateTimeString}" in timezone: ${timezone}`);
  
  // Parse with chrono first
  const parsed = chrono.parseDate(dateTimeString, new Date());
  
  if (!parsed) {
    console.error(`[parseToUTC] Could not parse: ${dateTimeString}`);
    throw new Error(`Could not parse date/time: ${dateTimeString}`);
  }
  
  console.log(`[parseToUTC] Chrono parsed as: ${parsed.toISOString()}`);
  
  // Treat the parsed time as Mountain Time and convert to UTC
  // Mountain Time is UTC-6 in summer (MDT), UTC-7 in winter (MST)
  // For July, we're in MDT (UTC-6)
  const mountainOffset = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
  const utcTime = new Date(parsed.getTime() + mountainOffset);
  
  const utcString = utcTime.toISOString();
  console.log(`[parseToUTC] Final UTC result: ${utcString}`);
  return utcString;
}

async function authenticateGmail() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    null, // No private key needed
    ['https://www.googleapis.com/auth/gmail.send'],
    process.env.GMAIL_FROM_ADDRESS // The email to impersonate
  );

  return auth;
}

async function handleSendConfirmationEmail(args) {
  const { 
    email, 
    name, 
    appointment_date, 
    appointment_time, 
    business_name = "Crescent Family Dental",
    business_phone = "813-431-9146",
    business_address = "441 Cordova Lane, Santa Fe, New Mexico 87505",
    appointment_type = "appointment",
    additional_info = "",
    booking_id = ""
  } = args;

  console.log('[send_confirmation_email] Sending to:', email, name);

  // Validate required fields
  if (!email || !name || !appointment_date || !appointment_time) {
    return {
      success: false,
      error: "Missing required fields",
      message: "I need the patient's email, name, appointment date, and time to send a confirmation."
    };
  }

  try {
    const auth = await authenticateGmail();
    
    // Create email content
    const subject = `${appointment_type.charAt(0).toUpperCase() + appointment_type.slice(1)} Confirmation - ${appointment_date} at ${appointment_time}`;
    
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2c5aa0; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
        .appointment-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        .button { background: #2c5aa0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${business_name}</h1>
            <p>Appointment Confirmation</p>
        </div>
        
        <div class="content">
            <h2>Hello ${name}!</h2>
            <p>Your ${appointment_type} has been confirmed. We look forward to seeing you!</p>
            
            <div class="appointment-details">
                <h3>📅 Appointment Details</h3>
                <p><strong>Date:</strong> ${appointment_date}</p>
                <p><strong>Time:</strong> ${appointment_time}</p>
                <p><strong>Type:</strong> ${appointment_type.charAt(0).toUpperCase() + appointment_type.slice(1)}</p>
                ${booking_id ? `<p><strong>Confirmation #:</strong> ${booking_id}</p>` : ''}
            </div>
            
            <div class="appointment-details">
                <h3>📍 Location</h3>
                <p>${business_address}</p>
                <p><strong>Phone:</strong> ${business_phone}</p>
            </div>
            
            ${additional_info ? `
            <div class="appointment-details">
                <h3>ℹ️ Additional Information</h3>
                <p>${additional_info}</p>
            </div>
            ` : ''}
            
            <div class="appointment-details">
                <h3>📋 What to Bring</h3>
                <ul>
                    <li>Photo ID</li>
                    <li>Insurance card (if applicable)</li>
                    <li>List of current medications</li>
                    <li>Arrive 15 minutes early</li>
                </ul>
            </div>
            
            <p>Need to reschedule or have questions? Call us at ${business_phone}.</p>
        </div>
        
        <div class="footer">
            <p>${business_name} | ${business_phone}</p>
            <p>This is an automated confirmation. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>`;

    const textBody = `
${business_name} - Appointment Confirmation

Hello ${name}!

Your ${appointment_type} has been confirmed:

📅 Date: ${appointment_date}
🕐 Time: ${appointment_time}
${booking_id ? `🎫 Confirmation #: ${booking_id}` : ''}

📍 Location:
${business_address}
Phone: ${business_phone}

What to bring:
• Photo ID
• Insurance card (if applicable)  
• List of current medications
• Arrive 15 minutes early

${additional_info ? `\nAdditional Information:\n${additional_info}` : ''}

Need to reschedule? Call us at ${business_phone}.

Thank you!
${business_name}
`;

    // Create email message
    const message = [
      `To: ${email}`,
      `From: ${process.env.GMAIL_FROM_ADDRESS || 'noreply@crescentfamilydental.com'}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: multipart/alternative; boundary="boundary"',
      '',
      '--boundary',
      'Content-Type: text/plain; charset=UTF-8',
      '',
      textBody,
      '',
      '--boundary',
      'Content-Type: text/html; charset=UTF-8',
      '',
      htmlBody,
      '',
      '--boundary--'
    ].join('\n');

    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Send email
    const response = await gmail.users.messages.send({
      auth: auth,
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    console.log('[send_confirmation_email] Email sent successfully:', response.data.id);

    return {
      success: true,
      message: `Confirmation email sent successfully to ${email}.`,
      email_id: response.data.id,
      email_sent_to: email,
      subject: subject
    };

  } catch (error) {
    console.error('[send_confirmation_email] Error:', error);
    
    return {
      success: false,
      error: error.message,
      message: "I'm having trouble sending the confirmation email right now. Your appointment is still confirmed."
    };
  }
}
// Force rebuild
