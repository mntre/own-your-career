/**
 * Own Your Career — OKR Calculation Engine
 * 
 * Computes final OKR scores based on role-level formulas
 * and assigns performance brackets.
 * 
 * Formulas:
 * - Group Heads:              10% Corporate Scorecard + 90% Group Grid
 * - Department Heads:         60% Group Grid + 40% Department OKR
 * - Team Heads & Individuals: 60% Department OKR + 40% Team OKR
 * 
 * Performance Brackets:
 * - Exceeded:          > 101%
 * - Achieved:          90.1% - 100%
 * - Needs Improvement: 81% - 90%
 * - Failed:            < 80%
 * 
 * @fileoverview OKR calculation and performance bracket assignment module
 */

'use strict';

/* --------------------------------------------------------------------------
   Constants
   -------------------------------------------------------------------------- */

/** @enum {string} */
const ROLE_LEVEL = {
  GROUP_HEAD: 'GROUP_HEAD',
  DEPT_HEAD: 'DEPT_HEAD',
  TEAM_HEAD: 'TEAM_HEAD',
  INDIVIDUAL: 'INDIVIDUAL'
};

/** @enum {string} */
const PERFORMANCE_BRACKET = {
  EXCEEDED: 'EXCEEDED',
  ACHIEVED: 'ACHIEVED',
  NEEDS_IMPROVEMENT: 'NEEDS_IMPROVEMENT',
  FAILED: 'FAILED'
};

/* --------------------------------------------------------------------------
   OKR Score Calculation
   -------------------------------------------------------------------------- */

/**
 * Calculates the final OKR score based on role level.
 * 
 * @param {string} roleLevel - One of ROLE_LEVEL enum values
 * @param {Object} scores - Score inputs (all as percentages, e.g., 95 = 95%)
 * @param {number} scores.corporateScorecard - Corporate scorecard score
 * @param {number} scores.groupGrid - Group grid score
 * @param {number} scores.departmentOKR - Department OKR score
 * @param {number} scores.teamOKR - Team OKR score
 * @returns {number} Final weighted score as a percentage
 * @throws {Error} If roleLevel is invalid or required scores are missing
 */
function calculateOKRScore(roleLevel, scores) {
  const { corporateScorecard, groupGrid, departmentOKR, teamOKR } = scores;

  switch (roleLevel) {
    case ROLE_LEVEL.GROUP_HEAD:
      if (corporateScorecard == null || groupGrid == null) {
        throw new Error('Group Heads require corporateScorecard and groupGrid scores.');
      }
      return (corporateScorecard * 0.10) + (groupGrid * 0.90);

    case ROLE_LEVEL.DEPT_HEAD:
      if (groupGrid == null || departmentOKR == null) {
        throw new Error('Department Heads require groupGrid and departmentOKR scores.');
      }
      return (groupGrid * 0.60) + (departmentOKR * 0.40);

    case ROLE_LEVEL.TEAM_HEAD:
    case ROLE_LEVEL.INDIVIDUAL:
      if (departmentOKR == null || teamOKR == null) {
        throw new Error('Team Heads/Individuals require departmentOKR and teamOKR scores.');
      }
      return (departmentOKR * 0.60) + (teamOKR * 0.40);

    default:
      throw new Error(`Invalid role level: ${roleLevel}`);
  }
}

/* --------------------------------------------------------------------------
   Performance Bracket Assignment
   -------------------------------------------------------------------------- */

/**
 * Assigns a performance bracket based on the final score.
 * 
 * Bracket boundaries:
 * - Exceeded:          > 101%
 * - Achieved:          90.1% - 100%  (inclusive of 100%, exclusive of 90%)
 * - Needs Improvement: 81% - 90%     (inclusive of both)
 * - Failed:            < 81%          (below 81%)
 * 
 * NOTE: The boundary at exactly 80% and 90% should be confirmed with BA (Zaira Bajar).
 * Current implementation: 80% = Failed, 81% = Needs Improvement, 90% = Needs Improvement.
 * 
 * @param {number} finalScore - The computed OKR score as a percentage
 * @returns {string} One of PERFORMANCE_BRACKET enum values
 */
function assignPerformanceBracket(finalScore) {
  if (finalScore > 101) {
    return PERFORMANCE_BRACKET.EXCEEDED;
  } else if (finalScore >= 90.1) {
    return PERFORMANCE_BRACKET.ACHIEVED;
  } else if (finalScore >= 81) {
    return PERFORMANCE_BRACKET.NEEDS_IMPROVEMENT;
  } else {
    return PERFORMANCE_BRACKET.FAILED;
  }
}

/**
 * Returns display properties for a performance bracket.
 * @param {string} bracket - One of PERFORMANCE_BRACKET enum values
 * @returns {{ label: string, cssClass: string }} Display label and CSS class
 */
function getBracketDisplay(bracket) {
  switch (bracket) {
    case PERFORMANCE_BRACKET.EXCEEDED:
      return { label: 'Exceeded', cssClass: 'status-indicator--exceeded' };
    case PERFORMANCE_BRACKET.ACHIEVED:
      return { label: 'Achieved', cssClass: 'status-indicator--achieved' };
    case PERFORMANCE_BRACKET.NEEDS_IMPROVEMENT:
      return { label: 'Needs Improvement', cssClass: 'status-indicator--needs-improvement' };
    case PERFORMANCE_BRACKET.FAILED:
      return { label: 'Failed', cssClass: 'status-indicator--failed' };
    default:
      return { label: 'Unknown', cssClass: '' };
  }
}

/* --------------------------------------------------------------------------
   RAG Indicator (Skills Assessment)
   -------------------------------------------------------------------------- */

/**
 * Determines the RAG (Red/Amber/Green) status for a skill assessment.
 * Go = Actual Level meets or exceeds Required Level.
 * Fail = Actual Level is below Required Level.
 * 
 * @param {number} actualLevel - Manager-rated actual skill level (0-5)
 * @param {number} requiredLevel - Auto-populated required level based on band/grade (0-5)
 * @returns {{ status: 'GO' | 'FAIL', cssClass: string }}
 */
function getRAGStatus(actualLevel, requiredLevel) {
  if (actualLevel >= requiredLevel) {
    return { status: 'GO', cssClass: 'rag-go' };
  }
  return { status: 'FAIL', cssClass: 'rag-fail' };
}
