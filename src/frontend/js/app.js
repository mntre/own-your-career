/**
 * Own Your Career — Main Application Logic
 * 
 * Handles portal routing, session management, and navigation.
 * Platform-agnostic — works on both Converge Cloud and Google Apps Script.
 * 
 * @fileoverview Main app orchestrator
 */

'use strict';

/**
 * Global App object for application state and routing
 */
const App = {
  // Current user session
  currentUser: null,
  
  // Session storage key
  SESSION_KEY: 'oyc_user',
  TOKEN_KEY: 'oyc_token',
  
  /**
   * Initialize application on page load
   */
  init: function() {
    console.log('[App] Initializing...');
    
    // Check for active session
    this.checkSession();
    
    // Set up navigation listeners
    this.setupNavigation();
  },

  /**
   * Check if user has an active session
   * Redirect to login if not
   */
  checkSession: function() {
    const user = sessionStorage.getItem(this.SESSION_KEY);
    const token = sessionStorage.getItem(this.TOKEN_KEY);
    
    // Get current page
    const currentPage = this.getCurrentPage();
    
    // If on login page, don't redirect
    if (currentPage === 'login') {
      console.log('[App] On login page, skipping session check');
      return;
    }
    
    // If no session data at all, redirect to login
    if (!user || !token) {
      console.log('[App] No session data found, redirecting to login');
      this.redirectToLogin();
      return;
    }

    // Verify token client-side (decode JWT, check expiry)
    let tokenValid = false;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        tokenValid = payload.exp > Math.floor(Date.now() / 1000);
      }
    } catch (e) {
      console.warn('[App] Token decode failed:', e.message);
    }

    if (!tokenValid) {
      console.log('[App] Token expired or invalid, redirecting to login');
      sessionStorage.removeItem(this.SESSION_KEY);
      sessionStorage.removeItem(this.TOKEN_KEY);
      this.redirectToLogin();
      return;
    }
    
    // Parse and store user
    this.currentUser = JSON.parse(user);
    console.log('[App] Session active for:', this.currentUser.email, 'role:', this.currentUser.role);
  },

  /**
   * Get current page name from URL
   * @returns {string} Page name (login, manager, employee, dataspoc, admin)
   */
  getCurrentPage: function() {
    const pathname = window.location.pathname;
    
    if (pathname.includes('login.html')) return 'login';
    if (pathname.includes('manager-portal.html')) return 'manager';
    if (pathname.includes('employee-portal.html')) return 'employee';
    if (pathname.includes('dataspoc-portal.html')) return 'dataspoc';
    if (pathname.includes('admin-portal.html')) return 'admin';
    
    return 'unknown';
  },

  /**
   * Redirect user to appropriate portal based on role
   * @param {string} role - User role
   */
  redirectToPortal: function(role) {
    const baseUrl = this.getBaseUrl();
    
    switch (role) {
      case 'EMPLOYEE':
        window.location.href = baseUrl + 'employee-portal.html';
        break;
      case 'MANAGER':
        window.location.href = baseUrl + 'manager-portal.html';
        break;
      case 'DATA_SPOC':
        window.location.href = baseUrl + 'dataspoc-portal.html';
        break;
      case 'ADMIN':
        window.location.href = baseUrl + 'admin-portal.html';
        break;
      default:
        console.warn('[App] Unknown role:', role);
        this.redirectToLogin();
    }
  },

  /**
   * Redirect to login page
   */
  redirectToLogin: function() {
    const baseUrl = this.getBaseUrl();
    window.location.href = baseUrl + 'login.html';
  },

  /**
   * Get base URL for HTML files
   * @returns {string} Base URL path
   */
  getBaseUrl: function() {
    const pathname = window.location.pathname;
    const basePath = pathname.substring(0, pathname.lastIndexOf('/') + 1);
    return basePath;
  },

  /**
   * Set up global navigation listeners (logout buttons, etc.)
   */
  setupNavigation: function() {
    // Look for logout buttons - defensive check
    const logoutBtns = document.querySelectorAll('[data-action="logout"]');
    if (logoutBtns && typeof logoutBtns[Symbol.iterator] === 'function') {
      logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.logout();
        });
      });
    } else {
      console.warn('[App] logoutBtns is not iterable');
    }
    
    // Update user display if element exists
    const userDisplay = document.getElementById('current-user');
    if (userDisplay && this.currentUser) {
      userDisplay.textContent = this.currentUser.email;
    }
  },

  /**
   * Logout current user
   */
  logout: function() {
    console.log('[App] Logging out user:', this.currentUser?.email);
    
    // Clear session
    sessionStorage.removeItem(this.SESSION_KEY);
    sessionStorage.removeItem(this.TOKEN_KEY);
    
    // Redirect to login
    this.redirectToLogin();
  },

  /**
   * Get current user object
   * @returns {Object|null} User object or null if not logged in
   */
  getCurrentUser: function() {
    return this.currentUser;
  },

  /**
   * Check if current user has a specific role
   * @param {string} role - Role to check
   * @returns {boolean} True if user has role
   */
  hasRole: function(role) {
    return this.currentUser && this.currentUser.role === role;
  },

  /**
   * Check if current user has ANY of the specified roles
   * @param {Array<string>} roles - Array of roles to check
   * @returns {boolean} True if user has any of the roles
   */
  hasAnyRole: function(roles) {
    return this.currentUser && roles.includes(this.currentUser.role);
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Also initialize immediately if DOM is already ready
if (document.readyState === 'loading') {
  // Still loading
} else {
  // Already ready
  App.init();
}
