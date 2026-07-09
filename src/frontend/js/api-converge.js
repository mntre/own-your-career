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
   * Auto-detects based on environment:
   * - If running on localhost → use localhost:3001
   * - If running on a server (EC2, etc.) → use same host with port 3001
   */
  BASE_URL: (function() {
    var host = window.location.hostname;
    var protocol = window.location.protocol;
    
    // Local development
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3001/api';
    }
    
    // Production/EC2 with HTTPS: use same-origin /api path (nginx proxies to backend)
    if (protocol === 'https:') {
      console.log('[APIConverge] BASE_URL (HTTPS proxy):', protocol + '//' + host + '/api');
      return protocol + '//' + host + '/api';
    }
    
    // HTTP on remote server: use same host, port 3001
    var url = protocol + '//' + host + ':3001/api';
    console.log('[APIConverge] BASE_URL resolved to:', url);
    return url;
  })(),
  
  /**
   * Alternative base URL for local testing without backend
   * Set to null to use default BASE_URL
   */
  TEST_BASE_URL: null,

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
  },

  /* --------------------------------------------------------------------------
     ADMIN API METHODS
     -------------------------------------------------------------------------- */

  /**
   * Get system configuration
   * @returns {Promise<Object>} {success, config}
   */
  getSystemConfig: async function() {
    return this.request('GET', '/admin/system-config');
  },

  /**
   * Save system configuration
   * @param {Object} config - Configuration object
   * @returns {Promise<Object>} {success, message}
   */
  saveSystemConfig: async function(config) {
    return this.request('POST', '/admin/system-config', config);
  },

  /**
   * Get admin dashboard statistics
   * @returns {Promise<Object>} {success, stats}
   */
  getAdminStats: async function() {
    return this.request('GET', '/admin/stats');
  },

  /**
   * Send email reminders to incomplete employees
   * @returns {Promise<Object>} {success, message}
   */
  sendReminders: async function() {
    return this.request('POST', '/admin/send-reminders');
  },

  /**
   * Lock the system immediately
   * @returns {Promise<Object>} {success, message}
   */
  lockSystem: async function() {
    return this.request('POST', '/admin/lock-system');
  },

  /**
   * Export progress report as CSV
   * @returns {Promise<Object>} {success, data (CSV content)}
   */
  exportProgressReport: async function() {
    return this.request('GET', '/admin/export-progress-report');
  },

  /**
   * Get export history
   * @returns {Promise<Object>} {success, history}
   */
  getExportHistory: async function() {
    return this.request('GET', '/admin/export-history');
  },

  /**
   * Trigger SFTP export to SuccessFactors
   * @param {Object} options - Export options {format}
   * @returns {Promise<Object>} {success, message, exportRecord}
   */
  triggerSFTPExport: async function(options = {}) {
    return this.request('POST', '/admin/trigger-sftp-export', options);
  },

  /**
   * Get system audit log
   * @returns {Promise<Object>} {success, logs}
   */
  getAuditLog: async function() {
    return this.request('GET', '/admin/audit-log');
  },

  /**
   * Upload employee database CSV data (all columns as-is)
   * @param {Object} data - { headers: string[], rows: Object[] }
   * @returns {Promise<Object>} {success, message}
   */
  uploadEmployeeDatabase: async function(data) {
    return this.request('POST', '/admin/upload-employees', data);
  },

  /**
   * Auto-derive MANAGER roles from immediate_supervisor field
   * @returns {Promise<Object>} {success, message, managersDetected, matched, unresolved, roles}
   */
  deriveRolesFromHierarchy: async function() {
    return this.request('POST', '/admin/derive-roles');
  },

  /**
   * Get unresolved supervisors (for override UI)
   * @returns {Promise<Object>} {success, unresolved}
   */
  getUnresolvedSupervisors: async function() {
    return this.request('GET', '/admin/unresolved-supervisors');
  },

  /**
   * Get all supervisor override rules
   * @returns {Promise<Object>} {success, overrides}
   */
  getSupervisorOverrides: async function() {
    return this.request('GET', '/admin/supervisor-overrides');
  },

  /**
   * Set a supervisor override rule
   * @param {string} supervisorName
   * @param {string} resolvedEmployeeNo
   * @param {string} reason
   * @returns {Promise<Object>} {success, message}
   */
  setSupervisorOverride: async function(supervisorName, resolvedEmployeeNo, reason) {
    return this.request('POST', '/admin/supervisor-override', {
      supervisorName, resolvedEmployeeNo, reason
    });
  },

  /**
   * Delete a supervisor override
   * @param {number} id
   * @returns {Promise<Object>} {success, message}
   */
  deleteSupervisorOverride: async function(id) {
    return this.request('DELETE', `/admin/supervisor-override/${id}`);
  },

  /**
   * Re-derive roles after override changes
   * @returns {Promise<Object>} {success, message, managersDetected, roles}
   */
  reDeriveRoles: async function() {
    return this.request('POST', '/admin/re-derive-roles');
  },

  /**
   * Get all employees with current roles for role assignment UI
   * @returns {Promise<Object>} {success, employees, roleCount}
   */
  getRoleAssignmentData: async function() {
    return this.request('GET', '/admin/role-assignment');
  },

  /**
   * Update role for a single employee
   * @param {string} employeeNo - Employee number
   * @param {string} newRole - New role (EMPLOYEE, MANAGER, DATA_SPOC, ADMIN)
   * @returns {Promise<Object>} {success, message, employeeNo, newRole}
   */
  updateEmployeeRole: async function(employeeNo, newRole) {
    return this.request('POST', '/admin/update-role', {
      employeeNo: employeeNo,
      newRole: newRole
    });
  },

  /**
   * Bulk update roles for multiple employees via CSV
   * @param {Object} data - { headers: string[], rows: Object[] }
   * @returns {Promise<Object>} {success, message, updated, errors}
   */
  updateRolesBulk: async function(data) {
    return this.request('POST', '/admin/update-roles-bulk', data);
  },

  /* --------------------------------------------------------------------------
     WORKFLOW API METHODS (Steps 1-7)
     -------------------------------------------------------------------------- */

  /**
   * Save skills assessment (Step 1)
   * @param {string} employeeNo - Employee being assessed
   * @param {Object[]} skills - Array of { skillType, skillName, rating, remarks }
   * @returns {Promise<Object>} {success, message}
   */
  saveSkillsAssessment: async function(employeeNo, skills) {
    return this.request('POST', '/skills-assessment', { employeeNo, skills });
  },

  /**
   * Upload OKR data (Step 2)
   * @param {Object} okrData - { employeeNo, corporateOkr, groupOkr, departmentOkr, teamOkr, targetScore, actualScore, weight, okrStatus, corporate, businessGroup, department, team }
   * @returns {Promise<Object>} {success, message}
   */
  saveOkrUpload: async function(okrData) {
    return this.request('POST', '/okr-upload', okrData);
  },

  /**
   * Check OKR ownership for a hierarchy selection
   * @param {Object} params - { corporate, businessGroup, department, team }
   * @returns {Promise<Object>} {success, owned, ownedBy: {email, name}, isOwner}
   */
  checkOkrOwnership: async function(params) {
    const query = new URLSearchParams();
    if (params.corporate) query.set('corporate', params.corporate);
    if (params.businessGroup) query.set('businessGroup', params.businessGroup);
    if (params.department) query.set('department', params.department);
    if (params.team) query.set('team', params.team);
    return this.request('GET', '/okr-ownership?' + query.toString());
  },

  /**
   * Get all OKR ownership selections for current SPOC
   * @returns {Promise<Object>} {success, selections: [...]}
   */
  getMyOkrUploads: async function() {
    return this.request('GET', '/okr-ownership/mine');
  },

  /**
   * Get OKR upload status for current SPOC
   * Returns all hierarchies they own + employees under each
   * @returns {Promise<Object>} {success, uploads: [...]}
   */
  getOkrUploadStatus: async function() {
    return this.request('GET', '/okr-ownership/details');
  },

  /**
   * Delete OKR upload for a hierarchy selection
   * @param {Object} params - { corporate, businessGroup, department, team }
   * @returns {Promise<Object>} {success, message, deletedCount}
   */
  deleteOkrUpload: async function(params) {
    return this.request('DELETE', '/okr-upload', params);
  },

  /**
   * Save OKR draft to backend (persists across devices/sessions)
   * @param {Object} draftData - { corporate, businessGroup, department, team, csvData, formData }
   * @returns {Promise<Object>} {success, message}
   */
  saveOkrDraft: async function(draftData) {
    return this.request('POST', '/okr-draft', draftData);
  },

  /**
   * Get all OKR drafts for the current SPOC
   * @returns {Promise<Object>} {success, drafts: [...]}
   */
  getOkrDrafts: async function() {
    return this.request('GET', '/okr-drafts');
  },

  /**
   * Delete a specific OKR draft
   * @param {number} draftId - Draft ID to delete
   * @returns {Promise<Object>} {success, message}
   */
  deleteOkrDraft: async function(draftId) {
    return this.request('DELETE', '/okr-draft/' + draftId);
  },

  /**
   * Submit self-assessment (Step 3)
   * @param {string} employeeNo
   * @param {string} q1 - Answer to question 1
   * @param {string} q2 - Answer to question 2
   * @param {string} q3 - Answer to question 3
   * @param {string} q4 - Answer to question 4
   * @returns {Promise<Object>} {success, message}
   */
  saveSelfAssessment: async function(employeeNo, q1, q2, q3, q4) {
    return this.request('POST', '/self-assessment', { employeeNo, q1, q2, q3, q4 });
  },

  /**
   * Submit feed forward / manager assessment (Step 4)
   * @param {Object} feedForward - { employeeNo, comments, performanceRating, strengths, areasForImprovement }
   * @returns {Promise<Object>} {success, message}
   */
  saveFeedForward: async function(feedForward) {
    return this.request('POST', '/feed-forward', feedForward);
  },

  /**
   * Submit acknowledgement (Step 5 or Step 7)
   * @param {string} employeeNo
   * @param {number} step - 5 (Manager) or 7 (Employee)
   * @param {string} [comment] - Optional comment
   * @returns {Promise<Object>} {success, message}
   */
  saveAcknowledgement: async function(employeeNo, step, comment) {
    return this.request('POST', '/acknowledgement', { employeeNo, step, comment });
  },

  /**
   * Get workflow status for an employee (gate checking)
   * @param {string} employeeNo
   * @returns {Promise<Object>} {success, status: { step1Complete, ..., step7Complete }, isLocked}
   */
  getWorkflowStatus: async function(employeeNo) {
    return this.request('GET', `/workflow-status/${encodeURIComponent(employeeNo)}`);
  },

  /**
   * Get all scores for an employee (Step 6 - read only)
   * @param {string} employeeNo
   * @returns {Promise<Object>} {success, scores: { skills, okr, feedForward, selfAssessment, performanceBracket }}
   */
  getScores: async function(employeeNo) {
    return this.request('GET', `/scores/${encodeURIComponent(employeeNo)}`);
  },

  /**
   * Get team list for a manager (with workflow status per member)
   * @param {string} managerId - Manager email or employee number
   * @returns {Promise<Object>} {success, team: [], teamCount}
   */
  getTeam: async function(managerId) {
    return this.request('GET', `/team/${encodeURIComponent(managerId)}`);
  },

  /**
   * Get organizational hierarchy data (for DataSPOC dropdowns)
   * @param {string} spocId - SPOC email or employee number
   * @returns {Promise<Object>} {success, hierarchy, groups, departments}
   */
  getOrgData: async function(spocId) {
    return this.request('GET', `/org-data/${encodeURIComponent(spocId)}`);
  },

  /**
   * Get skill definitions (core skills)
   * @returns {Promise<Object>} {success, skills}
   */
  getSkillDefinitions: async function() {
    return this.request('GET', '/admin/skill-definitions');
  },

  /**
   * Get leadership skill definitions
   * @returns {Promise<Object>} {success, skills}
   */
  getLeadershipDefinitions: async function() {
    return this.request('GET', '/admin/leadership-definitions');
  },

  /**
   * Get org hierarchy (admin view)
   * @returns {Promise<Object>} {success, hierarchy}
   */
  getOrgHierarchy: async function() {
    return this.request('GET', '/admin/org-hierarchy');
  }
};

console.log('[APIConverge] Module loaded');
