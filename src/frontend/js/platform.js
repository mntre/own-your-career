/**
 * Own Your Career — Platform Detection
 * 
 * Detects whether code is running on Converge Cloud or Google Apps Script
 * and provides platform-specific constants and helpers.
 * 
 * @fileoverview Runtime platform detection for dual deployment
 */

'use strict';

/**
 * Platform detection and configuration
 * Determines which backend to use (Converge Cloud vs Google Apps Script)
 */
const PlatformDetector = {
  /**
   * Check if running on Google Apps Script
   * @returns {boolean} True if google.script is available
   */
  isAppScript: function() {
    return typeof google !== 'undefined' && 
           typeof google.script !== 'undefined';
  },

  /**
   * Check if running on Converge Cloud (standard web platform)
   * @returns {boolean} True if NOT on Apps Script
   */
  isConverge: function() {
    return !this.isAppScript();
  },

  /**
   * Get current platform identifier
   * @returns {string} 'APPSCRIPT' or 'CONVERGE'
   */
  getPlatform: function() {
    return this.isAppScript() ? 'APPSCRIPT' : 'CONVERGE';
  },

  /**
   * Get platform display name for logging
   * @returns {string} Human-readable platform name
   */
  getPlatformName: function() {
    return this.isAppScript() ? 'Google Apps Script' : 'Converge Cloud';
  },

  /**
   * Initialize platform detection and logging
   */
  init: function() {
    console.log(`[Platform] Detected: ${this.getPlatformName()} (${this.getPlatform()})`);
    
    // Store in window for debugging
    window.PLATFORM = this.getPlatform();
  }
};

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    PlatformDetector.init();
  });
} else {
  // DOM already ready
  PlatformDetector.init();
}
