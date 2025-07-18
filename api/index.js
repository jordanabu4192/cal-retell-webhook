const dateFnsTz = require('date-fns-tz');
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

async function handleRescheduleBooking(args) {
  const { booking_uid, appointment_date, appointment_time, reason, rescheduled_by, timezone = args.business_timezone || "America/Denver" } = args;
  
  console.log('Rescheduling booking:', booking_uid, 'to:', appointment_date, appointment_time, 'in timezone:', timezone);
  
  if (!booking_uid || !appointment_date || !appointment_time) {
    return { success: false, error: "Booking ID and a new date and time are required." };
  }
  
  try {
    const utcTime = convertToUTC(appointment_date, appointment_time, timezone);
    
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
      console.error('Cal.com reschedule error:', response.status, errorData);
      return { success: false, error: "Failed to reschedule.", message: "I couldn't reschedule that appointment. The time slot may be unavailable." };
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      const booking = result.data;
      const newDateTime = new Date(booking.start).toLocaleString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit', timeZone: timezone
      });
      return { success: true, message: `Perfect! I've successfully rescheduled your booking to ${newDateTime}.` };
    } else {
      return { success: false, error: "Rescheduling failed.", message: "I encountered an issue while rescheduling." };
    }
  } catch (error) {
    console.error('Reschedule error:', error);
    return { success: false, error: error.message, message: "I'm having trouble connecting to the booking system." };
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
  const { appointment_date, appointment_time, timezone = args.business_timezone || "America/Denver" } = args;
  
  console.log('[check_availability] Called with:', { appointment_date, appointment_time, timezone });

  if (!appointment_date || !appointment_time) {
      return { available: false, availability_details: { available: false, message: "A full date and time are required to check availability." }};
  }

  try {
    // Use our reliable helper to get the correct UTC time, then create a Date object from it.
    const utcTimeString = convertToUTC(appointment_date, appointment_time, timezone);
    const dateObj = new Date(utcTimeString);

    // Call the timezone-aware helper function
    const businessHours = getBusinessHoursAvailability(dateObj, timezone);
    if (!businessHours.available) {
      return { available: false, availability_details: businessHours };
    }

    const startOfDay = new Date(dateObj);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(dateObj);
    endOfDay.setUTCHours(23, 59, 59, 999);
    
    const slotsUrl = new URL('https://api.cal.com/v1/slots');
    slotsUrl.searchParams.append('apiKey', process.env.CAL_API_KEY);
    slotsUrl.searchParams.append('eventTypeId', '2694982');
    slotsUrl.searchParams.append('startTime', startOfDay.toISOString());
    slotsUrl.searchParams.append('endTime', endOfDay.toISOString());
    slotsUrl.searchParams.append('timeZone', timezone);
      
    const response = await fetch(slotsUrl.toString());
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Cal.com slots API error: ${response.status}`, errorText);
        throw new Error(`Cal.com slots API error: ${response.status}`);
    }
      
    const slotsData = await response.json();
    const dateString = dateObj.toISOString().split('T')[0];
    const availableSlots = slotsData.slots?.[dateString] || [];
    
    console.log(`Found ${availableSlots.length} available slots for ${dateString}`);
      
    if (availableSlots.length > 0) {
        const availableTimes = availableSlots.map(slot => new Date(slot.time).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: timezone }));
        const dayName = new Date(dateObj).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: timezone });
        let message = `Great! We have ${availableSlots.length} available time slots on ${dayName}. Some options include: ${availableTimes.slice(0,3).join(', ')}.`;
        
        return { available: true, availability_details: { available: true, message: message }};
    } else {
        const dayName = new Date(dateObj).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: timezone });
        return { available: false, availability_details: { available: false, message: `We don't have any available appointments on ${dayName}.` }};
    }
  } catch (error) {
    console.error('Check availability error:', error);
    return { available: false, availability_details: { available: false, message: "I'm having trouble checking that date." } };
  }
}

// ---- UPDATED: Business Hours with Date Object ----
function getBusinessHoursAvailability(dateObj, timezone) {
  // Get the day of the week (0=Sun, 6=Sat) IN THE SPECIFIED TIMEZONE.
  const dayOfWeek = parseInt(new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'numeric'
  }).format(dateObj)) % 7;

  console.log('Date:', dateObj.toLocaleString('en-US', { timeZone: timezone }), 'Day of week:', dayOfWeek);
  
  if (dayOfWeek === 0) { // Sunday
    return { available: false, message: "We're closed on Sundays.", business_hours: "Closed" };
  }
  
  let hours = '';
  if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday-Friday
    hours = "9:00 AM to 5:00 PM";
  } else if (dayOfWeek === 6) { // Saturday
    hours = "9:00 AM to 4:00 PM";
  }
  
  return { available: true, message: `Available during business hours: ${hours}`, business_hours: hours };
}

async function handleBookAppointment(args, callId = 'unknown') {
  const { name, email, phone, appointment_date, appointment_time, reason, notes, timezone = args.business_timezone || "America/Denver" } = args;

  console.log('[book_appointment] Called with:', { args, callId, timezone });

  if (!name || !email || !appointment_date || !appointment_time) {
    return { success: false, error: "Name, email, appointment date, and time are required." };
  }

  try {
    const utcTime = convertToUTC(appointment_date, appointment_time, timezone);

    const bookingData = {
      start: utcTime,
      eventTypeId: 2694982,
      attendee: { name, email, timeZone: timezone },
      metadata: { phone: phone || '', reason: reason || '', notes: notes || '' }
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
        throw new Error(`Cal.com booking error: ${response.status}`);
    }

    const result = await response.json();

    if (result.status === 'success') {
      const booking = result.data;
      const confirmationTime = new Date(booking.start).toLocaleString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit', timeZone: timezone
      });

      await createOrUpdateContact({ name, email, phone, source: "AI Appointment Bot", notes: reason || '' });

      return {
        success: true,
        booking_id: booking.uid,
        confirmation_message: `Perfect! I've booked your appointment for ${confirmationTime}. Your confirmation number is ${booking.uid}.`
      };
    } else {
      return { success: false, error: "Booking failed.", message: "I couldn't book the appointment. Please try again." };
    }
  } catch (error) {
    console.error('Book appointment error:', error);
    return { success: false, error: error.message, message: "I'm having trouble booking that appointment right now." };
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

function convertToUTC(date, time, timezone) {
  const localDateTimeString = `${date}T${time}:00`;
  const utcDate = dateFnsTz.zonedTimeToUtc(localDateTimeString, timezone); 
  
  console.log(`[convertToUTC] Converted ${localDateTimeString} in ${timezone} to UTC: ${utcDate.toISOString()}`);
  
  return utcDate.toISOString();
}
