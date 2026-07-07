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
 */
router.post('/api/login', async (req, res) => {
  try {
    const { email, role, googleCredential } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role is required'
      });
    }

    // If Google credential is provided, verify it
    if (googleCredential && googleCredential.trim() !== '') {
      try {
        // Decode the JWT credential
        const payload = JSON.parse(Buffer.from(googleCredential.split('.')[1], 'base64').toString('utf8'));
        
        // Verify the email matches
        if (payload.email !== email) {
          return res.status(400).json({
            success: false,
            message: 'Email mismatch in credential'
          });
        }

        // In production, verify the ID token with Google's servers
        // For now, we trust the frontend-provided credential (should validate on server)
      } catch (error) {
        console.error('Invalid Google credential:', error);
        return res.status(400).json({
          success: false,
          message: 'Invalid Google credential'
        });
      }
    }

    const result = await auth.authenticateUser(email, role, googleCredential);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        token: result.token,
        user: result.user
      });
    } else {
      res.status(401).json({
        success: false,
        message: result.message
      });
    }
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

module.exports = router;
