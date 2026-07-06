/**
 * Own Your Career — Web App Handlers (Google Apps Script)
 * 
 * doGet() and doPost() handlers for serving HTML pages.
 * Routes to the appropriate portal based on user role.
 * 
 * @fileoverview Apps Script web app entry points
 */

/* -------------------------------------------------------------------------- */
/*                                CONFIGURATION                               */
/* -------------------------------------------------------------------------- */

/** @type {string} HTML template names */
const TEMPLATES = {
  MANAGER_PORTAL: 'manager-portal',
  DATA_SPOC_PORTAL: 'dataspoc-portal',
  EMPLOYEE_PORTAL: 'employee-portal'
};

/* -------------------------------------------------------------------------- */
/*                                GET REQUESTS                                */
/* -------------------------------------------------------------------------- */

/**
 * Handles GET requests — serves the appropriate portal HTML.
 * Implements authorization routing based on user role and org hierarchy.
 * 
 * Authorization Flow:
 * 1. Authenticate user via Google OAuth
 * 2. Lookup employee record in database
 * 3. Determine user role (MANAGER, DATA_SPOC, EMPLOYEE)
 * 4. Validate manager status (if applicable)
 * 5. Log access attempt
 * 6. Serve appropriate portal or deny access
 * 
 * @param {Object} e - Event object with parameters
 * @returns {HtmlOutput} HTML page for the user's portal or access denied page
 */
function doGet(e) {
  try {
    // Step 1: Get user's email from Google OAuth
    const userEmail = Session.getActiveUser().getEmail();
    
    if (!userEmail) {
      return deniedAccess_('Authentication failed. Please log in again.');
    }
    
    // Step 2: Lookup employee record
    const employee = getEmployeeByEmail_(userEmail);
    if (!employee) {
      logAccessAttempt(userEmail, 'UNAUTHENTICATED', 'DENIED', 'Employee record not found');
      return deniedAccess_('You are not registered in the system. Please contact your HR administrator.');
    }
    
    const employeeId = employee.employeeId;
    
    // Step 3: Determine user role
    const userRole = employee.role || 'EMPLOYEE';
    
    // Step 4: Validate authorization based on role
    let isAuthorized = false;
    let errorMessage = '';
    
    switch (userRole) {
      case 'MANAGER':
        // Validate that user is actually a manager (has direct reports)
        if (isUserAManager(employeeId)) {
          isAuthorized = true;
        } else {
          errorMessage = 'You are not registered as a manager in the system.';
        }
        break;
        
      case 'DATA_SPOC':
        // Validate that user is assigned as a Data SPOC
        if (employee.isDataSpoc === true || employee.isDataSpoc === 'TRUE') {
          isAuthorized = true;
        } else {
          errorMessage = 'You do not have Data SPOC access.';
        }
        break;
        
      case 'EMPLOYEE':
        // All active employees can access the Employee Portal
        isAuthorized = true;
        break;
        
      default:
        errorMessage = `Unknown role: ${userRole}`;
    }
    
    // Step 5: Log access attempt
    if (isAuthorized) {
      logAccessAttempt(userEmail, userRole, 'GRANTED', `Portal access granted`);
    } else {
      logAccessAttempt(userEmail, userRole, 'DENIED', errorMessage);
    }
    
    // Step 6: Serve portal or deny access
    if (!isAuthorized) {
      return deniedAccess_(errorMessage);
    }
    
    switch (userRole) {
      case 'MANAGER':
        return serveTemplate_(TEMPLATES.MANAGER_PORTAL, { 
          employeeId: employeeId,
          userEmail: userEmail 
        });
        
      case 'DATA_SPOC':
        return serveTemplate_(TEMPLATES.DATA_SPOC_PORTAL, {
          employeeId: employeeId,
          userEmail: userEmail
        });
        
      case 'EMPLOYEE':
        return serveTemplate_(TEMPLATES.EMPLOYEE_PORTAL, {
          employeeId: employeeId,
          userEmail: userEmail
        });
    }
    
  } catch (e) {
    console.error(`[WebApp] Error in doGet: ${e.message}`);
    logAccessAttempt(Session.getActiveUser().getEmail(), 'UNKNOWN', 'ERROR', `Exception: ${e.message}`);
    return HtmlService.createHtmlOutput(`<h1>Error</h1><p>An unexpected error occurred. Please try again later.</p><p style="font-size: 12px; color: #999;">${e.message}</p>`);
  }
}

/**
 * Handles POST requests (if needed for form submissions).
 * @param {Object} e - Event object with postData
 * @returns {Object} JSON response
 */
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    
    switch (params.action) {
      case 'saveSkillsAssessment':
        return saveSkillsAssessment(params.employeeId, params.data);
      case 'saveOKRUpload':
        return saveOKRUpload(params.employeeId, params.data);
      case 'saveSelfAssessment':
        return saveSelfAssessment(params.employeeId, params.data);
      case 'saveFeedForward':
        return saveFeedForward(params.employeeId, params.managerId, params.data);
      case 'saveAcknowledgement':
        return saveAcknowledgement(params.employeeId, params.userId, params.data, params.type);
      case 'getTeamMembers':
        return getTeamMembers(params.managerId);
      case 'getAllScores':
        return getAllScores(params.employeeId);
      default:
        return { success: false, message: 'Unknown action' };
    }
  } catch (e) {
    console.error(`[WebApp] Error in doPost: ${e.message}`);
    return { success: false, message: e.message };
  }
}

/* -------------------------------------------------------------------------- */
/*                             HELPER FUNCTIONS                               */
/* -------------------------------------------------------------------------- */

/**
 * Gets user's role from Employees sheet.
 * @param {string} userEmail - User's email address
 * @returns {string} User role (MANAGER, DATA_SPOC, EMPLOYEE)
 */
function getUserRole_(userEmail) {
  try {
    const sheet = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'))
      .getSheetByName('Employees');
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const emailIndex = headers.indexOf('Email');
    const roleIndex = headers.indexOf('Role');
    
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    for (let i = 0; i < values.length; i++) {
      if (values[i][emailIndex] === userEmail) {
        return values[i][roleIndex];
      }
    }
    
    return 'EMPLOYEE'; // Default
  } catch (e) {
    console.error(`[WebApp] Error getting user role: ${e.message}`);
    return 'EMPLOYEE';
  }
}

/**
 * Serves an HTML template with optional data.
 * @param {string} templateName - Name of the template
 * @param {Object} data - Data to pass to template
 * @returns {HtmlOutput} HTML output
 */
function serveTemplate_(templateName, data) {
  const template = HtmlService.createTemplateFromFile(templateName);
  if (data) {
    Object.assign(template, data);
  }
  return template.evaluate()
    .setTitle('Own Your Career — Portal')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
