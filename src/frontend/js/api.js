/**
 * Own Your Career — Mock API
 * 
 * Frontend-only mock API for local testing without a backend server.
 * Simulates Google OAuth login and role-based routing.
 * 
 * @fileoverview Mock API for Phase 1 local testing
 */

'use strict';

/**
 * Mock Test Users Allowlist
 * For Phase 1 testing only. Replace with real backend calls in Phase 2.
 */
const MOCK_ALLOWLIST = [
  {
    email: 'manager@example.com',
    role: 'MANAGER',
    name: 'Sample Manager',
    department: 'Sales'
  },
  {
    email: 'employee@example.com',
    role: 'EMPLOYEE',
    name: 'Sample Employee',
    department: 'Sales'
  },
  {
    email: 'dataspoc@example.com',
    role: 'DATA_SPOC',
    name: 'Sample Data SPOC',
    department: 'People Operations'
  },
  {
    email: 'admin@example.com',
    role: 'ADMIN',
    name: 'Sample Admin',
    department: 'People Operations'
  }
];

/**
 * Mock JWT Token (fake but valid structure for testing)
 * In Phase 2, this will be replaced with real JWT from backend
 */
function generateMockJWT(email, role) {
  // JWT format: header.payload.signature (all base64)
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: email,
    email: email,
    role: role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 60) // 30 min expiry
  }));
  const signature = 'mock_signature_' + email.replace(/[@.]/g, '_');
  
  return `${header}.${payload}.${signature}`;
}

/**
 * Global API object for login and authentication
 */
const API = {
  /**
   * Mock login function (replaces backend call)
   * @param {string} email - User email
   * @param {string} role - User role (EMPLOYEE, MANAGER, DATA_SPOC, ADMIN)
   * @param {string} googleCredential - Google ID token (unused in mock, but kept for compatibility)
   * @returns {Promise<Object>} Success/failure response
   */
  login: async function(email, role, googleCredential) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if email is in allowlist
    const user = MOCK_ALLOWLIST.find(u => u.email === email);
    
    if (!user) {
      return {
        success: false,
        message: `Email "${email}" is not authorized. Try: manager@example.com, employee@example.com, dataspoc@example.com, or admin@example.com`
      };
    }

    // Check if role matches
    if (user.role !== role) {
      return {
        success: false,
        message: `Invalid role for ${email}. Expected role: ${user.role}`
      };
    }

    // Generate mock JWT
    const token = generateMockJWT(email, role);

    return {
      success: true,
      token: token,
      user: {
        email: email,
        role: role,
        name: user.name,
        department: user.department
      },
      message: 'Login successful (mock)'
    };
  },

  /**
   * Mock logout function
   * @returns {Promise<Object>} Logout response
   */
  logout: async function() {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      success: true,
      message: 'Logged out successfully'
    };
  },

  /**
   * Verify JWT token validity (for session checks)
   * @param {string} token - JWT token
   * @returns {boolean} True if token is valid
   */
  verifyToken: function(token) {
    if (!token) return false;
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      
      // Check expiry
      return payload.exp > now;
    } catch (e) {
      return false;
    }
  },

  /**
   * Decode JWT token (for testing)
   * @param {string} token - JWT token
   * @returns {Object} Decoded payload
   */
  decodeToken: function(token) {
    try {
      const parts = token.split('.');
      return JSON.parse(atob(parts[1]));
    } catch (e) {
      return null;
    }
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}
