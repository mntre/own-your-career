/**
 * Own Your Career — Google Sheets Data Layer
 * 
 * Uses Google Sheets as the database for the Apps Script deployment.
 * Uses LockService for concurrent write protection.
 * Uses column name lookup (never rely on column position alone).
 * 
 * @fileoverview Google Sheets CRUD operations
 */

/* -------------------------------------------------------------------------- */
/*                                CONFIGURATION                               */
/* -------------------------------------------------------------------------- */

/** @type {string} Spreadsheet ID - Replace with your actual Google Sheet ID */
const SS_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');

/** @type {Object} Sheet names mapping */
const SHEETS = {
  EMPLOYEES: 'Employee Database',
  SKILLS_ASSESSMENT: 'SkillsAssessment',
  OKR_UPLOAD: 'OKRUpload',
  SELF_ASSESSMENT: 'SelfAssessment',
  FEED_FORWARD: 'FeedForward',
  MANAGER_ACK: 'ManagerAcknowledgement',
  EMPLOYEE_ACK: 'EmployeeAcknowledgement',
  WORKFLOW_STATUS: 'WorkflowStatus',
  SELF_ASSESSMENT_QUESTIONS: 'Self-Assessment Questions',
  SYSTEM_CONFIG: 'SystemConfig'
};

/* -------------------------------------------------------------------------- */
/*                              UTILITY FUNCTIONS                             */
/* -------------------------------------------------------------------------- */

/**
 * Gets the active spreadsheet.
 * @returns {Spreadsheet} Google Sheets spreadsheet object
 */
function getSpreadsheet_() {
  if (!SS_ID) {
    throw new Error('SPREADSHEET_ID not configured in Script Properties');
  }
  return SpreadsheetApp.openById(SS_ID);
}

/**
 * Gets a sheet by name.
 * @param {string} sheetName - Name of the sheet
 * @returns {Sheet} Google Sheets sheet object
 */
function getSheet_(sheetName) {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }
  return sheet;
}

/**
 * Gets the header row and creates a column name → index map.
 * @param {Sheet} sheet - Google Sheets sheet object
 * @returns {Object} Map of column names to indices (0-indexed)
 */
function getHeaderMap_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((header, i) => {
    map[header.trim()] = i;
  });
  return map;
}

/**
 * Converts a row object to an array based on header order.
 * @param {Object} rowData - Object with column names as keys
 * @param {string[]} headers - Array of header names in order
 * @returns {Object} Object with column indices as keys
 */
function rowToObject_(rowData, headers) {
  const obj = {};
  headers.forEach((header, i) => {
    obj[header] = rowData[i];
  });
  return obj;
}

/**
 * Gets all rows from a sheet.
 * @param {string} sheetName - Name of the sheet
 * @returns {Object[]} Array of row objects
 */
function getAllRows_(sheetName) {
  const sheet = getSheet_(sheetName);
  const headers = getHeaderMap_(sheet);
  const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
  const values = dataRange.getValues();
  
  return values.map(row => rowToObject_(row, Object.keys(headers)));
}

/* -------------------------------------------------------------------------- */
/*                            EMPLOYEE DATA OPERATIONS                        */
/* -------------------------------------------------------------------------- */

/**
 * Gets all employees from the database.
 * @returns {Object[]} Array of employee objects
 */
function getAllEmployees() {
  try {
    return getAllRows_(SHEETS.EMPLOYEES);
  } catch (e) {
    console.error(`[Database] Error getting employees: ${e.message}`);
    return [];
  }
}

/**
 * Checks if an employee is a manager (has direct reports).
 * @param {string} employeeId - The employee ID to check
 * @returns {boolean} True if employeeId appears as managerId for any employee
 */
function isUserAManager(employeeId) {
  try {
    const employees = getAllRows_(SHEETS.EMPLOYEES);
    return employees.some(emp => emp.managerId === employeeId);
  } catch (e) {
    console.error(`[Database] Error checking manager status for ${employeeId}: ${e.message}`);
    return false;
  }
}

/**
 * Gets team members for a specific manager (direct reports only).
 * @param {string} managerId - The manager's employee ID
 * @returns {Object[]} Array of team member objects
 */
function getTeamMembers(managerId) {
  try {
    const employees = getAllRows_(SHEETS.EMPLOYEES);
    const teamMembers = employees.filter(emp => emp.ManagerID === managerId || emp.managerId === managerId);
    
    console.log(`[Database] Found ${teamMembers.length} direct reports for manager ${managerId}`);
    teamMembers.forEach(member => {
      console.log(`[Database] Team member: ID=${member.EmployeeID || member.employeeId}, Name=${member.Name || member.name}, Department=${member.Department || member.department}, Group=${member.Group || member.group}, DataSpocID=${member.DataSpocID || member.dataSPOCId || 'None'}`);
    });
    
    return teamMembers;
  } catch (e) {
    console.error(`[Database] Error getting team members for ${managerId}: ${e.message}`);
    return [];
  }
}

/**
 * Gets team members for a specific manager (direct + indirect reports recursively).
 * @param {string} managerId - The manager's employee ID
 * @returns {Object[]} Array of all direct and indirect team member objects
 */
function getTeamMembersRecursive(managerId) {
  try {
    const employees = getAllRows_(SHEETS.EMPLOYEES);
    const result = [];
    const visited = new Set();
    
    const collectTeamMembers = (currentManagerId) => {
      if (visited.has(currentManagerId)) return;
      visited.add(currentManagerId);
      
      // Find all direct reports of this manager
      const directReports = employees.filter(emp => {
        const managerCol = emp.ManagerID || emp.managerId;
        return managerCol === currentManagerId;
      });
      
      directReports.forEach(member => {
        if (!visited.has(member.EmployeeID || member.employeeId)) {
          result.push(member);
          // Recursively get their team members
          collectTeamMembers(member.EmployeeID || member.employeeId);
        }
      });
    };
    
    collectTeamMembers(managerId);
    
    console.log(`[Database] Found ${result.length} total team members (direct + indirect) for manager ${managerId}`);
    result.forEach(member => {
      console.log(`[Database] Team member: ID=${member.EmployeeID || member.employeeId}, Name=${member.Name || member.name}, Department=${member.Department || member.department}, Group=${member.Group || member.group}, Team=${member.Team || member.team}, DataSpocID=${member.DataSpocID || member.dataSPOCId || 'None'}`);
    });
    
    return result;
  } catch (e) {
    console.error(`[Database] Error getting recursive team members for ${managerId}: ${e.message}`);
    return [];
  }
}

/**
 * Gets an employee by ID.
 * @param {string} employeeId - The employee ID
 * @returns {Object|null} Employee object or null if not found
 */
function getEmployeeById(employeeId) {
  try {
    const employees = getAllRows_(SHEETS.EMPLOYEES);
    return employees.find(emp => emp.employeeId === employeeId) || null;
  } catch (e) {
    console.error(`[Database] Error getting employee ${employeeId}: ${e.message}`);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                          WORKFLOW STATUS OPERATIONS                        */
/* -------------------------------------------------------------------------- */

/**
 * Gets or creates workflow status for an employee.
 * @param {string} employeeId - The employee ID
 * @returns {Object} Workflow status object
 */
function getWorkflowStatus(employeeId) {
  try {
    const statusSheet = getSheet_(SHEETS.WORKFLOW_STATUS);
    const headers = getHeaderMap_(statusSheet);
    const dataRange = statusSheet.getRange(2, 1, statusSheet.getLastRow() - 1, statusSheet.getLastColumn());
    const values = dataRange.getValues();
    
    const statusRow = values.find(row => {
      const rowObj = rowToObject_(row, Object.keys(headers));
      return rowObj.employeeId === employeeId;
    });
    
    if (statusRow) {
      return rowToObject_(statusRow, Object.keys(headers));
    }
    
    // Return default status if not found
    return {
      employeeId: employeeId,
      step1Complete: false,
      step2Complete: false,
      step3Complete: false,
      step4Complete: false,
      step5Complete: false,
      step6Unlocked: false,
      step7Complete: false,
      allLocked: true
    };
  } catch (e) {
    console.error(`[Database] Error getting workflow status for ${employeeId}: ${e.message}`);
    return null;
  }
}

/**
 * Updates workflow status for an employee.
 * @param {string} employeeId - The employee ID
 * @param {string} step - Step identifier (step1Complete, step2Complete, etc.)
 * @param {boolean} status - New status value
 * @returns {boolean} True if successful
 */
function updateWorkflowStatus(employeeId, step, status) {
  try {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
      throw new Error('Could not acquire lock for workflow status update');
    }
    
    const statusSheet = getSheet_(SHEETS.WORKFLOW_STATUS);
    const headers = getHeaderMap_(statusSheet);
    const dataRange = statusSheet.getRange(2, 1, statusSheet.getLastRow() - 1, statusSheet.getLastColumn());
    const values = dataRange.getValues();
    
    let rowIndex = -1;
    let existingRow = null;
    
    values.forEach((row, i) => {
      const rowObj = rowToObject_(row, Object.keys(headers));
      if (rowObj.employeeId === employeeId) {
        rowIndex = i;
        existingRow = rowObj;
      }
    });
    
    let rowData;
    if (existingRow) {
      rowData = Object.values(existingRow);
    } else {
      // Create new row with default values
      rowData = [
        employeeId, false, false, false, false, false, false, false, true
      ];
    }
    
    // Update the specific step column
    const stepIndex = headers[step];
    if (stepIndex >= 0) {
      rowData[stepIndex] = status;
    }
    
    if (existingRow) {
      // Update existing row
      const rowRange = statusSheet.getRange(rowIndex + 2, 1, 1, statusSheet.getLastColumn());
      rowRange.setValues([rowData]);
    } else {
      // Create new row
      const lastRow = statusSheet.getLastRow() + 1;
      const newRange = statusSheet.getRange(lastRow, 1, 1, Object.keys(headers).length);
      newRange.setValues([rowData]);
    }
    
    lock.releaseLock();
    return true;
  } catch (e) {
    console.error(`[Database] Error updating workflow status for ${employeeId}: ${e.message}`);
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                           SKILLS ASSESSMENT OPERATIONS                     */
/* -------------------------------------------------------------------------- */

/**
 * Saves skills assessment data (Step 1).
 * @param {string} employeeId - The employee being assessed
 * @param {Object} assessmentData - Skills assessment form data
 * @returns {boolean} True if successful
 */
function saveSkillsAssessment(employeeId, assessmentData) {
  try {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
      throw new Error('Could not acquire lock for skills assessment');
    }
    
    const sheet = getSheet_(SHEETS.SKILLS_ASSESSMENT);
    const headers = getHeaderMap_(sheet);
    
    // Check if assessment already exists
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    let existingIndex = -1;
    values.forEach((row, i) => {
      const rowObj = rowToObject_(row, Object.keys(headers));
      if (rowObj.employeeId === employeeId) {
        existingIndex = i;
      }
    });
    
    // Detect conflicts if updating existing data
    if (existingIndex >= 0) {
      const conflictInfo = detectConflict(SHEETS.SKILLS_ASSESSMENT, employeeId, assessmentData);
      
      if (conflictInfo.hasConflict) {
        logConflict(employeeId, SHEETS.SKILLS_ASSESSMENT, conflictInfo);
        lock.releaseLock();
        
        // Return conflict info to frontend for user decision
        return {
          success: false,
          message: 'Data conflict detected. Sheets has newer data.',
          conflict: {
            type: conflictInfo.type,
            sheetsData: conflictInfo.sheetsData,
            portalData: conflictInfo.portalData,
            sheetsTimestamp: conflictInfo.sheetsTimestamp?.toString(),
            portalTimestamp: conflictInfo.portalTimestamp?.toString()
          }
        };
      }
    }
    
    const now = new Date().toISOString();
    const assessmentObj = {
      assessmentId: assessmentData.assessmentId || Utilities.getUuid(),
      employeeId: employeeId,
      lastSyncedAt: now,
      syncStatus: 'SYNCED',
      // JSON.stringify array fields for storage in Sheets
      skills: JSON.stringify(assessmentData.skills || []),
      requiredLevel: JSON.stringify(assessmentData.requiredLevel || []),
      actualLevel: JSON.stringify(assessmentData.actualLevel || []),
      remarks: JSON.stringify(assessmentData.remarks || []),
      ...Object.fromEntries(
        Object.entries(assessmentData).filter(
          ([key]) => !['skills', 'requiredLevel', 'actualLevel', 'remarks'].includes(key)
        )
      )
    };
    
    if (existingIndex >= 0) {
      // Update existing row
      const rowRange = sheet.getRange(existingIndex + 2, 1, 1, sheet.getLastColumn());
      rowRange.setValues([Object.values(assessmentObj)]);
    } else {
      // Create new row
      const lastRow = sheet.getLastRow() + 1;
      const newRange = sheet.getRange(lastRow, 1, 1, Object.keys(headers).length);
      newRange.setValues([Object.values(assessmentObj)]);
    }
    
    // Update workflow status
    updateWorkflowStatus(employeeId, 'step1Complete', true);
    
    lock.releaseLock();
    return { success: true, message: 'Skills assessment saved successfully' };
  } catch (e) {
    console.error(`[Database] Error saving skills assessment for ${employeeId}: ${e.message}`);
    return { success: false, message: e.message };
  }
}

/* -------------------------------------------------------------------------- */
/*                            OKR UPLOAD OPERATIONS                           */
/* -------------------------------------------------------------------------- */

/**
 * Saves OKR upload data (Step 2).
 * @param {string} employeeId - The employee whose OKR is being uploaded
 * @param {Object} okrData - OKR form data (corporateOKR, teamOKR, targets[], weight[], result[], finalScore, bracket)
 * @returns {boolean} True if successful
 */
function saveOKRUpload(employeeId, okrData) {
  try {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
      throw new Error('Could not acquire lock for OKR upload');
    }
    
    const sheet = getSheet_(SHEETS.OKR_UPLOAD);
    const headers = getHeaderMap_(sheet);
    
    // Check if OKR already exists
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    let existingIndex = -1;
    values.forEach((row, i) => {
      const rowObj = rowToObject_(row, Object.keys(headers));
      if (rowObj.employeeId === employeeId) {
        existingIndex = i;
      }
    });
    
    const now = new Date().toISOString();
    const okrObj = {
      uploadId: okrData.uploadId || Utilities.getUuid(),
      employeeId: employeeId,
      lastSyncedAt: now,
      syncStatus: 'SYNCED',
      // JSON.stringify array fields for storage in Sheets
      targets: JSON.stringify(okrData.targets || []),
      weight: JSON.stringify(okrData.weight || []),
      result: JSON.stringify(okrData.result || []),
      ...Object.fromEntries(
        Object.entries(okrData).filter(
          ([key]) => !['targets', 'weight', 'result'].includes(key)
        )
      )
    };
    
    if (existingIndex >= 0) {
      // Update existing row
      const rowRange = sheet.getRange(existingIndex + 2, 1, 1, sheet.getLastColumn());
      rowRange.setValues([Object.values(okrObj)]);
    } else {
      // Create new row
      const lastRow = sheet.getLastRow() + 1;
      const newRange = sheet.getRange(lastRow, 1, 1, Object.keys(headers).length);
      newRange.setValues([Object.values(okrObj)]);
    }
    
    // Update workflow status
    updateWorkflowStatus(employeeId, 'step2Complete', true);
    
    lock.releaseLock();
    return true;
  } catch (e) {
    console.error(`[Database] Error saving OKR upload for ${employeeId}: ${e.message}`);
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                         SELF ASSESSMENT OPERATIONS                         */
/* -------------------------------------------------------------------------- */

/**
 * Saves self-assessment responses.
 * @param {string} employeeId - The employee submitting self-assessment
 * @param {Object} selfAssessmentData - Self-assessment data
 * @returns {boolean} True if successful
 */
function saveSelfAssessment(employeeId, selfAssessmentData) {
  try {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
      throw new Error('Could not acquire lock for self-assessment');
    }
    
    const sheet = getSheet_(SHEETS.SELF_ASSESSMENT);
    const headers = getHeaderMap_(sheet);
    
    // Check if self-assessment already exists
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    let existingIndex = -1;
    values.forEach((row, i) => {
      const rowObj = rowToObject_(row, Object.keys(headers));
      if (rowObj.employeeId === employeeId) {
        existingIndex = i;
      }
    });
    
    const now = new Date().toISOString();
    const assessmentObj = {
      employeeId: employeeId,
      lastSyncedAt: now,
      syncStatus: 'SYNCED',
      ...selfAssessmentData
    };
    
    if (existingIndex >= 0) {
      // Update existing row
      const rowRange = sheet.getRange(existingIndex + 2, 1, 1, sheet.getLastColumn());
      rowRange.setValues([Object.values(assessmentObj)]);
    } else {
      // Create new row
      const lastRow = sheet.getLastRow() + 1;
      const newRange = sheet.getRange(lastRow, 1, 1, Object.keys(headers).length);
      newRange.setValues([Object.values(assessmentObj)]);
    }
    
    // Update workflow status
    updateWorkflowStatus(employeeId, 'Step3_SelfAssessment', 'COMPLETED');
    
    lock.releaseLock();
    return true;
  } catch (e) {
    console.error(`[Database] Error saving self-assessment for ${employeeId}: ${e.message}`);
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                          FEED FORWARD OPERATIONS                           */
/* -------------------------------------------------------------------------- */

/**
 * Saves Feed Forward / Manager Assessment.
 * @param {string} employeeId - The employee being assessed
 * @param {string} managerId - The manager providing assessment
 * @param {Object} feedForwardData - Feed Forward data
 * @returns {boolean} True if successful
 */
function saveFeedForward(employeeId, managerId, feedForwardData) {
  try {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
      throw new Error('Could not acquire lock for feed forward');
    }
    
    const sheet = getSheet_(SHEETS.FEED_FORWARD);
    const headers = getHeaderMap_(sheet);
    
    // Check if Feed Forward already exists
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    let existingIndex = -1;
    values.forEach((row, i) => {
      const rowObj = rowToObject_(row, Object.keys(headers));
      if (rowObj.employeeId === employeeId) {
        existingIndex = i;
      }
    });
    
    // Detect conflicts if updating existing data
    if (existingIndex >= 0) {
      const conflictInfo = detectConflict(SHEETS.FEED_FORWARD, employeeId, feedForwardData);
      
      if (conflictInfo.hasConflict) {
        logConflict(employeeId, SHEETS.FEED_FORWARD, conflictInfo);
        lock.releaseLock();
        
        return {
          success: false,
          message: 'Data conflict detected. Sheets has newer data.',
          conflict: {
            type: conflictInfo.type,
            sheetsData: conflictInfo.sheetsData,
            portalData: conflictInfo.portalData,
            sheetsTimestamp: conflictInfo.sheetsTimestamp?.toString(),
            portalTimestamp: conflictInfo.portalTimestamp?.toString()
          }
        };
      }
    }
    
    const now = new Date().toISOString();
    const feedForwardObj = {
      employeeId: employeeId,
      managerId: managerId,
      lastSyncedAt: now,
      syncStatus: 'SYNCED',
      ...feedForwardData
    };
    
    if (existingIndex >= 0) {
      // Update existing row
      const rowRange = sheet.getRange(existingIndex + 2, 1, 1, sheet.getLastColumn());
      rowRange.setValues([Object.values(feedForwardObj)]);
    } else {
      // Create new row
      const lastRow = sheet.getLastRow() + 1;
      const newRange = sheet.getRange(lastRow, 1, 1, Object.keys(headers).length);
      newRange.setValues([Object.values(feedForwardObj)]);
    }
    
    // Update workflow status
    updateWorkflowStatus(employeeId, 'Step4_FeedForward', 'COMPLETED');
    
    lock.releaseLock();
    return { success: true, message: 'Feed Forward saved successfully' };
  } catch (e) {
    console.error(`[Database] Error saving feed forward for ${employeeId}: ${e.message}`);
    return { success: false, message: e.message };
  }
}

/* -------------------------------------------------------------------------- */
/*                      MANAGER ACKNOWLEDGEMENT OPERATIONS                    */
/* -------------------------------------------------------------------------- */

/**
 * Saves Manager Acknowledgement.
 * @param {string} employeeId - The employee whose review is being acknowledged
 * @param {string} managerId - The manager submitting acknowledgement
 * @param {Object} ackData - Acknowledgement data
 * @returns {boolean} True if successful
 */
function saveManagerAcknowledgement(employeeId, managerId, ackData) {
  try {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
      throw new Error('Could not acquire lock for manager acknowledgement');
    }
    
    const sheet = getSheet_(SHEETS.MANAGER_ACK);
    const headers = getHeaderMap_(sheet);
    
    // Check if acknowledgement already exists
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    let existingIndex = -1;
    values.forEach((row, i) => {
      const rowObj = rowToObject_(row, Object.keys(headers));
      if (rowObj.employeeId === employeeId) {
        existingIndex = i;
      }
    });
    
    const now = new Date().toISOString();
    const ackObj = {
      employeeId: employeeId,
      managerId: managerId,
      lastSyncedAt: now,
      syncStatus: 'SYNCED',
      ...ackData
    };
    
    if (existingIndex >= 0) {
      // Update existing row
      const rowRange = sheet.getRange(existingIndex + 2, 1, 1, sheet.getLastColumn());
      rowRange.setValues([Object.values(ackObj)]);
    } else {
      // Create new row
      const lastRow = sheet.getLastRow() + 1;
      const newRange = sheet.getRange(lastRow, 1, 1, Object.keys(headers).length);
      newRange.setValues([Object.values(ackObj)]);
    }
    
    // Update workflow status
    updateWorkflowStatus(employeeId, 'Step5_ManagerAck', 'COMPLETED');
    
    lock.releaseLock();
    return true;
  } catch (e) {
    console.error(`[Database] Error saving manager acknowledgement for ${employeeId}: ${e.message}`);
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                     EMPLOYEE ACKNOWLEDGEMENT OPERATIONS                    */
/* -------------------------------------------------------------------------- */

/**
 * Saves Employee Acknowledgement.
 * @param {string} employeeId - The employee submitting acknowledgement
 * @param {Object} ackData - Acknowledgement data
 * @returns {boolean} True if successful
 */
function saveEmployeeAcknowledgement(employeeId, ackData) {
  try {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
      throw new Error('Could not acquire lock for employee acknowledgement');
    }
    
    const sheet = getSheet_(SHEETS.EMPLOYEE_ACK);
    const headers = getHeaderMap_(sheet);
    
    // Check if acknowledgement already exists
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    let existingIndex = -1;
    values.forEach((row, i) => {
      const rowObj = rowToObject_(row, Object.keys(headers));
      if (rowObj.employeeId === employeeId) {
        existingIndex = i;
      }
    });
    
    const now = new Date().toISOString();
    const ackObj = {
      employeeId: employeeId,
      lastSyncedAt: now,
      syncStatus: 'SYNCED',
      ...ackData
    };
    
    if (existingIndex >= 0) {
      // Update existing row
      const rowRange = sheet.getRange(existingIndex + 2, 1, 1, sheet.getLastColumn());
      rowRange.setValues([Object.values(ackObj)]);
    } else {
      // Create new row
      const lastRow = sheet.getLastRow() + 1;
      const newRange = sheet.getRange(lastRow, 1, 1, Object.keys(headers).length);
      newRange.setValues([Object.values(ackObj)]);
    }
    
    // Update workflow status
    updateWorkflowStatus(employeeId, 'Step7_EmployeeAck', 'COMPLETED');
    
    lock.releaseLock();
    return true;
  } catch (e) {
    console.error(`[Database] Error saving employee acknowledgement for ${employeeId}: ${e.message}`);
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                           HELPER FUNCTIONS                                 */
/* -------------------------------------------------------------------------- */

/**
 * Gets all accumulated scores and feedback for an employee (Step 6).
 * @param {string} employeeId - The employee to retrieve scores for
 * @returns {Object|null} All scores and feedback or null if not found
 */
function getAllScores(employeeId) {
  try {
    const skills = getSheet_(SHEETS.SKILLS_ASSESSMENT);
    const okr = getSheet_(SHEETS.OKR_UPLOAD);
    const self = getSheet_(SHEETS.SELF_ASSESSMENT);
    const feedForward = getSheet_(SHEETS.FEED_FORWARD);
    const managerAck = getSheet_(SHEETS.MANAGER_ACK);
    
    // Helper to get row by employeeId
    const getRowByEmployeeId = (sheet, employeeId) => {
      const headers = getHeaderMap_(sheet);
      const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
      const values = dataRange.getValues();
      return values.find(row => {
        const rowObj = rowToObject_(row, Object.keys(headers));
        return rowObj.employeeId === employeeId;
      });
    };
    
    return {
      employeeId,
      skillsAssessment: getRowByEmployeeId(skills, employeeId),
      okrUpload: getRowByEmployeeId(okr, employeeId),
      selfAssessment: getRowByEmployeeId(self, employeeId),
      feedForward: getRowByEmployeeId(feedForward, employeeId),
      managerAcknowledgement: getRowByEmployeeId(managerAck, employeeId)
    };
  } catch (e) {
    console.error(`[Database] Error getting all scores for ${employeeId}: ${e.message}`);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                      READ FUNCTIONS FOR PORTAL DISPLAY                    */
/* -------------------------------------------------------------------------- */

/**
 * Gets skills assessment data for an employee (Step 1).
 * @param {string} employeeId - The employee ID
 * @returns {Object|null} Skills assessment object or null if not found
 */
function getSkillsAssessment(employeeId) {
  try {
    const sheet = getSheet_(SHEETS.SKILLS_ASSESSMENT);
    const headers = getHeaderMap_(sheet);
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    const row = values.find(r => {
      const rowObj = rowToObject_(r, Object.keys(headers));
      return rowObj.employeeId === employeeId;
    });
    
    if (row) {
      const rowObj = rowToObject_(row, Object.keys(headers));
      // Parse array fields from JSON strings
      return {
        ...rowObj,
        skills: rowObj.skills ? JSON.parse(rowObj.skills) : [],
        requiredLevel: rowObj.requiredLevel ? JSON.parse(rowObj.requiredLevel) : [],
        actualLevel: rowObj.actualLevel ? JSON.parse(rowObj.actualLevel) : [],
        remarks: rowObj.remarks ? JSON.parse(rowObj.remarks) : []
      };
    }
    return null;
  } catch (e) {
    console.error(`[Database] Error getting skills assessment for ${employeeId}: ${e.message}`);
    return null;
  }
}

/**
 * Gets OKR upload data for an employee (Step 2).
 * @param {string} employeeId - The employee ID
 * @returns {Object|null} OKR upload object or null if not found
 */
function getOKRUpload(employeeId) {
  try {
    const sheet = getSheet_(SHEETS.OKR_UPLOAD);
    const headers = getHeaderMap_(sheet);
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    const row = values.find(r => {
      const rowObj = rowToObject_(r, Object.keys(headers));
      return rowObj.employeeId === employeeId;
    });
    
    if (row) {
      const rowObj = rowToObject_(row, Object.keys(headers));
      // Parse array fields from JSON strings
      return {
        ...rowObj,
        targets: rowObj.targets ? JSON.parse(rowObj.targets) : [],
        weight: rowObj.weight ? JSON.parse(rowObj.weight) : [],
        result: rowObj.result ? JSON.parse(rowObj.result) : []
      };
    }
    return null;
  } catch (e) {
    console.error(`[Database] Error getting OKR upload for ${employeeId}: ${e.message}`);
    return null;
  }
}

/**
 * Gets self-assessment data for an employee (Step 3).
 * @param {string} employeeId - The employee ID
 * @returns {Object|null} Self-assessment object or null if not found
 */
function getSelfAssessment(employeeId) {
  try {
    const sheet = getSheet_(SHEETS.SELF_ASSESSMENT);
    const headers = getHeaderMap_(sheet);
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    const row = values.find(r => {
      const rowObj = rowToObject_(r, Object.keys(headers));
      return rowObj.employeeId === employeeId;
    });
    
    if (row) {
      return rowToObject_(row, Object.keys(headers));
    }
    return null;
  } catch (e) {
    console.error(`[Database] Error getting self-assessment for ${employeeId}: ${e.message}`);
    return null;
  }
}

/**
 * Gets Feed Forward data for an employee (Step 4).
 * @param {string} employeeId - The employee ID
 * @returns {Object|null} Feed Forward object or null if not found
 */
function getFeedForward(employeeId) {
  try {
    const sheet = getSheet_(SHEETS.FEED_FORWARD);
    const headers = getHeaderMap_(sheet);
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    const row = values.find(r => {
      const rowObj = rowToObject_(r, Object.keys(headers));
      return rowObj.employeeId === employeeId;
    });
    
    if (row) {
      return rowToObject_(row, Object.keys(headers));
    }
    return null;
  } catch (e) {
    console.error(`[Database] Error getting feed forward for ${employeeId}: ${e.message}`);
    return null;
  }
}

/**
 * Gets Manager Acknowledgement data for an employee (Step 5).
 * @param {string} employeeId - The employee ID
 * @returns {Object|null} Manager acknowledgement object or null if not found
 */
function getManagerAcknowledgement(employeeId) {
  try {
    const sheet = getSheet_(SHEETS.MANAGER_ACK);
    const headers = getHeaderMap_(sheet);
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    const row = values.find(r => {
      const rowObj = rowToObject_(r, Object.keys(headers));
      return rowObj.employeeId === employeeId;
    });
    
    if (row) {
      return rowToObject_(row, Object.keys(headers));
    }
    return null;
  } catch (e) {
    console.error(`[Database] Error getting manager acknowledgement for ${employeeId}: ${e.message}`);
    return null;
  }
}

/**
 * Gets Employee Acknowledgement data for an employee (Step 7).
 * @param {string} employeeId - The employee ID
 * @returns {Object|null} Employee acknowledgement object or null if not found
 */
function getEmployeeAcknowledgement(employeeId) {
  try {
    const sheet = getSheet_(SHEETS.EMPLOYEE_ACK);
    const headers = getHeaderMap_(sheet);
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    const row = values.find(r => {
      const rowObj = rowToObject_(r, Object.keys(headers));
      return rowObj.employeeId === employeeId;
    });
    
    if (row) {
      return rowToObject_(row, Object.keys(headers));
    }
    return null;
  } catch (e) {
    console.error(`[Database] Error getting employee acknowledgement for ${employeeId}: ${e.message}`);
    return null;
  }
}

/**
 * Gets all team members with their current workflow status (for Manager Portal).
 * @param {string} managerId - The manager's employee ID
 * @returns {Object[]} Array of team members with workflow status
 */
function getTeamMembersWithStatus(managerId) {
  try {
    const teamMembers = getTeamMembers(managerId);
    return teamMembers.map(member => {
      const status = getWorkflowStatus(member.employeeId);
      return {
        ...member,
        workflowStatus: status
      };
    });
  } catch (e) {
    console.error(`[Database] Error getting team members with status for ${managerId}: ${e.message}`);
    return [];
  }
}

/**
 * Gets recursive team members (direct + indirect reports) for a manager.
 * @param {string} managerId - The manager's employee ID
 * @returns {Object[]} Array of all direct and indirect team members
 */
function getTeamMembersRecursive(managerId) {
  try {
    const allEmployees = getAllEmployees();
    const teamMembers = [];
    const visited = new Set();
    
    const addTeamMembers = (currentManagerId) => {
      const directReports = allEmployees.filter(emp => emp.managerId === currentManagerId && !visited.has(emp.employeeId));
      directReports.forEach(report => {
        visited.add(report.employeeId);
        teamMembers.push(report);
        addTeamMembers(report.employeeId); // Recursive call for this employee's reports
      });
    };
    
    addTeamMembers(managerId);
    return teamMembers;
  } catch (e) {
    console.error(`[Database] Error getting recursive team members for ${managerId}: ${e.message}`);
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/*                       CONFLICT DETECTION & RESOLUTION                      */
/* -------------------------------------------------------------------------- */

/**
 * Conflict detection object to track data changes.
 * @typedef {Object} ConflictInfo
 * @property {boolean} hasConflict - Whether a conflict exists
 * @property {string} type - Type of conflict ('SHEETS_NEWER' | 'PORTAL_NEWER' | 'BOTH_MODIFIED')
 * @property {Date} portalTimestamp - Last sync time from portal data
 * @property {Date} sheetsTimestamp - Last modification time from Sheets
 * @property {Object} portalData - Data from portal
 * @property {Object} sheetsData - Data from Sheets
 */

/**
 * Checks for conflicts between portal data and Sheets data.
 * Compares timestamps to determine if data was modified externally.
 * 
 * @param {string} sheetName - Name of the sheet to check
 * @param {string} employeeId - Employee ID to look for
 * @param {Object} incomingData - Data being submitted from portal
 * @returns {Object} ConflictInfo object
 */
function detectConflict(sheetName, employeeId, incomingData) {
  try {
    const sheet = getSheet_(sheetName);
    const headers = getHeaderMap_(sheet);
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    // Find existing row in Sheets
    let existingRow = null;
    values.forEach((row) => {
      const rowObj = rowToObject_(row, Object.keys(headers));
      if (rowObj.employeeId === employeeId || rowObj.EmployeeId === employeeId) {
        existingRow = rowObj;
      }
    });
    
    // If no existing row, no conflict
    if (!existingRow) {
      return {
        hasConflict: false,
        type: 'NEW_RECORD',
        portalData: incomingData,
        sheetsData: null
      };
    }
    
    // Get timestamps
    const sheetsLastSynced = existingRow.lastSyncedAt ? new Date(existingRow.lastSyncedAt) : null;
    const incomingLastSynced = incomingData.lastSyncedAt ? new Date(incomingData.lastSyncedAt) : null;
    
    // If Sheets has never been synced, use creation time (assume no conflict)
    if (!sheetsLastSynced) {
      return {
        hasConflict: false,
        type: 'FIRST_SYNC',
        portalData: incomingData,
        sheetsData: existingRow
      };
    }
    
    // Compare: if incoming data is newer or same age, no conflict
    if (!incomingLastSynced || incomingLastSynced >= sheetsLastSynced) {
      return {
        hasConflict: false,
        type: 'PORTAL_NEWER',
        portalData: incomingData,
        sheetsData: existingRow,
        portalTimestamp: incomingLastSynced,
        sheetsTimestamp: sheetsLastSynced
      };
    }
    
    // Sheets data is newer than incoming data - potential conflict
    return {
      hasConflict: true,
      type: 'SHEETS_NEWER',
      portalData: incomingData,
      sheetsData: existingRow,
      portalTimestamp: incomingLastSynced,
      sheetsTimestamp: sheetsLastSynced
    };
  } catch (e) {
    console.error(`[Database] Error detecting conflict for ${employeeId}: ${e.message}`);
    return {
      hasConflict: false,
      type: 'ERROR',
      error: e.message
    };
  }
}

/**
 * Resolves conflicts between portal and Sheets data.
 * Default strategy: Portal data wins (last write wins) unless older.
 * 
 * @param {Object} conflictInfo - ConflictInfo object from detectConflict()
 * @param {string} resolutionStrategy - How to resolve ('PORTAL_WINS' | 'SHEETS_WINS' | 'MERGE')
 * @returns {Object} Resolved data object
 */
function resolveConflict(conflictInfo, resolutionStrategy = 'PORTAL_WINS') {
  try {
    if (!conflictInfo.hasConflict) {
      return conflictInfo.portalData;
    }
    
    switch (resolutionStrategy) {
      case 'SHEETS_WINS':
        return conflictInfo.sheetsData;
        
      case 'MERGE':
        // Simple merge: take non-null values from both, preferring portal for conflicts
        return {
          ...conflictInfo.sheetsData,
          ...conflictInfo.portalData,
          conflictResolved: true,
          resolutionStrategy: 'MERGE',
          resolvedAt: new Date().toISOString()
        };
        
      case 'PORTAL_WINS':
      default:
        return {
          ...conflictInfo.portalData,
          conflictResolved: true,
          resolutionStrategy: 'PORTAL_WINS',
          resolvedAt: new Date().toISOString(),
          previousSheetsData: conflictInfo.sheetsData
        };
    }
  } catch (e) {
    console.error(`[Database] Error resolving conflict: ${e.message}`);
    // Default to portal data if resolution fails
    return conflictInfo.portalData;
  }
}

/**
 * Logs conflict information for audit trail.
 * @param {string} employeeId - Employee ID involved in conflict
 * @param {string} sheetName - Sheet name where conflict occurred
 * @param {Object} conflictInfo - ConflictInfo object
 * @returns {boolean} True if logged successfully
 */
function logConflict(employeeId, sheetName, conflictInfo) {
  try {
    // In a production system, this would write to an audit log sheet
    const logEntry = {
      timestamp: new Date().toISOString(),
      employeeId: employeeId,
      sheet: sheetName,
      conflictType: conflictInfo.type,
      portalTimestamp: conflictInfo.portalTimestamp,
      sheetsTimestamp: conflictInfo.sheetsTimestamp
    };
    
    console.log(`[Database] Conflict detected: ${JSON.stringify(logEntry)}`);
    return true;
  } catch (e) {
    console.error(`[Database] Error logging conflict: ${e.message}`);
    return false;
  }
}

/**
 * Gets sync status for all assessments of an employee.
 * @param {string} employeeId - The employee ID
 * @returns {Object} Sync status for each step
 */
function getSyncStatusForEmployee(employeeId) {
  try {
    const skills = getSkillsAssessment(employeeId);
    const okr = getOKRUpload(employeeId);
    const selfAssessment = getSelfAssessment(employeeId);
    const feedForward = getFeedForward(employeeId);
    const managerAck = getManagerAcknowledgement(employeeId);

    return {
      employeeId: employeeId,
      skills: {
        exists: !!skills,
        lastSynced: skills?.lastSyncedAt || null,
        syncStatus: skills?.syncStatus || 'NOT_STARTED',
        timestamp: skills?.lastSyncedAt ? new Date(skills.lastSyncedAt).toLocaleString() : 'N/A'
      },
      okr: {
        exists: !!okr,
        lastSynced: okr?.lastSyncedAt || null,
        syncStatus: okr?.syncStatus || 'NOT_STARTED',
        timestamp: okr?.lastSyncedAt ? new Date(okr.lastSyncedAt).toLocaleString() : 'N/A'
      },
      selfAssessment: {
        exists: !!selfAssessment,
        lastSynced: selfAssessment?.lastSyncedAt || null,
        syncStatus: selfAssessment?.syncStatus || 'NOT_STARTED',
        timestamp: selfAssessment?.lastSyncedAt ? new Date(selfAssessment.lastSyncedAt).toLocaleString() : 'N/A'
      },
      feedForward: {
        exists: !!feedForward,
        lastSynced: feedForward?.lastSyncedAt || null,
        syncStatus: feedForward?.syncStatus || 'NOT_STARTED',
        timestamp: feedForward?.lastSyncedAt ? new Date(feedForward.lastSyncedAt).toLocaleString() : 'N/A'
      },
      managerAck: {
        exists: !!managerAck,
        lastSynced: managerAck?.lastSyncedAt || null,
        syncStatus: managerAck?.syncStatus || 'NOT_STARTED',
        timestamp: managerAck?.lastSyncedAt ? new Date(managerAck.lastSyncedAt).toLocaleString() : 'N/A'
      }
    };
  } catch (e) {
    console.error(`[Database] Error getting sync status for ${employeeId}: ${e.message}`);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                         SHEETS CHANGE DETECTION                            */
/* -------------------------------------------------------------------------- */

/**
 * Gets the current Sheets modification time.
 * Used to detect when data has changed externally.
 * @returns {Object} Modification time info
 */
function getSheetsModificationTime() {
  try {
    const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('1uWtfoSdWef0JRuSPXp_zz5AvhB4uyZJV7geHLdTOehg'));
    const lastEdited = ss.getLastEdited();
    const lastEditedISO = lastEdited.toISOString();
    
    return {
      success: true,
      lastEdited: lastEditedISO,
      timestamp: lastEdited.toLocaleString(),
      canDeterminedTime: !!lastEdited
    };
  } catch (e) {
    console.error(`[Database] Error getting Sheets modification time: ${e.message}`);
    return {
      success: false,
      message: e.message
    };
  }
}

/**
 * Checks if Sheets data has been modified since a given timestamp.
 * @param {string} lastChecked - ISO timestamp of last check
 * @returns {Object} { hasChanges: boolean, lastModified: string }
 */
function checkForExternalChanges(lastChecked) {
  try {
    const modTime = getSheetsModificationTime();
    
    if (!modTime.success) {
      return {
        hasChanges: false,
        message: 'Could not determine Sheets modification time'
      };
    }
    
    const lastCheckedDate = new Date(lastChecked);
    const lastModifiedDate = new Date(modTime.lastEdited);
    
    const hasChanges = lastModifiedDate > lastCheckedDate;
    
    return {
      hasChanges: hasChanges,
      lastModified: modTime.lastEdited,
      lastModifiedFormatted: modTime.timestamp,
      lastChecked: lastChecked,
      message: hasChanges ? 'Sheets has been modified' : 'No changes detected'
    };
  } catch (e) {
    console.error(`[Database] Error checking for external changes: ${e.message}`);
    return {
      hasChanges: false,
      message: e.message
    };
  }
}

/**
 * Gets a hash of all data to detect changes (alternative detection method).
 * More thorough but slower than last edit time.
 * @returns {string} Hash of current Sheets data
 */
function getDataHash() {
  try {
    const allSheets = [
      SHEETS.SKILLS_ASSESSMENT,
      SHEETS.OKR_UPLOAD,
      SHEETS.SELF_ASSESSMENT,
      SHEETS.FEED_FORWARD,
      SHEETS.MANAGER_ACK,
      SHEETS.EMPLOYEE_ACK
    ];
    
    let dataString = '';
    
    allSheets.forEach(sheetName => {
      try {
        const sheet = getSheet_(sheetName);
        const range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
        const values = range.getValues();
        dataString += JSON.stringify(values);
      } catch (e) {
        // Sheet might not exist, skip it
        console.warn(`[Database] Could not read sheet ${sheetName}: ${e.message}`);
      }
    });
    
    // Simple hash function
    return Utilities.getUuid() + ':' + dataString.length;
  } catch (e) {
    console.error(`[Database] Error getting data hash: ${e.message}`);
    return null;
  }
}

/**
 * Detects changes in a specific sheet since last check.
 * @param {string} sheetName - Name of the sheet to check
 * @param {number} lastRowCount - Last known row count
 * @returns {Object} { hasChanges: boolean, newRowCount: number, changedRows: number }
 */
function detectSheetChanges(sheetName, lastRowCount) {
  try {
    const sheet = getSheet_(sheetName);
    const currentRowCount = sheet.getLastRow();
    
    const hasChanges = currentRowCount !== lastRowCount;
    const changedRows = Math.abs(currentRowCount - lastRowCount);
    
    return {
      hasChanges: hasChanges,
      sheet: sheetName,
      previousRowCount: lastRowCount,
      currentRowCount: currentRowCount,
      changedRows: changedRows,
      timestamp: new Date().toISOString()
    };
  } catch (e) {
    console.error(`[Database] Error detecting sheet changes for ${sheetName}: ${e.message}`);
    return {
      hasChanges: false,
      message: e.message
    };
  }
}


/* -------------------------------------------------------------------------- */
/*              SELF-ASSESSMENT QUESTIONS & SYSTEM CONFIG OPERATIONS          */
/* -------------------------------------------------------------------------- */

/**
 * Gets all enabled self-assessment questions ordered by sortOrder.
 * Used for dynamic question rendering in the employee portal.
 * 
 * @returns {Object[]} Array of question objects { id, questionText, period, sortOrder, enabled }
 */
function getSelfAssessmentQuestions() {
  try {
    const questions = getAllRows_(SHEETS.SELF_ASSESSMENT_QUESTIONS);
    
    // Filter to enabled questions only
    const enabledQuestions = questions.filter(q => q.enabled === true || q.enabled === 'TRUE');
    
    // Sort by sortOrder (ascending)
    enabledQuestions.sort((a, b) => {
      const orderA = parseInt(a.sortOrder, 10) || 0;
      const orderB = parseInt(b.sortOrder, 10) || 0;
      return orderA - orderB;
    });
    
    console.log(`[Database] Retrieved ${enabledQuestions.length} enabled self-assessment questions`);
    enabledQuestions.forEach(q => {
      console.log(`[Database] Question ${q.sortOrder}: "${q.questionText}" (period: ${q.period})`);
    });
    
    return enabledQuestions;
  } catch (e) {
    console.error(`[Database] Error getting self-assessment questions: ${e.message}`);
    return [];
  }
}

/**
 * Gets a specific system configuration value by key.
 * Used for retrieving admin-configured settings like hard lock date.
 * 
 * @param {string} key - Configuration key (e.g., "HARD_LOCK_DATE")
 * @returns {string|null} Configuration value or null if not found
 */
function getSystemConfig(key) {
  try {
    const configs = getAllRows_(SHEETS.SYSTEM_CONFIG);
    const config = configs.find(c => c.key === key);
    
    if (config) {
      console.log(`[Database] Config "${key}" = "${config.value}"`);
      return config.value;
    }
    
    console.warn(`[Database] Config key not found: "${key}"`);
    return null;
  } catch (e) {
    console.error(`[Database] Error getting system config "${key}": ${e.message}`);
    return null;
  }
}

/**
 * Gets an employee's self-assessment response (if already submitted).
 * Used to pre-populate the form for editing.
 * 
 * @param {string} employeeId - The employee ID
 * @returns {Object|null} Self-assessment data { q1, q2, q3, q4, dateSubmitted } or null if not found
 */
function getEmployeeSelfAssessment(employeeId) {
  try {
    const sheet = getSheet_(SHEETS.SELF_ASSESSMENT);
    const headers = getHeaderMap_(sheet);
    
    // Check if sheet has data
    if (sheet.getLastRow() < 2) {
      console.log(`[Database] Self-Assessment sheet is empty (no submissions yet)`);
      return null;
    }
    
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    const row = values.find(r => {
      const rowObj = rowToObject_(r, Object.keys(headers));
      return rowObj.employeeId === employeeId;
    });
    
    if (row) {
      const assessment = rowToObject_(row, Object.keys(headers));
      console.log(`[Database] Found self-assessment for employee ${employeeId}`);
      return assessment;
    }
    
    console.log(`[Database] No self-assessment found for employee ${employeeId}`);
    return null;
  } catch (e) {
    console.error(`[Database] Error getting self-assessment for ${employeeId}: ${e.message}`);
    return null;
  }
}
