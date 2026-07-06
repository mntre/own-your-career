/**
 * Own Your Career — Manager Portal Logic
 * 
 * Handles team member overview, assessment workflows, and synced data display.
 * Displays workflow step status for each team member.
 * 
 * @fileoverview Manager portal UI interactions and data binding
 */

'use strict';

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
    google.script.run.withSuccessHandler((result) => {
      callback(result.data || { employeeId: 'MANAGER_001', name: 'Current Manager' });
    }).getCurrentUser?.();
  } else {
    // For Converge platform, would fetch from OAuth
    callback({ employeeId: 'MANAGER_001', name: 'Current Manager' });
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

  if (PLATFORM === 'APPSCRIPT') {
    google.script.run
      .withSuccessHandler((result) => {
        if (result.success) {
          ManagerPortal.teamMembers = result.data;
          displayTeamOverview(result.data);
        } else {
          console.error('[ManagerPortal] Error loading team members:', result.message);
        }
      })
      .withFailureHandler((error) => {
        console.error('[ManagerPortal] Failed to load team members:', error);
      })
      .getTeamMembersWithStatusData(ManagerPortal.currentManager.employeeId);
  }
}

/**
 * Displays the team overview table with workflow status.
 * @param {Object[]} teamMembers - Array of team members with status
 */
function displayTeamOverview(teamMembers) {
  const tableBody = document.getElementById('teamTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = ''; // Clear existing rows

  teamMembers.forEach(member => {
    const row = createTeamTableRow(member);
    tableBody.appendChild(row);
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
  
  const status = member.workflowStatus || {};
  const step1Status = status.step1Complete ? '✓ Complete' : '○ Pending';
  const step4Status = status.step4Complete ? '✓ Complete' : '○ Pending';
  const step5Status = status.step5Complete ? '✓ Complete' : '○ Pending';

  const step1Class = status.step1Complete ? 'status-complete' : 'status-pending';
  const step4Class = status.step4Complete ? 'status-complete' : 'status-pending';
  const step5Class = status.step5Complete ? 'status-complete' : 'status-pending';

  row.innerHTML = `
    <td>${member.name || 'N/A'}</td>
    <td>${member.department || 'N/A'}</td>
    <td>${member.band || 'N/A'}</td>
    <td><span class="status-badge ${step1Class}">${step1Status}</span></td>
    <td><span class="status-badge ${step4Class}">${step4Status}</span></td>
    <td><span class="status-badge ${step5Class}">${step5Status}</span></td>
    <td>
      <button class="btn btn--small btn--secondary" onclick="viewEmployeeAssessments('${member.employeeId}')">View</button>
      <button class="btn btn--small btn--secondary" onclick="viewSyncStatus('${member.employeeId}')">Sync Status</button>
    </td>
  `;

  return row;
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
