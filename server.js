require('dotenv').config();
const express = require('express');
const { Retell } = require('retell-sdk');
const app = express();

app.use(express.json());

// Test endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Cal.com Retell webhook server is running!' });
});

// Reschedule booking endpoint
app.post('/reschedule-booking', async (req, res) => {
  try {
    console.log('Received request:', req.body);
    
    const { name, args } = req.body;
    
    if (name === 'reschedule_booking') {
      const result = await handleRescheduleBooking(args);
      return res.json(result);
    }
    
    res.status(400).json({ error: "Unknown function" });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function handleRescheduleBooking(args) {
  const { booking_uid, new_start_time, rescheduled_by, reason } = args;
  
  console.log('Rescheduling booking:', booking_uid, 'to:', new_start_time);
  
  // Validate inputs
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Cal.com API key loaded:', process.env.CAL_API_KEY ? 'Yes' : 'No');
});