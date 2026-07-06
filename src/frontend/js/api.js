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

    // Defensive check: ensure MOCK_ALLOWLIST is an array before using find
    if (!Array.isArray(MOCK_ALLOWLIST)) {
      console.error('[API] MOCK_ALLOWLIST is not an array');
      return {
        success: false,
        message: 'Server error: Invalid allowlist format'
      };
    }

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
  },

  /* --------------------------------------------------------------------------
     ADMIN API METHODS (Mock — for local testing)
     -------------------------------------------------------------------------- */

  /**
   * Get system configuration (mock)
   * @returns {Promise<Object>} {success, config}
   */
  getSystemConfig: async function() {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      success: true,
      config: {
        hardLockDate: null,
        reviewPeriodStart: '2026-01-01',
        reviewPeriodEnd: '2026-06-30',
        exceededThreshold: 101
      }
    };
  },

  /**
   * Save system configuration (mock)
   * @param {Object} config - Configuration object
   * @returns {Promise<Object>} {success, message}
   */
  saveSystemConfig: async function(config) {
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log('[API Mock] Saving config:', config);
    return {
      success: true,
      message: 'Configuration saved successfully (mock)'
    };
  },

  /**
   * Get admin dashboard statistics (mock)
   * @returns {Promise<Object>} {success, stats}
   */
  getAdminStats: async function() {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      success: true,
      stats: {
        totalEmployees: 25,
        stepsCompleted: 42,
        completionRate: 24,
        pendingEmployees: 19,
        stepProgress: [60, 48, 32, 20, 12, 8, 4]
      }
    };
  },

  /**
   * Send email reminders (mock)
   * @returns {Promise<Object>} {success, message}
   */
  sendReminders: async function() {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      success: true,
      message: '19 reminder emails sent successfully (mock)'
    };
  },

  /**
   * Lock the system (mock)
   * @returns {Promise<Object>} {success, message}
   */
  lockSystem: async function() {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      success: true,
      message: 'System locked successfully (mock)'
    };
  },

  /**
   * Export progress report (mock)
   * @returns {Promise<Object>} {success, data}
   */
  exportProgressReport: async function() {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      success: true,
      data: 'Step,Completed,Total,Percentage\nStep 1,15,25,60%\nStep 2,12,25,48%\nStep 3,8,25,32%\nStep 4,5,25,20%\nStep 5,3,25,12%\nStep 6,2,25,8%\nStep 7,1,25,4%'
    };
  },

  /**
   * Get export history (mock)
   * @returns {Promise<Object>} {success, history}
   */
  getExportHistory: async function() {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      success: true,
      history: []
    };
  },

  /**
   * Trigger SFTP export (mock)
   * @param {Object} options - Export options
   * @returns {Promise<Object>} {success, message, exportRecord}
   */
  triggerSFTPExport: async function(options) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      success: true,
      message: 'SFTP export triggered successfully (mock)',
      exportRecord: {
        timestamp: new Date().toISOString(),
        status: 'SUCCESS',
        records: 25,
        details: 'Exported to SuccessFactors (mock)'
      }
    };
  },

  /**
   * Get audit log (mock)
   * @returns {Promise<Object>} {success, logs}
   */
  getAuditLog: async function() {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      success: true,
      logs: [
        { timestamp: '2026-07-06 09:00:00', event: 'LOGIN', user: 'admin@example.com', action: 'Admin login', status: 'SUCCESS' },
        { timestamp: '2026-07-06 08:45:00', event: 'CONFIG_CHANGE', user: 'admin@example.com', action: 'Updated hard lock date', status: 'SUCCESS' }
      ]
    };
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}
