// Add this new function handler
if (name === 'find_booking_by_date') {
  const result = await handleFindBookingByDate(args);
  return res.json(result);
}

// Add this new function
async function handleFindBookingByDate(args) {
  const { email, appointment_date, appointment_time } = args;
  
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
      throw new Error(`Cal.com API error: ${response.status}`);
    }
    
    const result = await response.json();
    const bookings = result.data || [];
    
    // Filter for active bookings only
    const activeBookings = bookings.filter(booking => 
      booking.status === 'accepted' && new Date(booking.start) > new Date()
    );
    
    // Try to match the date and time
    const matchedBooking = findBestMatch(activeBookings, appointment_date, appointment_time);
    
    if (matchedBooking) {
      return {
        booking_uid: matchedBooking.uid,
        booking_details: `${new Date(matchedBooking.start).toLocaleDateString()} at ${new Date(matchedBooking.start).toLocaleTimeString()}`
      };
    } else {
      return {
        error: "I couldn't find an appointment matching that date and time. Could you please double-check the details?"
      };
    }
    
  } catch (error) {
    console.error('Find booking error:', error);
    return {
      error: "I'm having trouble finding your appointment. Please try again or provide your booking confirmation number."
    };
  }
}

function findBestMatch(bookings, dateStr, timeStr) {
  // Simple matching logic - can be enhanced
  for (const booking of bookings) {
    const bookingDate = new Date(booking.start);
    const bookingDateStr = bookingDate.toLocaleDateString();
    const bookingTimeStr = bookingDate.toLocaleTimeString();
    
    // Check if the date and time roughly match
    // This is basic matching - could be made more sophisticated
    if (bookingDateStr.includes(parseDate(dateStr)) && 
        bookingTimeStr.includes(parseTime(timeStr))) {
      return booking;
    }
  }
  
  // If no exact match, return the most recent upcoming booking
  return bookings.length > 0 ? bookings[0] : null;
}

function parseDate(dateStr) {
  // Basic date parsing - extract month and day
  // Could be enhanced with better parsing
  return dateStr.toLowerCase().replace(/[^\w\s]/g, '');
}

function parseTime(timeStr) {
  // Basic time parsing
  return timeStr.toLowerCase().replace(/[^\w\s]/g, '');
}
