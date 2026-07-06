/**
 * Own Your Career — API Adapter
 * 
 * Platform-agnostic API adapter that routes calls to the correct implementation
 * based on runtime platform detection (Converge Cloud or Google Apps Script).
 * 
 * For local testing (Live Server / file:// protocol), falls back to the legacy
 * mock API (api.js) which requires no backend server.
 * 
 * Exports a single API object that works identically on both platforms.
 * 
 * @fileoverview API routing layer for dual deployment
 */

'use strict';

/**
 * Platform-agnostic API object
 * Routes method calls to platform-specific implementations
 * 
 * Priority:
 * 1. Google Apps Script (if google.script is available)
 * 2. Converge Cloud HTTP backend (production)
 * 3. Legacy mock API (for local testing without backend - Live Server)
 */
const API = (() => {
  // Detect platform
  const platform = PlatformDetector.getPlatform();
  
  console.log(`[API Adapter] Initializing for platform: ${platform}`);
  
  if (platform === 'APPSCRIPT') {
    if (typeof APIAppScript === 'undefined') {
      console.error('[API Adapter] APIAppScript not loaded.');
      return null;
    }
    console.log('[API Adapter] Using Google Apps Script backend');
    return APIAppScript;
  }
  
  // Converge Cloud platform — check if we're in local testing mode
  const isLocalTesting = (
    window.location.protocol === 'file:' ||
    window.location.port === '5500' ||
    window.location.port === '5501'
  );
  
  if (isLocalTesting) {
    console.log('[API Adapter] Local testing detected (Live Server). Using mock API.');
    // Return inline mock API (same as api.js but guaranteed available)
    return {
      login: async function(email, role, googleCredential) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const MOCK_ALLOWLIST = [
          { email: 'manager@example.com', role: 'MANAGER', name: 'Sample Manager', department: 'Sales' },
          { email: 'employee@example.com', role: 'EMPLOYEE', name: 'Sample Employee', department: 'Sales' },
          { email: 'dataspoc@example.com', role: 'DATA_SPOC', name: 'Sample Data SPOC', department: 'People Operations' },
          { email: 'admin@example.com', role: 'ADMIN', name: 'Sample Admin', department: 'People Operations' }
        ];
        
        const user = MOCK_ALLOWLIST.find(u => u.email === email && u.role === role);
        
        if (!user) {
          return {
            success: false,
            message: `Invalid credentials. Try: manager@, employee@, dataspoc@, admin@example.com`
          };
        }
        
        // Generate mock JWT
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
          sub: email, email: email, role: role,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (30 * 60)
        }));
        const token = `${header}.${payload}.mock_sig`;
        
        return {
          success: true,
          token: token,
          user: { email: user.email, role: user.role, name: user.name, department: user.department },
          message: 'Login successful (mock)'
        };
      },
      
      logout: async function() {
        return { success: true, message: 'Logged out successfully' };
      },
      
      verifyToken: function(token) {
        if (!token) return false;
        try {
          const parts = token.split('.');
          if (parts.length !== 3) return false;
          const payload = JSON.parse(atob(parts[1]));
          return payload.exp > Math.floor(Date.now() / 1000);
        } catch (e) { return false; }
      },
      
      decodeToken: function(token) {
        try {
          const parts = token.split('.');
          return JSON.parse(atob(parts[1]));
        } catch (e) { return null; }
      },
      
      // Admin mock methods
      getSystemConfig: async function() {
        await new Promise(r => setTimeout(r, 200));
        return { success: true, config: { hardLockDate: null, reviewPeriodStart: '2026-01-01', reviewPeriodEnd: '2026-06-30', exceededThreshold: 101 } };
      },
      saveSystemConfig: async function(config) {
        await new Promise(r => setTimeout(r, 300));
        return { success: true, message: 'Configuration saved successfully (mock)' };
      },
      getAdminStats: async function() {
        await new Promise(r => setTimeout(r, 200));
        return { success: true, stats: { totalEmployees: 25, stepsCompleted: 42, completionRate: 24, pendingEmployees: 19, stepProgress: [60, 48, 32, 20, 12, 8, 4] } };
      },
      sendReminders: async function() {
        await new Promise(r => setTimeout(r, 500));
        return { success: true, message: '19 reminder emails sent successfully (mock)' };
      },
      lockSystem: async function() {
        await new Promise(r => setTimeout(r, 300));
        return { success: true, message: 'System locked successfully (mock)' };
      },
      exportProgressReport: async function() {
        await new Promise(r => setTimeout(r, 300));
        return { success: true, data: 'Step,Completed,Total,Percentage\nStep 1,15,25,60%\nStep 2,12,25,48%\nStep 3,8,25,32%\nStep 4,5,25,20%\nStep 5,3,25,12%\nStep 6,2,25,8%\nStep 7,1,25,4%' };
      },
      getExportHistory: async function() {
        return { success: true, history: [] };
      },
      triggerSFTPExport: async function(options) {
        await new Promise(r => setTimeout(r, 500));
        return { success: true, message: 'SFTP export triggered (mock)', exportRecord: { timestamp: new Date().toISOString(), status: 'SUCCESS', records: 25, details: 'Mock export' } };
      },
      getAuditLog: async function() {
        return { success: true, logs: [
          { timestamp: '2026-07-06 09:00:00', event: 'LOGIN', user: 'admin@example.com', action: 'Admin login', status: 'SUCCESS' },
          { timestamp: '2026-07-06 08:45:00', event: 'CONFIG_CHANGE', user: 'admin@example.com', action: 'Updated hard lock date', status: 'SUCCESS' }
        ]};
      }
    };
  }
  
  // Production: Use Converge Cloud HTTP backend
  if (typeof APIConverge === 'undefined') {
    console.error('[API Adapter] APIConverge not loaded.');
    return null;
  }
  console.log('[API Adapter] Using Converge Cloud backend (HTTP)');
  return APIConverge;
})();

// Log result
if (API) {
  console.log('[API Adapter] API ready. Methods:', Object.keys(API).filter(k => typeof API[k] === 'function'));
} else {
  console.error('[API Adapter] API failed to initialize!');
}
