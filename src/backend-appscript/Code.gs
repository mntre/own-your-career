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
  } catch (e) {
    console.error(`[Code] Error logging access attempt: ${e.message}`);
  }
}

/* -------------------------------------------------------------------------- */
/*                     SHARED HELPER FUNCTIONS (for all files)                */
/* -------------------------------------------------------------------------- */

/**
 * TASK 1: Parses roles from a Role column (handles multiple roles).
 * Accepts pipe (|) or comma (,) separated role strings.
 * Returns normalized array of valid role names.
 * 
 * Examples:
 * - "MANAGER|DATA_SPOC" → ["MANAGER", "DATA_SPOC"]
 * - "MANAGER, DATA_SPOC" → ["MANAGER", "DATA_SPOC"]
 * - "MANAGER" → ["MANAGER"]
 * - "" → []
 * - null → []
 * 
 * @param {string|null|undefined} rolesString - Role string from database
 * @returns {string[]} Array of normalized role names (uppercase, trimmed)
 */
function parseRoles(rolesString) {
  try {
    // Handle null/undefined
    if (rolesString === null || rolesString === undefined) {
      console.log(`[parseRoles] Null/undefined input, returning empty array`);
      return [];
    }
    
    // Convert to string and trim
    const trimmed = String(rolesString).trim();
    
    // Return empty array if empty string
    if (trimmed === '') {
      console.log(`[parseRoles] Empty string input, returning empty array`);
      return [];
    }
    
    // Split by pipe or comma
    const splitRoles = trimmed.split(/[,|]/).map(role => role.trim().toUpperCase()).filter(role => role !== '');
    
    console.log(`[parseRoles] Input: "${rolesString}" → Output: [${splitRoles.join(', ')}]`);
    
    // Validate each role is recognized
    const validRoles = ['ADMIN', 'MANAGER', 'DATA_SPOC', 'EMPLOYEE'];
    const result = splitRoles.filter(role => {
      const isValid = validRoles.includes(role);
      if (!isValid) {
        console.warn(`[parseRoles] Unrecognized role: "${role}" — filtered out`);
      }
      return isValid;
    });
    
    return result;
  } catch (e) {
    console.error(`[parseRoles] Error parsing roles "${rolesString}": ${e.message}`);
    return [];
  }
}

/**
 * TASK 1: Normalizes employee/manager IDs to a consistent numeric format.
 * Handles type coercion for both strings and numbers.
 * This fixes type mismatches like 1 vs "1" in ID comparisons.
 * 
 * @param {string|number|null|undefined} id - The ID to normalize
 * @returns {number|null} Normalized numeric ID or null if invalid
 */
function normalizeId(id) {
  try {
    // Handle null/undefined
    if (id === null || id === undefined) {
      return null;
    }
    
    // Convert to string, trim whitespace, then parse as integer
    const trimmed = String(id).trim();
    const parsed = parseInt(trimmed, 10);
    
    // Return parsed number if valid, otherwise null
    if (isNaN(parsed)) {
      console.warn(`[normalizeId] Invalid ID: "${id}" (type: ${typeof id}) - could not parse as number`);
      return null;
    }
    
    return parsed;
  } catch (e) {
    console.error(`[normalizeId] Error normalizing ID "${id}": ${e.message}`);
    return null;
  }
}

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
  }
}

/**
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
  }
}

/**
 * Gets an employee by ID from the Employees sheet.
 * @param {string|number} employeeId - Employee ID
 * @returns {Object|null} Employee object or null if not found
 */
function getEmployeeById_(employeeId) {
  try {
    const sheet = getSheet_('Employee Database');
    const headerMap = getHeaderMap_(sheet);
    const employeeIdCol = headerMap['EmployeeID'];
    
    if (employeeIdCol === undefined) {
      console.error('[Code] EmployeeID column not found in Employees sheet');
      return null;
    }
    
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    const normalizedSearchId = normalizeId(employeeId);
    
    for (let i = 0; i < values.length; i++) {
      const normalizedRowId = normalizeId(values[i][employeeIdCol]);
      if (normalizedRowId === normalizedSearchId) {
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
    return null;
  }
}

/**
 * Gets an employee by email from the Employees sheet.
 * @param {string} email - Employee email address
 * @returns {Object|null} Employee object or null if not found
 */
function getEmployeeByEmail_(email) {
  try {
    const sheet = getSheet_('Employee Database');
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
  }
}

/* -------------------------------------------------------------------------- */
/*                           AUTHORIZATION HELPERS                            */
/* -------------------------------------------------------------------------- */

/**
 * TASK 2: Checks if employeeId appears in ANY row's ManagerID column.
 * Uses normalizeId() for type-safe comparison.
 * @param {string|number} employeeId - Employee ID to check
 * @returns {boolean} True if employee is a manager
 */
function isUserAManager(employeeId) {
  try {
    const sheet = getSheet_('Employee Database');
    const headerMap = getHeaderMap_(sheet);
    
    // Get ManagerID column (handle case-insensitive)
    let mgrCol = -1;
    for (const [name, idx] of Object.entries(headerMap)) {
      if (name.toLowerCase() === 'managerid') {
        mgrCol = idx;
        break;
      }
    }
    if (mgrCol < 0) {
      console.error('[isUserAManager] ManagerID column not found');
      return false;
    }
    
    // Normalize the search ID
    const normalizedSearchId = normalizeId(employeeId);
    if (normalizedSearchId === null) {
      console.warn(`[isUserAManager] Invalid employeeId: ${employeeId}`);
      return false;
    }
    
    console.log(`[isUserAManager] Checking if ${employeeId} (normalized: ${normalizedSearchId}) is a manager...`);
    
    // Scan ALL rows for a match using normalized IDs
    const data = sheet.getRange(2, 1, Math.max(1, sheet.getLastRow() - 1), sheet.getLastColumn()).getValues();
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const normalizedRowManagerId = normalizeId(row[mgrCol]);
      
      // Debug logging for first 5 rows
      if (i < 5) {
        console.log(`[isUserAManager] Row ${i + 2}: ManagerID=${row[mgrCol]} (normalized: ${normalizedRowManagerId})`);
      }
      
      if (normalizedRowManagerId === normalizedSearchId) {
        console.log(`[isUserAManager] YES: ${employeeId} is a manager (matched at row ${i + 2})`);
        return true;
      }
    }
    
    console.log(`[isUserAManager] NO: ${employeeId} is NOT a manager`);
    return false;
  } catch (e) {
    console.error(`[isUserAManager] Error: ${e.message}`);
    return false;
  }
}

/**
 * Checks if a manager can access a specific employee.
 * @param {string|number} managerId - The manager's employee ID
 * @param {string|number} employeeId - The employee being accessed
 * @returns {boolean} True if manager has authority over this employee
 */
function canManagerAccessEmployee_(managerId, employeeId) {
  try {
    const normalizedManagerId = normalizeId(managerId);
    const normalizedEmployeeId = normalizeId(employeeId);
    
    // Manager cannot access their own reviews through team portal
    if (normalizedManagerId === normalizedEmployeeId) {
      return false;
    }
    
    // Get all team members (direct + indirect reports)
    const teamMembers = getTeamMembersRecursive_(managerId);
    
    // Check if employee is in manager's org tree using normalized IDs
    const hasAccess = teamMembers.some(member => {
      const memberId = normalizeId(member.EmployeeID || member.employeeId);
      return memberId === normalizedEmployeeId;
    });
    
    return hasAccess;
  } catch (e) {
    console.error(`[Code] Error checking manager access: ${e.message}`);
    return false;
  }
}

/**
 * TASK 4: Verifies user role from database (server-side RBAC).
 * This is the key workaround for OAuth limitations in AppScript.
 * OAuth only confirms identity; this confirms role + permissions.
 * 
 * @param {string} email - User email address (verified by OAuth)
 * @param {string} expectedRole - Expected role (optional, for validation)
 * @returns {Object} { success: boolean, role: string|null, employeeId: number|null, message: string }
 */
function verifyUserRoleFromDatabase(email, expectedRole) {
  try {
    console.log(`[verifyUserRoleFromDatabase] Verifying role for email: ${email}, expected role: ${expectedRole || 'any'}`);
    
    // Step 1: Look up employee by email
    const employee = getEmployeeByEmail_(email);
    
    if (!employee) {
      console.warn(`[verifyUserRoleFromDatabase] Employee not found for email: ${email}`);
      logAccessAttempt(email, 'UNAUTHENTICATED', 'DENIED', 'Employee not found in database');
      return {
        success: false,
        role: null,
        employeeId: null,
        message: `Employee record not found for ${email}. Please contact HR.`
      };
    }
    
    // Step 2: Extract role and employee ID from database
    const role = employee.Role || employee.role || 'EMPLOYEE';
    const employeeId = normalizeId(employee.EmployeeID || employee.employeeId);
    
    console.log(`[verifyUserRoleFromDatabase] Found employee: ID=${employeeId}, Role=${role}`);
    
    // Step 3: If expectedRole provided, validate it matches
    if (expectedRole && expectedRole !== role) {
      console.warn(`[verifyUserRoleFromDatabase] Role mismatch: expected=${expectedRole}, actual=${role}`);
      logAccessAttempt(email, role, 'DENIED', `Role mismatch: expected ${expectedRole} but got ${role}`);
      return {
        success: false,
        role: role,
        employeeId: employeeId,
        message: `Role mismatch. Your role is ${role}, but ${expectedRole} is required.`
      };
    }
    
    console.log(`[verifyUserRoleFromDatabase] Role verification successful for ${email} with role ${role}`);
    logAccessAttempt(email, role, 'GRANTED', 'Role verified from database');
    
    return {
      success: true,
      role: role,
      employeeId: employeeId,
      message: `Role verified: ${role}`
    };
  } catch (e) {
    console.error(`[verifyUserRoleFromDatabase] Error: ${e.message}`);
    logAccessAttempt(email, 'UNKNOWN', 'ERROR', `Exception: ${e.message}`);
    return {
      success: false,
      role: null,
      employeeId: null,
      message: `Error verifying role: ${e.message}`
    };
  }
}

/* -------------------------------------------------------------------------- */
/*                        GENERAL DATA OPERATIONS                             */
/* -------------------------------------------------------------------------- */

/**
 * Saves skills assessment data for an employee (Step 1).
 * Includes hard lock date validation: if deadline passed, blocks submission.
 * 
 * @param {string|number} employeeId - The employee being assessed
 * @param {Object} assessmentData - Skills assessment form data
 * @returns {Object} { success: boolean, message: string }
 */
function saveSkillsAssessment(employeeId, assessmentData) {
  try {
    console.log(`[Code] saveSkillsAssessment called for employee ${employeeId}`);
    
    // Check hard lock date before saving
    const lockDateStr = getSystemConfigValue('HARD_LOCK_DATE');
    if (lockDateStr) {
      const lockDate = new Date(lockDateStr);
      const now = new Date();
      
      if (now > lockDate) {
        console.warn(`[Code] Attempt to save after hard lock date for employee ${employeeId}`);
        return {
          success: false,
          message: `Cannot save: the submission deadline was ${lockDate.toLocaleString()}. No further edits are allowed.`
        };
      }
      
      console.log(`[Code] Hard lock date check passed (deadline: ${lockDate.toISOString()})`);
    }
    
    const success = Database.saveSkillsAssessment(employeeId, assessmentData);
    if (success && success.success !== false) {
      return { success: true, message: 'Skills assessment saved successfully' };
    }
    return { success: false, message: success?.message || 'Failed to save skills assessment' };
  } catch (e) {
    console.error(`[Code] Error saving skills assessment: ${e.message}`);
    return { success: false, message: e.message };
  }
}

/**
 * Saves OKR upload data (Step 2).
 * @param {string|number} employeeId - The employee whose OKR is being uploaded
 * @param {Object} okrData - OKR form data
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
 * Handles both new submissions and edits to existing submissions.
 * Includes hard lock date validation: if deadline passed, blocks submission.
 * 
 * @param {string|number} employeeId - The employee submitting self-assessment
 * @param {Object} selfAssessmentData - 4 mandatory question responses { q1, q2, q3, q4, dateSubmitted }
 * @returns {Object} { success: boolean, message: string, data?: { dateSubmitted: string } }
 */
function saveSelfAssessment(employeeId, selfAssessmentData) {
  try {
    console.log(`[Code] saveSelfAssessment called for employee ${employeeId}`);
    
    // Validate input
    if (!employeeId || !selfAssessmentData) {
      return { success: false, message: 'Invalid employee ID or assessment data' };
    }
    
    // Check hard lock date before saving
    const lockDateStr = Database.getSystemConfig('HARD_LOCK_DATE');
    if (lockDateStr) {
      const lockDate = new Date(lockDateStr);
      const now = new Date();
      
      if (now > lockDate) {
        console.warn(`[Code] Attempt to save after hard lock date for employee ${employeeId}`);
        return {
          success: false,
          message: `Cannot save: the submission deadline was ${lockDate.toLocaleString()}. No further edits are allowed.`
        };
      }
      
      console.log(`[Code] Hard lock date check passed (deadline: ${lockDate.toISOString()})`);
    }
    
    // Save to database
    const success = Database.saveSelfAssessment(employeeId, selfAssessmentData);
    
    if (success) {
      const timestamp = new Date().toISOString();
      console.log(`[Code] Self-assessment saved successfully for employee ${employeeId} at ${timestamp}`);
      return {
        success: true,
        message: 'Self-assessment saved successfully',
        data: {
          dateSubmitted: selfAssessmentData.dateSubmitted || timestamp
        }
      };
    }
    
    return { success: false, message: 'Failed to save self-assessment' };
  } catch (e) {
    console.error(`[Code] Error saving self-assessment: ${e.message}`);
    return { success: false, message: `Error: ${e.message}` };
  }
}

/**
 * Saves Feed Forward / Manager Assessment (Step 4).
 * Includes hard lock date validation and authorization checks.
 * 
 * @param {string|number} employeeId - The employee being assessed
 * @param {string|number} managerId - The manager providing assessment
 * @param {Object} feedForwardData - Feed Forward form data
 * @returns {Object} { success: boolean, message: string }
 */
function saveFeedForward(employeeId, managerId, feedForwardData) {
  try {
    console.log(`[Code] saveFeedForward called for employee ${employeeId} by manager ${managerId}`);
    
    // Check authorization
    if (!canManagerAccessEmployee_(managerId, employeeId)) {
      logAccessAttempt(
        `[Manager: ${managerId}]`,
        'MANAGER',
        'DENIED',
        `Unauthorized attempt to save Feed Forward for employee ${employeeId}`
      );
      return { success: false, message: 'You do not have authorization to assess this employee.' };
    }
    
    // Check hard lock date before saving
    const lockDateStr = getSystemConfigValue('HARD_LOCK_DATE');
    if (lockDateStr) {
      const lockDate = new Date(lockDateStr);
      const now = new Date();
      
      if (now > lockDate) {
        console.warn(`[Code] Attempt to save Feed Forward after hard lock date for employee ${employeeId}`);
        return {
          success: false,
          message: `Cannot save: the submission deadline was ${lockDate.toLocaleString()}. No further edits are allowed.`
        };
      }
      
      console.log(`[Code] Hard lock date check passed for Feed Forward (deadline: ${lockDate.toISOString()})`);
    }
    
    const success = Database.saveFeedForward(employeeId, managerId, feedForwardData);
    if (success && success.success !== false) {
      return { success: true, message: 'Feed Forward saved successfully' };
    }
    return { success: false, message: success?.message || 'Failed to save Feed Forward' };
  } catch (e) {
    console.error(`[Code] Error saving Feed Forward: ${e.message}`);
    return { success: false, message: e.message };
  }
}

/**
 * Saves employee acknowledgement (Step 7).
 * Includes hard lock date validation.
 * 
 * @param {string|number} employeeId - The employee submitting acknowledgement
 * @param {Object} ackData - Acknowledgement data { acknowledgement, dateSubmitted }
 * @returns {Object} { success: boolean, message: string }
 */
function saveEmployeeAcknowledgement(employeeId, ackData) {
  try {
    console.log(`[Code] saveEmployeeAcknowledgement called for employee ${employeeId}`);
    
    // Validate input
    if (!employeeId || !ackData) {
      return { success: false, message: 'Invalid employee ID or acknowledgement data' };
    }
    
    // Check hard lock date before saving
    const lockDateStr = Database.getSystemConfig('HARD_LOCK_DATE');
    if (lockDateStr) {
      const lockDate = new Date(lockDateStr);
      const now = new Date();
      
      if (now > lockDate) {
        console.warn(`[Code] Attempt to save employee acknowledgement after hard lock date for employee ${employeeId}`);
        return {
          success: false,
          message: `Cannot save: the submission deadline was ${lockDate.toLocaleString()}. No further edits are allowed.`
        };
      }
      
      console.log(`[Code] Hard lock date check passed for employee acknowledgement (deadline: ${lockDate.toISOString()})`);
    }
    
    // Save to database
    const success = Database.saveEmployeeAcknowledgement(employeeId, ackData);
    
    if (success) {
      const timestamp = new Date().toISOString();
      console.log(`[Code] Employee acknowledgement saved successfully for employee ${employeeId} at ${timestamp}`);
      return {
        success: true,
        message: 'Acknowledgement saved successfully',
        data: {
          dateSubmitted: ackData.dateSubmitted || timestamp
        }
      };
    }
    
    return { success: false, message: 'Failed to save employee acknowledgement' };
  } catch (e) {
    console.error(`[Code] Error saving employee acknowledgement: ${e.message}`);
    return { success: false, message: `Error: ${e.message}` };
  }
}

/**
 * Saves acknowledgement (Steps 5 & 7).
 * Includes hard lock date validation and authorization checks.
 * 
 * @param {string|number} employeeId - The employee whose review is being acknowledged
 * @param {string|number} userId - The user submitting (manager or employee)
 * @param {Object} ackData - Acknowledgement data
 * @param {'MANAGER'|'EMPLOYEE'} type - Type of acknowledgement
 * @returns {Object} { success: boolean, message: string }
 */
function saveAcknowledgement(employeeId, userId, ackData, type) {
  try {
    console.log(`[Code] saveAcknowledgement called for employee ${employeeId} (type: ${type})`);
    
    // Check hard lock date before saving
    const lockDateStr = getSystemConfigValue('HARD_LOCK_DATE');
    if (lockDateStr) {
      const lockDate = new Date(lockDateStr);
      const now = new Date();
      
      if (now > lockDate) {
        console.warn(`[Code] Attempt to save acknowledgement after hard lock date for employee ${employeeId}`);
        return {
          success: false,
          message: `Cannot save: the submission deadline was ${lockDate.toLocaleString()}. No further edits are allowed.`
        };
      }
      
      console.log(`[Code] Hard lock date check passed for acknowledgement (deadline: ${lockDate.toISOString()})`);
    }
    
    if (type === 'MANAGER') {
      // Verify manager authorization
      if (!canManagerAccessEmployee_(userId, employeeId)) {
        logAccessAttempt(
          `[Manager: ${userId}]`,
          'MANAGER',
          'DENIED',
          `Unauthorized attempt to acknowledge for employee ${employeeId}`
        );
        return { success: false, message: 'You do not have authorization to acknowledge this employee\'s review.' };
      }
      
      const success = Database.saveManagerAcknowledgement(employeeId, userId, ackData);
      if (success && success.success !== false) {
        return { success: true, message: 'Manager acknowledgement saved successfully' };
      }
      return { success: false, message: success?.message || 'Failed to save acknowledgement' };
    } else {
      // Employee acknowledgement (Step 7)
      const success = Database.saveEmployeeAcknowledgement(employeeId, ackData);
      if (success && success.success !== false) {
        return { success: true, message: 'Employee acknowledgement saved successfully' };
      }
      return { success: false, message: success?.message || 'Failed to save acknowledgement' };
    }
  } catch (e) {
    console.error(`[Code] Error saving acknowledgement: ${e.message}`);
    return { success: false, message: e.message };
  }
}

/**
 * Retrieves the workflow status for an employee.
 * @param {string|number} employeeId - The employee to check
 * @returns {Object} { success: boolean, data: Object|null }
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
 * @param {string|number} employeeId - The employee to retrieve scores for
 * @returns {Object} { success: boolean, data: Object|null }
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

/* -------------------------------------------------------------------------- */
/*              TEAM MEMBER RETRIEVAL WITH TYPE NORMALIZATION                 */
/* -------------------------------------------------------------------------- */

/**
 * TASK 3: Gets recursive team members (direct + indirect reports).
 * Uses normalizeId() to fix type mismatches during comparison.
 * @param {string|number} managerId - The manager's employee ID
 * @returns {Object[]} Array of team members
 */
function getTeamMembersRecursive_(managerId) {
  try {
    const sheet = getSheet_('Employee Database');
    const headerMap = getHeaderMap_(sheet);
    
    const normalizedManagerId = normalizeId(managerId);
    console.log(`[getTeamMembersRecursive_] Called with managerId: ${managerId} (normalized: ${normalizedManagerId})`);
    
    // Find column names (case-insensitive)
    let managerIdColName = null;
    let employeeIdColName = null;
    
    for (const colName of Object.keys(headerMap)) {
      if (colName.toLowerCase() === 'managerid') {
        managerIdColName = colName;
      }
      if (colName.toLowerCase() === 'employeeid') {
        employeeIdColName = colName;
      }
    }
    
    if (!managerIdColName || !employeeIdColName) {
      console.error(`[getTeamMembersRecursive_] Missing columns. ManagerID: ${managerIdColName}, EmployeeID: ${employeeIdColName}`);
      return [];
    }
    
    console.log(`[getTeamMembersRecursive_] Using columns: ManagerID="${managerIdColName}", EmployeeID="${employeeIdColName}"`);
    
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    console.log(`[getTeamMembersRecursive_] Total employee records: ${values.length}`);
    
    // Convert rows to objects with normalized IDs
    const employees = values.map((row, rowIndex) => {
      const employee = {};
      Object.entries(headerMap).forEach(([colName, colIndex]) => {
        employee[colName] = row[colIndex];
      });
      
      const rawId = employee[employeeIdColName];
      const rawMgrId = employee[managerIdColName];
      const normId = normalizeId(rawId);
      const normMgrId = normalizeId(rawMgrId);
      
      // Debug first 10 rows
      if (rowIndex < 10) {
        console.log(`[getTeamMembersRecursive_] Row ${rowIndex + 2}: ID=${rawId}→${normId}, ManagerID=${rawMgrId}→${normMgrId}, Name=${employee.Name || 'N/A'}`);
      }
      
      return employee;
    });
    
    const result = [];
    const visited = new Set();
    
    const collectTeamMembers = (currentManagerIdParam) => {
      const currentNormalizedId = normalizeId(currentManagerIdParam);
      
      if (visited.has(currentNormalizedId)) {
        console.log(`[getTeamMembersRecursive_] Already visited ${currentNormalizedId}, skipping`);
        return;
      }
      visited.add(currentNormalizedId);
      
      console.log(`[getTeamMembersRecursive_] Looking for direct reports of manager: ${currentManagerIdParam} (normalized: ${currentNormalizedId})`);
      
      // Find all direct reports using normalized IDs
      const directReports = employees.filter(emp => {
        const empRawMgrId = emp[managerIdColName];
        const empNormalizedMgrId = normalizeId(empRawMgrId);
        const match = empNormalizedMgrId === currentNormalizedId;
        
        // Debug first 3 comparisons
        if (result.length < 3) {
          console.log(`[getTeamMembersRecursive_]   Comparing ${empRawMgrId}→${empNormalizedMgrId} === ${currentManagerIdParam}→${currentNormalizedId} => ${match}`);
        }
        
        return match;
      });
      
      console.log(`[getTeamMembersRecursive_] Found ${directReports.length} direct reports for manager ${currentNormalizedId}`);
      
      directReports.forEach(member => {
        const memberId = normalizeId(member[employeeIdColName]);
        if (!visited.has(memberId)) {
          result.push(member);
          console.log(`[getTeamMembersRecursive_] Added team member: ID=${memberId}, Name=${member.Name || 'N/A'}`);
          // Recursively get their team members
          collectTeamMembers(memberId);
        }
      });
    };
    
    collectTeamMembers(managerId);
    
    console.log(`[getTeamMembersRecursive_] Total team members (direct + indirect): ${result.length}`);
    
    if (result.length === 0) {
      console.warn(`[getTeamMembersRecursive_] WARNING: No team members found`);
      console.warn(`[getTeamMembersRecursive_] Possible causes:`);
      console.warn(`[getTeamMembersRecursive_] 1. Manager ${managerId} has no direct reports`);
      console.warn(`[getTeamMembersRecursive_] 2. ID type mismatch (check if IDs are numbers vs strings)`);
      console.warn(`[getTeamMembersRecursive_] 3. First employee ManagerID: ${employees[0] ? employees[0][managerIdColName] : 'N/A'}`);
    }
    
    return result;
  } catch (e) {
    console.error(`[getTeamMembersRecursive_] Error: ${e.message}`);
    console.error(`[getTeamMembersRecursive_] Stack: ${e.stack}`);
    return [];
  }
}

/**
 * Gets workflow status for a team member (helper).
 * @param {string|number} employeeId - Employee ID
 * @returns {Object} Workflow status
 */
function getWorkflowStatusForTeam_(employeeId) {
  try {
    const status = Database.getWorkflowStatus(employeeId);
    return status || {
      employeeId: employeeId,
      step1Complete: false,
      step2Complete: false,
      step3Complete: false,
      step4Complete: false,
      step5Complete: false,
      step6Unlocked: false,
      step7Complete: false
    };
  } catch (e) {
    console.error(`[getWorkflowStatusForTeam_] Error: ${e.message}`);
    return {};
  }
}

/**
 * TASK 5: Retrieves team members for a manager with full details and workflow status.
 * FIX: Skip redundant isUserAManager() check. Instead:
 * 1. Get user's role from database via verifyUserRoleFromDatabase()
 * 2. If role != MANAGER, deny access
 * 3. If role == MANAGER, load team via getTeamMembersRecursive_()
 * 4. Return team members (even if empty - manager might have no reports)
 * 
 * This avoids double sheet reads and uses the working getTeamMembersRecursive_() logic.
 * 
 * @param {string|number} managerId - The manager's employee ID
 * @returns {Object} { success: boolean, data: Object[], message: string }
 */
function getTeamMembersWithStatusData(managerId) {
  try {
    console.log(`[getTeamMembersWithStatusData] Called with managerId: ${managerId}`);
    
    // Normalize the input ID for consistent comparison
    const normalizedManagerId = normalizeId(managerId);
    console.log(`[getTeamMembersWithStatusData] Normalized managerId: ${managerId} → ${normalizedManagerId}`);
    
    if (normalizedManagerId === null) {
      console.error(`[getTeamMembersWithStatusData] Invalid manager ID: ${managerId}`);
      return { 
        success: false, 
        message: 'Invalid manager ID format.' 
      };
    }
    
    // Step 1: Get the employee record to verify role
    const employee = getEmployeeById_(normalizedManagerId);
    
    if (!employee) {
      console.log(`[getTeamMembersWithStatusData] Employee not found for ID: ${normalizedManagerId}`);
      logAccessAttempt(
        `[User: ${normalizedManagerId}]`,
        'UNKNOWN',
        'DENIED',
        'Employee not found'
      );
      return { 
        success: false, 
        message: 'Employee record not found.' 
      };
    }
    
    // Step 2: Check if user has MANAGER role
    const userRole = employee.Role || employee.role || 'EMPLOYEE';
    console.log(`[getTeamMembersWithStatusData] User ${normalizedManagerId} has role: ${userRole}`);
    
    if (userRole !== 'MANAGER') {
      console.log(`[getTeamMembersWithStatusData] Access denied: ${normalizedManagerId} is not a MANAGER (role=${userRole})`);
      logAccessAttempt(
        `[User: ${normalizedManagerId}]`,
        userRole,
        'DENIED',
        'User role is not MANAGER'
      );
      return { 
        success: false, 
        message: 'You do not have authorization to view team members.' 
      };
    }
    
    console.log(`[getTeamMembersWithStatusData] User ${normalizedManagerId} is a manager, loading team members...`);
    
    // Step 3: Get all team members (direct + indirect reports)
    const teamMembers = getTeamMembersRecursive_(normalizedManagerId);
    
    console.log(`[getTeamMembersWithStatusData] Retrieved ${teamMembers.length} team members`);
    
    if (teamMembers.length === 0) {
      console.log(`[getTeamMembersWithStatusData] No team members found for manager ${normalizedManagerId} (may have no direct reports)`);
    }
    
    // Step 4: Enhance with workflow status
    const enhancedTeamMembers = teamMembers.map(member => {
      const rawEmployeeId = member.EmployeeID || member.employeeId;
      const employeeId = normalizeId(rawEmployeeId);
      const workflowStatus = getWorkflowStatusForTeam_(employeeId);
      
      return {
        employeeId: employeeId,
        name: member.Name || member.name || 'N/A',
        email: member.Email || member.email || 'N/A',
        department: member.Department || member.department || 'N/A',
        band: member.Band || member.band || 'N/A',
        group: member.Group || member.group || 'N/A',
        team: member.Team || member.team || 'N/A',
        corporation: member.Corporation || member.corporation || 'N/A',
        managerEmployeeId: normalizeId(member.ManagerID || member.managerId) || null,
        workflowStatus: workflowStatus,
        step1Complete: workflowStatus ? workflowStatus.step1Complete : false,
        step4Complete: workflowStatus ? workflowStatus.step4Complete : false,
        step5Complete: workflowStatus ? workflowStatus.step5Complete : false
      };
    });
    
    console.log(`[getTeamMembersWithStatusData] Returning ${enhancedTeamMembers.length} enhanced team members`);
    return { success: true, data: enhancedTeamMembers };
  } catch (e) {
    console.error(`[getTeamMembersWithStatusData] Error: ${e.message}`);
    console.error(`[getTeamMembersWithStatusData] Stack: ${e.stack}`);
    return { success: false, message: e.message };
  }
}

/* -------------------------------------------------------------------------- */
/*                   WORKFLOW STEP DETECTION (TASK 1)                         */
/* -------------------------------------------------------------------------- */

/**
 * TASK 1: Determines an employee's current workflow step by checking
 * which data sheets contain completed records.
 * 
 * Step progression is inferred from timestamps in respective sheets:
 * - No records = Step 1 (Skills Assessment not yet completed)
 * - Has Self-Assessment = Step 3+
 * - Has Feed Forward = Step 5+ (Feed Forward implies Skills & OKR complete)
 * - Has Manager Acknowledgement = Step 5+ (still at Step 5 until employee completes Step 7)
 * - Has Employee Acknowledgement = Step 7 (workflow complete)
 * 
 * Hard gate logic: Step 3 locked until Steps 1 & 2 complete
 * @param {string|number} employeeId - The employee to check
 * @returns {Object} {
 *   step: number,                  // Current step (1-7)
 *   completedSteps: number[],      // Array of completed step numbers
 *   hasSkillsAssessment: boolean,  // Step 1 data exists
 *   hasSelfAssessment: boolean,    // Step 3 data exists
 *   hasFeedForward: boolean,       // Step 4 data exists
 *   hasManagerAck: boolean,        // Step 5 data exists
 *   hasEmployeeAck: boolean,       // Step 7 data exists
 *   selfAssessmentId: string|null  // For pre-populating existing form
 * }
 */
function getCurrentWorkflowStep(employeeId) {
  try {
    console.log(`[getCurrentWorkflowStep] Checking workflow step for employee: ${employeeId}`);
    
    // Initialize state
    const state = {
      hasSkillsAssessment: false,
      hasSelfAssessment: false,
      hasFeedForward: false,
      hasManagerAck: false,
      hasEmployeeAck: false,
      selfAssessmentId: null
    };
    
    // Helper: Check if employee has data in a sheet
    const hasDataInSheet = (sheetName) => {
      try {
        const sheet = getSheet_(sheetName);
        const headers = getHeaderMap_(sheet);
        const employeeIdCol = headers['EmployeeID'] || headers['employeeId'];
        
        if (employeeIdCol === undefined) {
          console.warn(`[getCurrentWorkflowStep] EmployeeID column not found in ${sheetName}`);
          return false;
        }
        
        const dataRange = sheet.getRange(2, 1, Math.max(1, sheet.getLastRow() - 1), sheet.getLastColumn());
        const values = dataRange.getValues();
        
        for (let i = 0; i < values.length; i++) {
          const rowEmpId = normalizeId(values[i][employeeIdCol]);
          const searchId = normalizeId(employeeId);
          
          if (rowEmpId === searchId) {
            console.log(`[getCurrentWorkflowStep] Found record in ${sheetName}`);
            return true;
          }
        }
        
        return false;
      } catch (e) {
        console.error(`[getCurrentWorkflowStep] Error checking ${sheetName}: ${e.message}`);
        return false;
      }
    };
    
    // Check each step in sequence
    state.hasSkillsAssessment = hasDataInSheet('SkillsAssessment');
    state.hasSelfAssessment = hasDataInSheet('SelfAssessment');
    state.hasFeedForward = hasDataInSheet('FeedForward');
    state.hasManagerAck = hasDataInSheet('ManagerAcknowledgement');
    state.hasEmployeeAck = hasDataInSheet('EmployeeAcknowledgement');
    
    console.log(`[getCurrentWorkflowStep] State:`, state);
    
    // Determine current step based on completion state
    let currentStep = 1;
    const completedSteps = [];
    
    // If Skills Assessment exists, Step 1 is complete
    if (state.hasSkillsAssessment) {
      completedSteps.push(1);
      console.log(`[getCurrentWorkflowStep] Step 1 complete (Skills Assessment found)`);
    }
    
    // If Self-Assessment exists, Steps 1, 2, 3 are complete (Step 2 managed by Data SPOC)
    if (state.hasSelfAssessment) {
      if (!completedSteps.includes(1)) completedSteps.push(1);
      if (!completedSteps.includes(2)) completedSteps.push(2);
      completedSteps.push(3);
      currentStep = 4;
      console.log(`[getCurrentWorkflowStep] Step 3 complete (Self-Assessment found), now at Step ${currentStep}`);
    }
    
    // If Feed Forward exists, Steps 1-4 are complete
    if (state.hasFeedForward) {
      if (!completedSteps.includes(1)) completedSteps.push(1);
      if (!completedSteps.includes(2)) completedSteps.push(2);
      if (!completedSteps.includes(3)) completedSteps.push(3);
      completedSteps.push(4);
      currentStep = 5;
      console.log(`[getCurrentWorkflowStep] Step 4 complete (Feed Forward found), now at Step ${currentStep}`);
    }
    
    // If Manager Acknowledgement exists, Steps 1-5 are complete
    if (state.hasManagerAck) {
      if (!completedSteps.includes(1)) completedSteps.push(1);
      if (!completedSteps.includes(2)) completedSteps.push(2);
      if (!completedSteps.includes(3)) completedSteps.push(3);
      if (!completedSteps.includes(4)) completedSteps.push(4);
      completedSteps.push(5);
      currentStep = 6;  // Step 6 is view-only, then Step 7 when employee acknowledges
      console.log(`[getCurrentWorkflowStep] Step 5 complete (Manager Ack found), now at Step ${currentStep}`);
    }
    
    // If Employee Acknowledgement exists, all steps complete
    if (state.hasEmployeeAck) {
      if (!completedSteps.includes(1)) completedSteps.push(1);
      if (!completedSteps.includes(2)) completedSteps.push(2);
      if (!completedSteps.includes(3)) completedSteps.push(3);
      if (!completedSteps.includes(4)) completedSteps.push(4);
      if (!completedSteps.includes(5)) completedSteps.push(5);
      completedSteps.push(6);
      completedSteps.push(7);
      currentStep = 7;
      console.log(`[getCurrentWorkflowStep] Step 7 complete (Employee Ack found), workflow complete`);
    }
    
    // Sort completed steps
    completedSteps.sort((a, b) => a - b);
    
    const result = {
      step: currentStep,
      completedSteps: completedSteps,
      hasSkillsAssessment: state.hasSkillsAssessment,
      hasSelfAssessment: state.hasSelfAssessment,
      hasFeedForward: state.hasFeedForward,
      hasManagerAck: state.hasManagerAck,
      hasEmployeeAck: state.hasEmployeeAck,
      selfAssessmentId: null  // Could be fetched if needed
    };
    
    console.log(`[getCurrentWorkflowStep] Result: Current Step = ${result.step}, Completed = [${result.completedSteps.join(', ')}]`);
    
    return result;
  } catch (e) {
    console.error(`[getCurrentWorkflowStep] Error: ${e.message}`);
    console.error(`[getCurrentWorkflowStep] Stack: ${e.stack}`);
    return {
      step: 1,
      completedSteps: [],
      hasSkillsAssessment: false,
      hasSelfAssessment: false,
      hasFeedForward: false,
      hasManagerAck: false,
      hasEmployeeAck: false,
      selfAssessmentId: null
    };
  }
}

/**
 * Wrapper for google.script.run frontend calls.
 * Enables checking current step from the portal.
 * @param {string|number} employeeId - The employee to check
 * @returns {Object} Workflow step info
 */
function getWorkflowStepForPortal(employeeId) {
  return getCurrentWorkflowStep(employeeId);
}

/* -------------------------------------------------------------------------- */
/*                    STEP VISIBILITY RULES (TASK 2)                          */
/* -------------------------------------------------------------------------- */

/**
 * TASK 2: Determines visibility and editability of each step based on
 * the employee's current workflow position.
 * 
 * Visibility rules:
 * - Step 1 (Skills): visible at Step 5+, never editable
 * - Step 2 (OKR): visible at Step 3+, never editable
 * - Step 3 (Self-Assessment): visible at Step 3+, editable at Step 3 (until hard lock)
 * - Step 4 (Feed Forward): visible at Step 5+, never editable
 * - Step 5 (Manager Ack): visible at Step 5+, never editable
 * - Step 6 (Manager Scores): visible at Step 5+, never editable
 * - Step 7 (Employee Ack): visible at Step 5+, editable (until hard lock)
 * 
 * @param {string|number} employeeId - The employee
 * @returns {Object} {
 *   step1: { visible: boolean, editable: boolean },
 *   step2: { visible: boolean, editable: boolean },
 *   ...
 *   step7: { visible: boolean, editable: boolean }
 * }
 */
function getStepVisibility(employeeId) {
  try {
    console.log(`[getStepVisibility] Getting visibility rules for employee: ${employeeId}`);
    
    // Get current workflow step
    const workflowState = getCurrentWorkflowStep(employeeId);
    const currentStep = workflowState.step;
    
    console.log(`[getStepVisibility] Employee at Step ${currentStep}`);
    
    // Check if form is locked due to hard deadline
    let isFormLocked = false;
    try {
      const lockResult = checkFormLockStatus();
      isFormLocked = lockResult.isLocked || false;
      console.log(`[getStepVisibility] Form locked status: ${isFormLocked}`);
    } catch (e) {
      console.warn(`[getStepVisibility] Could not check lock status: ${e.message}`);
      isFormLocked = false;
    }
    
    // Build visibility map based on current step
    const visibility = {
      step1: {
        visible: currentStep >= 5,
        editable: false  // Steps 1, 2, 4, 5, 6 never editable
      },
      step2: {
        visible: currentStep >= 3,
        editable: false
      },
      step3: {
        visible: currentStep >= 3,
        editable: currentStep === 3 && !isFormLocked  // Editable only at Step 3 and not locked
      },
      step4: {
        visible: currentStep >= 5,
        editable: false
      },
      step5: {
        visible: currentStep >= 5,
        editable: false
      },
      step6: {
        visible: currentStep >= 5,
        editable: false
      },
      step7: {
        visible: currentStep >= 5,
        editable: currentStep >= 5 && !isFormLocked  // Editable from Step 5 onwards, until locked
      }
    };
    
    console.log(`[getStepVisibility] Visibility map:`, visibility);
    
    return visibility;
  } catch (e) {
    console.error(`[getStepVisibility] Error: ${e.message}`);
    console.error(`[getStepVisibility] Stack: ${e.stack}`);
    
    // Return safe defaults (all hidden, none editable) on error
    return {
      step1: { visible: false, editable: false },
      step2: { visible: false, editable: false },
      step3: { visible: false, editable: false },
      step4: { visible: false, editable: false },
      step5: { visible: false, editable: false },
      step6: { visible: false, editable: false },
      step7: { visible: false, editable: false }
    };
  }
}

/**
 * Wrapper for google.script.run frontend calls.
 * @param {string|number} employeeId - The employee to check
 * @returns {Object} Step visibility rules
 */
function getStepVisibilityForPortal(employeeId) {
  return getStepVisibility(employeeId);
}

/* -------------------------------------------------------------------------- */
/*                    ROLE-BASED OKR DATA FETCHING (TASK 3)                   */
/* -------------------------------------------------------------------------- */

/**
 * TASK 3: Fetches role-specific OKR data for an employee based on their
 * organizational level (Band/Grade).
 * 
 * OKR Formula by Role:
 * - Group Heads: 10% Corporate + 90% Group OKR
 * - Department Heads: 60% Group + 40% Department OKR
 * - Team Leads: 60% Department + 40% Team OKR
 * - Team Members: 100% Team OKR
 * 
 * @param {string|number} employeeId - The employee
 * @returns {Object} {
 *   roleLevel: string,             // e.g., "Team Lead", "Group Head"
 *   okrs: [{
 *     level: string,               // "Corporate", "Group", "Department", "Team"
 *     items: [{
 *       okrTitle: string,
 *       description: string,
 *       target: string,
 *       weight: number
 *     }]
 *   }]
 * }
 */
function getOKRDataByRole(employeeId) {
  try {
    console.log(`[getOKRDataByRole] Fetching OKR data for employee: ${employeeId}`);
    
    // Step 1: Get employee info to determine role/level
    const employee = getEmployeeById_(employeeId);
    
    if (!employee) {
      console.warn(`[getOKRDataByRole] Employee not found: ${employeeId}`);
      return {
        roleLevel: 'Unknown',
        okrs: []
      };
    }
    
    // Determine role level from Band/Grade or explicit Role field
    const band = employee.Band || employee.band || '';
    const grade = employee.Grade || employee.grade || '';
    const role = employee.Role || employee.role || 'EMPLOYEE';
    
    console.log(`[getOKRDataByRole] Employee ${employeeId}: Band=${band}, Grade=${grade}, Role=${role}`);
    
    // Helper function to map role to OKR levels
    const getRoleLevelAndOKRSheets = (band, grade, role) => {
      // Determine organizational level from Band or Grade
      // This is a simplified mapping - adjust based on your org hierarchy
      
      const bandUpper = String(band).toUpperCase();
      const gradeUpper = String(grade).toUpperCase();
      
      // Group Head indicators
      if (bandUpper.includes('GROUP HEAD') || bandUpper.includes('GH') || 
          gradeUpper.includes('GROUP HEAD') || role === 'GROUP_HEAD') {
        return {
          levelName: 'Group Head',
          sheets: [
            { level: 'Corporate', sheet: 'CorporateOKR' },
            { level: 'Group', sheet: 'GroupOKR' }
          ]
        };
      }
      
      // Department Head indicators
      if (bandUpper.includes('DEPARTMENT HEAD') || bandUpper.includes('DH') ||
          gradeUpper.includes('DEPARTMENT HEAD') || role === 'DEPARTMENT_HEAD') {
        return {
          levelName: 'Department Head',
          sheets: [
            { level: 'Group', sheet: 'GroupOKR' },
            { level: 'Department', sheet: 'DepartmentOKR' }
          ]
        };
      }
      
      // Team Lead indicators
      if (bandUpper.includes('TEAM LEAD') || bandUpper.includes('TL') ||
          gradeUpper.includes('TEAM LEAD') || role === 'TEAM_LEAD') {
        return {
          levelName: 'Team Lead',
          sheets: [
            { level: 'Department', sheet: 'DepartmentOKR' },
            { level: 'Team', sheet: 'TeamOKR' }
          ]
        };
      }
      
      // Default: Team Member
      return {
        levelName: 'Team Member',
        sheets: [
          { level: 'Team', sheet: 'TeamOKR' }
        ]
      };
    };
    
    const roleInfo = getRoleLevelAndOKRSheets(band, grade, role);
    console.log(`[getOKRDataByRole] Determined role level: ${roleInfo.levelName}`);
    console.log(`[getOKRDataByRole] OKR sheets to fetch: ${roleInfo.sheets.map(s => s.sheet).join(', ')}`);
    
    // Step 2: Fetch OKR data from appropriate sheets
    const okrs = [];
    
    for (const sheetInfo of roleInfo.sheets) {
      try {
        const sheetName = sheetInfo.sheet;
        const level = sheetInfo.level;
        
        console.log(`[getOKRDataByRole] Fetching ${level} OKR from sheet: ${sheetName}`);
        
        const sheet = getSheet_(sheetName);
        const headers = getHeaderMap_(sheet);
        
        if (!headers || Object.keys(headers).length === 0) {
          console.warn(`[getOKRDataByRole] Sheet ${sheetName} has no headers`);
          okrs.push({
            level: level,
            items: []
          });
          continue;
        }
        
        // Get data rows
        const dataRange = sheet.getRange(2, 1, Math.max(1, sheet.getLastRow() - 1), sheet.getLastColumn());
        const values = dataRange.getValues();
        
        // Parse OKR items from sheet
        const items = values.map((row, rowIndex) => {
          const rowObj = {};
          Object.entries(headers).forEach(([colName, colIndex]) => {
            rowObj[colName] = row[colIndex];
          });
          
          // Filter by employee if EmployeeID column exists
          const empIdCol = headers['EmployeeID'] || headers['employeeId'];
          if (empIdCol !== undefined) {
            const rowEmpId = normalizeId(rowObj['EmployeeID'] || rowObj['employeeId']);
            const searchId = normalizeId(employeeId);
            if (rowEmpId !== searchId) {
              return null;  // Skip rows not matching this employee
            }
          }
          
          return {
            okrTitle: rowObj['OKRTitle'] || rowObj['Title'] || rowObj['okrTitle'] || 'Unnamed OKR',
            description: rowObj['Description'] || rowObj['description'] || '',
            target: rowObj['Target'] || rowObj['target'] || '',
            weight: parseFloat(rowObj['Weight'] || rowObj['weight'] || 0) || 0
          };
        }).filter(item => item !== null);
        
        console.log(`[getOKRDataByRole] Found ${items.length} OKR items for level: ${level}`);
        
        okrs.push({
          level: level,
          items: items
        });
        
      } catch (e) {
        console.warn(`[getOKRDataByRole] Could not fetch ${sheetInfo.sheet}: ${e.message}`);
        okrs.push({
          level: sheetInfo.level,
          items: []
        });
      }
    }
    
    const result = {
      roleLevel: roleInfo.levelName,
      okrs: okrs
    };
    
    console.log(`[getOKRDataByRole] Returning OKR data with ${okrs.length} levels`);
    return result;
    
  } catch (e) {
    console.error(`[getOKRDataByRole] Error: ${e.message}`);
    console.error(`[getOKRDataByRole] Stack: ${e.stack}`);
    
    return {
      roleLevel: 'Unknown',
      okrs: []
    };
  }
}

/**
 * Wrapper for google.script.run frontend calls.
 * @param {string|number} employeeId - The employee
 * @returns {Object} Role-based OKR data
 */
function getOKRDataByRoleForPortal(employeeId) {
  return getOKRDataByRole(employeeId);
}

/* -------------------------------------------------------------------------- */
/*           MASTER PORTAL DATA ENDPOINT (TASK 4)                            */
/* -------------------------------------------------------------------------- */

/**
 * TASK 4: Master endpoint that fetches ALL data needed to render an
 * employee's complete portal view.
 * 
 * Orchestrates:
 * - getCurrentWorkflowStep() → determine current position
 * - getStepVisibility() → visibility/editability per step
 * - getOKRDataByRole() → role-specific OKR content
 * - Fetches data from all step sheets
 * - Checks hard lock date
 * 
 * @param {string|number} employeeId - The employee viewing their own portal
 * @returns {Object} {
 *   success: boolean,
 *   data: {
 *     currentStep: number,
 *     completedSteps: number[],
 *     visibility: {...},
 *     selfAssessment: {...} | null,
 *     okrData: {...},
 *     skillsAssessment: {...} | null,
 *     feedForward: {...} | null,
 *     managerAck: {...} | null,
 *     employeeAck: {...} | null,
 *     isLocked: boolean,
 *     lockDeadline: string,
 *     questions: [{id, text}, ...]
 *   },
 *   message: string
 * }
 */
function getEmployeePortalData(employeeId) {
  try {
    console.log(`[getEmployeePortalData] Building portal data for employee: ${employeeId}`);
    
    // Step 1: Get workflow state
    const workflowState = getCurrentWorkflowStep(employeeId);
    console.log(`[getEmployeePortalData] Workflow state: Step ${workflowState.step}`);
    
    // Step 2: Get step visibility/editability
    const visibility = getStepVisibility(employeeId);
    console.log(`[getEmployeePortalData] Visibility rules retrieved`);
    
    // Step 3: Get role-based OKR data
    const okrData = getOKRDataByRole(employeeId);
    console.log(`[getEmployeePortalData] OKR data retrieved: ${okrData.okrs.length} levels`);
    
    // Step 4: Get form lock status
    let lockStatus = { isLocked: false, deadline: null };
    try {
      lockStatus = checkFormLockStatus();
    } catch (e) {
      console.warn(`[getEmployeePortalData] Could not check lock status: ${e.message}`);
    }
    
    console.log(`[getEmployeePortalData] Lock status: isLocked=${lockStatus.isLocked}`);
    
    // Step 5: Get self-assessment questions
    let questions = [];
    try {
      questions = getQuestionsForForm() || [];
    } catch (e) {
      console.warn(`[getEmployeePortalData] Could not fetch questions: ${e.message}`);
    }
    
    console.log(`[getEmployeePortalData] Questions: ${questions.length} fetched`);
    
    // Step 6: Get data for each step (if available)
    let selfAssessment = null;
    let skillsAssessment = null;
    let feedForward = null;
    let managerAck = null;
    let employeeAck = null;
    
    try {
      if (workflowState.hasSelfAssessment) {
        selfAssessment = getSelfAssessment(employeeId);
        console.log(`[getEmployeePortalData] Self-Assessment data retrieved`);
      }
    } catch (e) {
      console.warn(`[getEmployeePortalData] Could not fetch self-assessment: ${e.message}`);
    }
    
    try {
      if (workflowState.hasSkillsAssessment) {
        skillsAssessment = getSkillsAssessment(employeeId);
        console.log(`[getEmployeePortalData] Skills Assessment data retrieved`);
      }
    } catch (e) {
      console.warn(`[getEmployeePortalData] Could not fetch skills assessment: ${e.message}`);
    }
    
    try {
      if (workflowState.hasFeedForward) {
        feedForward = getFeedForward(employeeId);
        console.log(`[getEmployeePortalData] Feed Forward data retrieved`);
      }
    } catch (e) {
      console.warn(`[getEmployeePortalData] Could not fetch feed forward: ${e.message}`);
    }
    
    try {
      if (workflowState.hasManagerAck) {
        managerAck = getManagerAcknowledgement(employeeId);
        console.log(`[getEmployeePortalData] Manager Acknowledgement data retrieved`);
      }
    } catch (e) {
      console.warn(`[getEmployeePortalData] Could not fetch manager ack: ${e.message}`);
    }
    
    try {
      if (workflowState.hasEmployeeAck) {
        employeeAck = getEmployeeAcknowledgement(employeeId);
        console.log(`[getEmployeePortalData] Employee Acknowledgement data retrieved`);
      }
    } catch (e) {
      console.warn(`[getEmployeePortalData] Could not fetch employee ack: ${e.message}`);
    }
    
    // Step 7: Assemble complete data object
    const portalData = {
      currentStep: workflowState.step,
      completedSteps: workflowState.completedSteps,
      visibility: visibility,
      selfAssessment: selfAssessment,
      okrData: okrData,
      skillsAssessment: skillsAssessment,
      feedForward: feedForward,
      managerAck: managerAck,
      employeeAck: employeeAck,
      isLocked: lockStatus.isLocked,
      lockDeadline: lockStatus.deadline || null,
      questions: questions
    };
    
    console.log(`[getEmployeePortalData] Portal data assembled successfully`);
    
    return {
      success: true,
      data: portalData,
      message: 'Portal data retrieved successfully'
    };
    
  } catch (e) {
    console.error(`[getEmployeePortalData] Error: ${e.message}`);
    console.error(`[getEmployeePortalData] Stack: ${e.stack}`);
    
    return {
      success: false,
      data: null,
      message: `Error building portal data: ${e.message}`
    };
  }
}

/**
 * Wrapper for google.script.run frontend calls.
 * @param {string|number} employeeId - The employee
 * @returns {Object} Complete portal data
 */
function getEmployeePortalDataForPortal(employeeId) {
  return getEmployeePortalData(employeeId);
}

/* -------------------------------------------------------------------------- */
/*                       ADMIN: EMPLOYEE DATABASE UPLOAD                       */
/* -------------------------------------------------------------------------- */

/**
 * Upload employee database from CSV data.
 * Ingests ALL columns as-is from the SAP export.
 * Replaces all existing data in the Employee Database sheet.
 * Uses LockService to prevent concurrent writes.
 * 
 * @param {Object} data - { headers: string[], rows: Object[] }
 *   headers: Array of column names (all 27 SAP columns)
 *   rows: Array of objects with header keys
 * @returns {Object} { success: boolean, message: string }
 */
function uploadEmployeeDatabase(data) {
  try {
    if (!data || !Array.isArray(data.headers) || !Array.isArray(data.rows)) {
      return { success: false, message: 'Invalid data format. Expected { headers, rows }' };
    }

    var headers = data.headers;
    var rows = data.rows;

    if (headers.length === 0) {
      return { success: false, message: 'No headers provided' };
    }

    if (rows.length === 0) {
      return { success: false, message: 'No employee data provided' };
    }

    console.log('[uploadEmployeeDatabase] Uploading ' + rows.length + ' employees (' + headers.length + ' columns)');

    // Acquire lock to prevent concurrent writes
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);

    try {
      var sheet = getSheet_('Employee Database');

      // Clear existing data (keep nothing — full replace)
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow > 0) {
        sheet.getRange(1, 1, lastRow, Math.max(lastCol, headers.length)).clearContent();
      }

      // Write headers as row 1
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

      // Prepare data rows — maintain column order from headers
      var dataRows = rows.map(function(row) {
        return headers.map(function(col) {
          return row[col] !== undefined && row[col] !== null ? row[col] : '';
        });
      });

      // Write all rows at once (batch write)
      if (dataRows.length > 0) {
        sheet.getRange(2, 1, dataRows.length, headers.length).setValues(dataRows);
      }

      console.log('[uploadEmployeeDatabase] Successfully wrote ' + dataRows.length + ' rows, ' + headers.length + ' columns');

      return {
        success: true,
        message: dataRows.length + ' employees uploaded successfully (' + headers.length + ' columns)'
      };
    } finally {
      lock.releaseLock();
    }
  } catch (e) {
    console.error('[uploadEmployeeDatabase] Error: ' + e.message);
    return { success: false, message: 'Upload failed: ' + e.message };
  }
}


/* -------------------------------------------------------------------------- */
/*        SELF-ASSESSMENT QUESTIONS & CONFIGURATION (Tasks 2 & 3)             */
/* -------------------------------------------------------------------------- */

/**
 * Task 3: Expose self-assessment questions for the employee portal.
 * 
 * Retrieves all enabled self-assessment questions ordered by sort order.
 * This is a public google.script.run endpoint called from employee-portal.html
 * 
 * @returns {Object} { success: boolean, questions: Object[], message: string }
 */
function getQuestionsForForm() {
  try {
    console.log('[getQuestionsForForm] Fetching self-assessment questions...');
    
    const questions = Database.getSelfAssessmentQuestions();
    
    if (!Array.isArray(questions)) {
      console.error('[getQuestionsForForm] Questions is not an array');
      return {
        success: false,
        questions: [],
        message: 'Failed to retrieve questions (invalid format)'
      };
    }
    
    if (questions.length === 0) {
      console.warn('[getQuestionsForForm] No enabled questions found. Check Self-Assessment Questions sheet.');
      return {
        success: false,
        questions: [],
        message: 'No questions configured. Please check with your administrator.'
      };
    }
    
    console.log(`[getQuestionsForForm] Successfully retrieved ${questions.length} questions`);
    return {
      success: true,
      questions: questions,
      message: `Retrieved ${questions.length} questions`
    };
  } catch (e) {
    console.error(`[getQuestionsForForm] Error: ${e.message}`);
    console.error(`[getQuestionsForForm] Stack: ${e.stack}`);
    return {
      success: false,
      questions: [],
      message: `Error retrieving questions: ${e.message}`
    };
  }
}

/**
 * Task 3: Check if the form should be locked based on hard lock date.
 * 
 * Compares current server time against HARD_LOCK_DATE from SystemConfig sheet.
 * Returns lock status for client-side enforcement.
 * This is a public google.script.run endpoint called from employee-portal.html
 * 
 * @returns {Object} { isLocked: boolean, deadline: string, message: string }
 */
function checkFormLockStatus() {
  try {
    console.log('[checkFormLockStatus] Checking form lock status...');
    
    // Get hard lock date from system config
    const lockDateStr = Database.getSystemConfig('HARD_LOCK_DATE');
    
    if (!lockDateStr) {
      console.warn('[checkFormLockStatus] HARD_LOCK_DATE not configured. Form will remain editable.');
      return {
        isLocked: false,
        deadline: null,
        message: 'No hard lock date configured'
      };
    }
    
    // Parse lock date
    const lockDate = new Date(lockDateStr);
    const now = new Date();
    
    console.log(`[checkFormLockStatus] Comparing: now=${now.toISOString()} vs lockDate=${lockDate.toISOString()}`);
    
    const isLocked = now > lockDate;
    
    if (isLocked) {
      console.log(`[checkFormLockStatus] Form is LOCKED (deadline passed on ${lockDate.toISOString()})`);
      return {
        isLocked: true,
        deadline: lockDate.toISOString(),
        message: `This form is now read-only. The submission deadline was ${lockDate.toLocaleString()}.`
      };
    } else {
      const hoursRemaining = Math.floor((lockDate - now) / (1000 * 60 * 60));
      const minutesRemaining = Math.floor((lockDate - now) / (1000 * 60)) % 60;
      console.log(`[checkFormLockStatus] Form is UNLOCKED (${hoursRemaining}h ${minutesRemaining}m remaining)`);
      return {
        isLocked: false,
        deadline: lockDate.toISOString(),
        message: `You can edit your answers until ${lockDate.toLocaleString()}`
      };
    }
  } catch (e) {
    console.error(`[checkFormLockStatus] Error: ${e.message}`);
    console.error(`[checkFormLockStatus] Stack: ${e.stack}`);
    // Fail open: if we can't check lock status, allow editing
    return {
      isLocked: false,
      deadline: null,
      message: `Error checking lock status: ${e.message}`
    };
  }
}

/**
 * Task 2: Fetch existing self-assessment for an employee (for pre-population).
 * 
 * Checks if the employee has already submitted a self-assessment.
 * If yes, returns the saved responses for pre-population.
 * If no, returns null.
 * This is a public google.script.run endpoint called from employee-portal.html
 * 
 * @param {string|number} employeeId - The employee ID
 * @returns {Object} { success: boolean, data: Object|null, message: string }
 */
function getSelfAssessment(employeeId) {
  try {
    console.log(`[getSelfAssessment] Fetching self-assessment for employee ${employeeId}...`);
    
    const assessment = Database.getEmployeeSelfAssessment(employeeId);
    
    if (assessment) {
      console.log(`[getSelfAssessment] Found existing self-assessment for employee ${employeeId}`);
      return {
        success: true,
        data: assessment,
        message: 'Existing self-assessment found'
      };
    } else {
      console.log(`[getSelfAssessment] No self-assessment found for employee ${employeeId} (new submission)`);
      return {
        success: true,
        data: null,
        message: 'No existing self-assessment'
      };
    }
  } catch (e) {
    console.error(`[getSelfAssessment] Error: ${e.message}`);
    console.error(`[getSelfAssessment] Stack: ${e.stack}`);
    return {
      success: false,
      data: null,
      message: `Error retrieving self-assessment: ${e.message}`
    };
  }
}

/* -------------------------------------------------------------------------- */
/*                      SKILL DEFINITIONS (Task 9 Prep)                       */
/* -------------------------------------------------------------------------- */

/**
 * Fetches skill definitions from the SystemConfig sheet.
 * Returns all 10 skills (5 core + 5 leadership) with required levels per band.
 * 
 * @returns {Object} { success: boolean, data: Object[], message: string }
 */
function getSkillDefinitions() {
  try {
    console.log(`[getSkillDefinitions] Fetching skill definitions from SystemConfig`);
    
    const sheet = getSheet_('SystemConfig');
    const headers = getHeaderMap_(sheet);
    const dataRange = sheet.getRange(2, 1, Math.max(1, sheet.getLastRow() - 1), sheet.getLastColumn());
    const values = dataRange.getValues();
    
    // Filter for skill definition rows (skillType = 'CORE' or 'LEADERSHIP')
    const skillDefinitions = [];
    
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      const rowObj = {};
      Object.entries(headers).forEach(([colName, colIndex]) => {
        rowObj[colName] = row[colIndex];
      });
      
      // Check if this is a skill definition row
      const skillType = rowObj.SkillType || rowObj.skillType;
      if (skillType === 'CORE' || skillType === 'LEADERSHIP') {
        skillDefinitions.push({
          skillId: rowObj.SkillID || rowObj.skillId || i,
          skillName: rowObj.SkillName || rowObj.skillName || 'Unnamed Skill',
          skillType: skillType,
          requiredLevel: rowObj.RequiredLevel || rowObj.requiredLevel || 3,
          description: rowObj.Description || rowObj.description || ''
        });
      }
    }
    
    console.log(`[getSkillDefinitions] Found ${skillDefinitions.length} skill definitions`);
    
    if (skillDefinitions.length === 0) {
      console.warn(`[getSkillDefinitions] WARNING: No skill definitions found in SystemConfig`);
      // Return default skills as fallback
      return {
        success: true,
        data: getDefaultSkillDefinitions(),
        message: 'Using default skill definitions (none found in database)'
      };
    }
    
    // Separate into core and leadership
    const coreSkills = skillDefinitions.filter(s => s.skillType === 'CORE');
    const leadershipSkills = skillDefinitions.filter(s => s.skillType === 'LEADERSHIP');
    
    console.log(`[getSkillDefinitions] Core skills: ${coreSkills.length}, Leadership skills: ${leadershipSkills.length}`);
    
    return {
      success: true,
      data: skillDefinitions,
      message: `Loaded ${skillDefinitions.length} skill definitions`
    };
  } catch (e) {
    console.error(`[getSkillDefinitions] Error: ${e.message}`);
    console.error(`[getSkillDefinitions] Stack: ${e.stack}`);
    return {
      success: false,
      data: getDefaultSkillDefinitions(),
      message: `Error loading skill definitions: ${e.message}`
    };
  }
}

/**
 * Returns default skill definitions (fallback when database has no data).
 * This ensures the form always has skills to display.
 * 
 * @returns {Object[]} Array of skill definition objects
 */
function getDefaultSkillDefinitions() {
  return [
    // Core Skills
    { skillId: 1, skillName: 'Communication', skillType: 'CORE', requiredLevel: 3, description: 'Ability to express ideas clearly and listen effectively' },
    { skillId: 2, skillName: 'Problem Solving', skillType: 'CORE', requiredLevel: 4, description: 'Ability to analyze issues and develop solutions' },
    { skillId: 3, skillName: 'Teamwork', skillType: 'CORE', requiredLevel: 3, description: 'Ability to collaborate and support team goals' },
    { skillId: 4, skillName: 'Customer Focus', skillType: 'CORE', requiredLevel: 3, description: 'Commitment to meeting customer needs' },
    { skillId: 5, skillName: 'Innovation', skillType: 'CORE', requiredLevel: 2, description: 'Willingness to embrace new ideas and improvements' },
    // Leadership Skills
    { skillId: 6, skillName: 'Strategic Thinking', skillType: 'LEADERSHIP', requiredLevel: 3, description: 'Ability to align actions with long-term vision' },
    { skillId: 7, skillName: 'People Development', skillType: 'LEADERSHIP', requiredLevel: 3, description: 'Commitment to developing others and fostering growth' },
    { skillId: 8, skillName: 'Decision Making', skillType: 'LEADERSHIP', requiredLevel: 4, description: 'Ability to make sound decisions with available information' },
    { skillId: 9, skillName: 'Change Management', skillType: 'LEADERSHIP', requiredLevel: 3, description: 'Ability to lead teams through organizational change' },
    { skillId: 10, skillName: 'Stakeholder Management', skillType: 'LEADERSHIP', requiredLevel: 3, description: 'Ability to build and maintain effective relationships' }
  ];
}

/**
 * Gets system configuration value by key.
 * Helper function to retrieve settings from SystemConfig sheet.
 * 
 * @param {string} key - Configuration key (e.g., 'HARD_LOCK_DATE', 'FORM_PERIOD_START')
 * @returns {string|null} Configuration value or null if not found
 */
function getSystemConfigValue(key) {
  try {
    const sheet = getSheet_('SystemConfig');
    const headers = getHeaderMap_(sheet);
    const dataRange = sheet.getRange(2, 1, Math.max(1, sheet.getLastRow() - 1), sheet.getLastColumn());
    const values = dataRange.getValues();
    
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      const rowObj = {};
      Object.entries(headers).forEach(([colName, colIndex]) => {
        rowObj[colName] = row[colIndex];
      });
      
      if ((rowObj.ConfigKey || rowObj.configKey) === key) {
        return rowObj.ConfigValue || rowObj.configValue || null;
      }
    }
    
    console.warn(`[getSystemConfigValue] Configuration key not found: ${key}`);
    return null;
  } catch (e) {
    console.error(`[getSystemConfigValue] Error: ${e.message}`);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                     TASK 4 & 5: PORTAL ROUTING FUNCTIONS                   */
/* -------------------------------------------------------------------------- */

/**
 * TASK 5: Routes user to the selected portal.
 * Called from portal-selector.html when user clicks a portal card.
 * Validates the role and returns the portal URL for client-side redirect.
 * 
 * @param {string} selectedRole - The role user selected (MANAGER, DATA_SPOC, EMPLOYEE, ADMIN)
 * @returns {Object} { success: boolean, portalUrl: string, message: string }
 */
function routeToPortal(selectedRole) {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    console.log(`[routeToPortal] User ${userEmail} selected role: ${selectedRole}`);
    
    if (!userEmail) {
      console.warn(`[routeToPortal] No user email found`);
      return {
        success: false,
        portalUrl: '',
        message: 'Authentication error. Please log in again.'
      };
    }
    
    if (!selectedRole || typeof selectedRole !== 'string') {
      console.warn(`[routeToPortal] Invalid role: ${selectedRole}`);
      return {
        success: false,
        portalUrl: '',
        message: 'Invalid portal selection.'
      };
    }
    
    // Get employee record
    const employee = getEmployeeByEmail_(userEmail);
    if (!employee) {
      console.warn(`[routeToPortal] Employee not found for ${userEmail}`);
      return {
        success: false,
        portalUrl: '',
        message: 'Employee record not found.'
      };
    }
    
    // Parse and validate user's roles
    const userRoles = parseRoles(employee.Role || '');
    console.log(`[routeToPortal] User's available roles:`, userRoles);
    
    // Verify selected role is in user's available roles
    if (!userRoles.includes(selectedRole.toUpperCase())) {
      console.error(`[routeToPortal] UNAUTHORIZED: User ${userEmail} tried to access role ${selectedRole} but only has [${userRoles.join(',')}]`);
      logAccessAttempt(userEmail, selectedRole, 'DENIED', `Attempted to access unauthorized role`);
      return {
        success: false,
        portalUrl: '',
        message: 'You do not have permission to access this portal.'
      };
    }
    
    // Log successful routing
    console.log(`[routeToPortal] AUTHORIZED: Routing ${userEmail} to ${selectedRole} portal`);
    logAccessAttempt(userEmail, selectedRole, 'GRANTED', `Portal route confirmed`);
    
    // Build portal URL based on role
    // In Apps Script, we return a redirect URL that the client will navigate to
    // The client will use: window.location.href = result.portalUrl
    // This will trigger a new doGet() call on the server
    const scriptUrl = ScriptApp.getService().getUrl();
    const portalUrl = scriptUrl + '?portal=' + encodeURIComponent(selectedRole.toUpperCase());
    
    console.log(`[routeToPortal] Returning portal URL: ${portalUrl}`);
    
    return {
      success: true,
      portalUrl: portalUrl,
      message: `Routing to ${selectedRole} portal`
    };
  } catch (e) {
    console.error(`[routeToPortal] Error: ${e.message}`);
    console.error(`[routeToPortal] Stack: ${e.stack}`);
    logAccessAttempt(Session.getActiveUser().getEmail(), 'UNKNOWN', 'ERROR', `routeToPortal error: ${e.message}`);
    return {
      success: false,
      portalUrl: '',
      message: `Error: ${e.message}`
    };
  }
}

/**
 * TASK 4: Logout function.
 * Called when user clicks sign-out link in portal selector.
 * Simple confirmation endpoint (session cleanup happens on client/browser side).
 * 
 * @returns {Object} { success: boolean, message: string }
 */
function logout() {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    console.log(`[logout] User ${userEmail} logging out`);
    logAccessAttempt(userEmail, 'UNKNOWN', 'GRANTED', 'User logout confirmed');
    
    return {
      success: true,
      message: 'Logout successful'
    };
  } catch (e) {
    console.error(`[logout] Error: ${e.message}`);
    return {
      success: false,
      message: `Logout error: ${e.message}`
    };
  }
}


/* -------------------------------------------------------------------------- */
/*                   OKR CSV HIERARCHY DETECTION (TASK 2)                     */
/* -------------------------------------------------------------------------- */

/**
 * TASK 2: Parses OKR CSV file and detects corporate hierarchy.
 * Extracts: Corporate, Group, Department, Team
 * Validates structure and weight distribution.
 * Supports blank field cascading (downward hierarchy logic).
 * 
 * CSV Structure Expected (4 hierarchy levels):
 * Corporate, Group, Group_Objective, Group_KeyResult, Group_Category, Group_TargetResult, Group_Weight,
 * Department, Department_Objective, Department_KeyResult, Department_Category, Department_TargetResult, Department_Weight,
 * Team, Team_Objective, Team_KeyResult, Team_Category, Team_TargetResult, Team_Weight
 * 
 * @param {string} csvContent - Raw CSV file content (text)
 * @returns {Object} {
 *   success: boolean,
 *   corporate: string,
 *   group: string,
 *   department: string (can be empty for Group-only OKRs),
 *   team: string (can be empty for Dept-only OKRs),
 *   keyResults: [{
 *     corporate: string,
 *     group: string,
 *     groupObjective: string,
 *     groupKeyResult: string,
 *     groupWeight: number,
 *     department: string,
 *     departmentObjective: string,
 *     departmentKeyResult: string,
 *     departmentWeight: number,
 *     team: string,
 *     teamObjective: string,
 *     teamKeyResult: string,
 *     teamWeight: number,
 *     category: string,
 *     targetResult: string
 *   }],
 *   validation: {
 *     isValid: boolean,
 *     warnings: string[],
 *     errors: string[]
 *   }
 * }
 */
function parseOKRCSVAndDetectHierarchy(csvContent) {
  try {
    console.log('[parseOKRCSVAndDetectHierarchy] Starting CSV parsing...');
    
    const errors = [];
    const warnings = [];
    const keyResults = [];
    let corporate = null;
    let group = null;
    let department = null;
    let team = null;

    // Parse CSV lines
    const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length < 2) {
      return {
        success: false,
        corporate: null,
        group: null,
        department: null,
        team: null,
        keyResults: [],
        validation: {
          isValid: false,
          warnings: [],
          errors: ['CSV file is empty or has no data rows']
        }
      };
    }

    // Parse header row
    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim());
    
    console.log(`[parseOKRCSVAndDetectHierarchy] Headers: ${headers.join(' | ')}`);

    // Validate required columns
    const requiredColumns = [
      'Corporate', 'Group', 'Group_Objective', 'Group_KeyResult', 'Group_Weight',
      'Department', 'Department_Objective', 'Department_KeyResult', 'Department_Weight',
      'Team', 'Team_Objective', 'Team_KeyResult', 'Team_Weight'
    ];

    for (const col of requiredColumns) {
      if (!headers.some(h => h === col || h === col.toLowerCase())) {
        errors.push(`Missing required column: ${col}`);
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        corporate: null,
        group: null,
        department: null,
        team: null,
        keyResults: [],
        validation: {
          isValid: false,
          warnings: [],
          errors: errors
        }
      };
    }

    // Parse data rows
    for (let rowIdx = 1; rowIdx < lines.length; rowIdx++) {
      try {
        const line = lines[rowIdx];
        // Simple CSV parser (handles quoted values)
        const values = parseCSVLine_(line);
        
        if (values.length < headers.length) {
          warnings.push(`Row ${rowIdx + 1}: Not enough columns, expected ${headers.length}, got ${values.length}`);
          continue;
        }

        // Map header to value
        const row = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx];
        });

        // Extract hierarchy values
        const rowCorp = row['Corporate'] || row['corporate'] || '';
        const rowGroup = row['Group'] || row['group'] || '';
        const rowDept = row['Department'] || row['department'] || '';
        const rowTeam = row['Team'] || row['team'] || '';

        // Validate required hierarchy fields
        if (!rowCorp) {
          errors.push(`Row ${rowIdx + 1}: Missing Corporate`);
          continue;
        }
        if (!rowGroup) {
          errors.push(`Row ${rowIdx + 1}: Missing Group`);
          continue;
        }

        // Set hierarchy values (from first valid row)
        if (!corporate) corporate = rowCorp;
        if (!group) group = rowGroup;
        if (!department && rowDept) department = rowDept;
        if (!team && rowTeam) team = rowTeam;

        // Validate Group OKR fields
        const groupObjective = row['Group_Objective'] || row['group_objective'] || '';
        const groupKeyResult = row['Group_KeyResult'] || row['group_keyresult'] || '';
        
        if (!groupObjective || !groupKeyResult) {
          errors.push(`Row ${rowIdx + 1}: Missing Group Objective or Key Result`);
          continue;
        }

        // Parse weights
        const groupWeight = parseFloat(row['Group_Weight'] || row['group_weight'] || '0');
        const deptWeight = parseFloat(row['Department_Weight'] || row['department_weight'] || '0');
        const teamWeight = parseFloat(row['Team_Weight'] || row['team_weight'] || '0');

        if (isNaN(groupWeight) || groupWeight < 0 || groupWeight > 100) {
          errors.push(`Row ${rowIdx + 1}: Invalid Group Weight: ${row['Group_Weight']}`);
          continue;
        }

        // Extract OKR data with cascading logic
        const deptObjective = row['Department_Objective'] || row['department_objective'] || groupObjective;
        const deptKeyResult = row['Department_KeyResult'] || row['department_keyresult'] || groupKeyResult;
        const teamObjective = row['Team_Objective'] || row['team_objective'] || deptObjective;
        const teamKeyResult = row['Team_KeyResult'] || row['team_keyresult'] || deptKeyResult;

        const category = row['Category'] || row['category'] || row['Group_Category'] || row['group_category'] || 'Target';
        const targetResult = row['TargetResult'] || row['targetresult'] || row['Group_TargetResult'] || row['group_targetresult'] || '';

        // Create key result record
        const krRecord = {
          corporate: rowCorp,
          group: rowGroup,
          groupObjective: groupObjective,
          groupKeyResult: groupKeyResult,
          groupWeight: groupWeight,
          department: rowDept,
          departmentObjective: deptObjective,
          departmentKeyResult: deptKeyResult,
          departmentWeight: deptWeight,
          team: rowTeam,
          teamObjective: teamObjective,
          teamKeyResult: teamKeyResult,
          teamWeight: teamWeight,
          category: category,
          targetResult: targetResult
        };

        keyResults.push(krRecord);
        console.log(`[parseOKRCSVAndDetectHierarchy] Row ${rowIdx + 1}: Parsed successfully`);
      } catch (e) {
        errors.push(`Row ${rowIdx + 1}: Error parsing row - ${e.message}`);
        console.error(`[parseOKRCSVAndDetectHierarchy] Row ${rowIdx + 1} error: ${e.message}`);
      }
    }

    // Validate weight distribution
    if (keyResults.length > 0) {
      const groupWeights = keyResults.map(kr => kr.groupWeight).reduce((a, b) => a + b, 0);
      if (groupWeights !== 100) {
        warnings.push(`Group weights total ${groupWeights}%, expected 100% (tolerance ±1%)`);
      }
    }

    const isValid = errors.length === 0 && keyResults.length > 0;

    console.log(`[parseOKRCSVAndDetectHierarchy] Parsing complete: Corp=${corporate}, Group=${group}, Dept=${department}, Team=${team}, KRs=${keyResults.length}`);
    console.log(`[parseOKRCSVAndDetectHierarchy] Validation: isValid=${isValid}, errors=${errors.length}, warnings=${warnings.length}`);

    return {
      success: isValid,
      corporate: corporate,
      group: group,
      department: department,
      team: team,
      keyResults: keyResults,
      validation: {
        isValid: isValid,
        warnings: warnings,
        errors: errors
      }
    };
  } catch (e) {
    console.error(`[parseOKRCSVAndDetectHierarchy] Fatal error: ${e.message}`);
    return {
      success: false,
      corporate: null,
      group: null,
      department: null,
      team: null,
      keyResults: [],
      validation: {
        isValid: false,
        warnings: [],
        errors: [`Fatal error: ${e.message}`]
      }
    };
  }
}

/**
 * Helper: Parses a single CSV line handling quoted values.
 * Simple implementation for OKR CSV parsing.
 * 
 * @param {string} line - CSV line to parse
 * @returns {string[]} Array of parsed values
 * @private
 */
function parseCSVLine_(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());
  return result;
}

/**
 * Validates OKR CSV structure and content.
 * Detailed validation for data quality.
 * 
 * @param {Object} parseResult - Result from parseOKRCSVAndDetectHierarchy()
 * @returns {Object} { isValid: boolean, errors: string[], warnings: string[] }
 */
function validateOKRCSV(parseResult) {
  const errors = [...parseResult.validation.errors];
  const warnings = [...parseResult.validation.warnings];

  if (!parseResult.corporate) {
    errors.push('No corporate data detected');
  }
  if (!parseResult.group) {
    errors.push('No group data detected');
  }

  if (parseResult.keyResults.length === 0) {
    errors.push('No valid key results found in CSV');
  }

  // Check for empty department/team with content
  if (!parseResult.department && parseResult.keyResults.some(kr => kr.department)) {
    warnings.push('Some rows have Department data but hierarchy header shows none');
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    warnings: warnings
  };
}

/**
 * Gets all unique hierarchy combinations from parsed OKR data.
 * Used for populating dropdown selectors.
 * 
 * @param {Object} parseResult - Result from parseOKRCSVAndDetectHierarchy()
 * @returns {Object} {
 *   corporates: string[],
 *   groups: string[],
 *   departments: string[],
 *   teams: string[]
 * }
 */
function getUniqueLevelsFromOKR(parseResult) {
  const corporates = new Set();
  const groups = new Set();
  const departments = new Set();
  const teams = new Set();

  parseResult.keyResults.forEach(kr => {
    if (kr.corporate) corporates.add(kr.corporate);
    if (kr.group) groups.add(kr.group);
    if (kr.department) departments.add(kr.department);
    if (kr.team) teams.add(kr.team);
  });

  return {
    corporates: Array.from(corporates).sort(),
    groups: Array.from(groups).sort(),
    departments: Array.from(departments).sort(),
    teams: Array.from(teams).sort()
  };
}

/**
 * Generates standardized file name for Google Drive upload.
 * Format: Corporate_Group_Department_Team.csv
 * If no Team: Corporate_Group_Department.csv
 * 
 * @param {string} corporate - Corporate name
 * @param {string} group - Group name
 * @param {string} department - Department name (can be empty)
 * @param {string} team - Team name (can be empty)
 * @returns {string} Standardized file name
 */
function generateOKRFileName(corporate, group, department, team) {
  const parts = [corporate, group];
  
  if (department && department.trim()) {
    parts.push(department);
  }
  
  if (team && team.trim()) {
    parts.push(team);
  }

  // Replace spaces and special chars with underscores
  const fileName = parts
    .map(part => part.trim().replace(/[^a-zA-Z0-9-]/g, '_'))
    .join('_');

  return fileName + '.csv';
}


/* -------------------------------------------------------------------------- */
/*                   GOOGLE DRIVE OKR FILE UPLOAD HANDLER (TASK 3)            */
/* -------------------------------------------------------------------------- */

/**
 * TASK 3: Uploads OKR CSV file to Google Drive with user as uploader.
 * File is saved to a shared folder and renamed per hierarchy: Corporate_Group_Department_Team.csv
 * 
 * @param {string} csvContent - Raw CSV file content
 * @param {string} userEmail - Email of Data SPOC uploading (used as owner in metadata)
 * @param {string} fileName - Original file name
 * @param {string} corporate - Corporate name (for file naming)
 * @param {string} group - Group name (for file naming)
 * @param {string} department - Department name (for file naming, can be empty)
 * @param {string} team - Team name (for file naming, can be empty)
 * @returns {Object} {
 *   success: boolean,
 *   fileId: string (Google Drive file ID),
 *   fileName: string (renamed file name),
 *   webViewLink: string (shareable link),
 *   message: string,
 *   error?: string
 * }
 */
function uploadOKRFileToGoogleDrive(csvContent, userEmail, fileName, corporate, group, department, team) {
  try {
    console.log(`[uploadOKRFileToGoogleDrive] Starting upload: user=${userEmail}, orig=${fileName}`);

    // Get shared folder ID from properties
    const sharedFolderIdProperty = PropertiesService.getScriptProperties().getProperty('OKR_SHARED_FOLDER_ID');
    if (!sharedFolderIdProperty) {
      console.warn('[uploadOKRFileToGoogleDrive] OKR_SHARED_FOLDER_ID not configured in Script Properties');
      console.warn('[uploadOKRFileToGoogleDrive] File will be saved to root of user\'s Drive');
    }

    // Generate standardized file name
    const standardizedFileName = generateOKRFileName(corporate, group, department, team);
    console.log(`[uploadOKRFileToGoogleDrive] Standardized name: ${standardizedFileName}`);

    // Create file blob from CSV content
    const blob = Utilities.newBlob(csvContent, 'text/csv', standardizedFileName);

    // Prepare file properties
    const fileOptions = {
      title: standardizedFileName,
      description: `OKR Data: ${corporate} / ${group} / ${department} / ${team} (Uploaded by ${userEmail} on ${new Date().toISOString()})`,
      mimeType: 'text/csv'
    };

    // Upload to shared folder if configured, otherwise to user's root
    let uploadedFile;
    try {
      if (sharedFolderIdProperty) {
        const folder = DriveApp.getFolderById(sharedFolderIdProperty);
        uploadedFile = folder.createFile(blob);
        console.log(`[uploadOKRFileToGoogleDrive] File created in shared folder: ${sharedFolderIdProperty}`);
      } else {
        uploadedFile = DriveApp.createFile(blob);
        console.log('[uploadOKRFileToGoogleDrive] File created in user\'s root Drive');
      }
    } catch (e) {
      // If shared folder fails, fall back to user's root
      console.warn(`[uploadOKRFileToGoogleDrive] Shared folder access failed (${e.message}), using user root`);
      uploadedFile = DriveApp.createFile(blob);
    }

    // Set file metadata
    uploadedFile.setName(standardizedFileName);
    uploadedFile.setDescription(fileOptions.description);

    // Get file details
    const fileId = uploadedFile.getId();
    const webViewLink = uploadedFile.getUrl();

    console.log(`[uploadOKRFileToGoogleDrive] Upload successful: fileId=${fileId}`);
    console.log(`[uploadOKRFileToGoogleDrive] Web view link: ${webViewLink}`);

    return {
      success: true,
      fileId: fileId,
      fileName: standardizedFileName,
      webViewLink: webViewLink,
      message: `OKR file uploaded successfully: ${standardizedFileName}`
    };
  } catch (e) {
    console.error(`[uploadOKRFileToGoogleDrive] Error: ${e.message}`);
    console.error(`[uploadOKRFileToGoogleDrive] Stack: ${e.stack}`);

    return {
      success: false,
      fileId: null,
      fileName: null,
      webViewLink: null,
      message: 'Failed to upload OKR file to Google Drive',
      error: e.message
    };
  }
}

/**
 * Checks if user has access to a specific Google Drive file.
 * Used to verify permissions before allowing edits/deletes.
 * 
 * @param {string} fileId - Google Drive file ID
 * @param {string} userEmail - User email to check access
 * @returns {Object} { hasAccess: boolean, canEdit: boolean, canDelete: boolean, message: string }
 */
function checkDriveFileAccess(fileId, userEmail) {
  try {
    const file = DriveApp.getFileById(fileId);
    
    // Check if user can edit
    const editors = file.getEditors();
    const viewers = file.getViewers();
    const owner = file.getOwner();

    const userCanEdit = editors.some(u => u.getEmail() === userEmail) || owner.getEmail() === userEmail;
    const userCanView = viewers.some(u => u.getEmail() === userEmail) || userCanEdit;

    console.log(`[checkDriveFileAccess] File ${fileId}: user ${userEmail} - view=${userCanView}, edit=${userCanEdit}`);

    return {
      hasAccess: userCanView,
      canEdit: userCanEdit,
      canDelete: owner.getEmail() === userEmail, // Only owner can delete
      message: userCanView ? 'Access granted' : 'Access denied'
    };
  } catch (e) {
    console.error(`[checkDriveFileAccess] Error checking access: ${e.message}`);
    return {
      hasAccess: false,
      canEdit: false,
      canDelete: false,
      message: `Error checking access: ${e.message}`
    };
  }
}

/**
 * Shares a Google Drive file with specific users.
 * Used to grant access to Data SPOC and related users.
 * 
 * @param {string} fileId - Google Drive file ID
 * @param {string[]} emailsToShare - Array of email addresses to share with
 * @param {string} role - Share role: 'viewer', 'commenter', 'editor' (default: 'viewer')
 * @returns {Object} { success: boolean, shared: string[], failed: string[], message: string }
 */
function shareOKRFileWithUsers(fileId, emailsToShare, role = 'viewer') {
  try {
    const file = DriveApp.getFileById(fileId);
    const shared = [];
    const failed = [];

    emailsToShare.forEach(email => {
      try {
        if (role === 'editor') {
          file.addEditor(email);
        } else if (role === 'commenter') {
          file.addCommenter(email);
        } else {
          file.addViewer(email);
        }
        shared.push(email);
        console.log(`[shareOKRFileWithUsers] Shared with ${email} as ${role}`);
      } catch (e) {
        failed.push(email);
        console.error(`[shareOKRFileWithUsers] Failed to share with ${email}: ${e.message}`);
      }
    });

    return {
      success: failed.length === 0,
      shared: shared,
      failed: failed,
      message: `Shared with ${shared.length} users${failed.length > 0 ? `, ${failed.length} failed` : ''}`
    };
  } catch (e) {
    console.error(`[shareOKRFileWithUsers] Error: ${e.message}`);
    return {
      success: false,
      shared: [],
      failed: emailsToShare,
      message: `Error sharing file: ${e.message}`
    };
  }
}

/**
 * Moves a Google Drive file to a specific folder.
 * Used to organize OKR files by hierarchy.
 * 
 * @param {string} fileId - Google Drive file ID
 * @param {string} targetFolderId - Target folder ID
 * @returns {Object} { success: boolean, message: string }
 */
function moveOKRFileToFolder(fileId, targetFolderId) {
  try {
    const file = DriveApp.getFileById(fileId);
    const targetFolder = DriveApp.getFolderById(targetFolderId);

    // Get current parent folders
    const currentParents = file.getParents();
    while (currentParents.hasNext()) {
      const parent = currentParents.next();
      parent.removeFile(file);
    }

    // Move to target folder
    targetFolder.addFile(file);

    console.log(`[moveOKRFileToFolder] File ${fileId} moved to folder ${targetFolderId}`);

    return {
      success: true,
      message: `File moved to target folder`
    };
  } catch (e) {
    console.error(`[moveOKRFileToFolder] Error: ${e.message}`);
    return {
      success: false,
      message: `Error moving file: ${e.message}`
    };
  }
}

/**
 * Deletes a Google Drive file.
 * Only file owner can delete.
 * 
 * @param {string} fileId - Google Drive file ID
 * @param {string} userEmail - Email of user requesting delete
 * @returns {Object} { success: boolean, message: string }
 */
function deleteOKRFileFromDrive(fileId, userEmail) {
  try {
    const file = DriveApp.getFileById(fileId);
    const owner = file.getOwner();

    // Only owner can delete
    if (owner.getEmail() !== userEmail) {
      console.warn(`[deleteOKRFileFromDrive] Delete denied: ${userEmail} is not owner (owner: ${owner.getEmail()})`);
      return {
        success: false,
        message: 'Only the file owner can delete this file'
      };
    }

    file.setTrashed(true);
    console.log(`[deleteOKRFileFromDrive] File ${fileId} moved to trash by ${userEmail}`);

    return {
      success: true,
      message: 'File deleted successfully'
    };
  } catch (e) {
    console.error(`[deleteOKRFileFromDrive] Error: ${e.message}`);
    return {
      success: false,
      message: `Error deleting file: ${e.message}`
    };
  }
}

/**
 * Gets metadata for a Google Drive file.
 * Used to verify file details and ownership.
 * 
 * @param {string} fileId - Google Drive file ID
 * @returns {Object} {
 *   success: boolean,
 *   fileName: string,
 *   fileSize: number (bytes),
 *   mimeType: string,
 *   owner: string (email),
 *   createdDate: string (ISO),
 *   lastModifiedDate: string (ISO),
 *   webViewLink: string,
 *   downloadLink: string,
 *   message?: string
 * }
 */
function getOKRFileMetadata(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);

    const metadata = {
      success: true,
      fileName: file.getName(),
      fileSize: file.getSize(),
      mimeType: file.getMimeType(),
      owner: file.getOwner().getEmail(),
      createdDate: file.getDateCreated().toISOString(),
      lastModifiedDate: file.getLastUpdated().toISOString(),
      webViewLink: file.getUrl(),
      downloadLink: file.getDownloadUrl()
    };

    console.log(`[getOKRFileMetadata] Retrieved metadata for file ${fileId}`);
    return metadata;
  } catch (e) {
    console.error(`[getOKRFileMetadata] Error: ${e.message}`);
    return {
      success: false,
      fileName: null,
      fileSize: null,
      mimeType: null,
      owner: null,
      createdDate: null,
      lastModifiedDate: null,
      webViewLink: null,
      downloadLink: null,
      message: `Error getting file metadata: ${e.message}`
    };
  }
}

/**
 * Creates a folder in Google Drive for organizing OKR files.
 * Hierarchical structure: Corporate / Group / Department / Team
 * 
 * @param {string} parentFolderId - Parent folder ID (root if null)
 * @param {string} folderName - Name for the new folder
 * @returns {Object} { success: boolean, folderId: string, folderName: string, message: string }
 */
function createOKRFolder(parentFolderId, folderName) {
  try {
    let newFolder;

    if (parentFolderId) {
      const parentFolder = DriveApp.getFolderById(parentFolderId);
      newFolder = parentFolder.createFolder(folderName);
      console.log(`[createOKRFolder] Created folder "${folderName}" in parent ${parentFolderId}`);
    } else {
      newFolder = DriveApp.createFolder(folderName);
      console.log(`[createOKRFolder] Created folder "${folderName}" in root`);
    }

    return {
      success: true,
      folderId: newFolder.getId(),
      folderName: folderName,
      message: `Folder created: ${folderName}`
    };
  } catch (e) {
    console.error(`[createOKRFolder] Error: ${e.message}`);
    return {
      success: false,
      folderId: null,
      folderName: folderName,
      message: `Error creating folder: ${e.message}`
    };
  }
}

/**
 * Gets or creates hierarchical folder structure for OKR files.
 * Example: /OKR_Files/Converge/People & Culture/People Platforms/Data Analytics
 * 
 * @param {string} corporate - Corporate name
 * @param {string} group - Group name
 * @param {string} department - Department name (optional)
 * @param {string} team - Team name (optional)
 * @returns {Object} { success: boolean, folderId: string, folderPath: string, message: string }
 */
function getOrCreateOKRHierarchyFolder(corporate, group, department, team) {
  try {
    const rootFolderId = PropertiesService.getScriptProperties().getProperty('OKR_SHARED_FOLDER_ID');
    let currentFolderId = rootFolderId || null;
    const pathParts = [corporate, group];

    if (department) pathParts.push(department);
    if (team) pathParts.push(team);

    for (const folderName of pathParts) {
      try {
        if (currentFolderId) {
          const folder = DriveApp.getFolderById(currentFolderId);
          const subFolders = folder.getFoldersByName(folderName);

          if (subFolders.hasNext()) {
            currentFolderId = subFolders.next().getId();
            console.log(`[getOrCreateOKRHierarchyFolder] Found existing folder: ${folderName}`);
          } else {
            const newFolder = folder.createFolder(folderName);
            currentFolderId = newFolder.getId();
            console.log(`[getOrCreateOKRHierarchyFolder] Created new folder: ${folderName}`);
          }
        } else {
          const rootFolders = DriveApp.getFoldersByName(folderName);
          if (rootFolders.hasNext()) {
            currentFolderId = rootFolders.next().getId();
            console.log(`[getOrCreateOKRHierarchyFolder] Found existing root folder: ${folderName}`);
          } else {
            const newFolder = DriveApp.createFolder(folderName);
            currentFolderId = newFolder.getId();
            console.log(`[getOrCreateOKRHierarchyFolder] Created new root folder: ${folderName}`);
          }
        }
      } catch (e) {
        console.error(`[getOrCreateOKRHierarchyFolder] Error with folder ${folderName}: ${e.message}`);
        throw e;
      }
    }

    const folderPath = pathParts.join(' / ');

    return {
      success: true,
      folderId: currentFolderId,
      folderPath: folderPath,
      message: `Folder path ready: ${folderPath}`
    };
  } catch (e) {
    console.error(`[getOrCreateOKRHierarchyFolder] Error: ${e.message}`);
    return {
      success: false,
      folderId: null,
      folderPath: null,
      message: `Error creating folder hierarchy: ${e.message}`
    };
  }
}


/* -------------------------------------------------------------------------- */
/*                 OKR UPLOADING STATUS RETRIEVAL (TASK 4)                    */
/* -------------------------------------------------------------------------- */

/**
 * TASK 4: Retrieves uploading status for all employees in a specific hierarchy.
 * Used to populate the "Uploading Status" table in Data SPOC Portal.
 * Shows which employees have submitted OKRs and their current status.
 * 
 * @param {string} corporate - Corporate name
 * @param {string} group - Group name
 * @param {string} department - Department name (optional, can be empty)
 * @param {string} team - Team name (optional, can be empty)
 * @returns {Object} {
 *   success: boolean,
 *   corporate: string,
 *   group: string,
 *   department: string,
 *   team: string,
 *   employees: [{
 *     employeeId: string,
 *     name: string,
 *     department: string,
 *     okrStatus: string ('Pending' | 'Uploaded' | 'Scored' | 'Locked'),
 *     lastUpdated: string (ISO timestamp or '—'),
 *     uploadId: string (null if not uploaded),
 *     uploadedBy: string (email, null if not uploaded),
 *     canEdit: boolean (true if employee can still edit)
 *   }],
 *   summary: {
 *     totalEmployees: number,
 *     pendingCount: number,
 *     uploadedCount: number,
 *     scoredCount: number,
 *     lockedCount: number,
 *     completionPercentage: number
 *   },
 *   message: string
 * }
 */
function getUploadingStatus(corporate, group, department, team) {
  try {
    console.log(`[getUploadingStatus] Fetching status: Corp=${corporate}, Group=${group}, Dept=${department}, Team=${team}`);

    // Get uploading status from database
    const statusData = Database.getUploadingStatusByHierarchy(corporate, group, department, team);

    if (!statusData || statusData.length === 0) {
      console.warn('[getUploadingStatus] No employees found for this hierarchy');
      return {
        success: false,
        corporate: corporate,
        group: group,
        department: department,
        team: team,
        employees: [],
        summary: {
          totalEmployees: 0,
          pendingCount: 0,
          uploadedCount: 0,
          scoredCount: 0,
          lockedCount: 0,
          completionPercentage: 0
        },
        message: 'No employees found for this hierarchy'
      };
    }

    // Enrich status data with lock information
    const enrichedEmployees = statusData.map(emp => {
      let canEdit = true;
      let lockStatus = null;

      // Check if OKR has been scored (if uploaded)
      if (emp.uploadId) {
        lockStatus = Database.checkOKRScoredStatus(emp.uploadId);
        if (lockStatus && lockStatus.isScored) {
          canEdit = false; // Cannot edit if scored
        }
      }

      return {
        ...emp,
        canEdit: canEdit,
        lockStatus: lockStatus
      };
    });

    // Calculate summary statistics
    const summary = {
      totalEmployees: enrichedEmployees.length,
      pendingCount: enrichedEmployees.filter(e => e.okrStatus === 'Pending').length,
      uploadedCount: enrichedEmployees.filter(e => e.okrStatus === 'Uploaded').length,
      scoredCount: enrichedEmployees.filter(e => e.okrStatus === 'Scored').length,
      lockedCount: enrichedEmployees.filter(e => e.okrStatus === 'Locked').length,
      completionPercentage: enrichedEmployees.length > 0 
        ? Math.round(((enrichedEmployees.length - enrichedEmployees.filter(e => e.okrStatus === 'Pending').length) / enrichedEmployees.length) * 100)
        : 0
    };

    console.log(`[getUploadingStatus] Summary: ${summary.uploadedCount} uploaded, ${summary.pendingCount} pending, ${summary.completionPercentage}% complete`);

    return {
      success: true,
      corporate: corporate,
      group: group,
      department: department,
      team: team,
      employees: enrichedEmployees,
      summary: summary,
      message: `Retrieved status for ${enrichedEmployees.length} employees`
    };
  } catch (e) {
    console.error(`[getUploadingStatus] Error: ${e.message}`);
    console.error(`[getUploadingStatus] Stack: ${e.stack}`);

    return {
      success: false,
      corporate: corporate,
      group: group,
      department: department,
      team: team,
      employees: [],
      summary: {
        totalEmployees: 0,
        pendingCount: 0,
        uploadedCount: 0,
        scoredCount: 0,
        lockedCount: 0,
        completionPercentage: 0
      },
      message: `Error retrieving uploading status: ${e.message}`
    };
  }
}

/**
 * Gets detailed status for a single employee in a specific hierarchy.
 * Used for drilling down on individual employee status.
 * 
 * @param {string} employeeId - Employee ID
 * @param {string} corporate - Corporate name
 * @param {string} group - Group name
 * @param {string} department - Department name (optional)
 * @param {string} team - Team name (optional)
 * @returns {Object} {
 *   success: boolean,
 *   employeeId: string,
 *   name: string,
 *   okrStatus: string,
 *   lastUpdated: string,
 *   uploadDetails: {
 *     uploadId: string,
 *     uploadedBy: string,
 *     uploadedAt: string,
 *     fileName: string,
 *     googleDriveFileId: string,
 *     webViewLink: string
 *   },
 *   lockStatus: {
 *     isLocked: boolean,
 *     isScored: boolean,
 *     lastScoredAt: string,
 *     lastScoredBy: string
 *   },
 *   canEdit: boolean,
 *   message: string
 * }
 */
function getEmployeeOKRStatus(employeeId, corporate, group, department, team) {
  try {
    console.log(`[getEmployeeOKRStatus] Fetching status for employee ${employeeId}`);

    // Get employee data
    const employee = Database.getEmployeeById(employeeId);
    if (!employee) {
      return {
        success: false,
        employeeId: employeeId,
        name: null,
        okrStatus: 'Not Found',
        lastUpdated: null,
        uploadDetails: null,
        lockStatus: null,
        canEdit: false,
        message: `Employee ${employeeId} not found`
      };
    }

    // Get OKR upload record
    const uploadRecord = Database.getOKRUploadByHierarchy(corporate, group, department, team);

    let okrStatus = 'Pending';
    let lastUpdated = null;
    let uploadDetails = null;
    let lockStatus = { isLocked: false, isScored: false };
    let canEdit = true;

    if (uploadRecord) {
      okrStatus = uploadRecord.status || 'Uploaded';
      lastUpdated = uploadRecord.uploadedAt;

      // Check scored status
      lockStatus = Database.checkOKRScoredStatus(uploadRecord.uploadId);
      if (lockStatus && lockStatus.isScored) {
        canEdit = false;
      }

      // Get Drive file metadata if available
      if (uploadRecord.googleDriveFileId) {
        try {
          const fileMetadata = getOKRFileMetadata(uploadRecord.googleDriveFileId);
          if (fileMetadata.success) {
            uploadDetails = {
              uploadId: uploadRecord.uploadId,
              uploadedBy: uploadRecord.userEmail,
              uploadedAt: uploadRecord.uploadedAt,
              fileName: fileMetadata.fileName,
              googleDriveFileId: uploadRecord.googleDriveFileId,
              webViewLink: fileMetadata.webViewLink
            };
          }
        } catch (e) {
          console.warn(`[getEmployeeOKRStatus] Could not get Drive file metadata: ${e.message}`);
        }
      }
    }

    console.log(`[getEmployeeOKRStatus] Employee ${employeeId}: ${okrStatus}, canEdit=${canEdit}`);

    return {
      success: true,
      employeeId: employeeId,
      name: employee.Name || employee.name || 'Unknown',
      okrStatus: okrStatus,
      lastUpdated: lastUpdated,
      uploadDetails: uploadDetails,
      lockStatus: lockStatus,
      canEdit: canEdit,
      message: `Retrieved OKR status for employee ${employeeId}`
    };
  } catch (e) {
    console.error(`[getEmployeeOKRStatus] Error: ${e.message}`);

    return {
      success: false,
      employeeId: employeeId,
      name: null,
      okrStatus: 'Error',
      lastUpdated: null,
      uploadDetails: null,
      lockStatus: null,
      canEdit: false,
      message: `Error retrieving employee OKR status: ${e.message}`
    };
  }
}

/**
 * Gets all OKR uploads for a specific Data SPOC user.
 * Used to show Data SPOC their upload history.
 * 
 * @param {string} userEmail - Data SPOC email
 * @returns {Object} {
 *   success: boolean,
 *   userEmail: string,
 *   uploads: [{
 *     uploadId: string,
 *     corporate: string,
 *     group: string,
 *     department: string,
 *     team: string,
 *     uploadedAt: string (ISO),
 *     status: string ('UPLOADED' | 'SCORED' | 'LOCKED'),
 *     lastScoredAt: string (ISO, null if not scored),
 *     lastScoredBy: string (email, null if not scored),
 *     fileName: string,
 *     googleDriveFileId: string,
 *     webViewLink: string
 *   }],
 *   summary: {
 *     totalUploads: number,
 *     uploadedCount: number,
 *     scoredCount: number,
 *     lockedCount: number
 *   },
 *   message: string
 * }
 */
function getUserOKRUploads(userEmail) {
  try {
    console.log(`[getUserOKRUploads] Fetching uploads for user ${userEmail}`);

    // Get all employees
    const allEmployees = Database.getAllEmployees();

    // Filter to get all OKR uploads by this user
    const userUploads = [];

    allEmployees.forEach(emp => {
      const empCorp = emp.Corporate || emp.corporate || '';
      const empGroup = emp.Group || emp.group || '';
      const empDept = emp.Department || emp.department || '';
      const empTeam = emp.Team || emp.team || '';

      // Try to get upload for this hierarchy
      const uploadRecord = Database.getOKRUploadByHierarchy(empCorp, empGroup, empDept, empTeam);
      if (uploadRecord && uploadRecord.userEmail === userEmail) {
        // Avoid duplicates (same hierarchy might appear in multiple employee rows)
        if (!userUploads.some(u => u.uploadId === uploadRecord.uploadId)) {
          try {
            const fileMetadata = getOKRFileMetadata(uploadRecord.googleDriveFileId);
            userUploads.push({
              uploadId: uploadRecord.uploadId,
              corporate: uploadRecord.corporate,
              group: uploadRecord.group,
              department: uploadRecord.department,
              team: uploadRecord.team,
              uploadedAt: uploadRecord.uploadedAt,
              status: uploadRecord.status,
              lastScoredAt: uploadRecord.lastScoredAt,
              lastScoredBy: uploadRecord.lastScoredBy,
              fileName: fileMetadata.success ? fileMetadata.fileName : uploadRecord.fileName,
              googleDriveFileId: uploadRecord.googleDriveFileId,
              webViewLink: fileMetadata.success ? fileMetadata.webViewLink : null
            });
          } catch (e) {
            console.warn(`[getUserOKRUploads] Could not get Drive metadata for upload ${uploadRecord.uploadId}: ${e.message}`);
          }
        }
      }
    });

    // Calculate summary
    const summary = {
      totalUploads: userUploads.length,
      uploadedCount: userUploads.filter(u => u.status === 'UPLOADED').length,
      scoredCount: userUploads.filter(u => u.status === 'SCORED').length,
      lockedCount: userUploads.filter(u => u.status === 'LOCKED').length
    };

    console.log(`[getUserOKRUploads] Found ${userUploads.length} uploads for ${userEmail}`);

    return {
      success: true,
      userEmail: userEmail,
      uploads: userUploads,
      summary: summary,
      message: `Retrieved ${userUploads.length} OKR uploads for ${userEmail}`
    };
  } catch (e) {
    console.error(`[getUserOKRUploads] Error: ${e.message}`);

    return {
      success: false,
      userEmail: userEmail,
      uploads: [],
      summary: {
        totalUploads: 0,
        uploadedCount: 0,
        scoredCount: 0,
        lockedCount: 0
      },
      message: `Error retrieving user OKR uploads: ${e.message}`
    };
  }
}

/**
 * Checks if an OKR is editable by a specific user.
 * Determines lock status and ownership permissions.
 * 
 * @param {string} uploadId - OKR upload ID
 * @param {string} userEmail - User email requesting edit
 * @returns {Object} {
 *   success: boolean,
 *   uploadId: string,
 *   userEmail: string,
 *   isEditable: boolean,
 *   reason: string,
 *   lockDetails: {
 *     isScored: boolean,
 *     lastScoredAt: string,
 *     lastScoredBy: string,
 *     isLocked: boolean
 *   },
 *   ownership: {
 *     uploadedBy: string,
 *     isUploader: boolean,
 *     canEditAsUploader: boolean
 *   }
 * }
 */
function checkOKREditableStatus(uploadId, userEmail) {
  try {
    console.log(`[checkOKREditableStatus] Checking if ${userEmail} can edit upload ${uploadId}`);

    // Get upload record
    const sheet = getSheet_(SHEETS.OKR_UPLOAD);
    const headers = getHeaderMap_(sheet);

    if (sheet.getLastRow() < 2) {
      return {
        success: false,
        uploadId: uploadId,
        userEmail: userEmail,
        isEditable: false,
        reason: 'Upload not found',
        lockDetails: null,
        ownership: null
      };
    }

    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();

    let uploadRecord = null;
    values.forEach(row => {
      const rowObj = rowToObject_(row, Object.keys(headers));
      if (rowObj.uploadId === uploadId) {
        uploadRecord = rowObj;
      }
    });

    if (!uploadRecord) {
      return {
        success: false,
        uploadId: uploadId,
        userEmail: userEmail,
        isEditable: false,
        reason: 'Upload not found',
        lockDetails: null,
        ownership: null
      };
    }

    // Check lock status
    const lockStatus = Database.checkOKRScoredStatus(uploadId);
    const isScored = lockStatus && lockStatus.isScored;

    // Check ownership
    const isUploader = uploadRecord.userEmail === userEmail;
    const canEditAsUploader = isUploader && !isScored;

    // Determine editability
    let isEditable = false;
    let reason = '';

    if (isScored) {
      isEditable = isUploader; // Only uploader can edit scored OKRs
      reason = isUploader ? 'Scored OKRs can be edited by uploader only' : 'OKR is scored and locked for editing';
    } else {
      isEditable = true; // Any Data SPOC can edit unscored OKRs
      reason = 'OKR is editable (not yet scored)';
    }

    console.log(`[checkOKREditableStatus] Result: editable=${isEditable}, reason=${reason}`);

    return {
      success: true,
      uploadId: uploadId,
      userEmail: userEmail,
      isEditable: isEditable,
      reason: reason,
      lockDetails: {
        isScored: isScored,
        lastScoredAt: lockStatus?.lastScoredAt || null,
        lastScoredBy: lockStatus?.lastScoredBy || null,
        isLocked: isScored
      },
      ownership: {
        uploadedBy: uploadRecord.userEmail,
        isUploader: isUploader,
        canEditAsUploader: canEditAsUploader
      }
    };
  } catch (e) {
    console.error(`[checkOKREditableStatus] Error: ${e.message}`);

    return {
      success: false,
      uploadId: uploadId,
      userEmail: userEmail,
      isEditable: false,
      reason: `Error checking edit status: ${e.message}`,
      lockDetails: null,
      ownership: null
    };
  }
}


/* -------------------------------------------------------------------------- */
/*                   GOOGLE.SCRIPT.RUN API ENDPOINTS (TASK 5)                 */
/* -------------------------------------------------------------------------- */

/**
 * TASK 5: Public API endpoint for parsing and uploading OKR CSV.
 * Called from frontend: google.script.run.uploadOKRCSV(...)
 * 
 * Orchestrates the complete flow:
 * 1. Parse CSV and detect hierarchy
 * 2. Validate structure
 * 3. Upload to Google Drive
 * 4. Save metadata to database
 * 
 * @param {string} csvContent - Raw CSV file content
 * @param {string} userEmail - Data SPOC email (from frontend)
 * @param {string} fileName - Original file name
 * @returns {Object} {
 *   success: boolean,
 *   uploadId: string,
 *   corporate: string,
 *   group: string,
 *   department: string,
 *   team: string,
 *   fileId: string (Google Drive file ID),
 *   fileName: string,
 *   message: string,
 *   validation?: {
 *     isValid: boolean,
 *     errors: string[],
 *     warnings: string[]
 *   },
 *   error?: string
 * }
 */
function uploadOKRCSV(csvContent, userEmail, fileName) {
  try {
    console.log(`[uploadOKRCSV] API called: user=${userEmail}, file=${fileName}`);

    // Step 1: Parse CSV and detect hierarchy
    console.log('[uploadOKRCSV] Step 1: Parsing CSV...');
    const parseResult = parseOKRCSVAndDetectHierarchy(csvContent);

    if (!parseResult.success) {
      console.error('[uploadOKRCSV] CSV parsing failed');
      return {
        success: false,
        uploadId: null,
        corporate: null,
        group: null,
        department: null,
        team: null,
        fileId: null,
        fileName: null,
        message: 'CSV parsing failed',
        validation: parseResult.validation,
        error: parseResult.validation.errors.join('; ')
      };
    }

    console.log(`[uploadOKRCSV] CSV parsed: Corp=${parseResult.corporate}, Group=${parseResult.group}, KRs=${parseResult.keyResults.length}`);

    // Step 2: Validate parsed data
    console.log('[uploadOKRCSV] Step 2: Validating data...');
    const validation = validateOKRCSV(parseResult);

    if (!validation.isValid) {
      console.error('[uploadOKRCSV] Validation failed');
      return {
        success: false,
        uploadId: null,
        corporate: parseResult.corporate,
        group: parseResult.group,
        department: parseResult.department,
        team: parseResult.team,
        fileId: null,
        fileName: null,
        message: 'Data validation failed',
        validation: validation,
        error: validation.errors.join('; ')
      };
    }

    console.log('[uploadOKRCSV] Validation passed');

    // Step 3: Upload to Google Drive
    console.log('[uploadOKRCSV] Step 3: Uploading to Google Drive...');
    const driveUpload = uploadOKRFileToGoogleDrive(
      csvContent,
      userEmail,
      fileName,
      parseResult.corporate,
      parseResult.group,
      parseResult.department,
      parseResult.team
    );

    if (!driveUpload.success) {
      console.error('[uploadOKRCSV] Google Drive upload failed');
      return {
        success: false,
        uploadId: null,
        corporate: parseResult.corporate,
        group: parseResult.group,
        department: parseResult.department,
        team: parseResult.team,
        fileId: null,
        fileName: null,
        message: 'Google Drive upload failed',
        validation: validation,
        error: driveUpload.error
      };
    }

    console.log(`[uploadOKRCSV] Drive upload success: fileId=${driveUpload.fileId}`);

    // Step 4: Save metadata to database
    console.log('[uploadOKRCSV] Step 4: Saving metadata to database...');
    const dbResult = Database.saveOKRHierarchyUpload({
      corporate: parseResult.corporate,
      group: parseResult.group,
      department: parseResult.department,
      team: parseResult.team,
      userEmail: userEmail,
      googleDriveFileId: driveUpload.fileId,
      fileName: driveUpload.fileName,
      csvContent: csvContent
    });

    if (!dbResult.success) {
      console.error('[uploadOKRCSV] Database save failed');
      // Try to clean up Drive file
      try {
        deleteOKRFileFromDrive(driveUpload.fileId, userEmail);
      } catch (e) {
        console.warn('[uploadOKRCSV] Could not clean up Drive file after DB failure');
      }

      return {
        success: false,
        uploadId: null,
        corporate: parseResult.corporate,
        group: parseResult.group,
        department: parseResult.department,
        team: parseResult.team,
        fileId: driveUpload.fileId,
        fileName: driveUpload.fileName,
        message: 'Database save failed',
        validation: validation,
        error: dbResult.message
      };
    }

    console.log(`[uploadOKRCSV] Database save success: uploadId=${dbResult.uploadId}`);

    // Success!
    console.log('[uploadOKRCSV] Upload complete and successful');
    return {
      success: true,
      uploadId: dbResult.uploadId,
      corporate: parseResult.corporate,
      group: parseResult.group,
      department: parseResult.department,
      team: parseResult.team,
      fileId: driveUpload.fileId,
      fileName: driveUpload.fileName,
      message: dbResult.message,
      validation: validation
    };
  } catch (e) {
    console.error(`[uploadOKRCSV] Fatal error: ${e.message}`);
    console.error(`[uploadOKRCSV] Stack: ${e.stack}`);

    return {
      success: false,
      uploadId: null,
      corporate: null,
      group: null,
      department: null,
      team: null,
      fileId: null,
      fileName: null,
      message: 'Unexpected error during upload',
      error: e.message
    };
  }
}

/**
 * TASK 5: Public API endpoint to get uploading status for a hierarchy.
 * Called from frontend: google.script.run.getOKRUploadingStatus(...)
 * 
 * @param {string} corporate - Corporate name
 * @param {string} group - Group name
 * @param {string} department - Department name (optional)
 * @param {string} team - Team name (optional)
 * @param {string} userEmail - Current user email (for permissions check)
 * @returns {Object} Status data with employee list and summary (see getUploadingStatus)
 */
function getOKRUploadingStatus(corporate, group, department, team, userEmail) {
  try {
    console.log(`[getOKRUploadingStatus] API called: user=${userEmail}, Corp=${corporate}, Group=${group}`);

    // HYPERCARE: SPOC restriction removed — any DATA_SPOC can view status for any hierarchy
    // Previously: verifyUserRoleFromDatabase(userEmail, 'DATA_SPOC') was required
    // Now: Role-based access control is performed at portal load time (verifyDataSPOCAccess)
    console.log(`[getOKRUploadingStatus] Note: SPOC department restriction removed (hypercare feature)`);

    // Get uploading status
    const statusResult = getUploadingStatus(corporate, group, department, team);
    return statusResult;
  } catch (e) {
    console.error(`[getOKRUploadingStatus] Error: ${e.message}`);
    return {
      success: false,
      corporate: corporate,
      group: group,
      department: department,
      team: team,
      employees: [],
      summary: { totalEmployees: 0 },
      message: `Error retrieving uploading status: ${e.message}`,
      error: e.message
    };
  }
}

/**
 * TASK 5: Public API endpoint to get hierarchy options from parsed CSV.
 * Called from frontend to populate dropdown selectors.
 * Called from frontend: google.script.run.getHierarchyOptionsFromCSV(...)
 * 
 * @param {string} csvContent - Raw CSV file content
 * @returns {Object} {
 *   success: boolean,
 *   corporates: string[],
 *   groups: string[],
 *   departments: string[],
 *   teams: string[],
 *   message: string,
 *   validation?: { isValid: boolean, errors: string[], warnings: string[] }
 * }
 */
function getHierarchyOptionsFromCSV(csvContent) {
  try {
    console.log('[getHierarchyOptionsFromCSV] API called');

    // Parse CSV
    const parseResult = parseOKRCSVAndDetectHierarchy(csvContent);

    if (!parseResult.success) {
      console.error('[getHierarchyOptionsFromCSV] CSV parsing failed');
      return {
        success: false,
        corporates: [],
        groups: [],
        departments: [],
        teams: [],
        message: 'CSV parsing failed',
        validation: parseResult.validation
      };
    }

    // Extract unique levels
    const levels = getUniqueLevelsFromOKR(parseResult);

    console.log(`[getHierarchyOptionsFromCSV] Extracted: ${levels.corporates.length} corps, ${levels.groups.length} groups, ${levels.departments.length} depts, ${levels.teams.length} teams`);

    return {
      success: true,
      corporates: levels.corporates,
      groups: levels.groups,
      departments: levels.departments,
      teams: levels.teams,
      message: 'Hierarchy options extracted successfully',
      validation: parseResult.validation
    };
  } catch (e) {
    console.error(`[getHierarchyOptionsFromCSV] Error: ${e.message}`);
    return {
      success: false,
      corporates: [],
      groups: [],
      departments: [],
      teams: [],
      message: `Error extracting hierarchy options: ${e.message}`
    };
  }
}

/**
 * TASK 5: Public API endpoint to check if OKR lock status.
 * Called from frontend to determine read-only vs editable mode.
 * Called from frontend: google.script.run.checkOKRLockStatus(...)
 * 
 * @param {string} uploadId - OKR upload ID
 * @param {string} userEmail - Current user email
 * @returns {Object} {
 *   success: boolean,
 *   uploadId: string,
 *   isLocked: boolean,
 *   isScored: boolean,
 *   canEdit: boolean,
 *   editReason: string,
 *   lastScoredAt: string (ISO),
 *   lastScoredBy: string,
 *   isUploader: boolean,
 *   message: string
 * }
 */
function checkOKRLockStatus(uploadId, userEmail) {
  try {
    console.log(`[checkOKRLockStatus] API called: uploadId=${uploadId}, user=${userEmail}`);

    // Check editable status
    const editStatus = checkOKREditableStatus(uploadId, userEmail);

    if (!editStatus.success) {
      console.warn(`[checkOKRLockStatus] Error checking status: ${editStatus.reason}`);
      return {
        success: false,
        uploadId: uploadId,
        isLocked: true, // Default to locked for safety
        isScored: false,
        canEdit: false,
        editReason: editStatus.reason,
        lastScoredAt: null,
        lastScoredBy: null,
        isUploader: false,
        message: editStatus.reason,
        error: editStatus.reason
      };
    }

    console.log(`[checkOKRLockStatus] Result: editable=${editStatus.isEditable}, isScored=${editStatus.lockDetails?.isScored}`);

    return {
      success: true,
      uploadId: uploadId,
      isLocked: editStatus.lockDetails?.isLocked || false,
      isScored: editStatus.lockDetails?.isScored || false,
      canEdit: editStatus.isEditable,
      editReason: editStatus.reason,
      lastScoredAt: editStatus.lockDetails?.lastScoredAt || null,
      lastScoredBy: editStatus.lockDetails?.lastScoredBy || null,
      isUploader: editStatus.ownership?.isUploader || false,
      message: editStatus.reason
    };
  } catch (e) {
    console.error(`[checkOKRLockStatus] Error: ${e.message}`);
    return {
      success: false,
      uploadId: uploadId,
      isLocked: true,
      isScored: false,
      canEdit: false,
      editReason: `Error checking lock status: ${e.message}`,
      lastScoredAt: null,
      lastScoredBy: null,
      isUploader: false,
      message: `Error: ${e.message}`,
      error: e.message
    };
  }
}

/**
 * TASK 5: Public API endpoint to delete OKR upload.
 * Called from frontend to remove uploaded OKR file.
 * Called from frontend: google.script.run.deleteOKRUpload(...)
 * 
 * @param {string} uploadId - OKR upload ID
 * @param {string} userEmail - Current user email (must be uploader)
 * @returns {Object} {
 *   success: boolean,
 *   uploadId: string,
 *   message: string,
 *   error?: string
 * }
 */
function deleteOKRUpload(uploadId, userEmail) {
  try {
    console.log(`[deleteOKRUpload] API called: uploadId=${uploadId}, user=${userEmail}`);

    // HYPERCARE: SPOC role verification removed — any user with DATA_SPOC role can delete
    // Previously: Required verifyUserRoleFromDatabase(userEmail, 'DATA_SPOC')
    // Now: Only uploader ownership check remains (critical for data integrity)
    console.log(`[deleteOKRUpload] Note: SPOC department restriction removed (hypercare feature)`);

    // Check if user can edit (must be uploader) — CRITICAL: ownership check remains
    const editStatus = checkOKREditableStatus(uploadId, userEmail);
    if (!editStatus.ownership?.isUploader) {
      console.warn(`[deleteOKRUpload] User is not the uploader`);
      return {
        success: false,
        uploadId: uploadId,
        message: 'Only the uploader can delete this OKR',
        error: 'Permission denied'
      };
    }

    // Get upload record
    const sheet = getSheet_(SHEETS.OKR_UPLOAD);
    const headers = getHeaderMap_(sheet);
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();

    let uploadRecord = null;
    let rowIndex = -1;
    values.forEach((row, i) => {
      const rowObj = rowToObject_(row, Object.keys(headers));
      if (rowObj.uploadId === uploadId) {
        uploadRecord = rowObj;
        rowIndex = i;
      }
    });

    if (!uploadRecord) {
      return {
        success: false,
        uploadId: uploadId,
        message: 'Upload record not found',
        error: 'Record not found'
      };
    }

    // Delete from Google Drive
    if (uploadRecord.googleDriveFileId) {
      try {
        const driveDelete = deleteOKRFileFromDrive(uploadRecord.googleDriveFileId, userEmail);
        if (!driveDelete.success) {
          console.warn(`[deleteOKRUpload] Drive delete failed: ${driveDelete.message}`);
          // Continue anyway - delete from DB
        }
      } catch (e) {
        console.warn(`[deleteOKRUpload] Error deleting from Drive: ${e.message}`);
      }
    }

    // Delete from database
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
      throw new Error('Could not acquire lock for deletion');
    }

    try {
      const sheet = getSheet_(SHEETS.OKR_UPLOAD);
      sheet.deleteRow(rowIndex + 2);
      console.log(`[deleteOKRUpload] Deleted upload ${uploadId} from database`);
    } finally {
      lock.releaseLock();
    }

    return {
      success: true,
      uploadId: uploadId,
      message: 'OKR upload deleted successfully'
    };
  } catch (e) {
    console.error(`[deleteOKRUpload] Error: ${e.message}`);
    return {
      success: false,
      uploadId: uploadId,
      message: `Error deleting OKR upload: ${e.message}`,
      error: e.message
    };
  }
}

/**
 * TASK 5: Public API endpoint to get user's OKR upload history.
 * Called from frontend to show Data SPOC their uploads.
 * Called from frontend: google.script.run.getUserOKRHistory(...)
 * 
 * @param {string} userEmail - Data SPOC email
 * @returns {Object} {
 *   success: boolean,
 *   userEmail: string,
 *   uploads: [...],  (see getUserOKRUploads return format)
 *   summary: { totalUploads, uploadedCount, scoredCount, lockedCount },
 *   message: string
 * }
 */
function getUserOKRHistory(userEmail) {
  try {
    console.log(`[getUserOKRHistory] API called: user=${userEmail}`);

    // HYPERCARE: SPOC role verification removed — any user can view own history
    // Previously: Required verifyUserRoleFromDatabase(userEmail, 'DATA_SPOC')
    // Now: Role is still verified at portal entry point (verifyDataSPOCAccess), not here
    console.log(`[getUserOKRHistory] Note: SPOC department restriction removed (hypercare feature)`);

    // Get uploads
    const uploadHistory = getUserOKRUploads(userEmail);
    return uploadHistory;
  } catch (e) {
    console.error(`[getUserOKRHistory] Error: ${e.message}`);
    return {
      success: false,
      userEmail: userEmail,
      uploads: [],
      summary: { totalUploads: 0 },
      message: `Error retrieving upload history: ${e.message}`,
      error: e.message
    };
  }
}

/**
 * TASK 5: Public API endpoint to verify user role.
 * Called from frontend to authenticate Data SPOC portal access.
 * Called from frontend: google.script.run.verifyDataSPOCAccess(...)
 * 
 * @param {string} userEmail - User email
 * @returns {Object} {
 *   success: boolean,
 *   hasAccess: boolean,
 *   role: string,
 *   employeeId: number,
 *   message: string
 * }
 */
function verifyDataSPOCAccess(userEmail) {
  try {
    console.log(`[verifyDataSPOCAccess] API called: user=${userEmail}`);

    const verification = verifyUserRoleFromDatabase(userEmail, 'DATA_SPOC');

    if (!verification.success) {
      console.warn(`[verifyDataSPOCAccess] Verification failed: ${verification.message}`);
      return {
        success: false,
        hasAccess: false,
        role: null,
        employeeId: null,
        message: verification.message
      };
    }

    return {
      success: true,
      hasAccess: true,
      role: verification.role,
      employeeId: verification.employeeId,
      message: 'Access granted'
    };
  } catch (e) {
    console.error(`[verifyDataSPOCAccess] Error: ${e.message}`);
    return {
      success: false,
      hasAccess: false,
      role: null,
      employeeId: null,
      message: `Error verifying access: ${e.message}`
    };
  }
}
