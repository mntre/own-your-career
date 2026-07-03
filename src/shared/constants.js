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

/** Performance bracket thresholds — Per BRD v4.0 */
const BRACKETS = {
  EXCEEDED_MIN: 101,       // Level 1: 101% and above
  ACHIEVED_MIN: 90.1,     // Level 2: 90.1% – 100%
  NEEDS_IMPROVEMENT_MIN: 81, // Level 3: 81% – 90%
  FAILED_MAX: 80          // Level 4: 80% and below
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

/** Self-assessment mandatory questions (Step 3) — Per BRD v4.0 */
const SELF_ASSESSMENT_QUESTIONS = [
  'What contributed to your performance during the first half of the year (1H)?',
  'What challenges or gaps impacted your performance during 1H?',
  'What specific support do you require for the upcoming second half of the year (2H)?',
  'What specific commitments will you make to sustain or improve your performance moving forward?'
];

/** OKR Status values — Per BRD v4.0 */
const OKR_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  ON_TRACK: 'ON_TRACK',
  COMPLETED: 'COMPLETED',
  POSTPONED: 'POSTPONED'
};

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
