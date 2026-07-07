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
 * Formula depends on Category:
 * - If Category = "Target": Score = ((Actual Result / Target Result) × Weight%)
 * - If Category = "Threshold": Score = ((Target Result / Actual Result) × Weight%)
 * 
 * Where Weight% from CSV is stored with level-specific names:
 * - Group level: groupWeight (e.g., "25%")
 * - Department level: departmentWeight (e.g., "30%")
 * - Team level: teamWeight (e.g., "30%")
 * 
 * For each key result:
 * 1. Parse Actual Result as float
 * 2. Extract level-specific weight from CSV (e.g., "30%" → 30)
 * 3. Apply category-based formula
 * 4. Sum all contributions
 * 5. Multiply by 100 to convert to percentage for display
 * 
 * @param {Array<Object>} keyResults - Array of key result objects
 * @param {number} keyResults[].actualResult - Actual result achieved (numeric or string)
 * @param {number} keyResults[].groupTargetResult|departmentTargetResult|teamTargetResult - Target result expected
 * @param {string} keyResults[].groupWeight|departmentWeight|teamWeight - Weight from CSV as string "30%"
 * @param {string} keyResults[].groupCategory|departmentCategory|teamCategory - Category ("Target" or "Threshold")
 * @returns {number} Weighted OKR score as a percentage
 * 
 * @example
 * // Target KR: Actual=17.28, Target="18.91", Weight="25%", Category="Target"
 * // Score = ((17.28/18.91) × (25/100)) × 100 = 22.85%
 * 
 * // Threshold KR: Actual=95, Target="100", Weight="25%", Category="Threshold"
 * // Score = ((100/95) × (25/100)) × 100 = 26.32%
 */
function calculateOKRFinalScore(keyResults) {
  if (!Array.isArray(keyResults) || keyResults.length === 0) {
    return 0;
  }

  let totalContribution = 0;
  let levelType = null; // Will be detected from first KR's properties

  keyResults.forEach(function(kr) {
    // Detect level type from available properties (only need to do once)
    if (!levelType) {
      if (kr.hasOwnProperty('groupWeight')) {
        levelType = 'group';
      } else if (kr.hasOwnProperty('departmentWeight')) {
        levelType = 'department';
      } else if (kr.hasOwnProperty('teamWeight')) {
        levelType = 'team';
      }
    }

    // Get level-specific property names
    let targetResultProp, weightProp, categoryProp;
    
    if (levelType === 'group') {
      targetResultProp = 'groupTargetResult';
      weightProp = 'groupWeight';
      categoryProp = 'groupCategory';
    } else if (levelType === 'department') {
      targetResultProp = 'departmentTargetResult';
      weightProp = 'departmentWeight';
      categoryProp = 'departmentCategory';
    } else if (levelType === 'team') {
      targetResultProp = 'teamTargetResult';
      weightProp = 'teamWeight';
      categoryProp = 'teamCategory';
    } else {
      // Fallback to generic properties (for backward compatibility)
      targetResultProp = 'targetResult';
      weightProp = 'weight';
      categoryProp = 'category';
    }

    // Parse actual result (user input, may include %)
    let actualResult = parseFloat(String(kr.actualResult).replace('%', '')) || 0;
    
    // Parse target result (from CSV, may include %)
    let targetResult = parseFloat(String(kr[targetResultProp]).replace('%', '')) || 1;
    
    // Parse weight (from CSV as "30%")
    let weight = parseFloat(String(kr[weightProp]).replace('%', '')) || 0;
    
    // Get category (Target or Threshold)
    let category = String(kr[categoryProp]).trim().toLowerCase();
    
    // Convert weight from percentage to decimal
    weight = weight / 100;
    
    // Calculate contribution based on category
    let contribution;
    if (actualResult === 0 || isNaN(actualResult)) {
      // If actual result is empty or 0, contribution is 0 (avoid Infinity)
      contribution = 0;
    } else if (category === 'threshold') {
      // Threshold formula: (Target / Actual) × Weight
      contribution = (targetResult / actualResult) * weight;
    } else {
      // Target formula (default): (Actual / Target) × Weight
      contribution = (actualResult / targetResult) * weight;
    }
    
    totalContribution += contribution;
  });

  // Convert to percentage: multiply by 100
  const finalScore = totalContribution * 100;

  return Math.min(finalScore, 300);
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
  // Parse actual result (user input, may include %)
  let actualNum = parseFloat(String(actualResult).replace('%', '')) || 0;
  
  // Parse target result (from CSV, may include %)
  let targetNum = parseFloat(String(targetResult).replace('%', '')) || 1;
  
  // Parse weight (from CSV as "30%")
  let weightNum = parseFloat(String(weight).replace('%', '')) || 0;
  
  // Convert weight from percentage to decimal
  weightNum = weightNum / 100;

  // Contribution: (Actual / Target) × Weight
  const contribution = (actualNum / targetNum) * weightNum;

  return {
    score: contribution,
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
