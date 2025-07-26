const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

const checkApiKey = async (req, res, next) => {
  try {
    // For development, skip API key check for localhost
    if (req.hostname === 'localhost' || req.hostname === '127.0.0.1') {
      req.user = { api_key: 'dev-local' };
      return next();
    }

    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ 
        success: false, 
        error: 'API key is required' 
      });
    }

    // For now, we'll use a simple API key check
    // In production, you'd want to store these in your database
    const validApiKeys = ['test-api-key', 'dev-api-key'];
    
    if (!validApiKeys.includes(apiKey)) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid API key' 
      });
    }

    // Store API key info in request for logging
    req.user = { api_key: apiKey };
    next();
  } catch (error) {
    console.error('API key validation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

module.exports = checkApiKey;
