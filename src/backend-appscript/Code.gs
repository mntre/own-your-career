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
 * @param {string|number} employeeId - The employee being assessed
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
 * @param {string|number} employeeId - The employee being assessed
 * @param {string|number} managerId - The manager providing assessment
 * @param {Object} feedForwardData - Feed Forward form data
 * @returns {Object} { success: boolean, message: string }
 */
function saveFeedForward(employeeId, managerId, feedForwardData) {
  try {
    if (!canManagerAccessEmployee_(managerId, employeeId)) {
      logAccessAttempt(
        `[Manager: ${managerId}]`,
        'MANAGER',
        'DENIED',
        `Unauthorized attempt to save Feed Forward for employee ${employeeId}`
      );
      return { success: false, message: 'You do not have authorization to assess this employee.' };
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
 * @param {string|number} employeeId - The employee whose review is being acknowledged
 * @param {string|number} userId - The user submitting
 * @param {Object} ackData - Acknowledgement data
 * @param {'MANAGER'|'EMPLOYEE'} type - Type of acknowledgement
 * @returns {Object} { success: boolean, message: string }
 */
function saveAcknowledgement(employeeId, userId, ackData, type) {
  try {
    if (type === 'MANAGER') {
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
      if (success) {
        return { success: true, message: 'Acknowledgement saved successfully' };
      }
      return { success: false, message: 'Failed to save acknowledgement' };
    } else {
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
    
    // Step 1: Get the employee record to verify role
    const employee = getEmployeeById_(managerId);
    
    if (!employee) {
      console.log(`[getTeamMembersWithStatusData] Employee not found for ID: ${managerId}`);
      logAccessAttempt(
        `[User: ${managerId}]`,
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
    console.log(`[getTeamMembersWithStatusData] User ${managerId} has role: ${userRole}`);
    
    if (userRole !== 'MANAGER') {
      console.log(`[getTeamMembersWithStatusData] Access denied: ${managerId} is not a MANAGER (role=${userRole})`);
      logAccessAttempt(
        `[User: ${managerId}]`,
        userRole,
        'DENIED',
        'User role is not MANAGER'
      );
      return { 
        success: false, 
        message: 'You do not have authorization to view team members.' 
      };
    }
    
    console.log(`[getTeamMembersWithStatusData] User ${managerId} is a manager, loading team members...`);
    
    // Step 3: Get all team members (direct + indirect reports)
    const teamMembers = getTeamMembersRecursive_(managerId);
    
    console.log(`[getTeamMembersWithStatusData] Retrieved ${teamMembers.length} team members`);
    
    if (teamMembers.length === 0) {
      console.log(`[getTeamMembersWithStatusData] No team members found for manager ${managerId} (may have no direct reports)`);
    }
    
    // Step 4: Enhance with workflow status
    const enhancedTeamMembers = teamMembers.map(member => {
      const employeeId = member.EmployeeID || member.employeeId;
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
        managerEmployeeId: member.ManagerID || member.managerId || null,
        workflowStatus: workflowStatus
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
