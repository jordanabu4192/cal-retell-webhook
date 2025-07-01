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
  
  try {
    const response = await fetch(`https://api.cal.com/v2/bookings/${booking_uid}/reschedule`, {
      method: 'POST',
      headers: {
        'cal-api-version': '2024-08-13',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CAL_API_KEY}`
      },
      body: JSON.stringify({
        start: new_start_time,
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
      const newDateTime = new Date(booking.start).toLocaleString();
      
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
