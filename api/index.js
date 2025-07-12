const chrono = require('chrono-node');
const { google } = require('googleapis');
const sgMail = require('@sendgrid/mail');

const activeSessions = new Map();

// Helper function to clean up old sessions (optional)
function cleanupOldSessions() {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [callId, session] of activeSessions.entries()) {
    if (session.timestamp < oneHourAgo) {
      activeSessions.delete(callId);
    }
  }
}

// Clean up old sessions every 30 minutes
setInterval(cleanupOldSessions, 30 * 60 * 1000);
const {
  handleCalculateSolarSavings,
  handleScoreSolarLead,
  handleBookSolarConsultation,
  handleSendSolarInfo,
  handleCalculateFinancingOptions,
  handleLookupLocalIncentives
} = require('./lead-qualification');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Retell-Signature');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
  // Booking management interface
  if (req.url?.includes('/manage-bookings') || req.query?.path === 'manage-bookings') {
    return res.setHeader('Content-Type', 'text/html').send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Booking Management</title>
          <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .edit-btn { background: #007cba; color: white; padding: 5px 10px; border: none; cursor: pointer; }
              .update-form { margin: 20px 0; padding: 20px; border: 1px solid #ccc; }
          </style>
      </head>
      <body>
          <h1>Booking Management</h1>
          
          <div class="update-form">
              <h3>Update Booking Metadata</h3>
              <input type="text" id="bookingId" placeholder="Booking ID" style="width: 300px; margin: 5px;">
              <input type="text" id="newPhone" placeholder="New Phone Number" style="width: 200px; margin: 5px;">
              <input type="text" id="newReason" placeholder="New Reason" style="width: 200px; margin: 5px;">
              <button onclick="updateBooking()" class="edit-btn">Update Booking</button>
          </div>
          
          <button onclick="loadBookings()" class="edit-btn">Load All Bookings</button>
          
          <div id="bookings"></div>

          <script>
              async function loadBookings() {
                  try {
                      const response = await fetch('/api', {
                          method: 'POST',
                          headers: {'Content-Type': 'application/json'},
                          body: JSON.stringify({name: 'get_all_bookings', args: {}})
                      });
                      const data = await response.json();
                      
                      if (data.success) {
                          let html = '<table><tr><th>Booking ID</th><th>Patient</th><th>Email</th><th>Phone</th><th>Time</th><th>Reason</th><th>Status</th></tr>';
                          data.bookings.forEach(booking => {
                              html += \`<tr>
                                  <td>\${booking.booking_id}</td>
                                  <td>\${booking.patient_name}</td>
                                  <td>\${booking.patient_email}</td>
                                  <td>\${booking.phone}</td>
                                  <td>\${booking.appointment_time}</td>
                                  <td>\${booking.reason}</td>
                                  <td>\${booking.status}</td>
                              </tr>\`;
                          });
                          html += '</table>';
                          document.getElementById('bookings').innerHTML = html;
                      }
                  } catch (error) {
                      alert('Error loading bookings: ' + error.message);
                  }
              }
              
              async function updateBooking() {
                  const bookingId = document.getElementById('bookingId').value;
                  const newPhone = document.getElementById('newPhone').value;
                  const newReason = document.getElementById('newReason').value;
                  
                  try {
                      const response = await fetch('/api', {
                          method: 'POST',
                          headers: {'Content-Type': 'application/json'},
                          body: JSON.stringify({
                              name: 'update_booking_metadata',
                              args: {
                                  booking_uid: bookingId,
                                  new_phone: newPhone,
                                  new_reason: newReason
                              }
                          })
                      });
                      const data = await response.json();
                      
                      if (data.success) {
                          alert('Booking updated successfully! New ID: ' + data.new_booking_id);
                          loadBookings();
                      } else {
                          alert('Error: ' + data.error);
                      }
                  } catch (error) {
                      alert('Error updating booking: ' + error.message);
                  }
              }
          </script>
      </body>
      </html>
    `);
  }
  
  // Default GET response
  return res.json({ message: 'Cal.com Retell webhook server is running!' });
}
  
if (req.method === 'POST') {
    try {
        // ▶️  Log entire incoming payload
        console.log('▶️ RECEIVED WEBHOOK:', JSON.stringify(req.body, null, 2));
        console.log('Call ID:', req.body.call_id);

        // ▶️  Parse the tool call inputs
        const name = req.body.name;
        const args = req.body.arguments || req.body.args;
        console.log('▶️ PARSED INPUTS → name:', name, ', args:', JSON.stringify(args, null, 2));

if (req.body.event) {
      const { event, call_id, data } = req.body;
      
      console.log(`System event: ${event} for call: ${call_id}`);
      
      // Just acknowledge system events - don't try to process them as functions
      switch (event) {
        case 'call_started':
          console.log('Call started:', call_id);
          return res.json({ success: true, message: 'Call started event received' });
          
        case 'call_ended':
          console.log('Call ended:', call_id);
          return res.json({ success: true, message: 'Call ended event received' });
          
        case 'call_analyzed':
          console.log('Call analyzed:', call_id);
          return res.json({ success: true, message: 'Call analyzed event received' });
          
        default:
          console.log('Unknown system event:', event);
          return res.json({ success: true, message: 'System event received' });
      }
    }
      
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
  const result = await handleCheckAvailability(req.body, req.body.call_id || 'unknown');
  return res.json(result);
}

if (req.body.name !== undefined && req.body.email !== undefined && req.body.preferred_time !== undefined) {
  // This is a book_solar_consultation call
  const result = await handleBookSolarConsultation(req.body, req.body.call_id || 'unknown');
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
  const result = await handleCheckAvailability(args, req.body.call_id);
  return res.json(result);
}

      if (name === 'book_appointment') {
  const result = await handleBookAppointment(args, req.body.call_id);
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

if (name === 'get_all_bookings') {
  const result = await handleGetAllBookings(args);
  return res.json(result);
}

if (name === 'update_booking_metadata') {
  const result = await handleUpdateBookingMetadata(args);
  return res.json(result);
}

if (name === 'send_confirmation_email') {
  const result = await handleSendConfirmationEmail(args);
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

function parseToMountainTime(dateTimeString, timezone = 'America/Denver') {
  const parsed = chrono.parseDate(dateTimeString, new Date(), { timezone: timezone });
  
  if (!parsed) {
    throw new Error(`Could not parse date/time: ${dateTimeString}`);
  }
  
  return parsed;
}

// ---- UPDATED: Reschedule with Chrono ----
async function handleRescheduleBooking(args) {
  const { booking_uid, new_start_time, rescheduled_by, reason, timezone = args.business_timezone || "America/Denver" } = args;
  
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
    const utcTime = parseToUTC(new_start_time, timezone);
    
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
        timeZone: timezone
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

async function handleFindBookingByDate(args) {
  const { email, appointment_date, appointment_time, timezone = args.business_timezone || "America/Denver" } = args;

  console.log('Finding booking for:', email, appointment_date, appointment_time, 'in timezone:', timezone);

  if (!email || !appointment_date || !appointment_time) {
    return { success: false, error: "Email, date, and time are required." };
  }

  try {
    const url = `https://api.cal.com/v2/bookings?email=${encodeURIComponent(email)}&status=upcoming`;
    console.log(`Fetching from Cal.com with URL: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'cal-api-version': '2024-08-13', 'Authorization': `Bearer ${process.env.CAL_API_KEY}` }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cal.com API error:', response.status, errorText);
      throw new Error(`Cal.com API error: ${response.status}`);
    }

    const result = await response.json();
    const upcomingBookings = result.data || [];

    console.log(`Found ${upcomingBookings.length} upcoming bookings.`);

    if (upcomingBookings.length === 0) {
      return { success: false, error: "No upcoming bookings found", message: "I couldn't find any upcoming appointments for that email address." };
    }

    const matchedBooking = findBestMatch(upcomingBookings, appointment_date, appointment_time, timezone);

    if (matchedBooking) {
      const bookingDateTime = new Date(matchedBooking.start).toLocaleString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit', timeZone: timezone
      });
      return { success: true, message: `Found your appointment for ${bookingDateTime}.`, booking_uid: matchedBooking.uid };
    } else {
       return { success: false, error: "No matching appointment found for that specific date and time.", message: `I see you have an upcoming appointment, but not for the date and time you mentioned. Please check and try again.` };
    }
  } catch (error) {
    console.error('Find booking error:', error);
    return { success: false, error: error.message, message: "I'm having trouble with the booking system right now." };
  }
}

function findBestMatch(bookings, dateStr, timeStr, timezone = 'America/Denver') {
  console.log('Searching for appointment on', dateStr, 'at', timeStr, 'in timezone:', timezone);

  function getLocalDate(date, tz) {
    return new Date(date).toLocaleDateString('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  try {
    const searchDate = chrono.parseDate(`${dateStr} ${timeStr}`, { timezone: timezone });
    if (!searchDate) {
      console.error("Chrono could not parse the user's date/time input.");
      return null;
    }
    const targetLocalDate = getLocalDate(searchDate, timezone);
    console.log(`Targeting local date (YYYY-MM-DD): ${targetLocalDate}`);

    for (const booking of bookings) {
      const bookingLocalDate = getLocalDate(booking.start, timezone);
      console.log(`Comparing with Booking UID ${booking.uid} on local date: ${bookingLocalDate}`);

      if (bookingLocalDate === targetLocalDate) {
        console.log(`✅ Found matching booking: ${booking.uid}`);
        return booking;
      }
    }

    console.log('No booking found with a matching local date.');
    return null;

  } catch (error) {
    console.error('Error in findBestMatch:', error);
    return null;
  }
}

async function handleCheckAvailability(args, callId = 'unknown') {
  const { date, start_time, end_time, timezone = args.business_timezone || "America/Denver" } = args;
  
  console.log('[check_availability] Called with:', { date, timezone });

  try {
    // --- START OF THE FIX ---
    // 1. Get the current moment as a string in the business's local timezone.
    const nowInLocalTimezoneStr = new Date().toLocaleString('en-US', { timeZone: timezone });
    
    // 2. Create a new Date object from that local time string. This is our reliable reference.
    const refDate = new Date(nowInLocalTimezoneStr);
    
    // 3. Pass the reliable reference date to Chrono.
    const dateObj = chrono.parseDate(date, refDate, { timezone: timezone });
    // --- END OF THE FIX ---
    
    if (!dateObj) {
      return { available: false, availability_details: { available: false, message: "I couldn't understand that date. Please try something like 'tomorrow'." }};
    }
    
    const businessHours = getBusinessHoursAvailability(dateObj, start_time, end_time);
    if (!businessHours.available) {
      return { available: false, availability_details: businessHours };
    }
    
    const startOfDay = new Date(dateObj);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateObj);
    endOfDay.setHours(23, 59, 59, 999);
    
    const slotsUrl = new URL('https://api.cal.com/v1/slots');
    slotsUrl.searchParams.append('apiKey', process.env.CAL_API_KEY);
    slotsUrl.searchParams.append('eventTypeId', '2694982');
    slotsUrl.searchParams.append('startTime', startOfDay.toISOString());
    slotsUrl.searchParams.append('endTime', endOfDay.toISOString());
    slotsUrl.searchParams.append('timeZone', timezone);
      
    const response = await fetch(slotsUrl.toString());
    
    if (!response.ok) {
        throw new Error(`Cal.com slots API error: ${response.status}`);
    }
      
    const slotsData = await response.json();
    const dateString = dateObj.toISOString().split('T')[0];
    const availableSlots = slotsData.slots?.[dateString] || [];
    
    console.log(`Found ${availableSlots.length} available slots for ${dateString}`);
      
    if (availableSlots.length > 0) {
        const availableTimes = availableSlots.map(slot => new Date(slot.time).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: timezone }));
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: timezone });
        let message = `Great! We have ${availableSlots.length} available time slots on ${dayName}. Some options include: ${availableTimes.slice(0,3).join(', ')}.`;

        const normalizedDateString = dateObj.toISOString().split('T')[0];
        activeSessions.set(callId, {
            checkedDate: date,
            originalCheckedDate: date,
            parsedDate: normalizedDateString,
            parsedDateObj: dateObj, 
            availableTimes: availableTimes,
            availableSlots: availableSlots,
            timestamp: Date.now()
        });
        
        return { available: true, availability_details: { available: true, message: message }, date_checked: date, exact_booking_date: date };
    } else {
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: timezone });
        return { available: false, availability_details: { available: false, message: `We don't have any available appointments on ${dayName}.` }};
    }
  } catch (error) {
    console.error('Check availability error:', error);
    return { available: false, availability_details: { available: false, message: "I'm having trouble checking that date." } };
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

async function handleBookAppointment(args, callId = 'unknown') {
  const { name, email, phone, appointment_date, appointment_time, reason, notes, start, timezone = args.business_timezone || "America/Denver" } = args;

  console.log('[book_appointment] Called with:', {
    args: args,
    callId: callId,
    timezone: timezone
  });

  // Validate required fields
  if (!name || !email || (!start && (!appointment_date || !appointment_time))) {
    return {
      success: false,
      error: "I need the patient's name, email, and either a specific start time or both an appointment date and time."
    };
  }

  try {
    let appointmentDateTime;

    // This simplified block correctly handles time by relying on your robust parseToUTC function.
    // The complex and buggy fallback logic has been removed.
    if (start) {
      appointmentDateTime = start;
      console.log('[book_appointment] Using provided ISO start time:', appointmentDateTime);
    } else {
      const combinedDateTime = `${appointment_date} ${appointment_time}`;
      appointmentDateTime = parseToUTC(combinedDateTime, timezone);
      console.log('[book_appointment] Parsed date and time to UTC:', appointmentDateTime);
    }

    const bookingData = {
      start: appointmentDateTime,
      eventTypeId: 2694982, // Make sure this is your correct Event Type ID from Cal.com
      attendee: {
        name: name,
        email: email,
        timeZone: timezone
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
      
      if (response.status === 400 || response.status === 409) {
        return { success: false, error: "That time slot is not available or is already booked. Please try checking for availability first." };
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
        timeZone: timezone
      });

      console.log('[HubSpot] Creating contact for:', email);
      await createOrUpdateContact({ name, email, phone, source: "AI Appointment Bot", notes: reason || '' });

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
      return { success: false, error: "There was an issue booking your appointment. Please try again." };
    }

  } catch (error) {
    console.error('Book appointment error:', error);
    if (error.message && error.message.includes('Could not parse date/time')) {
      return { success: false, error: `I couldn't understand the date "${appointment_date}" with time "${appointment_time}". Please try a format like "July 8th at 3 PM".` };
    }
    return { success: false, error: "I'm having trouble booking that appointment. Please try again or call our office directly." };
  }
}

async function handleCancelBooking(args) {
  const { booking_uid, cancellation_reason = "Cancelled by patient", timezone = args.business_timezone || "America/Denver" } = args;
  
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

// ---- AMENDED: Trigger Reminders ----
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
      
      // Calculate time-of-day greeting
      const nowInSF = new Date().toLocaleString('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: timezone });
      const currentHourSF = parseInt(nowInSF.split(':')[0]);
      
      let timeOfDayGreeting;
      if (currentHourSF >= 5 && currentHourSF < 12) {
        timeOfDayGreeting = "Good morning";
      } else if (currentHourSF >= 12 && currentHourSF < 17) {
        timeOfDayGreeting = "Good afternoon";
      } else {
        timeOfDayGreeting = "Hello"; // Or "Good evening" if you want a specific evening greeting
      }

      // Get appointment day of week
      const appointmentDayOfWeek = new Date(appointment.start).toLocaleDateString('en-US', { 
        weekday: 'long', 
        timeZone: timezone 
      });
      
      const appointmentStart = new Date(appointment.start);
      const appointmentHour = parseInt(appointmentStart.toLocaleTimeString('en-US', {
        hour: 'numeric',
        hourCycle: 'h23',
        timeZone: timezone
      }).split(':')[0]);

      let appointmentTimeOfDay;
      if (appointmentHour >= 5 && appointmentHour < 12) {
        appointmentTimeOfDay = "morning";
      } else if (appointmentHour >= 12 && appointmentHour < 17) { // 12 PM (noon) to 4:59 PM
        appointmentTimeOfDay = "afternoon";
      } else if (appointmentHour >= 17 && appointmentHour < 22) { // 5 PM to 9:59 PM
        appointmentTimeOfDay = "evening";
      } else { // 10 PM to 4:59 AM
        appointmentTimeOfDay = "late night"; // Or just "tonight" / "" depending on preference
      }

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
            patient_first_name: appointment.attendees[0].name.split(' ')[0], 
            appointment_date: new Date(appointment.start).toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric',
              timeZone: timezone 
            }), // Formatted for AI prompt
            appointment_day_of_week: appointmentDayOfWeek, // New variable
            appointment_time: new Date(appointment.start).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              timeZone: timezone
            }),
            booking_uid: appointment.uid,
            current_date: new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric', 
              month: 'long',
              day: 'numeric',
              timeZone: timezone
            }),
            time_of_day_greeting: timeOfDayGreeting // NEW: Pass the greeting
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
  console.log(`[parseToUTC] Parsing absolute date: "${dateTimeString}" with timezone: ${timezone}`);
  
  // The LLM now sends an absolute date like "July 12 2025 9 AM",
  // so Chrono can parse it reliably with the timezone hint.
  const parsedDate = chrono.parseDate(dateTimeString, undefined, { timezone: timezone });
  
  if (!parsedDate) {
    console.error(`[parseToUTC] Could not parse absolute date: ${dateTimeString}`);
    throw new Error(`Could not parse date/time: ${dateTimeString}`);
  }

  const utcString = parsedDate.toISOString();
  console.log(`[parseToUTC] Converted to UTC: ${utcString}`);
  return utcString;
}
  
  // 3. Convert the correctly parsed date to a UTC ISO string.
  const utcString = parsedDate.toISOString();
  console.log(`[parseToUTC] Correctly converted "${dateTimeString}" to UTC: ${utcString}`);
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

// Replace the entire handleSendConfirmationEmail function with this:
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
    // Set SendGrid API key
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
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
    const msg = {
      to: email,
      from: process.env.FROM_EMAIL_ADDRESS || 'noreply@rarifiedsolutions.com',
      subject: subject,
      text: textBody,
      html: htmlBody,
    };

    // Send email
    const response = await sgMail.send(msg);

    console.log('[send_confirmation_email] Email sent successfully');

    return {
      success: true,
      message: `Confirmation email sent successfully to ${email}.`,
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

async function handleGetAllBookings(args) {
  try {
    const response = await fetch('https://api.cal.com/v2/bookings', {
      headers: {
        'Authorization': `Bearer ${process.env.CAL_API_KEY}`,
        'Content-Type': 'application/json',
        'cal-api-version': '2024-08-13'
      }
    });
    
    const result = await response.json();
    
    // Format the data to show metadata clearly
    const formattedBookings = result.data?.map(booking => ({
      booking_id: booking.uid,
      patient_name: booking.attendees[0]?.name,
      patient_email: booking.attendees[0]?.email,
      appointment_time: new Date(booking.start).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: timezone
      }),
      phone: booking.metadata?.phone || 'Not provided',
      reason: booking.metadata?.reason || 'Not specified',
      status: booking.status
    })) || [];
    
    return {
      success: true,
      bookings: formattedBookings,
      total: formattedBookings.length
    };
  } catch (error) {
    console.error('Get bookings error:', error);
    return { success: false, error: error.message };
  }
}

async function handleUpdateBookingMetadata(args) {
  const { booking_uid, new_phone, new_reason, new_notes, timezone = args.business_timezone || "America/Denver" } = args;
  
  try {
    // First, get the existing booking details
    const getResponse = await fetch(`https://api.cal.com/v2/bookings/${booking_uid}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CAL_API_KEY}`,
        'Content-Type': 'application/json',
        'cal-api-version': '2024-08-13'
      }
    });
    
    if (!getResponse.ok) {
      return { success: false, error: 'Could not find booking' };
    }
    
    const existingBooking = await getResponse.json();
    const booking = existingBooking.data;
    
    // Cancel the old booking
    await fetch(`https://api.cal.com/v2/bookings/${booking_uid}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CAL_API_KEY}`,
        'Content-Type': 'application/json',
        'cal-api-version': '2024-08-13'
      },
      body: JSON.stringify({
        cancellationReason: "Updated booking information"
      })
    });
    
    // Create new booking with updated metadata
    const newBookingData = {
      start: booking.start,
      eventTypeId: booking.eventTypeId,
      attendee: {
        name: booking.attendees[0].name,
        email: booking.attendees[0].email,
        timeZone: "America/Denver"
      },
      metadata: {
        phone: new_phone || booking.metadata?.phone || '',
        reason: new_reason || booking.metadata?.reason || 'appointment',
        notes: new_notes || booking.metadata?.notes || ''
      }
    };
    
    const createResponse = await fetch('https://api.cal.com/v2/bookings', {
      method: 'POST',
      headers: {
        'cal-api-version': '2024-08-13',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CAL_API_KEY}`
      },
      body: JSON.stringify(newBookingData)
    });
    
    const result = await createResponse.json();
    
    if (result.status === 'success') {
      return {
        success: true,
        message: `Booking updated successfully. New booking ID: ${result.data.uid}`,
        old_booking_id: booking_uid,
        new_booking_id: result.data.uid,
        updated_metadata: newBookingData.metadata
      };
    } else {
      return {
        success: false,
        error: "Failed to create updated booking"
      };
    }
    
  } catch (error) {
    console.error('Update booking error:', error);
    return { success: false, error: error.message };
  }
}

async function createOrUpdateContact({ name, email, phone, source = "Voice AI Agent", notes = "" }) {
  try {
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          email: email,
          firstname: name,
          phone: phone,
          lifecyclestage: "lead",
          source: source,
          notes: notes
        }
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('HubSpot Error:', result);
      return { success: false, error: result };
    }

    console.log('[HubSpot] Contact created/updated:', result.id);
    return { success: true, contactId: result.id };
  } catch (error) {
    console.error('[HubSpot] API call failed:', error);
    return { success: false, error: error.message };
  }
}
