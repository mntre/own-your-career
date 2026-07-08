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
   * Redirect to login if not, or deny portal access if wrong role
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

    // Verify portal access — does this user's role allow them on this page?
    this.verifyPortalAccess(currentPage);
  },

  /**
   * Verify user has access to the current portal page.
   * If not, redirect to login.html (which shows portal picker if multi-role).
   * 
   * Access rules:
   * - admin-portal.html → ADMIN only
   * - manager-portal.html → MANAGER or ADMIN
   * - dataspoc-portal.html → DATA_SPOC only
   * - employee-portal.html → Everyone (all roles have employee access)
   * 
   * @param {string} currentPage - Current page identifier
   */
  verifyPortalAccess: function(currentPage) {
    if (!this.currentUser || currentPage === 'login' || currentPage === 'unknown') {
      return; // Nothing to verify
    }

    const role = this.currentUser.role;
    const allowedRolesMap = {
      admin: ['ADMIN'],
      manager: ['MANAGER', 'ADMIN'],
      dataspoc: ['DATA_SPOC'],
      employee: ['EMPLOYEE', 'MANAGER', 'DATA_SPOC', 'ADMIN']
    };

    const allowedRoles = allowedRolesMap[currentPage];

    if (!allowedRoles) {
      console.warn('[App] Unknown page for access check:', currentPage);
      return;
    }

    if (!allowedRoles.includes(role)) {
      console.warn(`[App] Access denied: ${this.currentUser.email} (${role}) cannot access ${currentPage} portal`);
      // Redirect to login — portal picker will show their actual options
      this.redirectToLogin();
    }
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

    // Render portal navigation bar
    this.renderPortalNav();
  },

  /**
   * Render portal navigation bar based on user's accessible portals.
   * Shows links to all portals the user can access, highlights current page.
   */
  renderPortalNav: function() {
    const navEl = document.getElementById('portal-nav');
    if (!navEl || !this.currentUser) return;

    const role = this.currentUser.role;
    const currentPage = this.getCurrentPage();
    const baseUrl = this.getBaseUrl();

    // Build portal list based on role
    const portals = [];

    if (role === 'ADMIN') {
      portals.push({ id: 'admin', label: 'Admin', url: 'admin-portal.html' });
      portals.push({ id: 'manager', label: 'Manager', url: 'manager-portal.html' });
    } else if (role === 'MANAGER') {
      portals.push({ id: 'manager', label: 'Manager', url: 'manager-portal.html' });
    } else if (role === 'DATA_SPOC') {
      portals.push({ id: 'dataspoc', label: 'Data SPOC', url: 'dataspoc-portal.html' });
    }

    // Everyone gets Employee Portal
    portals.push({ id: 'employee', label: 'Employee', url: 'employee-portal.html' });

    // Only render if user has 2+ portals
    if (portals.length <= 1) {
      navEl.style.display = 'none';
      return;
    }

    // Build nav HTML
    const linksHTML = portals.map(p => {
      const isActive = p.id === currentPage;
      return `<a href="${baseUrl}${p.url}" class="portal-nav__link ${isActive ? 'portal-nav__link--active' : ''}">${p.label} Portal</a>`;
    }).join('');

    const userEmail = this.currentUser.email || '';

    navEl.innerHTML = `
      <div class="portal-nav__links">${linksHTML}</div>
      <div class="portal-nav__user">
        <span>${userEmail}</span>
        <button class="portal-nav__signout" data-action="logout">Sign Out</button>
      </div>
    `;

    // Attach sign out listener to new button
    const signOutBtn = navEl.querySelector('.portal-nav__signout');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.logout();
      });
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
