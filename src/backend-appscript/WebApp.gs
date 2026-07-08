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
 * TASK 3: Implements HYBRID routing based on user roles:
 * - 0 roles → Access denied
 * - 1 role → Auto-redirect to that portal (skip selector)
 * - 2+ roles → Serve portal selector page
 * 
 * @param {Object} e - Event object with parameters
 * @returns {HtmlOutput} HTML page for the user's portal, selector, or access denied
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
    const userName = employee.Name || employee.name || 'User';
    console.log(`[doGet] employeeId extracted: ${employeeId} (type: ${typeof employeeId})`);
    console.log(`[doGet] userName extracted: ${userName}`);
    
    // TASK 3: Step 3 — Parse roles from Role column (supports multi-role)
    const roleString = employee.Role || '';
    const userRoles = parseRoles(roleString);
    console.log(`[doGet] Parsed roles from "${roleString}":`, userRoles);
    
    // TASK 3: Step 4 — Routing decision based on number of roles
    if (userRoles.length === 0) {
      // NO ROLES: Deny access
      console.log(`[doGet] Decision: NO ROLES → Access Denied`);
      logAccessAttempt(userEmail, 'NONE', 'DENIED', 'No roles assigned to user');
      return deniedAccess_('No roles assigned to your account. Please contact your HR administrator.');
    }
    
    if (userRoles.length === 1) {
      // SINGLE ROLE: Auto-redirect to that portal (bypass selector)
      const singleRole = userRoles[0];
      console.log(`[doGet] Decision: SINGLE ROLE (${singleRole}) → Auto-redirect to portal`);
      logAccessAttempt(userEmail, singleRole, 'GRANTED', `Single role auto-redirect`);
      
      return redirectToPortal_(singleRole, userEmail, employeeId, userName);
    }
    
    // MULTIPLE ROLES: Serve portal selector page
    console.log(`[doGet] Decision: MULTIPLE ROLES → Serve Portal Selector`);
    logAccessAttempt(userEmail, userRoles.join('|'), 'GRANTED', `Multi-role selector served`);
    
    const selectorTemplate = HtmlService.createTemplateFromFile('portal-selector');
    selectorTemplate.userEmail = userEmail;
    selectorTemplate.userName = userName;
    selectorTemplate.userRoles = userRoles;
    
    console.log(`[doGet] Portal Selector template variables set: email=${selectorTemplate.userEmail}, name=${selectorTemplate.userName}, roles=[${selectorTemplate.userRoles.join(',')}]`);
    
    const htmlOutput = selectorTemplate.evaluate()
      .setTitle('Own Your Career — Portal Selection')
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
 * TASK 3: Helper function to redirect user to a specific portal.
 * Routes based on the provided role name.
 * 
 * @param {string} role - User role (MANAGER, DATA_SPOC, EMPLOYEE, ADMIN)
 * @param {string} userEmail - User's email address
 * @param {number|string} employeeId - User's employee ID
 * @param {string} userName - User's full name
 * @returns {HtmlOutput} HTML page for the requested portal
 */
function redirectToPortal_(role, userEmail, employeeId, userName) {
  try {
    console.log(`[redirectToPortal_] Redirecting to ${role} portal for ${userEmail}`);
    
    let templateName = 'employee-portal';
    let title = 'Own Your Career — Employee Portal';
    
    switch(role.toUpperCase()) {
      case 'MANAGER':
        templateName = 'manager-portal';
        title = 'Own Your Career — Manager Portal';
        console.log(`[redirectToPortal_] Loading MANAGER portal`);
        break;
      case 'DATA_SPOC':
        templateName = 'dataspoc-portal';
        title = 'Own Your Career — Data SPOC Portal';
        console.log(`[redirectToPortal_] Loading DATA_SPOC portal`);
        break;
      case 'ADMIN':
        // TODO: Create admin-portal.html when ready
        templateName = 'employee-portal'; // Fallback for now
        title = 'Own Your Career — Admin Portal';
        console.log(`[redirectToPortal_] Loading ADMIN portal (not yet implemented, using fallback)`);
        break;
      case 'EMPLOYEE':
      default:
        templateName = 'employee-portal';
        title = 'Own Your Career — Employee Portal';
        console.log(`[redirectToPortal_] Loading EMPLOYEE portal`);
        break;
    }
    
    // Load and evaluate template
    const template = HtmlService.createTemplateFromFile(templateName);
    template.userEmail = userEmail;
    template.employeeId = typeof employeeId === 'number' ? employeeId : parseInt(employeeId, 10) || 0;
    template.userName = userName;
    
    console.log(`[redirectToPortal_] Template set: email=${template.userEmail}, employeeId=${template.employeeId}, name=${template.userName}`);
    
    const htmlOutput = template.evaluate()
      .setTitle(title)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    return htmlOutput;
  } catch (e) {
    console.error(`[redirectToPortal_] Error: ${e.message}`);
    return HtmlService.createHtmlOutput(`<h1>Error</h1><p>Failed to load portal. Error: ${e.message}</p>`);
  }
}
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
