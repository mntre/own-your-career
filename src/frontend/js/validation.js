/**
 * Own Your Career — Form Validation Module
 * 
 * Validates all form inputs before submission.
 * Rule: No partial saves allowed (NFR-04).
 * All validators return { valid: boolean, errors: string[] }
 * 
 * @fileoverview Client-side form validation
 */

'use strict';

/* -------------------------------------------------------------------------- */
/*                        SKILLS ASSESSMENT (STEP 1)                          */
/* -------------------------------------------------------------------------- */

/**
 * Validates the Skills Assessment form (Step 1 - Manager Portal).
 * @param {Object} formData - Skills assessment form data
 * @param {Array} formData.coreSkills - Core skills ratings [{ skillId, actualLevel, remarks }]
 * @param {Array} formData.leadershipSkills - Leadership skills ratings [{ skillId, actualLevel, remarks }]
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateSkillsAssessment(formData) {
  const errors = [];

  // Validate core skills
  if (!formData.coreSkills || formData.coreSkills.length === 0) {
    errors.push('Core skills assessment is required.');
  } else {
    formData.coreSkills.forEach(function(skill) {
      if (skill.actualLevel == null || skill.actualLevel < 0 || skill.actualLevel > 5) {
        errors.push(`${skill.skillName}: Actual Level must be between 0 and 5.`);
      }
    });
  }

  // Leadership skills are optional but if provided, must be valid
  if (formData.leadershipSkills && formData.leadershipSkills.length > 0) {
    formData.leadershipSkills.forEach(function(skill) {
      if (skill.actualLevel == null || skill.actualLevel < 0 || skill.actualLevel > 5) {
        errors.push(`Leadership - ${skill.skillName}: Actual Level must be between 0 and 5.`);
      }
    });
  }

  return { valid: errors.length === 0, errors: errors };
}

/* -------------------------------------------------------------------------- */
/*                           OKR UPLOAD (STEP 2)                              */
/* -------------------------------------------------------------------------- */

/**
 * Validates the OKR Upload form (Step 2 - Data SPOC Portal).
 * @param {Object} formData - OKR upload form data
 * @param {string} formData.employeeId - Employee ID
 * @param {string} formData.corporateOKR - Corporate OKR value
 * @param {string} formData.groupOKR - Group OKR value
 * @param {string} formData.departmentOKR - Department OKR value
 * @param {string} formData.teamOKR - Team OKR value
 * @param {Array} formData.targets - Target values array
 * @param {Array} formData.weights - Weight percentages array
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateOKRUpload(formData) {
  const errors = [];

  if (!formData.employeeId) {
    errors.push('Employee ID is required.');
  }

  if (!formData.corporateOKR || formData.corporateOKR.trim() === '') {
    errors.push('Corporate OKR is required.');
  }

  if (!formData.groupOKR || formData.groupOKR.trim() === '') {
    errors.push('Group OKR is required.');
  }

  if (!formData.targets || formData.targets.length === 0) {
    errors.push('At least one target is required.');
  } else {
    formData.targets.forEach(function(target, idx) {
      if (!target.description || target.description.trim().length < 5) {
        errors.push(`Target ${idx + 1}: Description required (minimum 5 characters).`);
      }
      if (target.weight == null || target.weight < 0 || target.weight > 100) {
        errors.push(`Target ${idx + 1}: Weight must be between 0 and 100.`);
      }
    });
  }

  // Validate weights sum to ~100%
  if (formData.targets && formData.targets.length > 0) {
    const totalWeight = formData.targets.reduce((sum, t) => sum + (t.weight || 0), 0);
    if (Math.abs(totalWeight - 100) > 1) { // Allow 1% rounding tolerance
      errors.push(`Target weights must sum to 100% (currently ${totalWeight}%).`);
    }
  }

  return { valid: errors.length === 0, errors: errors };
}

/* -------------------------------------------------------------------------- */
/*                       SELF-ASSESSMENT (STEP 3)                             */
/* -------------------------------------------------------------------------- */

/**
 * Validates the Self-Assessment form (Step 3 - Employee Portal).
 * All 4 questions are mandatory with minimum length requirements.
 * 
 * @param {Object} formData - Self-assessment form data
 * @param {string} formData.q1_contribution - Question 1 response
 * @param {string} formData.q2_challenges - Question 2 response
 * @param {string} formData.q3_support - Question 3 response
 * @param {string} formData.q4_commitments - Question 4 response
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateSelfAssessment(formData) {
  const errors = [];
  const minLength = 10;
  const maxLength = 2000;

  const questions = [
    { key: 'q1_contribution', label: 'Q1: Contribution' },
    { key: 'q2_challenges', label: 'Q2: Challenges' },
    { key: 'q3_support', label: 'Q3: Support Needed' },
    { key: 'q4_commitments', label: 'Q4: Commitments' }
  ];

  questions.forEach(function(q) {
    const response = formData[q.key] ? formData[q.key].trim() : '';

    if (!response || response.length === 0) {
      errors.push(`${q.label}: Answer is required.`);
    } else if (response.length < minLength) {
      errors.push(`${q.label}: Minimum ${minLength} characters required (${response.length} provided).`);
    } else if (response.length > maxLength) {
      errors.push(`${q.label}: Maximum ${maxLength} characters allowed (${response.length} provided).`);
    }
  });

  return { valid: errors.length === 0, errors: errors };
}

/* -------------------------------------------------------------------------- */
/*                         FEED FORWARD (STEP 4)                              */
/* -------------------------------------------------------------------------- */

/**
 * Validates the Feed Forward form (Step 4 - Manager Portal).
 * @param {Object} formData - Feed forward form data
 * @param {string} formData.employeeId - Employee being assessed
 * @param {string} formData.comments - Manager's feedback comments
 * @param {string} formData.performanceRating - Overall rating (EXCEEDED, ACHIEVED, NEEDS_IMPROVEMENT, FAILED)
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateFeedForward(formData) {
  const errors = [];
  const validRatings = ['EXCEEDED', 'ACHIEVED', 'NEEDS_IMPROVEMENT', 'FAILED'];
  const minCommentLength = 20;
  const maxCommentLength = 5000;

  if (!formData.employeeId) {
    errors.push('Employee selection is required.');
  }

  if (!formData.comments || formData.comments.trim() === '') {
    errors.push('Feed Forward comments are required.');
  } else if (formData.comments.length < minCommentLength) {
    errors.push(`Comments: Minimum ${minCommentLength} characters required (${formData.comments.length} provided).`);
  } else if (formData.comments.length > maxCommentLength) {
    errors.push(`Comments: Maximum ${maxCommentLength} characters allowed.`);
  }

  if (!formData.performanceRating || !validRatings.includes(formData.performanceRating)) {
    errors.push('Performance rating is required and must be valid.');
  }

  return { valid: errors.length === 0, errors: errors };
}

/* -------------------------------------------------------------------------- */
/*                      ACKNOWLEDGEMENT (STEPS 5 & 7)                         */
/* -------------------------------------------------------------------------- */

/**
 * Validates Acknowledgement forms (Step 5 Manager, Step 7 Employee).
 * @param {Object} formData - Acknowledgement form data
 * @param {string} formData.employeeId - Employee being acknowledged
 * @param {boolean} formData.confirmed - Checkbox confirmation
 * @param {string} formData.comments - Optional comments
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateAcknowledgement(formData) {
  const errors = [];
  const maxCommentLength = 1000;

  if (!formData.employeeId) {
    errors.push('Employee ID is required.');
  }

  if (!formData.confirmed || formData.confirmed !== true) {
    errors.push('You must confirm that the review discussion took place.');
  }

  if (formData.comments && formData.comments.length > maxCommentLength) {
    errors.push(`Comments: Maximum ${maxCommentLength} characters allowed.`);
  }

  return { valid: errors.length === 0, errors: errors };
}

/* -------------------------------------------------------------------------- */
/*                          UTILITY VALIDATORS                                */
/* -------------------------------------------------------------------------- */

/**
 * Validates an email address format.
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates a number is within a range.
 * @param {number} value - Value to validate
 * @param {number} min - Minimum (inclusive)
 * @param {number} max - Maximum (inclusive)
 * @returns {boolean} True if within range
 */
function isInRange(value, min, max) {
  return !isNaN(value) && value >= min && value <= max;
}

/**
 * Validates a string is not empty after trimming.
 * @param {string} str - String to validate
 * @returns {boolean} True if not empty
 */
function isNotEmpty(str) {
  return str && str.trim().length > 0;
}

/**
 * Validates a string length.
 * @param {string} str - String to validate
 * @param {number} minLength - Minimum length (inclusive)
 * @param {number} maxLength - Maximum length (inclusive)
 * @returns {boolean} True if within length range
 */
function isValidLength(str, minLength, maxLength) {
  const len = str ? str.trim().length : 0;
  return len >= minLength && len <= maxLength;
}

/**
 * Displays validation errors on the UI.
 * @param {HTMLElement} formElement - Form container
 * @param {string[]} errors - Array of error messages
 */
function displayValidationErrors(formElement, errors) {
  // Remove existing error display
  const existingErrors = formElement.querySelector('.validation-errors');
  if (existingErrors) {
    existingErrors.remove();
  }

  if (errors.length === 0) return;

  // Create error container
  const errorContainer = document.createElement('div');
  errorContainer.className = 'validation-errors';
  errorContainer.setAttribute('role', 'alert');
  errorContainer.setAttribute('aria-live', 'polite');

  const errorList = document.createElement('ul');
  errors.forEach(function(error) {
    const li = document.createElement('li');
    li.textContent = error;
    errorList.appendChild(li);
  });

  errorContainer.appendChild(errorList);
  formElement.insertBefore(errorContainer, formElement.firstChild);

  // Scroll to errors
  errorContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Clears all validation error displays from a form.
 * @param {HTMLElement} formElement - Form container
 */
function clearValidationErrors(formElement) {
  const errorContainer = formElement.querySelector('.validation-errors');
  if (errorContainer) {
    errorContainer.remove();
  }
}
