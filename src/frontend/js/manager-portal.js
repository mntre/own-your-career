/**
 * Own Your Career — Manager Portal Logic
 * 
 * Handles team member overview, assessment workflows, and synced data display.
 * Displays workflow step status for each team member.
 * 
 * @fileoverview Manager portal UI interactions and data binding
 */

'use strict';

// === PLATFORM DETECTION ===
// Ensure PLATFORM is defined (set by WebApp.gs injection, but fallback here)
if (typeof window.PLATFORM === 'undefined') {
  // Check if google.script API is available (indicates AppScript environment)
  if (typeof google !== 'undefined' && google.script && google.script.run) {
    window.PLATFORM = 'APPSCRIPT';
    console.log('[ManagerPortal] PLATFORM auto-detected as APPSCRIPT (google.script.run available)');
  } else {
    window.PLATFORM = 'CONVERGE_CLOUD';
    console.log('[ManagerPortal] PLATFORM auto-detected as CONVERGE_CLOUD (no google.script)');
  }
} else {
  console.log('[ManagerPortal] PLATFORM already defined:', window.PLATFORM);
}

/* --------------------------------------------------------------------------
   Manager Portal State
   -------------------------------------------------------------------------- */

const ManagerPortal = {
  currentManager: null,
  teamMembers: [],
  selectedEmployee: null,
  assessmentCache: {}, // Cache for loaded assessments
  lastSheetsCheckTime: null, // Track last time we checked Sheets
  changeDetectionInterval: null, // Interval handle for polling
  pollIntervalMs: 30000 // Poll every 30 seconds
};

/* --------------------------------------------------------------------------
   Initialize Manager Portal
   -------------------------------------------------------------------------- */

/**
 * Initializes the manager portal on page load.
 * Loads team members and sets up event listeners.
 */
function initManagerPortal() {
  console.log('[ManagerPortal] Initializing...');
  
  // Get current user (would come from authentication in production)
  getCurrentUser((user) => {
    ManagerPortal.currentManager = user;
    loadTeamMembersOverview();
    setupEventListeners();
  });
}

/**
 * Gets the current user from the platform.
 * @param {Function} callback - Callback with user data
 */
function getCurrentUser(callback) {
  if (PLATFORM === 'APPSCRIPT') {
    // In AppScript, we extract the current user from window context
    // The HTML template receives userEmail from doGet in WebApp.gs
    const userEmail = window.oyc_userEmail || sessionStorage.getItem('oyc_user_email');
    const userEmployeeID = window.oyc_userEmployeeID || sessionStorage.getItem('oyc_user_employeeId');
    
    console.log('[ManagerPortal] getCurrentUser:');
    console.log('[ManagerPortal]   - Email:', userEmail);
    console.log('[ManagerPortal]   - EmployeeID:', userEmployeeID);
    console.log('[ManagerPortal]   - Type of EmployeeID:', typeof userEmployeeID);
    
    if (userEmail && userEmployeeID) {
      const user = {
        email: userEmail,
        employeeId: userEmployeeID,
        name: 'Manager'
      };
      
      console.log('[ManagerPortal] User object created:', JSON.stringify(user));
      callback(user);
    } else {
      console.warn('[ManagerPortal] Missing user data - email or employeeId not provided');
      // Fallback if not provided by AppScript
      callback({ employeeId: '1', name: 'Manager', email: userEmail });
    }
  } else {
    // For Converge platform, get user from session storage (set during login)
    const sessionData = sessionStorage.getItem('oyc_user');
    if (sessionData) {
      try {
        const userData = JSON.parse(sessionData);
        callback({
          employeeId: userData.email,
          name: userData.name || 'Manager',
          email: userData.email
        });
      } catch (e) {
        console.error('[ManagerPortal] Error parsing session:', e);
        callback({ employeeId: '1', name: 'Current Manager' });
      }
    } else {
      console.warn('[ManagerPortal] No session data found');
      callback({ employeeId: '1', name: 'Current Manager' });
    }
  }
}

/**
 * Sets up event listeners for manager portal navigation.
 */
function setupEventListeners() {
  const backButtons = [
    document.getElementById('backFromSkillsBtn'),
    document.getElementById('backFromFeedForwardBtn'),
    document.getElementById('backFromAcknowledgementBtn')
  ];
  
  backButtons.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => showTeamOverview());
    }
  });

  // Form submission handlers
  const skillsForm = document.getElementById('skillsAssessmentForm');
  const feedForwardForm = document.getElementById('feedForwardForm');
  const acknowledgementForm = document.getElementById('acknowledgementForm');

  if (skillsForm) {
    skillsForm.addEventListener('submit', (e) => handleSkillsFormSubmit(e));
  }
  if (feedForwardForm) {
    feedForwardForm.addEventListener('submit', (e) => handleFeedForwardFormSubmit(e));
  }
  if (acknowledgementForm) {
    acknowledgementForm.addEventListener('submit', (e) => handleAcknowledgementFormSubmit(e));
  }

  // Start change detection polling
  startChangeDetectionPolling();
}

/* --------------------------------------------------------------------------
   Sheets Change Detection & Polling
   -------------------------------------------------------------------------- */

/**
 * Starts polling for external changes in Sheets.
 * Checks every 30 seconds if Sheets data has been modified.
 */
function startChangeDetectionPolling() {
  if (PLATFORM !== 'APPSCRIPT') {
    console.log('[ManagerPortal] Change detection not available for this platform');
    return;
  }

  console.log('[ManagerPortal] Starting change detection polling...');

  // Initialize last check time
  ManagerPortal.lastSheetsCheckTime = new Date().toISOString();

  // Start polling
  ManagerPortal.changeDetectionInterval = setInterval(() => {
    checkForSheetsChanges();
  }, ManagerPortal.pollIntervalMs);
}

/**
 * Stops the change detection polling.
 */
function stopChangeDetectionPolling() {
  if (ManagerPortal.changeDetectionInterval) {
    clearInterval(ManagerPortal.changeDetectionInterval);
    ManagerPortal.changeDetectionInterval = null;
    console.log('[ManagerPortal] Change detection polling stopped');
  }
}

/**
 * Checks if Sheets data has been modified since last check.
 */
function checkForSheetsChanges() {
  if (!ManagerPortal.lastSheetsCheckTime) {
    return;
  }

  google.script.run
    .withSuccessHandler((result) => {
      if (result.success && result.data.hasChanges) {
        showChangeDetectedNotification(result.data);
        ManagerPortal.lastSheetsCheckTime = result.data.lastModified;
      }
    })
    .withFailureHandler((error) => {
      console.error('[ManagerPortal] Error checking for changes:', error);
    })
    .checkForExternalChanges(ManagerPortal.lastSheetsCheckTime);
}

/**
 * Displays a notification that changes were detected in Sheets.
 * @param {Object} changeInfo - Change detection info from backend
 */
function showChangeDetectedNotification(changeInfo) {
  console.log('[ManagerPortal] Changes detected in Sheets:', changeInfo);

  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'change-notification';
  notification.id = 'changeNotification';

  notification.innerHTML = `
    <div class="change-notification-content">
      <div class="change-notification-icon">📊</div>
      <div class="change-notification-text">
        <strong>Data Updated in Sheets</strong>
        <p>Sheets was modified at ${changeInfo.lastModifiedFormatted}</p>
        <p>Refresh the page to see the latest changes.</p>
      </div>
      <div class="change-notification-actions">
        <button class="btn btn--small btn--primary" onclick="location.reload()">Refresh Now</button>
        <button class="btn btn--small btn--secondary" onclick="dismissChangeNotification()">Dismiss</button>
      </div>
    </div>
  `;

  // Add to page
  document.body.appendChild(notification);

  // Auto-dismiss after 30 seconds
  setTimeout(() => {
    dismissChangeNotification();
  }, 30000);
}

/**
 * Dismisses the change detection notification.
 */
function dismissChangeNotification() {
  const notification = document.getElementById('changeNotification');
  if (notification) {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }
}

/* --------------------------------------------------------------------------
   Team Overview Loading & Display
   -------------------------------------------------------------------------- */

/**
 * Loads and displays team members overview with workflow status.
 */
function loadTeamMembersOverview() {
  if (!ManagerPortal.currentManager) {
    console.error('[ManagerPortal] Current manager not set');
    return;
  }

  console.log('[ManagerPortal] Loading team members for manager ID:', ManagerPortal.currentManager.employeeId);

  // Clear any old placeholder data from localStorage
  localStorage.removeItem('placeholderTeam');
  localStorage.removeItem('placeholderWorkflow');
  localStorage.removeItem('placeholderOKRs');
  localStorage.removeItem('placeholderSkillsAssessment');
  localStorage.removeItem('placeholderSelfAssessment');
  localStorage.removeItem('placeholderFeedForward');

  if (PLATFORM === 'APPSCRIPT') {
    console.log('[ManagerPortal] Calling backend getTeamMembersWithStatusData...');
    
    google.script.run
      .withSuccessHandler((result) => {
        console.log('[ManagerPortal] Backend response received:', result);
        
        if (result.success) {
          console.log('[ManagerPortal] Successfully loaded', result.data.length, 'team members');
          
          if (result.data.length === 0) {
            console.warn('[ManagerPortal] WARNING: No team members returned from backend');
            console.warn('[ManagerPortal] This could mean:');
            console.warn('[ManagerPortal] 1. The manager ID does not have any direct reports');
            console.warn('[ManagerPortal] 2. The manager ID format does not match the database');
            console.warn('[ManagerPortal] 3. Check the Employee Database ManagerID column values');
          }
          
          ManagerPortal.teamMembers = result.data;
          displayTeamOverview(result.data);
        } else {
          console.error('[ManagerPortal] Error loading team members:', result.message);
          alert('Error: ' + result.message);
        }
      })
      .withFailureHandler((error) => {
        console.error('[ManagerPortal] Backend call failed:', error);
        alert('Error loading team members: ' + error.toString());
      })
      .getTeamMembersWithStatusData(ManagerPortal.currentManager.employeeId);
  } else {
    // Converge Cloud — call API.getTeam()
    console.log('[ManagerPortal] Loading team via Converge API');
    
    API.getTeam(ManagerPortal.currentManager.employeeId)
      .then(result => {
        if (result.success) {
          console.log('[ManagerPortal] Loaded', result.teamCount, 'team members from API');
          
          // Map API response to expected format
          const teamData = result.team.map(member => ({
            employeeId: member.employeeNo,
            name: member.fullName,
            email: member.email,
            department: member.department,
            position: member.position,
            band: member.band,
            step1Complete: member.workflowStatus ? member.workflowStatus.step1Complete : false,
            step2Complete: member.workflowStatus ? member.workflowStatus.step2Complete : false,
            step3Complete: member.workflowStatus ? member.workflowStatus.step3Complete : false,
            step4Complete: member.workflowStatus ? member.workflowStatus.step4Complete : false,
            step5Complete: member.workflowStatus ? member.workflowStatus.step5Complete : false,
            step6Complete: member.workflowStatus ? member.workflowStatus.step6Complete : false,
            step7Complete: member.workflowStatus ? member.workflowStatus.step7Complete : false
          }));
          
          ManagerPortal.teamMembers = teamData;
          displayTeamOverview(teamData);
        } else {
          console.error('[ManagerPortal] API error:', result.message);
          // Show error in the table
          const tableBody = document.getElementById('teamTableBody');
          if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:#c62828;">API Error: ' + (result.message || 'Unknown') + '</td></tr>';
          }
        }
      })
      .catch(error => {
        console.error('[ManagerPortal] Network error:', error);
        const tableBody = document.getElementById('teamTableBody');
        if (tableBody) {
          tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:#c62828;">Network Error: ' + (error.message || error) + '</td></tr>';
        }
      });
  }
}

/**
 * Displays the team overview table with workflow status.
 * @param {Object[]} teamMembers - Array of team members with status
 */
function displayTeamOverview(teamMembers) {
  const tableBody = document.getElementById('teamTableBody');
  if (!tableBody) {
    console.error('[ManagerPortal] Team table body element not found');
    return;
  }

  console.log('[ManagerPortal] displayTeamOverview called with', teamMembers.length, 'team members');

  tableBody.innerHTML = ''; // Clear existing rows

  if (teamMembers.length === 0) {
    console.warn('[ManagerPortal] No team members to display');
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="8" style="text-align: center; padding: 2rem; color: #999;">
        No team members found. You may not have any direct reports.
      </td>
    `;
    tableBody.appendChild(emptyRow);
    return;
  }

  teamMembers.forEach((member, index) => {
    const row = createTeamTableRow(member);
    tableBody.appendChild(row);
    
    if (index < 3) {
      console.log('[ManagerPortal] Row', index, '- Employee:', member.name, 'ID:', member.employeeId);
    }
  });

  // Load sync status for all members after rendering
  loadSyncStatusForAllMembers(teamMembers);
}

/**
 * Loads sync status for all team members (used for UI indicators).
 * @param {Object[]} teamMembers - Array of team members
 */
function loadSyncStatusForAllMembers(teamMembers) {
  teamMembers.forEach(member => {
    if (PLATFORM === 'APPSCRIPT') {
      google.script.run
        .withSuccessHandler((result) => {
          if (result.success) {
            updateTeamRowSyncIndicator(member.employeeId, result.data);
          }
        })
        .withFailureHandler((error) => {
          console.error(`[ManagerPortal] Error loading sync status for ${member.employeeId}:`, error);
        })
        .getSyncStatusForEmployee(member.employeeId);
    }
  });
}

/**
 * Updates the sync indicator in a team member's table row.
 * @param {string} employeeId - Employee ID
 * @param {Object} syncStatus - Sync status data
 */
function updateTeamRowSyncIndicator(employeeId, syncStatus) {
  // Find the row for this employee
  const rows = document.querySelectorAll('#teamTableBody tr');
  let targetRow = null;

  rows.forEach(row => {
    const firstCell = row.querySelector('td');
    if (firstCell && firstCell.textContent.includes(employeeId)) {
      targetRow = row;
    }
  });

  if (!targetRow) return;

  // Determine overall sync status
  const allStatuses = [
    syncStatus.skills.syncStatus,
    syncStatus.okr.syncStatus,
    syncStatus.selfAssessment.syncStatus,
    syncStatus.feedForward.syncStatus,
    syncStatus.managerAck.syncStatus
  ];

  const allSynced = allStatuses.every(s => s === 'SYNCED');
  const hasStarted = allStatuses.some(s => s === 'SYNCED');

  // Create sync indicator element
  const syncIndicator = document.createElement('span');
  syncIndicator.className = 'sync-indicator';
  syncIndicator.title = allSynced ? 'All data synced' : (hasStarted ? 'Partially synced' : 'Not started');
  
  if (allSynced) {
    syncIndicator.innerHTML = '🟢'; // Green - all synced
    syncIndicator.style.color = '#0a7c42';
  } else if (hasStarted) {
    syncIndicator.innerHTML = '🟡'; // Yellow - partially synced
    syncIndicator.style.color = '#f9a825';
  } else {
    syncIndicator.innerHTML = '⚪'; // Gray - not started
    syncIndicator.style.color = '#9AC0C3';
  }

  // Add to first cell (name column)
  const firstCell = targetRow.querySelector('td');
  if (firstCell && !firstCell.querySelector('.sync-indicator')) {
    firstCell.appendChild(document.createTextNode(' '));
    firstCell.appendChild(syncIndicator);
  }
}

/**
 * Creates a table row for a team member with action buttons.
 * @param {Object} member - Team member object with workflow status
 * @returns {HTMLTableRowElement} Table row element
 */
function createTeamTableRow(member) {
  const row = document.createElement('tr');
  
  // Support both nested and flat status structures
  const status = member.workflowStatus || {
    step1Complete: member.step1Complete || false,
    step2Complete: member.step2Complete || false,
    step3Complete: member.step3Complete || false,
    step4Complete: member.step4Complete || false,
    step5Complete: member.step5Complete || false
  };

  const step1Status = status.step1Complete ? '✓ Complete' : '○ Pending';
  const step1Class = status.step1Complete ? 'status-complete' : 'status-pending';

  // Determine Step 4 status based on Step 3
  let step4Status, step4Class;
  if (status.step4Complete) {
    step4Status = '✓ Complete';
    step4Class = 'status-complete';
  } else if (!status.step3Complete) {
    // Step 3 is pending, so Step 4 is LOCKED
    step4Status = '🔒 Locked';
    step4Class = 'status-locked';
  } else {
    // Step 3 is complete, Step 4 is pending
    step4Status = '○ Pending';
    step4Class = 'status-pending';
  }

  // Determine Step 5 status based on Step 3 and Step 4
  let step5Status, step5Class;
  if (status.step5Complete) {
    step5Status = '✓ Complete';
    step5Class = 'status-complete';
  } else if (!status.step3Complete) {
    // Step 3 is pending, so Step 5 is LOCKED
    step5Status = '🔒 Locked';
    step5Class = 'status-locked';
  } else if (status.step3Complete && !status.step4Complete) {
    // Step 3 is complete but Step 4 is pending, so Step 5 is LOCKED
    step5Status = '🔒 Locked';
    step5Class = 'status-locked';
  } else {
    // Step 3 & 4 are complete, Step 5 is pending
    step5Status = '○ Pending';
    step5Class = 'status-pending';
  }

  // Determine action button and label based on workflow status
  const actionButtonHTML = getActionButton(status, member.employeeId);

  row.innerHTML = `
    <td>${member.name || 'N/A'}</td>
    <td>${member.department || 'N/A'}</td>
    <td>${member.band || 'N/A'}</td>
    <td><span class="status-badge ${step1Class}">${step1Status}</span></td>
    <td><span class="status-badge ${step4Class}">${step4Status}</span></td>
    <td><span class="status-badge ${step5Class}">${step5Status}</span></td>
    <td>
      ${actionButtonHTML}
    </td>
  `;

  return row;
}

/**
 * Determines the action button and label based on workflow status.
 * Logic considers Step 1 (Skills), Step 3 (Self-Assessment), Step 4 (Feed Forward), Step 5 (Acknowledgement):
 * 
 * - If Step 1 pending → "Assess Skills"
 * - Else if Step 1 complete but Step 3 pending → Step 4 and 5 are LOCKED (no action button)
 * - Else if Step 1 & 3 complete but Step 4 pending → "Feed Forward"
 * - Else if Step 1 & 3 & 4 complete but Step 5 pending → "Acknowledgement"
 * - Else (all complete) → "View"
 * 
 * @param {Object} status - Workflow status object
 * @param {string} employeeId - Employee ID
 * @returns {string} HTML for action button
 */
function getActionButton(status, employeeId) {
  const step1Complete = status.step1Complete || false;
  const step3Complete = status.step3Complete || false;
  const step4Complete = status.step4Complete || false;
  const step5Complete = status.step5Complete || false;

  // Step 1 is pending
  if (!step1Complete) {
    return `<button class="btn btn--small btn--primary" onclick="startSkillsAssessment('${employeeId}')">Assess Skills</button>`;
  }

  // Step 1 complete but Step 3 (Self-Assessment) is pending
  // Step 4 and 5 are LOCKED
  if (step1Complete && !step3Complete) {
    return `<span class="status-locked">🔒 Locked</span>`;
  }

  // Step 1 & 3 complete, Step 4 pending
  if (step1Complete && step3Complete && !step4Complete) {
    return `<button class="btn btn--small btn--primary" onclick="startFeedForward('${employeeId}')">Feed Forward</button>`;
  }

  // Step 1 & 3 & 4 complete, Step 5 pending
  if (step1Complete && step3Complete && step4Complete && !step5Complete) {
    return `<button class="btn btn--small btn--primary" onclick="startAcknowledgement('${employeeId}')">Acknowledgement</button>`;
  }

  // All steps complete
  return `<button class="btn btn--small btn--secondary" onclick="viewEmployeeAssessments('${employeeId}')">View</button>`;
}

/* --------------------------------------------------------------------------
   Assessment Data Loading & Display
   -------------------------------------------------------------------------- */

/**
 * Loads all assessment data for an employee and displays them.
 * @param {string} employeeId - The employee ID to load assessments for
 */
function viewEmployeeAssessments(employeeId) {
  console.log(`[ManagerPortal] Loading assessments for employee: ${employeeId}`);
  
  ManagerPortal.selectedEmployee = employeeId;
  
  // Load all assessment data in parallel
  const assessmentPromises = [
    { name: 'skills', fn: 'getSkillsAssessmentData' },
    { name: 'okr', fn: 'getOKRUploadData' },
    { name: 'selfAssessment', fn: 'getSelfAssessmentData' },
    { name: 'feedForward', fn: 'getFeedForwardData' },
    { name: 'managerAck', fn: 'getManagerAcknowledgementData' }
  ];

  if (PLATFORM === 'APPSCRIPT') {
    const pendingRequests = assessmentPromises.length;
    let completedRequests = 0;
    const results = {};

    assessmentPromises.forEach(({ name, fn }) => {
      google.script.run
        .withSuccessHandler((result) => {
          results[name] = result;
          completedRequests++;
          
          if (completedRequests === pendingRequests) {
            ManagerPortal.assessmentCache[employeeId] = results;
            displayEmployeeAssessmentSummary(employeeId, results);
            showTeamOverview(); // Switch to overview view
          }
        })
        .withFailureHandler((error) => {
          console.error(`[ManagerPortal] Error loading ${name}:`, error);
          results[name] = { success: false, data: null };
          completedRequests++;
          
          if (completedRequests === pendingRequests) {
            ManagerPortal.assessmentCache[employeeId] = results;
            displayEmployeeAssessmentSummary(employeeId, results);
            showTeamOverview();
          }
        })[fn](employeeId);
    });
  }
}

/**
 * Displays a summary of all assessments for an employee (inline in team overview).
 * @param {string} employeeId - The employee ID
 * @param {Object} assessments - Assessment data object
 */
function displayEmployeeAssessmentSummary(employeeId, assessments) {
  const employee = ManagerPortal.teamMembers.find(m => m.employeeId === employeeId);
  if (!employee) return;

  console.log(`[ManagerPortal] Assessment summary for ${employeeId}:`, assessments);

  // Create a summary view (could be a modal or inline section)
  const summaryHTML = `
    <div class="assessment-summary" id="assessmentSummary_${employeeId}">
      <h3>Assessment Summary for ${employee.name}</h3>
      
      ${renderAssessmentCard('Step 1: Skills Assessment', assessments.skills)}
      ${renderAssessmentCard('Step 2: OKR Upload', assessments.okr)}
      ${renderAssessmentCard('Step 3: Self-Assessment', assessments.selfAssessment)}
      ${renderAssessmentCard('Step 4: Feed Forward', assessments.feedForward)}
      ${renderAssessmentCard('Step 5: Manager Acknowledgement', assessments.managerAck)}
    </div>
  `;

  console.log('[ManagerPortal] Summary HTML:', summaryHTML);
  // This could be displayed in a modal or detailed view section
}

/**
 * Renders a card for an assessment step.
 * @param {string} stepName - Name of the assessment step
 * @param {Object} assessmentData - Assessment data result
 * @returns {string} HTML string
 */
function renderAssessmentCard(stepName, assessmentData) {
  if (!assessmentData || !assessmentData.success || !assessmentData.data) {
    return `
      <div class="assessment-card assessment-card--empty">
        <h4>${stepName}</h4>
        <p>Not yet completed</p>
      </div>
    `;
  }

  const data = assessmentData.data;
  const lastModified = data.lastModified || data.timestamp || 'Unknown';

  return `
    <div class="assessment-card assessment-card--complete">
      <h4>${stepName}</h4>
      <div class="assessment-card__content">
        <p><strong>Status:</strong> Complete</p>
        <p><strong>Last Modified:</strong> ${lastModified}</p>
        ${renderAssessmentDetails(stepName, data)}
      </div>
    </div>
  `;
}

/**
 * Renders specific details based on assessment type.
 * @param {string} stepName - Name of the step
 * @param {Object} data - Assessment data
 * @returns {string} HTML string with details
 */
function renderAssessmentDetails(stepName, data) {
  if (stepName.includes('Feed Forward')) {
    return `
      <p><strong>Comments:</strong> ${data.feedForwardComments || 'N/A'}</p>
      <p><strong>Rating:</strong> ${data.performanceRating || 'N/A'}</p>
    `;
  }
  
  if (stepName.includes('OKR')) {
    return `
      <p><strong>Corporate OKR:</strong> ${data.corporateOKR || 'N/A'}</p>
      <p><strong>Final Score:</strong> ${data.finalScore || 'N/A'}</p>
    `;
  }

  if (stepName.includes('Self-Assessment')) {
    return `<p>Completed by employee</p>`;
  }

  return `<p>Assessment data available</p>`;
}

/* --------------------------------------------------------------------------
   Navigation & View Management
   -------------------------------------------------------------------------- */

/**
 * Shows the team overview section and hides step sections.
 */
function showTeamOverview() {
  const teamSection = document.getElementById('teamOverviewSection');
  const skillsSection = document.getElementById('skillsAssessmentSection');
  const feedForwardSection = document.getElementById('feedForwardSection');
  const acknowledgementSection = document.getElementById('acknowledgementSection');

  if (teamSection) teamSection.style.display = 'block';
  if (skillsSection) skillsSection.style.display = 'none';
  if (feedForwardSection) feedForwardSection.style.display = 'none';
  if (acknowledgementSection) acknowledgementSection.style.display = 'none';

  console.log('[ManagerPortal] Showing team overview');
}

/**
 * Shows a specific assessment section.
 * @param {string} sectionId - ID of the section to show
 */
function showAssessmentSection(sectionId) {
  // Hide all step sections
  const allSections = [
    'teamOverviewSection',
    'skillsAssessmentSection',
    'feedForwardSection',
    'acknowledgementSection'
  ];

  allSections.forEach(id => {
    const section = document.getElementById(id);
    if (section) section.style.display = 'none';
  });

  // Show requested section
  const section = document.getElementById(sectionId);
  if (section) section.style.display = 'block';

  console.log(`[ManagerPortal] Showing section: ${sectionId}`);
}

/**
 * Displays sync status for an employee in a modal/overlay.
 * @param {string} employeeId - The employee ID
 */
function viewSyncStatus(employeeId) {
  console.log(`[ManagerPortal] Viewing sync status for employee: ${employeeId}`);
  
  const employee = ManagerPortal.teamMembers.find(m => m.employeeId === employeeId);
  if (!employee) return;

  if (PLATFORM === 'APPSCRIPT') {
    google.script.run
      .withSuccessHandler((result) => {
        if (result.success) {
          displaySyncStatusModal(employee, result.data);
        } else {
          alert('Error loading sync status: ' + result.message);
        }
      })
      .withFailureHandler((error) => {
        console.error('[ManagerPortal] Error loading sync status:', error);
        alert('Error loading sync status');
      })
      .getSyncStatusForEmployee(employeeId);
  }
}

/**
 * Displays sync status information in a modal/overlay.
 * @param {Object} employee - Employee object
 * @param {Object} syncStatus - Sync status data from backend
 */
function displaySyncStatusModal(employee, syncStatus) {
  // Create modal overlay
  const modal = document.createElement('div');
  modal.className = 'sync-status-modal';
  modal.id = 'syncStatusModal';

  const statusRows = [
    { name: 'Step 1: Skills Assessment', status: syncStatus.skills },
    { name: 'Step 2: OKR Upload', status: syncStatus.okr },
    { name: 'Step 3: Self-Assessment', status: syncStatus.selfAssessment },
    { name: 'Step 4: Feed Forward', status: syncStatus.feedForward },
    { name: 'Step 5: Manager Acknowledgement', status: syncStatus.managerAck }
  ];

  const statusHTML = statusRows.map(row => {
    const statusClass = row.status.exists ? 
      (row.status.syncStatus === 'SYNCED' ? 'sync-complete' : 'sync-warning') : 
      'sync-empty';
    
    const statusIcon = row.status.exists ? 
      (row.status.syncStatus === 'SYNCED' ? '✓' : '⚠') : 
      '○';

    return `
      <div class="sync-status-row ${statusClass}">
        <span class="sync-icon">${statusIcon}</span>
        <div class="sync-details">
          <h4>${row.name}</h4>
          <p><strong>Status:</strong> ${row.status.syncStatus}</p>
          <p><strong>Last Synced:</strong> ${row.status.timestamp}</p>
        </div>
      </div>
    `;
  }).join('');

  modal.innerHTML = `
    <div class="sync-status-content">
      <div class="sync-status-header">
        <h2>Sync Status for ${employee.name}</h2>
        <button class="btn btn--close" onclick="closeSyncStatusModal()">✕</button>
      </div>
      
      <div class="sync-status-list">
        ${statusHTML}
      </div>
      
      <div class="sync-status-legend">
        <p><strong>✓ SYNCED:</strong> Data is up-to-date with Sheets</p>
        <p><strong>⚠ WARNING:</strong> Data exists but sync status unclear</p>
        <p><strong>○ PENDING:</strong> Assessment not yet started</p>
      </div>

      <div class="sync-status-actions">
        <button class="btn btn--secondary" onclick="closeSyncStatusModal()">Close</button>
        <button class="btn btn--primary" onclick="refreshAllSyncStatus()">Refresh All</button>
      </div>
    </div>
  `;

  // Add to page and show
  document.body.appendChild(modal);
  modal.style.display = 'flex';
}

/**
 * Closes the sync status modal.
 */
function closeSyncStatusModal() {
  const modal = document.getElementById('syncStatusModal');
  if (modal) {
    modal.remove();
  }
}

/**
 * Refreshes sync status for all team members.
 */
function refreshAllSyncStatus() {
  console.log('[ManagerPortal] Refreshing all sync status...');
  loadTeamMembersOverview();
  alert('Sync status refreshed!');
}

/**
 * Handles data conflicts by showing a dialog to the user.
 * @param {Object} conflict - Conflict info from backend
 * @param {string} step - Step name (e.g., 'skills', 'feedforward')
 * @param {Object} portalData - Data from the portal form
 * @param {string} employeeId - Employee ID
 */
function handleConflictDialog(conflict, step, portalData, employeeId) {
  const choice = confirm(
    `Conflict detected!\n\n` +
    `Sheets was updated at: ${conflict.sheetsTimestamp}\n` +
    `Your portal data: ${conflict.portalTimestamp || 'Not previously synced'}\n\n` +
    `Click OK to use your portal changes (overwrite)\n` +
    `Click Cancel to keep Sheets data`
  );
  
  if (choice) {
    // User chose to use portal data
    if (PLATFORM === 'APPSCRIPT') {
      google.script.run
        .withSuccessHandler((result) => {
          if (result.success) {
            alert('Conflict resolved - using portal data!');
            showTeamOverview();
            loadTeamMembersOverview();
          } else {
            alert('Error resolving conflict: ' + result.message);
          }
        })
        .withFailureHandler((error) => {
          console.error('[ManagerPortal] Error resolving conflict:', error);
          alert('Error resolving conflict');
        })
        .resolveDataConflict(employeeId, step, 'PORTAL_WINS', portalData);
    }
  } else {
    // User chose to keep Sheets data
    alert('Keeping Sheets data. Refreshing form...');
    loadTeamMembersOverview();
  }
}

/* -------------------------------------------------------------------------- */
/*                       FORM SUBMISSION HANDLERS                             */
/* -------------------------------------------------------------------------- */

/**
 * Handles skills assessment form submission with conflict detection.
 * @param {Event} e - Form submit event
 */
function handleSkillsFormSubmit(e) {
  e.preventDefault();
  
  console.log('[ManagerPortal] Skills assessment form submitted');
  
  // Collect form data
  const formData = new FormData(document.getElementById('skillsAssessmentForm'));
  const assessmentData = Object.fromEntries(formData);

  if (PLATFORM === 'APPSCRIPT') {
    google.script.run
      .withSuccessHandler((result) => {
        if (result.success) {
          // Update placeholder data to mark step 1 as complete
          const placeholderWorkflow = JSON.parse(localStorage.getItem('placeholderWorkflow')) || {};
          if (placeholderWorkflow[ManagerPortal.selectedEmployee]) {
            placeholderWorkflow[ManagerPortal.selectedEmployee].step1Complete = true;
            localStorage.setItem('placeholderWorkflow', JSON.stringify(placeholderWorkflow));
          }
          
          alert('Skills assessment saved successfully!');
          showTeamOverview();
          loadTeamMembersOverview();
        } else if (result.conflict) {
          // Handle conflict
          handleConflictDialog(result.conflict, 'skills', assessmentData, ManagerPortal.selectedEmployee);
        } else {
          alert('Error saving skills assessment: ' + result.message);
        }
      })
      .withFailureHandler((error) => {
        console.error('[ManagerPortal] Error saving skills assessment:', error);
        alert('Error saving skills assessment');
      })
      .saveSkillsAssessment(ManagerPortal.selectedEmployee, assessmentData);
  } else {
    // Converge Cloud — call the API
    console.log('[ManagerPortal] Saving skills assessment via Converge API');
    
    // Build skills array from form data
    const skills = [];
    const formEntries = Object.entries(assessmentData);
    for (const [key, value] of formEntries) {
      if (key.startsWith('core_') || key.startsWith('leadership_')) {
        const parts = key.split('_');
        const skillType = parts[0] === 'core' ? 'CORE' : 'LEADERSHIP';
        const skillName = parts.slice(1).join(' ');
        skills.push({ skillType, skillName, rating: parseInt(value) || 0 });
      }
    }

    // If no parsed skills, send raw form data as a single entry
    if (skills.length === 0) {
      skills.push({ skillType: 'CORE', skillName: 'General Assessment', rating: 3, remarks: JSON.stringify(assessmentData) });
    }

    API.saveSkillsAssessment(ManagerPortal.selectedEmployee, skills)
      .then(result => {
        if (result.success) {
          alert('Skills assessment saved successfully!');
          showTeamOverview();
          loadTeamMembersOverview();
        } else {
          alert('Error saving skills assessment: ' + result.message);
        }
      })
      .catch(error => {
        console.error('[ManagerPortal] API error:', error);
        alert('Error saving skills assessment');
      });
  }
}

/**
 * Handles feed forward form submission with conflict detection.
 * @param {Event} e - Form submit event
 */
function handleFeedForwardFormSubmit(e) {
  e.preventDefault();
  
  console.log('[ManagerPortal] Feed forward form submitted');
  
  const formData = new FormData(document.getElementById('feedForwardForm'));
  const feedForwardData = Object.fromEntries(formData);
  feedForwardData.managerId = ManagerPortal.currentManager.employeeId;

  if (PLATFORM === 'APPSCRIPT') {
    google.script.run
      .withSuccessHandler((result) => {
        if (result.success) {
          // Update placeholder data to mark step 4 as complete and step 5 as pending
          const placeholderWorkflow = JSON.parse(localStorage.getItem('placeholderWorkflow')) || {};
          if (placeholderWorkflow[ManagerPortal.selectedEmployee]) {
            placeholderWorkflow[ManagerPortal.selectedEmployee].step4Complete = true;
            placeholderWorkflow[ManagerPortal.selectedEmployee].step5Complete = false;
            localStorage.setItem('placeholderWorkflow', JSON.stringify(placeholderWorkflow));
          }
          
          alert('Feed forward saved successfully!');
          showTeamOverview();
          loadTeamMembersOverview();
        } else if (result.conflict) {
          // Handle conflict
          handleConflictDialog(result.conflict, 'feedForward', feedForwardData, ManagerPortal.selectedEmployee);
        } else {
          alert('Error saving feed forward: ' + result.message);
        }
      })
      .withFailureHandler((error) => {
        console.error('[ManagerPortal] Error saving feed forward:', error);
        alert('Error saving feed forward');
      })
      .saveFeedForward(ManagerPortal.selectedEmployee, ManagerPortal.currentManager.employeeId, feedForwardData);
  } else {
    // Converge Cloud — call the API
    console.log('[ManagerPortal] Saving feed forward via Converge API');
    
    API.saveFeedForward({
      employeeNo: ManagerPortal.selectedEmployee,
      comments: feedForwardData.comments || feedForwardData.feedback || '',
      performanceRating: feedForwardData.performanceRating || feedForwardData.rating || '',
      strengths: feedForwardData.strengths || '',
      areasForImprovement: feedForwardData.areasForImprovement || feedForwardData.areas_for_improvement || ''
    })
      .then(result => {
        if (result.success) {
          alert('Feed forward saved successfully!');
          showTeamOverview();
          loadTeamMembersOverview();
        } else {
          alert('Error saving feed forward: ' + result.message);
        }
      })
      .catch(error => {
        console.error('[ManagerPortal] API error:', error);
        alert('Error saving feed forward');
      });
  }
}

/**
 * Handles acknowledgement form submission.
 * @param {Event} e - Form submit event
 */
function handleAcknowledgementFormSubmit(e) {
  e.preventDefault();
  
  console.log('[ManagerPortal] Acknowledgement form submitted');
  
  const formData = new FormData(document.getElementById('acknowledgementForm'));
  const ackData = Object.fromEntries(formData);

  if (PLATFORM === 'APPSCRIPT') {
    google.script.run
      .withSuccessHandler((result) => {
        if (result.success) {
          // Update placeholder data to mark step 5 as complete
          const placeholderWorkflow = JSON.parse(localStorage.getItem('placeholderWorkflow')) || {};
          if (placeholderWorkflow[ManagerPortal.selectedEmployee]) {
            placeholderWorkflow[ManagerPortal.selectedEmployee].step5Complete = true;
            localStorage.setItem('placeholderWorkflow', JSON.stringify(placeholderWorkflow));
          }
          
          alert('Acknowledgement saved successfully!');
          showTeamOverview();
          loadTeamMembersOverview();
        } else {
          alert('Error saving acknowledgement: ' + result.message);
        }
      })
      .withFailureHandler((error) => {
        console.error('[ManagerPortal] Error saving acknowledgement:', error);
        alert('Error saving acknowledgement');
      })
      .saveAcknowledgement(ManagerPortal.selectedEmployee, ManagerPortal.currentManager.employeeId, ackData, 'MANAGER');
  } else {
    // Converge Cloud — call the API
    console.log('[ManagerPortal] Saving acknowledgement via Converge API');
    
    API.saveAcknowledgement(ManagerPortal.selectedEmployee, 5, ackData.comment || '')
      .then(result => {
        if (result.success) {
          alert('Acknowledgement saved successfully!');
          showTeamOverview();
          loadTeamMembersOverview();
        } else {
          alert('Error saving acknowledgement: ' + result.message);
        }
      })
      .catch(error => {
        console.error('[ManagerPortal] API error:', error);
        alert('Error saving acknowledgement');
      });
  }
}

/* --------------------------------------------------------------------------
   Placeholder Data for Testing
   -------------------------------------------------------------------------- */

/**
 * Loads placeholder team member data into localStorage for local testing.
 * This simulates a team structure with various workflow completion states.
 */
function loadPlaceholderTeamData() {
  console.log('[ManagerPortal] Loading placeholder team data for testing...');

  // Define placeholder team members
  const placeholderTeam = [
    {
      employeeId: 'EMP_001',
      name: 'Alice Johnson',
      department: 'Sales',
      band: 'Senior Manager',
      managerEmployeeId: 'MANAGER_001',
      roleLevel: 'DEPT_HEAD'
    },
    {
      employeeId: 'EMP_002',
      name: 'Bob Smith',
      department: 'Sales',
      band: 'Sales Executive',
      managerEmployeeId: 'MANAGER_001',
      roleLevel: 'INDIVIDUAL'
    },
    {
      employeeId: 'EMP_003',
      name: 'Carol White',
      department: 'Marketing',
      band: 'Marketing Manager',
      managerEmployeeId: 'MANAGER_001',
      roleLevel: 'TEAM_HEAD'
    },
    {
      employeeId: 'EMP_004',
      name: 'David Brown',
      department: 'Sales',
      band: 'Sales Associate',
      managerEmployeeId: 'MANAGER_001',
      roleLevel: 'INDIVIDUAL'
    },
    {
      employeeId: 'EMP_005',
      name: 'Emma Davis',
      department: 'Marketing',
      band: 'Marketing Specialist',
      managerEmployeeId: 'MANAGER_001',
      roleLevel: 'INDIVIDUAL'
    }
  ];

  // Define placeholder workflow status for each employee
  const placeholderWorkflow = {
    EMP_001: {
      step1Complete: true,
      step2Complete: true,
      step3Complete: true,
      step4Complete: false,
      step5Complete: false,
      step6Complete: false,
      step7Complete: false,
      lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
    },
    EMP_002: {
      step1Complete: true,
      step2Complete: true,
      step3Complete: true,
      step4Complete: false,
      step5Complete: false,
      step6Complete: false,
      step7Complete: false,
      lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
    },
    EMP_003: {
      step1Complete: false,
      step2Complete: true,
      step3Complete: false,
      step4Complete: false,
      step5Complete: false,
      step6Complete: false,
      step7Complete: false,
      lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
    },
    EMP_004: {
      step1Complete: true,
      step2Complete: true,
      step3Complete: true,
      step4Complete: true,
      step5Complete: true,
      step6Complete: true,
      step7Complete: false,
      lastUpdated: new Date().toISOString() // Just now
    },
    EMP_005: {
      step1Complete: false,
      step2Complete: false,
      step3Complete: false,
      step4Complete: false,
      step5Complete: false,
      step6Complete: false,
      step7Complete: false,
      lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
    }
  };

  // Define placeholder OKR data
  const placeholderOKRs = {
    EMP_001: {
      corporateOKR: 92.5,
      groupOKR: 88.0,
      departmentOKR: 95.0,
      teamOKR: null,
      weight: { corporate: 0.10, group: 0.90 },
      finalScore: 88.35
    },
    EMP_002: {
      corporateOKR: null,
      groupOKR: null,
      departmentOKR: 85.0,
      teamOKR: 90.0,
      weight: { department: 0.60, team: 0.40 },
      finalScore: 87.0
    },
    EMP_003: {
      corporateOKR: null,
      groupOKR: null,
      departmentOKR: 100.0,
      teamOKR: 105.0,
      weight: { department: 0.60, team: 0.40 },
      finalScore: 101.0
    },
    EMP_004: {
      corporateOKR: null,
      groupOKR: null,
      departmentOKR: 75.0,
      teamOKR: 78.0,
      weight: { department: 0.60, team: 0.40 },
      finalScore: 76.2
    },
    EMP_005: {
      corporateOKR: null,
      groupOKR: null,
      departmentOKR: 92.0,
      teamOKR: 94.5,
      weight: { department: 0.60, team: 0.40 },
      finalScore: 92.9
    }
  };

  // Define placeholder skills assessment data
  const placeholderSkillsAssessment = {
    EMP_001: {
      coreSkills: {
        'cs-001': { level: 4, remarks: 'Strong technical knowledge' },
        'cs-002': { level: 5, remarks: 'Excellent process efficiency' },
        'cs-003': { level: 4, remarks: 'Consistent quality focus' },
        'cs-004': { level: 4, remarks: 'Good customer understanding' },
        'cs-005': { level: 5, remarks: 'Excellent collaborator' }
      },
      leadershipSkills: {
        'ls-001': { level: 4, remarks: 'Good strategic vision' },
        'ls-002': { level: 5, remarks: 'Outstanding team development' },
        'ls-003': { level: 4, remarks: 'Sound decision making' },
        'ls-004': { level: 4, remarks: 'Clear communicator' },
        'ls-005': { level: 3, remarks: 'Adapting to changes' }
      },
      completedBy: 'MANAGER_001',
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    EMP_002: {
      coreSkills: {
        'cs-001': { level: 3, remarks: 'Developing technical skills' },
        'cs-002': { level: 3, remarks: 'Good process efficiency' },
        'cs-003': { level: 3, remarks: 'Quality oriented' },
        'cs-004': { level: 4, remarks: 'Strong customer focus' },
        'cs-005': { level: 3, remarks: 'Collaborative team member' }
      },
      leadershipSkills: null,
      completedBy: 'MANAGER_001',
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    EMP_003: {},
    EMP_004: {
      coreSkills: {
        'cs-001': { level: 2, remarks: 'Need development in technical area' },
        'cs-002': { level: 2, remarks: 'Works on efficiency' },
        'cs-003': { level: 2, remarks: 'Quality needs improvement' },
        'cs-004': { level: 3, remarks: 'Understands customers' },
        'cs-005': { level: 2, remarks: 'Developing collaboration skills' }
      },
      leadershipSkills: null,
      completedBy: 'MANAGER_001',
      completedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // 3 hours ago
    },
    EMP_005: {}
  };

  // Define placeholder self-assessment data
  const placeholderSelfAssessment = {
    EMP_001: {
      answers: {
        q1: 'Strong project execution and cross-functional collaboration contributed to my performance.',
        q2: 'Time management during peak season was challenging but we managed well.',
        q3: 'More strategic planning tools and training would be helpful.',
        q4: 'I commit to leading the Q2 initiative and improving process efficiency by 15%.'
      },
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    EMP_002: {
      answers: {
        q1: 'Consistent delivery and positive client feedback drove my performance.',
        q2: 'Limited resources in Q1 impacted project timelines.',
        q3: 'Advanced training in new tools would help productivity.',
        q4: 'I will complete the certification program and mentor new team members.'
      },
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    EMP_003: {
      answers: {
        q1: 'Creative campaigns and team innovation drove results.',
        q2: 'Market changes required quick pivots which tested our agility.',
        q3: 'More data analytics support would strengthen our strategy.',
        q4: 'I commit to presenting quarterly market insights to leadership.'
      },
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  };

  // Define placeholder feed forward data
  const placeholderFeedForward = {
    EMP_004: {
      comments: 'Alice, while your efforts are appreciated, the quality of work needs improvement. Focus on attention to detail and following established processes. I see potential with proper guidance and training.',
      performanceRating: 'needs-improvement',
      completedBy: 'MANAGER_001',
      completedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    }
  };

  // Store in localStorage
  localStorage.setItem('placeholderTeam', JSON.stringify(placeholderTeam));
  localStorage.setItem('placeholderWorkflow', JSON.stringify(placeholderWorkflow));
  localStorage.setItem('placeholderOKRs', JSON.stringify(placeholderOKRs));
  localStorage.setItem('placeholderSkillsAssessment', JSON.stringify(placeholderSkillsAssessment));
  localStorage.setItem('placeholderSelfAssessment', JSON.stringify(placeholderSelfAssessment));
  localStorage.setItem('placeholderFeedForward', JSON.stringify(placeholderFeedForward));

  // Update ManagerPortal state
  ManagerPortal.teamMembers = placeholderTeam;
  
  console.log('[ManagerPortal] Placeholder data loaded:');
  console.log('  - Team members:', placeholderTeam.length);
  console.log('  - Workflow statuses:', Object.keys(placeholderWorkflow).length);
  console.log('  - OKR data:', Object.keys(placeholderOKRs).length);
}

/* --------------------------------------------------------------------------
   Step Navigation Functions
   -------------------------------------------------------------------------- */

/**
 * Starts the Skills Assessment step for an employee.
 * Loads employee data and shows the skills assessment form.
 * @param {string} employeeId - Employee ID
 */
function startSkillsAssessment(employeeId) {
  console.log(`[ManagerPortal] Starting Skills Assessment for employee: ${employeeId}`);
  
  ManagerPortal.selectedEmployee = employeeId;
  
  const employee = ManagerPortal.teamMembers.find(m => m.employeeId === employeeId);
  if (!employee) {
    console.error(`[ManagerPortal] Employee not found: ${employeeId}`);
    alert('Employee not found');
    return;
  }

  // Update employee display fields
  document.getElementById('assessmentEmployeeName').textContent = employee.name;
  document.getElementById('assessmentEmployeeBand').textContent = employee.band || 'N/A';

  // Load existing skills assessment if available
  if (PLATFORM === 'APPSCRIPT') {
    google.script.run
      .withSuccessHandler((result) => {
        if (result.success && result.data) {
          // Populate form with existing data
          console.log('[ManagerPortal] Skills assessment data loaded:', result.data);
          // TODO: Populate form fields with existing data
        } else {
          console.log('[ManagerPortal] No existing skills assessment found, showing empty form');
        }
        showAssessmentSection('skillsAssessmentSection');
      })
      .withFailureHandler((error) => {
        console.error('[ManagerPortal] Error loading skills assessment:', error);
        showAssessmentSection('skillsAssessmentSection');
      })
      .getSkillsAssessmentData(employeeId);
  } else {
    showAssessmentSection('skillsAssessmentSection');
  }
}

/**
 * Starts the Feed Forward step for an employee.
 * Loads employee data and shows the feed forward form.
 * @param {string} employeeId - Employee ID
 */
function startFeedForward(employeeId) {
  console.log(`[ManagerPortal] Starting Feed Forward for employee: ${employeeId}`);
  
  ManagerPortal.selectedEmployee = employeeId;
  
  const employee = ManagerPortal.teamMembers.find(m => m.employeeId === employeeId);
  if (!employee) {
    console.error(`[ManagerPortal] Employee not found: ${employeeId}`);
    alert('Employee not found');
    return;
  }

  // Populate and auto-fill the employee selection dropdown
  const employeeSelect = document.getElementById('feedForwardEmployeeSelect');
  if (employeeSelect) {
    // Clear existing options
    employeeSelect.innerHTML = '';
    
    // Add option for selected employee
    const option = document.createElement('option');
    option.value = employeeId;
    option.textContent = `${employee.name} (${employee.band})`;
    option.selected = true;
    employeeSelect.appendChild(option);
    
    // Disable the select so it cannot be changed
    employeeSelect.disabled = true;
  }

  // Load employee feed forward data and summary
  if (PLATFORM === 'APPSCRIPT') {
    google.script.run
      .withSuccessHandler((result) => {
        if (result.success && result.data) {
          console.log('[ManagerPortal] Feed Forward data loaded:', result.data);
          
          // Populate summary cards
          document.getElementById('okrAchievementValue').textContent = 
            result.data.okrScore ? result.data.okrScore + '%' : 'Pending';
          document.getElementById('skillsAssessmentValue').textContent = 
            result.data.skillsStatus || 'Pending';
          document.getElementById('selfAssessmentStatus').textContent = 
            result.data.selfAssessmentStatus || 'Pending';
          
          // If feed forward already exists, populate the form
          if (result.data.feedForwardComments) {
            document.getElementById('feedForwardComments').value = result.data.feedForwardComments;
          }
          if (result.data.performanceRating) {
            document.getElementById('performanceRating').value = result.data.performanceRating;
          }
        } else {
          console.log('[ManagerPortal] No existing feed forward data found');
          document.getElementById('okrAchievementValue').textContent = 'Pending';
          document.getElementById('skillsAssessmentValue').textContent = 'Pending';
          document.getElementById('selfAssessmentStatus').textContent = 'Pending';
        }
        showAssessmentSection('feedForwardSection');
      })
      .withFailureHandler((error) => {
        console.error('[ManagerPortal] Error loading feed forward data:', error);
        showAssessmentSection('feedForwardSection');
      })
      .getFeedForwardData(employeeId);
  } else {
    showAssessmentSection('feedForwardSection');
  }
}

/**
 * Starts the Acknowledgement step for an employee.
 * Loads employee data and shows the acknowledgement form.
 * @param {string} employeeId - Employee ID
 */
function startAcknowledgement(employeeId) {
  console.log(`[ManagerPortal] Starting Acknowledgement for employee: ${employeeId}`);
  
  ManagerPortal.selectedEmployee = employeeId;
  
  const employee = ManagerPortal.teamMembers.find(m => m.employeeId === employeeId);
  if (!employee) {
    console.error(`[ManagerPortal] Employee not found: ${employeeId}`);
    alert('Employee not found');
    return;
  }

  // Populate and auto-fill the employee selection dropdown
  const employeeSelect = document.getElementById('acknowledgementEmployeeSelect');
  if (employeeSelect) {
    // Clear existing options
    employeeSelect.innerHTML = '';
    
    // Add option for selected employee
    const option = document.createElement('option');
    option.value = employeeId;
    option.textContent = `${employee.name} (${employee.band})`;
    option.selected = true;
    employeeSelect.appendChild(option);
    
    // Disable the select so it cannot be changed
    employeeSelect.disabled = true;
  }

  // Load acknowledgement data
  if (PLATFORM === 'APPSCRIPT') {
    google.script.run
      .withSuccessHandler((result) => {
        if (result.success && result.data) {
          console.log('[ManagerPortal] Acknowledgement data loaded:', result.data);
          
          // Populate summary cards
          document.getElementById('ratingValue').textContent = 
            result.data.performanceRating || 'Not rated';
          document.getElementById('feedForwardStatusValue').textContent = 
            result.data.feedForwardStatus || 'Pending';
          
          // If acknowledgement already exists, populate the form
          if (result.data.acknowledgementComment) {
            document.getElementById('acknowledgementComment').value = result.data.acknowledgementComment;
          }
          if (result.data.confirmed) {
            document.getElementById('confirmAcknowledgement').checked = true;
          }
        } else {
          console.log('[ManagerPortal] No existing acknowledgement data found');
          document.getElementById('ratingValue').textContent = 'Not rated';
          document.getElementById('feedForwardStatusValue').textContent = 'Pending';
        }
        showAssessmentSection('acknowledgementSection');
      })
      .withFailureHandler((error) => {
        console.error('[ManagerPortal] Error loading acknowledgement data:', error);
        showAssessmentSection('acknowledgementSection');
      })
      .getManagerAcknowledgementData(employeeId);
  } else {
    showAssessmentSection('acknowledgementSection');
  }
}

/* --------------------------------------------------------------------------
   Initialization on Page Load
   -------------------------------------------------------------------------- */

// Initialize manager portal when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initManagerPortal);
} else {
  initManagerPortal();
}
