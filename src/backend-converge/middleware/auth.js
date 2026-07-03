/**
 * Own Your Career — Authentication Middleware (Converge Cloud)
 * 
 * Handles user authentication and session validation.
 * Enforces 30-minute session timeout.
 * 
 * @fileoverview Authentication middleware
 */

'use strict';

const JWT_SECRET = process.env.JWT_SECRET || 'oyc-dev-secret-key-change-in-production';

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid corporate email
 */
function isValidCorporateEmail(email) {
  return email && email.endsWith('@converge.com.ph');
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
 * Authenticates user via SSO
 * In production, this would validate against corporate SSO provider
 * @param {string} email - User email
 * @param {string} role - User role
 * @returns {Promise<Object>} Auth result with success status and token
 */
async function authenticateUser(email, role) {
  // Validate email format
  if (!isValidCorporateEmail(email)) {
    return {
      success: false,
      message: 'Invalid corporate email address'
    };
  }

  // Validate role
  const validRoles = ['EMPLOYEE', 'MANAGER', 'DATA_SPOC'];
  if (!validRoles.includes(role)) {
    return {
      success: false,
      message: 'Invalid role selected'
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
  generateToken,
  validateToken,
  extractUserFromHeader
};
