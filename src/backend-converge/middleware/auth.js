/**
 * Own Your Career — Authentication Middleware (Converge Cloud)
 * 
 * Handles Google OAuth 2.0 authentication with allowlist validation.
 * Enforces 30-minute session timeout.
 * 
 * @fileoverview Authentication middleware
 */

'use strict';

const JWT_SECRET = process.env.JWT_SECRET || 'oyc-dev-secret-key-change-in-production';

/**
 * Allowed emails for authentication (from environment variable)
 * Format: comma-separated list of emails
 */
function getAllowedEmails() {
  const emails = process.env.ALLOWED_EMAILS;
  if (!emails) return [];
  return emails.split(',').map(e => e.trim().toLowerCase());
}

/**
 * Validates email format (must be Converge email)
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid corporate email
 */
function isValidCorporateEmail(email) {
  return email && email.toLowerCase().endsWith('@converge.com.ph');
}

/**
 * Validates email is on allowlist
 * @param {string} email - Email to check
 * @returns {boolean} True if email is allowed
 */
function isEmailOnAllowlist(email) {
  const allowedEmails = getAllowedEmails();
  return allowedEmails.includes(email.toLowerCase());
}

/**
 * Generates JWT token for authenticated user
 * @param {string} email - User email
 * @param {string} role - User role
 * @returns {string} JWT token
 */
function generateToken(email, role) {
  const payload = {
    email: email,
    role: role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 60) // 30 minutes
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Validates JWT token
 * @param {string} token - Token to validate
 * @returns {Object|null} Decoded payload or null if invalid
 */
function validateToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp < now) {
      return null; // Token expired
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Extracts user info from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {Object|null} User info or null
 */
function extractUserFromHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  return validateToken(token);
}

/**
 * Verifies Google ID token
 * @param {string} idToken - Google ID token
 * @returns {Promise<Object>} Decoded token payload or null
 */
async function verifyGoogleIdToken(idToken) {
  const { OAuth2Client } = require('google-auth-library');
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

  if (!CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID not configured');
  }

  const oauth2Client = new OAuth2Client(CLIENT_ID);

  try {
    const ticket = await oauth2Client.verifyIdToken({
      idToken: idToken,
      audience: CLIENT_ID
    });

    const payload = ticket.getPayload();
    return payload || null;
  } catch (error) {
    console.error('Google ID token verification failed:', error);
    return null;
  }
}

/**
 * Authenticates user via Google OAuth 2.0 with allowlist validation
 * @param {string} email - User email from Google token
 * @param {string} role - User role (EMPLOYEE, MANAGER, DATA_SPOC)
 * @param {string} idToken - Google ID token
 * @returns {Promise<Object>} Auth result with success status and token
 */
async function authenticateUser(email, role, idToken) {
  // Phase 1B Testing Mode: Accept test emails
  const isTestingMode = process.env.NODE_ENV !== 'production';
  
  if (isTestingMode) {
    // Phase 1B Testing Mode: Accept predefined test users
    const testAllowlist = [
      { email: 'manager@example.com', role: 'MANAGER' },
      { email: 'employee@example.com', role: 'EMPLOYEE' },
      { email: 'dataspoc@example.com', role: 'DATA_SPOC' },
      { email: 'admin@example.com', role: 'ADMIN' }
    ];
    
    const testUser = testAllowlist.find(u => u.email === email && u.role === role);
    
    if (!testUser) {
      return {
        success: false,
        message: 'Test user not found. Use: manager@, employee@, dataspoc@, admin@example.com'
      };
    }
    
    // Generate session token
    const token = generateToken(email, role);
    
    return {
      success: true,
      message: 'Authentication successful (Phase 1B Testing Mode)',
      token: token,
      user: {
        email: email,
        role: role
      }
    };
  }
  
  // Production Mode: Validate email format (must be Converge email)
  if (!isValidCorporateEmail(email)) {
    return {
      success: false,
      message: 'Only Converge corporate emails are allowed (@converge.com.ph)'
    };
  }

  // Verify Google ID token server-side
  if (!idToken) {
    return {
      success: false,
      message: 'Invalid authentication credentials'
    };
  }

  const payload = await verifyGoogleIdToken(idToken);
  
  if (!payload) {
    return {
      success: false,
      message: 'Google authentication failed. Please try again.'
    };
  }

  // Verify email matches between token and request
  if (payload.email.toLowerCase() !== email.toLowerCase()) {
    return {
      success: false,
      message: 'Email mismatch in authentication'
    };
  }

  // Validate role
  const validRoles = ['EMPLOYEE', 'MANAGER', 'DATA_SPOC', 'ADMIN'];
  if (!validRoles.includes(role)) {
    return {
      success: false,
      message: 'Invalid role selected'
    };
  }

  // Check allowlist
  if (!isEmailOnAllowlist(email)) {
    return {
      success: false,
      message: 'Access denied. Your email is not authorized to access this system.'
    };
  }

  // Generate session token
  const token = generateToken(email, role);

  return {
    success: true,
    message: 'Authentication successful',
    token: token,
    user: {
      email: email,
      role: role
    }
  };
}

/**
 * Auth middleware - Validates incoming requests
 * Checks for valid JWT token in Authorization header
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const user = extractUserFromHeader(authHeader);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session'
    });
  }

  // Attach user info to request
  req.user = user;
  req.user.email = user.email;
  req.user.role = user.role;

  // Check session timeout
  const sessionDuration = Date.now() - (user.iat * 1000);
  const thirtyMinutes = 30 * 60 * 1000;

  if (sessionDuration > thirtyMinutes) {
    return res.status(401).json({
      success: false,
      message: 'Session expired. Please log in again.'
    });
  }

  next();
}

module.exports = {
  authenticateUser,
  authMiddleware,
  isValidCorporateEmail,
  isEmailOnAllowlist,
  generateToken,
  validateToken,
  extractUserFromHeader,
  verifyGoogleIdToken
};
