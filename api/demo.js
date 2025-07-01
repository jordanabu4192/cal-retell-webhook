export default function handler(req, res) {
  if (req.method === 'GET') {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Dental Appointment Reminder Demo</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 50px auto; 
            padding: 20px; 
            background: #f5f5f5; 
        }
        .container { 
            background: white; 
            padding: 30px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
        }
        button { 
            background: #007bff; 
            color: white; 
            border: none; 
            padding: 15px 30px; 
            font-size: 18px; 
            border-radius: 5px; 
            cursor: pointer; 
            margin: 10px 0; 
        }
        button:hover { background: #0056b3; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        #results { 
            margin-top: 20px; 
            padding: 15px; 
            background: #f8f9fa; 
            border-radius: 5px; 
            white-space: pre-wrap; 
            font-family: monospace; 
        }
        .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🦷 Dental Appointment Reminder Demo</h1>
        <p>This demo will trigger voice calls to all patients with appointments tomorrow.</p>
        
        <button id="triggerBtn" onclick="triggerReminders()">
            📞 Send Reminder Calls Now
        </button>
        
        <button onclick="checkAppointments()">
            📅 Check Tomorrow's Appointments
        </button>
        
        <div id="status"></div>
        <div id="results"></div>
    </div>

    <script>
        async function triggerReminders() {
            const btn = document.getElementById('triggerBtn');
            const status = document.getElementById('status');
            const results = document.getElementById('results');
            
            btn.disabled = true;
            btn.textContent = '📞 Sending calls...';
            status.innerHTML = '<div class="status">Triggering reminder calls...</div>';
            
            try {
                const response = await fetch('/api', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({name: 'trigger_reminders', args: {}})
                });
                
                const result = await response.json();
                
                if (result.success) {
                    status.innerHTML = \`<div class="status success">✅ Successfully triggered \${result.calls_triggered} reminder calls!</div>\`;
                    
                    let resultText = 'Call Results:\\n';
                    result.results.forEach(call => {
                        const statusIcon = call.status === 201 ? '✅' : '❌';
                        resultText += \`\${statusIcon} \${call.patient} (\${call.phone}): Status \${call.status}\\n\`;
                    });
                    
                    results.textContent = resultText;
                } else {
                    status.innerHTML = \`<div class="status error">❌ Error: \${result.error}</div>\`;
                    results.textContent = '';
                }
            } catch (error) {
                status.innerHTML = \`<div class="status error">❌ Network error: \${error.message}</div>\`;
                results.textContent = '';
            }
            
            btn.disabled = false;
            btn.textContent = '📞 Send Reminder Calls Now';
        }
        
        async function checkAppointments() {
            const status = document.getElementById('status');
            const results = document.getElementById('results');
            
            status.innerHTML = '<div class="status">Checking appointments...</div>';
            
            try {
                const response = await fetch('/api', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({name: 'get_tomorrow_appointments', args: {}})
                });
                
                const result = await response.json();
                
                if (result.success) {
                    status.innerHTML = \`<div class="status success">✅ Found \${result.appointments.length} appointments for tomorrow</div>\`;
                    
                    let appointmentText = 'Tomorrow\\'s Appointments:\\n';
                    result.appointments.forEach(apt => {
                        const time = new Date(apt.start).toLocaleTimeString();
                        const phone = apt.metadata?.phone || 'No phone';
                        appointmentText += \`• \${apt.attendees[0].name} at \${time} (\${phone})\\n\`;
                    });
                    
                    results.textContent = appointmentText;
                } else {
                    status.innerHTML = \`<div class="status error">❌ Error: \${result.error}</div>\`;
                    results.textContent = '';
                }
            } catch (error) {
                status.innerHTML = \`<div class="status error">❌ Network error: \${error.message}</div>\`;
                results.textContent = '';
            }
        }
    </script>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
