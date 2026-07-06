/**
 * Own Your Career — API Adapter
 * 
 * Platform-agnostic API adapter that routes calls to the correct implementation
 * based on runtime platform detection (Converge Cloud or Google Apps Script).
 * 
 * Exports a single API object that works identically on both platforms.
 * 
 * @fileoverview API routing layer for dual deployment
 */

'use strict';

/**
 * Platform-agnostic API object
 * Routes method calls to platform-specific implementations
 */
const API = (() => {
  // Detect platform
  const platform = PlatformDetector.getPlatform();
  
  console.log(`[API] Initializing adapter for platform: ${platform}`);
  
  // Ensure platform-specific implementations are loaded
  if (platform === 'APPSCRIPT') {
    if (typeof APIAppScript === 'undefined') {
      console.error('[API] APIAppScript not loaded. Make sure api-appscript.js is included.');
      throw new Error('APIAppScript is required for Google Apps Script platform');
    }
    console.log('[API] Using Google Apps Script backend');
    return APIAppScript;
  } else {
    if (typeof APIConverge === 'undefined') {
      console.error('[API] APIConverge not loaded. Make sure api-converge.js is included.');
      throw new Error('APIConverge is required for Converge Cloud platform');
    }
    console.log('[API] Using Converge Cloud backend (HTTP)');
    return APIConverge;
  }
})();

// Verify API has required methods
console.log('[API] Available methods:', Object.keys(API).filter(k => typeof API[k] === 'function'));
