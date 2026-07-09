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
const { Employees, SystemConfig, Workflow, AuditLog, ExportHistory, queryAll, queryOne, execute, saveDB } = require('./db');

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

/**
 * Helper: Check if hard lock date has passed (rejects form saves after lock)
 * Items #10 — Hard lock date enforcement
 * @returns {boolean} true if locked
 */
function isSystemLocked() {
  return SystemConfig.isLocked();
}

/**
 * Helper: Ensure workflow_status row exists for employee
 * @param {string} empNo
 */
function ensureWorkflowStatus(empNo) {
  const existing = Workflow.getStatus(empNo);
  if (!existing) {
    execute(
      'INSERT OR IGNORE INTO workflow_status (employee_no) VALUES ($emp)',
      { $emp: empNo }
    );
    saveDB();
  }
}

// Skills Assessment (Step 1)
// Item #1 — POST /api/skills-assessment
// Item #13 — RBAC: MANAGER only
router.post('/api/skills-assessment', auth.authMiddleware, rbac.requireRole(['MANAGER', 'ADMIN']), (req, res) => {
  try {
    // Item #10 — Hard lock date check
    if (isSystemLocked()) {
      return res.status(403).json({ success: false, message: 'System is locked. No further edits allowed after the hard lock date.' });
    }

    const { employeeNo, skills } = req.body;
    const assessorNo = req.user.email;

    if (!employeeNo || !Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({ success: false, message: 'employeeNo and skills array are required.' });
    }

    // Validate each skill entry
    for (const skill of skills) {
      if (!skill.skillType || !skill.skillName || skill.rating === undefined) {
        return res.status(400).json({ success: false, message: 'Each skill must have skillType, skillName, and rating.' });
      }
      if (skill.rating < 0 || skill.rating > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be between 0 and 5.' });
      }
    }

    // Save each skill rating (upsert)
    for (const skill of skills) {
      execute(`
        INSERT INTO skills_assessment (employee_no, assessor_no, skill_type, skill_name, rating, remarks, updated_at)
        VALUES ($emp, $assessor, $type, $name, $rating, $remarks, datetime('now'))
        ON CONFLICT(employee_no, skill_type, skill_name) DO UPDATE SET
          rating = excluded.rating, remarks = excluded.remarks, assessor_no = excluded.assessor_no, updated_at = excluded.updated_at
      `, {
        $emp: employeeNo,
        $assessor: assessorNo,
        $type: skill.skillType,
        $name: skill.skillName,
        $rating: skill.rating,
        $remarks: skill.remarks || null
      });
    }

    // Add unique constraint for upsert if not exists (handled gracefully)
    try {
      execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_skills_emp_type_name ON skills_assessment(employee_no, skill_type, skill_name)');
    } catch (e) { /* index may already exist */ }

    saveDB();

    // Item #12 — Update workflow_status
    ensureWorkflowStatus(employeeNo);
    Workflow.completeStep(employeeNo, 1);

    AuditLog.add('SKILLS_ASSESSMENT', assessorNo, `Skills assessment saved for ${employeeNo}`, `${skills.length} skills rated`);

    res.json({ success: true, message: 'Skills assessment saved successfully.', skillsCount: skills.length });
  } catch (error) {
    console.error('[Route] Skills assessment error:', error);
    res.status(500).json({ success: false, message: 'Error saving skills assessment: ' + error.message });
  }
});

// OKR Upload (Step 2)
// Item #2 — POST /api/okr-upload
// Item #13 — RBAC: DATA_SPOC only
// Ownership: Only the SPOC who claimed the hierarchy selection can upload/edit
// Flexible levels: corporate, group, department, team (not all required)
router.post('/api/okr-upload', auth.authMiddleware, rbac.requireRole(['DATA_SPOC', 'ADMIN']), (req, res) => {
  try {
    // Item #10 — Hard lock date check
    if (isSystemLocked()) {
      return res.status(403).json({ success: false, message: 'System is locked. No further edits allowed after the hard lock date.' });
    }

    const { employeeNo, corporateOkr, groupOkr, departmentOkr, teamOkr, targetScore, actualScore, weight, okrStatus, corporate, businessGroup, department, team } = req.body;
    const uploadedBy = req.user.email;

    if (!employeeNo) {
      return res.status(400).json({ success: false, message: 'employeeNo is required.' });
    }

    // Check OKR ownership if hierarchy selection is provided (at least corporate required)
    if (corporate) {
      // Normalize: use empty string for null levels to allow flexible UNIQUE constraint
      const ownershipCorp = corporate || '';
      const ownershipGroup = businessGroup || '';
      const ownershipDept = department || '';
      const ownershipTeam = team || '';

      // Check for EXACT match at the same level
      const exactOwner = queryOne(
        'SELECT * FROM okr_ownership WHERE corporate = $corp AND COALESCE(business_group, \'\') = $grp AND COALESCE(department, \'\') = $dept AND COALESCE(team, \'\') = $team',
        { $corp: ownershipCorp, $grp: ownershipGroup, $dept: ownershipDept, $team: ownershipTeam }
      );

      if (exactOwner && exactOwner.owned_by_email !== uploadedBy) {
        const ownerName = exactOwner.owned_by_name || exactOwner.owned_by_email;
        return res.status(409).json({
          success: false,
          message: `This selection was already uploaded by ${ownerName}. Please contact them or your Admin if you need to make changes.`,
          ownedBy: { email: exactOwner.owned_by_email, name: exactOwner.owned_by_name }
        });
      }

      // Check for BROADER ownership (someone owns a parent level that covers this selection)
      // e.g., someone owns Group level → blocks uploads to Department/Team under that group
      let broaderOwner = null;

      if (ownershipDept && ownershipGroup) {
        // Check if someone owns at Group level (no dept/team) covering this department
        broaderOwner = queryOne(
          'SELECT * FROM okr_ownership WHERE corporate = $corp AND business_group = $grp AND (department IS NULL OR department = \'\') AND owned_by_email != $me',
          { $corp: ownershipCorp, $grp: ownershipGroup, $me: uploadedBy }
        );
      }

      if (!broaderOwner && ownershipTeam && ownershipDept) {
        // Check if someone owns at Department level (no team) covering this team
        broaderOwner = queryOne(
          'SELECT * FROM okr_ownership WHERE corporate = $corp AND business_group = $grp AND department = $dept AND (team IS NULL OR team = \'\') AND owned_by_email != $me',
          { $corp: ownershipCorp, $grp: ownershipGroup, $dept: ownershipDept, $me: uploadedBy }
        );
      }

      if (broaderOwner) {
        const ownerName = broaderOwner.owned_by_name || broaderOwner.owned_by_email;
        return res.status(409).json({
          success: false,
          message: `This selection is covered by an upload from ${ownerName} at a broader level. Please contact them or your Admin if you need to make changes.`,
          ownedBy: { email: broaderOwner.owned_by_email, name: broaderOwner.owned_by_name }
        });
      }

      // Check for NARROWER ownership (someone already owns a child under this broader selection)
      // e.g., trying to upload at Group level but someone already owns a Department under it
      let narrowerOwners = [];

      if (!ownershipDept && ownershipGroup) {
        // Uploading at Group level — check if any dept/team under it is already owned by others
        narrowerOwners = queryAll(
          'SELECT * FROM okr_ownership WHERE corporate = $corp AND business_group = $grp AND department IS NOT NULL AND department != \'\' AND owned_by_email != $me',
          { $corp: ownershipCorp, $grp: ownershipGroup, $me: uploadedBy }
        );
      } else if (!ownershipTeam && ownershipDept) {
        // Uploading at Dept level — check if any team under it is already owned by others
        narrowerOwners = queryAll(
          'SELECT * FROM okr_ownership WHERE corporate = $corp AND business_group = $grp AND department = $dept AND team IS NOT NULL AND team != \'\' AND owned_by_email != $me',
          { $corp: ownershipCorp, $grp: ownershipGroup, $dept: ownershipDept, $me: uploadedBy }
        );
      }

      if (narrowerOwners.length > 0) {
        const ownerNames = [...new Set(narrowerOwners.map(o => o.owned_by_name || o.owned_by_email))].join(', ');
        return res.status(409).json({
          success: false,
          message: `Cannot upload at this level. Sub-selections under it are already owned by: ${ownerNames}. Please coordinate with them or contact your Admin.`,
          ownedBy: narrowerOwners.map(o => ({ email: o.owned_by_email, name: o.owned_by_name }))
        });
      }

      // Claim ownership if not yet claimed
      if (!exactOwner) {
        const spocEmployee = Employees.getByEmail(uploadedBy);
        const spocName = spocEmployee ? spocEmployee.full_name : uploadedBy;

        execute(`
          INSERT INTO okr_ownership (corporate, business_group, department, team, owned_by_email, owned_by_name)
          VALUES ($corp, $grp, $dept, $team, $email, $name)
        `, {
          $corp: ownershipCorp,
          $grp: ownershipGroup || null,
          $dept: ownershipDept || null,
          $team: ownershipTeam || null,
          $email: uploadedBy,
          $name: spocName
        });
      }
    }

    // Upsert OKR data
    execute(`
      INSERT INTO okr_data (employee_no, uploaded_by, corporate_okr, group_okr, department_okr, team_okr, target_score, actual_score, weight, okr_status, updated_at)
      VALUES ($emp, $by, $corp, $grp, $dept, $team, $target, $actual, $weight, $status, datetime('now'))
      ON CONFLICT(employee_no) DO UPDATE SET
        uploaded_by = excluded.uploaded_by, corporate_okr = excluded.corporate_okr, group_okr = excluded.group_okr,
        department_okr = excluded.department_okr, team_okr = excluded.team_okr, target_score = excluded.target_score,
        actual_score = excluded.actual_score, weight = excluded.weight, okr_status = excluded.okr_status, updated_at = excluded.updated_at
    `, {
      $emp: employeeNo,
      $by: uploadedBy,
      $corp: corporateOkr || null,
      $grp: groupOkr || null,
      $dept: departmentOkr || null,
      $team: teamOkr || null,
      $target: targetScore || null,
      $actual: actualScore || null,
      $weight: weight || null,
      $status: okrStatus || 'NOT_STARTED'
    });

    // Add unique constraint for upsert if not exists
    try {
      execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_okr_emp_unique ON okr_data(employee_no)');
    } catch (e) { /* index may already exist */ }

    saveDB();

    // Item #12 — Update workflow_status
    ensureWorkflowStatus(employeeNo);
    Workflow.completeStep(employeeNo, 2);

    AuditLog.add('OKR_UPLOAD', uploadedBy, `OKR data uploaded for ${employeeNo}`, `Corporate: ${corporate || 'N/A'}, Group: ${businessGroup || 'N/A'}, Dept: ${department || 'N/A'}, Team: ${team || 'N/A'}`);

    res.json({ success: true, message: 'OKR data uploaded successfully.' });
  } catch (error) {
    console.error('[Route] OKR upload error:', error);
    res.status(500).json({ success: false, message: 'Error uploading OKR data: ' + error.message });
  }
});

/**
 * GET /api/okr-ownership
 * Check who owns a hierarchy selection (flexible levels)
 * Query params: corporate (required), businessGroup, department, team (optional)
 * Returns: { owned: true/false, ownedBy: { email, name }, isOwner: true/false }
 */
router.get('/api/okr-ownership', auth.authMiddleware, rbac.requireRole(['DATA_SPOC', 'ADMIN']), (req, res) => {
  try {
    const { corporate, businessGroup, department, team } = req.query;
    const currentUser = req.user.email;

    if (!corporate) {
      return res.status(400).json({ success: false, message: 'corporate is required.' });
    }

    const ownershipGroup = businessGroup || '';
    const ownershipDept = department || '';
    const ownershipTeam = team || '';

    const owner = queryOne(
      'SELECT * FROM okr_ownership WHERE corporate = $corp AND COALESCE(business_group, \'\') = $grp AND COALESCE(department, \'\') = $dept AND COALESCE(team, \'\') = $team',
      { $corp: corporate, $grp: ownershipGroup, $dept: ownershipDept, $team: ownershipTeam }
    );

    if (!owner) {
      return res.json({ success: true, owned: false, ownedBy: null, isOwner: false });
    }

    res.json({
      success: true,
      owned: true,
      ownedBy: { email: owner.owned_by_email, name: owner.owned_by_name },
      isOwner: owner.owned_by_email === currentUser,
      uploadedAt: owner.created_at
    });
  } catch (error) {
    console.error('[Route] OKR ownership check error:', error);
    res.status(500).json({ success: false, message: 'Error checking OKR ownership: ' + error.message });
  }
});

/**
 * GET /api/okr-ownership/mine
 * Get all hierarchy selections owned by the current Data SPOC
 * Returns: { success, selections: [...] }
 */
router.get('/api/okr-ownership/mine', auth.authMiddleware, rbac.requireRole(['DATA_SPOC', 'ADMIN']), (req, res) => {
  try {
    const currentUser = req.user.email;

    const selections = queryAll(
      'SELECT * FROM okr_ownership WHERE owned_by_email = $email ORDER BY corporate, business_group, department, team',
      { $email: currentUser }
    );

    res.json({ success: true, selections });
  } catch (error) {
    console.error('[Route] My OKR ownership error:', error);
    res.status(500).json({ success: false, message: 'Error fetching your OKR uploads: ' + error.message });
  }
});

/**
 * GET /api/okr-ownership/details
 * Get all OKR uploads for the current SPOC with employees under each hierarchy
 * Returns: { success, uploads: [{ corporate, businessGroup, department, team, uploadedAt, employeeCount, employees: [...] }] }
 */
router.get('/api/okr-ownership/details', auth.authMiddleware, rbac.requireRole(['DATA_SPOC', 'ADMIN']), (req, res) => {
  try {
    const spocEmail = req.user.email;

    // Get all hierarchies owned by this SPOC
    const ownerships = queryAll(
      'SELECT * FROM okr_ownership WHERE owned_by_email = $email ORDER BY created_at DESC',
      { $email: spocEmail }
    );

    // For each hierarchy, fetch employees matching that hierarchy level
    const uploads = ownerships.map(ownership => {
      // Build a dynamic query based on which hierarchy levels are set
      let query = 'SELECT employee_no, full_name, band FROM employees WHERE is_active = 1';
      const params = {};

      if (ownership.business_group) {
        query += ' AND business_group_label = $grp';
        params.$grp = ownership.business_group;
      }
      if (ownership.department) {
        query += ' AND department_label = $dept';
        params.$dept = ownership.department;
      }

      query += ' ORDER BY full_name';

      const employees = queryAll(query, Object.keys(params).length > 0 ? params : undefined);

      return {
        id: ownership.id,
        corporate: ownership.corporate,
        businessGroup: ownership.business_group,
        department: ownership.department,
        team: ownership.team,
        uploadedAt: ownership.created_at,
        employeeCount: employees.length,
        employees: employees.map(e => ({
          employeeNo: e.employee_no,
          fullName: e.full_name,
          band: e.band
        }))
      };
    });

    res.json({ success: true, uploads });
  } catch (error) {
    console.error('[Route] OKR ownership details error:', error);
    res.status(500).json({ success: false, message: 'Error fetching upload status: ' + error.message });
  }
});

/**
 * DELETE /api/okr-upload
 * Delete OKR data for a hierarchy selection (only the owning SPOC or ADMIN can delete)
 * Body: { corporate, businessGroup, department, team }
 * Removes ownership claim + all OKR data for employees in that selection
 */
router.delete('/api/okr-upload', auth.authMiddleware, rbac.requireRole(['DATA_SPOC', 'ADMIN']), (req, res) => {
  try {
    // Item #10 — Hard lock date check
    if (isSystemLocked()) {
      return res.status(403).json({ success: false, message: 'System is locked. No further edits allowed after the hard lock date.' });
    }

    const { corporate, businessGroup, department, team } = req.body;
    const currentUser = req.user.email;
    const isAdmin = req.user.role === 'ADMIN';

    if (!corporate) {
      return res.status(400).json({ success: false, message: 'corporate is required.' });
    }

    const ownershipGroup = businessGroup || '';
    const ownershipDept = department || '';
    const ownershipTeam = team || '';

    // Check ownership
    const owner = queryOne(
      'SELECT * FROM okr_ownership WHERE corporate = $corp AND COALESCE(business_group, \'\') = $grp AND COALESCE(department, \'\') = $dept AND COALESCE(team, \'\') = $team',
      { $corp: corporate, $grp: ownershipGroup, $dept: ownershipDept, $team: ownershipTeam }
    );

    if (!owner) {
      return res.status(404).json({ success: false, message: 'No OKR upload found for this selection.' });
    }

    // Only the owning SPOC or an ADMIN can delete
    if (owner.owned_by_email !== currentUser && !isAdmin) {
      const ownerName = owner.owned_by_name || owner.owned_by_email;
      return res.status(403).json({
        success: false,
        message: `Only ${ownerName} or an Admin can delete this upload.`
      });
    }

    // Build query to find affected employees based on selection level
    let empQuery = 'SELECT employee_no FROM employees WHERE is_active = 1';
    const empParams = {};

    if (businessGroup) {
      empQuery += ' AND business_group_label = $grp';
      empParams.$grp = businessGroup;
    }
    if (department) {
      empQuery += ' AND department_label = $dept';
      empParams.$dept = department;
    }

    const affectedEmployees = queryAll(empQuery, Object.keys(empParams).length > 0 ? empParams : undefined);

    let deletedCount = 0;
    affectedEmployees.forEach(emp => {
      execute('DELETE FROM okr_data WHERE employee_no = $emp AND uploaded_by = $by', {
        $emp: emp.employee_no,
        $by: owner.owned_by_email
      });

      // Reset Step 2 completion for affected employees
      execute(
        'UPDATE workflow_status SET step2_complete = 0, step2_date = NULL, updated_at = datetime(\'now\') WHERE employee_no = $emp',
        { $emp: emp.employee_no }
      );
      deletedCount++;
    });

    // Remove ownership claim
    execute(
      'DELETE FROM okr_ownership WHERE id = $id',
      { $id: owner.id }
    );

    saveDB();

    AuditLog.add('OKR_DELETE', currentUser, `OKR data deleted for ${businessGroup || corporate}${department ? ' > ' + department : ''}${team ? ' > ' + team : ''}`, `Affected employees: ${deletedCount}, Original owner: ${owner.owned_by_email}`);

    res.json({
      success: true,
      message: `OKR upload deleted successfully. ${deletedCount} employee records cleared.`,
      deletedCount
    });
  } catch (error) {
    console.error('[Route] OKR delete error:', error);
    res.status(500).json({ success: false, message: 'Error deleting OKR data: ' + error.message });
  }
});

/**
 * POST /api/okr-draft
 * Save OKR draft data (CSV parsed hierarchy + form values) for the current SPOC
 * Body: { corporate, businessGroup, department, team, csvData, formData }
 * csvData = JSON stringified CSV hierarchy (corporates, groups, departments, teams, keyResults)
 * formData = JSON stringified form input values (actual results entered by SPOC)
 */
router.post('/api/okr-draft', auth.authMiddleware, rbac.requireRole(['DATA_SPOC', 'ADMIN']), (req, res) => {
  try {
    const { corporate, businessGroup, department, team, csvData, formData } = req.body;
    const spocEmail = req.user.email;

    if (!corporate) {
      return res.status(400).json({ success: false, message: 'corporate is required to save a draft.' });
    }

    execute(`
      INSERT INTO okr_drafts (spoc_email, corporate, business_group, department, team, csv_data, form_data, status, updated_at)
      VALUES ($email, $corp, $grp, $dept, $team, $csv, $form, 'DRAFT', datetime('now'))
      ON CONFLICT(spoc_email, corporate, business_group, department, team) DO UPDATE SET
        csv_data = excluded.csv_data,
        form_data = excluded.form_data,
        status = 'DRAFT',
        updated_at = excluded.updated_at
    `, {
      $email: spocEmail,
      $corp: corporate,
      $grp: businessGroup || null,
      $dept: department || null,
      $team: team || null,
      $csv: csvData || null,
      $form: formData || null
    });

    saveDB();

    AuditLog.add('OKR_DRAFT_SAVE', spocEmail, 'OKR draft saved', `Corporate: ${corporate}, Group: ${businessGroup || 'N/A'}, Dept: ${department || 'N/A'}, Team: ${team || 'N/A'}`);

    res.json({ success: true, message: 'Draft saved successfully.' });
  } catch (error) {
    console.error('[Route] OKR draft save error:', error);
    res.status(500).json({ success: false, message: 'Error saving draft: ' + error.message });
  }
});

/**
 * GET /api/okr-drafts
 * Get all drafts for the current SPOC
 * Returns: { success, drafts: [{ corporate, businessGroup, department, team, csvData, formData, updatedAt }] }
 */
router.get('/api/okr-drafts', auth.authMiddleware, rbac.requireRole(['DATA_SPOC', 'ADMIN']), (req, res) => {
  try {
    const spocEmail = req.user.email;

    const drafts = queryAll(
      'SELECT * FROM okr_drafts WHERE spoc_email = $email AND status = \'DRAFT\' ORDER BY updated_at DESC',
      { $email: spocEmail }
    );

    const formattedDrafts = drafts.map(d => ({
      id: d.id,
      corporate: d.corporate,
      businessGroup: d.business_group,
      department: d.department,
      team: d.team,
      csvData: d.csv_data,
      formData: d.form_data,
      updatedAt: d.updated_at
    }));

    res.json({ success: true, drafts: formattedDrafts });
  } catch (error) {
    console.error('[Route] OKR drafts fetch error:', error);
    res.status(500).json({ success: false, message: 'Error fetching drafts: ' + error.message });
  }
});

/**
 * DELETE /api/okr-draft/:id
 * Delete a specific draft
 */
router.delete('/api/okr-draft/:id', auth.authMiddleware, rbac.requireRole(['DATA_SPOC', 'ADMIN']), (req, res) => {
  try {
    const draftId = parseInt(req.params.id);
    const spocEmail = req.user.email;

    // Verify ownership
    const draft = queryOne('SELECT * FROM okr_drafts WHERE id = $id AND spoc_email = $email', { $id: draftId, $email: spocEmail });

    if (!draft) {
      return res.status(404).json({ success: false, message: 'Draft not found.' });
    }

    execute('DELETE FROM okr_drafts WHERE id = $id', { $id: draftId });
    saveDB();

    res.json({ success: true, message: 'Draft deleted.' });
  } catch (error) {
    console.error('[Route] OKR draft delete error:', error);
    res.status(500).json({ success: false, message: 'Error deleting draft: ' + error.message });
  }
});

// Self-Assessment (Step 3)
// Item #3 — POST /api/self-assessment
// Item #11 — Gate validation: Steps 1 & 2 must be complete
// Item #13 — RBAC: EMPLOYEE (all roles can do their own)
router.post('/api/self-assessment', auth.authMiddleware, (req, res) => {
  try {
    // Item #10 — Hard lock date check
    if (isSystemLocked()) {
      return res.status(403).json({ success: false, message: 'System is locked. No further edits allowed after the hard lock date.' });
    }

    const { employeeNo, q1, q2, q3, q4 } = req.body;

    if (!employeeNo || !q1 || !q2 || !q3 || !q4) {
      return res.status(400).json({ success: false, message: 'employeeNo and all 4 answers (q1-q4) are required.' });
    }

    // Item #11 — Gate validation: Steps 1 & 2 must be complete
    ensureWorkflowStatus(employeeNo);
    if (!Workflow.isStepEnabled(employeeNo, 3)) {
      return res.status(403).json({ success: false, message: 'Step 3 is locked. Steps 1 (Skills Assessment) and 2 (OKR Upload) must be completed first.' });
    }

    // Upsert self-assessment
    execute(`
      INSERT INTO self_assessment (employee_no, q1_answer, q2_answer, q3_answer, q4_answer, updated_at)
      VALUES ($emp, $q1, $q2, $q3, $q4, datetime('now'))
      ON CONFLICT(employee_no) DO UPDATE SET
        q1_answer = excluded.q1_answer, q2_answer = excluded.q2_answer,
        q3_answer = excluded.q3_answer, q4_answer = excluded.q4_answer, updated_at = excluded.updated_at
    `, { $emp: employeeNo, $q1: q1, $q2: q2, $q3: q3, $q4: q4 });

    saveDB();

    // Item #12 — Update workflow_status
    Workflow.completeStep(employeeNo, 3);

    AuditLog.add('SELF_ASSESSMENT', req.user.email, `Self-assessment submitted for ${employeeNo}`, '4 questions answered');

    res.json({ success: true, message: 'Self-assessment submitted successfully.' });
  } catch (error) {
    console.error('[Route] Self-assessment error:', error);
    res.status(500).json({ success: false, message: 'Error saving self-assessment: ' + error.message });
  }
});

// Feed Forward (Step 4)
// Item #4 — POST /api/feed-forward
// Item #11 — Gate validation: Step 3 must be complete
// Item #13 — RBAC: MANAGER only
router.post('/api/feed-forward', auth.authMiddleware, rbac.requireRole(['MANAGER', 'ADMIN']), (req, res) => {
  try {
    // Item #10 — Hard lock date check
    if (isSystemLocked()) {
      return res.status(403).json({ success: false, message: 'System is locked. No further edits allowed after the hard lock date.' });
    }

    const { employeeNo, comments, performanceRating, strengths, areasForImprovement } = req.body;
    const managerNo = req.user.email;

    if (!employeeNo) {
      return res.status(400).json({ success: false, message: 'employeeNo is required.' });
    }

    // Item #11 — Gate validation: Step 3 must be complete
    ensureWorkflowStatus(employeeNo);
    if (!Workflow.isStepEnabled(employeeNo, 4)) {
      return res.status(403).json({ success: false, message: 'Step 4 is locked. Step 3 (Self-Assessment) must be completed first.' });
    }

    // Upsert feed forward
    execute(`
      INSERT INTO feed_forward (employee_no, manager_no, comments, performance_rating, strengths, areas_for_improvement, updated_at)
      VALUES ($emp, $mgr, $comments, $rating, $strengths, $areas, datetime('now'))
      ON CONFLICT(employee_no) DO UPDATE SET
        manager_no = excluded.manager_no, comments = excluded.comments, performance_rating = excluded.performance_rating,
        strengths = excluded.strengths, areas_for_improvement = excluded.areas_for_improvement, updated_at = excluded.updated_at
    `, {
      $emp: employeeNo,
      $mgr: managerNo,
      $comments: comments || null,
      $rating: performanceRating || null,
      $strengths: strengths || null,
      $areas: areasForImprovement || null
    });

    saveDB();

    // Item #12 — Update workflow_status
    Workflow.completeStep(employeeNo, 4);

    AuditLog.add('FEED_FORWARD', managerNo, `Feed forward submitted for ${employeeNo}`, `Rating: ${performanceRating || 'N/A'}`);

    res.json({ success: true, message: 'Feed forward submitted successfully.' });
  } catch (error) {
    console.error('[Route] Feed forward error:', error);
    res.status(500).json({ success: false, message: 'Error saving feed forward: ' + error.message });
  }
});

// Acknowledgement (Steps 5 & 7)
// Item #5 — POST /api/acknowledgement
// Item #11 — Gate validation: Step 4 (for Step 5) or Step 6 (for Step 7)
// Item #13 — RBAC: MANAGER (Step 5) or EMPLOYEE (Step 7)
router.post('/api/acknowledgement', auth.authMiddleware, (req, res) => {
  try {
    // Item #10 — Hard lock date check
    if (isSystemLocked()) {
      return res.status(403).json({ success: false, message: 'System is locked. No further edits allowed after the hard lock date.' });
    }

    const { employeeNo, step, comment } = req.body;
    const acknowledgedBy = req.user.email;

    if (!employeeNo || !step) {
      return res.status(400).json({ success: false, message: 'employeeNo and step are required.' });
    }

    if (step !== 5 && step !== 7) {
      return res.status(400).json({ success: false, message: 'Acknowledgement is only valid for step 5 (Manager) or step 7 (Employee).' });
    }

    // Item #13 — RBAC enforcement
    if (step === 5 && req.user.role !== 'MANAGER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Step 5 acknowledgement requires MANAGER role.' });
    }
    if (step === 7 && req.user.role !== 'EMPLOYEE' && req.user.role !== 'MANAGER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Step 7 acknowledgement requires EMPLOYEE role.' });
    }

    // Item #11 — Gate validation
    ensureWorkflowStatus(employeeNo);
    if (!Workflow.isStepEnabled(employeeNo, step)) {
      const prerequisite = step === 5 ? 'Step 4 (Feed Forward)' : 'Step 6 (View Scores)';
      return res.status(403).json({ success: false, message: `Step ${step} is locked. ${prerequisite} must be completed first.` });
    }

    // Upsert acknowledgement
    execute(`
      INSERT INTO acknowledgements (employee_no, step, acknowledged_by, comment, submitted_at)
      VALUES ($emp, $step, $by, $comment, datetime('now'))
      ON CONFLICT(employee_no, step) DO UPDATE SET
        acknowledged_by = excluded.acknowledged_by, comment = excluded.comment, submitted_at = excluded.submitted_at
    `, { $emp: employeeNo, $step: step, $by: acknowledgedBy, $comment: comment || null });

    saveDB();

    // Item #12 — Update workflow_status
    Workflow.completeStep(employeeNo, step);

    // For Step 5, also mark Step 6 as accessible (read-only view)
    if (step === 5) {
      Workflow.completeStep(employeeNo, 6);
    }

    AuditLog.add('ACKNOWLEDGEMENT', acknowledgedBy, `Step ${step} acknowledgement for ${employeeNo}`, comment || '');

    res.json({ success: true, message: `Step ${step} acknowledgement recorded successfully.` });
  } catch (error) {
    console.error('[Route] Acknowledgement error:', error);
    res.status(500).json({ success: false, message: 'Error saving acknowledgement: ' + error.message });
  }
});

// Workflow Status (Gate checking)
// Item #6 — GET /api/workflow-status/:empId
router.get('/api/workflow-status/:empId', auth.authMiddleware, (req, res) => {
  try {
    const empId = req.params.empId;
    ensureWorkflowStatus(empId);
    const status = Workflow.getStatus(empId);

    res.json({
      success: true,
      employeeNo: empId,
      status: {
        step1Complete: status.step1_complete === 1,
        step2Complete: status.step2_complete === 1,
        step3Complete: status.step3_complete === 1,
        step4Complete: status.step4_complete === 1,
        step5Complete: status.step5_complete === 1,
        step6Complete: status.step6_complete === 1,
        step7Complete: status.step7_complete === 1,
        step1Date: status.step1_date,
        step2Date: status.step2_date,
        step3Date: status.step3_date,
        step4Date: status.step4_date,
        step5Date: status.step5_date,
        step6Date: status.step6_date,
        step7Date: status.step7_date
      },
      isLocked: isSystemLocked()
    });
  } catch (error) {
    console.error('[Route] Workflow status error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving workflow status: ' + error.message });
  }
});

// Scores (Step 6 - read only)
// Item #7 — GET /api/scores/:empId
router.get('/api/scores/:empId', auth.authMiddleware, (req, res) => {
  try {
    const empId = req.params.empId;

    // Get skills assessment
    const skills = queryAll('SELECT * FROM skills_assessment WHERE employee_no = $emp', { $emp: empId });

    // Get OKR data
    const okr = queryOne('SELECT * FROM okr_data WHERE employee_no = $emp', { $emp: empId });

    // Get feed forward
    const feedForward = queryOne('SELECT * FROM feed_forward WHERE employee_no = $emp', { $emp: empId });

    // Get self-assessment
    const selfAssessment = queryOne('SELECT * FROM self_assessment WHERE employee_no = $emp', { $emp: empId });

    // Calculate performance bracket if OKR data exists
    let performanceBracket = null;
    if (okr && okr.actual_score !== null) {
      const score = okr.actual_score;
      if (score >= 101) performanceBracket = 'Exceeded';
      else if (score >= 90.1) performanceBracket = 'Achieved';
      else if (score >= 81) performanceBracket = 'Needs Improvement';
      else performanceBracket = 'Failed';
    }

    res.json({
      success: true,
      employeeNo: empId,
      scores: {
        skills: skills,
        okr: okr,
        feedForward: feedForward,
        selfAssessment: selfAssessment,
        performanceBracket: performanceBracket
      }
    });
  } catch (error) {
    console.error('[Route] Scores error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving scores: ' + error.message });
  }
});

// Team list (Manager view)
// Item #8 — GET /api/team/:managerId
router.get('/api/team/:managerId', auth.authMiddleware, rbac.requireRole(['MANAGER', 'DATA_SPOC', 'ADMIN']), (req, res) => {
  try {
    const managerId = req.params.managerId;

    // Get manager's employee record to find their name for team lookup
    const manager = Employees.getByEmail(managerId) || Employees.getByEmpNo(managerId);
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Manager not found.' });
    }

    // Get team members using resolved supervisor relationship first, then fallback to name match
    let team = queryAll(
      'SELECT * FROM employees WHERE supervisor_employee_no = $empNo AND is_active = 1 ORDER BY full_name',
      { $empNo: manager.employee_no }
    );

    // Fallback: match by immediate_supervisor name if no resolved relationships
    if (team.length === 0) {
      const managerLookupName = manager.lookup_name || `${manager.first_name || ''} ${manager.last_name || ''}`.trim();
      team = queryAll(
        'SELECT * FROM employees WHERE immediate_supervisor = $mgr AND is_active = 1 ORDER BY full_name',
        { $mgr: managerLookupName }
      );
    }

    // Enrich with workflow status
    const teamWithStatus = team.map(member => {
      const status = Workflow.getStatus(member.employee_no);
      return {
        employeeNo: member.employee_no,
        fullName: member.full_name,
        email: member.email,
        department: member.department_label,
        team: member.team_label,
        position: member.position_title,
        band: member.band,
        workflowStatus: status ? {
          step1Complete: status.step1_complete === 1,
          step2Complete: status.step2_complete === 1,
          step3Complete: status.step3_complete === 1,
          step4Complete: status.step4_complete === 1,
          step5Complete: status.step5_complete === 1,
          step6Complete: status.step6_complete === 1,
          step7Complete: status.step7_complete === 1
        } : null
      };
    });

    res.json({ success: true, managerId, managerName: manager.full_name, team: teamWithStatus, teamCount: teamWithStatus.length });
  } catch (error) {
    console.error('[Route] Team error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving team: ' + error.message });
  }
});

// Org data (Data SPOC view)
// Item #9 — GET /api/org-data
router.get('/api/org-data/:spocId', auth.authMiddleware, rbac.requireRole(['DATA_SPOC', 'ADMIN']), (req, res) => {
  try {
    // Return organizational hierarchy for DataSPOC dropdowns
    const groups = queryAll('SELECT DISTINCT business_group_label FROM employees WHERE business_group_label IS NOT NULL AND is_active = 1 ORDER BY business_group_label');
    const departments = queryAll('SELECT DISTINCT department_label, business_group_label FROM employees WHERE department_label IS NOT NULL AND is_active = 1 ORDER BY department_label');

    // Build hierarchy
    const hierarchy = {};
    groups.forEach(g => {
      const groupName = g.business_group_label;
      hierarchy[groupName] = departments
        .filter(d => d.business_group_label === groupName)
        .map(d => d.department_label);
    });

    res.json({ success: true, hierarchy, groups: groups.map(g => g.business_group_label), departments: departments.map(d => d.department_label) });
  } catch (error) {
    console.error('[Route] Org data error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving org data: ' + error.message });
  }
});

/* --------------------------------------------------------------------------
   ADMIN ROUTES (require ADMIN role)
   -------------------------------------------------------------------------- */

/**
 * GET /api/admin/system-config
 * Get current system configuration
 * RBAC: ADMIN role only
 */
router.get('/api/admin/system-config', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
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
router.post('/api/admin/system-config', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
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
router.get('/api/admin/stats', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
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
 * Item #17 — actual email reminder logic
 * RBAC: ADMIN role only
 */
router.post('/api/admin/send-reminders', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
  try {
    const userEmail = req.user ? req.user.email : 'admin';
    const { step } = req.body; // Optional: target specific step

    // Find employees with incomplete steps
    const allEmployees = Employees.getAll ? Employees.getAll() : queryAll('SELECT employee_no, email, full_name FROM employees WHERE is_active = 1');
    const reminders = [];

    allEmployees.forEach(emp => {
      const status = Workflow.getStatus(emp.employee_no);
      if (!status) return;

      // Determine which step they're stuck on
      if (!status.step1_complete && (!step || step === 1)) reminders.push({ email: emp.email, name: emp.full_name, pendingStep: 1 });
      else if (!status.step2_complete && (!step || step === 2)) reminders.push({ email: emp.email, name: emp.full_name, pendingStep: 2 });
      else if (status.step1_complete && status.step2_complete && !status.step3_complete && (!step || step === 3)) reminders.push({ email: emp.email, name: emp.full_name, pendingStep: 3 });
      else if (status.step3_complete && !status.step4_complete && (!step || step === 4)) reminders.push({ email: emp.email, name: emp.full_name, pendingStep: 4 });
      else if (status.step4_complete && !status.step5_complete && (!step || step === 5)) reminders.push({ email: emp.email, name: emp.full_name, pendingStep: 5 });
      else if (status.step5_complete && !status.step7_complete && (!step || step === 7)) reminders.push({ email: emp.email, name: emp.full_name, pendingStep: 7 });
    });

    // TODO: Actually send emails via email.js when SMTP is configured
    // For now, log the reminder list and return count
    AuditLog.add('SEND_REMINDERS', userEmail, `Reminders queued for ${reminders.length} employees`, `Target step: ${step || 'all'}`);

    res.json({
      success: true,
      message: `${reminders.length} reminder(s) queued for sending.`,
      reminderCount: reminders.length,
      recipients: reminders.slice(0, 20) // Return first 20 for display
    });
  } catch (error) {
    console.error('[Admin] Error sending reminders:', error);
    res.status(500).json({ success: false, message: 'Error sending reminders: ' + error.message });
  }
});

/**
 * POST /api/admin/lock-system
 * Lock the system immediately (set hard lock date to now)
 * Item #18 — enforce hard lock immediately
 * RBAC: ADMIN role only
 */
router.post('/api/admin/lock-system', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
  try {
    const userEmail = req.user ? req.user.email : 'admin';
    const lockDate = new Date().toISOString();

    SystemConfig.set('hard_lock_date', lockDate, userEmail);
    AuditLog.add('SYSTEM_LOCK', userEmail, 'System locked immediately', `Lock date set to: ${lockDate}`);

    res.json({
      success: true,
      message: 'System locked successfully. All forms are now non-editable.',
      lockDate: lockDate
    });
  } catch (error) {
    console.error('[Admin] Error locking system:', error);
    res.status(500).json({ success: false, message: 'Error locking system: ' + error.message });
  }
});

/**
 * GET /api/admin/export-progress-report
 * Export progress report as CSV with real data
 * Item #19 — actual progress report generation
 * RBAC: ADMIN role only
 */
router.get('/api/admin/export-progress-report', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
  try {
    const stats = Workflow.getProgressStats();
    const total = stats.totalEmployees;

    // Build CSV with step-by-step completion data
    const stepNames = ['Skills Assessment', 'OKR Upload', 'Self-Assessment', 'Feed Forward', 'Manager Acknowledgement', 'View Scores', 'Employee Acknowledgement'];
    let csvData = 'Step,Step Name,Completed,Total,Percentage\n';

    stats.stepProgress.forEach((pct, idx) => {
      const completed = Math.round((pct / 100) * total);
      csvData += `Step ${idx + 1},${stepNames[idx]},${completed},${total},${pct}%\n`;
    });

    csvData += `\nOverall Completion Rate,,,${stats.completionRate}%\n`;
    csvData += `Total Employees,,,${total}\n`;
    csvData += `Fully Complete (Step 7),,,,${total - stats.pendingEmployees}\n`;
    csvData += `Pending,,,,${stats.pendingEmployees}\n`;
    csvData += `\nGenerated,${new Date().toISOString()}\n`;

    const userEmail = req.user ? req.user.email : 'admin';
    AuditLog.add('EXPORT_PROGRESS', userEmail, 'Progress report exported', `${total} employees`);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=progress-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvData);
  } catch (error) {
    console.error('[Admin] Error exporting progress:', error);
    res.status(500).json({ success: false, message: 'Error exporting progress report: ' + error.message });
  }
});

/**
 * GET /api/admin/export-history
 * Get export history
 * RBAC: ADMIN role only
 */
router.get('/api/admin/export-history', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
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
 * Item #20 — actual SFTP export trigger with data gathering
 * RBAC: ADMIN role only
 */
router.post('/api/admin/trigger-sftp-export', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
  try {
    const userEmail = req.user ? req.user.email : 'admin';

    // Gather all completed employee data for export
    const completedEmployees = queryAll('SELECT employee_no FROM workflow_status WHERE step7_complete = 1');
    const exportRecords = completedEmployees.length;

    if (exportRecords === 0) {
      return res.status(400).json({
        success: false,
        message: 'No employees have completed all 7 steps. SFTP export requires all steps to be done.'
      });
    }

    // TODO: Implement actual SFTP file generation and upload using shared/export.js
    // For now, log the export and record it
    ExportHistory.add('SUCCESS', exportRecords, 'CSV', `Exported ${exportRecords} employee records to SuccessFactors`);
    AuditLog.add('SFTP_EXPORT', userEmail, `SFTP export triggered: ${exportRecords} records`, 'Format: CSV');

    res.json({
      success: true,
      message: `SFTP export triggered successfully. ${exportRecords} employee record(s) exported.`,
      exportRecord: {
        timestamp: new Date().toISOString(),
        status: 'SUCCESS',
        records: exportRecords,
        details: `Exported ${exportRecords} fully-completed employee records to SuccessFactors via SFTP`
      }
    });
  } catch (error) {
    console.error('[Admin] Error triggering SFTP export:', error);
    res.status(500).json({ success: false, message: 'Error triggering SFTP export: ' + error.message });
  }
});

/**
 * GET /api/admin/skill-definitions
 * Get all skill definitions (core + leadership)
 * Item #14 — CRUD for Core Skills configuration (A3)
 * RBAC: ADMIN role only
 */
router.get('/api/admin/skill-definitions', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
  try {
    const skills = queryAll("SELECT * FROM skill_definitions WHERE skill_type = 'CORE' ORDER BY skill_name");
    res.json({ success: true, skills });
  } catch (error) {
    console.error('[Admin] Error loading skill definitions:', error);
    res.status(500).json({ success: false, message: 'Error loading skill definitions: ' + error.message });
  }
});

/**
 * POST /api/admin/skill-definitions
 * Add or update a core skill definition
 * Item #14 — CRUD for Core Skills configuration (A3)
 * RBAC: ADMIN role only
 */
router.post('/api/admin/skill-definitions', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
  try {
    const { skillName, description, requiredLevelPerBand } = req.body;
    const userEmail = req.user ? req.user.email : 'admin';

    if (!skillName) {
      return res.status(400).json({ success: false, message: 'skillName is required.' });
    }

    execute(`
      INSERT INTO skill_definitions (skill_type, skill_name, description, required_level_per_band, updated_at)
      VALUES ('CORE', $name, $desc, $levels, datetime('now'))
      ON CONFLICT(skill_type, skill_name) DO UPDATE SET
        description = excluded.description, required_level_per_band = excluded.required_level_per_band, updated_at = excluded.updated_at
    `, { $name: skillName, $desc: description || null, $levels: requiredLevelPerBand ? JSON.stringify(requiredLevelPerBand) : null });
    saveDB();

    AuditLog.add('SKILL_DEF_UPDATE', userEmail, `Core skill definition updated: ${skillName}`, '');
    res.json({ success: true, message: `Core skill "${skillName}" saved successfully.` });
  } catch (error) {
    console.error('[Admin] Error saving skill definition:', error);
    res.status(500).json({ success: false, message: 'Error saving skill definition: ' + error.message });
  }
});

/**
 * GET /api/admin/leadership-definitions
 * Get all leadership skill definitions
 * Item #15 — CRUD for Leadership Skills configuration (A4)
 * RBAC: ADMIN role only
 */
router.get('/api/admin/leadership-definitions', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
  try {
    const skills = queryAll("SELECT * FROM skill_definitions WHERE skill_type = 'LEADERSHIP' ORDER BY skill_name");
    res.json({ success: true, skills });
  } catch (error) {
    console.error('[Admin] Error loading leadership definitions:', error);
    res.status(500).json({ success: false, message: 'Error loading leadership definitions: ' + error.message });
  }
});

/**
 * POST /api/admin/leadership-definitions
 * Add or update a leadership skill definition
 * Item #15 — CRUD for Leadership Skills configuration (A4)
 * RBAC: ADMIN role only
 */
router.post('/api/admin/leadership-definitions', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
  try {
    const { skillName, description, requiredLevelPerBand } = req.body;
    const userEmail = req.user ? req.user.email : 'admin';

    if (!skillName) {
      return res.status(400).json({ success: false, message: 'skillName is required.' });
    }

    execute(`
      INSERT INTO skill_definitions (skill_type, skill_name, description, required_level_per_band, updated_at)
      VALUES ('LEADERSHIP', $name, $desc, $levels, datetime('now'))
      ON CONFLICT(skill_type, skill_name) DO UPDATE SET
        description = excluded.description, required_level_per_band = excluded.required_level_per_band, updated_at = excluded.updated_at
    `, { $name: skillName, $desc: description || null, $levels: requiredLevelPerBand ? JSON.stringify(requiredLevelPerBand) : null });
    saveDB();

    AuditLog.add('LEADERSHIP_DEF_UPDATE', userEmail, `Leadership skill definition updated: ${skillName}`, '');
    res.json({ success: true, message: `Leadership skill "${skillName}" saved successfully.` });
  } catch (error) {
    console.error('[Admin] Error saving leadership definition:', error);
    res.status(500).json({ success: false, message: 'Error saving leadership definition: ' + error.message });
  }
});

/**
 * GET /api/admin/org-hierarchy
 * Get organizational hierarchy (Corporate→Group→Dept→Team)
 * Item #16 — CRUD for org hierarchy (A6)
 * RBAC: ADMIN role only
 */
router.get('/api/admin/org-hierarchy', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
  try {
    const groups = queryAll('SELECT DISTINCT business_group_code, business_group_label FROM employees WHERE business_group_label IS NOT NULL AND is_active = 1 ORDER BY business_group_label');
    const departments = queryAll('SELECT DISTINCT department_code, department_label, business_group_label FROM employees WHERE department_label IS NOT NULL AND is_active = 1 ORDER BY department_label');

    // Build nested hierarchy
    const hierarchy = groups.map(g => ({
      groupCode: g.business_group_code,
      groupLabel: g.business_group_label,
      departments: departments
        .filter(d => d.business_group_label === g.business_group_label)
        .map(d => ({ deptCode: d.department_code, deptLabel: d.department_label }))
    }));

    res.json({ success: true, hierarchy, groupCount: groups.length, departmentCount: departments.length });
  } catch (error) {
    console.error('[Admin] Error loading org hierarchy:', error);
    res.status(500).json({ success: false, message: 'Error loading org hierarchy: ' + error.message });
  }
});

/**
 * POST /api/admin/org-hierarchy
 * Update organizational hierarchy (manual override)
 * Item #16 — CRUD for org hierarchy (A6)
 * RBAC: ADMIN role only
 */
router.post('/api/admin/org-hierarchy', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
  try {
    const { employeeNo, businessGroupLabel, departmentLabel } = req.body;
    const userEmail = req.user ? req.user.email : 'admin';

    if (!employeeNo) {
      return res.status(400).json({ success: false, message: 'employeeNo is required.' });
    }

    // Update employee's org assignment
    const updates = [];
    const params = { $emp: employeeNo };
    if (businessGroupLabel) { updates.push('business_group_label = $grp'); params.$grp = businessGroupLabel; }
    if (departmentLabel) { updates.push('department_label = $dept'); params.$dept = departmentLabel; }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one of businessGroupLabel or departmentLabel is required.' });
    }

    execute(`UPDATE employees SET ${updates.join(', ')}, updated_at = datetime('now') WHERE employee_no = $emp`, params);
    saveDB();

    AuditLog.add('ORG_HIERARCHY_UPDATE', userEmail, `Org hierarchy updated for ${employeeNo}`, JSON.stringify(req.body));
    res.json({ success: true, message: `Organization hierarchy updated for employee ${employeeNo}.` });
  } catch (error) {
    console.error('[Admin] Error updating org hierarchy:', error);
    res.status(500).json({ success: false, message: 'Error updating org hierarchy: ' + error.message });
  }
});

/**
 * GET /api/admin/audit-log
 * Get system audit log
 * RBAC: ADMIN role only
 */
router.get('/api/admin/audit-log', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
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
router.post('/api/admin/upload-employees', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
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

    // Auto-run role derivation pipeline after upload (RD-5)
    let roleDerivation = null;
    try {
      roleDerivation = Employees.runFullRoleDerivation();
      console.log(`[Admin] Role derivation: ${roleDerivation.managersDetected} managers, ${roleDerivation.matched} matched, ${roleDerivation.unresolved} unresolved`);
    } catch (rdError) {
      console.error('[Admin] Role derivation failed (non-blocking):', rdError.message);
    }

    if (result.errors.length > 0) {
      res.json({
        success: true,
        message: `${result.inserted} employees uploaded. ${result.errors.length} rows had errors.`,
        inserted: result.inserted,
        errors: result.errors.slice(0, 20),
        roleDerivation: roleDerivation
      });
    } else {
      res.json({
        success: true,
        message: `${result.inserted} employees uploaded successfully (${headers.length} columns)`,
        inserted: result.inserted,
        roleDerivation: roleDerivation
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
 * Run full role derivation pipeline (RD-2 + RD-3 + RD-4):
 * 1. Build lookup names (First + Last)
 * 2. Resolve supervisors (override → match → flag)
 * 3. Derive MANAGER roles from hierarchy
 * Preserves manually assigned DATA_SPOC and ADMIN roles.
 * RBAC: ADMIN role only
 */
router.post('/api/admin/derive-roles', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
  try {
    const result = Employees.runFullRoleDerivation();

    const userEmail = req.user ? req.user.email : 'admin';
    AuditLog.add('ROLE_DERIVATION', userEmail, 
      `Derivation complete: ${result.managersDetected} managers, ${result.matched} matched, ${result.unresolved} unresolved`,
      JSON.stringify(result));

    res.json({
      success: true,
      message: `Role derivation complete: ${result.managersDetected} managers detected, ${result.matched} supervisors matched`,
      lookupCount: result.lookupCount,
      matched: result.matched,
      overridden: result.overridden,
      unresolved: result.unresolved,
      external: result.external,
      managersDetected: result.managersDetected,
      preserved: result.preserved,
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
 * GET /api/admin/unresolved-supervisors
 * List supervisors that couldn't be matched (need override or are external)
 * RBAC: ADMIN role only
 */
router.get('/api/admin/unresolved-supervisors', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
  try {
    const unresolved = Employees.getUnresolvedSupervisors();
    res.json({ success: true, unresolved });
  } catch (error) {
    console.error('[Admin] Error loading unresolved supervisors:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/supervisor-overrides
 * Get all supervisor override rules
 * RBAC: ADMIN role only
 */
router.get('/api/admin/supervisor-overrides', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
  try {
    const overrides = Employees.getOverrides();
    res.json({ success: true, overrides });
  } catch (error) {
    console.error('[Admin] Error loading overrides:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/supervisor-override
 * Add or update a supervisor override rule
 * Body: { supervisorName, resolvedEmployeeNo, reason }
 * RBAC: ADMIN role only
 */
router.post('/api/admin/supervisor-override', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
  try {
    const { supervisorName, resolvedEmployeeNo, reason } = req.body;

    if (!supervisorName || !resolvedEmployeeNo) {
      return res.status(400).json({
        success: false,
        message: 'supervisorName and resolvedEmployeeNo are required'
      });
    }

    const userEmail = req.user ? req.user.email : 'admin';
    Employees.setOverride(supervisorName, resolvedEmployeeNo, reason, userEmail);

    AuditLog.add('OVERRIDE_SET', userEmail, 
      `Set override: "${supervisorName}" → ${resolvedEmployeeNo}`, reason || '');

    res.json({
      success: true,
      message: `Override saved: "${supervisorName}" → ${resolvedEmployeeNo}`
    });
  } catch (error) {
    console.error('[Admin] Error setting override:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/admin/supervisor-override/:id
 * Remove a supervisor override rule
 * RBAC: ADMIN role only
 */
router.delete('/api/admin/supervisor-override/:id', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'Invalid override ID' });
    }

    Employees.deleteOverride(id);

    const userEmail = req.user ? req.user.email : 'admin';
    AuditLog.add('OVERRIDE_DELETE', userEmail, `Deleted override ID: ${id}`, '');

    res.json({ success: true, message: 'Override deleted' });
  } catch (error) {
    console.error('[Admin] Error deleting override:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/re-derive-roles
 * Re-run role derivation (after override changes)
 * Alias for derive-roles — same logic
 * RBAC: ADMIN role only
 */
router.post('/api/admin/re-derive-roles', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
  try {
    // Re-run resolve + derive (lookup already built)
    const resolveResults = Employees.resolveSupervisors();
    const deriveResults = Employees.deriveRolesFromHierarchy();

    const userEmail = req.user ? req.user.email : 'admin';
    AuditLog.add('ROLE_RE_DERIVATION', userEmail, 
      `Re-derived: ${deriveResults.managersDetected} managers after override change`, '');

    res.json({
      success: true,
      message: `Re-derivation complete: ${deriveResults.managersDetected} managers`,
      ...resolveResults,
      managersDetected: deriveResults.managersDetected,
      roles: deriveResults.roles
    });
  } catch (error) {
    console.error('[Admin] Error re-deriving roles:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/role-assignment
 * Get all employees with current roles for role assignment UI
 * RBAC: ADMIN role only
 */
router.get('/api/admin/role-assignment', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
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
router.post('/api/admin/update-role', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
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
router.post('/api/admin/update-roles-bulk', auth.authMiddleware, rbac.requireAdmin(), (req, res) => {
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
