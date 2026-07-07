/**
 * Own Your Career — Admin Portal Logic
 * 
 * Handles admin dashboard functionality: system configuration,
 * progress monitoring, SFTP export, and audit logging.
 * 
 * @fileoverview Admin portal main logic
 */

'use strict';

/**
 * Global Admin object for admin dashboard state and operations
 */
const Admin = {
  // System configuration
  config: {
    hardLockDate: null,
    reviewPeriodStart: null,
    reviewPeriodEnd: null,
    exceededThreshold: 101,
    achievedMin: 90.1,
    needsImprovementMin: 81,
    failedMax: 80.99
  },
  
  // Dashboard data
  stats: {
    totalEmployees: 0,
    stepsCompleted: 0,
    completionRate: 0,
    pendingEmployees: 0,
    stepProgress: [0, 0, 0, 0, 0, 0, 0] // Steps 1-7
  },
  
  // Export history
  exportHistory: [],
  
  // Audit log
  auditLog: [],
  
  /**
   * Initialize admin portal
   */
  init: function() {
    console.log('[Admin] Initializing...');
    
    // Check if user is admin
    if (!this.checkAdminAccess()) {
      return;
    }
    
    // Load initial data
    this.loadData();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Update UI
    this.updateUI();
  },
  
  /**
   * Check if current user has admin access
   * @returns {boolean} True if user is admin
   */
  checkAdminAccess: function() {
    const user = App.getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      console.warn('[Admin] Non-admin user attempted to access admin portal');
      alert('Access denied. Admin access required.');
      App.redirectToLogin();
      return false;
    }
    return true;
  },
  
  /**
   * Load admin data from backend
   */
  loadData: function() {
    console.log('[Admin] Loading data...');
    
    // Load system configuration
    API.getSystemConfig()
      .then(response => {
        if (response.success) {
          this.config = response.config;
          console.log('[Admin] Config loaded:', this.config);
        }
      })
      .catch(error => {
        console.error('[Admin] Error loading config:', error);
      });
    
    // Load stats
    API.getAdminStats()
      .then(response => {
        if (response.success) {
          this.stats = response.stats;
          console.log('[Admin] Stats loaded:', this.stats);
        }
      })
      .catch(error => {
        console.error('[Admin] Error loading stats:', error);
      });
    
    // Load export history
    API.getExportHistory()
      .then(response => {
        if (response.success) {
          this.exportHistory = response.history;
          console.log('[Admin] Export history loaded:', this.exportHistory);
        }
      })
      .catch(error => {
        console.error('[Admin] Error loading export history:', error);
      });
    
    // Load audit log
    API.getAuditLog()
      .then(response => {
        if (response.success) {
          this.auditLog = response.logs;
          console.log('[Admin] Audit log loaded:', this.auditLog);
        }
      })
      .catch(error => {
        console.error('[Admin] Error loading audit log:', error);
      });
  },
  
  /**
   * Setup event listeners
   */
  setupEventListeners: function() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => this.switchTab(e));
    });
    
    // System config form
    const configForm = document.getElementById('system-config-form');
    if (configForm) {
      configForm.addEventListener('submit', (e) => this.handleConfigSubmit(e));
    }
    
    // Reset config button
    const resetBtn = document.getElementById('reset-config-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetConfig());
    }
    
    // Quick actions
    const sendRemindersBtn = document.getElementById('send-reminders-btn');
    if (sendRemindersBtn) {
      sendRemindersBtn.addEventListener('click', () => this.sendReminders());
    }
    
    const lockSystemBtn = document.getElementById('lock-system-btn');
    if (lockSystemBtn) {
      lockSystemBtn.addEventListener('click', () => this.lockSystem());
    }
    
    const exportReportBtn = document.getElementById('export-report-btn');
    if (exportReportBtn) {
      exportReportBtn.addEventListener('click', () => this.exportReport());
    }
    
    // SFTP Export
    const triggerExportBtn = document.getElementById('trigger-export-btn');
    if (triggerExportBtn) {
      triggerExportBtn.addEventListener('click', () => this.triggerSFTPExport());
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshData());
    }
  },
  
  /**
   * Switch between dashboard tabs
   * @param {Event} e - Click event
   */
  switchTab: function(e) {
    const tab = e.target;
    const tabName = tab.dataset.tab;
    
    // Update tab classes
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Update content visibility
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`tab-${tabName}`).classList.add('active');
  },
  
  /**
   * Handle system configuration form submission
   * @param {Event} e - Submit event
   */
  handleConfigSubmit: function(e) {
    e.preventDefault();
    
    const formData = {
      hardLockDate: document.getElementById('hard-lock-date-input').value,
      reviewPeriodStart: document.getElementById('review-period-start').value,
      reviewPeriodEnd: document.getElementById('review-period-end').value,
      exceededThreshold: parseFloat(document.getElementById('performance-bracket-exceeded').value)
    };
    
    console.log('[Admin] Submitting config:', formData);
    
    API.saveSystemConfig(formData)
      .then(response => {
        if (response.success) {
          this.config = { ...this.config, ...formData };
          this.updateUI();
          this.showNotification('System configuration saved successfully', 'success');
        } else {
          this.showNotification(response.message || 'Failed to save configuration', 'error');
        }
      })
      .catch(error => {
        console.error('[Admin] Error saving config:', error);
        this.showNotification('Error saving configuration', 'error');
      });
  },
  
  /**
   * Reset configuration to defaults
   */
  resetConfig: function() {
    if (!confirm('Reset all configuration settings to defaults?')) {
      return;
    }
    
    const defaults = {
      hardLockDate: '',
      reviewPeriodStart: '',
      reviewPeriodEnd: '',
      exceededThreshold: 101
    };
    
    document.getElementById('hard-lock-date-input').value = defaults.hardLockDate;
    document.getElementById('review-period-start').value = defaults.reviewPeriodStart;
    document.getElementById('review-period-end').value = defaults.reviewPeriodEnd;
    document.getElementById('performance-bracket-exceeded').value = defaults.exceededThreshold;
    
    this.showNotification('Configuration reset to defaults (save to apply)', 'success');
  },
  
  /**
   * Send email reminders to incomplete employees
   */
  sendReminders: function() {
    console.log('[Admin] Sending email reminders...');
    
    this.showNotification('Sending email reminders to incomplete employees...', 'success');
    
    API.sendReminders()
      .then(response => {
        if (response.success) {
          this.showNotification(` reminders sent successfully`, 'success');
        } else {
          this.showNotification(response.message || 'Failed to send reminders', 'error');
        }
      })
      .catch(error => {
        console.error('[Admin] Error sending reminders:', error);
        this.showNotification('Error sending reminders', 'error');
      });
  },
  
  /**
   * Lock the system immediately
   */
  lockSystem: function() {
    if (!confirm('Are you sure you want to lock the system? After locking, ALL forms will become non-editable.')) {
      return;
    }
    
    console.log('[Admin] Locking system...');
    
    API.lockSystem()
      .then(response => {
        if (response.success) {
          this.config.hardLockDate = new Date().toISOString().split('T')[0];
          this.updateUI();
          this.showNotification('System locked successfully. All forms are now non-editable.', 'success');
        } else {
          this.showNotification(response.message || 'Failed to lock system', 'error');
        }
      })
      .catch(error => {
        console.error('[Admin] Error locking system:', error);
        this.showNotification('Error locking system', 'error');
      });
  },
  
  /**
   * Export progress report
   */
  exportReport: function() {
    console.log('[Admin] Exporting progress report...');
    
    API.exportProgressReport()
      .then(response => {
        if (response.success) {
          // Download the report
          const blob = new Blob([response.data], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `progress-report-${new Date().toISOString().split('T')[0]}.csv`;
          a.click();
          URL.revokeObjectURL(url);
          
          this.showNotification('Progress report exported successfully', 'success');
        } else {
          this.showNotification(response.message || 'Failed to export report', 'error');
        }
      })
      .catch(error => {
        console.error('[Admin] Error exporting report:', error);
        this.showNotification('Error exporting report', 'error');
      });
  },
  
  /**
   * Trigger SFTP export to SuccessFactors
   */
  triggerSFTPExport: function() {
    console.log('[Admin] Triggering SFTP export...');
    
    if (!confirm('This will export all finalized review data to SAP SuccessFactors via SFTP. Are you sure?')) {
      return;
    }
    
    const exportFormat = document.getElementById('sftp-format').value;
    
    API.triggerSFTPExport({ format: exportFormat })
      .then(response => {
        if (response.success) {
          this.exportHistory.unshift(response.exportRecord);
          this.updateExportHistoryUI();
          this.showNotification('SFTP export triggered successfully. Data is being transferred to SuccessFactors.', 'success');
        } else {
          this.showNotification(response.message || 'Failed to trigger SFTP export', 'error');
        }
      })
      .catch(error => {
        console.error('[Admin] Error triggering SFTP export:', error);
        this.showNotification('Error triggering SFTP export', 'error');
      });
  },
  
  /**
   * Refresh all admin data
   */
  refreshData: function() {
    console.log('[Admin] Refreshing data...');
    this.loadData();
    this.updateUI();
    this.showNotification('Data refreshed successfully', 'success');
  },
  
  /**
   * Update UI with current data
   */
  updateUI: function() {
    // Update user display
    const user = App.getCurrentUser();
    const userDisplay = document.getElementById('current-user');
    if (userDisplay && user) {
      userDisplay.textContent = `${user.email} (${user.role})`;
    }
    
    // Update stats
    this.updateStatsUI();
    
    // Update hard lock status
    this.updateHardLockUI();
    
    // Update progress bars
    this.updateProgressBarsUI();
    
    // Update configuration form
    this.updateConfigFormUI();
    
    // Update export history
    this.updateExportHistoryUI();
    
    // Update audit log
    this.updateAuditLogUI();
  },
  
  /**
   * Update stats UI
   */
  updateStatsUI: function() {
    document.getElementById('total-employees').textContent = this.stats.totalEmployees || 0;
    document.getElementById('steps-completed').textContent = this.stats.stepsCompleted || 0;
    document.getElementById('completion-rate').textContent = `${this.stats.completionRate || 0}%`;
    document.getElementById('pending-employees').textContent = this.stats.pendingEmployees || 0;
  },
  
  /**
   * Update hard lock status UI
   */
  updateHardLockUI: function() {
    const lockStatus = document.getElementById('lock-status');
    const lockStatusText = document.getElementById('lock-status-text');
    const lockDateDisplay = document.getElementById('hard-lock-date');
    
    if (this.config.hardLockDate) {
      lockStatus.className = 'status-indicator status-indicator--locked';
      lockStatusText.textContent = 'System Locked';
      lockStatusText.style.color = 'var(--color-violet)';
      lockDateDisplay.textContent = this.config.hardLockDate;
    } else {
      lockStatus.className = 'status-indicator status-indicator--unlocked';
      lockStatusText.textContent = 'System Unlocked';
      lockStatusText.style.color = 'var(--color-primary)';
      lockDateDisplay.textContent = 'Not set';
    }
    
    document.getElementById('performance-thresholds').textContent = `Exceeded ≥${this.config.exceededThreshold}%`;
  },
  
  /**
   * Update progress bars UI
   */
  updateProgressBarsUI: function() {
    const stepCount = this.stats.stepProgress || [0, 0, 0, 0, 0, 0, 0];
    
    for (let i = 0; i < 7; i++) {
      const progress = stepCount[i] || 0;
      const bar = document.getElementById(`step${i + 1}-bar`);
      const percentage = document.getElementById(`step${i + 1}-progress`);
      
      if (bar && percentage) {
        bar.style.width = `${progress}%`;
        percentage.textContent = `${progress}%`;
      }
    }
  },
  
  /**
   * Update configuration form UI
   */
  updateConfigFormUI: function() {
    if (this.config.hardLockDate) {
      document.getElementById('hard-lock-date-input').value = this.config.hardLockDate;
    }
    if (this.config.reviewPeriodStart) {
      document.getElementById('review-period-start').value = this.config.reviewPeriodStart;
    }
    if (this.config.reviewPeriodEnd) {
      document.getElementById('review-period-end').value = this.config.reviewPeriodEnd;
    }
    document.getElementById('performance-bracket-exceeded').value = this.config.exceededThreshold || 101;
  },
  
  /**
   * Update export history UI
   */
  updateExportHistoryUI: function() {
    const tbody = document.getElementById('export-history-body');
    if (!tbody) return;
    
    if (this.exportHistory.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #666;">No exports yet</td></tr>';
      return;
    }
    
    tbody.innerHTML = this.exportHistory.map(export => `
      <tr>
        <td>${export.timestamp}</td>
        <td><span class="badge ${export.status === 'SUCCESS' ? 'badge--success' : 'badge--warning'}">${export.status}</span></td>
        <td>${export.records || 0}</td>
        <td>${export.details || '-'}</td>
      </tr>
    `).join('');
  },
  
  /**
   * Update audit log UI
   */
  updateAuditLogUI: function() {
    const tbody = document.getElementById('audit-log-body');
    if (!tbody) return;
    
    if (this.auditLog.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #666;">No audit logs yet</td></tr>';
      return;
    }
    
    tbody.innerHTML = this.auditLog.map(log => `
      <tr>
        <td>${log.timestamp}</td>
        <td>${log.event}</td>
        <td>${log.user}</td>
        <td>${log.action}</td>
        <td><span class="badge badge--success">${log.status}</span></td>
      </tr>
    `).join('');
  },
  
  /**
   * Show notification message
   * @param {string} message - Message to display
   * @param {string} type - Notification type ('success' or 'error')
   */
  showNotification: function(message, type) {
    const notificationArea = document.getElementById('notification-area');
    if (!notificationArea) return;
    
    notificationArea.textContent = message;
    notificationArea.className = `notification-area notification-area--${type} visible`;
    
    // Hide after 5 seconds
    setTimeout(() => {
      notificationArea.classList.remove('visible');
    }, 5000);
  },
  
  /**
   * Get current user object
   * @returns {Object|null} User object or null
   */
  getCurrentUser: function() {
    return App.getCurrentUser();
  }
};

// Initialize admin portal when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  Admin.init();
});

// Also initialize immediately if DOM is already ready
if (document.readyState === 'loading') {
  // Still loading
} else {
  // Already ready
  Admin.init();
}
