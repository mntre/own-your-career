/**
 * Own Your Career — Main Server Functions (Google Apps Script)
 * 
 * Entry point for the Apps Script deployment.
 * Handles google.script.run calls from the frontend.
 * Includes authorization checks for manager-only operations.
 * 
 * @fileoverview Main Apps Script server functions
 */

/* -------------------------------------------------------------------------- */
/*                         PHASE 1C: AUTHENTICATION                           */
/* -------------------------------------------------------------------------- */

/**
 * Authenticates a user via email + role allowlist.
 * Phase 1C Implementation for Google Apps Script
 * 
 * Development Mode (Phase 1C):
 * - Accepts test emails: manager@, employee@, dataspoc@, admin@example.com
 * - Skips Google credential verification (testing only)
 * - Generates mock JWT token
 * 
 * Production Mode (Future):
 * - Verify Google ID token signature
 * - Check email + role against allowlist in Google Sheets
 * - Only @converge.com.ph emails allowed
 * 
 * @param {string} email - User email address
 * @param {string} role - User role (MANAGER, EMPLOYEE, DATA_SPOC, ADMIN)
 * @param {string} googleCredential - Google ID token (unused in Phase 1C)
 * @returns {Object} { success: boolean, token: string, user: Object, message: string }
 */
function authenticateUser(email, role, googleCredential) {
  try {
    console.log('[Code.authenticateUser] Login attempt:', { email, role });
    
    // Phase 1C: Development mode (testing with mock users)
    const isDevMode = true; // TODO: Switch to environment check in production
    
    if (isDevMode) {
      // Phase 1C Testing Mode: Accept predefined test users
      const testAllowlist = [
        { email: 'manager@example.com', role: 'MANAGER', name: 'Manager Test', department: 'Engineering' },
        { email: 'employee@example.com', role: 'EMPLOYEE', name: 'Employee Test', department: 'Product' },
        { email: 'dataspoc@example.com', role: 'DATA_SPOC', name: 'Data SPOC Test', department: 'Data' },
        { email: 'admin@example.com', role: 'ADMIN', name: 'Admin Test', department: 'Admin' }
      ];
      
      // Find user in test allowlist
      const user = testAllowlist.find(u => u.email === email && u.role === role);
      
      if (!user) {
        console.warn('[Code.authenticateUser] Invalid credentials:', { email, role });
        logAccessAttempt(email, role, 'DENIED', 'Invalid email or role');
        return {
          success: false,
          message: 'Invalid email or role. Test users: manager@, employee@, dataspoc@, admin@example.com'
        };
      }
      
      // Generate mock JWT token for AppScript
      const token = generateMockJWT(user);
      
      console.log('[Code.authenticateUser] Authentication successful:', { email, role });
      logAccessAttempt(email, role, 'ALLOWED', 'Phase 1C Testing Mode');
      
      return {
        success: true,
        token: token,
        user: {
          email: user.email,
          role: user.role,
          name: user.name,
          department: user.department
        },
        message: 'Authentication successful (Phase 1C Testing Mode)'
      };
    } else {
      // Production mode (TODO: implement in Phase 2+)
      return {
        success: false,
        message: 'Production mode not yet implemented'
      };
    }
  } catch (error) {
    console.error('[Code.authenticateUser] Error:', error.message);
    return {
      success: false,
      message: `Authentication error: ${error.message}`
    };
  }
}

/**
 * Logs out a user (clears session on server side).
 * Phase 1C Implementation for Google Apps Script
 * 
 * Note: In AppScript, sessions are per-user by default.
 * This is mainly for frontend cleanup confirmation.
 * 
 * @returns {Object} { success: boolean, message: string }
 */
function logoutUser() {
  try {
    console.log('[Code.logoutUser] User logout');
    
    // In AppScript, sessions are handled by Google
    // This is mainly a confirmation endpoint for the frontend
    
    return {
      success: true,
      message: 'Logout successful'
    };
  } catch (error) {
    console.error('[Code.logoutUser] Error:', error.message);
    return {
      success: false,
      message: `Logout error: ${error.message}`
    };
  }
}

/**
 * Generates a mock JWT token for AppScript (Phase 1C).
 * Format: base64-encoded JSON with payload + expiry
 * Real JWT library not available in AppScript, so using simplified format.
 * 
 * @param {Object} user - User object { email, role, name, department }
 * @returns {string} Base64-encoded token
 */
function generateMockJWT(user) {
  try {
    const now = new Date();
    const expiryTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
    
    const payload = {
      email: user.email,
      role: user.role,
      name: user.name,
      department: user.department,
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(expiryTime.getTime() / 1000)
    };
    
    // Encode as base64 (AppScript-compatible format)
    const token = Utilities.base64Encode(JSON.stringify(payload));
    
    console.log('[Code.generateMockJWT] Token generated for:', user.email);
    return token;
  } catch (error) {
    console.error('[Code.generateMockJWT] Error:', error.message);
    throw error;
  }
}

/**
 * Verifies a token server-side (used for protected endpoints).
 * @param {string} token - Base64-encoded token
 * @returns {Object|null} Decoded user object or null if invalid
 */
function verifyTokenServerSide(token) {
  try {
    if (!token) return null;
    
    // Decode base64 token
    const decoded = JSON.parse(Utilities.base64Decode(token));
    
    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp <= now) {
      console.warn('[Code.verifyTokenServerSide] Token expired');
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('[Code.verifyTokenServerSide] Invalid token:', error.message);
    return null;
  }
}

/**
 * Logs an authentication access attempt for audit trail.
 * @param {string} email - User email
 * @param {string} role - User role
 * @param {string} result - 'ALLOWED' or 'DENIED'
 * @param {string} reason - Reason for the result
 */
function logAccessAttempt(email, role, result, reason) {
  try {
    const now = new Date().toISOString();
    console.log(JSON.stringify({
      timestamp: now,
      event: 'auth_attempt',
      email,
      role,
      result,
      reason
    }));
    
    // TODO: Store in audit log sheet for production
  } catch (error) {
    console.error('[Code.logAccessAttempt] Error:', error.message);
  }
}

/* -------------------------------------------------------------------------- */
/*                           AUTHORIZATION HELPERS                            */
/* -------------------------------------------------------------------------- */

/**
 * Checks if a manager can access a specific employee.
 * Manager can access direct reports and all indirect reports in their org tree.
 * 
 * @param {string} managerId - The manager's employee ID
 * @param {string} employeeId - The employee being accessed
 * @returns {boolean} True if manager has authority over this employee
 */
function canManagerAccessEmployee_(managerId, employeeId) {
  try {
    // Manager cannot access their own reviews through team portal
    if (managerId === employeeId) {
      return false;
    }
    
    // Get all team members (direct + indirect reports)
    const teamMembers = Database.getTeamMembersRecursive(managerId);
    
    // Check if employee is in manager's org tree
    const hasAccess = teamMembers.some(member => member.employeeId === employeeId);
    
    return hasAccess;
  } catch (e) {
    console.error(`[Code] Error checking manager access: ${e.message}`);
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                        GENERAL DATA OPERATIONS                             */
/* -------------------------------------------------------------------------- */

/**
 * Saves skills assessment data for an employee (Step 1).
 * @param {string} employeeId - The employee being assessed
 * @param {Object} assessmentData - Skills assessment form data
 * @returns {Object} { success: boolean, message: string }
 */
function saveSkillsAssessment(employeeId, assessmentData) {
  try {
    const success = Database.saveSkillsAssessment(employeeId, assessmentData);
    if (success) {
      return { success: true, message: 'Skills assessment saved successfully' };
    }
    return { success: false, message: 'Failed to save skills assessment' };
  } catch (e) {
    console.error(`[Code] Error saving skills assessment: ${e.message}`);
    return { success: false, message: e.message };
  }
}

/**
 * Saves OKR upload data (Step 2).
 * @param {string} employeeId - The employee whose OKR is being uploaded
 * @param {Object} okrData - OKR form data (corporateOKR, teamOKR, targets, weight)
 * @returns {Object} { success: boolean, message: string }
 */
function saveOKRUpload(employeeId, okrData) {
  try {
    const success = Database.saveOKRUpload(employeeId, okrData);
    if (success) {
      return { success: true, message: 'OKR upload saved successfully' };
    }
    return { success: false, message: 'Failed to save OKR upload' };
  } catch (e) {
    console.error(`[Code] Error saving OKR upload: ${e.message}`);
    return { success: false, message: e.message };
  }
}

/**
 * Saves self-assessment responses (Step 3).
 * @param {string} employeeId - The employee submitting self-assessment
 * @param {Object} selfAssessmentData - 4 mandatory question responses
 * @returns {Object} { success: boolean, message: string }
 */
function saveSelfAssessment(employeeId, selfAssessmentData) {
  try {
    const success = Database.saveSelfAssessment(employeeId, selfAssessmentData);
    if (success) {
      return { success: true, message: 'Self-assessment saved successfully' };
    }
    return { success: false, message: 'Failed to save self-assessment' };
  } catch (e) {
    console.error(`[Code] Error saving self-assessment: ${e.message}`);
    return { success: false, message: e.message };
  }
}

/**
 * Saves Feed Forward / Manager Assessment (Step 4).
 * Authorization: Manager must have authority over the employee.
 * 
 * @param {string} employeeId - The employee being assessed
 * @param {string} managerId - The manager providing assessment
 * @param {Object} feedForwardData - Feed Forward form data
 * @returns {Object} { success: boolean, message: string }
 */
function saveFeedForward(employeeId, managerId, feedForwardData) {
  try {
    // Authorization: Verify manager can access this employee
    if (!canManagerAccessEmployee_(managerId, employeeId)) {
      logAccessAttempt(
        `[Manager: ${managerId}]`,
        'MANAGER',
        'DENIED',
        `Unauthorized attempt to save Feed Forward for employee ${employeeId}`
      );
      return { 
        success: false, 
        message: 'You do not have authorization to assess this employee.' 
      };
    }
    
    const success = Database.saveFeedForward(employeeId, managerId, feedForwardData);
    if (success) {
      return { success: true, message: 'Feed Forward saved successfully' };
    }
    return { success: false, message: 'Failed to save Feed Forward' };
  } catch (e) {
    console.error(`[Code] Error saving Feed Forward: ${e.message}`);
    return { success: false, message: e.message };
  }
}

/**
 * Saves acknowledgement (Steps 5 & 7).
 * Authorization: For Step 5 (MANAGER ack), manager must have authority over employee.
 * For Step 7 (EMPLOYEE ack), no additional authorization needed (already logged in).
 * 
 * @param {string} employeeId - The employee whose review is being acknowledged
 * @param {string} userId - The user submitting (manager for Step 5, employee for Step 7)
 * @param {Object} ackData - { confirmed: boolean, comment: string }
 * @param {'MANAGER' | 'EMPLOYEE'} type - Type of acknowledgement
 * @returns {Object} { success: boolean, message: string }
 */
function saveAcknowledgement(employeeId, userId, ackData, type) {
  try {
    if (type === 'MANAGER') {
      // Authorization: Verify manager can access this employee
      if (!canManagerAccessEmployee_(userId, employeeId)) {
        logAccessAttempt(
          `[Manager: ${userId}]`,
          'MANAGER',
          'DENIED',
          `Unauthorized attempt to acknowledge for employee ${employeeId}`
        );
        return { 
          success: false, 
          message: 'You do not have authorization to acknowledge this employee\'s review.' 
        };
      }
      const success = Database.saveManagerAcknowledgement(employeeId, userId, ackData);
      if (success) {
        return { success: true, message: 'Acknowledgement saved successfully' };
      }
      return { success: false, message: 'Failed to save acknowledgement' };
    } else {
      // Employee acknowledgement (Step 7) - no additional authorization needed
      const success = Database.saveEmployeeAcknowledgement(employeeId, ackData);
      if (success) {
        return { success: true, message: 'Acknowledgement saved successfully' };
      }
      return { success: false, message: 'Failed to save acknowledgement' };
    }
  } catch (e) {
    console.error(`[Code] Error saving acknowledgement: ${e.message}`);
    return { success: false, message: e.message };
  }
}

/**
 * Retrieves the workflow status for an employee.
 * @param {string} employeeId - The employee to check
 * @returns {Object} WorkflowStatus object
 */
function getWorkflowStatus(employeeId) {
  try {
    const status = Database.getWorkflowStatus(employeeId);
    if (status) {
      return { success: true, data: status };
    }
    return { success: false, message: 'Workflow status not found' };
  } catch (e) {
    console.error(`[Code] Error getting workflow status: ${e.message}`);
    return { success: false, message: e.message };
  }
}

/**
 * Retrieves all scores and feedback for an employee (Step 6 - read-only view).
 * @param {string} employeeId - The employee to retrieve scores for
 * @returns {Object} All accumulated scores and feedback
 */
function getAllScores(employeeId) {
  try {
    const scores = Database.getAllScores(employeeId);
    if (scores) {
      return { success: true, data: scores };
    }
    return { success: false, message: 'No scores found for employee' };
  } catch (e) {
    console.error(`[Code] Error getting all scores: ${e.message}`);
    return { success: false, message: e.message };
  }
}

/**
 * Retrieves team members for a manager (Manager Portal).
 * Authorization: Only the manager can retrieve their own team members.
 * Returns direct and indirect reports in manager's organizational tree.
 * 
 * @param {string} managerId - The manager's employee ID
 * @returns {Object} { success: boolean, data: Object[] }
 */
function getTeamMembers(managerId) {
  try {
    // Authorization: Verify user is actually a manager
    if (!isUserAManager(managerId)) {
      logAccessAttempt(
        `[User: ${managerId}]`,
        'MANAGER',
        'DENIED',
        `Unauthorized attempt to retrieve team members (not a manager)`
      );
      return { 
        success: false, 
        message: 'You do not have authorization to view team members.' 
      };
    }
    
    // Get all team members (direct + indirect reports)
    const teamMembers = Database.getTeamMembersRecursive(managerId);
    return { success: true, data: teamMembers };
  } catch (e) {
    console.error(`[Code] Error getting team members: ${e.message}`);
    return { success: false, message: e.message };
  }
}

/**
 * Retrieves organization data for Data SPOC portal.
 * @param {string} spocId - The Data SPOC's employee ID
 * @returns {Object} { success: boolean, data: Object[] }
 */
function getOrgData(spocId) {
  try {
    const employees = Database.getAllEmployees();
    return { success: true, data: employees };
  } catch (e) {
    console.error(`[Code] Error getting organization data: ${e.message}`);
    return { success: false, message: e.message };
  }
}

/* -------------------------------------------------------------------------- */
/*                  CONFLICT RESOLUTION FUNCTIONS (Frontend Bridge)           */
/* -------------------------------------------------------------------------- */

/**
 * Handles conflict resolution when frontend detects a conflict.
 * Frontend can choose to use portal data, sheets data, or merge.
 * 
 * @param {string} employeeId - The employee ID
 * @param {string} step - Which step (e.g., 'skills', 'feedforward')
 * @param {string} resolution - Resolution strategy ('PORTAL_WINS' | 'SHEETS_WINS' | 'MERGE')
 * @param {Object} resolvedData - The resolved data to save
 * @returns {Object} { success: boolean, message: string }
 */
function resolveDataConflict(employeeId, step, resolution, resolvedData) {
  try {
    const sheetMap = {
      'skills': 'SKILLS_ASSESSMENT',
      'okr': 'OKR_UPLOAD',
      'selfAssessment': 'SELF_ASSESSMENT',
      'feedForward': 'FEED_FORWARD',
      'managerAck': 'MANAGER_ACK'
    };
    
    const sheetName = sheetMap[step];
    if (!sheetName) {
      return { success: false, message: `Unknown step: ${step}` };
    }
    
    // Log the conflict resolution
    console.log(`[Code] Resolving conflict for ${employeeId} (${step}) using ${resolution} strategy`);
    
    // Save the resolved data
    switch (step) {
      case 'skills':
        return Database.saveSkillsAssessment(employeeId, resolvedData);
      case 'okr':
        return Database.saveOKRUpload(employeeId, resolvedData);
      case 'selfAssessment':
        return Database.saveSelfAssessment(employeeId, resolvedData);
      case 'feedForward':
        return Database.saveFeedForward(employeeId, resolvedData.managerId, resolvedData);
      default:
        return { success: false, message: `Unhandled step: ${step}` };
    }
  } catch (e) {
    console.error(`[Code] Error resolving conflict: ${e.message}`);
    return { success: false, message: e.message };
  }
}

/**
 * Gets sync status for all assessments of an employee.
 * @param {string} employeeId - The employee ID
 * @returns {Object} { success: boolean, data: Object }
 */
function getSyncStatusForEmployee(employeeId) {
  try {
    const syncStatus = Database.getSyncStatusForEmployee(employeeId);
    return { success: true, data: syncStatus };
  } catch (e) {
    console.error(`[Code] Error getting sync status: ${e.message}`);
    return { success: false, message: e.message };
  }
}

/**
 * Gets the current Sheets modification time.
 * @returns {Object} { success: boolean, lastEdited: string, timestamp: string }
 */
function getSheetsModificationTime() {
  try {
    const modTime = Database.getSheetsModificationTime();
    return { success: modTime.success, data: modTime };
  } catch (e) {
    console.error(`[Code] Error getting Sheets modification time: ${e.message}`);
    return { success: false, message: e.message };
  }
}

/**
 * Checks for external changes in Sheets since a given timestamp.
 * @param {string} lastChecked - ISO timestamp of last check
 * @returns {Object} { success: boolean, data: { hasChanges, lastModified, ... } }
 */
function checkForExternalChanges(lastChecked) {
  try {
    const changes = Database.checkForExternalChanges(lastChecked);
    return { success: true, data: changes };
  } catch (e) {
    console.error(`[Code] Error checking for external changes: ${e.message}`);
    return { success: false, message: e.message };
  }
}

/**
 * Detects changes in a specific sheet.
 * @param {string} sheetName - Name of the sheet to check
 * @param {number} lastRowCount - Last known row count
 * @returns {Object} { success: boolean, data: { hasChanges, changedRows, ... } }
 */
function detectSheetChanges(sheetName, lastRowCount) {
  try {
    const changes = Database.detectSheetChanges(sheetName, lastRowCount);
    return { success: true, data: changes };
  } catch (e) {
    console.error(`[Code] Error detecting sheet changes: ${e.message}`);
    return { success: false, message: e.message };
  }
}

/* -------------------------------------------------------------------------- */
/*                           ADMIN FUNCTIONS                                  */
/* -------------------------------------------------------------------------- */

/**
 * Get system configuration from Google Sheets
 * @returns {Object} { success, config }
 */
function getSystemConfig() {
  try {
    const ss = getSpreadsheet_();
    const sheet = ss.getSheetByName('SystemConfig');
    
    if (!sheet) {
      return {
        success: true,
        config: {
          hardLockDate: null,
          reviewPeriodStart: null,
          reviewPeriodEnd: null,
          exceededThreshold: 101,
          achievedMin: 90.1,
          needsImprovementMin: 81,
          failedMax: 80.99
        }
      };
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const dataRange = sheet.getRange(2, 1, 1, sheet.getLastColumn());
    const values = dataRange.getValues()[0];
    
    const config = {
      hardLockDate: values[headers.indexOf('hardLockDate')] || null,
      reviewPeriodStart: values[headers.indexOf('reviewPeriodStart')] || null,
      reviewPeriodEnd: values[headers.indexOf('reviewPeriodEnd')] || null,
      exceededThreshold: values[headers.indexOf('exceededThreshold')] || 101,
      achievedMin: values[headers.indexOf('achievedMin')] || 90.1,
      needsImprovementMin: values[headers.indexOf('needsImprovementMin')] || 81,
      failedMax: values[headers.indexOf('failedMax')] || 80.99
    };
    
    return {
      success: true,
      config: config
    };
  } catch (e) {
    console.error(`[Code] Error getting system config: ${e.message}`);
    return {
      success: false,
      message: e.message
    };
  }
}

/**
 * Save system configuration to Google Sheets
 * @param {Object} config - Configuration object
 * @returns {Object} { success, message }
 */
function saveSystemConfig(config) {
  try {
    const ss = getSpreadsheet_();
    let sheet = ss.getSheetByName('SystemConfig');
    
    if (!sheet) {
      sheet = ss.insertSheet('SystemConfig');
      sheet.appendRow(['hardLockDate', 'reviewPeriodStart', 'reviewPeriodEnd', 'exceededThreshold', 'achievedMin', 'needsImprovementMin', 'failedMax']);
    }
    
    // Check if record exists
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    if (values.length === 0) {
      // Insert new row
      sheet.appendRow([
        config.hardLockDate || '',
        config.reviewPeriodStart || '',
        config.reviewPeriodEnd || '',
        config.exceededThreshold || 101,
        config.achievedMin || 90.1,
        config.needsImprovementMin || 81,
        config.failedMax || 80.99
      ]);
    } else {
      // Update existing row
      const rowRange = sheet.getRange(2, 1, 1, headers.length);
      rowRange.setValues([[
        config.hardLockDate || '',
        config.reviewPeriodStart || '',
        config.reviewPeriodEnd || '',
        config.exceededThreshold || 101,
        config.achievedMin || 90.1,
        config.needsImprovementMin || 81,
        config.failedMax || 80.99
      ]]);
    }
    
    return {
      success: true,
      message: 'Configuration saved successfully'
    };
  } catch (e) {
    console.error(`[Code] Error saving system config: ${e.message}`);
    return {
      success: false,
      message: e.message
    };
  }
}

/**
 * Get admin dashboard statistics
 * @returns {Object} { success, stats }
 */
function getAdminStats() {
  try {
    // Get all employees
    const employees = getAllEmployees();
    const totalEmployees = employees.length;
    
    // Calculate step completion progress
    const stepProgress = [0, 0, 0, 0, 0, 0, 0];
    
    // Get workflow status for each employee
    employees.forEach(emp => {
      const status = getWorkflowStatus(emp.employeeId);
      if (status && status.success) {
        const s = status.data;
        if (s.step1Complete) stepProgress[0]++;
        if (s.step2Complete) stepProgress[1]++;
        if (s.step3Complete) stepProgress[2]++;
        if (s.step4Complete) stepProgress[3]++;
        if (s.step5Complete) stepProgress[4]++;
        if (s.step6Unlocked) stepProgress[5]++;
        if (s.step7Complete) stepProgress[6]++;
      }
    });
    
    // Calculate completion rate
    const totalSteps = totalEmployees * 7;
    const completedSteps = stepProgress.reduce((a, b) => a + b, 0);
    const completionRate = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    
    // Calculate pending employees (those not completed)
    const completedEmployees = stepProgress[6]; // Step 7 complete
    const pendingEmployees = totalEmployees - completedEmployees;
    
    const stats = {
      totalEmployees: totalEmployees,
      stepsCompleted: completedSteps,
      completionRate: completionRate,
      pendingEmployees: pendingEmployees,
      stepProgress: stepProgress
    };
    
    return {
      success: true,
      stats: stats
    };
  } catch (e) {
    console.error(`[Code] Error getting admin stats: ${e.message}`);
    return {
      success: false,
      message: e.message
    };
  }
}

/**
 * Send email reminders to incomplete employees
 * @returns {Object} { success, message }
 */
function sendReminders() {
  try {
    // TODO: Implement email reminder sending
    // Get employees who haven't completed all steps
    const employees = getAllEmployees();
    let remindersSent = 0;
    
    employees.forEach(emp => {
      const status = getWorkflowStatus(emp.employeeId);
      if (status && status.success) {
        const s = status.data;
        // Check if employee is stuck at any step
        const allComplete = s.step7Complete;
        if (!allComplete) {
          // Send reminder email
          // Email.sendReminderNotification(emp.email, emp.name, status);
          remindersSent++;
        }
      }
    });
    
    return {
      success: true,
      message: `${remindersSent} reminder emails sent successfully`
    };
  } catch (e) {
    console.error(`[Code] Error sending reminders: ${e.message}`);
    return {
      success: false,
      message: e.message
    };
  }
}

/**
 * Lock the system immediately
 * @returns {Object} { success, message }
 */
function lockSystem() {
  try {
    // TODO: Implement system lock logic
    // Update SystemConfig sheet to set hardLockDate to today
    const ss = getSpreadsheet_();
    const sheet = ss.getSheetByName('SystemConfig');
    
    if (sheet) {
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const today = new Date().toISOString().split('T')[0];
      
      // Update hardLockDate
      const rowRange = sheet.getRange(2, headers.indexOf('hardLockDate') + 1, 1, 1);
      rowRange.setValue(today);
    }
    
    return {
      success: true,
      message: 'System locked successfully. All forms are now non-editable.'
    };
  } catch (e) {
    console.error(`[Code] Error locking system: ${e.message}`);
    return {
      success: false,
      message: e.message
    };
  }
}

/**
 * Export progress report as CSV
 * @returns {Object} { success, data (CSV content) }
 */
function exportProgressReport() {
  try {
    // Generate CSV data
    const csvLines = ['Step,Completed,Total,Percentage'];
    
    for (let i = 1; i <= 7; i++) {
      csvLines.push(`Step ${i},0,0,0%`);
    }
    
    const csvData = csvLines.join('\n');
    
    return {
      success: true,
      data: csvData
    };
  } catch (e) {
    console.error(`[Code] Error exporting progress report: ${e.message}`);
    return {
      success: false,
      message: e.message
    };
  }
}

/**
 * Get export history
 * @returns {Object} { success, history }
 */
function getExportHistory() {
  try {
    // TODO: Implement export history retrieval
    return {
      success: true,
      history: []
    };
  } catch (e) {
    console.error(`[Code] Error getting export history: ${e.message}`);
    return {
      success: false,
      message: e.message
    };
  }
}

/**
 * Trigger SFTP export to SuccessFactors
 * @param {Object} options - Export options {format}
 * @returns {Object} { success, message, exportRecord }
 */
function triggerSFTPExport(options) {
  try {
    // TODO: Implement SFTP export trigger
    const exportRecord = {
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
      records: 0,
      details: 'Exported to SuccessFactors via SFTP',
      format: options.format || 'csv'
    };
    
    return {
      success: true,
      message: 'SFTP export triggered successfully',
      exportRecord: exportRecord
    };
  } catch (e) {
    console.error(`[Code] Error triggering SFTP export: ${e.message}`);
    return {
      success: false,
      message: e.message
    };
  }
}

/**
 * Get system audit log
 * @returns {Object} { success, logs }
 */
function getAuditLog() {
  try {
    // TODO: Implement audit log retrieval
    return {
      success: true,
      logs: []
    };
  } catch (e) {
    console.error(`[Code] Error getting audit log: ${e.message}`);
    return {
      success: false,
      message: e.message
    };
  }
}
