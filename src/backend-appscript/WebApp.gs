/**
 * Own Your Career — Web App Handlers (Google Apps Script)
 * 
 * doGet() and doPost() handlers for serving HTML pages.
 * Routes to the appropriate portal based on user role.
 * 
 * All helper functions are in Code.gs to avoid scope issues.
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
 * @param {Object} e - Event object with parameters
 * @returns {HtmlOutput} HTML page for the user's portal or access denied page
 */
function doGet(e) {
  try {
    // Step 1: Get user's email from Google OAuth
    const userEmail = Session.getActiveUser().getEmail();
    console.log(`[doGet] User email: ${userEmail}`);
    
    if (!userEmail) {
      return deniedAccess_('Authentication failed. Please log in again.');
    }
    
    // Step 2: Lookup employee record (uses function from Code.gs)
    console.log(`[doGet] Looking up employee: ${userEmail}`);
    const employee = getEmployeeByEmail_(userEmail);
    
    if (!employee) {
      console.log(`[doGet] Employee not found in database`);
      logAccessAttempt(userEmail, 'UNAUTHENTICATED', 'DENIED', 'Employee record not found');
      return deniedAccess_('You are not registered in the system. Please contact your HR administrator.');
    }
    
    console.log(`[doGet] Employee found:`, employee);
    console.log(`[doGet] Full employee object:`, JSON.stringify(employee));
    
    // Handle case variation in EmployeeID column name
    const employeeId = employee.EmployeeID || employee.employeeId;
    console.log(`[doGet] employeeId extracted: ${employeeId} (type: ${typeof employeeId})`);
    
    // Step 3: Determine user role
    const userRole = employee.Role || 'EMPLOYEE';
    console.log(`[doGet] Employee.Role value: "${employee.Role}"`);
    console.log(`[doGet] User role after default: "${userRole}"`);
    
    // Step 4: Authorize (for now, allow all authenticated users)
    const isAuthorized = true;
    
    console.log(`[doGet] Authorization: ${isAuthorized}`);
    if (isAuthorized) {
      logAccessAttempt(userEmail, userRole, 'GRANTED', `Portal access granted`);
    }
    
    // Step 5: Route to correct portal
    console.log(`[doGet] Routing to portal based on role: "${userRole}"`);
    
    let templateName = TEMPLATES.EMPLOYEE_PORTAL;
    let title = 'Own Your Career — Employee Portal';
    
    if (userRole === 'MANAGER') {
      templateName = TEMPLATES.MANAGER_PORTAL;
      title = 'Own Your Career — Manager Portal';
      console.log(`[doGet] Routing to MANAGER portal`);
    } else if (userRole === 'DATA_SPOC') {
      templateName = TEMPLATES.DATA_SPOC_PORTAL;
      title = 'Own Your Career — Data SPOC Portal';
      console.log(`[doGet] Routing to DATA_SPOC portal`);
    } else {
      console.log(`[doGet] Routing to EMPLOYEE portal`);
    }
    
    // Step 6: Load and serve the template
    console.log(`[doGet] Preparing to serve portal template`);
    
    let htmlFile = '';
    if (userRole === 'MANAGER') {
      htmlFile = 'manager-portal';
    } else if (userRole === 'DATA_SPOC') {
      htmlFile = 'dataspoc-portal';
    } else {
      htmlFile = 'employee-portal';
    }
    
    // Load the backend-appscript template (contains template variables <?= ?>)
    const template = HtmlService.createTemplateFromFile(htmlFile);
    
    // Ensure employeeId is a number for template substitution
    template.userEmail = userEmail;
    template.employeeId = typeof employeeId === 'number' ? employeeId : parseInt(employeeId, 10) || 0;
    
    console.log(`[doGet] Template variables set: email=${template.userEmail}, employeeId=${template.employeeId} (type: ${typeof template.employeeId})`);
    
    // Evaluate template - this will replace <?= userEmail ?> and <?= employeeId ?> with actual values
    const htmlOutput = template.evaluate()
      .setTitle(title)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    return htmlOutput;
    
  } catch (e) {
    console.error(`[WebApp] Error in doGet: ${e.message}`);
    console.error(`[WebApp] Stack: ${e.stack}`);
    try {
      logAccessAttempt(Session.getActiveUser().getEmail(), 'UNKNOWN', 'ERROR', `Exception: ${e.message}`);
    } catch (logErr) {
      console.error(`[WebApp] Could not log access: ${logErr}`);
    }
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
 * Returns an "Access Denied" HTML page.
 * @param {string} message - Error message to display
 * @returns {HtmlOutput} Access denied HTML page
 */
function deniedAccess_(message) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Access Denied — Own Your Career</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #038F8D 0%, #024645 100%);
          }
          .container {
            background: white;
            padding: 3rem;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            text-align: center;
            max-width: 500px;
            width: 90%;
          }
          h1 {
            color: #c62828;
            margin: 0 0 1rem 0;
            font-size: 2rem;
          }
          p {
            color: #333;
            line-height: 1.6;
            font-size: 1rem;
            margin: 0 0 1.5rem 0;
          }
          .contact {
            background: #f9f9f9;
            border-left: 4px solid #038F8D;
            padding: 1rem;
            margin: 1.5rem 0;
            text-align: left;
            border-radius: 4px;
          }
          .contact p {
            margin: 0.5rem 0;
            font-size: 0.9rem;
          }
          a {
            color: #038F8D;
            text-decoration: none;
            font-weight: 500;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔒 Access Denied</h1>
          <p>${message}</p>
          <div class="contact">
            <p><strong>Need help?</strong></p>
            <p>Please contact your HR administrator or the PMGM team for assistance.</p>
          </div>
          <p style="font-size: 0.9rem; color: #999; margin-top: 2rem;">
            Own Your Career — Mid-Year Performance Review System
          </p>
        </div>
      </body>
    </html>
  `;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('Access Denied — Own Your Career');
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
<<<<<<< Updated upstream
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
=======
 * Injects user data into HTML via inline script.
 * Must be called before returning HtmlOutput.
 * @param {Object} data - User data object
 * @returns {string} JavaScript code to inject
 */
function injectUserData_(data) {
  // Ensure employeeId is properly formatted for JavaScript
  const employeeId = typeof data.employeeId === 'number' ? data.employeeId : `"${data.employeeId}"`;
  
  return `
    <script>
      window.oyc_userEmail = "${data.userEmail}";
      window.oyc_userEmployeeID = ${employeeId};
      console.log('[WebApp] Injected user data: email=' + window.oyc_userEmail + ', employeeId=' + window.oyc_userEmployeeID);
    </script>
  `;
>>>>>>> Stashed changes
}
