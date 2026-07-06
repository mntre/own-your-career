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
 * Performance Brackets (BRD v4.0):
 * - Exceeded (Level 1):          101% and above
 * - Achieved (Level 2):          90.1% - 100%
 * - Needs Improvement (Level 3): 81% - 90%
 * - Failed (Level 4):            80% and below
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
 * Bracket boundaries (per BRD v4.0):
 * - Exceeded (Level 1):          101% and above
 * - Achieved (Level 2):          90.1% - 100%
 * - Needs Improvement (Level 3): 81% - 90%
 * - Failed (Level 4):            80% and below
 * 
 * @param {number} finalScore - The computed OKR score as a percentage
 * @returns {string} One of PERFORMANCE_BRACKET enum values
 */
function assignPerformanceBracket(finalScore) {
  if (finalScore >= 101) {
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

/* --------------------------------------------------------------------------
   OKR Score Calculation (Data SPOC Portal - Step 2)
   -------------------------------------------------------------------------- */

/**
 * Calculates the weighted OKR final score from key results.
 * 
 * Formula: Sum of ((Actual Result / Target Result) * Weight)
 * 
 * This function calculates the achievement percentage for each key result,
 * then multiplies by its weight to get the contribution, and sums all contributions.
 * 
 * @param {Array<Object>} keyResults - Array of key result objects
 * @param {number} keyResults[].actualResult - Actual result achieved (numeric)
 * @param {number} keyResults[].targetResult - Target result expected (numeric)
 * @param {number} keyResults[].weight - Weight percentage for this KR (0-100)
 * @returns {number} Weighted OKR score as a percentage
 * 
 * @example
 * // Single KR: Actual=85, Target=100, Weight=100%
 * // Score = (85/100) * 100 = 85%
 * 
 * @example
 * // Multiple KRs:
 * // KR1: Actual=90, Target=100, Weight=40% → (90/100)*40 = 36%
 * // KR2: Actual=110, Target=100, Weight=30% → (110/100)*30 = 33%
 * // KR3: Actual=80, Target=100, Weight=30% → (80/100)*30 = 24%
 * // Total Score = 36 + 33 + 24 = 93%
 */
function calculateOKRFinalScore(keyResults) {
  if (!Array.isArray(keyResults) || keyResults.length === 0) {
    return 0;
  }

  let totalWeightedScore = 0;

  keyResults.forEach(function(kr) {
    const actualResult = parseFloat(kr.actualResult) || 0;
    const targetResult = parseFloat(kr.targetResult) || 1; // Default to 1 to avoid division by zero
    const weight = parseFloat(kr.weight) || 0;
    
    // Calculate achievement percentage: (Actual / Target) * 100
    const achievement = (actualResult / targetResult) * 100;
    
    // Calculate contribution: (Achievement * Weight) / 100
    const contribution = (achievement * weight) / 100;
    
    totalWeightedScore += contribution;
  });

  // Ensure score is capped at reasonable limits (can go above 100 if exceeding targets)
  // Allow up to 200% for overachievement
  return Math.min(totalWeightedScore, 200);
}

/**
 * Computes the individual key result score with contribution calculation.
 * Used to populate individual score cells in the OKR table.
 * 
 * @param {number} actualResult - Actual result value
 * @param {number} targetResult - Target result value
 * @param {number} weight - Weight percentage
 * @returns {{ score: number, contribution: number }}
 * 
 * @example
 * // KR: Actual=85, Target=100, Weight=30%
 * // score = (85/100)*100 = 85%
 * // contribution = (85/100)*30 = 25.5%
 */
function calculateKeyResultScore(actualResult, targetResult, weight) {
  const actualNum = parseFloat(actualResult) || 0;
  const targetNum = parseFloat(targetResult) || 1;
  const weightNum = parseFloat(weight) || 0;

  // Achievement percentage: (Actual / Target) * 100
  const score = (actualNum / targetNum) * 100;
  
  // Contribution to total: (Score * Weight) / 100
  const contribution = (score * weightNum) / 100;

  return {
    score: Math.min(score, 200), // Cap individual score at 200%
    contribution: contribution
  };
}

/**
 * Computes OKR scores for all hierarchy levels with cascading fallback logic.
 * 
 * Fallback Rules:
 * - If Team OKR exists but Department OKR missing → Department = Team OKR
 * - If Department OKR exists but Group OKR missing → Group = Department OKR
 * - Cascade upward only, never downward
 * 
 * @param {Array<Object>} groupKeyResults - Group-level key results (optional)
 * @param {Array<Object>} departmentKeyResults - Department-level key results (optional)
 * @param {Array<Object>} teamKeyResults - Team-level key results (required)
 * @returns {Object} Hierarchy with computed scores
 * 
 * @example
 * // All levels provided
 * const hierarchy = computeOKRHierarchy(groupKRs, deptKRs, teamKRs);
 * // Result: { groupOKRScore, departmentOKRScore, teamOKRScore, corporateOKRScore }
 */
function computeOKRHierarchy(groupKeyResults, departmentKeyResults, teamKeyResults) {
  // Calculate base team OKR score from weighted key results
  const teamOKRScore = calculateOKRFinalScore(teamKeyResults);
  
  // Calculate department OKR score if available, otherwise use team score
  const departmentOKRScore = Array.isArray(departmentKeyResults) && departmentKeyResults.length > 0
    ? calculateOKRFinalScore(departmentKeyResults)
    : teamOKRScore;
  
  // Calculate group OKR score if available, otherwise use department score
  const groupOKRScore = Array.isArray(groupKeyResults) && groupKeyResults.length > 0
    ? calculateOKRFinalScore(groupKeyResults)
    : departmentOKRScore;

  // Apply cascading fallback logic
  const hierarchy = {
    teamOKRScore: teamOKRScore,
    departmentOKRScore: departmentOKRScore,
    groupOKRScore: groupOKRScore,
    corporateOKRScore: groupOKRScore  // Default: use group score if corporate missing
  };
  
  return hierarchy;
}

/**
 * Generates a detailed summary of OKR calculations including contribution breakdown.
 * 
 * @param {Array<Object>} keyResults - Key results with scores
 * @param {number} finalScore - Computed final score
 * @returns {Object} Summary with detailed breakdowns
 */
function generateOKRSummary(keyResults, finalScore) {
  if (!Array.isArray(keyResults) || keyResults.length === 0) {
    return {
      keyResults: [],
      finalScore: 0,
      totalWeight: 0,
      details: []
    };
  }

  const details = keyResults.map(function(kr) {
    const krScore = calculateKeyResultScore(kr.actualResult, kr.targetResult, kr.weight);
    return {
      keyResult: kr.keyResult,
      actualResult: parseFloat(kr.actualResult) || 0,
      targetResult: parseFloat(kr.targetResult) || 0,
      weight: parseFloat(kr.weight) || 0,
      achievementPercent: krScore.score,
      contribution: krScore.contribution
    };
  });

  const totalWeight = details.reduce(function(sum, d) { return sum + d.weight; }, 0);
  
  return {
    keyResults: details,
    finalScore: finalScore,
    totalWeight: totalWeight,
    isValid: totalWeight === 100 // Weights should sum to 100%
  };
}
