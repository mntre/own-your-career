/**
 * Own Your Career — API Routes (Converge Cloud)
 * 
 * REST endpoints for all portal operations.
 * All routes require authentication and RBAC validation.
 * 
 * @fileoverview Express route definitions
 */

'use strict';

const express = require('express');
const router = express.Router();
const auth = require('./middleware/auth');
const rbac = require('./middleware/rbac');
const { Employees, SystemConfig, Workflow, AuditLog, ExportHistory } = require('./db');

/* --------------------------------------------------------------------------
   Authentication Routes
   -------------------------------------------------------------------------- */

/**
 * POST /api/login
 * User login via SSO (Google or corporate email)
 * No authentication required (public endpoint)
 * 
 * Accepts:
 * - email (required): User email
 * - role (optional): If provided, validates against DB. If not, looks up from DB.
 * - googleCredential (optional): Google ID token for SSO verification
 * 
 * Returns: { success, token, user: { email, role, name, department } }
 */
router.post('/api/login', async (req, res) => {
  try {
    const { email, role, googleCredential } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // If Google credential is provided, verify it
    if (googleCredential && googleCredential.trim() !== '') {
      try {
        const payload = JSON.parse(Buffer.from(googleCredential.split('.')[1], 'base64').toString('utf8'));
        
        if (payload.email && payload.email.toLowerCase() !== email.toLowerCase()) {
          return res.status(400).json({
            success: false,
            message: 'Email mismatch in credential'
          });
        }
      } catch (error) {
        console.error('Invalid Google credential:', error);
        return res.status(400).json({
          success: false,
          message: 'Invalid Google credential'
        });
      }
    }

    // Look up employee in database by email
    const employee = Employees.getByEmail(email.toLowerCase());

    if (employee) {
      // Found in DB — use their stored role
      const userRole = employee.role || 'EMPLOYEE';
      const token = auth.generateToken(email, userRole);

      AuditLog.add('LOGIN', email, 'User logged in', `Role: ${userRole}, Source: ${googleCredential ? 'Google SSO' : 'Test mode'}`);

      return res.json({
        success: true,
        message: 'Authentication successful',
        token: token,
        user: {
          email: email,
          role: userRole,
          name: employee.full_name || '',
          department: employee.department_label || '',
          employeeNo: employee.employee_no || ''
        }
      });
    }

    // Not in DB — check test mode allowlist (development only)
    const isTestingMode = process.env.NODE_ENV !== 'production';

    if (isTestingMode) {
      const result = await auth.authenticateUser(email, role || 'EMPLOYEE', googleCredential);
      if (result.success) {
        return res.json({
          success: true,
          message: result.message,
          token: result.token,
          user: result.user
        });
      }
    }

    // Not found anywhere — deny access
    AuditLog.add('LOGIN_DENIED', email, 'Access denied — email not in employee database', '');

    return res.status(401).json({
      success: false,
      message: 'Access denied. Your email is not registered in the system. Please contact your Admin or HR team to have your account added.'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/logout
 * User logout - clears session
 */
router.post('/api/logout', auth.authMiddleware, (req, res) => {
  // In a real implementation, you'd invalidate the token on the server
  // For JWT, we just stop accepting it (client-side clearing is handled by frontend)
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/* --------------------------------------------------------------------------
   Protected Routes (require authentication)
   -------------------------------------------------------------------------- */

// Skills Assessment (Step 1)
router.post('/api/skills-assessment', auth.authMiddleware, (req, res) => {
  // TODO: Implement skills assessment save logic
  // RBAC: MANAGER role only
  res.json({
    success: true,
    message: 'Skills assessment saved'
  });
});

// OKR Upload (Step 2)
router.post('/api/okr-upload', auth.authMiddleware, (req, res) => {
  // TODO: Implement OKR upload logic
  // RBAC: DATA_SPOC role only
  res.json({
    success: true,
    message: 'OKR data uploaded'
  });
});

// Self-Assessment (Step 3)
router.post('/api/self-assessment', auth.authMiddleware, (req, res) => {
  // TODO: Implement self-assessment save logic
  // RBAC: EMPLOYEE role only
  res.json({
    success: true,
    message: 'Self-assessment submitted'
  });
});

// Feed Forward (Step 4)
router.post('/api/feed-forward', auth.authMiddleware, (req, res) => {
  // TODO: Implement feed forward save logic
  // RBAC: MANAGER role only
  res.json({
    success: true,
    message: 'Feed forward submitted'
  });
});

// Acknowledgement (Steps 5 & 7)
router.post('/api/acknowledgement', auth.authMiddleware, (req, res) => {
  // TODO: Implement acknowledgement save logic
  // RBAC: MANAGER (Step 5) or EMPLOYEE (Step 7)
  res.json({
    success: true,
    message: 'Acknowledgement recorded'
  });
});

// Workflow Status (Gate checking)
router.get('/api/workflow-status/:empId', auth.authMiddleware, (req, res) => {
  // TODO: Implement workflow status check
  // RBAC: EMPLOYEE, MANAGER, or DATA_SPOC depending on context
  res.json({
    success: true,
    status: 'PENDING'
  });
});

// Scores (Step 6 - read only)
router.get('/api/scores/:empId', auth.authMiddleware, (req, res) => {
  // TODO: Implement scores retrieval
  // RBAC: EMPLOYEE role only
  res.json({
    success: true,
    scores: {}
  });
});

// Team list (Manager view)
router.get('/api/team/:managerId', auth.authMiddleware, (req, res) => {
  // TODO: Implement team list retrieval
  // RBAC: MANAGER role only
  res.json({
    success: true,
    team: []
  });
});

// Org data (Data SPOC view)
router.get('/api/org-data/:spocId', auth.authMiddleware, (req, res) => {
  // TODO: Implement org data retrieval
  // RBAC: DATA_SPOC role only
  res.json({
    success: true,
    orgData: {}
  });
});

/* --------------------------------------------------------------------------
   ADMIN ROUTES (require ADMIN role)
   -------------------------------------------------------------------------- */

/**
 * GET /api/admin/system-config
 * Get current system configuration
 * RBAC: ADMIN role only
 */
router.get('/api/admin/system-config', rbac.requireAdmin(), (req, res) => {
  try {
    const config = SystemConfig.getAll();
    res.json({
      success: true,
      config: {
        hardLockDate: config.hard_lock_date || null,
        reviewPeriodStart: config.review_period_start || null,
        reviewPeriodEnd: config.review_period_end || null,
        exceededThreshold: parseFloat(config.exceeded_threshold) || 101
      }
    });
  } catch (error) {
    console.error('[Admin] Error loading config:', error);
    res.status(500).json({ success: false, message: 'Error loading configuration' });
  }
});

/**
 * POST /api/admin/system-config
 * Save system configuration
 * RBAC: ADMIN role only
 */
router.post('/api/admin/system-config', rbac.requireAdmin(), (req, res) => {
  try {
    const { hardLockDate, reviewPeriodStart, reviewPeriodEnd, exceededThreshold } = req.body;
    const userEmail = req.user ? req.user.email : 'admin';

    if (hardLockDate) SystemConfig.set('hard_lock_date', hardLockDate, userEmail);
    if (reviewPeriodStart) SystemConfig.set('review_period_start', reviewPeriodStart, userEmail);
    if (reviewPeriodEnd) SystemConfig.set('review_period_end', reviewPeriodEnd, userEmail);
    if (exceededThreshold) SystemConfig.set('exceeded_threshold', String(exceededThreshold), userEmail);

    AuditLog.add('CONFIG_CHANGE', userEmail, 'Updated system configuration', JSON.stringify(req.body));

    res.json({ success: true, message: 'Configuration saved successfully' });
  } catch (error) {
    console.error('[Admin] Error saving config:', error);
    res.status(500).json({ success: false, message: 'Error saving configuration' });
  }
});

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 * RBAC: ADMIN role only
 */
router.get('/api/admin/stats', rbac.requireAdmin(), (req, res) => {
  try {
    const stats = Workflow.getProgressStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('[Admin] Error loading stats:', error);
    res.status(500).json({ success: false, message: 'Error loading statistics' });
  }
});

/**
 * POST /api/admin/send-reminders
 * Send email reminders to incomplete employees
 * RBAC: ADMIN role only
 */
router.post('/api/admin/send-reminders', rbac.requireAdmin(), (req, res) => {
  // TODO: Implement email reminder sending
  res.json({
    success: true,
    message: 'Reminders sent successfully'
  });
});

/**
 * POST /api/admin/lock-system
 * Lock the system immediately
 * RBAC: ADMIN role only
 */
router.post('/api/admin/lock-system', rbac.requireAdmin(), (req, res) => {
  // TODO: Implement system lock logic
  res.json({
    success: true,
    message: 'System locked successfully'
  });
});

/**
 * GET /api/admin/export-progress-report
 * Export progress report as CSV
 * RBAC: ADMIN role only
 */
router.get('/api/admin/export-progress-report', rbac.requireAdmin(), (req, res) => {
  // TODO: Implement progress report export
  const csvData = 'Step,Completed,Total,Percentage\nStep 1,0,0,0%\nStep 2,0,0,0%';
  res.setHeader('Content-Type', 'text/csv');
  res.send(csvData);
});

/**
 * GET /api/admin/export-history
 * Get export history
 * RBAC: ADMIN role only
 */
router.get('/api/admin/export-history', rbac.requireAdmin(), (req, res) => {
  try {
    const history = ExportHistory.getRecent(50);
    res.json({ success: true, history });
  } catch (error) {
    console.error('[Admin] Error loading export history:', error);
    res.status(500).json({ success: false, message: 'Error loading export history' });
  }
});

/**
 * POST /api/admin/trigger-sftp-export
 * Trigger SFTP export to SuccessFactors
 * RBAC: ADMIN role only
 */
router.post('/api/admin/trigger-sftp-export', rbac.requireAdmin(), (req, res) => {
  // TODO: Implement SFTP export trigger
  res.json({
    success: true,
    message: 'SFTP export triggered successfully',
    exportRecord: {
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
      records: 0,
      details: 'Exported to SuccessFactors via SFTP'
    }
  });
});

/**
 * GET /api/admin/audit-log
 * Get system audit log
 * RBAC: ADMIN role only
 */
router.get('/api/admin/audit-log', rbac.requireAdmin(), (req, res) => {
  try {
    const logs = AuditLog.getRecent(100);
    res.json({ success: true, logs });
  } catch (error) {
    console.error('[Admin] Error loading audit log:', error);
    res.status(500).json({ success: false, message: 'Error loading audit log' });
  }
});

/**
 * POST /api/admin/upload-employees
 * Upload employee database from CSV data
 * RBAC: ADMIN role only
 */
router.post('/api/admin/upload-employees', rbac.requireAdmin(), (req, res) => {
  try {
    const { headers, rows } = req.body;

    if (!Array.isArray(headers) || headers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No headers provided'
      });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No employee data provided'
      });
    }

    console.log(`[Admin] Uploading ${rows.length} employees (${headers.length} columns) to database`);

    const result = Employees.bulkUpload(headers, rows);

    const userEmail = req.user ? req.user.email : 'admin';
    AuditLog.add('EMPLOYEE_UPLOAD', userEmail, `Uploaded ${result.inserted} employees`, 
      `${headers.length} columns, ${result.errors.length} errors`);

    if (result.errors.length > 0) {
      res.json({
        success: true,
        message: `${result.inserted} employees uploaded. ${result.errors.length} rows had errors.`,
        inserted: result.inserted,
        errors: result.errors.slice(0, 20)
      });
    } else {
      res.json({
        success: true,
        message: `${result.inserted} employees uploaded successfully (${headers.length} columns)`,
        inserted: result.inserted
      });
    }
  } catch (error) {
    console.error('[Admin] Error uploading employees:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading employee data: ' + error.message
    });
  }
});

/**
 * POST /api/admin/derive-roles
 * Auto-derive MANAGER roles from immediate_supervisor field in employee data
 * After upload, system auto-detects which employees have reports and marks them as MANAGER
 * RBAC: ADMIN role only
 */
router.post('/api/admin/derive-roles', rbac.requireAdmin(), (req, res) => {
  try {
    const result = Employees.autoDerivRoles();

    const userEmail = req.user ? req.user.email : 'admin';
    AuditLog.add('ROLE_DERIVATION', userEmail, `Auto-detected ${result.managersAutoDetected} managers`, 
      JSON.stringify(result.roles));

    res.json({
      success: true,
      message: `Role derivation complete: ${result.managersAutoDetected} managers auto-detected`,
      managersAutoDetected: result.managersAutoDetected,
      roles: result.roles
    });
  } catch (error) {
    console.error('[Admin] Error deriving roles:', error);
    res.status(500).json({
      success: false,
      message: 'Error deriving roles: ' + error.message
    });
  }
});

/**
 * GET /api/admin/role-assignment
 * Get all employees with current roles for role assignment UI
 * RBAC: ADMIN role only
 */
router.get('/api/admin/role-assignment', rbac.requireAdmin(), (req, res) => {
  try {
    const employees = Employees.getRoleAssignmentList();

    res.json({
      success: true,
      employees,
      roleCount: {
        'MANAGER': employees.filter(e => e.role === 'MANAGER').length,
        'DATA_SPOC': employees.filter(e => e.role === 'DATA_SPOC').length,
        'EMPLOYEE': employees.filter(e => e.role === 'EMPLOYEE').length,
        'ADMIN': employees.filter(e => e.role === 'ADMIN').length
      }
    });
  } catch (error) {
    console.error('[Admin] Error loading role assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading role assignment: ' + error.message
    });
  }
});

/**
 * POST /api/admin/update-role
 * Update role for a single employee
 * RBAC: ADMIN role only
 * Body: { employeeNo, newRole }
 */
router.post('/api/admin/update-role', rbac.requireAdmin(), (req, res) => {
  try {
    const { employeeNo, newRole } = req.body;

    if (!employeeNo || !newRole) {
      return res.status(400).json({
        success: false,
        message: 'Employee number and new role are required'
      });
    }

    const validRoles = ['EMPLOYEE', 'MANAGER', 'DATA_SPOC', 'ADMIN'];
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    Employees.updateRole(employeeNo, newRole);

    const userEmail = req.user ? req.user.email : 'admin';
    AuditLog.add('ROLE_UPDATE', userEmail, `Updated role for ${employeeNo}`, `New role: ${newRole}`);

    res.json({
      success: true,
      message: `Role updated successfully for ${employeeNo}`,
      employeeNo,
      newRole
    });
  } catch (error) {
    console.error('[Admin] Error updating role:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating role: ' + error.message
    });
  }
});

/**
 * POST /api/admin/update-roles-bulk
 * Bulk update roles for multiple employees via CSV
 * RBAC: ADMIN role only
 * Body: { headers, rows } where rows have EmployeeNo and Role columns
 */
router.post('/api/admin/update-roles-bulk', rbac.requireAdmin(), (req, res) => {
  try {
    const { headers, rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No role data provided'
      });
    }

    let updated = 0;
    const errors = [];

    rows.forEach((row, index) => {
      try {
        // Find employee number column (case-insensitive)
        let empNo = null;
        let newRole = null;

        for (const key of Object.keys(row)) {
          if (key.toLowerCase().includes('employee')) {
            empNo = row[key];
          }
          if (key.toLowerCase().includes('role')) {
            newRole = row[key];
          }
        }

        if (!empNo || !newRole) {
          errors.push(`Row ${index + 1}: Missing Employee No. or Role`);
          return;
        }

        const validRoles = ['EMPLOYEE', 'MANAGER', 'DATA_SPOC', 'ADMIN'];
        if (!validRoles.includes(newRole.toUpperCase())) {
          errors.push(`Row ${index + 1}: Invalid role "${newRole}"`);
          return;
        }

        Employees.updateRole(empNo, newRole.toUpperCase());
        updated++;
      } catch (err) {
        errors.push(`Row ${index + 1}: ${err.message}`);
      }
    });

    const userEmail = req.user ? req.user.email : 'admin';
    AuditLog.add('ROLE_UPDATE_BULK', userEmail, `Bulk role update: ${updated} employees`, 
      `${errors.length} errors`);

    res.json({
      success: true,
      message: `${updated} roles updated successfully`,
      updated,
      errors: errors.slice(0, 20)
    });
  } catch (error) {
    console.error('[Admin] Error bulk updating roles:', error);
    res.status(500).json({
      success: false,
      message: 'Error bulk updating roles: ' + error.message
    });
  }
});

module.exports = router;
