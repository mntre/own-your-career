/**
 * Own Your Career — Login Logic
 * 
 * Handles login form submission and SSO authentication flow.
 * 
 * @fileoverview Login page JavaScript logic
 */

'use strict';

/* --------------------------------------------------------------------------
   Login Form Handling
   -------------------------------------------------------------------------- */

/**
 * Handles login form submission
 * @param {Event} e - Form submit event
 */
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const role = document.getElementById('role').value;

  // Basic validation
  if (!email || !role) {
    showError('Please fill in all fields');
    return;
  }

  if (!isValidEmail(email)) {
    showError('Please enter a valid email address');
    return;
  }

  // Show loading state
  const loginBtn = document.getElementById('login-btn');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing In...';
  hideError();

  try {
    // Call login API
    const response = await API.login(email, role);

    if (response.success) {
      // Store session info
      sessionStorage.setItem('oyc_user', JSON.stringify({
        email: email,
        role: role,
        loginTime: Date.now()
      }));

      // Redirect to appropriate portal
      redirectBasedOnRole(role);
    } else {
      showError(response.message || 'Login failed. Please try again.');
    }
  } catch (error) {
    console.error('Login error:', error);
    showError('Authentication failed. Please check your credentials.');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
}

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Redirects user to appropriate portal based on role
 * @param {string} role - User role
 */
function redirectBasedOnRole(role) {
  const now = new Date();
  const hour = now.getHours();

  // Get base URL (handles both local and deployed environments)
  const baseUrl = window.location.origin + window.location.pathname;
  const basePath = baseUrl.replace(/\/[^\/]*$/, ''); // Remove filename

  switch (role) {
    case 'EMPLOYEE':
      window.location.href = basePath + '/html/employee-portal.html';
      break;
    case 'MANAGER':
      window.location.href = basePath + '/html/manager-portal.html';
      break;
    case 'DATA_SPOC':
      window.location.href = basePath + '/html/dataspoc-portal.html';
      break;
    default:
      window.location.href = basePath + '/html/login.html';
  }
}

/**
 * Shows error message on login page
 * @param {string} message - Error message to display
 */
function showError(message) {
  const errorEl = document.getElementById('error-message');
  errorEl.textContent = message;
  errorEl.classList.add('visible');
}

/**
 * Hides error message on login page
 */
function hideError() {
  document.getElementById('error-message').classList.remove('visible');
}

/**
 * Checks if user has an active session
 * @returns {boolean} True if session exists and is valid
 */
function hasActiveSession() {
  const sessionData = sessionStorage.getItem('oyc_user');
  if (!sessionData) return false;

  const user = JSON.parse(sessionData);
  const sessionDuration = Date.now() - user.loginTime;

  // 30-minute session timeout
  const thirtyMinutes = 30 * 60 * 1000;
  return sessionDuration < thirtyMinutes;
}

/**
 * Gets current user from session
 * @returns {Object|null} User object or null
 */
function getCurrentUser() {
  const sessionData = sessionStorage.getItem('oyc_user');
  return sessionData ? JSON.parse(sessionData) : null;
}

/**
 * Logs out the current user
 */
function logout() {
  sessionStorage.removeItem('oyc_user');
  window.location.href = 'login.html';
}

/* --------------------------------------------------------------------------
   Initialization
   -------------------------------------------------------------------------- */

/**
 * Initializes login page
 */
function initLogin() {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Check for existing session
  if (hasActiveSession()) {
    const user = getCurrentUser();
    if (user) {
      redirectBasedOnRole(user.role);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initLogin);
