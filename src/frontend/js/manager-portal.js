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
    // Load placeholder data for testing
    loadPlaceholderTeamData();
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
    // For Converge platform, would fetch from OAuth
    callback({ employeeId: '1', name: 'Current Manager' });
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
    
    // Save Draft button
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleSaveDraft();
      });
    }
  }
  
  if (feedForwardForm) {
    feedForwardForm.addEventListener('submit', (e) => handleFeedForwardFormSubmit(e));
    
    // Save Draft button for Feed Forward
    const saveFeedForwardDraftBtn = document.getElementById('saveFeedForwardDraftBtn');
    if (saveFeedForwardDraftBtn) {
      saveFeedForwardDraftBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleSaveFeedForwardDraft();
      });
    }
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

  // Check for placeholder data in localStorage (for testing)
  const placeholderTeam = localStorage.getItem('placeholderTeam');
  const placeholderWorkflow = localStorage.getItem('placeholderWorkflow');
  
  if (placeholderTeam && placeholderWorkflow) {
    console.log('[ManagerPortal] Using placeholder data from localStorage for testing');
    const team = JSON.parse(placeholderTeam);
    const workflow = JSON.parse(placeholderWorkflow);
    
    // Merge workflow status into team data
    const teamWithStatus = team.map(member => ({
      ...member,
      ...workflow[member.employeeId]
    }));
    
    ManagerPortal.teamMembers = teamWithStatus;
    displayTeamOverview(teamWithStatus);
    return;
  }

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
      <td colspan="7" style="text-align: center; padding: 2rem; color: #999;">
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
    step4Complete: member.step4Complete || false,
    step5Complete: member.step5Complete || false
  };

  // Determine RAG status for each step (Complete / Pending / Locked)
  const step1RAG = getStepRAGStatus(status, 'step1');
  const step4RAG = getStepRAGStatus(status, 'step4');
  const step5RAG = getStepRAGStatus(status, 'step5');

  // Determine which step is pending/complete and what action button to show
  const actionButton = getActionButton(member.employeeId, status);

  row.innerHTML = `
    <td>${member.name || 'N/A'}</td>
    <td>${member.department || 'N/A'}</td>
    <td>${member.band || 'N/A'}</td>
    <td>${createRAGIndicator(step1RAG, member.employeeId)}</td>
    <td>${createRAGIndicator(step4RAG, member.employeeId)}</td>
    <td>${createRAGIndicator(step5RAG, member.employeeId)}</td>
    <td>${actionButton}</td>
  `;

  return row;
}

/**
 * Determines which action button to show based on workflow status.
 * @param {string} employeeId - Employee ID
 * @param {Object} status - Workflow status object
 * @returns {string} HTML string for the action button
 */
function getActionButton(employeeId, status) {
  // Determine pending step priority: Step 1 → Step 4 → Step 5
  if (!status.step1Complete) {
    return `<button class="btn btn--action btn--primary" onclick="startSkillsAssessment('${employeeId}')">Assess Skills</button>`;
  }
  if (!status.step4Complete) {
    return `<button class="btn btn--action btn--primary" onclick="startFeedForward('${employeeId}')">Feed Forward</button>`;
  }
  if (!status.step5Complete) {
    return `<button class="btn btn--action btn--primary" onclick="startAcknowledgement('${employeeId}')">Acknowledge</button>`;
  }
  // All complete - show view button
  return `<button class="btn btn--action" onclick="viewEmployeeRecord('${employeeId}')">View Record</button>`;
}

/**
 * Starts Skills Assessment form for an employee.
 * @param {string} employeeId - Employee ID
 */
function startSkillsAssessment(employeeId) {
  console.log(`[ManagerPortal] Starting Skills Assessment for employee: ${employeeId}`);
  ManagerPortal.selectedEmployee = employeeId;
  
  // Load employee data and display skills form
  loadEmployeeSkillsData(employeeId);
  showAssessmentSection('skillsAssessmentSection');
}

/**
 * Starts Feed Forward form for an employee.
 * @param {string} employeeId - Employee ID
 */
function startFeedForward(employeeId) {
  console.log(`[ManagerPortal] Starting Feed Forward for employee: ${employeeId}`);
  ManagerPortal.selectedEmployee = employeeId;
  
  // Load employee data and display feed forward form
  loadEmployeeFeedForwardData(employeeId);
  showAssessmentSection('feedForwardSection');
}

/**
 * Starts Acknowledgement form for an employee.
 * @param {string} employeeId - Employee ID
 */
function startAcknowledgement(employeeId) {
  console.log(`[ManagerPortal] Starting Acknowledgement for employee: ${employeeId}`);
  ManagerPortal.selectedEmployee = employeeId;
  
  // Load employee data and display acknowledgement form
  loadEmployeeAcknowledgementData(employeeId);
  showAssessmentSection('acknowledgementSection');
}

/**
 * Views the complete employee record.
 * @param {string} employeeId - Employee ID
 */
function viewEmployeeRecord(employeeId) {
  console.log(`[ManagerPortal] Viewing employee record: ${employeeId}`);
  
  // Could open a summary view or external employee file
  alert(`View employee record for: ${employeeId}\nThis would open the employee file/summary view.`);
}

/**
 * Loads skills assessment data for an employee.
 * @param {string} employeeId - Employee ID
 */
function loadEmployeeSkillsData(employeeId) {
  const employee = ManagerPortal.teamMembers.find(m => m.employeeId === employeeId);
  if (!employee) return;

  // Populate employee info
  const nameInput = document.getElementById('assessmentEmployeeName');
  const bandInput = document.getElementById('assessmentEmployeeBand');

  if (nameInput) nameInput.value = employee.name || '—';
  if (bandInput) bandInput.value = employee.band || '—';

  // Load skills data from backend or localStorage
  if (PLATFORM === 'APPSCRIPT') {
    google.script.run
      .withSuccessHandler((result) => {
        if (result.success && result.data) {
          populateSkillsTable(result.data, employee);
        }
      })
      .withFailureHandler((error) => {
        console.error('[ManagerPortal] Error loading skills data:', error);
        // Load from placeholder data for testing
        loadPlaceholderSkillsData(employeeId, employee);
      })
      .getSkillsAssessmentData(employeeId);
  } else {
    // For testing/demo
    loadPlaceholderSkillsData(employeeId, employee);
  }
}

/**
 * Loads placeholder skills data for testing.
 * @param {string} employeeId - Employee ID
 * @param {Object} employee - Employee object
 */
function loadPlaceholderSkillsData(employeeId, employee) {
  const placeholderSkills = JSON.parse(localStorage.getItem('placeholderSkillsAssessment') || '{}');
  const skillsData = placeholderSkills[employeeId] || {
    coreSkills: {},
    leadershipSkills: {}
  };
  
  // Generate default structure if not present
  const fullSkillsData = {
    coreSkills: skillsData.coreSkills || generateDefaultCoreSkills(),
    leadershipSkills: skillsData.leadershipSkills || generateDefaultLeadershipSkills(employee)
  };
  
  populateSkillsTable(fullSkillsData, employee);
}

/**
 * Generates default core skills structure for initialization.
 * @returns {Object} Core skills mapping
 */
function generateDefaultCoreSkills() {
  const skills = {};
  CORE_SKILLS.forEach(skill => {
    skills[skill.id] = { level: '', remarks: '' };
  });
  return skills;
}

/**
 * Generates default leadership skills structure (only for managers).
 * @param {Object} employee - Employee object
 * @returns {Object} Leadership skills mapping
 */
function generateDefaultLeadershipSkills(employee) {
  // Only managers/leads should have leadership skills
  const isLeader = ['GROUP_HEAD', 'DEPT_HEAD', 'TEAM_HEAD'].includes(employee.roleLevel);
  if (!isLeader) return {};
  
  const skills = {};
  LEADERSHIP_SKILLS.forEach(skill => {
    skills[skill.id] = { level: '', remarks: '' };
  });
  return skills;
}

/**
 * Populates the skills assessment table with data.
 * @param {Object} skillsData - Skills assessment data { coreSkills, leadershipSkills }
 * @param {Object} employee - Employee object
 */
function populateSkillsTable(skillsData, employee) {
  console.log('[ManagerPortal] Populating skills table for:', employee.name);
  
  const coreSkillsBody = document.getElementById('coreSkillsTableBody');
  const leadershipSkillsBody = document.getElementById('leadershipSkillsTableBody');

  // Populate Core Skills table
  if (coreSkillsBody) {
    coreSkillsBody.innerHTML = CORE_SKILLS.map(skill => {
      const skillData = skillsData.coreSkills[skill.id] || {};
      const actualLevel = skillData.level || '';
      const remarks = skillData.remarks || '';
      
      // Calculate RAG status: GO if actualLevel >= required level (assume required is 3)
      const requiredLevel = 3;
      let ragStatus = '—';
      let ragClass = 'rag-empty';
      
      if (actualLevel !== '') {
        const numeric = parseInt(actualLevel);
        if (numeric >= requiredLevel) {
          ragStatus = '✓ GO';
          ragClass = 'rag-go';
        } else {
          ragStatus = '✗ FAIL';
          ragClass = 'rag-fail';
        }
      }
      
      return `
        <tr data-skill-id="${skill.id}" data-skill-type="core">
          <td>${skill.name}</td>
          <td style="text-align: center; font-weight: 500;">3</td>
          <td style="text-align: center;">
            <select class="skill-level-input" data-field="level" data-skill-id="${skill.id}">
              <option value="">—</option>
              <option value="0" ${actualLevel === '0' || actualLevel === 0 ? 'selected' : ''}>0 - Not Demonstrated</option>
              <option value="1" ${actualLevel === '1' || actualLevel === 1 ? 'selected' : ''}>1 - Foundational</option>
              <option value="2" ${actualLevel === '2' || actualLevel === 2 ? 'selected' : ''}>2 - Developing</option>
              <option value="3" ${actualLevel === '3' || actualLevel === 3 ? 'selected' : ''}>3 - Proficient</option>
              <option value="4" ${actualLevel === '4' || actualLevel === 4 ? 'selected' : ''}>4 - Advanced</option>
              <option value="5" ${actualLevel === '5' || actualLevel === 5 ? 'selected' : ''}>5 - Expert</option>
            </select>
          </td>
          <td style="text-align: center;">
            <span class="rag-status ${ragClass}">${ragStatus}</span>
          </td>
          <td>
            <input 
              type="text" 
              class="skill-remarks-input" 
              data-field="remarks" 
              data-skill-id="${skill.id}"
              placeholder="Optional remarks"
              value="${remarks}"
            />
          </td>
        </tr>
      `;
    }).join('');

    // Add change listeners for RAG calculation
    coreSkillsBody.querySelectorAll('select.skill-level-input').forEach(select => {
      select.addEventListener('change', (e) => updateRAGStatus(e, coreSkillsBody, 3));
    });
  }

  // Populate Leadership Skills table (only if employee is a leader)
  const isLeader = ['GROUP_HEAD', 'DEPT_HEAD', 'TEAM_HEAD'].includes(employee.roleLevel);
  
  if (leadershipSkillsBody) {
    if (isLeader && skillsData.leadershipSkills && Object.keys(skillsData.leadershipSkills).length > 0) {
      leadershipSkillsBody.innerHTML = LEADERSHIP_SKILLS.map(skill => {
        const skillData = skillsData.leadershipSkills[skill.id] || {};
        const actualLevel = skillData.level || '';
        const remarks = skillData.remarks || '';
        
        // For leadership skills, assume expected level is 3
        const expectedLevel = 3;
        
        return `
          <tr data-skill-id="${skill.id}" data-skill-type="leadership">
            <td>${skill.name}</td>
            <td style="text-align: center; font-weight: 500;">3</td>
            <td style="text-align: center;">
              <select class="skill-level-input" data-field="level" data-skill-id="${skill.id}">
                <option value="">—</option>
                <option value="0" ${actualLevel === '0' || actualLevel === 0 ? 'selected' : ''}>0 - Not Demonstrated</option>
                <option value="1" ${actualLevel === '1' || actualLevel === 1 ? 'selected' : ''}>1 - Foundational</option>
                <option value="2" ${actualLevel === '2' || actualLevel === 2 ? 'selected' : ''}>2 - Developing</option>
                <option value="3" ${actualLevel === '3' || actualLevel === 3 ? 'selected' : ''}>3 - Proficient</option>
                <option value="4" ${actualLevel === '4' || actualLevel === 4 ? 'selected' : ''}>4 - Advanced</option>
                <option value="5" ${actualLevel === '5' || actualLevel === 5 ? 'selected' : ''}>5 - Expert</option>
              </select>
            </td>
            <td>
              <input 
                type="text" 
                class="skill-remarks-input" 
                data-field="remarks" 
                data-skill-id="${skill.id}"
                placeholder="Optional remarks"
                value="${remarks}"
              />
            </td>
          </tr>
        `;
      }).join('');
    } else {
      // Not a leader or no leadership skills needed
      leadershipSkillsBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 2rem; color: #999;">
            Leadership skills assessment not applicable to this role level.
          </td>
        </tr>
      `;
    }
  }
}

/**
 * Updates RAG status when skill level changes.
 * @param {Event} e - Change event
 * @param {HTMLElement} tableBody - Table body element
 * @param {number} requiredLevel - Required level for GO status
 */
function updateRAGStatus(e, tableBody, requiredLevel) {
  const select = e.target;
  const row = select.closest('tr');
  const ragCell = row.querySelector('[class*="rag-status"]');
  
  if (!ragCell) return;
  
  const actualLevel = parseInt(select.value);
  let ragStatus = '—';
  let ragClass = 'rag-empty';
  
  if (!isNaN(actualLevel)) {
    if (actualLevel >= requiredLevel) {
      ragStatus = '✓ GO';
      ragClass = 'rag-go';
    } else {
      ragStatus = '✗ FAIL';
      ragClass = 'rag-fail';
    }
  }
  
  // Update RAG indicator
  ragCell.className = `rag-status ${ragClass}`;
  ragCell.textContent = ragStatus;
}

/**
 * Shows or hides assessment sections and updates main content.
 * @param {string} sectionId - Section element ID to show
 */
function showAssessmentSection(sectionId) {
  // Hide team overview
  const teamSection = document.getElementById('teamOverviewSection');
  const skillsSection = document.getElementById('skillsAssessmentSection');
  const feedForwardSection = document.getElementById('feedForwardSection');
  const acknowledgementSection = document.getElementById('acknowledgementSection');

  if (teamSection) teamSection.style.display = 'none';
  if (skillsSection) skillsSection.style.display = 'none';
  if (feedForwardSection) feedForwardSection.style.display = 'none';
  if (acknowledgementSection) acknowledgementSection.style.display = 'none';

  // Show target section
  const targetSection = document.getElementById(sectionId);
  if (targetSection) targetSection.style.display = 'block';
  
  // Scroll to top
  window.scrollTo(0, 0);
}

/**
 * Shows the team overview section.
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
  
  window.scrollTo(0, 0);
}

/**
 * Loads feed forward data for an employee.
 * @param {string} employeeId - Employee ID
 */
function loadEmployeeFeedForwardData(employeeId) {
  const employee = ManagerPortal.teamMembers.find(m => m.employeeId === employeeId);
  if (!employee) return;

  console.log('[ManagerPortal] Loading feed forward data for:', employee.name);

  // Populate employee info
  const nameInput = document.getElementById('feedForwardEmployeeName');
  const bandInput = document.getElementById('feedForwardEmployeeBand');

  if (nameInput) nameInput.value = employee.name || '—';
  if (bandInput) bandInput.value = employee.band || '—';

  // Load feed forward summary data from backend or placeholder
  if (PLATFORM === 'APPSCRIPT') {
    google.script.run
      .withSuccessHandler((result) => {
        if (result.success && result.data) {
          populateFeedForwardSummary(result.data);
        }
      })
      .withFailureHandler((error) => {
        console.error('[ManagerPortal] Error loading feed forward data:', error);
        // Load from placeholder data for testing
        loadPlaceholderFeedForwardData(employeeId);
      })
      .getFeedForwardData(employeeId);
  } else {
    // For testing/demo
    loadPlaceholderFeedForwardData(employeeId);
  }
}

/**
 * Loads placeholder feed forward data for testing.
 * @param {string} employeeId - Employee ID
 */
function loadPlaceholderFeedForwardData(employeeId) {
  const placeholderOKRs = JSON.parse(localStorage.getItem('placeholderOKRs') || '{}');
  const placeholderSkillsAssessment = JSON.parse(localStorage.getItem('placeholderSkillsAssessment') || '{}');
  const placeholderSelfAssessment = JSON.parse(localStorage.getItem('placeholderSelfAssessment') || '{}');

  const okrScore = placeholderOKRs[employeeId]?.finalScore || '—';
  const skillsStatus = placeholderSkillsAssessment[employeeId] ? 'Completed' : 'Pending';
  const selfAssessStatus = placeholderSelfAssessment[employeeId] ? 'Completed' : 'Pending';

  const summaryData = {
    okrScore: okrScore,
    skillsStatus: skillsStatus,
    selfAssessmentStatus: selfAssessStatus
  };

  populateFeedForwardSummary(summaryData);
}

/**
 * Populates the feed forward summary cards with employee data.
 * @param {Object} data - Summary data { okrScore, skillsStatus, selfAssessmentStatus }
 */
function populateFeedForwardSummary(data) {
  const okrValue = document.getElementById('feedForwardOKRValue');
  const skillsValue = document.getElementById('feedForwardSkillsValue');
  const selfAssessValue = document.getElementById('feedForwardSelfAssessmentValue');

  if (okrValue) {
    if (typeof data.okrScore === 'number') {
      okrValue.textContent = data.okrScore.toFixed(1) + '%';
    } else {
      okrValue.textContent = data.okrScore || '—';
    }
  }
  
  if (skillsValue) skillsValue.textContent = data.skillsStatus || '—';
  if (selfAssessValue) selfAssessValue.textContent = data.selfAssessmentStatus || '—';
}

/**
 * Handles "Save Draft" button click for feed forward.
 * Saves feed forward data locally or to backend as draft (not submitted).
 */
function handleSaveFeedForwardDraft() {
  console.log('[ManagerPortal] Saving feed forward draft...');
  
  const feedForwardForm = document.getElementById('feedForwardForm');
  if (!feedForwardForm) return;
  
  // Collect form data
  const formData = new FormData(feedForwardForm);
  const feedForwardData = {
    q1: document.getElementById('feedForwardQuestion1').value || '',
    q2: document.getElementById('feedForwardQuestion2').value || '',
    rating: document.getElementById('performanceRating').value || '',
    dateUpdated: new Date().toISOString()
  };

  if (PLATFORM === 'APPSCRIPT') {
    google.script.run
      .withSuccessHandler((result) => {
        if (result.success) {
          alert('Feed Forward draft saved successfully! You can continue editing or submit when ready.');
          console.log('[ManagerPortal] Feed Forward draft saved');
        } else {
          alert('Error saving feed forward draft: ' + result.message);
        }
      })
      .withFailureHandler((error) => {
        console.error('[ManagerPortal] Error saving feed forward draft:', error);
        alert('Error saving feed forward draft');
      })
      .saveDraftFeedForward(ManagerPortal.selectedEmployee, feedForwardData);
  } else {
    // For demo, just alert
    alert('Feed Forward draft saved locally (demo mode)');
  }
}

/**
 * Loads acknowledgement data for an employee.
 * @param {string} employeeId - Employee ID
 */
function loadEmployeeAcknowledgementData(employeeId) {
  const employee = ManagerPortal.teamMembers.find(m => m.employeeId === employeeId);
  if (!employee) return;

  console.log(`[ManagerPortal] Loading acknowledgement data for: ${employeeId} (${employee.name})`);

  // Populate employee name in the form
  const employeeNameValue = document.getElementById('acknowledgementEmployeeNameValue');
  const confirmEmployeeName = document.getElementById('confirmEmployeeName');
  
  if (employeeNameValue) employeeNameValue.textContent = employee.name || '—';
  if (confirmEmployeeName) confirmEmployeeName.textContent = employee.name || 'the employee';

  // Reset form fields
  const form = document.getElementById('acknowledgementForm');
  if (form) {
    form.reset();
  }

  // Load acknowledgement data from backend
  if (PLATFORM === 'APPSCRIPT') {
    google.script.run
      .withSuccessHandler((result) => {
        if (result.success && result.data) {
          console.log('[ManagerPortal] Acknowledgement data loaded:', result.data);
          populateAcknowledgementForm(result.data);
        }
      })
      .withFailureHandler((error) => {
        console.error('[ManagerPortal] Error loading acknowledgement data:', error);
        // Load placeholder data for testing
        populateAcknowledgementForm({
          feedForwardComplete: true,
          skillsComplete: true,
          selfAssessmentComplete: true
        });
      })
      .getManagerAcknowledgementData(employeeId);
  } else {
    // For testing/demo
    populateAcknowledgementForm({
      feedForwardComplete: true,
      skillsComplete: true,
      selfAssessmentComplete: true
    });
  }
}

/**
 * Populates the acknowledgement form with review summary data.
 * @param {Object} ackData - Acknowledgement data
 */
function populateAcknowledgementForm(ackData) {
  console.log('[ManagerPortal] Populating acknowledgement form:', ackData);
  
  // The form is now simpler - just shows the employee name (already populated)
  // and the confirmation checkbox
}


/**
 * Determines the RAG status for a step (Completed / Pending / Locked).
 * @param {Object} status - Workflow status object
 * @param {string} stepKey - Step key (e.g., 'step1', 'step4', 'step5')
 * @returns {string} RAG status: 'completed', 'pending', or 'locked'
 */
function getStepRAGStatus(status, stepKey) {
  if (stepKey === 'step1') {
    return status.step1Complete ? 'completed' : 'pending';
  }
  if (stepKey === 'step4') {
    // Step 4 is locked until Step 1 is complete
    return status.step1Complete ? 
      (status.step4Complete ? 'completed' : 'pending') : 
      'locked';
  }
  if (stepKey === 'step5') {
    // Step 5 is locked until Step 1 AND Step 4 are complete
    const step1And4Complete = status.step1Complete && status.step4Complete;
    return step1And4Complete ? 
      (status.step5Complete ? 'completed' : 'pending') : 
      'locked';
  }
  return 'pending';
}

/**
 * Creates a RAG status indicator badge.
 * @param {string} ragStatus - Status: 'completed', 'pending', or 'locked'
 * @param {string} employeeId - Employee ID (for linking)
 * @returns {string} HTML string for the badge
 */
function createRAGIndicator(ragStatus, employeeId) {
  if (ragStatus === 'completed') {
    return `<button class="rag-indicator rag-go rag-button" onclick="viewEmployeeRecord('${employeeId}')">✓ Complete</button>`;
  }
  if (ragStatus === 'locked') {
    return `<span class="rag-indicator rag-locked">🔒 Locked</span>`;
  }
  return `<span class="rag-indicator rag-fail">— Pending</span>`;
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
 * Handles "Save Draft" button click for skills assessment.
 * Saves assessment data locally or to backend as draft (not submitted).
 */
function handleSaveDraft() {
  console.log('[ManagerPortal] Saving draft...');
  
  const skillsForm = document.getElementById('skillsAssessmentForm');
  if (!skillsForm) return;
  
  // Collect form data
  const skillsData = {
    coreSkills: {},
    leadershipSkills: {}
  };
  
  // Collect core skills
  const coreRows = document.querySelectorAll('#coreSkillsTableBody tr[data-skill-type="core"]');
  coreRows.forEach(row => {
    const skillId = row.dataset.skillId;
    const levelInput = row.querySelector('select[data-field="level"]');
    const remarksInput = row.querySelector('input[data-field="remarks"]');
    
    if (levelInput && remarksInput) {
      skillsData.coreSkills[skillId] = {
        level: levelInput.value || '',
        remarks: remarksInput.value || ''
      };
    }
  });
  
  // Collect leadership skills
  const leaderRows = document.querySelectorAll('#leadershipSkillsTableBody tr[data-skill-type="leadership"]');
  leaderRows.forEach(row => {
    const skillId = row.dataset.skillId;
    const levelInput = row.querySelector('select[data-field="level"]');
    const remarksInput = row.querySelector('input[data-field="remarks"]');
    
    if (levelInput && remarksInput) {
      skillsData.leadershipSkills[skillId] = {
        level: levelInput.value || '',
        remarks: remarksInput.value || ''
      };
    }
  });
  
  if (PLATFORM === 'APPSCRIPT') {
    google.script.run
      .withSuccessHandler((result) => {
        if (result.success) {
          alert('Draft saved successfully! You can continue editing or submit when ready.');
          console.log('[ManagerPortal] Draft saved');
        } else {
          alert('Error saving draft: ' + result.message);
        }
      })
      .withFailureHandler((error) => {
        console.error('[ManagerPortal] Error saving draft:', error);
        alert('Error saving draft');
      })
      .saveDraftSkillsAssessment(ManagerPortal.selectedEmployee, skillsData);
  } else {
    // For demo, just alert
    alert('Draft saved locally (demo mode)');
  }
}

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
  
  // Collect form data
  const q1 = document.getElementById('feedForwardQuestion1').value.trim();
  const q2 = document.getElementById('feedForwardQuestion2').value.trim();
  const rating = document.getElementById('performanceRating').value;

  // Validate all fields are filled
  if (!q1 || !q2 || !rating) {
    alert('Please fill in all fields before submitting.');
    return;
  }

  const feedForwardData = {
    q1: q1,
    q2: q2,
    rating: rating,
    dateSubmitted: new Date().toISOString()
  };

  if (PLATFORM === 'APPSCRIPT') {
    google.script.run
      .withSuccessHandler((result) => {
        if (result.success) {
          alert('Feed Forward saved successfully!');
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
  
  // Collect form data
  const confirmCheckbox = document.getElementById('confirmAcknowledgement');
  const commentField = document.getElementById('acknowledgementComment');
  
  if (!confirmCheckbox.checked) {
    alert('Please check the confirmation box before submitting.');
    return;
  }

  const ackData = {
    confirmed: confirmCheckbox.checked,
    comment: commentField ? commentField.value.trim() : '',
    dateSubmitted: new Date().toISOString()
  };

  console.log('[ManagerPortal] Acknowledgement data to submit:', ackData);

  if (PLATFORM === 'APPSCRIPT') {
    google.script.run
      .withSuccessHandler((result) => {
        if (result.success) {
          console.log('[ManagerPortal] Acknowledgement saved successfully');
          alert('Acknowledgement submitted successfully! The review is now complete.');
          showTeamOverview();
          loadTeamMembersOverview();
        } else if (result.conflict) {
          // Handle conflict
          handleConflictDialog(result.conflict, 'acknowledgement', ackData, ManagerPortal.selectedEmployee);
        } else {
          console.error('[ManagerPortal] Error saving acknowledgement:', result.message);
          alert('Error saving acknowledgement: ' + result.message);
        }
      })
      .withFailureHandler((error) => {
        console.error('[ManagerPortal] Error saving acknowledgement:', error);
        alert('Error saving acknowledgement: ' + error.toString());
      })
      .saveManagerAcknowledgement(ManagerPortal.selectedEmployee, ManagerPortal.currentManager.employeeId, ackData);
  } else {
    // For demo/local testing
    console.log('[ManagerPortal] (Demo mode) Acknowledgement would be saved:', ackData);
    alert('Acknowledgement submitted successfully! (Demo mode)');
    showTeamOverview();
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
      step3Complete: false,
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
      leadershipSkills: {},
      completedBy: 'MANAGER_001',
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    EMP_003: {
      coreSkills: {
        'cs-001': { level: 5, remarks: 'Expert technical knowledge' },
        'cs-002': { level: 4, remarks: 'Very efficient' },
        'cs-003': { level: 5, remarks: 'Quality champion' },
        'cs-004': { level: 4, remarks: 'Excellent customer focus' },
        'cs-005': { level: 4, remarks: 'Strong team player' }
      },
      leadershipSkills: {
        'ls-001': { level: 5, remarks: 'Excellent strategic thinking' },
        'ls-002': { level: 4, remarks: 'Good team development' },
        'ls-003': { level: 5, remarks: 'Excellent decision making' },
        'ls-004': { level: 5, remarks: 'Outstanding communication' },
        'ls-005': { level: 4, remarks: 'Leads change effectively' }
      },
      completedBy: 'MANAGER_001',
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    EMP_004: {
      coreSkills: {
        'cs-001': { level: 2, remarks: 'Need development in technical area' },
        'cs-002': { level: 2, remarks: 'Works on efficiency' },
        'cs-003': { level: 2, remarks: 'Quality needs improvement' },
        'cs-004': { level: 3, remarks: 'Understands customers' },
        'cs-005': { level: 2, remarks: 'Developing collaboration skills' }
      },
      leadershipSkills: {},
      completedBy: 'MANAGER_001',
      completedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // 3 hours ago
    },
    EMP_005: {
      coreSkills: {
        'cs-001': { level: 4, remarks: 'Very capable' },
        'cs-002': { level: 4, remarks: 'Efficient worker' },
        'cs-003': { level: 4, remarks: 'Quality focus' },
        'cs-004': { level: 4, remarks: 'Customer oriented' },
        'cs-005': { level: 4, remarks: 'Good team member' }
      },
      leadershipSkills: {},
      completedBy: 'MANAGER_001',
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
    }
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
   Initialization on Page Load
   -------------------------------------------------------------------------- */

// Initialize manager portal when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initManagerPortal);
} else {
  initManagerPortal();
}
