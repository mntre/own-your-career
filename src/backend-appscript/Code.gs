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
<<<<<<< Updated upstream
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
=======
/*                         SHARED LOGGING FUNCTION                            */
/* -------------------------------------------------------------------------- */

/**
 * Logs access attempts for audit trail.
 * @param {string} user - User identifier (email or ID)
 * @param {string} role - User role
 * @param {string} result - GRANTED or DENIED
 * @param {string} details - Additional details
 */
function logAccessAttempt(user, role, result, details) {
  try {
    const timestamp = new Date().toISOString();
    console.log(`[Access] ${timestamp} | User: ${user} | Role: ${role} | Result: ${result} | Details: ${details}`);
    // TODO: Store in audit log sheet for persistent logging
  } catch (e) {
    console.error(`[Code] Error logging access attempt: ${e.message}`);
  }
}

/* -------------------------------------------------------------------------- */
/*                     SHARED HELPER FUNCTIONS (for all files)                */
/* -------------------------------------------------------------------------- */

/**
 * Gets a sheet by name from Google Sheets.
 * @param {string} sheetName - Name of the sheet
 * @returns {Sheet} Google Sheets sheet object
 */
function getSheet_(sheetName) {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_ID not configured in Script Properties');
    }
    const ss = SpreadsheetApp.openById(spreadsheetId);
    if (!ss) {
      throw new Error('Spreadsheet not found. Check SPREADSHEET_ID in Script Properties.');
    }
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetName}`);
    }
    return sheet;
  } catch (e) {
    console.error(`[Code] Error getting sheet "${sheetName}": ${e.message}`);
    throw e;
>>>>>>> Stashed changes
  }
}

/**
<<<<<<< Updated upstream
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
=======
 * Gets the header row and creates a column name → index map.
 * @param {Sheet} sheet - Google Sheets sheet object
 * @returns {Object} Map of column names to indices (0-indexed)
 */
function getHeaderMap_(sheet) {
  try {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const map = {};
    headers.forEach((header, i) => {
      map[header.trim()] = i;
    });
    return map;
  } catch (e) {
    console.error(`[Code] Error getting header map: ${e.message}`);
    throw e;
>>>>>>> Stashed changes
  }
}

/**
<<<<<<< Updated upstream
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
=======
 * Gets an employee by ID from the Employees sheet.
 * @param {string} employeeId - Employee ID
 * @returns {Object} Employee object or null if not found
 */
function getEmployeeById_(employeeId) {
  try {
    const SHEETS = {
      EMPLOYEES: 'Employee Database'
    };
    
    const sheet = getSheet_(SHEETS.EMPLOYEES);
    const headerMap = getHeaderMap_(sheet);
    const employeeIdCol = headerMap['EmployeeID'];
    
    if (employeeIdCol === undefined) {
      console.error('[Code] EmployeeID column not found in Employees sheet');
      return null;
    }
    
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    for (let i = 0; i < values.length; i++) {
      if (values[i][employeeIdCol] === employeeId) {
        // Convert row to object using headers
        const row = values[i];
        const employee = {};
        Object.entries(headerMap).forEach(([colName, colIndex]) => {
          employee[colName] = row[colIndex];
        });
        return employee;
      }
    }
    
    return null;
  } catch (e) {
    console.error(`[Code] Error getting employee by ID: ${e.message}`);
>>>>>>> Stashed changes
    return null;
  }
}

/**
<<<<<<< Updated upstream
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
=======
 * Gets an employee by email from the Employees sheet.
 * @param {string} email - Employee email address
 * @returns {Object} Employee object or null if not found
 */
function getEmployeeByEmail_(email) {
  try {
    const SHEETS = {
      EMPLOYEES: 'Employee Database'
    };
    
    const sheet = getSheet_(SHEETS.EMPLOYEES);
    const headerMap = getHeaderMap_(sheet);
    const emailCol = headerMap['Email'];
    
    if (emailCol === undefined) {
      console.error('[Code] Email column not found in Employees sheet');
      return null;
    }
    
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    for (let i = 0; i < values.length; i++) {
      if (values[i][emailCol] === email) {
        // Convert row to object using headers
        const row = values[i];
        const employee = {};
        Object.entries(headerMap).forEach(([colName, colIndex]) => {
          employee[colName] = row[colIndex];
        });
        return employee;
      }
    }
    
    return null;
  } catch (e) {
    console.error(`[Code] Error getting employee by email: ${e.message}`);
    return null;
>>>>>>> Stashed changes
  }
}

/* -------------------------------------------------------------------------- */
/*                           AUTHORIZATION HELPERS                            */
/* -------------------------------------------------------------------------- */

/**
 * CRITICAL FIX: Checks if employeeId appears in ANY row's ManagerID column.
 * This function MUST return true for employee 1 (has reports: 3, 5).
 */
function isUserAManager(employeeId) {
  try {
    const sheet = getSheet_('Employee Database');
    const headerMap = getHeaderMap_(sheet);
    
    // Get ManagerID column using case-insensitive lookup
    let mgrCol = -1;
    for (const [name, idx] of Object.entries(headerMap)) {
      if (name.toLowerCase() === 'managerid') {
        mgrCol = idx;
        break;
      }
    }
    if (mgrCol < 0) return false;
    
    // Scan ALL rows for a match
    const data = sheet.getRange(2, 1, Math.max(1, sheet.getLastRow() - 1), sheet.getLastColumn()).getValues();
    for (const row of data) {
      if (row[mgrCol] === employeeId) {
        console.log(`[isUserAManager FIXED] YES: ${employeeId} is a manager`);
        return true;
      }
    }
    
    console.log(`[isUserAManager FIXED] NO: ${employeeId} is NOT a manager`);
    return false;
  } catch (e) {
    console.error(`[isUserAManager] Error: ${e}`);
    return false;
  }
}

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
    const teamMembers = getTeamMembersRecursive_(managerId);
    
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
 * Retrieves team members for a manager with full details and workflow status.
 * This is used by the Manager Portal to display the team overview.
 * 
 * @param {string} managerId - The manager's employee ID
 * @returns {Object} { success: boolean, data: Object[] }
 */
function getTeamMembersWithStatusData(managerId) {
  try {
    console.log(`[Code] getTeamMembersWithStatusData called with managerId: ${managerId}`);
    
    // Authorization: Verify user is actually a manager
    if (!isUserAManager(managerId)) {
      console.log(`[Code] User ${managerId} is not a manager`);
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
    
    console.log(`[Code] User ${managerId} is a manager, loading team members...`);
    
    // Get all team members (direct + indirect reports)
    const teamMembers = getTeamMembersRecursive_(managerId);
    
    console.log(`[Code] Retrieved ${teamMembers.length} team members`);
    
    if (teamMembers.length === 0) {
      console.warn(`[Code] WARNING: No team members found for manager ${managerId}`);
      console.log(`[Code] This manager may have no direct reports or the manager ID may not match the data`);
    }
    
    // Enhance with workflow status and Data SPOC details for each team member
    const enhancedTeamMembers = teamMembers.map(member => {
      // Find the employee ID column (handle case variations)
      let employeeId = null;
      if (member.EmployeeID) {
        employeeId = member.EmployeeID;
      } else if (member.employeeId) {
        employeeId = member.employeeId;
      } else {
        // Try to find it by checking all keys
        for (const key of Object.keys(member)) {
          if (key.toLowerCase() === 'employeeid') {
            employeeId = member[key];
            break;
          }
        }
      }
      
      const workflowStatus = getWorkflowStatusForTeam_(employeeId);
      
      // Lookup Data SPOC details if DataSpocID is provided
      let dataSPOCName = null;
      const dataSPOCId = member.DataSpocID || member.dataSPOCId || member.DataSPOCId;
      if (dataSPOCId) {
        const dataSPOC = getEmployeeById_(dataSPOCId);
        if (dataSPOC) {
          dataSPOCName = dataSPOC.Name || dataSPOC.name;
        }
      }
      
      console.log(`[Code] Team member enriched: ID=${employeeId}, Name=${member.Name || member.name}, DataSPOC=${dataSPOCName || 'None'}`);
      
      return {
        employeeId: employeeId,
        name: member.Name || member.name,
        email: member.Email || member.email,
        department: member.Department || member.department,
        band: member.Band || member.band,
        group: member.Group || member.group,
        team: member.Team || member.team,
        corporation: member.Corporation || member.corporation,
        managerEmployeeId: member.ManagerID || member.managerId,
        dataSPOCID: dataSPOCId || null,
        dataSPOCName: dataSPOCName || null,
        workflowStatus: workflowStatus
      };
    });
    
    console.log(`[Code] Returning ${enhancedTeamMembers.length} enhanced team members`);
    return { success: true, data: enhancedTeamMembers };
  } catch (e) {
    console.error(`[Code] Error getting team members with status: ${e.message}`);
    console.error(`[Code] Stack: ${e.stack}`);
    return { success: false, message: e.message };
  }
}

/**
 * Gets recursive team members (direct + indirect reports).
 * Helper function for getTeamMembersWithStatusData.
 * 
 * @param {string} managerId - The manager's employee ID
 * @returns {Object[]} Array of team members
 */
function getTeamMembersRecursive_(managerId) {
  try {
    const SHEETS = { EMPLOYEES: 'Employee Database' };
    const sheet = getSheet_(SHEETS.EMPLOYEES);
    const headerMap = getHeaderMap_(sheet);
    
    console.log(`[Code] getTeamMembersRecursive_ called with managerId: ${managerId}`);
    console.log(`[Code] managerId type: ${typeof managerId}`);
    console.log(`[Code] Header map keys:`, Object.keys(headerMap));
    
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    console.log(`[Code] Total employee records: ${values.length}`);
    
    // Find the exact manager ID column name (handle case variations)
    let managerIdColName = null;
    for (const colName of Object.keys(headerMap)) {
      if (colName.toLowerCase() === 'managerid') {
        managerIdColName = colName;
        break;
      }
    }
    
    if (!managerIdColName) {
      console.error(`[Code] ManagerID column not found. Available columns: ${Object.keys(headerMap).join(', ')}`);
      return [];
    }
    
    console.log(`[Code] Using manager ID column: "${managerIdColName}"`);
    
    // Find the exact employee ID column name (handle case variations)
    let employeeIdColName = null;
    for (const colName of Object.keys(headerMap)) {
      if (colName.toLowerCase() === 'employeeid') {
        employeeIdColName = colName;
        break;
      }
    }
    
    if (!employeeIdColName) {
      console.error(`[Code] EmployeeID column not found. Available columns: ${Object.keys(headerMap).join(', ')}`);
      return [];
    }
    
    console.log(`[Code] Using employee ID column: "${employeeIdColName}"`);
    
    // Convert rows to objects
    const employees = values.map((row, rowIndex) => {
      const employee = {};
      Object.entries(headerMap).forEach(([colName, colIndex]) => {
        employee[colName] = row[colIndex];
      });
      
      if (rowIndex < 10) {
        console.log(`[Code] Row ${rowIndex + 2}: ID=${employee[employeeIdColName]} (type: ${typeof employee[employeeIdColName]}), ManagerID=${employee[managerIdColName]} (type: ${typeof employee[managerIdColName]}), Name=${employee.Name}`);
      }
      
      return employee;
    });
    
    const result = [];
    const visited = new Set();
    
    const collectTeamMembers = (currentManagerId) => {
      if (visited.has(currentManagerId)) {
        console.log(`[Code] Already visited manager ${currentManagerId}, skipping`);
        return;
      }
      visited.add(currentManagerId);
      
      console.log(`[Code] Looking for direct reports of manager: ${currentManagerId} (type: ${typeof currentManagerId})`);
      
      // Find all direct reports of this manager
      const directReports = employees.filter(emp => {
        const empManagerId = emp[managerIdColName];
        const match = empManagerId === currentManagerId;
        
        // Debug first 3 comparisons
        if (directReports.length < 3 || result.length < 3) {
          console.log(`[Code]   Comparing: ${empManagerId} (type: ${typeof empManagerId}) === ${currentManagerId} (type: ${typeof currentManagerId}) => ${match}`);
        }
        
        return match;
      });
      
      console.log(`[Code] Found ${directReports.length} direct reports for manager ${currentManagerId}`);
      
      directReports.forEach(member => {
        const memberId = member[employeeIdColName];
        if (!visited.has(memberId)) {
          result.push(member);
          console.log(`[Code] Added team member: ID=${memberId}, Name=${member.Name}`);
          // Recursively get their team members
          collectTeamMembers(memberId);
        }
      });
    };
    
    collectTeamMembers(managerId);
    
    console.log(`[Code] Total team members found (direct + indirect): ${result.length}`);
    
    if (result.length === 0) {
      console.warn(`[Code] WARNING: No team members found. Possible causes:`);
      console.warn(`[Code] 1. Manager ${managerId} has no direct reports in the database`);
      console.warn(`[Code] 2. Employee IDs or ManagerID values don't match (check data types - number vs string)`);
      console.warn(`[Code] 3. All employees in database have blank ManagerID`);
      console.warn(`[Code] Debug: First employee's ManagerID value: ${employees[0] ? employees[0][managerIdColName] : 'NO EMPLOYEES'}`);
    }
    
    return result;
  } catch (e) {
    console.error(`[Code] Error getting recursive team members: ${e.message}`);
    console.error(`[Code] Stack: ${e.stack}`);
    return [];
  }
}

/**
 * Gets workflow status for a team member.
 * Helper function that enriches team member data with status info.
 * 
 * @param {string} employeeId - The employee ID
 * @returns {Object} Workflow status object
 */
function getWorkflowStatusForTeam_(employeeId) {
  try {
    const SHEETS = {
      WORKFLOW_STATUS: 'WorkflowStatus',
      SKILLS_ASSESSMENT: 'SkillsAssessment',
      OKR_UPLOAD: 'OKRUpload',
      SELF_ASSESSMENT: 'SelfAssessment',
      FEED_FORWARD: 'FeedForward',
      MANAGER_ACK: 'ManagerAcknowledgement'
    };
    
    // Try to read workflow status from sheet
    try {
      const sheet = getSheet_(SHEETS.WORKFLOW_STATUS);
      const headerMap = getHeaderMap_(sheet);
      
      // Find the employee ID column (handle case variations)
      let employeeIdColName = null;
      for (const colName of Object.keys(headerMap)) {
        if (colName.toLowerCase() === 'employeeid') {
          employeeIdColName = colName;
          break;
        }
      }
      
      if (!employeeIdColName) {
        throw new Error('EmployeeID column not found in WorkflowStatus sheet');
      }
      
      const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
      const values = dataRange.getValues();
      
      const employeeIdColIndex = headerMap[employeeIdColName];
      
      for (let i = 0; i < values.length; i++) {
        if (values[i][employeeIdColIndex] === employeeId) {
          // Found the status row
          const statusRow = {};
          Object.entries(headerMap).forEach(([colName, colIndex]) => {
            statusRow[colName] = values[i][colIndex];
          });
          return statusRow;
        }
      }
    } catch (e) {
      console.log(`[Code] WorkflowStatus sheet not accessible or employee not found, calculating from assessment sheets: ${e.message}`);
    }
    
    // Calculate status from assessment sheets if WorkflowStatus sheet unavailable or employee not found
    const status = {
      employeeId: employeeId,
      step1Complete: hasAssessmentData(SHEETS.SKILLS_ASSESSMENT, employeeId),
      step2Complete: hasAssessmentData(SHEETS.OKR_UPLOAD, employeeId),
      step3Complete: hasAssessmentData(SHEETS.SELF_ASSESSMENT, employeeId),
      step4Complete: hasAssessmentData(SHEETS.FEED_FORWARD, employeeId),
      step5Complete: hasAssessmentData(SHEETS.MANAGER_ACK, employeeId)
    };
    
    return status;
  } catch (e) {
    console.error(`[Code] Error getting workflow status for ${employeeId}: ${e.message}`);
    return {
      employeeId: employeeId,
      step1Complete: false,
      step2Complete: false,
      step3Complete: false,
      step4Complete: false,
      step5Complete: false
    };
  }
}

/**
 * Checks if an employee has submitted data for a specific sheet.
 * Helper function for workflow status calculation.
 * 
 * @param {string} sheetName - Name of the sheet to check
 * @param {string} employeeId - The employee ID
 * @returns {boolean} True if employee has data in that sheet
 */
function hasAssessmentData(sheetName, employeeId) {
  try {
    const sheet = getSheet_(sheetName);
    const headerMap = getHeaderMap_(sheet);
    
    // Find the employee ID column (handle case variations)
    let employeeIdColName = null;
    for (const colName of Object.keys(headerMap)) {
      if (colName.toLowerCase() === 'employeeid') {
        employeeIdColName = colName;
        break;
      }
    }
    
    if (!employeeIdColName) {
      console.warn(`[Code] EmployeeID column not found in ${sheetName}. Available columns: ${Object.keys(headerMap).join(', ')}`);
      return false;
    }
    
    const employeeIdColIndex = headerMap[employeeIdColName];
    
    if (employeeIdColIndex === undefined) {
      return false;
    }
    
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    for (let i = 0; i < values.length; i++) {
      if (values[i][employeeIdColIndex] === employeeId) {
        return true;
      }
    }
    
    return false;
  } catch (e) {
    console.error(`[Code] Error checking assessment data in ${sheetName}: ${e.message}`);
    return false;
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
/*                         MANAGER TEAM FUNCTIONS                             */
/* -------------------------------------------------------------------------- */

/**
 * Retrieves team members for a manager with full details and workflow status.
 * This is used by the Manager Portal to display the team overview.
 * 
 * @param {string} managerId - The manager's employee ID
 * @returns {Object} { success: boolean, data: Object[] }
 */
function getTeamMembersWithStatusData(managerId) {
  try {
    console.log(`[Code] getTeamMembersWithStatusData called with managerId: ${managerId}`);
    
    // Authorization: Verify user is actually a manager
    if (!isUserAManager(managerId)) {
      console.log(`[Code] User ${managerId} is not a manager`);
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
    
    console.log(`[Code] User ${managerId} is a manager, loading team members...`);
    
    // Get all team members (direct + indirect reports)
    const teamMembers = getTeamMembersRecursive_(managerId);
    
    console.log(`[Code] Retrieved ${teamMembers.length} team members`);
    
    if (teamMembers.length === 0) {
      console.warn(`[Code] WARNING: No team members found for manager ${managerId}`);
      console.log(`[Code] This manager may have no direct reports or the manager ID may not match the data`);
    }
    
    // Enhance with workflow status for each team member
    const enhancedTeamMembers = teamMembers.map(member => {
      // Find the employee ID column (handle case variations)
      let employeeId = member.EmployeeID || member.employeeId;
      
      return {
        employeeId: employeeId,
        name: member.Name || member.name,
        email: member.Email || member.email,
        department: member.Department || member.department,
        band: member.Band || member.band,
        group: member.Group || member.group,
        team: member.Team || member.team,
        corporation: member.Corporation || member.corporation,
        managerEmployeeId: member.ManagerID || member.managerId
      };
    });
    
    console.log(`[Code] Returning ${enhancedTeamMembers.length} enhanced team members`);
    return { success: true, data: enhancedTeamMembers };
  } catch (e) {
    console.error(`[Code] Error getting team members with status: ${e.message}`);
    console.error(`[Code] Stack: ${e.stack}`);
    return { success: false, message: e.message };
  }
}

/**
 * Gets recursive team members (direct + indirect reports).
 * Helper function for getTeamMembersWithStatusData.
 * 
 * @param {string} managerId - The manager's employee ID
 * @returns {Object[]} Array of team members
 */
function getTeamMembersRecursive_(managerId) {
  try {
    const SHEETS = { EMPLOYEES: 'Employee Database' };
    const sheet = getSheet_(SHEETS.EMPLOYEES);
    const headerMap = getHeaderMap_(sheet);
    
    console.log(`[Code] getTeamMembersRecursive_ called with managerId: ${managerId}`);
    console.log(`[Code] managerId type: ${typeof managerId}`);
    console.log(`[Code] Available columns:`, Object.keys(headerMap).join(', '));
    
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    console.log(`[Code] Total employee records: ${values.length}`);
    
    // Find the exact manager ID column name (handle case variations)
    let managerIdColName = null;
    for (const colName of Object.keys(headerMap)) {
      if (colName.toLowerCase() === 'managerid') {
        managerIdColName = colName;
        break;
      }
    }
    
    if (!managerIdColName) {
      console.error(`[Code] ManagerID column not found. Available columns: ${Object.keys(headerMap).join(', ')}`);
      return [];
    }
    
    console.log(`[Code] Using manager ID column: "${managerIdColName}"`);
    
    // Find the exact employee ID column name (handle case variations)
    let employeeIdColName = null;
    for (const colName of Object.keys(headerMap)) {
      if (colName.toLowerCase() === 'employeeid') {
        employeeIdColName = colName;
        break;
      }
    }
    
    if (!employeeIdColName) {
      console.error(`[Code] EmployeeID column not found. Available columns: ${Object.keys(headerMap).join(', ')}`);
      return [];
    }
    
    console.log(`[Code] Using employee ID column: "${employeeIdColName}"`);
    
    // Convert rows to objects
    const employees = values.map((row, rowIndex) => {
      const employee = {};
      Object.entries(headerMap).forEach(([colName, colIndex]) => {
        employee[colName] = row[colIndex];
      });
      return employee;
    });
    
    const result = [];
    const visited = new Set();
    
    const collectTeamMembers = (currentManagerId) => {
      if (visited.has(currentManagerId)) {
        console.log(`[Code] Already visited manager ${currentManagerId}, skipping`);
        return;
      }
      visited.add(currentManagerId);
      
      console.log(`[Code] Looking for direct reports of manager: ${currentManagerId}`);
      
      // Find all direct reports of this manager
      const directReports = employees.filter(emp => {
        const empManagerId = emp[managerIdColName];
        return empManagerId === currentManagerId;
      });
      
      console.log(`[Code] Found ${directReports.length} direct reports for manager ${currentManagerId}`);
      
      directReports.forEach(member => {
        const memberId = member[employeeIdColName];
        if (!visited.has(memberId)) {
          result.push(member);
          console.log(`[Code] Added team member: ID=${memberId}, Name=${member.Name}`);
          // Recursively get their team members
          collectTeamMembers(memberId);
        }
      });
    };
    
    collectTeamMembers(managerId);
    
    console.log(`[Code] Total team members found (direct + indirect): ${result.length}`);
    return result;
  } catch (e) {
    console.error(`[Code] Error getting recursive team members: ${e.message}`);
    console.error(`[Code] Stack: ${e.stack}`);
    return [];
  }
}
