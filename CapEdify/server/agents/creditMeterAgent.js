/**
 * CreditMeterAgent - Estimate usage cost for caption jobs based on user tier
 * 
 * Purpose: Validate job requests against tier limits and calculate credit usage
 * Input: tier, durationMinutes, jobCountThisMonth
 * Output: JSON with allowed, estimatedCreditsUsed, and reason if blocked
 */

/**
 * Tier configuration with limits and pricing
 */
const TIER_CONFIG = {
  free: {
    name: 'Free',
    maxJobsPerMonth: 3,
    maxDurationMinutes: 2,
    creditsPerMinute: 0, // Free tier uses no credits
    features: ['Basic transcription', 'SRT export']
  },
  creator: {
    name: 'Creator',
    maxJobsPerMonth: 30,
    maxDurationMinutes: 10,
    creditsPerMinute: 2,
    features: ['HD transcription', 'JSX export', 'Style presets']
  },
  studio: {
    name: 'Studio',
    maxJobsPerMonth: 100,
    maxDurationMinutes: Infinity, // Unlimited
    creditsPerMinute: 1.5, // Bulk discount
    features: ['Premium transcription', 'Advanced JSX', 'Custom styling', 'Priority processing']
  }
};

/**
 * Calculate base credit cost with duration-based pricing
 * @param {string} tier - User tier
 * @param {number} durationMinutes - Video duration in minutes
 * @returns {number} - Estimated credits needed
 */
function calculateCredits(tier, durationMinutes) {
  const config = TIER_CONFIG[tier];
  if (!config) return 0;
  
  let credits = durationMinutes * config.creditsPerMinute;
  
  // Apply duration-based multipliers
  if (durationMinutes > 30) {
    credits *= 1.2; // 20% surcharge for very long videos
  } else if (durationMinutes < 0.5) {
    credits = Math.max(credits, 1); // Minimum 1 credit for any job
  }
  
  return Math.ceil(credits);
}

/**
 * Validate job against tier limits
 * @param {string} tier - User tier
 * @param {number} durationMinutes - Video duration
 * @param {number} jobCountThisMonth - Current month's job count
 * @returns {Object} - Validation result
 */
function validateJobLimits(tier, durationMinutes, jobCountThisMonth) {
  const config = TIER_CONFIG[tier];
  
  if (!config) {
    return {
      allowed: false,
      reason: `Invalid tier: ${tier}. Available tiers: ${Object.keys(TIER_CONFIG).join(', ')}`
    };
  }
  
  // Check monthly job limit
  if (jobCountThisMonth >= config.maxJobsPerMonth) {
    return {
      allowed: false,
      reason: `Monthly job limit reached. ${config.name} tier allows ${config.maxJobsPerMonth} jobs per month. Current: ${jobCountThisMonth}`
    };
  }
  
  // Check duration limit
  if (durationMinutes > config.maxDurationMinutes) {
    return {
      allowed: false,
      reason: `Video too long. ${config.name} tier max duration: ${config.maxDurationMinutes === Infinity ? 'unlimited' : config.maxDurationMinutes + ' minutes'}. Requested: ${durationMinutes} minutes`
    };
  }
  
  // Additional validations
  if (durationMinutes <= 0) {
    return {
      allowed: false,
      reason: 'Invalid duration: Video must be longer than 0 minutes'
    };
  }
  
  if (durationMinutes > 180) { // 3 hours max for any tier
    return {
      allowed: false,
      reason: 'Video exceeds maximum supported duration of 3 hours'
    };
  }
  
  return { allowed: true };
}

/**
 * Generate tier comparison for upgrade suggestions
 * @param {string} currentTier - Current user tier
 * @param {number} durationMinutes - Requested duration
 * @returns {Array} - Array of tier suggestions
 */
function getTierSuggestions(currentTier, durationMinutes) {
  const suggestions = [];
  
  for (const [tierName, config] of Object.entries(TIER_CONFIG)) {
    if (tierName === currentTier) continue;
    
    if (durationMinutes <= config.maxDurationMinutes) {
      suggestions.push({
        tier: tierName,
        name: config.name,
        maxDuration: config.maxDurationMinutes === Infinity ? 'unlimited' : `${config.maxDurationMinutes} min`,
        maxJobs: config.maxJobsPerMonth,
        creditsForThisJob: calculateCredits(tierName, durationMinutes)
      });
    }
  }
  
  return suggestions;
}

/**
 * Main agent function - Calculate credit usage and validate job
 * @param {Object} input - Job parameters
 * @param {string} input.tier - User tier (free, creator, studio)
 * @param {number} input.durationMinutes - Video duration in minutes
 * @param {number} input.jobCountThisMonth - Current month's completed jobs
 * @returns {Promise<Object>} - Usage calculation and validation result
 */
async function run(input) {
  try {
    // Validate input structure
    if (!input || typeof input !== 'object') {
      throw new Error('Invalid input: Expected object with tier, durationMinutes, jobCountThisMonth');
    }
    
    const { tier, durationMinutes, jobCountThisMonth } = input;
    
    // Validate required fields
    if (!tier || typeof tier !== 'string') {
      throw new Error('Invalid tier: Expected string (free, creator, studio)');
    }
    
    if (typeof durationMinutes !== 'number' || durationMinutes < 0) {
      throw new Error('Invalid durationMinutes: Expected positive number');
    }
    
    if (typeof jobCountThisMonth !== 'number' || jobCountThisMonth < 0) {
      throw new Error('Invalid jobCountThisMonth: Expected non-negative number');
    }
    
    // Normalize tier name
    const normalizedTier = tier.toLowerCase().trim();
    
    // Validate against tier limits
    const validation = validateJobLimits(normalizedTier, durationMinutes, jobCountThisMonth);
    
    if (!validation.allowed) {
      return {
        allowed: false,
        estimatedCreditsUsed: 0,
        reason: validation.reason,
        tierSuggestions: getTierSuggestions(normalizedTier, durationMinutes),
        currentTierInfo: TIER_CONFIG[normalizedTier]
      };
    }
    
    // Calculate credit usage
    const creditsUsed = calculateCredits(normalizedTier, durationMinutes);
    const config = TIER_CONFIG[normalizedTier];
    
    // Build success response
    const response = {
      allowed: true,
      estimatedCreditsUsed: creditsUsed,
      tierInfo: {
        name: config.name,
        jobsRemaining: config.maxJobsPerMonth - jobCountThisMonth - 1,
        features: config.features
      },
      jobDetails: {
        duration: `${durationMinutes} minutes`,
        creditsPerMinute: config.creditsPerMinute,
        totalCredits: creditsUsed
      }
    };
    
    // Add warnings for approaching limits
    const jobsRemaining = config.maxJobsPerMonth - jobCountThisMonth - 1;
    if (jobsRemaining <= 2) {
      response.warning = `Only ${jobsRemaining} jobs remaining this month`;
    }
    
    if (normalizedTier === 'free' && durationMinutes > 1) {
      response.suggestion = 'Consider upgrading to Creator tier for longer videos and more jobs';
    }
    
    return response;

  } catch (error) {
    console.error('CreditMeterAgent error:', error.message);
    return {
      allowed: false,
      estimatedCreditsUsed: 0,
      reason: `System error: ${error.message}`
    };
  }
}

// Test function
async function test() {
  console.log('📊 Testing CreditMeterAgent...\n');
  
  const testCases = [
    {
      name: 'Free tier - valid job',
      input: { tier: 'free', durationMinutes: 1.5, jobCountThisMonth: 1 }
    },
    {
      name: 'Free tier - exceeds duration',
      input: { tier: 'free', durationMinutes: 3, jobCountThisMonth: 1 }
    },
    {
      name: 'Free tier - exceeds monthly jobs',
      input: { tier: 'free', durationMinutes: 1, jobCountThisMonth: 3 }
    },
    {
      name: 'Creator tier - valid job',
      input: { tier: 'creator', durationMinutes: 5, jobCountThisMonth: 10 }
    },
    {
      name: 'Studio tier - long video',
      input: { tier: 'studio', durationMinutes: 45, jobCountThisMonth: 25 }
    },
    {
      name: 'Invalid tier',
      input: { tier: 'premium', durationMinutes: 2, jobCountThisMonth: 1 }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`Test: ${testCase.name}`);
    console.log('Input:', testCase.input);
    
    const result = await run(testCase.input);
    
    console.log('Result:');
    console.log(`  Allowed: ${result.allowed}`);
    console.log(`  Credits: ${result.estimatedCreditsUsed}`);
    if (result.reason) {
      console.log(`  Reason: ${result.reason}`);
    }
    if (result.warning) {
      console.log(`  Warning: ${result.warning}`);
    }
    if (result.tierSuggestions && result.tierSuggestions.length > 0) {
      console.log('  Suggested tiers:', result.tierSuggestions.map(s => s.name).join(', '));
    }
    console.log('---\n');
  }
}

// Run test if called directly
if (require.main === module) {
  test();
}

module.exports = { run };