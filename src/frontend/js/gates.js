/**
 * Own Your Career — Hard Gate Logic
 * 
 * Enforces the 7-step workflow sequencing.
 * Gates are NON-NEGOTIABLE — the system must prevent access to locked steps.
 * 
 * Gate Matrix:
 * - Step 3 requires Steps 1 AND 2 complete for the specific employee
 * - Step 4 requires Step 3 complete
 * - Step 5 requires Step 4 complete
 * - Step 6 requires Step 5 complete
 * - Step 7 requires Step 6 viewed/accessed
 * 
 * @fileoverview Hard gate enforcement module
 */

'use strict';

/**
 * @typedef {Object} WorkflowStatus
 * @property {string} employeeId
 * @property {boolean} step1Complete
 * @property {boolean} step2Complete
 * @property {boolean} step3Complete
 * @property {boolean} step4Complete
 * @property {boolean} step5Complete
 * @property {boolean} step6Unlocked
 * @property {boolean} step7Complete
 * @property {boolean} allLocked
 */

/**
 * Checks if a specific step is accessible for an employee.
 * @param {number} stepNumber - The step to check (1-7)
 * @param {WorkflowStatus} workflowStatus - Current workflow state for the employee
 * @returns {{ accessible: boolean, reason: string }} Whether the step is accessible and why/why not
 */
function isStepAccessible(stepNumber, workflowStatus) {
  // If workflow is fully locked (Step 7 complete), nothing is editable
  if (workflowStatus.allLocked) {
    return { accessible: false, reason: 'Workflow is complete. All data is locked.' };
  }

  switch (stepNumber) {
    case 1:
      // Step 1 is accessible when the form period is open
      return { accessible: true, reason: 'Form period is open.' };

    case 2:
      // Step 2 is accessible when the form period is open
      return { accessible: true, reason: 'Form period is open.' };

    case 3:
      // Step 3 requires BOTH Step 1 AND Step 2 to be complete
      if (!workflowStatus.step1Complete) {
        return { accessible: false, reason: 'Step 1 (Skills Assessment) must be completed first.' };
      }
      if (!workflowStatus.step2Complete) {
        return { accessible: false, reason: 'Step 2 (OKR Upload) must be completed first.' };
      }
      return { accessible: true, reason: 'Steps 1 and 2 are complete.' };

    case 4:
      // Step 4 requires Step 3 to be complete
      if (!workflowStatus.step3Complete) {
        return { accessible: false, reason: 'Step 3 (Self-Assessment) must be completed first.' };
      }
      return { accessible: true, reason: 'Step 3 is complete.' };

    case 5:
      // Step 5 requires Step 4 to be complete
      if (!workflowStatus.step4Complete) {
        return { accessible: false, reason: 'Step 4 (Feed Forward) must be completed first.' };
      }
      return { accessible: true, reason: 'Step 4 is complete.' };

    case 6:
      // Step 6 requires Step 5 to be complete
      if (!workflowStatus.step5Complete) {
        return { accessible: false, reason: 'Step 5 (Manager Acknowledgement) must be completed first.' };
      }
      return { accessible: true, reason: 'Step 5 is complete. Scores are now visible.' };

    case 7:
      // Step 7 requires Step 6 to have been viewed
      if (!workflowStatus.step6Unlocked) {
        return { accessible: false, reason: 'Step 6 (View Scores) must be accessed first.' };
      }
      return { accessible: true, reason: 'Step 6 has been viewed.' };

    default:
      return { accessible: false, reason: 'Invalid step number.' };
  }
}

/**
 * Applies gate lock/unlock state to the UI.
 * Adds or removes the 'gate-locked' CSS class on step containers.
 * @param {number} stepNumber - The step to update
 * @param {boolean} isLocked - Whether the step should be locked
 */
function applyGateUI(stepNumber, isLocked) {
  const stepContainer = document.querySelector(`[data-step="${stepNumber}"]`);
  if (!stepContainer) return;

  if (isLocked) {
    stepContainer.classList.add('gate-locked');
    stepContainer.setAttribute('aria-disabled', 'true');
  } else {
    stepContainer.classList.remove('gate-locked');
    stepContainer.removeAttribute('aria-disabled');
  }
}

/**
 * Evaluates and applies all gate states for a given employee's workflow.
 * @param {WorkflowStatus} workflowStatus - Current workflow state
 * @param {number[]} stepsOnPage - Array of step numbers present on the current portal page
 */
function enforceAllGates(workflowStatus, stepsOnPage) {
  stepsOnPage.forEach(function(stepNumber) {
    const result = isStepAccessible(stepNumber, workflowStatus);
    applyGateUI(stepNumber, !result.accessible);
  });
}
