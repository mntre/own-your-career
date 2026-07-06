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

<<<<<<< HEAD

/**
 * Parses a CSV file and extracts OKR hierarchy and key results data.
 * Handles multi-line fields (text with line breaks within quoted cells).
 * 
 * Expected CSV structure (with headers):
 * Corporate,Group,Department,Team,Objective,Key result,Objective Weight
 * 
 * @param {File} file - The CSV file to parse
 * @returns {Promise<Object>} Parsed OKR structure with hierarchy and key results
 */
function parseCSVFile(file) {
  return new Promise(function(resolve, reject) {
    const reader = new FileReader();

    reader.onload = function(event) {
      try {
        const csv = event.target.result;
        
        // Parse CSV using proper CSV parsing (handles quoted fields with line breaks)
        const lines = parseCSVContent(csv);

        if (lines.length < 2) {
          throw new Error('CSV file must contain at least one data row.');
        }

        // Parse header row
        const headers = lines[0].map(function(h) {
          return h.trim();
        });

        const expectedHeaders = [
          'Corporate',
          'Group',
          'Department',
          'Team',
          'Objective',
          'Key result',
          'Objective Weight'
        ];

        // Validate headers
        if (headers.length !== expectedHeaders.length) {
          throw new Error(`CSV must have exactly ${expectedHeaders.length} columns. Found: ${headers.length}`);
        }

        for (let i = 0; i < headers.length; i++) {
          if (headers[i] !== expectedHeaders[i]) {
            throw new Error(`Column ${i + 1}: Expected "${expectedHeaders[i]}", got "${headers[i]}".`);
          }
        }

        // Parse data rows and build structure
        const hierarchy = {
          corporates: [],
          groups: [],
          departments: [],
          teams: [],
          keyResults: [] // All key results
        };

        const departmentKeyResultsMap = {}; // Map departments to their key results

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].map(function(val) {
            return val.trim();
          });

          if (row.length !== expectedHeaders.length) {
            throw new Error(`Row ${i + 1}: Expected ${expectedHeaders.length} columns, found ${row.length}.`);
          }

          const corporate = row[0];
          const group = row[1];
          const department = row[2];
          const team = row[3];
          const objective = row[4];
          const keyResult = row[5];
          const weight = parseFloat(row[6]);

          // Validate weight is numeric
          if (isNaN(weight)) {
            throw new Error(`Row ${i + 1}: Objective Weight "${row[6]}" is not a valid number.`);
          }

          // Add unique values to hierarchy
          if (hierarchy.corporates.indexOf(corporate) === -1) {
            hierarchy.corporates.push(corporate);
          }
          if (hierarchy.groups.indexOf(group) === -1) {
            hierarchy.groups.push(group);
          }
          if (hierarchy.departments.indexOf(department) === -1) {
            hierarchy.departments.push(department);
          }
          if (hierarchy.teams.indexOf(team) === -1) {
            hierarchy.teams.push(team);
          }

          // Add key result
          const keyResultObj = {
            corporate: corporate,
            group: group,
            department: department,
            team: team,
            objective: objective,
            keyResult: keyResult,
            weight: weight,
            actualResult: '' // Placeholder for user input
          };

          hierarchy.keyResults.push(keyResultObj);

          // Map key results by department
          const deptKey = department;
          if (!departmentKeyResultsMap[deptKey]) {
            departmentKeyResultsMap[deptKey] = [];
          }
          departmentKeyResultsMap[deptKey].push(keyResultObj);
        }

        // Attach department-keyed map to hierarchy
        hierarchy.departmentKeyResultsMap = departmentKeyResultsMap;

        resolve(hierarchy);
      } catch (error) {
        reject(new Error('CSV parsing failed: ' + error.message));
      }
    };

    reader.onerror = function() {
      reject(new Error('Failed to read CSV file.'));
    };

    reader.readAsText(file);
  });
}

/**
 * Parses CSV content properly, handling quoted fields and line breaks.
 * Implements RFC 4180 CSV standard.
 * 
 * @param {string} csvText - Raw CSV text
 * @returns {Array<Array<string>>} Array of rows, each row is array of fields
 */
function parseCSVContent(csvText) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote: ""
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // Field separator
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      // Row separator
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        if (currentRow.some(function(field) { return field.trim(); })) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      }
      // Skip \r\n combination
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
    } else {
      // Regular character
      currentField += char;
    }
  }

  // Add last field and row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(function(field) { return field.trim(); })) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Validates OKR form data — all key result inputs must have actual results.
 * 
 * Rule: All fields must be filled (no partial saves per NFR-04).
 * 
 * @param {Array<Object>} keyResults - Array of key result objects with actualResult field
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateOKRForm(keyResults) {
  const errors = [];

  if (!keyResults || keyResults.length === 0) {
    errors.push('At least one key result is required.');
    return { valid: false, errors: errors };
  }

  keyResults.forEach(function(kr, index) {
    const actualResult = kr.actualResult;

    if (actualResult == null || actualResult === '') {
      errors.push(`Row ${index + 1} (${kr.keyResult}): Actual Result is required.`);
    } else {
      const numValue = parseFloat(actualResult);
      if (isNaN(numValue)) {
        errors.push(`Row ${index + 1} (${kr.keyResult}): Actual Result must be a valid number.`);
      } else if (numValue < 0) {
        errors.push(`Row ${index + 1} (${kr.keyResult}): Actual Result cannot be negative.`);
      }
    }
  });

  return { valid: errors.length === 0, errors: errors };
}
=======
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
>>>>>>> 3f1f1848bda26db4958c1968348c61a96ba1c9c1
