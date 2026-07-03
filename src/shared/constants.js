/**
 * Own Your Career — Shared Constants
 * 
 * Configuration values used by both platforms.
 * Never hardcode values — reference this file instead.
 * 
 * @fileoverview Shared constants and configuration
 */

'use strict';

/* -------------------------------------------------------------------------- */
/*                              ROLE LEVELS                                   */
/* -------------------------------------------------------------------------- */

/** Role levels for OKR formula selection */
const ROLE_LEVELS = {
  GROUP_HEAD: 'GROUP_HEAD',
  DEPT_HEAD: 'DEPT_HEAD',
  TEAM_HEAD: 'TEAM_HEAD',
  INDIVIDUAL: 'INDIVIDUAL'
};

/* -------------------------------------------------------------------------- */
/*                         PERFORMANCE BRACKETS                               */
/* -------------------------------------------------------------------------- */

/**
 * Performance bracket thresholds and ratings.
 * OKR achievement score determines bracket assignment.
 * 
 * Format: { min: minimum %, max: maximum %, label: display text, code: bracket code }
 */
const PERFORMANCE_BRACKETS = [
  {
    min: 101.01,
    max: Infinity,
    label: 'Exceeded Expectations',
    code: 'EXCEEDED',
    description: 'Achievement >101% — Employee exceeded OKR targets'
  },
  {
    min: 90.1,
    max: 101.00,
    label: 'Achieved',
    code: 'ACHIEVED',
    description: 'Achievement 90.1% - 101% — Employee met OKR targets'
  },
  {
    min: 81.0,
    max: 90.0,
    label: 'Needs Improvement',
    code: 'NEEDS_IMPROVEMENT',
    description: 'Achievement 81% - 90% — Employee partially met OKR targets'
  },
  {
    min: 0,
    max: 80.99,
    label: 'Failed',
    code: 'FAILED',
    description: 'Achievement <80% — Employee did not meet OKR targets'
  }
];

/**
 * Quick lookup: Get bracket by OKR score.
 * @param {number} score - OKR achievement score (0-100+)
 * @returns {Object} Bracket object or null if not found
 */
function getBracketByScore(score) {
  return PERFORMANCE_BRACKETS.find(b => score >= b.min && score <= b.max) || null;
}

/* -------------------------------------------------------------------------- */
/*                           OKR FORMULAS & WEIGHTS                           */
/* -------------------------------------------------------------------------- */

/**
 * OKR formula weights by role level.
 * Determines how corporate, group, department, and team OKRs are blended.
 * 
 * GROUP_HEAD: 10% Corporate OKR + 90% Group OKR
 * DEPT_HEAD: 60% Group OKR + 40% Department OKR
 * TEAM_HEAD: 60% Department OKR + 40% Team OKR
 * INDIVIDUAL: 60% Department OKR + 40% Team OKR
 */
const OKR_WEIGHTS = {
  GROUP_HEAD: { corporate: 0.10, group: 0.90 },
  DEPT_HEAD: { group: 0.60, department: 0.40 },
  TEAM_HEAD: { department: 0.60, team: 0.40 },
  INDIVIDUAL: { department: 0.60, team: 0.40 }
};

/**
 * Calculates final OKR score based on role level and component scores.
 * @param {string} roleLevel - Role level (GROUP_HEAD, DEPT_HEAD, TEAM_HEAD, INDIVIDUAL)
 * @param {Object} scores - { corporate?, group?, department?, team? }
 * @returns {number} Weighted final score (0-100+)
 */
function calculateOKRScore(roleLevel, scores) {
  const weights = OKR_WEIGHTS[roleLevel];
  if (!weights) {
    console.error(`Unknown role level: ${roleLevel}`);
    return 0;
  }
  
  let finalScore = 0;
  Object.keys(weights).forEach(component => {
    const weight = weights[component];
    const score = scores[component] || 0;
    finalScore += score * weight;
  });
  
  return Math.round(finalScore * 100) / 100; // Round to 2 decimals
}

/* -------------------------------------------------------------------------- */
/*                        CORE & LEADERSHIP SKILLS                            */
/* -------------------------------------------------------------------------- */

/**
 * Core Skills Framework (5-level scale: 0-5)
 * Used in Step 1: Skills Assessment by managers
 */
const CORE_SKILLS = [
  {
    id: 'cs-001',
    name: 'Technical Competency',
    description: 'Knowledge and application of role-specific technical skills'
  },
  {
    id: 'cs-002',
    name: 'Process Efficiency',
    description: 'Ability to work effectively and deliver results within timelines'
  },
  {
    id: 'cs-003',
    name: 'Quality Orientation',
    description: 'Commitment to producing high-quality work and continuous improvement'
  },
  {
    id: 'cs-004',
    name: 'Customer Focus',
    description: 'Understanding and meeting customer/stakeholder needs'
  },
  {
    id: 'cs-005',
    name: 'Collaboration',
    description: 'Working effectively with others towards common goals'
  }
];

/**
 * Leadership Skills Framework (5-level scale: 0-5)
 * Used in Step 1: Skills Assessment by managers
 * Applicable to managers/leads only
 */
const LEADERSHIP_SKILLS = [
  {
    id: 'ls-001',
    name: 'Strategic Thinking',
    description: 'Ability to think long-term and align work with organizational goals'
  },
  {
    id: 'ls-002',
    name: 'Team Development',
    description: 'Developing and coaching team members for growth'
  },
  {
    id: 'ls-003',
    name: 'Decision Making',
    description: 'Making sound decisions balancing data, judgment, and stakeholder input'
  },
  {
    id: 'ls-004',
    name: 'Communication',
    description: 'Clear, transparent, and timely communication with stakeholders'
  },
  {
    id: 'ls-005',
    name: 'Change Management',
    description: 'Leading and adapting to organizational changes effectively'
  }
];

/**
 * Skill level scale (0-5)
 * Standard for both core and leadership skills
 */
const SKILL_LEVELS = {
  0: 'Not Demonstrated',
  1: 'Foundational',
  2: 'Developing',
  3: 'Proficient',
  4: 'Advanced',
  5: 'Expert'
};

/**
 * RAG (Red-Amber-Green) Status Mapping
 * Used to highlight skills that need attention vs. those on track
 * Compares actual level to required level
 */
const RAG_STATUS = {
  GREEN: { label: 'On Track', color: '#49D7D1', code: 'GREEN' },
  AMBER: { label: 'At Risk', color: '#8965F5', code: 'AMBER' },
  RED: { label: 'Critical', color: '#EE1717', code: 'RED' }
};

/**
 * Determines RAG status based on skill gap.
 * gap = actual - required
 * @param {number} gap - Skill gap (actual - required)
 * @returns {Object} RAG status object
 */
function getRAGStatus(gap) {
  if (gap >= 0) return RAG_STATUS.GREEN;
  if (gap >= -1) return RAG_STATUS.AMBER;
  return RAG_STATUS.RED;
}

/* -------------------------------------------------------------------------- */
/*                          SELF-ASSESSMENT                                   */
/* -------------------------------------------------------------------------- */

/**
 * Self-assessment mandatory questions (Step 3)
 * Employees must answer all 4 questions
 */
const SELF_ASSESSMENT_QUESTIONS = [
  {
    id: 'sa-001',
    question: 'What contributed to your performance this quarter?',
    helpText: 'Describe key accomplishments, projects completed, and factors that helped you succeed.'
  },
  {
    id: 'sa-002',
    question: 'What challenges or gaps impacted your performance?',
    helpText: 'Be honest about obstacles, skill gaps, or resource limitations you faced.'
  },
  {
    id: 'sa-003',
    question: 'What support do you need for the upcoming quarter?',
    helpText: 'Identify training, mentorship, tools, or resources that would help you succeed.'
  },
  {
    id: 'sa-004',
    question: 'What specific commitments will you make to improve/sustain performance?',
    helpText: 'List concrete, measurable actions you will take in the next quarter.'
  }
];

/* -------------------------------------------------------------------------- */
/*                            WORKFLOW STEPS                                  */
/* -------------------------------------------------------------------------- */

/**
 * Workflow steps metadata
 * Defines step sequence, portal ownership, and step requirements
 */
const WORKFLOW_STEPS = {
  1: {
    name: 'Skills Assessment',
    portal: 'MANAGER',
    description: 'Manager rates employee on core and leadership skills',
    requiresPriorSteps: []
  },
  2: {
    name: 'OKR Upload',
    portal: 'DATA_SPOC',
    description: 'Data SPOC uploads corporate, group, department, and team OKRs',
    requiresPriorSteps: []
  },
  3: {
    name: 'Self-Assessment',
    portal: 'EMPLOYEE',
    description: 'Employee responds to 4 mandatory self-assessment questions',
    requiresPriorSteps: [1, 2] // Hard gate: Steps 1 & 2 must complete
  },
  4: {
    name: 'Feed Forward',
    portal: 'MANAGER',
    description: 'Manager provides feedback and performance rating',
    requiresPriorSteps: [3] // Hard gate: Step 3 must complete
  },
  5: {
    name: 'Manager Acknowledgement',
    portal: 'MANAGER',
    description: 'Manager confirms mid-year review discussion took place',
    requiresPriorSteps: [4] // Hard gate: Step 4 must complete
  },
  6: {
    name: 'View Scores',
    portal: 'EMPLOYEE',
    description: 'Employee views all accumulated scores and feedback (read-only)',
    requiresPriorSteps: [5] // Hard gate: Step 5 must complete
  },
  7: {
    name: 'Employee Acknowledgement',
    portal: 'EMPLOYEE',
    description: 'Employee confirms mid-year review discussion took place',
    requiresPriorSteps: [6] // Hard gate: Step 6 must complete (implicit)
  }
};

/**
 * Checks if a step is unlocked based on prior step completion.
 * @param {number} stepNumber - Step number to check (1-7)
 * @param {Object} workflowStatus - Workflow status object with step completion flags
 * @returns {boolean} True if step is accessible
 */
function isStepUnlocked(stepNumber, workflowStatus) {
  const step = WORKFLOW_STEPS[stepNumber];
  if (!step) return false;
  
  // All prior required steps must be complete
  return step.requiresPriorSteps.every(priorStep => {
    const fieldName = `step${priorStep}Complete`;
    return workflowStatus[fieldName] === true;
  });
}

/* -------------------------------------------------------------------------- */
/*                            CONVERGE BRANDING                               */
/* -------------------------------------------------------------------------- */

/**
 * Converge Brand Color Palette (WCAG AA compliant)
 * Reference: CONVERGE Brand Guidelines 2026
 */
const BRAND_COLORS = {
  PRIMARY: '#038F8D',          // Converge Teal
  BLACK: '#000000',            // Phantom Black
  WHITE: '#FFFFFF',            // Pure White
  TEAL_DARK: '#024645',        // Deepwave Teal
  TEAL_MID: '#027574',         // Midwave Teal
  AQUAMARINE: '#49D7D1',       // Visionary Aquamarine
  TEAL_SOFT: '#9AC0C3',        // Softwave Teal
  VIOLET: '#8965F5'            // Pulse Violet
};

/**
 * Brand Typography
 */
const BRAND_FONTS = {
  HEADING: "'Funnel Display', sans-serif",
  BODY: "'Funnel Sans', 'DM Sans', sans-serif"
};

/* -------------------------------------------------------------------------- */
/*                              VALIDATION                                    */
/* -------------------------------------------------------------------------- */

/**
 * Validation rules for form inputs
 */
const VALIDATION_RULES = {
  SKILL_LEVEL: { min: 0, max: 5, type: 'number' },
  OKR_SCORE: { min: 0, max: 200, type: 'number' }, // Allow >100% for exceeds
  WEIGHT: { min: 0, max: 100, type: 'number' },
  COMMENT: { minLength: 10, maxLength: 5000, type: 'string' }
};

/* -------------------------------------------------------------------------- */
/*                          EXPORT UTILITIES                                  */
/* -------------------------------------------------------------------------- */

/**
 * Helper: Format performance bracket for display
 * @param {string} code - Bracket code (EXCEEDED, ACHIEVED, etc.)
 * @returns {Object} Bracket object with label and description
 */
function getPerformanceBracket(code) {
  return PERFORMANCE_BRACKETS.find(b => b.code === code) || null;
}

/**
 * Helper: Check if employee passed (not failed)
 * @param {string} bracketCode - Bracket code
 * @returns {boolean} True if bracket is not FAILED
 */
function isPerformancePassing(bracketCode) {
  return bracketCode !== 'FAILED';
}
