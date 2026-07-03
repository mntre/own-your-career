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

/* --------------------------------------------------------------------------
   Authentication Routes
   -------------------------------------------------------------------------- */

/**
 * POST /api/login
 * User login via SSO (Google or corporate email)
 * No authentication required (public endpoint)
 */
router.post('/login', async (req, res) => {
  try {
    const { email, role, googleCredential } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role is required'
      });
    }

    // If Google credential is provided, verify it
    if (googleCredential) {
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

    const result = await auth.authenticateUser(email, role);

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
router.post('/logout', auth.authMiddleware, (req, res) => {
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

module.exports = router;
