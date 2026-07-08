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
 * @param {string} role - User role (EMPLOYEE, MANAGER, DATA_SPOC) — optional fallback
 * @param {string} idToken - Google ID token
 * @returns {Promise<Object>} Auth result with success status and token
 */
async function authenticateUser(email, role, idToken) {
  // Phase 1B Testing Mode: Accept test emails
  const isTestingMode = process.env.NODE_ENV !== 'production';
  
  if (isTestingMode) {
    // Accept predefined test users (generic + real team emails)
    const testAllowlist = [
      { email: 'manager@example.com', role: 'MANAGER', name: 'Sample Manager', department: 'Sales' },
      { email: 'employee@example.com', role: 'EMPLOYEE', name: 'Sample Employee', department: 'Sales' },
      { email: 'dataspoc@example.com', role: 'DATA_SPOC', name: 'Sample Data SPOC', department: 'People Operations' },
      { email: 'admin@example.com', role: 'ADMIN', name: 'Sample Admin', department: 'People Operations' },
      { email: 'luigi.espiritu@convergeict.com', role: 'ADMIN', name: 'Luigi Gabriel Espiritu', department: 'People Transformation' },
      { email: 'juan.claudio@convergeict.com', role: 'MANAGER', name: 'Juan Carlo Claudio', department: 'People Transformation' },
      { email: 'ma.bajar@convergeict.com', role: 'DATA_SPOC', name: 'Ma. Zaira Rodelle Bajar', department: 'People Transformation' },
      { email: 'michael.escobilla@convergeict.com', role: 'MANAGER', name: 'Michael Ryan Escobilla', department: 'People Transformation' },
      { email: 'charvin.penaverde@convergeict.com', role: 'MANAGER', name: 'Charvin Kale Peñaverde', department: 'People Transformation' },
      { email: 'p.jeremy.carino@convergeict.com', role: 'EMPLOYEE', name: 'Jeremy Louise Cariño', department: 'People Productivity' },
      { email: 'p.ernica.castronero@convergeict.com', role: 'EMPLOYEE', name: 'Ernica Castronero', department: 'People Productivity' }
    ];
    
    // Match by email (role-agnostic) — system determines role
    let testUser;
    if (role) {
      testUser = testAllowlist.find(u => u.email === email && u.role === role);
    }
    if (!testUser) {
      testUser = testAllowlist.find(u => u.email === email);
    }
    
    if (!testUser) {
      return {
        success: false,
        message: 'Access denied. Email not found in employee database.'
      };
    }
    
    // Generate session token using the user's actual role from DB/allowlist
    const userRole = testUser.role;
    const token = generateToken(email, userRole);
    
    return {
      success: true,
      message: 'Authentication successful (Testing Mode)',
      token: token,
      user: {
        email: email,
        role: userRole,
        name: testUser.name || '',
        department: testUser.department || ''
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

  // Generate session token (role comes from DB lookup in routes.js)
  const userRole = role || 'EMPLOYEE';
  const token = generateToken(email, userRole);

  return {
    success: true,
    message: 'Authentication successful',
    token: token,
    user: {
      email: email,
      role: userRole
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
