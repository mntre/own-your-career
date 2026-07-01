/**
 * Own Your Career — Form Validation Module
 * 
 * Validates all form inputs before submission.
 * Rule: No partial saves allowed (NFR-04).
 * 
 * @fileoverview Client-side form validation
 */

'use strict';

/**
 * Validates the Skills Assessment form (Step 1).
 * @param {Object} formData - Skills assessment form data
 * @param {Array} formData.skills - Array of skill ratings
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateSkillsAssessment(formData) {
  const errors = [];

  if (!formData.skills || formData.skills.length === 0) {
    errors.push('At least one skill assessment is required.');
  }

  formData.skills.forEach(function(skill, index) {
    if (skill.actualLevel == null || skill.actualLevel < 0 || skill.actualLevel > 5) {
      errors.push(`Skill ${index + 1}: Actual Level must be between 0 and 5.`);
    }
  });

  return { valid: errors.length === 0, errors: errors };
}
