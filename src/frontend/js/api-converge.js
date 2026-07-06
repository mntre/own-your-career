/**
 * Own Your Career — Converge Cloud API
 * 
 * HTTP-based API implementation for Converge Cloud platform.
 * Uses standard fetch() calls to communicate with Node.js/Express backend.
 * 
 * @fileoverview HTTP API for Converge Cloud deployment
 */

'use strict';

/**
 * Converge Cloud API implementation
 * Uses HTTP requests to Node.js backend
 */
const APIConverge = {
  /**
   * Base API endpoint URL
   * In development: 'http://localhost:3000/api'
   * In production: 'https://yourdomain.com/api'
   */
  BASE_URL: 'http://localhost:3000/api',

  /**
   * Login function (HTTP-based for Converge)
   * @param {string} email - User email
   * @param {string} role - User role
   * @param {string} googleCredential - Google ID token
   * @returns {Promise<Object>} Login response {success, token, user, message}
   */
  login: async function(email, role, googleCredential) {
    try {
      console.log('[APIConverge] Calling /api/login for:', email);
      
      const response = await fetch(`${this.BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          role: role,
          googleCredential: googleCredential
        })
      });

      if (!response.ok) {
        console.error('[APIConverge] HTTP error:', response.status);
        return {
          success: false,
          message: `Server error: ${response.status} ${response.statusText}`
        };
      }

      const data = await response.json();
      console.log('[APIConverge] Login response:', { success: data.success, email: data.user?.email });
      
      return data;
    } catch (error) {
      console.error('[APIConverge] Error during login:', error);
      return {
        success: false,
        message: `Network error: ${error.message}`
      };
    }
  },

  /**
   * Logout function (HTTP-based for Converge)
   * @returns {Promise<Object>} Logout response {success, message}
   */
  logout: async function() {
    try {
      console.log('[APIConverge] Calling /api/logout');
      
      const response = await fetch(`${this.BASE_URL}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('oyc_token')}`
        }
      });

      const data = await response.json();
      console.log('[APIConverge] Logout response:', data);
      
      return data;
    } catch (error) {
      console.error('[APIConverge] Error during logout:', error);
      return {
        success: false,
        message: `Network error: ${error.message}`
      };
    }
  },

  /**
   * Verify JWT token validity (client-side validation)
   * @param {string} token - JWT token
   * @returns {boolean} True if token is valid and not expired
   */
  verifyToken: function(token) {
    if (!token) return false;
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      // Decode payload (second part)
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      
      // Check if token is expired
      return payload.exp > now;
    } catch (e) {
      console.warn('[APIConverge] Token verification failed:', e.message);
      return false;
    }
  },

  /**
   * Decode JWT token (for inspection)
   * @param {string} token - JWT token
   * @returns {Object|null} Decoded payload or null if invalid
   */
  decodeToken: function(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      return JSON.parse(atob(parts[1]));
    } catch (e) {
      console.warn('[APIConverge] Token decode failed:', e.message);
      return null;
    }
  },

  /**
   * Make a generic HTTP request (for other API endpoints)
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
   * @param {string} endpoint - API endpoint path
   * @param {Object} data - Request body (for POST/PUT)
   * @returns {Promise<Object>} Response data
   */
  request: async function(method, endpoint, data = null) {
    try {
      const options = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('oyc_token')}`
        }
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${this.BASE_URL}${endpoint}`, options);
      
      if (!response.ok) {
        return {
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      return await response.json();
    } catch (error) {
      console.error(`[APIConverge] Request failed:`, error);
      return {
        success: false,
        message: error.message
      };
    }
  }
};

console.log('[APIConverge] Module loaded');
