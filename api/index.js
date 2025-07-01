const { Retell } = require('retell-sdk');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Retell-Signature');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    return res.json({ message: 'Cal.com Retell webhook server is running!' });
  }
  
  if (req.method === 'POST') {
    try {
      console.log('Received request:', req.body);
      
      const { name, args } = req.body;
      
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
                                
      return res.status(400).json({ error: "Unknown function" });
      
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
  
  return res.status(405).json({ error: "Method not allowed" });
};

async function handleRescheduleBooking(args) {
  const { booking_uid, new_start_time, rescheduled_by, reason } = args;
  
  console.log('Rescheduling booking:', booking_uid, 'to:', new_start_time);
  
  if (!booking_uid) {
    return "I need your booking ID to reschedule. Can you provide that?";
  }
  
  if (!new_start_time) {
    return "I need to know what time you'd like to reschedule to. When works better for you?";
  }
  
  // Convert Mountain Time to UTC if needed
  let utcTime = new_start_time;
  
  // Check if the time looks like it might be in Mountain Time (not already UTC)
  const inputDate = new Date(new_start_time);
  const hour = inputDate.getUTCHours();
  
  // If the hour is between 9-17 (9 AM - 5 PM), likely Mountain Time that needs conversion
  if (hour >= 9 && hour <= 17) {
    console.log('Converting Mountain Time to UTC');
    // Add 6 hours for Mountain Daylight Time (MDT)
    const convertedDate = new Date(inputDate.getTime() + (6 * 60 * 60 * 1000));
    utcTime = convertedDate.toISOString();
    console.log('Original time:', new_start_time);
    console.log('Converted to UTC:', utcTime);
  }
  
  try {
    const response = await fetch(`https://api.cal.com/v2/bookings/${booking_uid}/reschedule`, {
      method: 'POST',
      headers: {
        'cal-api-version': '2024-08-13',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CAL_API_KEY}`
      },
      body: JSON.stringify({
        start: utcTime,
        rescheduledBy: rescheduled_by,
        reschedulingReason: reason || 'Rescheduled via voice assistant'
      })
    });
    
    if (!response.ok) {
      console.error('Cal.com API error:', response.status);
      
      if (response.status === 404) {
        return "I couldn't find a booking with that ID. Can you double-check your booking number?";
      }
      if (response.status === 400) {
        return "That time slot might not be available. Can you suggest another time?";
      }
      throw new Error(`Cal.com API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      const booking = result.data;
      // Convert back to Mountain Time for user-friendly response
      const newDateTime = new Date(booking.start).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/Denver'
      });
      
      return `Perfect! I've successfully rescheduled your booking to ${newDateTime}. Your booking ID is ${booking.uid}.`;
    } else {
      return "I encountered an issue while rescheduling your booking. Please try again.";
    }
    
  } catch (error) {
    console.error('Reschedule error:', error);
    return "I'm sorry, I'm having trouble connecting to the booking system right now. Please try again in a few minutes.";
  }
}

async function handleFindBookingByDate(args) {
  const { email, appointment_date, appointment_time } = args;
  
  console.log('Finding booking for:', email, appointment_date, appointment_time);
  
  try {
    // First, get all bookings for this email
    const response = await fetch(`https://api.cal.com/v2/bookings?email=${email}`, {
      method: 'GET',
      headers: {
        'cal-api-version': '2024-08-13',
        'Authorization': `Bearer ${process.env.CAL_API_KEY}`
      }
    });
    
    if (!response.ok) {
      console.error('Cal.com API error:', response.status);
      throw new Error(`Cal.com API error: ${response.status}`);
    }
    
    const result = await response.json();
    const bookings = result.data || [];
    
    console.log('Found bookings:', bookings.length);
    
    // Filter for active bookings only
    const activeBookings = bookings.filter(booking => 
      booking.status === 'accepted' && new Date(booking.start) > new Date()
    );
    
    console.log('Active future bookings:', activeBookings.length);
    
    // Try to match the date and time
    const matchedBooking = findBestMatch(activeBookings, appointment_date, appointment_time);
    
    if (matchedBooking) {
      const bookingDateTime = new Date(matchedBooking.start).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
      });
      
      return {
        booking_uid: matchedBooking.uid,
        booking_details: bookingDateTime
      };
    } else {
      return {
        error: "I couldn't find an appointment matching that date and time. Could you please double-check the details or provide your booking confirmation number?"
      };
    }
    
  } catch (error) {
    console.error('Find booking error:', error);
    return {
      error: "I'm having trouble finding your appointment. Please try again or contact our office directly."
    };
  }
}

function findBestMatch(bookings, dateStr, timeStr) {
  console.log('Searching for:', dateStr, timeStr);
  
  // Convert search terms to lowercase and extract key parts
  const searchDate = dateStr.toLowerCase().replace(/[^\w\s]/g, '');
  const searchTime = timeStr.toLowerCase().replace(/[^\w\s]/g, '');
  
  // Extract month and day from search
  const monthMap = {
    'january': 0, 'jan': 0, 'february': 1, 'feb': 1, 'march': 2, 'mar': 2,
    'april': 3, 'apr': 3, 'may': 4, 'june': 5, 'jun': 5,
    'july': 6, 'jul': 6, 'august': 7, 'aug': 7, 'september': 8, 'sep': 8,
    'october': 9, 'oct': 9, 'november': 10, 'nov': 10, 'december': 11, 'dec': 11
  };
  
  // Extract day number from search string
  const dayMatch = searchDate.match(/(\d+)/);
  const searchDay = dayMatch ? parseInt(dayMatch[1]) : null;
  
  // Extract month from search string
  let searchMonth = null;
  for (const [monthName, monthNum] of Object.entries(monthMap)) {
    if (searchDate.includes(monthName)) {
      searchMonth = monthNum;
      break;
    }
  }
  
// Extract hour from time string (improved)
let searchHour = null;
const timePattern = /^(\d+)/; // Match only the first number
const timeMatch = searchTime.match(timePattern);
if (timeMatch) {
  searchHour = parseInt(timeMatch[1]);
}
const isPM = searchTime.includes('pm');
  
  console.log('Parsed search:', { searchDay, searchMonth, searchHour, isPM });
  
  for (const booking of bookings) {
    const bookingDate = new Date(booking.start);
    const bookingDay = bookingDate.getDate();
    const bookingMonth = bookingDate.getMonth();
    const bookingHour = bookingDate.getHours();
    
    console.log('Checking booking:', {
      bookingDay,
      bookingMonth, 
      bookingHour,
      uid: booking.uid,
      start: booking.start
    });
    
    // Check if day and month match
    const dayMatch = searchDay === bookingDay;
    const monthMatch = searchMonth === bookingMonth;
    
    // Check if hour matches (convert PM if needed)
    let hourMatch = false;
    if (searchHour !== null) {
      let expectedHour = searchHour;
      if (isPM && searchHour !== 12) expectedHour += 12;
      if (!isPM && searchHour === 12) expectedHour = 0;
      
      // Allow for timezone differences (Mountain Time is UTC-6 or UTC-7)
      hourMatch = Math.abs(bookingHour - expectedHour) <= 8; // Flexible for timezone
    }
    
    console.log('Match results:', { dayMatch, monthMatch, hourMatch });
    
    if (dayMatch && monthMatch && hourMatch) {
      console.log('Found exact match:', booking.uid);
      return booking;
    }
  }
  
  console.log('No exact match found, returning first active booking');
  return bookings.length > 0 ? bookings[0] : null;
}
async function handleCheckAvailability(args) {
  const { date, start_time, end_time, timezone } = args;
  
  console.log('Checking availability for:', date, start_time, end_time, timezone);
  
  try {
    // Convert date to ISO format if needed
    let checkDate = date;
    if (!date.includes('-')) {
      // Convert "July 5th" to "2025-07-05" format
      checkDate = convertDateToISO(date);
    }
    
    // Get existing bookings for that date
    const startOfDay = `${checkDate}T00:00:00Z`;
    const endOfDay = `${checkDate}T23:59:59Z`;
    
    // For now, let's return a simplified response based on your working hours
    // We can enhance this later to check actual Cal.com availability
    const availability = getBusinessHoursAvailability(date, start_time, end_time);
    
    return {
      available: true,
      availability_details: availability,
      date_checked: date
    };
    
  } catch (error) {
    console.error('Check availability error:', error);
    return {
      available: false,
      error: "I'm having trouble checking availability right now. Please try again."
    };
  }
}

function convertDateToISO(dateStr) {
  // Simple conversion for common date formats
  const today = new Date();
  const year = today.getFullYear();
  
  // Extract month and day from strings like "July 5th"
  const months = {
    'january': '01', 'february': '02', 'march': '03', 'april': '04',
    'may': '05', 'june': '06', 'july': '07', 'august': '08',
    'september': '09', 'october': '10', 'november': '11', 'december': '12'
  };
  
  const dateStr_lower = dateStr.toLowerCase();
  let month = '';
  let day = '';
  
  // Find month
  for (const [monthName, monthNum] of Object.entries(months)) {
    if (dateStr_lower.includes(monthName)) {
      month = monthNum;
      break;
    }
  }
  
  // Find day
  const dayMatch = dateStr_lower.match(/(\d+)/);
  if (dayMatch) {
    day = dayMatch[1].padStart(2, '0');
  }
  
  return `${year}-${month}-${day}`;
}

function getBusinessHoursAvailability(date, requestedStart, requestedEnd) {
  // Your business hours: 9 AM - 5 PM Monday-Friday, 9 AM - 4 PM Saturday
  
  // Convert the date string to a proper Date object
  let dateObj;
  if (date.includes('-')) {
    // Already in ISO format like "2025-07-05"
    dateObj = new Date(date);
  } else {
    // Convert "July 5th" to a date
    const isoDate = convertDateToISO(date);
    dateObj = new Date(isoDate);
  }
  
  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
  
  console.log('Date:', date, 'Day of week:', dayOfWeek);
  
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
    date: date
  };
}
async function handleBookAppointment(args) {
  const { 
    name, 
    email, 
    phone, 
    appointment_date, 
    appointment_time, 
    reason,
    notes 
  } = args;
  
  console.log('Booking appointment for:', name, email, appointment_date, appointment_time);
  
  // Validate required fields
  if (!name || !email || !appointment_date || !appointment_time) {
    return {
      success: false,
      error: "I need the patient's name, email, appointment date, and time to book the appointment."
    };
  }
  
  try {
    // Convert date and time to ISO format
    const appointmentDateTime = convertToISODateTime(appointment_date, appointment_time);
    console.log('Converted to ISO:', appointmentDateTime);
    
    // Create the booking request
    const bookingData = {
      start: appointmentDateTime,
      eventTypeId: 2694982, // Your Demo Appointment event type ID
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
      error: "I'm having trouble accessing our booking system right now. Please try again in a few minutes or call our office directly."
    };
  }
}

function convertToISODateTime(dateStr, timeStr) {
  try {
    console.log(`Converting Mountain Time to UTC: ${dateStr} ${timeStr}`);
    
    // Handle both "July 8th" and "2025-07-07" formats
    let isoDate;
    if (dateStr.includes('-')) {
      // Already in YYYY-MM-DD format
      isoDate = dateStr;
    } else {
      // Use existing convertDateToISO function for natural language dates
      isoDate = convertDateToISO(dateStr);
    }
    
    console.log(`ISO Date: ${isoDate}`);
    
    // Parse the time
    const timeMatch = timeStr.toLowerCase().match(/(\d+)(?::(\d+))?\s*(am|pm)?/);
    if (!timeMatch) {
      throw new Error('Invalid time format');
    }
    
    let hour = parseInt(timeMatch[1]);
    const minute = parseInt(timeMatch[2]) || 0;
    const isPM = timeStr.toLowerCase().includes('pm');
    
    // Convert to 24-hour format
    if (isPM && hour !== 12) {
      hour += 12;
    } else if (!isPM && hour === 12) {
      hour = 0;
    }
    
    // Convert Mountain Time to UTC (add 6 hours for MDT)
    const utcHour = (hour + 6) % 24;
    const utcDate = new Date(`${isoDate}T${utcHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00Z`);
    
    console.log(`Final UTC DateTime: ${utcDate.toISOString()}`);
    return utcDate.toISOString();
  } catch (error) {
    console.error('Date conversion error:', error, 'Inputs:', dateStr, timeStr);
    throw error;
  }
}
async function handleCancelBooking(args) {
  try {
    console.log('Cancelling booking:', args);
    
    const { booking_uid, cancellation_reason = "Cancelled by patient" } = args;
    
    if (!booking_uid) {
      return { success: false, error: "Booking ID is required" };
    }

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
    const result = await response.json();
    console.log('Cal.com response:', result);
    
    if (result.status === 'success') {
      return {
        success: true,
        message: `Your appointment has been successfully cancelled.`,
        booking_details: result.data
      };
    } else {
      return { success: false, error: "Unable to cancel appointment" };
    }
  } catch (error) {
    console.error('Cancel booking error:', error);
    return { success: false, error: "I'm having trouble cancelling your appointment right now." };
  }
}
async function handleGetTomorrowAppointments(args) {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const response = await fetch(`https://api.cal.com/v1/bookings?dateFrom=${tomorrowStr}&dateTo=${tomorrowStr}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CAL_API_KEY}`
      }
    });
    
    const result = await response.json();
    return { success: true, appointments: result.bookings || [] };
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return { success: false, error: "Could not fetch appointments" };
  }
}
async function handleTriggerReminders(args) {
  try {
    // Get tomorrow's appointments
    const appointmentsResult = await handleGetTomorrowAppointments({});
    if (!appointmentsResult.success) {
      return { success: false, error: "Could not fetch appointments" };
    }

    const results = [];
    for (const appointment of appointmentsResult.appointments) {
      // Trigger Retell outbound call
      const callResult = await fetch('https://api.retellai.com/v2/call', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RETELL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agent_id: 'agent_2647fcddc05b42bbf5096eeae3', // Replace with actual agent ID
          phone_number: appointment.attendees[0].phone,
          metadata: {
            appointment_id: appointment.uid,
            patient_name: appointment.attendees[0].name,
            appointment_time: appointment.start
          }
        })
      });
      
      results.push({ patient: appointment.attendees[0].name, status: callResult.status });
    }
    
    return { success: true, calls_triggered: results.length, results };
  } catch (error) {
    console.error('Trigger reminders error:', error);
    return { success: false, error: "Could not trigger reminder calls" };
  }
}
