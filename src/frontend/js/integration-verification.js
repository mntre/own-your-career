/**
 * Own Your Career — Integration Verification Script
 * 
 * Run this in browser console to verify all components are wired correctly.
 * Usage: Copy entire script into browser console and press Enter
 * 
 * @fileoverview Integration verification and diagnostics
 */

'use strict';

console.log('%c=== OYC Integration Verification ===', 'font-size: 16px; font-weight: bold; color: #038F8D;');

const VerificationResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  results: []
};

/**
 * Helper to log verification results
 */
function verify(name, condition, details = '') {
  const status = condition ? '✓ PASS' : '✗ FAIL';
  const style = condition ? 'color: #0a7c42;' : 'color: #d32f2f;';
  
  console.log(`%c${status}%c ${name}${details ? ' - ' + details : ''}`, `${style} font-weight: bold;`, 'color: inherit;');
  
  if (condition) {
    VerificationResults.passed++;
  } else {
    VerificationResults.failed++;
  }
  
  VerificationResults.results.push({ name, status: condition, details });
}

function warn(name, message) {
  console.log(`%c⚠ WARNING%c ${name} - ${message}`, 'color: #f9a825; font-weight: bold;', 'color: inherit;');
  VerificationResults.warnings++;
}

// ============================================================================
// 1. Platform Detection
// ============================================================================
console.log('\n%c1. Platform Detection', 'font-size: 14px; font-weight: bold; color: #038F8D;');

verify('PLATFORM variable exists', typeof PLATFORM !== 'undefined', `PLATFORM = ${PLATFORM}`);
verify('Google Apps Script available', typeof google !== 'undefined' && google.script && google.script.run, 'AppScript context detected');

// ============================================================================
// 2. Manager Portal State
// ============================================================================
console.log('\n%c2. Manager Portal State', 'font-size: 14px; font-weight: bold; color: #038F8D;');

verify('ManagerPortal object exists', typeof ManagerPortal !== 'undefined');
verify('ManagerPortal.currentManager set', ManagerPortal && ManagerPortal.currentManager, ManagerPortal?.currentManager?.name || 'Not yet initialized');
verify('ManagerPortal.teamMembers array exists', ManagerPortal && Array.isArray(ManagerPortal.teamMembers), `${ManagerPortal?.teamMembers?.length || 0} members loaded`);
verify('Change detection state initialized', ManagerPortal && 'lastSheetsCheckTime' in ManagerPortal);
verify('Polling interval configured', ManagerPortal && ManagerPortal.pollIntervalMs === 30000, '30 seconds');

// ============================================================================
// 3. Function Availability
// ============================================================================
console.log('\n%c3. Frontend Functions', 'font-size: 14px; font-weight: bold; color: #038F8D;');

verify('initManagerPortal() exists', typeof initManagerPortal === 'function');
verify('loadTeamMembersOverview() exists', typeof loadTeamMembersOverview === 'function');
verify('displayTeamOverview() exists', typeof displayTeamOverview === 'function');
verify('viewEmployeeAssessments() exists', typeof viewEmployeeAssessments === 'function');
verify('viewSyncStatus() exists', typeof viewSyncStatus === 'function');
verify('handleConflictDialog() exists', typeof handleConflictDialog === 'function');
verify('startChangeDetectionPolling() exists', typeof startChangeDetectionPolling === 'function');
verify('checkForSheetsChanges() exists', typeof checkForSheetsChanges === 'function');
verify('handleSkillsFormSubmit() exists', typeof handleSkillsFormSubmit === 'function');
verify('handleFeedForwardFormSubmit() exists', typeof handleFeedForwardFormSubmit === 'function');
verify('handleAcknowledgementFormSubmit() exists', typeof handleAcknowledgementFormSubmit === 'function');

// ============================================================================
// 4. Google Script API Methods
// ============================================================================
console.log('\n%c4. Google Script API Methods', 'font-size: 14px; font-weight: bold; color: #038F8D;');

if (PLATFORM === 'APPSCRIPT') {
  // Test if we can invoke Script methods
  const scriptMethods = [
    'getTeamMembersWithStatusData',
    'getSkillsAssessmentData',
    'getOKRUploadData',
    'getSelfAssessmentData',
    'getFeedForwardData',
    'getManagerAcknowledgementData',
    'getSyncStatusForEmployee',
    'checkForExternalChanges',
    'saveSkillsAssessment',
    'saveFeedForward',
    'resolveDataConflict'
  ];
  
  scriptMethods.forEach(method => {
    verify(`${method} callable`, google && google.script && google.script.run && typeof google.script.run[method] === 'function');
  });
} else {
  warn('Platform', 'Not running in AppScript context - Google Script methods unavailable');
}

// ============================================================================
// 5. HTML Elements
// ============================================================================
console.log('\n%c5. HTML Elements', 'font-size: 14px; font-weight: bold; color: #038F8D;');

const requiredElements = [
  { id: 'teamTableBody', name: 'Team table body' },
  { id: 'teamOverviewSection', name: 'Team overview section' },
  { id: 'skillsAssessmentSection', name: 'Skills assessment section' },
  { id: 'feedForwardSection', name: 'Feed forward section' },
  { id: 'acknowledgementSection', name: 'Acknowledgement section' },
  { id: 'skillsAssessmentForm', name: 'Skills assessment form' },
  { id: 'feedForwardForm', name: 'Feed forward form' },
  { id: 'acknowledgementForm', name: 'Acknowledgement form' }
];

requiredElements.forEach(elem => {
  const element = document.getElementById(elem.id);
  verify(`${elem.name} exists`, element !== null, element ? 'DOM ready' : 'NOT FOUND');
});

// ============================================================================
// 6. CSS Styles
// ============================================================================
console.log('\n%c6. CSS Styles', 'font-size: 14px; font-weight: bold; color: #038F8D;');

const requiredStyles = [
  'status-badge',
  'status-complete',
  'status-pending',
  'sync-status-modal',
  'sync-status-content',
  'change-notification'
];

requiredStyles.forEach(className => {
  // Check if class exists in any stylesheet
  let found = false;
  for (let sheet of document.styleSheets) {
    try {
      for (let rule of sheet.cssRules) {
        if (rule.selectorText && rule.selectorText.includes(className)) {
          found = true;
          break;
        }
      }
    } catch (e) {
      // CORS or other access issue
    }
  }
  verify(`CSS class .${className} defined`, found, 'Stylesheet loaded');
});

// ============================================================================
// 7. Data Flow Test
// ============================================================================
console.log('\n%c7. Data Flow Test', 'font-size: 14px; font-weight: bold; color: #038F8D;');

verify('Team members loaded', ManagerPortal.teamMembers.length > 0, `${ManagerPortal.teamMembers.length} members`);

if (ManagerPortal.teamMembers.length > 0) {
  const firstMember = ManagerPortal.teamMembers[0];
  verify('Team member has employeeId', 'employeeId' in firstMember);
  verify('Team member has name', 'name' in firstMember);
  verify('Team member has workflowStatus', 'workflowStatus' in firstMember);
  
  if (firstMember.workflowStatus) {
    verify('Workflow status has step tracking', 'step1Complete' in firstMember.workflowStatus);
  }
} else {
  warn('Data Flow', 'No team members loaded - cannot verify data structure');
}

// ============================================================================
// 8. Change Detection Setup
// ============================================================================
console.log('\n%c8. Change Detection Setup', 'font-size: 14px; font-weight: bold; color: #038F8D;');

verify('Change detection polling active', ManagerPortal.changeDetectionInterval !== null, ManagerPortal.changeDetectionInterval ? 'Running' : 'Not started');
verify('Last check time recorded', ManagerPortal.lastSheetsCheckTime !== null, ManagerPortal.lastSheetsCheckTime || 'Not set');

// ============================================================================
// 9. Summary
// ============================================================================
console.log('\n%c=== Verification Summary ===', 'font-size: 14px; font-weight: bold; color: #038F8D;');

const passRate = Math.round((VerificationResults.passed / (VerificationResults.passed + VerificationResults.failed)) * 100);
const summary = `
✓ Passed: ${VerificationResults.passed}
✗ Failed: ${VerificationResults.failed}
⚠ Warnings: ${VerificationResults.warnings}
Pass Rate: ${passRate}%
`;

console.log(summary);

if (VerificationResults.failed === 0) {
  console.log('%c✓ ALL CHECKS PASSED - Integration ready!', 'font-size: 14px; font-weight: bold; color: #0a7c42; background: #e8f5e9; padding: 8px; border-radius: 4px;');
} else {
  console.log(`%c✗ ${VerificationResults.failed} CHECKS FAILED - Review errors above`, 'font-size: 14px; font-weight: bold; color: #d32f2f; background: #ffebee; padding: 8px; border-radius: 4px;');
}

if (VerificationResults.warnings > 0) {
  console.log(`%c⚠ ${VerificationResults.warnings} WARNINGS - Review caution items`, 'font-size: 12px; color: #f9a825;');
}

// ============================================================================
// 10. Quick Commands for Testing
// ============================================================================
console.log('\n%c=== Quick Test Commands ===', 'font-size: 12px; font-weight: bold; color: #038F8D;');

console.log(`
Test Commands (copy and paste):
  • loadTeamMembersOverview()              // Reload team data
  • viewSyncStatus('EMP-001')              // View sync status for employee
  • checkForSheetsChanges()                // Manually check for Sheets changes
  • ManagerPortal.teamMembers              // View loaded team members
  • ManagerPortal.assessmentCache          // View cached assessments
  
Debug Commands:
  • console.log(ManagerPortal)             // Full state dump
  • VerificationResults.results            // Full verification results
`);

console.log('%cEnd of Verification', 'font-size: 12px; color: #999; font-style: italic;');
