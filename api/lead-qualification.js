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

async function handleBookSolarConsultation(args) {
  const { name, email, phone, preferred_time, lead_score, notes } = args;
  
  // For demo purposes, we'll simulate booking
  // In production, this would integrate with solar company's calendar
  
  return {
    success: true,
    consultation_scheduled: true,
    booking_details: {
      name: name,
      email: email,
      phone: phone,
      consultation_type: "In-home solar assessment",
      estimated_duration: "60-90 minutes"
    },
    message: `Great! I've scheduled your solar consultation. Our energy specialist will contact you within 24 hours to confirm the exact time and prepare a custom solar analysis for your home.`,
    next_steps: "Expect a call within 24 hours to confirm your consultation appointment"
  };
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

module.exports = {
  handleCalculateSolarSavings,
  handleScoreSolarLead,
  handleBookSolarConsultation,
  handleSendSolarInfo
};
