# Own Your Career

## Overview

This repository contains the source code for the **2026 Performance Management & Goals Management (PMGM)** "Own Your Career" system — an internal build to streamline performance evaluations through standardized, automated workflows that eliminate bias, reduce administrative overhead, and provide objective talent insights.

**Scope for July 17, 2026 Launch: MID-YEAR PERFORMANCE REVIEW WORKFLOW**

## Project Type
- [x] People Platforms & Analytics Project

## Tech Stack
- **Dual Deployment Strategy** — Same codebase deployed to both platforms simultaneously
  - **Platform A: Converge Cloud** — HTML, CSS, JavaScript (standard web app)
  - **Platform B: Google Apps Script** — AppScript with HTML Service
- **Shared Codebase** — Frontend code (HTML/CSS/JS) written to be deployable on both platforms
- **Database** — Secure data storage for employee and assessment data
- **Email Notifications** — Automated workflow alerts
- **SAP SuccessFactors Integration** — SFTP one-time bulk sync (after all reviews complete)
- **360-Degree Feedback** — Leveraging existing SF 360 module (no internal build; separate workflow)

### Dual Deployment Rationale
- Both apps built in parallel from the same code
- Management chooses preferred platform after seeing both
- Acts as a fallback if one platform has limitations
- Frontend logic (HTML/CSS/JS) is platform-agnostic; only the backend/data layer differs

---

## System Architecture: 3 Portal System

### Portal 1: Manager Portal (People Manager)
**Users:** Immediate Supervisors (People Managers)
**Functions:**
- **Step 1:** Skills Assessment (Core & Leadership Skills rating)
- **Step 4:** Feed Forward (Manager Assessment) form
- **Step 5:** Acknowledgement (Manager confirms mid-performance review)
- **Performance Summary:** Dashboard/summary of team's skills
- **My Details:** View own employee information (optional)

### Portal 2: Data SPOC Portal (OKR Uploading)
**Users:** Data SPOCs (Group/Pillar data owners — 1-2 per group)
**Functions:**
- **Step 2:** OKR Uploading Form (Corporate OKR, Team OKR, Targets, Weight)
- **My Organizational Data:** Corporate → Group → Department hierarchy
- **Uploading Status:** Track completion per member
- **Performance Summary:** Dashboard/Rankings of EEs, OKR Achievement
- Compute final score after all data uploaded

### Portal 3: Employee Portal (EE Portal)
**Users:** All Employees
**Functions:**
- **Step 3:** Self-Assessment form (4 mandatory questions)
- **Step 6:** View all scores and feedback (read-only after Feed Forward complete)
- **Step 7:** Acknowledgement (Employee confirms mid-performance review)
- **Sections visible:** OKR & Leadership Skills, OKR Achievement, Feed Forward/Manager Assessment

### Portal 4: Admin Portal (PMGM Team)
**Users:** PMGM Team Members (System Administrators)

**Tab-Based Structure (Organized by Functionality):**

The admin portal uses a **card-based UI within functional tabs** for clarity and quick access.

| Tab | Sub-Functions | Purpose |
|-----|----------------|---------|
| **📊 Data Management** | Employee Upload, Employee Database Viewer, Core Skills Definition, Leadership Skills Definition, Role Assignment, Organizational Hierarchy | Pre-workflow setup: seed system with employees, skill configs, and role assignments |
| **⚙️ System Configuration** | Hard Lock Date Management, Performance Thresholds, Email Settings, System Settings | Configure review period dates, lock enforcement, performance bracket thresholds |
| **📈 Progress Monitoring** | Overall Progress Dashboard, Step-wise Completion, Team Status, Performance Statistics | Real-time view of completion status, step breakdowns, admin analytics |
| **📤 SFTP Export & Audit** | Trigger SFTP Export, Export History, System Audit Log, User Activity Log | Initiate bulk export, view audit trails, compliance records |
| **🔧 Quick Actions** | Send Email Reminders, Lock System, Manual Data Corrections | Admin quick operations for workflow management |

**Data Management Tab (Detailed Breakdown):**

```
Data Management Tab (Card Grid Layout)

┌─────────────────────────────────────────────────────────────┐
│  📁 EMPLOYEE UPLOAD          │  👥 EMPLOYEE DATABASE        │
│  Upload master employee CSV  │  View/search/filter all      │
│  with roles & hierarchy      │  employees; edit pre-lock    │
├─────────────────────────────────────────────────────────────┤
│  🎯 CORE SKILLS DEF           │  👔 LEADERSHIP SKILLS DEF    │
│  Configure 5 core skills +   │  Configure 5 leadership      │
│  required levels per band    │  skills + levels per band    │
├─────────────────────────────────────────────────────────────┤
│  🔐 ROLE ASSIGNMENT          │  🏢 ORG HIERARCHY SETUP      │
│  Assign/reassign roles per   │  Define Corp→Group→Dept      │
│  employee; bulk CSV update   │  structure for SPOC dropdown │
└─────────────────────────────────────────────────────────────┘
```

**System Configuration Tab (Card Grid Layout):**

```
System Configuration Tab (Card Grid Layout)

┌─────────────────────────────────────────────────────────────┐
│  🔒 HARD LOCK DATE            │  📊 PERFORMANCE THRESHOLDS   │
│  Set/enforce system-wide     │  Configure bracket ranges:   │
│  edit cutoff date            │  Exceeded, Achieved, etc.    │
├─────────────────────────────────────────────────────────────┤
│  📧 EMAIL SETTINGS            │  ⚡ SYSTEM SETTINGS          │
│  Configure SMTP/GmailApp     │  Review period dates,        │
│  email templates & reminders │  system parameters           │
└─────────────────────────────────────────────────────────────┘
```

**Other Tabs (Card Grid Layout):**

```
Progress Monitoring Tab          SFTP Export & Audit Tab        Quick Actions Tab
┌────────────────────────┐      ┌────────────────────────┐     ┌────────────────────────┐
│ Overall Dashboard      │      │ Trigger SFTP Export    │     │ Send Email Reminders   │
│ Step Completion Stats  │      │ Export History         │     │ Lock System Now        │
│ Team Status            │      │ System Audit Log       │     │ Manual Corrections     │
│ Performance Analytics  │      │ User Activity Log      │     │                        │
└────────────────────────┘      └────────────────────────┘     └────────────────────────┘
```

---

## Self-Assessment Questions (Step 3)

Employees answer **4 mandatory questions** during Step 3. Questions must reference the specific time period:

| # | Question | Reference |
|----|----------|-----------|
| 1 | [Question A referencing 1H period] | First Half of the Year (1H) |
| 2 | [Question B referencing 1H period] | First Half of the Year (1H) |
| 3 | [Question C referencing 2H period] | Second Half of the Year (2H) |
| 4 | [Question D referencing 2H period] | Second Half of the Year (2H) |

**Important:** Do NOT use generic wording like "this quarter" — use explicit period references (1H/2H).  
**Location:** `src/shared/constants.js` defines exact question wording  
**Consistency:** Questions are identical across all portal deployments (Converge Cloud & Google Apps Script)

---

## Data Flow: 7-Step Sequential Process

```
Step 1: Manager Portal → Skills Assessment (Core & Leadership Skills)
  ↓ Enabled when form period opens

Step 2: Data SPOC Portal → OKR Upload (Corporate, Group, Team OKR + Targets + Weight)
  ↓ Can resubmit until hard lock date

Step 3: Employee Portal → Self-Assessment (4 mandatory questions)
  ↓ Enabled when Steps 1 & 2 complete for that employee

Step 4: Manager Portal → Feed Forward (Manager Assessment)
  ↓ Enabled when Step 3 complete for that employee

Step 5: Manager Portal → Acknowledgement (Manager confirms review took place)
  ↓ Enabled when Step 4 complete

Step 6: Employee Portal → View All Scores & Feedback (read-only)
  ↓ Enabled after Step 5 complete

Step 7: Employee Portal → Acknowledgement (Employee confirms review took place)
  ↓ END - All data locked

FINAL: SFTP Bulk Export to SuccessFactors (one-time, after ALL reviews complete)
```

---

## Key Technical Requirements

| Requirement | Details |
|-------------|---------|
| **Hard Gates** | Step 3 locked until Steps 1 & 2 complete; Step 4 locked until Step 3 complete; Step 6 locked until Step 5 complete |
| **Performance Brackets** | Exceeded (>101%) / Achieved (90.1-100%) / Needs Improvement (81-90%) / Failed (<80%) |
| **OKR Formulas** | Group Heads: 10% Corp + 90% Group; Dept Heads: 60% Group + 40% Dept; Team/Individual: 60% Dept + 40% Team |
| **Soft Deadlines** | Steps can be resubmitted/edited until hard lock date (same thing as "deadline") |
| **Hard Lock Date** | Admin-configured system-wide lock; after this date, ALL forms non-editable (no exceptions) |
| **360 Module** | Separate process — leveraging existing SuccessFactors 360 (no internal build) |
| **SFTP Integration** | One-time bulk export after ALL reviews complete |
| **Email Automation** | Auto-trigger notifications at each step transition (see Email Automation Triggers section) |
| **Role-Based Access** | Data SPOC, Manager, Employee, Admin roles with specific permissions |
| **Admin Controls** | System config, hard lock date management, progress monitoring, SFTP trigger |
| **Data Locking** | Edits allowed until hard lock date; after lock date, ALL forms non-editable |
| **Read-Only Locking** | After Step 5, all previous data becomes read-only for Employee; after Step 7, all data locked |

---

## Project Structure

```
own-your-career/
├── src/
│   ├── frontend/                # Shared across BOTH platforms (platform-agnostic)
│   │   ├── html/                # HTML templates (portal pages)
│   │   │   ├── login.html       # Google SSO login page
│   │   │   ├── manager-portal.html
│   │   │   ├── dataspoc-portal.html
│   │   │   ├── employee-portal.html
│   │   │   └── admin-portal.html    # Admin dashboard (Phase 1)
│   │   ├── css/                 # Stylesheets
│   │   │   └── styles.css
│   │   └── js/                  # Client-side JavaScript
│   │       ├── app.js           # Main app logic & routing
│   │       ├── login.js         # Google SSO authentication
│   │       ├── gates.js         # Hard gate logic
│   │       ├── calculations.js  # OKR score formulas
│   │       └── validation.js    # Form validation
│   │
│   ├── backend-converge/        # Converge Cloud specific
│   │   ├── server.js            # Express/Node server
│   │   ├── routes.js            # API routes
│   │   ├── db.js                # Database connection
│   │   ├── email.js             # SMTP email service
│   │   └── middleware/          # Auth & access control
│   │       ├── auth.js          # JWT + Google OAuth verification
│   │       └── rbac.js          # Role-Based Access Control
│   │
│   ├── backend-appscript/       # Google Apps Script specific
│   │   ├── Code.gs              # Main server functions
│   │   ├── Database.gs          # Google Sheets data layer
│   │   ├── Email.gs             # GmailApp email service
│   │   └── WebApp.gs            # doGet/doPost handlers
│   │
│   └── shared/                  # Shared utilities (both platforms)
│       ├── constants.js         # Performance brackets, formulas, config
│       ├── workflow.js          # Step sequencing logic
│       └── export.js            # SFTP export formatter
│
├── tests/                       # Test files
├── docs/                        # Developer documentation
├── .kiro/                       # Kiro AI steering files
│   └── steering/
├── .gitignore
└── README.md
```

---

## Project Governance

### File Structure Alignment
**All code and documentation files MUST be aligned with the README project structure and steering files.** 

Do not create:
- ❌ Code files outside the defined `src/` structure (e.g., `src/utils/`, `src/lib/`, `src/components/`)
- ❌ Extra markdown documentation files (ALL extra content goes in `src/consolidated-updates.md`)
- ❌ Temporary or ad-hoc files (use Git branches instead)

**Before creating any file**, verify it appears in:
1. The "Project Structure" section above
2. The File Responsibilities table in `.kiro/steering/structure.md`

See `.kiro/steering/structure.md` for full governance rules, including the mandatory `src/consolidated-updates.md` policy for all updates and notes.

---

## Quick Start

1. Clone this repository
2. Review the project steering files for context and standards (see Steering Hierarchy below)
3. Check the project structure above for where to place code
4. Follow Git conventions: branch from `main`, use `feature/[step]-[description]` naming
5. Reference Jira tickets PAC-6864 and PAC-8047 in commit messages

---

## Steering Hierarchy

The project follows a hierarchical steering model to avoid redundancy:

**Level 1: Master Standards** (`.kiro/steering/mother.md` in KiroGee workspace root)
- Code conventions (JavaScript, HTML, CSS, JSDoc)
- Git workflows (branching, commits, PRs)
- File management rules
- Security & data handling
- Testing & QA standards
- Project management (DoD, RACI, escalation)
- **Converge-development project steering standard (4 files required)**
- **All projects inherit these**

**Level 2: Workspace-Specific** (`Converge-development/.kiro/steering/`)
- `product.md` — Workspace overview (development team, resources, objectives)
- `structure.md` — Workspace folder structure conventions
- `code-conventions.md` — Development-specific code standards
- **All projects in Converge-development inherit these**

**Level 3: Project-Specific Steering** (`.kiro/steering/` in this project)
- `business-rules.md` — PMGM 2026 specific business logic (performance brackets, OKR formulas, gate logic)
- `product.md` — Product definition (3-portal system, 7-step workflow, stakeholders)
- `structure.md` — Own Your Career codebase layout and file responsibilities
- `tech.md` — Dual deployment architecture (Converge Cloud + Apps Script constraints)
- `branding.md` — UI/UX standards (colors, typography, components, accessibility)
- `security.md` — Security best practices (authentication, DDoS prevention, data protection)

**Use this priority when you encounter standards:**
1. Project-specific steering (if conflict, use this)
2. Workspace steering (if conflict, use this)
3. Mother steering (base standards applied to all)

---

## Email Automation Triggers

Auto-triggered at each step transition:

| Step Completion | Notification Sent To | Purpose |
|-----------------|-------------------|---------|
| Step 1 (Skills Assessment) complete | Data SPOC | Reminder: OKR uploading (Step 2) can now begin |
| Steps 1 + 2 both complete | Employee | Notification: Self-Assessment (Step 3) is now enabled |
| Step 3 (Self-Assessment) complete | Manager | Notification: Feed Forward form (Step 4) is now enabled |
| Step 4 (Feed Forward) complete | Manager | Reminder: Acknowledgement (Step 5) is ready for completion |
| Step 5 (Manager Acknowledgement) complete | Employee | Notification: View all scores & feedback (Step 6) is now available (read-only) |
| Step 7 (Employee Acknowledgement) complete | System Admin | Final: All review data locked for that employee; ready for SFTP export |

**Email Service:** SMTP (Converge Cloud) / GmailApp (Google Apps Script)  
**Implementation Files:** `src/backend-converge/email.js` and `src/backend-appscript/Email.gs`

---

## Data Locking & Workflow Timing

### Soft Deadlines (Editable Until Lock Date)
- **Steps 1, 2, 3, 4, 5:** Can be resubmitted and edited by their respective users **until the hard lock date**
- Users retain full edit access until that date; system allows resubmission
- **Purpose:** Accommodates last-minute changes, corrections, and business adjustments

### Hard Lock Date (System-Wide Non-Editable)
- **Definition:** Admin-configured date after which NO forms accept further edits (regardless of workflow step)
- **Scope:** ALL portals (Manager, Data SPOC, Employee) affected simultaneously
- **Enforcement:** 
  - After Step 5 complete: Employee-facing data becomes read-only (can still view scores)
  - After hard lock date: ALL data becomes non-editable across all roles (even admins)
  - After Step 7 complete: Specific employee's data locked permanently
  - No forms can be edited after hard lock date, period

### Data Locking Sequence
```
Steps 1-5: Users edit freely until hard lock date → Email notifications trigger at each step
  ↓
After Step 5 complete: Employee sees Step 6 (read-only scores & feedback)
  ↓
Hard Lock Date Reaches: ALL forms locked instantly (no edits allowed)
  ↓
After Step 7 Complete: Specific employee's workflow data archived & locked
  ↓
All Employees Complete: SFTP bulk export to SAP SuccessFactors (one-time)
```

### SFTP Export Timing
- **Triggered:** Only after ALL employees have completed Steps 1-7
- **Scope:** All finalized review data exported to SuccessFactors
- **Frequency:** One-time bulk export (not ongoing syncs)
- **Implementation:** `src/shared/export.js`

---

## Development Setup

### Prerequisites
- Node.js (v18+)
- npm (v9+)
- Google Cloud Project with Google Identity Services enabled (for SSO)

### Converge Cloud
```bash
cd src/backend-converge
npm install
npm run dev
```

### Google Apps Script
1. Open the Apps Script project in Google Drive
2. Copy files from `src/backend-appscript/` into the script editor
3. Deploy as web app for testing

### Google SSO Setup (Converge Cloud)
1. Create a Google Cloud Project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable **Identity Toolkit API** and **Identity Service API**
3. Configure OAuth consent screen
4. Create OAuth 2.0 Client ID (Web application type)
5. Add authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - Your production domain
6. Add the Client ID to `src/frontend/html/login.html`:
   ```html
   <div id="g_id_onload"
        data-client_id="YOUR_GOOGLE_CLIENT_ID"
        ...>
   ```


## Team

| Role | Name | Focus |
|------|------|-------|
| Department Head | Luigi Espiritu | Architecture, management oversight (2 hrs/day) |
| Business Analyst | Zaira Bajar | Workflow design, requirements, UAT (2 hrs/day) |
| Lead Developer | Charvin Penaverde | Converge backend, shared frontend, OKR engine |
| Developer | Jeremy Carino | AppScript backend, Employee Portal, gate logic |
| Scrum Master | JC Claudio | Daily standups, Jira management |
| QA/Analytics Lead | Mike Escobilla | Testing, cross-browser, email validation |
| Data Validation | Ernica Castronero | OKR formula verification, SFTP export validation |

---

## Key Details

| Field | Value |
|-------|-------|
| **Project Name** | PMGM 2026: Own Your Career |
| **Scope (July 17)** | MID-YEAR Performance Review Workflow (7-Step) |
| **Project Champion** | Jelyn Ira Parreño (People Capability & Growth) |
| **Department Head** | Luigi Espiritu (People Platforms and Analytics) |
| **Business Analyst** | Zaira Bajar (Workflow Design) |
| **Platform** | Dual Deployment: Converge Cloud (HTML/CSS/JS) + Google Apps Script |
| **360 Feedback** | SAP SuccessFactors (existing module — separate workflow) |
| **SFTP Sync** | One-time bulk export after all reviews complete |
| **Jira Tickets** | PAC-6864, PAC-8047 |

---

## Git Conventions

- **Branch naming:** `feature/[step-number]-[short-description]` (e.g., `feature/step1-skills-assessment`)
- **Commit format:** `PAC-XXXX: [verb] [what]` (e.g., `PAC-6864: implement OKR calculation engine`)
- **PR reviews:** At least 1 reviewer before merge to main
- **Never push directly to main**

---

## Success Criteria for July 17 Launch

- All 4 portals deployed and accessible (Manager, Data SPOC, Employee, Admin)
- All 7 steps functional end-to-end
- Hard gates enforce step sequencing (zero bypasses)
- OKR calculations 100% accurate per role-level formula
- Performance brackets correctly assigned
- Email notifications trigger at each step transition
- 100% UAT pass rate across all personas
- Zero critical/high defects open at go-live
- Stakeholder sign-off obtained

---

## Login & Portal Access Flow

### Authentication Method
- **Google SSO** (Google Identity Services) — corporate email only
- System verifies email against employee database
- No manual role selection at login — system determines access automatically

### Multi-Role Logic

Every person in the system has a **primary role** (from the role derivation process) but may also have **implicit roles**:

| Primary Role | Implicit Roles | Total Portals Accessible |
|--------------|---------------|--------------------------|
| EMPLOYEE (Team Member) | — | 1 (Employee Portal only) |
| MANAGER | + EMPLOYEE | 2 (Manager Portal + Employee Portal) |
| DATA_SPOC | + EMPLOYEE | 2 (Data SPOC Portal + Employee Portal) |
| ADMIN | + EMPLOYEE (+ MANAGER if applicable) | 2-4 (Admin + Employee + others if assigned) |

**Why?** Every Manager/SPOC/Admin is also an employee who needs to complete their own review (Steps 3, 6, 7).

### Login Flow

```
User clicks "Sign in with Google"
  ↓
Google SSO verifies corporate email
  ↓
System: SELECT * FROM employees WHERE email = [user email]
  ↓
Found? → Get primary role + determine all accessible portals
Not Found? → "Access denied — contact your admin" (not in employee database)
  ↓
Count accessible portals:
  ↓
IF 1 portal  → Auto-redirect to that portal (no picker page)
IF 2+ portals → Show Portal Picker homepage
```

### Portal Picker Page (Multi-Role Users)

```
┌─────────────────────────────────────────────────────────────────┐
│  Welcome, Luigi Gabriel Espiritu                                 │
│  luigi.espiritu@convergeict.com                                  │
│                                                                   │
│  Select a portal:                                                │
│                                                                   │
│  ┌───────────────────┐  ┌───────────────────┐                   │
│  │  👔 MANAGER       │  │  👤 EMPLOYEE      │                   │
│  │  PORTAL           │  │  PORTAL           │                   │
│  │                   │  │                   │                   │
│  │  Steps 1, 4, 5   │  │  Steps 3, 6, 7   │                   │
│  │  Team assessment  │  │  My own review   │                   │
│  │  & feed forward   │  │  & self-assess   │                   │
│  └───────────────────┘  └───────────────────┘                   │
│                                                                   │
│  ┌───────────────────┐                                           │
│  │  ⚙️ ADMIN         │                                           │
│  │  PORTAL           │                                           │
│  │                   │                                           │
│  │  System config,   │                                           │
│  │  progress, export │                                           │
│  └───────────────────┘                                           │
│                                                                   │
│  [Sign Out]                                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Auto-Redirect (Single-Role Users)

```
Pure Team Member (EMPLOYEE only):
  Login → Auto-redirect to Employee Portal → Steps 3, 6, 7

No picker shown. Seamless experience.
```

### Portal Access Matrix

| User Example | Primary Role | Portals Shown | Picker? |
|-------------|-------------|---------------|---------|
| Rachel Abacan (Team Member) | EMPLOYEE | Employee Portal | ❌ No — direct redirect |
| Luigi Espiritu (Sr. Manager + Admin) | ADMIN | Admin + Manager + Employee | ✅ Yes — picker |
| JC Claudio (Supervisor) | MANAGER | Manager + Employee | ✅ Yes — picker |
| Zaira Bajar (Data Analyst, assigned SPOC) | DATA_SPOC | Data SPOC + Employee | ✅ Yes — picker |
| Charvin Penaverde (Supervisor) | MANAGER | Manager + Employee | ✅ Yes — picker |
| Jeremy Carino (Team Member) | EMPLOYEE | Employee Portal | ❌ No — direct redirect |

### Role-to-Portal Mapping

```javascript
// Determine accessible portals based on role
function getAccessiblePortals(employee) {
  const portals = [];

  // Everyone gets Employee Portal (for their own review)
  portals.push({ id: 'employee', label: 'Employee Portal', icon: '👤', desc: 'Steps 3, 6, 7 — My own review' });

  // Role-specific portals
  if (employee.role === 'MANAGER' || employee.role === 'ADMIN') {
    portals.push({ id: 'manager', label: 'Manager Portal', icon: '👔', desc: 'Steps 1, 4, 5 — Team assessment' });
  }

  if (employee.role === 'DATA_SPOC') {
    portals.push({ id: 'dataspoc', label: 'Data SPOC Portal', icon: '📊', desc: 'Step 2 — OKR upload & rankings' });
  }

  if (employee.role === 'ADMIN') {
    portals.push({ id: 'admin', label: 'Admin Portal', icon: '⚙️', desc: 'System config & monitoring' });
  }

  return portals;
}
```

### Navigation Between Portals

Once inside a portal, user can switch to another accessible portal via:
- **Header nav** — Shows available portal links (only portals they have access to)
- **No re-login required** — Session persists, just navigates to different page

### Security Rules

1. **Server-side gate**: Even if user navigates to a portal URL directly, backend verifies their role before returning data
2. **No URL manipulation bypass**: `/manager-portal.html` checks RBAC before loading any team data
3. **Session token**: Contains email + primary role, but portal access is checked against DB on every request
4. **Admin override**: Admins can access all portals (for testing and support purposes)

### Implementation Files

| Component | File | Notes |
|-----------|------|-------|
| Google SSO login | `src/frontend/js/login.js` | Existing — needs multi-role wiring |
| Portal picker page | `src/frontend/html/login.html` (or new section) | Picker UI after SSO |
| Role-to-portal logic | `src/frontend/js/app.js` | getAccessiblePortals() |
| Session handling | `src/frontend/js/app.js` | Token decode, redirect logic |
| Server-side RBAC | `src/backend-converge/middleware/rbac.js` | Existing — already validates |

---

## Role Derivation Design: Supervisor Lookup + Override Table

### Problem Statement
The SAP employee export has an "Immediate Supervisor" column that stores the supervisor's name (e.g., `"Luigi Gabriel Espiritu"`), but the employee database stores names split across columns (`Last Name: "Espiritu"`, `First Name: "Luigi Gabriel"`). We need a reliable way to:
1. Determine who is a MANAGER (has direct reports)
2. Show a manager their team members
3. Enforce role-based access (Manager Portal, Employee Portal, etc.)
4. Handle duplicate names and edge cases gracefully

### Solution: 3-Layer Matching System

**Priority order for resolving `Immediate Supervisor` → `Employee No.`:**

```
Layer 1: Override Table (HIGHEST PRIORITY — admin-set exceptions always win)
  ↓ If no override found...
Layer 2: Lookup Match (First Name + Last Name = Immediate Supervisor)
  ↓ If duplicate or no match...
Layer 3: Flag for Admin (show unresolved list in Admin Portal)
```

### How It Works

**On every employee CSV upload:**

```
Step 1: Insert all employees into `employees` table
Step 2: Build lookup_name = First Name + " " + Last Name (column on employees table)
Step 3: Check override table FIRST
Step 4: Automatic matching (for non-overridden)
        → 1 match → resolve ✅
        → 0 matches → flag "external/unmatched" ⚠️
        → 2+ matches → flag "duplicate — needs override" ⚠️
Step 5: Store supervisor_employee_no on each employee
Step 6: Derive roles
        → Has reports → MANAGER
        → Default → EMPLOYEE
        → DATA_SPOC / ADMIN → manual only (never auto-assigned)
```

### Role Assignment Rules

| Role | How Assigned | Who Assigns | Logic |
|------|-------------|-------------|-------|
| `EMPLOYEE` | **Automatic (default)** | System | Everyone starts as EMPLOYEE on upload |
| `MANAGER` | **Auto-derived** | System | If employee_no appears as someone's supervisor_employee_no |
| `DATA_SPOC` | **Manual only** | Admin / Superadmin | Admin assigns via Role Assignment UI (1-2 per group) |
| `ADMIN` | **Manual only** | Superadmin | Superadmin assigns — highest privilege, never auto-assigned |

**Key rules:**
- Upload CSV → all employees default to `EMPLOYEE`
- Auto-derive runs → detects managers from hierarchy → upgrades to `MANAGER`
- `DATA_SPOC` and `ADMIN` are **never auto-assigned** — always manual admin decision
- Re-uploading CSV does NOT overwrite manually assigned `DATA_SPOC` or `ADMIN` roles

### Override Table (For Duplicates & Exceptions)

```sql
CREATE TABLE IF NOT EXISTS supervisor_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supervisor_name TEXT NOT NULL UNIQUE,
  resolved_employee_no TEXT NOT NULL,
  reason TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Database Schema Additions

```sql
-- Add to existing employees table
ALTER TABLE employees ADD COLUMN lookup_name TEXT;
ALTER TABLE employees ADD COLUMN supervisor_employee_no TEXT;
ALTER TABLE employees ADD COLUMN supervisor_match_status TEXT;
-- supervisor_match_status values: "matched" | "override" | "unresolved" | "external"
```

### Implementation Breakdown (Phases)

**RD-1: Schema Update (db.js)**
- Add `lookup_name`, `supervisor_employee_no`, `supervisor_match_status` columns to `employees` table
- Create `supervisor_overrides` table
- File: `src/backend-converge/db.js`

**RD-2: Build Lookup on Upload (db.js)**
- After `bulkUpload()` completes, auto-run a new function `buildSupervisorLookup()`
- For each employee: `lookup_name = first_name + " " + last_name`
- Store in the `lookup_name` column
- File: `src/backend-converge/db.js`

**RD-3: Resolve Supervisors (db.js)**
- New function `resolveSupervisors()`
- For each employee with an `immediate_supervisor` value:
  1. Check `supervisor_overrides` table first (Layer 1)
  2. If no override → match `immediate_supervisor` against all `lookup_name` values (Layer 2)
  3. If exactly 1 match → set `supervisor_employee_no`, status = "matched"
  4. If 0 matches → status = "external" (supervisor not in this upload)
  5. If 2+ matches → status = "unresolved" (duplicate, needs override)
- File: `src/backend-converge/db.js`

**RD-4: Derive Roles (db.js)**
- New function `deriveRolesFromHierarchy()` (replace existing `autoDerivRoles`)
- Query: find all employee_nos that appear as someone's `supervisor_employee_no`
- Mark those as MANAGER
- **Preserve** existing DATA_SPOC and ADMIN roles (don't overwrite manual assignments)
- Everyone else stays EMPLOYEE
- File: `src/backend-converge/db.js`

**RD-5: Wire to Upload Flow (routes.js + admin.js)**
- After employee upload API succeeds → auto-trigger RD-2, RD-3, RD-4 in sequence
- Return results: `{ matched: X, unresolved: Y, external: Z, managersDetected: N }`
- Frontend shows summary after upload
- Files: `src/backend-converge/routes.js`, `src/frontend/js/admin.js`

**RD-6: Override Management UI (admin-portal.html + admin.js)**
- Show unresolved supervisors list in Admin Portal (A5 Role Assignment section)
- Admin can set override: "This supervisor name → this employee number"
- After saving override → re-run RD-3 and RD-4 for affected employees
- Files: `src/frontend/html/admin-portal.html`, `src/frontend/js/admin.js`

**RD-7: API Endpoints (routes.js)**
- `GET /api/admin/unresolved-supervisors` — List supervisors that couldn't be matched
- `POST /api/admin/supervisor-override` — Save an override rule
- `DELETE /api/admin/supervisor-override/:id` — Remove an override
- `POST /api/admin/re-derive-roles` — Re-run derivation (after override changes)
- File: `src/backend-converge/routes.js`

### Implementation Priority

| Phase | Dependency | Required for |
|-------|-----------|-------------|
| RD-1 | None | Everything else |
| RD-2 | RD-1 | Supervisor matching |
| RD-3 | RD-1, RD-2 | Role derivation |
| RD-4 | RD-3 | Login portal routing |
| RD-5 | RD-2, RD-3, RD-4 | End-to-end upload flow |
| RD-6 | RD-5 | Edge case resolution (can defer) |
| RD-7 | RD-1 | RD-5 and RD-6 |

**Minimum viable:** RD-1 → RD-2 → RD-3 → RD-4 → RD-5 (gets the full auto-flow working)
**Can defer:** RD-6, RD-7 (override UI — only needed when duplicates occur)
