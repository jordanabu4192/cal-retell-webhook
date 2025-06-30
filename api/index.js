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

// Your existing handleRescheduleBooking function stays the same...

// Add the new function here...
async function handleFindBookingByDate(args) {
  // ... your new function code
}
