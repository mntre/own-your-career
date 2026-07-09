/**
 * Own Your Career — Login Logic
 * 
 * Handles Google OAuth 2.0 login + portal picker flow.
 * 
 * Flow:
 * 1. User logs in via Google SSO (or test user click)
 * 2. System determines accessible portals based on role
 * 3. If 1 portal → auto-redirect
 * 4. If 2+ portals → show portal picker
 * 
 * @fileoverview Login page JavaScript logic
 */

'use strict';

/* --------------------------------------------------------------------------
   Portal Definitions
   -------------------------------------------------------------------------- */

/**
 * Portal configuration map
 * Defines all portals with their metadata
 */
const PORTALS = {
  admin: {
    id: 'admin',
    label: 'Admin Portal',
    icon: '⚙️',
    desc: 'System config, progress monitoring, SFTP export',
    url: 'admin-portal.html'
  },
  manager: {
    id: 'manager',
    label: 'Manager Portal',
    icon: '👔',
    desc: 'Team skills assessment & feed forward',
    url: 'manager-portal.html'
  },
  dataspoc: {
    id: 'dataspoc',
    label: 'Data SPOC Portal',
    icon: '📊',
    desc: 'OKR Upload',
    url: 'dataspoc-portal.html'
  },
  employee: {
    id: 'employee',
    label: 'Employee Portal',
    icon: '👤',
    desc: 'Self-assessment & view performance scores',
    url: 'employee-portal.html'
  }
};

/**
 * Determine accessible portals based on user role
 * Rules:
 * - EMPLOYEE → Employee only (1 portal, auto-redirect)
 * - MANAGER → Manager + Employee (2 portals, picker)
 * - DATA_SPOC → Data SPOC + Employee (2 portals, picker)
 * - ADMIN → Admin + Manager + Data SPOC + Employee (4 portals, picker)
 * 
 * @param {string} role - Primary role from database
 * @returns {Object[]} Array of portal objects
 */
function getAccessiblePortals(role) {
  const portals = [];

  switch (role) {
    case 'ADMIN':
      portals.push(PORTALS.admin);
      portals.push(PORTALS.manager);
      portals.push(PORTALS.dataspoc);
      portals.push(PORTALS.employee);
      break;
    case 'MANAGER':
      portals.push(PORTALS.manager);
      portals.push(PORTALS.employee);
      break;
    case 'DATA_SPOC':
      portals.push(PORTALS.dataspoc);
      portals.push(PORTALS.employee);
      break;
    case 'EMPLOYEE':
    default:
      portals.push(PORTALS.employee);
      break;
  }

  return portals;
}

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
    const user = getCurrentUser();
    console.log('[Login] Active session found:', user.email);
    handlePostLogin(user.email, user.role, user.name);
    return;
  }

  // Setup test users toggle
  setupTestUsersPanel();
}

/**
 * Setup test users panel toggle and click handlers
 */
function setupTestUsersPanel() {
  const toggle = document.getElementById('test-users-toggle');
  const panel = document.getElementById('test-users-panel');

  if (toggle && panel) {
    toggle.addEventListener('click', () => {
      const isVisible = panel.classList.contains('visible');
      panel.classList.toggle('visible');
      toggle.setAttribute('aria-expanded', !isVisible);
    });

    // Click handlers for test user cards
    const cards = panel.querySelectorAll('.test-user-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const email = card.dataset.email;
        const role = card.dataset.role;
        const name = card.querySelector('.test-user-card__name').textContent;
        simulateLogin(email, role, name);
      });
    });
  }
}

/* --------------------------------------------------------------------------
   Login Handlers
   -------------------------------------------------------------------------- */

/**
 * Simulate login for test users (development mode)
 * @param {string} email
 * @param {string} role
 * @param {string} name
 */
async function simulateLogin(email, role, name) {
  hideError();
  showLoading();
  console.log('[Login] Simulating login:', email, role);

  try {
    const apiResult = await API.login(email, role, '');

    if (apiResult.success) {
      const userName = apiResult.user ? apiResult.user.name : name;

      // Store session
      sessionStorage.setItem('oyc_user', JSON.stringify({
        email: email,
        role: role,
        name: userName,
        department: apiResult.user ? apiResult.user.department : '',
        loginTime: Date.now()
      }));
      sessionStorage.setItem('oyc_token', apiResult.token);

      // Handle post-login (picker or redirect)
      handlePostLogin(email, role, userName);
    } else {
      hideLoading();
      showError(apiResult.message || 'Authentication failed.');
    }
  } catch (error) {
    console.error('[Login] Error:', error);
    hideLoading();
    showError('Authentication failed. Please try again.');
  }
}

/**
 * Handle Google ID token credential response
 * @param {Object} response - Google credential response
 */
async function handleGoogleCredential(response) {
  hideError();
  showLoading();

  const credential = response.credential;
  const payload = JSON.parse(atob(credential.split('.')[1]));
  const email = payload.email;
  const name = payload.name || email;

  console.log('[Login] Google SSO for:', email);

  try {
    // Call API — backend looks up email in employee DB and returns role
    const apiResult = await API.login(email, '', credential);

    if (apiResult.success) {
      const role = apiResult.user.role;
      const userName = apiResult.user.name || name;

      // Store session
      sessionStorage.setItem('oyc_user', JSON.stringify({
        email: email,
        role: role,
        name: userName,
        department: apiResult.user.department || '',
        loginTime: Date.now(),
        googleId: payload.sub
      }));
      sessionStorage.setItem('oyc_token', apiResult.token);

      // Handle post-login
      handlePostLogin(email, role, userName);
    } else {
      hideLoading();
      showError(apiResult.message || 'Access denied. Your email is not in the employee database.');
    }
  } catch (error) {
    console.error('[Login] Google SSO error:', error);
    hideLoading();
    showError('Authentication failed. Please try again.');
  }
}

/* --------------------------------------------------------------------------
   Post-Login: Portal Picker or Auto-Redirect
   -------------------------------------------------------------------------- */

/**
 * Handle post-login logic
 * If 1 portal → auto-redirect
 * If 2+ portals → show portal picker
 * 
 * @param {string} email
 * @param {string} role
 * @param {string} name
 */
function handlePostLogin(email, role, name) {
  const portals = getAccessiblePortals(role);

  console.log('[Login] Accessible portals:', portals.length, portals.map(p => p.id));

  if (portals.length === 1) {
    // Single portal — auto-redirect (no picker)
    console.log('[Login] Single portal, auto-redirecting to:', portals[0].url);
    const baseUrl = App.getBaseUrl();
    window.location.href = baseUrl + portals[0].url;
  } else {
    // Multiple portals — show picker
    showPortalPicker(name, email, portals);
  }
}

/**
 * Show the portal picker UI
 * @param {string} name - User's display name
 * @param {string} email - User's email
 * @param {Object[]} portals - Array of accessible portal objects
 */
function showPortalPicker(name, email, portals) {
  // Hide login section and loading
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('login-loading').style.display = 'none';

  // Show picker
  const picker = document.getElementById('portal-picker');
  picker.classList.add('visible');

  // Set welcome text
  document.getElementById('picker-welcome-name').textContent = 'Welcome, ' + (name || email);
  document.getElementById('picker-welcome-email').textContent = email;

  // Build portal cards
  const grid = document.getElementById('portal-picker-grid');
  const baseUrl = App.getBaseUrl();

  grid.innerHTML = portals.map(portal => `
    <a href="${baseUrl}${portal.url}" class="portal-card" aria-label="Go to ${portal.label}">
      <div class="portal-card__icon">${portal.icon}</div>
      <div class="portal-card__info">
        <div class="portal-card__title">${portal.label}</div>
        <div class="portal-card__desc">${portal.desc}</div>
      </div>
      <div class="portal-card__arrow">→</div>
    </a>
  `).join('');
}

/* --------------------------------------------------------------------------
   UI Helpers
   -------------------------------------------------------------------------- */

function showError(message) {
  const el = document.getElementById('error-message');
  if (el) {
    el.textContent = message;
    el.classList.add('visible');
  }
}

function hideError() {
  const el = document.getElementById('error-message');
  if (el) el.classList.remove('visible');
}

function showLoading() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('login-loading').classList.add('visible');
}

function hideLoading() {
  document.getElementById('login-section').style.display = 'block';
  document.getElementById('login-loading').classList.remove('visible');
}

/* --------------------------------------------------------------------------
   Session Management
   -------------------------------------------------------------------------- */

/**
 * Check if user has an active session
 * @returns {boolean}
 */
function hasActiveSession() {
  const sessionData = sessionStorage.getItem('oyc_user');
  if (!sessionData) return false;

  try {
    const user = JSON.parse(sessionData);
    const sessionDuration = Date.now() - user.loginTime;
    // 30-minute session timeout
    return sessionDuration < (30 * 60 * 1000);
  } catch (e) {
    return false;
  }
}

/**
 * Get current user from session
 * @returns {Object|null}
 */
function getCurrentUser() {
  const sessionData = sessionStorage.getItem('oyc_user');
  try {
    return sessionData ? JSON.parse(sessionData) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Logout — clear session and reload login page
 */
function logout() {
  sessionStorage.removeItem('oyc_user');
  sessionStorage.removeItem('oyc_token');
  window.location.href = 'login.html';
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initLogin);
