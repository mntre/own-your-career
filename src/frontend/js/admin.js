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
    
    // Always set up UI event listeners (tabs, cards, upload) so page is interactive
    this.setupEventListeners();

    // Check if user is admin — gate data loading & sensitive actions
    // Skip redirect for local testing (let App handle redirect if needed)
    if (this.checkAdminAccess()) {
      // Load initial data
      this.loadData();
      // Update UI
      this.updateUI();
    }
  },
  
  /**
   * Check if current user has admin access
   * @returns {boolean} True if user is admin
   */
  checkAdminAccess: function() {
    try {
      const user = App && App.getCurrentUser ? App.getCurrentUser() : null;
      if (!user || user.role !== 'ADMIN') {
        console.warn('[Admin] No admin session — running in local/dev mode. Data operations disabled.');
        return false;
      }
      return true;
    } catch (e) {
      console.warn('[Admin] App not available, running standalone.');
      return false;
    }
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
          this.updateStatsUI();
          this.updateProgressBarsUI();
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

    // Employee CSV Upload
    this.setupEmployeeUpload();

    // Data Management Cards
    this.setupDataMgmtCards();

    // Employee Database Viewer (A2)
    this.initDatabaseViewer();

    // Role Assignment (A5)
    this.initRoleAssignment();
  },

  /**
   * Setup data management card click handlers
   */
  setupDataMgmtCards: function() {
    const cards = document.querySelectorAll('.data-mgmt-card');
    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const section = card.dataset.section;
        this.showDataMgmtSection(section);
      });
    });
  },

  /**
   * Show a specific data management section
   * @param {string} section - Section name (e.g., 'employee-upload')
   */
  showDataMgmtSection: function(section) {
    // Hide all sections
    document.querySelectorAll('.data-mgmt-section').forEach(s => {
      s.style.display = 'none';
    });

    // Show selected section
    const sectionEl = document.getElementById(`section-${section}`);
    if (sectionEl) {
      sectionEl.style.display = 'block';
      
      // Add back button if not already present
      this.addBackToGridButton(sectionEl, section);
      
      // Initialize section-specific data
      this.initSectionData(section);

      // Scroll to section
      sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  /**
   * Initialize section-specific data when section is shown
   * @param {string} section - Section name
   */
  initSectionData: function(section) {
    switch (section) {
      case 'employee-database':
        this.loadDatabaseViewer();
        break;
      case 'role-assignment':
        this.loadRoleAssignmentData();
        break;
      case 'core-skills':
        this.loadCoreSkills();
        break;
      case 'leadership-skills':
        this.loadLeadershipSkills();
        break;
      case 'org-hierarchy':
        this.loadOrgHierarchy();
        break;
      default:
        break;
    }
  },

  /**
   * Add a "Back to Grid" button to a section if it doesn't have one
   * @param {HTMLElement} sectionEl - The section element
   * @param {string} sectionName - The section name
   */
  addBackToGridButton: function(sectionEl, sectionName) {
    // Check if there's already a back button in this section
    const existingBackButton = sectionEl.querySelector('.back-to-grid-btn');
    if (existingBackButton) {
      return;
    }

    const dashboardCardHeader = sectionEl.querySelector('.dashboard-card__header');
    if (dashboardCardHeader) {
      // Create back button
      const backButton = document.createElement('button');
      backButton.className = 'back-to-grid-btn btn btn--secondary';
      backButton.innerHTML = '← Back to Grid';
      backButton.style.cssText = 'padding: 8px 16px; font-size: 13px; margin-left: auto;';
      backButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hideDataMgmtSection(sectionName);
      });

      // Add to the header
      dashboardCardHeader.appendChild(backButton);
    }
  },

  /**
   * Hide a data management section and return to grid view
   * @param {string} section - Section name (e.g., 'employee-upload')
   */
  hideDataMgmtSection: function(section) {
    // Hide the current section
    const sectionEl = document.getElementById(`section-${section}`);
    if (sectionEl) {
      sectionEl.style.display = 'none';
    }

    // Show the grid and scroll to it
    const grid = document.querySelector('.data-mgmt-grid');
    if (grid) {
      grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
   * Update last action timestamp (called when admin takes an action like upload, derive roles, etc.)
   * @param {string} actionName - Name of the action (e.g., "Employee Upload", "Role Derivation")
   */
  updateLastActionTime: function(actionName) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const lastUpdatedEl = document.getElementById('last-updated');
    if (lastUpdatedEl) {
      lastUpdatedEl.textContent = `Last updated: ${actionName} on ${dateStr} at ${timeStr}`;
    }
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
    
    tbody.innerHTML = this.exportHistory.map(record => `
      <tr>
        <td>${record.timestamp}</td>
        <td><span class="badge ${record.status === 'SUCCESS' ? 'badge--success' : 'badge--warning'}">${record.status}</span></td>
        <td>${record.records || 0}</td>
        <td>${record.details || '-'}</td>
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
  },

  /* --------------------------------------------------------------------------
     EMPLOYEE CSV UPLOAD — Data Management
     -------------------------------------------------------------------------- */

  /** Parsed employee data from CSV */
  employeeData: [],

  /** Raw headers from the uploaded CSV */
  employeeHeaders: [],

  /** Minimum required columns for validation (just need employee ID and email to be useful) */
  MINIMUM_REQUIRED: ['Employee No.', 'Email Address'],

  /**
   * Setup employee CSV upload event listeners
   */
  setupEmployeeUpload: function() {
    const uploadZone = document.getElementById('employee-upload-zone');
    const fileInput = document.getElementById('employee-csv-input');
    const clearBtn = document.getElementById('employee-clear-file');
    const uploadBtn = document.getElementById('employee-upload-btn');
    const templateBtn = document.getElementById('employee-download-template-btn');

    if (!uploadZone || !fileInput) return;

    // Click to browse
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleEmployeeFile(e.target.files[0]);
      }
    });

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) {
        this.handleEmployeeFile(e.dataTransfer.files[0]);
      }
    });

    // Clear file
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearEmployeeFile());
    }

    // Upload button
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => this.uploadEmployeeData());
    }

    // Download template
    if (templateBtn) {
      templateBtn.addEventListener('click', () => this.downloadEmployeeTemplate());
    }

    // Role derivation button
    const deriveRolesBtn = document.getElementById('derive-roles-btn');
    if (deriveRolesBtn) {
      deriveRolesBtn.addEventListener('click', () => this.deriveRoles());
    }

    // Role assignment button
    const assignRolesBtn = document.getElementById('assign-roles-btn');
    if (assignRolesBtn) {
      assignRolesBtn.addEventListener('click', () => this.showRoleAssignmentModal());
    }
  },

  /**
   * Handle selected employee CSV file
   * @param {File} file - The selected CSV file
   */
  handleEmployeeFile: function(file) {
    if (!file.name.endsWith('.csv')) {
      this.showNotification('Please select a CSV file (.csv)', 'error');
      return;
    }

    // Show file info
    document.getElementById('employee-file-info').style.display = 'block';
    document.getElementById('employee-file-name').textContent = file.name;
    document.getElementById('employee-file-size').textContent = this.formatFileSize(file.size);

    // Read and parse CSV
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target.result;
      this.parseEmployeeCSV(csvText);
    };
    reader.onerror = () => {
      this.showNotification('Error reading file', 'error');
    };
    reader.readAsText(file);
  },

  /**
   * Parse employee CSV text — ingests ALL columns as-is from the SAP export
   * @param {string} csvText - Raw CSV content
   */
  parseEmployeeCSV: function(csvText) {
    // Remove BOM if present
    if (csvText.charCodeAt(0) === 0xFEFF) {
      csvText = csvText.slice(1);
    }

    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');

    if (lines.length < 2) {
      this.showNotification('CSV file must have a header row and at least one data row', 'error');
      return;
    }

    // Parse header — take ALL columns as-is
    const headers = this.parseCSVLine(lines[0]).map(h => h.trim());
    this.employeeHeaders = headers;

    const errors = [];

    // Check minimum required columns exist
    const missingRequired = this.MINIMUM_REQUIRED.filter(col =>
      !headers.some(h => h.toLowerCase() === col.toLowerCase())
    );

    if (missingRequired.length > 0) {
      errors.push(`Missing required columns: ${missingRequired.join(', ')}`);
    }

    // Find key column indices for validation
    const emailIdx = headers.findIndex(h => h.toLowerCase() === 'email address');
    const empNoIdx = headers.findIndex(h => h.toLowerCase() === 'employee no.');

    // Parse ALL data rows with ALL columns
    const employees = [];
    const emails = new Set();
    const employeeNos = new Set();

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === 0 || values.every(v => v.trim() === '')) continue;

      // Build row object with ALL headers
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = idx < values.length ? values[idx].trim() : '';
      });

      // Basic validation on key fields
      const empNo = empNoIdx >= 0 ? (values[empNoIdx] || '').trim() : '';
      const email = emailIdx >= 0 ? (values[emailIdx] || '').trim() : '';

      if (empNo && employeeNos.has(empNo)) {
        errors.push(`Row ${i + 1}: Duplicate Employee No. "${empNo}"`);
      } else if (empNo) {
        employeeNos.add(empNo);
      }

      if (email && emails.has(email.toLowerCase())) {
        errors.push(`Row ${i + 1}: Duplicate Email "${email}"`);
      } else if (email) {
        emails.add(email.toLowerCase());
      }

      employees.push(row);

      // Cap errors at 20
      if (errors.length >= 20) {
        errors.push('... (more errors not shown — fix the above first)');
        break;
      }
    }

    // Store parsed data
    this.employeeData = employees;

    // Show preview
    this.showEmployeePreview(employees, errors);
  },

  /**
   * Parse a single CSV line handling quoted fields
   * @param {string} line - CSV line
   * @returns {string[]} Array of field values
   */
  parseCSVLine: function(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
    }
    result.push(current);
    return result;
  },

  /**
   * Show employee preview table and validation results.
   * Dynamically renders ALL columns from the CSV.
   * @param {Object[]} employees - Parsed employee data
   * @param {string[]} errors - Validation errors
   */
  showEmployeePreview: function(employees, errors) {
    const previewSection = document.getElementById('employee-preview-section');
    const rowCount = document.getElementById('employee-row-count');
    const validationStatus = document.getElementById('employee-validation-status');
    const validationErrors = document.getElementById('employee-validation-errors');
    const errorList = document.getElementById('employee-error-list');
    const previewTable = document.getElementById('employee-preview-table');
    const uploadBtn = document.getElementById('employee-upload-btn');

    previewSection.style.display = 'block';
    rowCount.textContent = employees.length;

    // Show errors
    if (errors.length > 0) {
      validationStatus.textContent = `${errors.length} Error(s)`;
      validationStatus.className = 'badge badge--warning';
      validationErrors.style.display = 'block';
      errorList.innerHTML = errors.map(e => `<li>${e}</li>`).join('');
      uploadBtn.disabled = true;
    } else {
      validationStatus.textContent = 'Valid ✓';
      validationStatus.className = 'badge badge--success';
      validationErrors.style.display = 'none';
      uploadBtn.disabled = false;
    }

    // Pick key columns to display in preview (show max 8 for readability)
    const displayColumns = this.getPreviewColumns(this.employeeHeaders);

    // Build dynamic table header
    const thead = previewTable.querySelector('thead');
    thead.innerHTML = '<tr>' + displayColumns.map(col => `<th>${this.escapeHTML(col)}</th>`).join('') + '</tr>';

    // Render preview rows (max 50)
    const previewBody = document.getElementById('employee-preview-body');
    const previewRows = employees.slice(0, 50);
    previewBody.innerHTML = previewRows.map(emp => {
      const cells = displayColumns.map(col => `<td>${this.escapeHTML(emp[col] || '')}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    if (employees.length > 50) {
      previewBody.innerHTML += `<tr><td colspan="${displayColumns.length}" style="text-align: center; color: #666; font-style: italic;">... showing first 50 of ${employees.length} rows</td></tr>`;
    }

    // Show total column count
    const headerInfo = document.querySelector('#employee-preview-section h3');
    if (headerInfo) {
      headerInfo.innerHTML = `Preview (<span id="employee-row-count">${employees.length}</span> rows, ${this.employeeHeaders.length} columns)`;
    }
  },

  /**
   * Pick key columns for preview display (max 8 for readability).
   * Prioritizes important SAP fields but shows whatever is available.
   * @param {string[]} allHeaders - All CSV headers
   * @returns {string[]} Columns to display
   */
  getPreviewColumns: function(allHeaders) {
    // Priority columns to show if they exist
    const priority = [
      'Employee No.',
      'Full Name',
      'Email Address',
      'Business Group (Label)',
      'Department (Label)',
      'Band (Picklist Label)',
      'Position Position Title (Label)',
      'Immediate Supervisor'
    ];

    const display = [];
    priority.forEach(col => {
      const match = allHeaders.find(h => h.toLowerCase() === col.toLowerCase());
      if (match) display.push(match);
    });

    // If fewer than 8, fill from remaining headers
    if (display.length < 8) {
      allHeaders.forEach(h => {
        if (display.length < 8 && !display.includes(h)) {
          display.push(h);
        }
      });
    }

    return display;
  },

  /**
   * Upload parsed employee data to backend — sends ALL columns as-is
   */
  uploadEmployeeData: function() {
    if (this.employeeData.length === 0) {
      this.showNotification('No employee data to upload', 'error');
      return;
    }

    if (!confirm(`Upload ${this.employeeData.length} employees (${this.employeeHeaders.length} columns) to the system? This will REPLACE the current employee database.`)) {
      return;
    }

    const uploadBtn = document.getElementById('employee-upload-btn');
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';

    console.log('[Admin] Uploading employee data:', this.employeeData.length, 'records,', this.employeeHeaders.length, 'columns');

    API.uploadEmployeeDatabase({ headers: this.employeeHeaders, rows: this.employeeData })
      .then(response => {
        if (response.success) {
          const resultDiv = document.getElementById('employee-upload-result');
          resultDiv.style.display = 'block';
          resultDiv.style.background = '#e6f9f0';
          resultDiv.style.border = '1px solid #0a7c42';
          resultDiv.style.color = '#0a7c42';
          resultDiv.innerHTML = `<strong>✓ Upload Successful!</strong><br>${response.message || this.employeeData.length + ' employees uploaded to the system.'}`;

          this.showNotification(`${this.employeeData.length} employees uploaded successfully`, 'success');
          this.updateLastActionTime('Employee Upload');

          // Show role derivation section
          document.getElementById('role-derivation-section').style.display = 'block';

          // Update stats
          if (this.stats) {
            this.stats.totalEmployees = this.employeeData.length;
            this.updateStatsUI();
          }

          // Fetch and display current role counts
          this.loadRoleCounts();
        } else {
          this.showNotification(response.message || 'Upload failed', 'error');
          uploadBtn.disabled = false;
        }
        uploadBtn.textContent = 'Upload to System';
      })
      .catch(error => {
        console.error('[Admin] Upload error:', error);
        this.showNotification('Error uploading employee data: ' + error.message, 'error');
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload to System';
      });
  },

  /**
   * Load and display current role counts
   */
  loadRoleCounts: function() {
    API.getRoleAssignmentData()
      .then(response => {
        if (response.success) {
          const counts = response.roleCount;
          document.getElementById('role-count-manager').textContent = counts.MANAGER || 0;
          document.getElementById('role-count-spoc').textContent = counts.DATA_SPOC || 0;
          document.getElementById('role-count-employee').textContent = counts.EMPLOYEE || 0;
        }
      })
      .catch(error => {
        console.error('[Admin] Error loading role counts:', error);
      });
  },

  /**
   * Derive roles automatically from immediate_supervisor field
   */
  deriveRoles: function() {
    const deriveBtn = document.getElementById('derive-roles-btn');
    deriveBtn.disabled = true;
    deriveBtn.textContent = 'Deriving roles...';

    API.deriveRolesFromHierarchy()
      .then(response => {
        if (response.success) {
          const resultDiv = document.getElementById('role-derivation-result');
          resultDiv.style.display = 'block';
          resultDiv.style.background = '#e6f9f0';
          resultDiv.style.borderColor = '#0a7c42';
          resultDiv.style.color = '#0a7c42';

          const roles = response.roles || {};
          const unresolvedNote = response.unresolved > 0 
            ? `<br><span style="color: #e65100;">⚠️ ${response.unresolved} unresolved supervisor(s) — check Role Assignment for details</span>` 
            : '';

        resultDiv.innerHTML = `
            <strong>✓ Role Derivation Complete!</strong><br>
            ${response.message || 'Role assignment complete.'}<br>
            <small style="margin-top: 8px; display: block;">
              Supervisors matched: ${response.matched || 0} | 
              External (not in file): ${response.external || 0} | 
              Managers detected: ${response.managersDetected || 0} | 
              Manual roles preserved: ${response.preserved || 0}
            </small>
            <small style="display: block; margin-top: 4px;">
              Final roles — Managers: ${roles.MANAGER || 0} | 
              Data SPOCs: ${roles.DATA_SPOC || 0} | 
              Employees: ${roles.EMPLOYEE || 0} | 
              Admins: ${roles.ADMIN || 0}
            </small>
            ${unresolvedNote}
          `;

          this.showNotification(`${response.managersDetected || 0} managers auto-detected`, 'success');
          this.updateLastActionTime('Role Derivation');
          this.loadRoleCounts();
        } else {
          const resultDiv = document.getElementById('role-derivation-result');
          resultDiv.style.display = 'block';
          resultDiv.style.background = '#ffebee';
          resultDiv.style.borderColor = '#c62828';
          resultDiv.style.color = '#c62828';
          resultDiv.innerHTML = `<strong>✗ Error:</strong> ${response.message}`;
          this.showNotification(response.message || 'Failed to derive roles', 'error');
        }
        deriveBtn.disabled = false;
        deriveBtn.textContent = 'Auto-Derive Roles from Hierarchy';
      })
      .catch(error => {
        console.error('[Admin] Role derivation error:', error);
        const resultDiv = document.getElementById('role-derivation-result');
        resultDiv.style.display = 'block';
        resultDiv.style.background = '#ffebee';
        resultDiv.style.borderColor = '#c62828';
        resultDiv.style.color = '#c62828';
        resultDiv.innerHTML = `<strong>✗ Error:</strong> ${error.message}`;
        this.showNotification('Error deriving roles: ' + error.message, 'error');
        deriveBtn.disabled = false;
        deriveBtn.textContent = 'Auto-Derive Roles from Hierarchy';
      });
  },

  /**
   * Show role assignment modal for manual role changes
   */
  showRoleAssignmentModal: function() {
    // Navigate to the Role Assignment card section
    const cards = document.querySelectorAll('.data-mgmt-card');
    const sections = document.querySelectorAll('.data-mgmt-section');
    const grid = document.querySelector('.data-mgmt-grid');

    // Hide grid and other sections
    if (grid) grid.style.display = 'none';
    sections.forEach(s => s.style.display = 'none');

    // Show role assignment section
    const raSection = document.getElementById('section-role-assignment');
    if (raSection) {
      raSection.style.display = 'block';
      this.loadRoleAssignmentData();
    }
  },

  /* --------------------------------------------------------------------------
     A2: EMPLOYEE DATABASE VIEWER
     -------------------------------------------------------------------------- */

  /** Database viewer state */
  dbViewerState: {
    employees: [],
    filtered: [],
    page: 1,
    pageSize: 25,
    search: '',
    filterDept: '',
    filterRole: '',
    filterGroup: ''
  },

  /**
   * Initialize Employee Database Viewer
   */
  initDatabaseViewer: function() {
    const searchInput = document.getElementById('db-search-input');
    const filterDept = document.getElementById('db-filter-department');
    const filterRole = document.getElementById('db-filter-role');
    const filterGroup = document.getElementById('db-filter-group');
    const prevBtn = document.getElementById('db-prev-btn');
    const nextBtn = document.getElementById('db-next-btn');
    const exportBtn = document.getElementById('db-export-csv-btn');

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.dbViewerState.search = searchInput.value.trim().toLowerCase();
        this.dbViewerState.page = 1;
        this.filterDatabaseView();
      });
    }

    if (filterDept) {
      filterDept.addEventListener('change', () => {
        this.dbViewerState.filterDept = filterDept.value;
        this.dbViewerState.page = 1;
        this.filterDatabaseView();
      });
    }

    if (filterRole) {
      filterRole.addEventListener('change', () => {
        this.dbViewerState.filterRole = filterRole.value;
        this.dbViewerState.page = 1;
        this.filterDatabaseView();
      });
    }

    if (filterGroup) {
      filterGroup.addEventListener('change', () => {
        this.dbViewerState.filterGroup = filterGroup.value;
        this.dbViewerState.page = 1;
        this.filterDatabaseView();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.dbViewerState.page > 1) {
          this.dbViewerState.page--;
          this.renderDatabaseTable();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const maxPage = Math.ceil(this.dbViewerState.filtered.length / this.dbViewerState.pageSize);
        if (this.dbViewerState.page < maxPage) {
          this.dbViewerState.page++;
          this.renderDatabaseTable();
        }
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportDatabaseCSV());
    }
  },

  /**
   * Load employee database data from API
   */
  loadDatabaseViewer: function() {
    API.getRoleAssignmentData()
      .then(response => {
        if (response.success && Array.isArray(response.employees)) {
          this.dbViewerState.employees = response.employees;
          this.dbViewerState.filtered = response.employees;
          this.dbViewerState.page = 1;

          // Populate department and group filters
          this.populateDBFilters(response.employees);

          // Update stats
          this.updateDBStats(response.roleCount || {});

          // Render table
          this.renderDatabaseTable();
        }
      })
      .catch(error => {
        console.error('[Admin] Error loading database viewer:', error);
      });
  },

  /**
   * Populate department and group filter dropdowns
   * @param {Object[]} employees
   */
  populateDBFilters: function(employees) {
    const departments = [...new Set(employees.map(e => e.department).filter(Boolean))].sort();
    const groups = [...new Set(employees.map(e => e.group || e.business_group_label).filter(Boolean))].sort();

    const deptSelect = document.getElementById('db-filter-department');
    const groupSelect = document.getElementById('db-filter-group');

    if (deptSelect) {
      deptSelect.innerHTML = '<option value="">All Departments</option>' +
        departments.map(d => `<option value="${this.escapeHTML(d)}">${this.escapeHTML(d)}</option>`).join('');
    }

    if (groupSelect) {
      groupSelect.innerHTML = '<option value="">All Groups</option>' +
        groups.map(g => `<option value="${this.escapeHTML(g)}">${this.escapeHTML(g)}</option>`).join('');
    }
  },

  /**
   * Update database stats counters
   * @param {Object} roleCount
   */
  updateDBStats: function(roleCount) {
    const total = (roleCount.MANAGER || 0) + (roleCount.DATA_SPOC || 0) + (roleCount.EMPLOYEE || 0) + (roleCount.ADMIN || 0);
    document.getElementById('db-total-count').textContent = total;
    document.getElementById('db-manager-count').textContent = roleCount.MANAGER || 0;
    document.getElementById('db-spoc-count').textContent = roleCount.DATA_SPOC || 0;
    document.getElementById('db-employee-count').textContent = roleCount.EMPLOYEE || 0;
  },

  /**
   * Filter database view based on search and filters
   */
  filterDatabaseView: function() {
    const state = this.dbViewerState;
    let filtered = state.employees;

    if (state.search) {
      filtered = filtered.filter(e =>
        (e.full_name || '').toLowerCase().includes(state.search) ||
        (e.email || '').toLowerCase().includes(state.search) ||
        (e.employee_no || '').toLowerCase().includes(state.search)
      );
    }

    if (state.filterDept) {
      filtered = filtered.filter(e => e.department === state.filterDept);
    }

    if (state.filterRole) {
      filtered = filtered.filter(e => e.role === state.filterRole);
    }

    if (state.filterGroup) {
      filtered = filtered.filter(e => (e.group || e.business_group_label) === state.filterGroup);
    }

    state.filtered = filtered;
    this.renderDatabaseTable();
  },

  /**
   * Render database table with pagination
   */
  renderDatabaseTable: function() {
    const state = this.dbViewerState;
    const tbody = document.getElementById('db-employee-tbody');
    const pageInfo = document.getElementById('db-page-info');
    const prevBtn = document.getElementById('db-prev-btn');
    const nextBtn = document.getElementById('db-next-btn');
    const resultsInfo = document.getElementById('db-results-count');

    if (!tbody) return;

    const total = state.filtered.length;
    const maxPage = Math.max(1, Math.ceil(total / state.pageSize));
    const start = (state.page - 1) * state.pageSize;
    const end = Math.min(start + state.pageSize, total);
    const pageData = state.filtered.slice(start, end);

    // Results info
    if (resultsInfo) {
      resultsInfo.textContent = total === 0 ? 'No employees found' : `Showing ${start + 1}–${end} of ${total} employees`;
    }

    // Empty state
    if (pageData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="db-table__empty">No employees match your search.</td></tr>';
    } else {
      tbody.innerHTML = pageData.map(emp => `
        <tr>
          <td>${this.escapeHTML(emp.employee_no)}</td>
          <td>${this.escapeHTML(emp.full_name)}</td>
          <td>${this.escapeHTML(emp.email)}</td>
          <td>${this.escapeHTML(emp.department || '')}</td>
          <td>${this.escapeHTML(emp.band || '')}</td>
          <td><span class="role-badge role-badge--${(emp.role || 'employee').toLowerCase()}">${this.escapeHTML(emp.role || 'EMPLOYEE')}</span></td>
          <td>${this.escapeHTML(emp.immediate_supervisor || '')}</td>
        </tr>
      `).join('');
    }

    // Pagination controls
    if (pageInfo) pageInfo.textContent = `Page ${state.page} of ${maxPage}`;
    if (prevBtn) prevBtn.disabled = state.page <= 1;
    if (nextBtn) nextBtn.disabled = state.page >= maxPage;
  },

  /**
   * Export filtered database view as CSV
   */
  exportDatabaseCSV: function() {
    const data = this.dbViewerState.filtered;
    if (data.length === 0) {
      this.showNotification('No data to export', 'error');
      return;
    }

    const headers = ['Employee No.', 'Full Name', 'Email', 'Department', 'Band', 'Role', 'Immediate Supervisor'];
    const rows = data.map(emp => [
      emp.employee_no || '',
      emp.full_name || '',
      emp.email || '',
      emp.department || '',
      emp.band || '',
      emp.role || 'EMPLOYEE',
      emp.immediate_supervisor || ''
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee-database-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    this.showNotification(`Exported ${data.length} employees to CSV`, 'success');
  },

  /* --------------------------------------------------------------------------
     A5: ROLE ASSIGNMENT
     -------------------------------------------------------------------------- */

  /** Role assignment state */
  raState: {
    employees: [],
    filtered: [],
    page: 1,
    pageSize: 25,
    search: ''
  },

  /**
   * Initialize Role Assignment section
   */
  initRoleAssignment: function() {
    const searchInput = document.getElementById('ra-search-input');
    const prevBtn = document.getElementById('ra-prev-btn');
    const nextBtn = document.getElementById('ra-next-btn');
    const bulkInput = document.getElementById('ra-bulk-csv-input');
    const bulkBtn = document.getElementById('ra-bulk-upload-btn');

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.raState.search = searchInput.value.trim().toLowerCase();
        this.raState.page = 1;
        this.filterRoleAssignment();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.raState.page > 1) {
          this.raState.page--;
          this.renderRoleAssignmentTable();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const maxPage = Math.ceil(this.raState.filtered.length / this.raState.pageSize);
        if (this.raState.page < maxPage) {
          this.raState.page++;
          this.renderRoleAssignmentTable();
        }
      });
    }

    if (bulkInput) {
      bulkInput.addEventListener('change', (e) => {
        if (bulkBtn) bulkBtn.disabled = !e.target.files.length;
      });
    }

    if (bulkBtn) {
      bulkBtn.addEventListener('click', () => this.handleBulkRoleUpload());
    }
  },

  /**
   * Load role assignment data from API
   */
  loadRoleAssignmentData: function() {
    API.getRoleAssignmentData()
      .then(response => {
        if (response.success && Array.isArray(response.employees)) {
          this.raState.employees = response.employees;
          this.raState.filtered = response.employees;
          this.raState.page = 1;

          // Update role counts
          const counts = response.roleCount || {};
          document.getElementById('ra-manager-count').textContent = counts.MANAGER || 0;
          document.getElementById('ra-spoc-count').textContent = counts.DATA_SPOC || 0;
          document.getElementById('ra-employee-count').textContent = counts.EMPLOYEE || 0;
          document.getElementById('ra-admin-count').textContent = counts.ADMIN || 0;

          // Render table
          this.renderRoleAssignmentTable();
        }
      })
      .catch(error => {
        console.error('[Admin] Error loading role assignment data:', error);
      });
  },

  /**
   * Filter role assignment list
   */
  filterRoleAssignment: function() {
    const search = this.raState.search;
    if (!search) {
      this.raState.filtered = this.raState.employees;
    } else {
      this.raState.filtered = this.raState.employees.filter(e =>
        (e.full_name || '').toLowerCase().includes(search) ||
        (e.email || '').toLowerCase().includes(search) ||
        (e.employee_no || '').toLowerCase().includes(search)
      );
    }
    this.renderRoleAssignmentTable();
  },

  /**
   * Render role assignment table with dropdown per employee
   */
  renderRoleAssignmentTable: function() {
    const state = this.raState;
    const tbody = document.getElementById('ra-tbody');
    const pageInfo = document.getElementById('ra-page-info');
    const prevBtn = document.getElementById('ra-prev-btn');
    const nextBtn = document.getElementById('ra-next-btn');

    if (!tbody) return;

    const total = state.filtered.length;
    const maxPage = Math.max(1, Math.ceil(total / state.pageSize));
    const start = (state.page - 1) * state.pageSize;
    const end = Math.min(start + state.pageSize, total);
    const pageData = state.filtered.slice(start, end);

    if (pageData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="db-table__empty">No employees match your search.</td></tr>';
    } else {
      tbody.innerHTML = pageData.map(emp => {
        const role = emp.role || 'EMPLOYEE';
        return `
          <tr>
            <td>${this.escapeHTML(emp.employee_no)}</td>
            <td>${this.escapeHTML(emp.full_name)}</td>
            <td>${this.escapeHTML(emp.email)}</td>
            <td>${this.escapeHTML(emp.department || '')}</td>
            <td><span class="role-badge role-badge--${role.toLowerCase()}">${role}</span></td>
            <td>
              <select class="role-action-select" data-emp-no="${this.escapeHTML(emp.employee_no)}" aria-label="Change role for ${this.escapeHTML(emp.full_name)}">
                <option value="EMPLOYEE" ${role === 'EMPLOYEE' ? 'selected' : ''}>Employee</option>
                <option value="MANAGER" ${role === 'MANAGER' ? 'selected' : ''}>Manager</option>
                <option value="DATA_SPOC" ${role === 'DATA_SPOC' ? 'selected' : ''}>Data SPOC</option>
                <option value="ADMIN" ${role === 'ADMIN' ? 'selected' : ''}>Admin</option>
              </select>
            </td>
          </tr>
        `;
      }).join('');

      // Attach change listeners to dropdowns
      tbody.querySelectorAll('.role-action-select').forEach(select => {
        select.addEventListener('change', (e) => {
          const empNo = e.target.dataset.empNo;
          const newRole = e.target.value;
          this.updateSingleRole(empNo, newRole);
        });
      });
    }

    if (pageInfo) pageInfo.textContent = `Page ${state.page} of ${maxPage}`;
    if (prevBtn) prevBtn.disabled = state.page <= 1;
    if (nextBtn) nextBtn.disabled = state.page >= maxPage;
  },

  /**
   * Update a single employee's role
   * @param {string} empNo
   * @param {string} newRole
   */
  updateSingleRole: function(empNo, newRole) {
    API.updateEmployeeRole(empNo, newRole)
      .then(response => {
        if (response.success) {
          this.showNotification(`Role updated: ${empNo} → ${newRole}`, 'success');

          // Update local state
          const emp = this.raState.employees.find(e => e.employee_no === empNo);
          if (emp) emp.role = newRole;

          // Refresh counts
          this.loadRoleCounts();
        } else {
          this.showNotification(response.message || 'Failed to update role', 'error');
        }
      })
      .catch(error => {
        console.error('[Admin] Error updating role:', error);
        this.showNotification('Error updating role: ' + error.message, 'error');
      });
  },

  /**
   * Handle bulk role CSV upload
   */
  handleBulkRoleUpload: function() {
    const fileInput = document.getElementById('ra-bulk-csv-input');
    if (!fileInput || !fileInput.files.length) return;

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const csvText = e.target.result;
      const lines = csvText.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        this.showNotification('CSV must have a header and at least 1 row', 'error');
        return;
      }

      const headers = this.parseCSVLine(lines[0]);
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        const row = {};
        headers.forEach((h, idx) => { row[h.trim()] = (values[idx] || '').trim(); });
        rows.push(row);
      }

      API.updateRolesBulk({ headers: headers, rows: rows })
        .then(response => {
          if (response.success) {
            this.showNotification(response.message || `${response.updated} roles updated`, 'success');
            this.loadRoleAssignmentData();
          } else {
            this.showNotification(response.message || 'Bulk update failed', 'error');
          }
        })
        .catch(error => {
          this.showNotification('Error: ' + error.message, 'error');
        });
    };

    reader.readAsText(file);
  },

  /**
   * Clear the selected file and reset preview
   */
  clearEmployeeFile: function() {
    document.getElementById('employee-csv-input').value = '';
    document.getElementById('employee-file-info').style.display = 'none';
    document.getElementById('employee-preview-section').style.display = 'none';
    document.getElementById('employee-upload-result').style.display = 'none';
    this.employeeData = [];
  },

  /**
   * Download a sample CSV template matching SAP HRMF format
   */
  downloadEmployeeTemplate: function() {
    const header = 'HR Business Partner,Employee No.,Full Name,Last Name,First Name,Middle Name,Employment Status (Picklist Label),Position Position Title (Label),Band (Picklist Label),Pathway (Pathway Code),Pathway (Label),Job Code (Job Code),Job Code (Label),Business Group (Group Code),Business Group (Label),Department (Department Code),Department (Label),Cost Center (externalCode),Cost Center (Label),Business Area (Picklist Label),Immediate Supervisor,OT Beyond 4 hours - Approver,Assignment Code,Base of Assignment (Assignment Name),Affiliate (Label),Gender,Email Address';
    const sampleRow = 'Maria Christine Ebreo,13989,"Abacan, Rachel Aranas",Abacan,Rachel,Aranas,Regular,Support Engineer I,Team Member (E),CNVRG-P04,Professional - Technical (Non-IT),CNVRG-PT4,Engineer I,1068,Infrastructure Business Group,1068-D05,Facilities Implementation,1068040000,Facilities Implementation,DOE - Direct Expense,Renato Albornoz,Rodel Banal,CNVRG-G17-01,"Reliance Center, Pasig",Converge ICT Solutions Inc.,F,sample.employee@convergeict.com';
    const csv = header + '\n' + sampleRow + '\n';

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee-database-template-SAP.csv';
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Escape HTML to prevent XSS
   * @param {string} str - Raw string
   * @returns {string} Escaped string
   */
  escapeHTML: function(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted size string
   */
  formatFileSize: function(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  },

  /* --------------------------------------------------------------------------
     CORE SKILLS DEFINITION (A3) — Item #35
     -------------------------------------------------------------------------- */

  loadCoreSkills: function() {
    const tbody = document.getElementById('core-skills-tbody');
    if (!tbody) return;

    if (typeof API !== 'undefined' && API.getSkillDefinitions) {
      API.getSkillDefinitions().then(result => {
        if (result.success && Array.isArray(result.skills)) {
          if (result.skills.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999;">No core skills defined yet. Add one below.</td></tr>';
          } else {
            tbody.innerHTML = result.skills.map(sk => `
              <tr>
                <td>${sk.skill_name}</td>
                <td>${sk.description || '—'}</td>
                <td>${sk.required_level_per_band || '—'}</td>
                <td><button class="btn btn--secondary" style="padding: 4px 8px; font-size: 12px;" onclick="Admin.editCoreSkill('${sk.skill_name}', '${sk.description || ''}', '${sk.required_level_per_band || ''}')">Edit</button></td>
              </tr>
            `).join('');
          }
        } else {
          tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #c62828;">Error loading skills</td></tr>';
        }
      }).catch(() => {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999;">Could not connect to server.</td></tr>';
      });
    }

    // Wire form submission
    const form = document.getElementById('core-skill-form');
    if (form && !form.dataset.wired) {
      form.dataset.wired = 'true';
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const skillName = document.getElementById('core-skill-name').value.trim();
        const description = document.getElementById('core-skill-desc').value.trim();
        const levels = document.getElementById('core-skill-levels').value.trim();

        let parsedLevels = null;
        if (levels) { try { parsedLevels = JSON.parse(levels); } catch (e) { alert('Invalid JSON for levels'); return; } }

        if (typeof API !== 'undefined' && API.request) {
          API.request('POST', '/admin/skill-definitions', { skillName, description, requiredLevelPerBand: parsedLevels })
            .then(r => { if (r.success) { alert('Core skill saved!'); this.loadCoreSkills(); form.reset(); } else { alert(r.message); } })
            .catch(() => alert('Error saving skill'));
        }
      });
    }
  },

  editCoreSkill: function(name, desc, levels) {
    document.getElementById('core-skill-name').value = name;
    document.getElementById('core-skill-desc').value = desc;
    document.getElementById('core-skill-levels').value = levels;
  },

  /* --------------------------------------------------------------------------
     LEADERSHIP SKILLS DEFINITION (A4) — Item #36
     -------------------------------------------------------------------------- */

  loadLeadershipSkills: function() {
    const tbody = document.getElementById('leadership-skills-tbody');
    if (!tbody) return;

    if (typeof API !== 'undefined' && API.getLeadershipDefinitions) {
      API.getLeadershipDefinitions().then(result => {
        if (result.success && Array.isArray(result.skills)) {
          if (result.skills.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999;">No leadership skills defined yet. Add one below.</td></tr>';
          } else {
            tbody.innerHTML = result.skills.map(sk => `
              <tr>
                <td>${sk.skill_name}</td>
                <td>${sk.description || '—'}</td>
                <td>${sk.required_level_per_band || '—'}</td>
                <td><button class="btn btn--secondary" style="padding: 4px 8px; font-size: 12px;" onclick="Admin.editLeadershipSkill('${sk.skill_name}', '${sk.description || ''}', '${sk.required_level_per_band || ''}')">Edit</button></td>
              </tr>
            `).join('');
          }
        } else {
          tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #c62828;">Error loading skills</td></tr>';
        }
      }).catch(() => {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999;">Could not connect to server.</td></tr>';
      });
    }

    // Wire form submission
    const form = document.getElementById('leadership-skill-form');
    if (form && !form.dataset.wired) {
      form.dataset.wired = 'true';
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const skillName = document.getElementById('leadership-skill-name').value.trim();
        const description = document.getElementById('leadership-skill-desc').value.trim();
        const levels = document.getElementById('leadership-skill-levels').value.trim();

        let parsedLevels = null;
        if (levels) { try { parsedLevels = JSON.parse(levels); } catch (e) { alert('Invalid JSON for levels'); return; } }

        if (typeof API !== 'undefined' && API.request) {
          API.request('POST', '/admin/leadership-definitions', { skillName, description, requiredLevelPerBand: parsedLevels })
            .then(r => { if (r.success) { alert('Leadership skill saved!'); this.loadLeadershipSkills(); form.reset(); } else { alert(r.message); } })
            .catch(() => alert('Error saving skill'));
        }
      });
    }
  },

  editLeadershipSkill: function(name, desc, levels) {
    document.getElementById('leadership-skill-name').value = name;
    document.getElementById('leadership-skill-desc').value = desc;
    document.getElementById('leadership-skill-levels').value = levels;
  },

  /* --------------------------------------------------------------------------
     ORG HIERARCHY SETUP (A6) — Item #37
     -------------------------------------------------------------------------- */

  loadOrgHierarchy: function() {
    const container = document.getElementById('org-hierarchy-tree');
    const loading = document.getElementById('org-hierarchy-loading');
    const stats = document.getElementById('org-hierarchy-stats');

    if (typeof API !== 'undefined' && API.getOrgHierarchy) {
      API.getOrgHierarchy().then(result => {
        if (loading) loading.style.display = 'none';
        if (container) container.style.display = 'block';
        if (stats) stats.style.display = 'block';

        if (result.success && Array.isArray(result.hierarchy)) {
          // Display stats
          document.getElementById('org-group-count').textContent = `Groups: ${result.groupCount}`;
          document.getElementById('org-dept-count').textContent = `Departments: ${result.departmentCount}`;

          // Build tree view
          if (result.hierarchy.length === 0) {
            container.innerHTML = '<p style="color: #999;">No hierarchy data. Upload employees first.</p>';
          } else {
            container.innerHTML = result.hierarchy.map(g => `
              <div style="margin-bottom: 12px; padding: 12px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid var(--color-primary, #038F8D);">
                <strong>${g.groupLabel || 'Unknown Group'}</strong> <span style="color: #666; font-size: 12px;">(${g.groupCode || ''})</span>
                <div style="margin-top: 8px; padding-left: 16px;">
                  ${g.departments.map(d => `<div style="padding: 4px 0; color: #444;">↳ ${d.deptLabel} <span style="color: #999; font-size: 11px;">(${d.deptCode || ''})</span></div>`).join('')}
                </div>
              </div>
            `).join('');
          }

          // Populate dropdowns
          const groupSelect = document.getElementById('org-group-select');
          const deptSelect = document.getElementById('org-dept-select');
          if (groupSelect) {
            groupSelect.innerHTML = '<option value="">Select group...</option>' + result.hierarchy.map(g => `<option value="${g.groupLabel}">${g.groupLabel}</option>`).join('');
          }
          if (deptSelect) {
            const allDepts = result.hierarchy.flatMap(g => g.departments);
            deptSelect.innerHTML = '<option value="">Select department...</option>' + allDepts.map(d => `<option value="${d.deptLabel}">${d.deptLabel}</option>`).join('');
          }
        }
      }).catch(() => {
        if (loading) loading.textContent = 'Could not connect to server.';
      });
    }

    // Wire form submission
    const form = document.getElementById('org-hierarchy-form');
    if (form && !form.dataset.wired) {
      form.dataset.wired = 'true';
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const employeeNo = document.getElementById('org-employee-no').value.trim();
        const businessGroupLabel = document.getElementById('org-group-select').value;
        const departmentLabel = document.getElementById('org-dept-select').value;

        if (!employeeNo) { alert('Employee number is required'); return; }

        if (typeof API !== 'undefined' && API.request) {
          API.request('POST', '/admin/org-hierarchy', { employeeNo, businessGroupLabel, departmentLabel })
            .then(r => { if (r.success) { alert('Organization updated!'); form.reset(); } else { alert(r.message); } })
            .catch(() => alert('Error updating organization'));
        }
      });
    }
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
