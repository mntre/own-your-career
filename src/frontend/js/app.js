/**
 * Own Your Career — Main Application Logic
 * 
 * Entry point for the frontend application.
 * Handles portal initialization, navigation, and shared UI logic.
 * 
 * @fileoverview Platform-agnostic main application module
 */

'use strict';

/* --------------------------------------------------------------------------
   Platform Detection
   -------------------------------------------------------------------------- */

/**
 * Detects the current deployment platform.
 * @returns {'CONVERGE' | 'APPSCRIPT'} The current platform identifier
 */
function detectPlatform() {
  if (typeof google !== 'undefined' && google.script && google.script.run) {
    return 'APPSCRIPT';
  }
  return 'CONVERGE';
}

/** @type {'CONVERGE' | 'APPSCRIPT'} */
const PLATFORM = detectPlatform();

/* --------------------------------------------------------------------------
   API Layer (Platform Abstraction)
   -------------------------------------------------------------------------- */

/**
 * Platform-agnostic API layer.
 * All backend calls go through this interface to maintain dual-platform compatibility.
 */
const API = {
  /**
   * Saves skills assessment data for an employee (Step 1).
   * @param {string} employeeId - The employee being assessed
   * @param {Object} assessmentData - Skills assessment form data
   * @returns {Promise<Object>} Response from the backend
   */
  saveSkillsAssessment: function(employeeId, assessmentData) {
    // TODO: Implement per-platform backend call
  },

  /**
   * Saves OKR upload data (Step 2).
   * @param {string} employeeId - The employee whose OKR is being uploaded
   * @param {Object} okrData - OKR form data (corporateOKR, teamOKR, targets, weight)
   * @returns {Promise<Object>} Response from the backend
   */
  saveOKRUpload: function(employeeId, okrData) {
    // TODO: Implement per-platform backend call
  },

  /**
   * Saves self-assessment responses (Step 3).
   * @param {string} employeeId - The employee submitting self-assessment
   * @param {Object} selfAssessmentData - 4 mandatory question responses
   * @returns {Promise<Object>} Response from the backend
   */
  saveSelfAssessment: function(employeeId, selfAssessmentData) {
    // TODO: Implement per-platform backend call
  },

  /**
   * Saves Feed Forward / Manager Assessment (Step 4).
   * @param {string} employeeId - The employee being assessed
   * @param {string} managerId - The manager providing assessment
   * @param {Object} feedForwardData - Feed Forward form data
   * @returns {Promise<Object>} Response from the backend
   */
  saveFeedForward: function(employeeId, managerId, feedForwardData) {
    // TODO: Implement per-platform backend call
  },

  /**
   * Saves acknowledgement (Steps 5 & 7).
   * @param {string} employeeId - The employee whose review is being acknowledged
   * @param {string} userId - The user submitting (manager for Step 5, employee for Step 7)
   * @param {Object} ackData - { confirmed: boolean, comment: string }
   * @param {'MANAGER' | 'EMPLOYEE'} type - Type of acknowledgement
   * @returns {Promise<Object>} Response from the backend
   */
  saveAcknowledgement: function(employeeId, userId, ackData, type) {
    // TODO: Implement per-platform backend call
  },

  /**
   * Retrieves the workflow status for an employee.
   * @param {string} employeeId - The employee to check
   * @returns {Promise<Object>} WorkflowStatus object
   */
  getWorkflowStatus: function(employeeId) {
    // TODO: Implement per-platform backend call
  },

  /**
   * Retrieves all scores and feedback for an employee (Step 6 - read-only view).
   * @param {string} employeeId - The employee to retrieve scores for
   * @returns {Promise<Object>} All accumulated scores and feedback
   */
  getAllScores: function(employeeId) {
    // TODO: Implement per-platform backend call
  }
};

/* --------------------------------------------------------------------------
   Initialization
   -------------------------------------------------------------------------- */

/**
 * Initializes the application on page load.
 * Detects the current portal and sets up appropriate event listeners.
 */
function initApp() {
  console.log(`[OYC] Platform detected: ${PLATFORM}`);
  // TODO: Initialize portal-specific logic based on current page
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
/* --------------------------------------------------------------------------
   Login API (Converge Platform)
   -------------------------------------------------------------------------- */

/**
 * User login via SSO
 * @param {string} email - User email
 * @param {string} role - User role (EMPLOYEE, MANAGER, DATA_SPOC)
 * @param {string} [googleCredential] - Google ID token (optional, for Google SSO)
 * @returns {Promise<Object>} Login result with success status and message
 */
API.login = async function(email, role, googleCredential) {
  if (PLATFORM === 'APPSCRIPT') {
    // App Script implementation
    try {
      const response = await google.script.run.withSuccessHandler((result) => result).withFailureHandler((error) => {
        throw new Error(error);
      }).loginUser(email, role, googleCredential);
      return response;
    } catch (error) {
      console.error('AppScript login error:', error);
      return { success: false, message: 'Authentication failed' };
    }
  }

  // Converge Cloud implementation
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, role, googleCredential })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Converge login error:', error);
    return { success: false, message: error.message || 'Authentication failed' };
  }
};

/* --------------------------------------------------------------------------
   Initialization
   -------------------------------------------------------------------------- */
