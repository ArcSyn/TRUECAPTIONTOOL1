/**
 * User Authentication Middleware - Enhanced RLS compatibility
 * 
 * @description Middleware to handle user identification and authentication 
 * for use with Supabase Row Level Security (RLS) policies.
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client for auth verification
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

/**
 * Enhanced user ID middleware for RLS compatibility
 * Supports multiple authentication methods:
 * 1. Header-based user ID (for demo/development)
 * 2. JWT token validation (for production)
 * 3. Session-based authentication
 */
const getUserId = async (req, res, next) => {
  try {
    let userId = null;
    let authMethod = 'demo';

    // Method 1: Check for JWT token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // Verify JWT token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (!error && user) {
          userId = user.id;
          authMethod = 'jwt';
          req.user = user;
        }
      } catch (jwtError) {
        console.warn('⚠️ JWT verification failed, falling back to header auth:', jwtError.message);
      }
    }

    // Method 2: Check for session-based user ID
    if (!userId && req.session && req.session.userId) {
      userId = req.session.userId;
      authMethod = 'session';
    }

    // Method 3: Check for header-based user ID (demo/development)
    if (!userId && (req.headers['x-user-id'] || req.headers['X-User-ID'])) {
      userId = req.headers['x-user-id'] || req.headers['X-User-ID'];
      authMethod = 'header';
    }

    // Method 4: Generate demo user ID if none provided
    if (!userId) {
      userId = generateDemoUserId();
      authMethod = 'generated';
    }

    // Validate user ID format (UUID or demo format)
    if (!isValidUserId(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }

    // Attach user info to request
    req.userId = userId;
    req.authMethod = authMethod;
    req.isDemo = authMethod !== 'jwt';

    // Log authentication for debugging (in development)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔐 Auth: ${authMethod} - User: ${userId.substring(0, 8)}...`);
    }

    next();
  } catch (error) {
    console.error('❌ Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

/**
 * Generate a demo user ID for development/testing
 * @returns {string} Demo user ID in UUID format
 */
function generateDemoUserId() {
  // Generate a UUID v4 format for demo users to work with database constraints
  return 'demo-' + 'xxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Validate user ID format
 * @param {string} userId - User ID to validate
 * @returns {boolean} True if valid
 */
function isValidUserId(userId) {
  if (!userId || typeof userId !== 'string') return false;
  
  // UUID format (for real users)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(userId)) return true;
  
  // Demo UUID format (starts with 'demo-' followed by UUID pattern)
  const demoUuidRegex = /^demo-[0-9a-f]{4}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (demoUuidRegex.test(userId)) return true;
  
  // Legacy demo user format (for backward compatibility)
  const demoRegex = /^demo-user-[a-z0-9\-]+$/i;
  if (demoRegex.test(userId)) return true;
  
  return false;
}

/**
 * Middleware to require authenticated users (no demo users)
 */
const requireAuth = (req, res, next) => {
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (req.isDemo) {
    return res.status(401).json({
      success: false,
      error: 'This endpoint requires authenticated users. Demo users not allowed.'
    });
  }

  next();
};

/**
 * Middleware for RLS-compatible database queries
 * Sets up Supabase client with proper user context
 */
const setupRLSContext = (req, res, next) => {
  // Create user-scoped Supabase client for RLS queries
  if (req.authMethod === 'jwt' && req.user) {
    // Use user's JWT token for RLS context
    req.supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${req.headers.authorization?.substring(7)}`
          }
        }
      }
    );
  } else {
    // For demo users, use service role but manually filter by user_id
    req.supabaseClient = supabase;
    req.manualRLS = true; // Flag to indicate manual RLS filtering needed
  }

  next();
};

/**
 * Helper function to create RLS-aware query
 * @param {Object} supabaseClient - Supabase client
 * @param {string} table - Table name
 * @param {string} userId - User ID
 * @param {boolean} manualRLS - Whether manual RLS filtering is needed
 */
function createUserQuery(supabaseClient, table, userId, manualRLS = false) {
  const query = supabaseClient.from(table);
  
  // If manual RLS is needed (demo users), add user_id filter
  if (manualRLS) {
    return {
      select: (columns = '*') => query.select(columns).eq('user_id', userId),
      insert: (data) => query.insert({ ...data, user_id: userId }),
      update: (data) => query.update(data).eq('user_id', userId),
      delete: () => query.delete().eq('user_id', userId)
    };
  }
  
  // For real users with JWT, RLS handles filtering automatically
  return {
    select: (columns = '*') => query.select(columns),
    insert: (data) => query.insert(data),
    update: (data) => query.update(data),
    delete: () => query.delete()
  };
}

module.exports = {
  getUserId,
  requireAuth,
  setupRLSContext,
  createUserQuery,
  generateDemoUserId,
  isValidUserId
};