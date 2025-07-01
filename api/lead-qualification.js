// Solar Lead Qualification Functions

async function handleCalculateSolarSavings(args) {
  const { monthly_electric_bill, roof_condition, home_size } = args;
  
  if (!monthly_electric_bill || monthly_electric_bill < 50) {
    return {
      potential_savings: 0,
      message: "With a low electric bill, solar may not provide significant savings.",
      recommendation: "not_suitable"
    };
  }
  
  // Simple savings calculation (actual formula would be more complex)
  const annualBill = monthly_electric_bill * 12;
  const estimatedSavings = Math.round(annualBill * 0.7); // 70% savings typical
  const systemCost = estimatedSavings * 6; // 6-year payback typical
  
  return {
    potential_savings: estimatedSavings,
    annual_bill: annualBill,
    estimated_system_cost: systemCost,
    payback_years: 6,
    message: `Based on your $${monthly_electric_bill} monthly bill, you could save approximately $${estimatedSavings} per year with solar.`,
    recommendation: monthly_electric_bill >= 150 ? "excellent_candidate" : "good_candidate"
  };
}

async function handleScoreSolarLead(args) {
  const { 
    homeowner, 
    monthly_electric_bill, 
    roof_age, 
    credit_score_range, 
    timeline, 
    decision_maker,
    has_hoa 
  } = args;
  
  let score = 0;
  let notes = [];
  
  // Homeowner check (mandatory)
  if (!homeowner) {
    return {
      score: 0,
      qualification: "disqualified",
      notes: ["Not a homeowner - cannot install solar"],
      recommendation: "send_rental_info"
    };
  }
  score += 2;
  
  // Electric bill scoring
  if (monthly_electric_bill >= 200) {
    score += 3;
    notes.push("High electric bill - excellent savings potential");
  } else if (monthly_electric_bill >= 150) {
    score += 2;
    notes.push("Good electric bill for solar savings");
  } else if (monthly_electric_bill >= 100) {
    score += 1;
    notes.push("Moderate electric bill");
  } else {
    notes.push("Low electric bill - limited savings potential");
  }
  
  // Roof condition
  if (roof_age <= 10) {
    score += 2;
    notes.push("New roof - perfect for solar");
  } else if (roof_age <= 20) {
    score += 1;
    notes.push("Roof in good condition");
  } else {
    notes.push("Older roof - may need replacement first");
  }
  
  // Credit/financing
  if (credit_score_range === "excellent" || credit_score_range === "good") {
    score += 2;
    notes.push("Good credit for financing options");
  } else if (credit_score_range === "fair") {
    score += 1;
    notes.push("Fair credit - some financing options");
  }
  
  // Timeline urgency
  if (timeline === "immediate" || timeline === "next_3_months") {
    score += 1;
    notes.push("Ready to move forward soon");
  }
  
  // Decision making authority
  if (decision_maker) {
    score += 1;
    notes.push("Has decision-making authority");
  }
  
  // Determine qualification level
  let qualification, recommendation;
  if (score >= 8) {
    qualification = "hot_lead";
    recommendation = "book_consultation_asap";
  } else if (score >= 6) {
    qualification = "warm_lead";
    recommendation = "book_consultation";
  } else if (score >= 4) {
    qualification = "cool_lead";
    recommendation = "send_info_follow_up";
  } else {
    qualification = "cold_lead";
    recommendation = "send_basic_info";
  }
  
  return {
    score: score,
    qualification: qualification,
    recommendation: recommendation,
    notes: notes,
    next_steps: getNextSteps(qualification)
  };
}

// Replace the booking function in lead-qualification.js with this:

// Replace handleBookSolarConsultation in lead-qualification.js with this:

async function handleBookSolarConsultation(args) {
  const { name, email, phone, preferred_time, lead_score, notes } = args;
  
  try {
    // Convert preferred time to a proper appointment date/time
    let appointmentDate, appointmentTime;
    
    if (preferred_time && preferred_time.toLowerCase().includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      appointmentDate = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
      appointmentTime = "12:00 PM"; // Default time
    } else if (preferred_time && preferred_time.toLowerCase().includes('this week')) {
      const nextBusinessDay = new Date();
      nextBusinessDay.setDate(nextBusinessDay.getDate() + 1);
      // Skip weekends
      while (nextBusinessDay.getDay() === 0 || nextBusinessDay.getDay() === 6) {
        nextBusinessDay.setDate(nextBusinessDay.getDate() + 1);
      }
      appointmentDate = nextBusinessDay.toISOString().split('T')[0];
      appointmentTime = "10:00 AM";
    } else {
      // Default to next business day
      const nextBusinessDay = new Date();
      nextBusinessDay.setDate(nextBusinessDay.getDate() + 1);
      appointmentDate = nextBusinessDay.toISOString().split('T')[0];
      appointmentTime = "10:00 AM";
    }
    
    const consultationNotes = `Solar consultation - Lead score: ${lead_score || 'N/A'}. ${notes || 'Initial qualification call'}`;
    
    // Convert date and time to ISO format for Cal.com
    const appointmentDateTime = convertToISODateTime(appointmentDate, appointmentTime);
    
    // Create the booking request directly
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
        reason: "Solar consultation",
        notes: consultationNotes
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
    
    if (response.ok) {
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
          consultation_scheduled: true,
          booking_details: {
            date_time: confirmationTime,
            booking_id: booking.uid
          },
          message: `Excellent! I've scheduled your solar consultation for ${confirmationTime}. Our energy specialist will provide a custom solar analysis for your home.`,
          next_steps: "You'll receive an email confirmation with all the details"
        };
      }
    }
    
    // If booking fails, graceful fallback
    return {
      success: true, // Don't fail the whole conversation
      consultation_scheduled: false,
      message: `I have all your information and will have our energy specialist call you within 24 hours to schedule your consultation personally.`,
      next_steps: "Expect a call within 24 hours"
    };
    
  } catch (error) {
    console.error('Solar consultation booking error:', error);
    return {
      success: true, // Don't fail the whole conversation
      consultation_scheduled: false,
      message: `I have all your information and will have our energy specialist call you within 24 hours to schedule your consultation personally.`,
      next_steps: "Expect a call within 24 hours"
    };
  }
}

// Helper function for date conversion
function convertToISODateTime(dateStr, timeStr) {
  try {
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
    const utcDate = new Date(`${dateStr}T${utcHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00Z`);
    
    return utcDate.toISOString();
  } catch (error) {
    console.error('Date conversion error:', error);
    throw error;
  }
}

async function handleSendSolarInfo(args) {
  const { email, name, lead_qualification, interest_level } = args;
  
  const infoPackages = {
    hot_lead: {
      package: "Complete Solar Analysis Kit",
      includes: ["Custom savings calculator", "Financing options", "Installation timeline", "Warranty information"],
      followUp: "Call within 24 hours"
    },
    warm_lead: {
      package: "Solar Basics Guide", 
      includes: ["How solar works", "Cost breakdown", "Financing options", "Local incentives"],
      followUp: "Call within 1 week"
    },
    cool_lead: {
      package: "Solar Information Packet",
      includes: ["Solar benefits overview", "Basic cost estimates", "FAQ document"],
      followUp: "Email follow-up in 2 weeks"
    },
    cold_lead: {
      package: "Introduction to Solar",
      includes: ["Solar basics", "Environmental benefits", "General cost information"],
      followUp: "Quarterly newsletter signup"
    }
  };
  
  const packageInfo = infoPackages[lead_qualification] || infoPackages.cool_lead;
  
  return {
    success: true,
    info_sent: true,
    package_type: packageInfo.package,
    includes: packageInfo.includes,
    follow_up_plan: packageInfo.followUp,
    message: `Perfect! I'm sending you our ${packageInfo.package} to ${email}. This includes ${packageInfo.includes.join(', ')}. ${packageInfo.followUp}.`,
    email_delivered: true // Simulated for demo
  };
}

function getNextSteps(qualification) {
  switch(qualification) {
    case "hot_lead":
      return "Schedule in-home consultation within 24-48 hours";
    case "warm_lead":
      return "Schedule consultation within 1 week, send detailed info";
    case "cool_lead":
      return "Send solar calculator and info, follow up in 2 weeks";
    case "cold_lead":
      return "Add to nurture campaign, follow up in 1-2 months";
    default:
      return "Send basic solar information";
  }
}

async function handleCalculateFinancingOptions(args) {
  const { 
    savings_amount, 
    credit_score_range, 
    system_cost, 
    down_payment_preference = "none" 
  } = args;
  
  if (!savings_amount || !system_cost) {
    return {
      error: "Need savings amount and system cost to calculate financing options",
      message: "Let me get your solar savings calculation first, then I can show you financing options."
    };
  }
  
  // Determine interest rates based on credit score
  let interestRate = 8.99; // Default rate
  let loanQualified = true;
  
  switch(credit_score_range) {
    case "excellent":
      interestRate = 4.99;
      break;
    case "good": 
      interestRate = 6.99;
      break;
    case "fair":
      interestRate = 8.99;
      break;
    case "poor":
      interestRate = 12.99;
      loanQualified = false;
      break;
  }
  
  const monthlyUtilityBill = Math.round(savings_amount / 12);
  
  // Calculate financing scenarios
  const scenarios = [];
  
  // 1. Cash Purchase
  scenarios.push({
    type: "Cash Purchase",
    upfront_cost: system_cost,
    monthly_payment: 0,
    total_cost: system_cost,
    payback_years: Math.round(system_cost / savings_amount * 10) / 10,
    lifetime_savings: Math.round((savings_amount * 25) - system_cost),
    benefits: ["30% federal tax credit", "Immediate 100% ownership", "Maximum lifetime savings", "Increases home value"],
    best_for: "Homeowners with available cash who want maximum savings"
  });
  
  // 2. Solar Loan (if qualified)
  if (loanQualified) {
    const loanAmount = down_payment_preference === "none" ? system_cost : system_cost * 0.8;
    const monthlyPayment = calculateLoanPayment(loanAmount, interestRate, 20); // 20-year loan
    const totalCost = monthlyPayment * 240; // 20 years
    
    scenarios.push({
      type: "Solar Loan",
      upfront_cost: down_payment_preference === "none" ? 0 : system_cost * 0.2,
      monthly_payment: Math.round(monthlyPayment),
      total_cost: Math.round(totalCost),
      interest_rate: interestRate,
      loan_term: "20 years",
      net_monthly_savings: Math.round(monthlyUtilityBill - monthlyPayment),
      lifetime_savings: Math.round((savings_amount * 25) - totalCost),
      benefits: ["$0 down available", "You own the system", "Eligible for tax credits", "Fixed payments"],
      best_for: "Most homeowners - combines ownership benefits with affordable payments"
    });
  }
  
  // 3. Solar Lease/PPA
  const monthlyLease = Math.round(monthlyUtilityBill * 0.85); // 15% savings
  scenarios.push({
    type: "Solar Lease",
    upfront_cost: 0,
    monthly_payment: monthlyLease,
    total_cost: monthlyLease * 300, // 25-year lease
    immediate_savings: Math.round(monthlyUtilityBill - monthlyLease),
    escalator: "2.9% annual increase",
    lifetime_savings: Math.round(savings_amount * 25 * 0.15), // 15% of total savings
    benefits: ["$0 down", "Maintenance included", "Performance guarantee", "Immediate savings"],
    best_for: "Homeowners who want solar with no upfront cost or maintenance responsibility"
  });
  
  // Determine best recommendation
  let recommendation;
  if (system_cost < savings_amount * 6) {
    recommendation = loanQualified ? "Solar Loan" : "Solar Lease";
  } else {
    recommendation = "Solar Lease";
  }
  
  return {
    success: true,
    financing_scenarios: scenarios,
    recommended_option: recommendation,
    credit_qualified: loanQualified,
    message: `Based on your ${credit_score_range} credit and $${Math.round(savings_amount)} annual savings, here are your three financing options. The ${recommendation} typically works best for customers in your situation.`,
    next_steps: "Our energy specialist can provide exact quotes and help you choose the best financing option during your consultation."
  };
}

async function handleLookupLocalIncentives(args) {
  const { zip_code, utility_company } = args;
  
  if (!zip_code) {
    return {
      error: "Need zip code to look up local incentives",
      message: "What's your zip code so I can check for local solar incentives in your area?"
    };
  }
  
  // Simulate incentive lookup based on zip code patterns
  // In production, this would hit real APIs for utility data
  const incentives = getIncentivesByZipCode(zip_code);
  
  return {
    success: true,
    zip_code: zip_code,
    ...incentives,
    message: `Great news! In your area (${zip_code}), you're eligible for ${incentives.total_available_incentives} in solar incentives. This includes the federal tax credit plus ${incentives.local_incentives.length} local programs.`,
    urgency_factor: incentives.expiring_soon.length > 0 ? `Important: ${incentives.expiring_soon.length} of these incentives expire soon!` : null
  };
}

// Helper function for loan payment calculation
function calculateLoanPayment(principal, annualRate, years) {
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = years * 12;
  
  if (monthlyRate === 0) return principal / numPayments;
  
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                 (Math.pow(1 + monthlyRate, numPayments) - 1);
  return payment;
}

// Helper function to simulate incentive lookup
function getIncentivesByZipCode(zipCode) {
  // Simulate different regions with different incentives
  const firstDigit = zipCode.charAt(0);
  
  let stateIncentives = [];
  let utilityIncentives = [];
  let expiringSoon = [];
  
  // Simulate state-based incentives
  if (["8", "9"].includes(firstDigit)) {
    // Western states (CO, NM, etc.)
    stateIncentives = [
      { name: "State Solar Tax Credit", amount: "$2,500", description: "25% state tax credit up to $2,500" },
      { name: "Property Tax Exemption", amount: "100%", description: "Solar systems exempt from property tax increases" }
    ];
    utilityIncentives = [
      { name: "Net Metering", rate: "1:1", description: "Full retail credit for excess solar production" },
      { name: "Utility Rebate", amount: "$0.75/watt", description: "Rebate based on system size" }
    ];
  } else if (["0", "1", "2"].includes(firstDigit)) {
    // Eastern states
    stateIncentives = [
      { name: "Solar Renewable Energy Certificates", amount: "$150/MWh", description: "Earn credits for solar production" },
      { name: "Low-Interest Solar Loans", rate: "3.99%", description: "State-backed financing program" }
    ];
    utilityIncentives = [
      { name: "Time-of-Use Rates", benefit: "Higher credits", description: "Earn more for peak-time solar production" }
    ];
  } else {
    // Central/Southern states  
    stateIncentives = [
      { name: "Solar Sales Tax Exemption", amount: "100%", description: "No sales tax on solar equipment" }
    ];
    utilityIncentives = [
      { name: "Net Metering", rate: "Retail rate", description: "Credit for excess solar at retail rates" }
    ];
    expiringSoon = [
      { name: "Utility Solar Rebate", amount: "$1,000", expires: "December 31, 2025", description: "Limited-time utility incentive" }
    ];
  }
  
  const federalIncentives = [
    { name: "Federal Solar Tax Credit", amount: "30%", description: "30% tax credit through 2032, then steps down" },
    { name: "USDA Rural Energy Grant", amount: "Up to $20,000", description: "Available for rural properties", eligibility: "Rural areas only" }
  ];
  
  const totalIncentiveValue = calculateTotalIncentiveValue(federalIncentives, stateIncentives, utilityIncentives, expiringSoon);
  
  return {
    federal_incentives: federalIncentives,
    state_incentives: stateIncentives,
    utility_incentives: utilityIncentives,
    local_incentives: [...stateIncentives, ...utilityIncentives],
    expiring_soon: expiringSoon,
    total_available_incentives: totalIncentiveValue,
    net_metering_available: true,
    current_utility_rate: "$0.12/kWh",
    rate_trend: "Increasing 6-7% annually"
  };
}

function calculateTotalIncentiveValue(federal, state, utility, expiring) {
  // Simulate total incentive calculation
  const federalValue = 5000; // Approximate 30% of typical system
  const stateValue = state.reduce((sum, incentive) => {
    const amount = incentive.amount.replace(/[$,]/g, '');
    return sum + (isNaN(amount) ? 1000 : parseInt(amount));
  }, 0);
  const utilityValue = 1500; // Typical utility incentives
  const expiringValue = expiring.reduce((sum, incentive) => {
    const amount = incentive.amount.replace(/[$,]/g, '');
    return sum + (isNaN(amount) ? 0 : parseInt(amount));
  }, 0);
  
  const total = federalValue + stateValue + utilityValue + expiringValue;
  return `$${total.toLocaleString()}`;
}

module.exports = {
  handleCalculateSolarSavings,
  handleScoreSolarLead,
  handleBookSolarConsultation,
  handleSendSolarInfo,  
  handleCalculateFinancingOptions,
  handleLookupLocalIncentives
};
