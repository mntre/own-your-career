/**
 * Own Your Career — Login Logic
 * 
 * Handles Google OAuth 2.0 login flow with allowlist validation.
 * 
 * @fileoverview Login page JavaScript logic
 */

'use strict';

/* --------------------------------------------------------------------------
   Google OAuth 2.0 Handler
   -------------------------------------------------------------------------- */

/**
 * Handles Google ID token credential response from OAuth 2.0 flow
 * @param {Object} response - Google ID token response
 */
async function handleGoogleCredential(response) {
  hideError();

  // Decode the JWT credential
  const credential = response.credential;
  const payload = JSON.parse(atob(credential.split('.')[1]));

  // Extract user info from Google token
  const email = payload.email;
  const role = document.getElementById('role')?.value || 'EMPLOYEE';

  // Show loading state
  const loginBtn = document.getElementById('login-btn');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Authenticating...';

  try {
    // Call login API with Google credential
    const apiResult = await API.login(email, role, credential);

    if (apiResult.success) {
      // Store session info
      sessionStorage.setItem('oyc_user', JSON.stringify({
        email: email,
        role: role,
        loginTime: Date.now(),
        googleId: payload.sub
      }));

      // Redirect to appropriate portal
      redirectBasedOnRole(role);
    } else {
      showError(apiResult.message || 'Authentication failed. Please try again.');
    }
  } catch (error) {
    console.error('Login error:', error);
    showError('Authentication failed. Please check your credentials.');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Proceed to Google Sign-In';
  }
}

/* --------------------------------------------------------------------------
   Redirect Logic
   -------------------------------------------------------------------------- */

/**
 * Redirects user to appropriate portal based on role
 * @param {string} role - User role
 */
function redirectBasedOnRole(role) {
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

/* --------------------------------------------------------------------------
   Error Handling
   -------------------------------------------------------------------------- */

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

/* --------------------------------------------------------------------------
   Session Management
   -------------------------------------------------------------------------- */

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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initLogin);
