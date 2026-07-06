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

/**
 * Gets an employee by email address.
 * @param {string} userEmail - User's email address
 * @returns {Object|null} Employee object or null if not found
 */
function getEmployeeByEmail_(userEmail) {
  try {
    const employees = Database.getAllEmployees();
    return employees.find(emp => emp.email === userEmail || emp.Email === userEmail) || null;
  } catch (e) {
    console.error(`[WebApp] Error getting employee by email: ${e.message}`);
    return null;
  }
}

/**
 * Returns a denied access HTML page.
 * @param {string} message - Error message to display
 * @returns {HtmlOutput} HTML output with error message
 */
function deniedAccess_(message) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Access Denied — Own Your Career</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: #f5f5f5;
        }
        .container {
          text-align: center;
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          max-width: 500px;
        }
        h1 {
          color: #d32f2f;
          margin-top: 0;
        }
        p {
          color: #666;
          line-height: 1.6;
        }
        .icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">🔒</div>
        <h1>Access Denied</h1>
        <p>${message}</p>
        <p style="font-size: 14px; color: #999;">
          If you believe this is an error, please contact your HR administrator.
        </p>
      </div>
    </body>
    </html>
  `;
  return HtmlService.createHtmlOutput(html);
}

/**
 * Logs an access attempt for audit trail.
 * @param {string} userEmail - User's email address
 * @param {string} role - User's role (MANAGER, DATA_SPOC, EMPLOYEE, UNKNOWN)
 * @param {string} result - Access result (GRANTED, DENIED, ERROR)
 * @param {string} reason - Reason for the result
 */
function logAccessAttempt(userEmail, role, result, reason) {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userEmail: userEmail,
      role: role,
      result: result,
      reason: reason
    };
    
    console.log(`[WebApp] Access Attempt: ${JSON.stringify(logEntry)}`);
    
    // In a production system, this could write to an audit log sheet
    // For now, just logging to console
  } catch (e) {
    console.error(`[WebApp] Error logging access attempt: ${e.message}`);
  }
}
