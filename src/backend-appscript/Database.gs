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
const SS_ID = PropertiesService.getScriptProperties().getProperty('1uWtfoSdWef0JRuSPXp_zz5AvhB4uyZJV7geHLdTOehg');

/** @type {Object} Sheet names mapping */
const SHEETS = {
  EMPLOYEES: 'Employee Database',
  SKILLS_ASSESSMENT: 'SkillsAssessment',
  OKR_UPLOAD: 'OKRUpload',
  SELF_ASSESSMENT: 'SelfAssessment',
  FEED_FORWARD: 'FeedForward',
  MANAGER_ACK: 'ManagerAcknowledgement',
  EMPLOYEE_ACK: 'EmployeeAcknowledgement',
  WORKFLOW_STATUS: 'WorkflowStatus'
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
 * Gets team members for a specific manager.
 * @param {string} managerId - The manager's employee ID
 * @returns {Object[]} Array of team member objects
 */
function getTeamMembers(managerId) {
  try {
    const employees = getAllRows_(SHEETS.EMPLOYEES);
    return employees.filter(emp => emp.managerId === managerId);
  } catch (e) {
    console.error(`[Database] Error getting team members for ${managerId}: ${e.message}`);
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
    
    const assessmentObj = {
      assessmentId: assessmentData.assessmentId || Utilities.getUuid(),
      employeeId: employeeId,
      ...assessmentData
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
    return true;
  } catch (e) {
    console.error(`[Database] Error saving skills assessment for ${employeeId}: ${e.message}`);
    return false;
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
    
    const okrObj = {
      uploadId: okrData.uploadId || Utilities.getUuid(),
      employeeId: employeeId,
      ...okrData
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
      if (rowObj.EmployeeId === employeeId) {
        existingIndex = i;
      }
    });
    
    const assessmentObj = {
      EmployeeId: employeeId,
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
      if (rowObj.EmployeeId === employeeId) {
        existingIndex = i;
      }
    });
    
    const feedForwardObj = {
      EmployeeId: employeeId,
      ManagerId: managerId,
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
    return true;
  } catch (e) {
    console.error(`[Database] Error saving feed forward for ${employeeId}: ${e.message}`);
    return false;
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
      if (rowObj.EmployeeId === employeeId) {
        existingIndex = i;
      }
    });
    
    const ackObj = {
      EmployeeId: employeeId,
      ManagerId: managerId,
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
      if (rowObj.EmployeeId === employeeId) {
        existingIndex = i;
      }
    });
    
    const ackObj = {
      EmployeeId: employeeId,
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
    
    // Helper to get row by EmployeeId
    const getRowByEmployeeId = (sheet, employeeId) => {
      const headers = getHeaderMap_(sheet);
      const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
      const values = dataRange.getValues();
      return values.find(row => {
        const rowObj = rowToObject_(row, Object.keys(headers));
        return rowObj.EmployeeId === employeeId;
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
