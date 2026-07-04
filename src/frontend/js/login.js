/**
 * Own Your Career — Login Logic
 * 
 * Handles Google OAuth 2.0 login flow with allowlist validation.
 * Phase 1: Uses mock API for local testing
 * Phase 2: Will connect to real backend (Converge Cloud or Apps Script)
 * 
 * @fileoverview Login page JavaScript logic
 */

'use strict';

/* --------------------------------------------------------------------------
   Login Initialization
   -------------------------------------------------------------------------- */

/**
 * Initialize login page
 */
function initLogin() {
  console.log('[Login] Initializing login page');
  
  // Check if user already has active session
  if (hasActiveSession()) {
    console.log('[Login] User has active session, redirecting to portal');
    const user = getCurrentUser();
    App.redirectToPortal(user.role);
    return;
  }
  
  // Set up role selector
  const roleSelector = document.getElementById('role');
  if (roleSelector) {
    roleSelector.addEventListener('change', (e) => {
      console.log('[Login] Role selected:', e.target.value);
    });
  }
  
  // Set up manual test login for Phase 1
  setupPhase1Testing();
}

/* --------------------------------------------------------------------------
   Phase 1: Mock Testing (Local)
   -------------------------------------------------------------------------- */

/**
 * Set up Phase 1 mock testing UI
 * Shows available test users and allows quick login
 */
function setupPhase1Testing() {
  const testingSection = document.querySelector('.info-box');
  
  if (!testingSection) return;
  
  // Add test user shortcuts
  const testUsers = [
    { email: 'manager@example.com', role: 'MANAGER', label: 'Manager' },
    { email: 'employee@example.com', role: 'EMPLOYEE', label: 'Employee' },
    { email: 'dataspoc@example.com', role: 'DATA_SPOC', label: 'Data SPOC' },
    { email: 'admin@example.com', role: 'ADMIN', label: 'Admin' }
  ];
  
  const testUIHTML = `
    <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e0e0e0;">
      <h4 style="margin: 0 0 12px; color: var(--color-primary); font-size: 14px; font-weight: 600;">
        🧪 Phase 1 Test Users (Local Only)
      </h4>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
        ${testUsers.map(user => `
          <button 
            class="btn btn--secondary" 
            style="width: 100%; padding: 10px; font-size: 13px;"
            onclick="simulateLogin('${user.email}', '${user.role}')"
          >
            ${user.label}
          </button>
        `).join('')}
      </div>
      <p style="margin: 12px 0 0; font-size: 12px; color: #999;">
        Click any test user to simulate login (no Google account needed)
      </p>
    </div>
  `;
  
  testingSection.innerHTML += testUIHTML;
}

/**
 * Simulate login for Phase 1 testing (no Google OAuth needed)
 * @param {string} email - Test user email
 * @param {string} role - Test user role
 */
async function simulateLogin(email, role) {
  hideError();
  console.log('[Login] Simulating login for:', email, 'role:', role);
  
  const loginBtn = event?.target;
  if (loginBtn) {
    loginBtn.disabled = true;
    loginBtn.textContent = 'Authenticating...';
  }
  
  try {
    // Call mock API (no Google credential needed in Phase 1)
    const apiResult = await API.login(email, role, 'mock_google_credential');
    
    if (apiResult.success) {
      // Store session info
      sessionStorage.setItem('oyc_user', JSON.stringify({
        email: email,
        role: role,
        name: apiResult.user.name,
        department: apiResult.user.department,
        loginTime: Date.now()
      }));
      
      // Store token
      sessionStorage.setItem('oyc_token', apiResult.token);
      
      console.log('[Login] Authentication successful, redirecting to portal');
      
      // Redirect to appropriate portal
      App.redirectToPortal(role);
    } else {
      showError(apiResult.message || 'Authentication failed. Please try again.');
    }
  } catch (error) {
    console.error('[Login] Error during login:', error);
    showError('Authentication failed. Please check your credentials.');
  } finally {
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Test Login';
    }
  }
}

/* --------------------------------------------------------------------------
   Google OAuth 2.0 Handler (For Phase 2+)
   -------------------------------------------------------------------------- */

/**
 * Handles Google ID token credential response from OAuth 2.0 flow
 * This will be used in Phase 2 when real Google OAuth is set up
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
  const loginBtn = document.querySelector('[data-action="google-signin"]');
  if (loginBtn) {
    loginBtn.disabled = true;
    loginBtn.textContent = 'Authenticating...';
  }

  try {
    // Call login API with Google credential
    // In Phase 2, this will call the real backend endpoint
    const apiResult = await API.login(email, role, credential);

    if (apiResult.success) {
      // Store session info
      sessionStorage.setItem('oyc_user', JSON.stringify({
        email: email,
        role: role,
        name: apiResult.user.name,
        department: apiResult.user.department,
        loginTime: Date.now(),
        googleId: payload.sub
      }));
      
      // Store token
      sessionStorage.setItem('oyc_token', apiResult.token);

      // Redirect to appropriate portal
      App.redirectToPortal(role);
    } else {
      showError(apiResult.message || 'Authentication failed. Please try again.');
    }
  } catch (error) {
    console.error('[Login] Error during Google login:', error);
    showError('Authentication failed. Please check your credentials.');
  } finally {
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Proceed to Google Sign-In';
    }
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
