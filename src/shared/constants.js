/**
 * Own Your Career — Shared Constants
 * 
 * Configuration values used by both platforms.
 * Never hardcode values — reference this file instead.
 * 
 * @fileoverview Shared constants and configuration
 */

'use strict';

/** Role levels for OKR formula selection */
const ROLE_LEVELS = {
  GROUP_HEAD: 'GROUP_HEAD',
  DEPT_HEAD: 'DEPT_HEAD',
  TEAM_HEAD: 'TEAM_HEAD',
  INDIVIDUAL: 'INDIVIDUAL'
};

/** Performance bracket thresholds */
const BRACKETS = {
  EXCEEDED_MIN: 101.01,
  ACHIEVED_MIN: 90.1,
  NEEDS_IMPROVEMENT_MIN: 81,
  FAILED_MAX: 80.99
};

/** OKR formula weights by role level */
const OKR_WEIGHTS = {
  GROUP_HEAD: { corporate: 0.10, group: 0.90 },
  DEPT_HEAD: { group: 0.60, department: 0.40 },
  TEAM_HEAD: { department: 0.60, team: 0.40 },
  INDIVIDUAL: { department: 0.60, team: 0.40 }
};

/** Skill level scale (0-5) */
const SKILL_LEVELS = {
  0: 'Not Demonstrated',
  1: 'Foundational',
  2: 'Developing',
  3: 'Proficient',
  4: 'Advanced',
  5: 'Expert'
};

/** Self-assessment mandatory questions (Step 3) */
const SELF_ASSESSMENT_QUESTIONS = [
  'What contributed to your performance this quarter?',
  'What challenges or gaps impacted your performance?',
  'What support do you need for the upcoming quarter?',
  'What specific commitments will you make to improve/sustain performance?'
];

/** Workflow steps metadata */
const WORKFLOW_STEPS = {
  1: { name: 'Skills Assessment', portal: 'MANAGER' },
  2: { name: 'OKR Upload', portal: 'DATA_SPOC' },
  3: { name: 'Self-Assessment', portal: 'EMPLOYEE' },
  4: { name: 'Feed Forward', portal: 'MANAGER' },
  5: { name: 'Manager Acknowledgement', portal: 'MANAGER' },
  6: { name: 'View Scores', portal: 'EMPLOYEE' },
  7: { name: 'Employee Acknowledgement', portal: 'EMPLOYEE' }
};
