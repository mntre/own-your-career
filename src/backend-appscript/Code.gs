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
 * @param {string|number} employeeId - The employee submitting self-assessment
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
