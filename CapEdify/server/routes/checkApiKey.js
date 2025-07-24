const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

const WEEKLY_LIMIT = 5;

module.exports = async function checkApiKey(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) return res.status(401).json({ error: 'Missing API key' });

    // Check if API key is valid
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('api_key', token)
      .single();

    if (error || !user) return res.status(403).json({ error: 'Invalid API key' });

    // Count usage in the last 7 days
    const { count, error: usageError } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('api_key', token)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (usageError) return res.status(500).json({ error: 'Usage lookup failed' });

    if (user.status === 'free' && count >= WEEKLY_LIMIT) {
      return res.status(429).json({ error: 'Usage limit reached (5/week)' });
    }

    // Attach user to request (optional)
    req.user = user;
    next();
  } catch (err) {
    console.error('checkApiKey error:', err);
    res.status(500).json({ error: 'Internal auth error' });
  }
};