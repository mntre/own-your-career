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
