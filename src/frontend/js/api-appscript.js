/**
 * Own Your Career — Google Apps Script API
 * 
 * google.script.run-based API implementation for Google Apps Script platform.
 * Uses google.script.run to communicate with Code.gs backend functions.
 * 
 * @fileoverview google.script.run API for Google Apps Script deployment
 */

'use strict';

/**
 * Google Apps Script API implementation
 * Uses google.script.run for client-to-server calls
 */
const APIAppScript = {
  /**
   * Login function (google.script.run-based for AppScript)
   * @param {string} email - User email
   * @param {string} role - User role
   * @param {string} googleCredential - Google ID token
   * @returns {Promise<Object>} Login response {success, token, user, message}
   */
  login: async function(email, role, googleCredential) {
    return new Promise((resolve, reject) => {
      console.log('[APIAppScript] Calling authenticateUser for:', email);
      
      google.script.run
        .withSuccessHandler((result) => {
          console.log('[APIAppScript] authenticateUser success:', { success: result.success, email: result.user?.email });
          resolve(result);
        })
        .withFailureHandler((error) => {
          console.error('[APIAppScript] authenticateUser error:', error);
          reject({
            success: false,
            message: `Server error: ${error.message || error}`
          });
        })
        .authenticateUser(email, role, googleCredential);
    });
  },

  /**
   * Logout function (google.script.run-based for AppScript)
   * @returns {Promise<Object>} Logout response {success, message}
   */
  logout: async function() {
    return new Promise((resolve, reject) => {
      console.log('[APIAppScript] Calling logoutUser');
      
      google.script.run
        .withSuccessHandler((result) => {
          console.log('[APIAppScript] logoutUser success:', result);
          resolve(result);
        })
        .withFailureHandler((error) => {
          console.error('[APIAppScript] logoutUser error:', error);
          reject({
            success: false,
            message: `Server error: ${error.message || error}`
          });
        })
        .logoutUser();
    });
  },

  /**
   * Verify JWT token validity (client-side validation)
   * Same logic as Converge for consistency
   * @param {string} token - JWT token (or base64 string in AppScript)
   * @returns {boolean} True if token is valid and not expired
   */
  verifyToken: function(token) {
    if (!token) return false;
    
    try {
      // AppScript stores as base64 JSON, try to decode
      let payload;
      
      if (token.includes('.')) {
        // JWT format (standard)
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        payload = JSON.parse(atob(parts[1]));
      } else {
        // Base64 format (AppScript style)
        payload = JSON.parse(atob(token));
      }
      
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch (e) {
      console.warn('[APIAppScript] Token verification failed:', e.message);
      return false;
    }
  },

  /**
   * Decode JWT token (for inspection)
   * @param {string} token - JWT token or base64 string
   * @returns {Object|null} Decoded payload or null if invalid
   */
  decodeToken: function(token) {
    try {
      let payload;
      
      if (token.includes('.')) {
        // JWT format
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        payload = JSON.parse(atob(parts[1]));
      } else {
        // Base64 format
        payload = JSON.parse(atob(token));
      }
      
      return payload;
    } catch (e) {
      console.warn('[APIAppScript] Token decode failed:', e.message);
      return null;
    }
  },

  /**
   * Make a generic google.script.run request
   * @param {string} functionName - Name of backend function to call
   * @param {Array} args - Arguments to pass to function
   * @returns {Promise<Object>} Response from backend function
   */
  request: async function(functionName, args = []) {
    return new Promise((resolve, reject) => {
      try {
        console.log(`[APIAppScript] Calling ${functionName}`, args);
        
        google.script.run
          .withSuccessHandler((result) => {
            console.log(`[APIAppScript] ${functionName} success`, result);
            resolve(result);
          })
          .withFailureHandler((error) => {
            console.error(`[APIAppScript] ${functionName} error`, error);
            reject({
              success: false,
              message: `Server error: ${error.message || error}`
            });
          })[functionName](...args);
      } catch (error) {
        console.error(`[APIAppScript] Error calling ${functionName}:`, error);
        reject({
          success: false,
          message: error.message
        });
      }
    });
  },

  /* --------------------------------------------------------------------------
     ADMIN API METHODS
     -------------------------------------------------------------------------- */

  /**
   * Get system configuration
   * @returns {Promise<Object>} {success, config}
   */
  getSystemConfig: async function() {
    return this.request('getSystemConfig');
  },

  /**
   * Save system configuration
   * @param {Object} config - Configuration object
   * @returns {Promise<Object>} {success, message}
   */
  saveSystemConfig: async function(config) {
    return this.request('saveSystemConfig', [config]);
  },

  /**
   * Get admin dashboard statistics
   * @returns {Promise<Object>} {success, stats}
   */
  getAdminStats: async function() {
    return this.request('getAdminStats');
  },

  /**
   * Send email reminders to incomplete employees
   * @returns {Promise<Object>} {success, message}
   */
  sendReminders: async function() {
    return this.request('sendReminders');
  },

  /**
   * Lock the system immediately
   * @returns {Promise<Object>} {success, message}
   */
  lockSystem: async function() {
    return this.request('lockSystem');
  },

  /**
   * Export progress report as CSV
   * @returns {Promise<Object>} {success, data (CSV content)}
   */
  exportProgressReport: async function() {
    return this.request('exportProgressReport');
  },

  /**
   * Get export history
   * @returns {Promise<Object>} {success, history}
   */
  getExportHistory: async function() {
    return this.request('getExportHistory');
  },

  /**
   * Trigger SFTP export to SuccessFactors
   * @param {Object} options - Export options {format}
   * @returns {Promise<Object>} {success, message, exportRecord}
   */
  triggerSFTPExport: async function(options = {}) {
    return this.request('triggerSFTPExport', [options]);
  },

  /**
   * Get system audit log
   * @returns {Promise<Object>} {success, logs}
   */
  getAuditLog: async function() {
    return this.request('getAuditLog');
  },

  /**
   * Upload employee database CSV data (all columns as-is)
   * @param {Object} data - { headers: string[], rows: Object[] }
   * @returns {Promise<Object>} {success, message}
   */
  uploadEmployeeDatabase: async function(data) {
    return this.request('uploadEmployeeDatabase', [data]);
  }
};

console.log('[APIAppScript] Module loaded');
