/**
 * Own Your Career — Database Layer (Converge Cloud)
 * 
 * SQLite database using sql.js (pure JavaScript, no native dependencies).
 * Designed for EC2 free tier (low memory, single-server).
 * 
 * All queries use parameterized statements to prevent SQL injection.
 * Database is persisted to disk and loaded into memory on startup.
 * 
 * @fileoverview Database connection, schema, and CRUD operations
 */

'use strict';

const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

/* --------------------------------------------------------------------------
   Database Connection
   -------------------------------------------------------------------------- */

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'oyc.db');

let db = null;
let SQL = null;

/**
 * Initialize database connection and create tables if not exist
 * @returns {Promise<Object>} Database instance
 */
async function initDB() {
  if (db) return db;

  // Ensure data directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Initialize sql.js
  SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log(`[DB] Loaded existing database from: ${DB_PATH}`);
  } else {
    db = new SQL.Database();
    console.log(`[DB] Created new database at: ${DB_PATH}`);
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Run migrations FIRST (add new columns to existing tables)
  runMigrations();

  // Create all tables (for fresh databases)
  createTables();

  // Save to disk
  saveDB();

  return db;
}

/**
 * Save database to disk
 */
function saveDB() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/**
 * Create all required tables (idempotent)
 */
function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_no TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      last_name TEXT,
      first_name TEXT,
      middle_name TEXT,
      email TEXT UNIQUE NOT NULL,
      employment_status TEXT,
      position_title TEXT,
      band TEXT,
      pathway_code TEXT,
      pathway_label TEXT,
      job_code TEXT,
      job_code_label TEXT,
      business_group_code TEXT,
      business_group_label TEXT,
      department_code TEXT,
      department_label TEXT,
      cost_center_code TEXT,
      cost_center_label TEXT,
      business_area TEXT,
      immediate_supervisor TEXT,
      ot_approver TEXT,
      assignment_code TEXT,
      base_of_assignment TEXT,
      affiliate TEXT,
      gender TEXT,
      hr_business_partner TEXT,
      lookup_name TEXT,
      supervisor_employee_no TEXT,
      supervisor_match_status TEXT DEFAULT 'unresolved',
      role TEXT DEFAULT 'EMPLOYEE',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Supervisor override table (for duplicate names / exceptions)
  db.run(`
    CREATE TABLE IF NOT EXISTS supervisor_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supervisor_name TEXT NOT NULL UNIQUE,
      resolved_employee_no TEXT NOT NULL,
      reason TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      updated_by TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS skills_assessment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_no TEXT NOT NULL,
      assessor_no TEXT NOT NULL,
      skill_type TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      remarks TEXT,
      submitted_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS okr_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_no TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      corporate_okr REAL,
      group_okr REAL,
      department_okr REAL,
      team_okr REAL,
      target_score REAL,
      actual_score REAL,
      weight REAL,
      okr_status TEXT DEFAULT 'NOT_STARTED',
      submitted_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS self_assessment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_no TEXT NOT NULL UNIQUE,
      q1_answer TEXT NOT NULL,
      q2_answer TEXT NOT NULL,
      q3_answer TEXT NOT NULL,
      q4_answer TEXT NOT NULL,
      submitted_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS feed_forward (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_no TEXT NOT NULL UNIQUE,
      manager_no TEXT NOT NULL,
      comments TEXT,
      performance_rating TEXT,
      strengths TEXT,
      areas_for_improvement TEXT,
      submitted_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS acknowledgements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_no TEXT NOT NULL,
      step INTEGER NOT NULL,
      acknowledged_by TEXT NOT NULL,
      comment TEXT,
      submitted_at TEXT DEFAULT (datetime('now')),
      UNIQUE(employee_no, step)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS workflow_status (
      employee_no TEXT PRIMARY KEY,
      step1_complete INTEGER DEFAULT 0,
      step1_date TEXT,
      step2_complete INTEGER DEFAULT 0,
      step2_date TEXT,
      step3_complete INTEGER DEFAULT 0,
      step3_date TEXT,
      step4_complete INTEGER DEFAULT 0,
      step4_date TEXT,
      step5_complete INTEGER DEFAULT 0,
      step5_date TEXT,
      step6_complete INTEGER DEFAULT 0,
      step6_date TEXT,
      step7_complete INTEGER DEFAULT 0,
      step7_date TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT (datetime('now')),
      event TEXT NOT NULL,
      user_email TEXT,
      action TEXT NOT NULL,
      details TEXT,
      status TEXT DEFAULT 'SUCCESS'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS export_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT (datetime('now')),
      status TEXT NOT NULL,
      records INTEGER DEFAULT 0,
      format TEXT,
      details TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS skill_definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      skill_type TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      description TEXT,
      required_level_per_band TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(skill_type, skill_name)
    )
  `);

  // Indexes (run after migrations so new columns exist)
  db.run('CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email)');
  db.run('CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_label)');
  db.run('CREATE INDEX IF NOT EXISTS idx_employees_group ON employees(business_group_label)');
  db.run('CREATE INDEX IF NOT EXISTS idx_employees_supervisor ON employees(immediate_supervisor)');
  db.run('CREATE INDEX IF NOT EXISTS idx_skills_employee ON skills_assessment(employee_no)');
  db.run('CREATE INDEX IF NOT EXISTS idx_okr_employee ON okr_data(employee_no)');
  db.run('CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp)');
  db.run('CREATE INDEX IF NOT EXISTS idx_overrides_name ON supervisor_overrides(supervisor_name)');
}

/**
 * Run database migrations (add columns to existing tables if missing).
 * Safe to run multiple times — uses try/catch to handle "column already exists" gracefully.
 */
function runMigrations() {
  const migrations = [
    'ALTER TABLE employees ADD COLUMN lookup_name TEXT',
    'ALTER TABLE employees ADD COLUMN supervisor_employee_no TEXT',
    'ALTER TABLE employees ADD COLUMN supervisor_match_status TEXT DEFAULT \'unresolved\''
  ];

  migrations.forEach(sql => {
    try {
      db.run(sql);
    } catch (e) {
      // Column likely already exists — this is expected and safe to ignore
      if (!e.message.includes('duplicate column name')) {
        console.warn('[DB] Migration skipped:', e.message);
      }
    }
  });

  // Indexes for new columns (safe to create after migration)
  try {
    db.run('CREATE INDEX IF NOT EXISTS idx_employees_lookup_name ON employees(lookup_name)');
    db.run('CREATE INDEX IF NOT EXISTS idx_employees_supervisor_empno ON employees(supervisor_employee_no)');
  } catch (e) {
    // Ignore if already exists
  }
}

/* --------------------------------------------------------------------------
   HELPERS
   -------------------------------------------------------------------------- */

/**
 * Run a query and return all matching rows as objects
 * @param {string} sql - SQL query
 * @param {Object} [params] - Named parameters
 * @returns {Object[]}
 */
function queryAll(sql, params) {
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * Run a query and return the first matching row
 * @param {string} sql
 * @param {Object} [params]
 * @returns {Object|null}
 */
function queryOne(sql, params) {
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

/**
 * Execute a statement (INSERT, UPDATE, DELETE)
 * @param {string} sql
 * @param {Object} [params]
 */
function execute(sql, params) {
  if (params) {
    db.run(sql, params);
  } else {
    db.run(sql);
  }
}

/**
 * Flexible column value finder (case-insensitive)
 * @param {Object} row
 * @param {string} targetCol
 * @returns {string|null}
 */
function findColumnValue(row, targetCol) {
  const target = targetCol.toLowerCase();
  for (const key of Object.keys(row)) {
    if (key.toLowerCase() === target) {
      return row[key] || null;
    }
  }
  return null;
}

/* --------------------------------------------------------------------------
   EMPLOYEE CRUD
   -------------------------------------------------------------------------- */

const Employees = {
  /**
   * Bulk insert employees from CSV upload (replaces all existing)
   * @param {string[]} headers - CSV column headers
   * @param {Object[]} rows - Array of row objects keyed by header name
   * @returns {{ inserted: number, errors: string[] }}
   */
  bulkUpload: function(headers, rows) {
    // SAP column name to DB column mapping
    const colMap = {
      'Employee No.': 'employee_no',
      'Full Name': 'full_name',
      'Last Name': 'last_name',
      'First Name': 'first_name',
      'Middle Name': 'middle_name',
      'Email Address': 'email',
      'Employment Status (Picklist Label)': 'employment_status',
      'Position Position Title (Label)': 'position_title',
      'Band (Picklist Label)': 'band',
      'Pathway (Pathway Code)': 'pathway_code',
      'Pathway (Label)': 'pathway_label',
      'Job Code (Job Code)': 'job_code',
      'Job Code (Label)': 'job_code_label',
      'Business Group (Group Code)': 'business_group_code',
      'Business Group (Label)': 'business_group_label',
      'Department (Department Code)': 'department_code',
      'Department (Label)': 'department_label',
      'Cost Center (externalCode)': 'cost_center_code',
      'Cost Center (Label)': 'cost_center_label',
      'Business Area (Picklist Label)': 'business_area',
      'Immediate Supervisor': 'immediate_supervisor',
      'OT Beyond 4 hours - Approver': 'ot_approver',
      'Assignment Code': 'assignment_code',
      'Base of Assignment (Assignment Name)': 'base_of_assignment',
      'Affiliate (Label)': 'affiliate',
      'Gender': 'gender',
      'HR Business Partner': 'hr_business_partner'
    };

    const errors = [];
    let inserted = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Map row to DB params
        const params = {};
        Object.keys(colMap).forEach(csvCol => {
          const dbCol = colMap[csvCol];
          params[dbCol] = findColumnValue(row, csvCol);
        });

        // Skip if no employee_no or email
        if (!params.employee_no && !params.email) {
          errors.push(`Row ${i + 1}: Missing Employee No. and Email`);
          continue;
        }

        // Default empty strings to null
        if (!params.employee_no) params.employee_no = params.email;
        if (!params.full_name) params.full_name = `${params.first_name || ''} ${params.last_name || ''}`.trim() || 'Unknown';
        if (!params.email) params.email = `${params.employee_no}@placeholder.local`;

        // INSERT OR REPLACE
        execute(`
          INSERT OR REPLACE INTO employees (
            employee_no, full_name, last_name, first_name, middle_name,
            email, employment_status, position_title, band,
            pathway_code, pathway_label, job_code, job_code_label,
            business_group_code, business_group_label,
            department_code, department_label,
            cost_center_code, cost_center_label,
            business_area, immediate_supervisor, ot_approver,
            assignment_code, base_of_assignment, affiliate, gender,
            hr_business_partner, updated_at
          ) VALUES (
            $employee_no, $full_name, $last_name, $first_name, $middle_name,
            $email, $employment_status, $position_title, $band,
            $pathway_code, $pathway_label, $job_code, $job_code_label,
            $business_group_code, $business_group_label,
            $department_code, $department_label,
            $cost_center_code, $cost_center_label,
            $business_area, $immediate_supervisor, $ot_approver,
            $assignment_code, $base_of_assignment, $affiliate, $gender,
            $hr_business_partner, datetime('now')
          )
        `, {
          $employee_no: params.employee_no,
          $full_name: params.full_name,
          $last_name: params.last_name,
          $first_name: params.first_name,
          $middle_name: params.middle_name,
          $email: params.email,
          $employment_status: params.employment_status,
          $position_title: params.position_title,
          $band: params.band,
          $pathway_code: params.pathway_code,
          $pathway_label: params.pathway_label,
          $job_code: params.job_code,
          $job_code_label: params.job_code_label,
          $business_group_code: params.business_group_code,
          $business_group_label: params.business_group_label,
          $department_code: params.department_code,
          $department_label: params.department_label,
          $cost_center_code: params.cost_center_code,
          $cost_center_label: params.cost_center_label,
          $business_area: params.business_area,
          $immediate_supervisor: params.immediate_supervisor,
          $ot_approver: params.ot_approver,
          $assignment_code: params.assignment_code,
          $base_of_assignment: params.base_of_assignment,
          $affiliate: params.affiliate,
          $gender: params.gender,
          $hr_business_partner: params.hr_business_partner
        });

        // Init workflow status for this employee
        execute(`INSERT OR IGNORE INTO workflow_status (employee_no) VALUES ($emp)`, {
          $emp: params.employee_no
        });

        inserted++;
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    // Persist to disk
    saveDB();

    return { inserted, errors };
  },

  /**
   * Get all employees with optional filters
   * @param {{ department?: string, group?: string, role?: string, search?: string }} filters
   * @returns {Object[]}
   */
  getAll: function(filters = {}) {
    let sql = 'SELECT * FROM employees WHERE is_active = 1';
    const params = {};

    if (filters.department) {
      sql += ' AND department_label = $department';
      params.$department = filters.department;
    }
    if (filters.group) {
      sql += ' AND business_group_label = $group';
      params.$group = filters.group;
    }
    if (filters.role) {
      sql += ' AND role = $role';
      params.$role = filters.role;
    }
    if (filters.search) {
      sql += ' AND (full_name LIKE $search OR email LIKE $search OR employee_no LIKE $search)';
      params.$search = `%${filters.search}%`;
    }

    sql += ' ORDER BY full_name ASC';
    return queryAll(sql, Object.keys(params).length > 0 ? params : undefined);
  },

  /**
   * Get employee by email
   * @param {string} email
   * @returns {Object|null}
   */
  getByEmail: function(email) {
    return queryOne('SELECT * FROM employees WHERE email = $email AND is_active = 1', { $email: email });
  },

  /**
   * Get employee by employee number
   * @param {string} empNo
   * @returns {Object|null}
   */
  getByEmpNo: function(empNo) {
    return queryOne('SELECT * FROM employees WHERE employee_no = $emp AND is_active = 1', { $emp: empNo });
  },

  /**
   * Get team members for a manager
   * @param {string} managerName
   * @returns {Object[]}
   */
  getTeam: function(managerName) {
    return queryAll(
      'SELECT * FROM employees WHERE immediate_supervisor = $mgr AND is_active = 1 ORDER BY full_name',
      { $mgr: managerName }
    );
  },

  /**
   * Update employee role
   * @param {string} empNo
   * @param {string} role
   */
  updateRole: function(empNo, role) {
    execute('UPDATE employees SET role = $role, updated_at = datetime(\'now\') WHERE employee_no = $emp', {
      $role: role, $emp: empNo
    });
    saveDB();
  },

  /**
   * RD-2: Build supervisor lookup names for all employees.
   * Concatenates first_name + " " + last_name → stores in lookup_name column.
   * Called automatically after bulkUpload.
   * @returns {number} Number of lookup names built
   */
  buildSupervisorLookup: function() {
    const allEmps = queryAll('SELECT employee_no, first_name, last_name FROM employees WHERE is_active = 1');
    let count = 0;

    allEmps.forEach(emp => {
      const firstName = (emp.first_name || '').trim();
      const lastName = (emp.last_name || '').trim();
      const lookupName = (firstName + ' ' + lastName).trim();

      if (lookupName) {
        execute(
          'UPDATE employees SET lookup_name = $lookup, updated_at = datetime(\'now\') WHERE employee_no = $emp',
          { $lookup: lookupName, $emp: emp.employee_no }
        );
        count++;
      }
    });

    saveDB();
    return count;
  },

  /**
   * RD-3: Resolve supervisors by matching immediate_supervisor against lookup_name.
   * Uses 3-layer priority: Override table → Exact match → Flag unresolved.
   * @returns {{ matched: number, overridden: number, unresolved: number, external: number }}
   */
  resolveSupervisors: function() {
    const results = { matched: 0, overridden: 0, unresolved: 0, external: 0 };

    // Get all employees with an immediate_supervisor value
    const allEmps = queryAll(
      'SELECT employee_no, immediate_supervisor FROM employees WHERE is_active = 1 AND immediate_supervisor IS NOT NULL AND immediate_supervisor != \'\''
    );

    // Get all overrides
    const overrides = queryAll('SELECT supervisor_name, resolved_employee_no FROM supervisor_overrides');
    const overrideMap = {};
    overrides.forEach(o => { overrideMap[o.supervisor_name] = o.resolved_employee_no; });

    allEmps.forEach(emp => {
      const supervisorName = (emp.immediate_supervisor || '').trim();
      if (!supervisorName) return;

      // Layer 1: Check override table
      if (overrideMap[supervisorName]) {
        execute(
          'UPDATE employees SET supervisor_employee_no = $supEmp, supervisor_match_status = $status, updated_at = datetime(\'now\') WHERE employee_no = $emp',
          { $supEmp: overrideMap[supervisorName], $status: 'override', $emp: emp.employee_no }
        );
        results.overridden++;
        return;
      }

      // Layer 2: Match against lookup_name
      const matches = queryAll(
        'SELECT employee_no FROM employees WHERE lookup_name = $name AND is_active = 1',
        { $name: supervisorName }
      );

      if (matches.length === 1) {
        // Exactly 1 match — resolved
        execute(
          'UPDATE employees SET supervisor_employee_no = $supEmp, supervisor_match_status = $status, updated_at = datetime(\'now\') WHERE employee_no = $emp',
          { $supEmp: matches[0].employee_no, $status: 'matched', $emp: emp.employee_no }
        );
        results.matched++;
      } else if (matches.length === 0) {
        // No match — external supervisor (not in this upload)
        execute(
          'UPDATE employees SET supervisor_employee_no = NULL, supervisor_match_status = $status, updated_at = datetime(\'now\') WHERE employee_no = $emp',
          { $status: 'external', $emp: emp.employee_no }
        );
        results.external++;
      } else {
        // 2+ matches — duplicate, needs override
        execute(
          'UPDATE employees SET supervisor_employee_no = NULL, supervisor_match_status = $status, updated_at = datetime(\'now\') WHERE employee_no = $emp',
          { $status: 'unresolved', $emp: emp.employee_no }
        );
        results.unresolved++;
      }
    });

    saveDB();
    return results;
  },

  /**
   * RD-4: Derive roles from resolved hierarchy.
   * Marks employees with direct reports as MANAGER.
   * Preserves manually assigned DATA_SPOC and ADMIN roles.
   * @returns {{ managersDetected: number, preserved: number, roles: Object }}
   */
  deriveRolesFromHierarchy: function() {
    // Find all employee_nos that appear as someone's supervisor_employee_no
    const supervisorEmpNos = queryAll(
      'SELECT DISTINCT supervisor_employee_no as emp_no FROM employees WHERE supervisor_employee_no IS NOT NULL AND is_active = 1'
    );

    const supervisorSet = new Set(supervisorEmpNos.map(r => r.emp_no));

    // Get current manually assigned roles (DATA_SPOC, ADMIN) — preserve these
    const manualRoles = queryAll(
      'SELECT employee_no, role FROM employees WHERE role IN (\'DATA_SPOC\', \'ADMIN\') AND is_active = 1'
    );
    const manualRoleMap = {};
    manualRoles.forEach(r => { manualRoleMap[r.employee_no] = r.role; });

    // Reset all non-manual roles to EMPLOYEE first
    execute('UPDATE employees SET role = \'EMPLOYEE\', updated_at = datetime(\'now\') WHERE role NOT IN (\'DATA_SPOC\', \'ADMIN\') AND is_active = 1');

    // Mark supervisors as MANAGER (skip if they have manual DATA_SPOC/ADMIN role)
    let managersDetected = 0;
    supervisorSet.forEach(empNo => {
      if (!manualRoleMap[empNo]) {
        execute(
          'UPDATE employees SET role = \'MANAGER\', updated_at = datetime(\'now\') WHERE employee_no = $emp AND is_active = 1',
          { $emp: empNo }
        );
        managersDetected++;
      }
    });

    saveDB();

    // Get final role counts
    const roleCountResult = queryAll(
      'SELECT role, COUNT(*) as count FROM employees WHERE is_active = 1 GROUP BY role'
    );
    const roles = {};
    roleCountResult.forEach(r => { roles[r.role] = r.count; });

    return {
      managersDetected,
      preserved: manualRoles.length,
      roles
    };
  },

  /**
   * Full role derivation pipeline (RD-2 + RD-3 + RD-4).
   * Called after employee upload to derive all roles automatically.
   * @returns {Object} Combined results from all steps
   */
  runFullRoleDerivation: function() {
    console.log('[DB] Running full role derivation pipeline...');

    // Step RD-2: Build lookup names
    const lookupCount = this.buildSupervisorLookup();
    console.log(`[DB] RD-2: Built ${lookupCount} lookup names`);

    // Step RD-3: Resolve supervisors
    const resolveResults = this.resolveSupervisors();
    console.log(`[DB] RD-3: Resolved supervisors — matched: ${resolveResults.matched}, overridden: ${resolveResults.overridden}, external: ${resolveResults.external}, unresolved: ${resolveResults.unresolved}`);

    // Step RD-4: Derive roles
    const deriveResults = this.deriveRolesFromHierarchy();
    console.log(`[DB] RD-4: Detected ${deriveResults.managersDetected} managers, preserved ${deriveResults.preserved} manual roles`);

    return {
      lookupCount,
      ...resolveResults,
      managersDetected: deriveResults.managersDetected,
      preserved: deriveResults.preserved,
      roles: deriveResults.roles
    };
  },

  /**
   * Get unresolved supervisors (for admin override UI)
   * @returns {Object[]} Array of { supervisor_name, affected_count }
   */
  getUnresolvedSupervisors: function() {
    return queryAll(`
      SELECT immediate_supervisor as supervisor_name, COUNT(*) as affected_count
      FROM employees 
      WHERE supervisor_match_status IN ('unresolved', 'external') AND is_active = 1 AND immediate_supervisor IS NOT NULL
      GROUP BY immediate_supervisor
      ORDER BY affected_count DESC
    `);
  },

  /**
   * Get all supervisor overrides
   * @returns {Object[]}
   */
  getOverrides: function() {
    return queryAll('SELECT * FROM supervisor_overrides ORDER BY created_at DESC');
  },

  /**
   * Add or update a supervisor override
   * @param {string} supervisorName
   * @param {string} resolvedEmployeeNo
   * @param {string} reason
   * @param {string} createdBy
   */
  setOverride: function(supervisorName, resolvedEmployeeNo, reason, createdBy) {
    execute(`
      INSERT INTO supervisor_overrides (supervisor_name, resolved_employee_no, reason, created_by)
      VALUES ($name, $emp, $reason, $by)
      ON CONFLICT(supervisor_name) DO UPDATE SET 
        resolved_employee_no = excluded.resolved_employee_no,
        reason = excluded.reason,
        created_by = excluded.created_by
    `, { $name: supervisorName, $emp: resolvedEmployeeNo, $reason: reason || '', $by: createdBy || '' });
    saveDB();
  },

  /**
   * Delete a supervisor override
   * @param {number} id - Override ID
   */
  deleteOverride: function(id) {
    execute('DELETE FROM supervisor_overrides WHERE id = $id', { $id: id });
    saveDB();
  },

  /**
   * Get all employees with roles for assignment UI
   * @returns {Object[]} Array with employee_no, full_name, email, department, role, supervisor info
   */
  getRoleAssignmentList: function() {
    return queryAll(`
      SELECT employee_no, full_name, email, department_label as department, band, 
             role, immediate_supervisor, supervisor_employee_no, supervisor_match_status
      FROM employees 
      WHERE is_active = 1 
      ORDER BY role DESC, full_name ASC
    `);
  },

  /**
   * Get total employee count
   * @returns {number}
   */
  count: function() {
    const row = queryOne('SELECT COUNT(*) as count FROM employees WHERE is_active = 1');
    return row ? row.count : 0;
  }
};

/* --------------------------------------------------------------------------
   SYSTEM CONFIGURATION
   -------------------------------------------------------------------------- */

const SystemConfig = {
  /**
   * Get all configuration values
   * @returns {Object}
   */
  getAll: function() {
    const rows = queryAll('SELECT key, value FROM system_config');
    const config = {};
    rows.forEach(row => { config[row.key] = row.value; });
    return config;
  },

  /**
   * Get a single config value
   * @param {string} key
   * @returns {string|null}
   */
  get: function(key) {
    const row = queryOne('SELECT value FROM system_config WHERE key = $key', { $key: key });
    return row ? row.value : null;
  },

  /**
   * Set a config value (upsert)
   * @param {string} key
   * @param {string} value
   * @param {string} updatedBy
   */
  set: function(key, value, updatedBy) {
    execute(`
      INSERT INTO system_config (key, value, updated_at, updated_by)
      VALUES ($key, $value, datetime('now'), $by)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by
    `, { $key: key, $value: value, $by: updatedBy });
    saveDB();
  },

  /**
   * Check if system is locked
   * @returns {boolean}
   */
  isLocked: function() {
    const lockDate = this.get('hard_lock_date');
    if (!lockDate) return false;
    return new Date() >= new Date(lockDate);
  }
};

/* --------------------------------------------------------------------------
   WORKFLOW STATUS
   -------------------------------------------------------------------------- */

const Workflow = {
  /**
   * Get workflow status for an employee
   * @param {string} empNo
   * @returns {Object|null}
   */
  getStatus: function(empNo) {
    return queryOne('SELECT * FROM workflow_status WHERE employee_no = $emp', { $emp: empNo });
  },

  /**
   * Mark a step as complete
   * @param {string} empNo
   * @param {number} step
   */
  completeStep: function(empNo, step) {
    const col = `step${step}_complete`;
    const dateCol = `step${step}_date`;
    execute(
      `UPDATE workflow_status SET ${col} = 1, ${dateCol} = datetime('now'), updated_at = datetime('now') WHERE employee_no = $emp`,
      { $emp: empNo }
    );
    saveDB();
  },

  /**
   * Check if a step is enabled (gate logic)
   * @param {string} empNo
   * @param {number} step
   * @returns {boolean}
   */
  isStepEnabled: function(empNo, step) {
    const status = this.getStatus(empNo);
    if (!status) return false;

    switch (step) {
      case 1: return true;
      case 2: return true;
      case 3: return status.step1_complete === 1 && status.step2_complete === 1;
      case 4: return status.step3_complete === 1;
      case 5: return status.step4_complete === 1;
      case 6: return status.step5_complete === 1;
      case 7: return status.step6_complete === 1;
      default: return false;
    }
  },

  /**
   * Get progress stats
   * @returns {Object}
   */
  getProgressStats: function() {
    const total = Employees.count();
    if (total === 0) {
      return { stepProgress: [0,0,0,0,0,0,0], totalEmployees: 0, completionRate: 0, pendingEmployees: 0, stepsCompleted: 0 };
    }

    const stats = queryOne(`
      SELECT 
        COALESCE(SUM(step1_complete), 0) as s1,
        COALESCE(SUM(step2_complete), 0) as s2,
        COALESCE(SUM(step3_complete), 0) as s3,
        COALESCE(SUM(step4_complete), 0) as s4,
        COALESCE(SUM(step5_complete), 0) as s5,
        COALESCE(SUM(step6_complete), 0) as s6,
        COALESCE(SUM(step7_complete), 0) as s7
      FROM workflow_status
    `);

    const stepProgress = [
      Math.round((stats.s1 / total) * 100),
      Math.round((stats.s2 / total) * 100),
      Math.round((stats.s3 / total) * 100),
      Math.round((stats.s4 / total) * 100),
      Math.round((stats.s5 / total) * 100),
      Math.round((stats.s6 / total) * 100),
      Math.round((stats.s7 / total) * 100)
    ];

    const completedRow = queryOne('SELECT COUNT(*) as count FROM workflow_status WHERE step7_complete = 1');
    const completedAll = completedRow ? completedRow.count : 0;
    const stepsCompleted = stats.s1 + stats.s2 + stats.s3 + stats.s4 + stats.s5 + stats.s6 + stats.s7;

    return {
      totalEmployees: total,
      stepProgress,
      completionRate: Math.round((completedAll / total) * 100),
      pendingEmployees: total - completedAll,
      stepsCompleted
    };
  }
};

/* --------------------------------------------------------------------------
   AUDIT LOG
   -------------------------------------------------------------------------- */

const AuditLog = {
  /**
   * Add an audit log entry
   */
  add: function(event, userEmail, action, details, status) {
    execute(
      'INSERT INTO audit_log (event, user_email, action, details, status) VALUES ($event, $user, $action, $details, $status)',
      { $event: event, $user: userEmail, $action: action, $details: details || null, $status: status || 'SUCCESS' }
    );
    saveDB();
  },

  /**
   * Get recent audit logs
   * @param {number} [limit=100]
   * @returns {Object[]}
   */
  getRecent: function(limit) {
    return queryAll('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT $limit', { $limit: limit || 100 });
  }
};

/* --------------------------------------------------------------------------
   EXPORT HISTORY
   -------------------------------------------------------------------------- */

const ExportHistory = {
  add: function(status, records, format, details) {
    execute(
      'INSERT INTO export_history (status, records, format, details) VALUES ($status, $records, $format, $details)',
      { $status: status, $records: records, $format: format, $details: details }
    );
    saveDB();
  },

  getRecent: function(limit) {
    return queryAll('SELECT * FROM export_history ORDER BY timestamp DESC LIMIT $limit', { $limit: limit || 50 });
  }
};

/* --------------------------------------------------------------------------
   CLOSE
   -------------------------------------------------------------------------- */

function closeDB() {
  if (db) {
    saveDB();
    db.close();
    db = null;
    console.log('[DB] Connection closed');
  }
}

/* --------------------------------------------------------------------------
   EXPORTS
   -------------------------------------------------------------------------- */

module.exports = {
  initDB,
  closeDB,
  saveDB,
  Employees,
  SystemConfig,
  Workflow,
  AuditLog,
  ExportHistory
};
