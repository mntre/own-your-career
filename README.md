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

---

## Roadmap for July 17 Launch

### June 28, 29, 30 — Business Solutions & Requirements Finalization
| Day | Activity | Owner |
|-----|----------|-------|
| **June 28 (Sun)** | Business solutions work with stakeholders | Luigi Espiritu, Zaira Bajar |
| **June 29 (Mon)** | Business solutions work with stakeholders | Luigi Espiritu, Zaira Bajar |
| **June 30 (Tue)** | Business solutions work with stakeholders; Workflow design finalized (Zaira) | Luigi Espiritu, Zaira Bajar |

**Deliverable:** Requirements locked, workflow confirmed (7-step), tech stack decision, Sprint 1 backlog ready

---

### Sprint 1: July 1 — July 4 (Wed-Sat) — Development Week 1
**Focus:** Build 3 portals (Manager, Data SPOC, Employee)
**Developers:** Charvin Penaverde (Lead), Jeremy Carino (Support)
**Management:** Luigi Espiritu (2 hrs/day), Zaira Bajar (2 hrs/day)
**Scrum:** JC Claudio — Daily standup 9 AM
**Working Days:** Wed Jul 1, Thu Jul 2, Fri Jul 3 (3 working days)

---

### Sprint 2: July 6 — July 10 (Mon-Fri) — Development Week 2
**Focus:** Continue portal development, system integration begins
**Developers:** Charvin Penaverde, Jeremy Carino
**QA Team:** Luigi Espiritu, Zaira Bajar, Mike Escobilla (wearing QA hats)
**Analytics:** Ernica Castronero (data validation)
**Working Days:** Mon Jul 6, Tue Jul 7, Wed Jul 8, Thu Jul 9, Fri Jul 10 (5 working days)
**SIT:** 1.5 hours per portal (immediate feedback to dev team)

---

### Sprint 3: July 13 — July 17 (Mon-Fri) — UAT & Go-Live
**Focus:** UAT execution, stakeholder sign-off, production deployment
**QA Team:** Luigi Espiritu, Zaira Bajar, Mike Escobilla
**Analytics:** Ernica Castronero (final data validation)
**Working Days:** Mon Jul 13, Tue Jul 14, Wed Jul 15, Thu Jul 16, Fri Jul 17 (5 working days)
**Go-Live:** July 17 (Friday)
**Post-Go-Live:** Monday Jul 20 — stability monitoring

---

### Last to Develop: BRD v4.0 Additions
**Source:** BRD v4.0 (July 1, 2026) — Updated requirements from Jelyn Ira Parreño & Gladys Erika Munsalud
**Status:** To be developed last, after all core portal and workflow features are complete
**Priority:** Lowest — build only after Steps 1–7 and core functionality are stable

| # | Item | Description | Impact |
|---|------|-------------|--------|
| 1 | **Team Heat Map** | Consolidated dashboard on Manager Portal showing score variances with color-coding: Red (negative/off track), Amber (zero/needs attention), Green (positive/on track). Must update in real-time as managers modify assessments. | New UI component |
| 2 | **Automated Weekly Reporting** | System must email performance reports 1–2x per week to admins (Hiroki Revereza, Jelyn Ira Parreño, Michael Ryan Escobilla, Ernica Castronero). Friday Automation Rule: auto-dispatch every Friday. | New backend scheduled task |
| 3 | **OKR Status Field** | Add "Current OKR Status" field with values: Not Started, On Track, Completed, Postponed. Must appear in reports. | Schema + UI change |
| 4 | **Mutual Acknowledgment (Revised Flow)** | BRD specifies a single mutual acknowledgment (both manager & employee see summary + mandatory checkbox + optional comment) rather than separate sequential acknowledgments. Evaluate workflow adjustment. | Workflow redesign |
| 5 | **Hard Deadline Admin Lock** | PMGM team establishes a hard deadline after which forms are locked and non-editable. Requires admin control mechanism. | New admin feature |
| 6 | **Self-Assessment Question Wording** | Update questions to reference "first half of the year (1H)" and "second half of the year (2H)" instead of "this quarter." | Quick constants fix |
| 7 | **Performance Bracket Boundary Fix** | Correct threshold: "Exceeded" should be 101% and above (not 101.01%). Align with BRD v4.0 levels. | Quick constants fix |

---

**Daily standup:** 9 AM, led by JC Claudio

---

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

## Status
- **Current Phase:** Development (Sprint 1)
- **Target Launch:** July 17, 2026
- **Workflow Design:** Confirmed (Zaira Bajar — 7-step process)
- **BRD Version:** v4.0 (July 1, 2026) — aligned
- **Last Updated:** July 7, 2026

---

## Pending Work — July 17 Launch Checklist

### 🔴 CRITICAL (Must Complete)

| # | Task | Component | Owner | Status | ETA |
|----|------|-----------|-------|--------|-----|
| 1 | Implement database layer (db.js) | Converge backend | Charvin | 🔴 TODO | Jul 7 |
| 2 | Hard lock date enforcement | All save functions | Charvin + Jeremy | 🔴 TODO | Jul 7 |
| 3 | Manager portal form submission | Manager Portal | Jeremy | 🔴 TODO | Jul 8 |
| 4 | Employee portal form submission | Employee Portal | Jeremy | 🔴 TODO | Jul 8 |
| 5 | DataSPOC portal form submission | DataSPOC Portal | Charvin | 🔴 TODO | Jul 8 |
| 6 | Server-side gate validation | Converge routes | Charvin | 🔴 TODO | Jul 8 |
| 7 | Server-side gate validation | AppScript endpoints | Jeremy | 🔴 TODO | Jul 8 |
| 8 | Conflict detection & resolution | Database.gs | Jeremy | 🔴 TODO | Jul 8 |
| 9 | Fix `detectConflict()` undefined error | Database.gs | Jeremy | 🔴 TODO | Jul 8 |
| 10 | Fix `logConflict()` undefined error | Database.gs | Jeremy | 🔴 TODO | Jul 8 |

### 🔴 CRITICAL — Admin Portal: Data Management (Luigi)

> **Context:** Before the 7-step workflow can run, the admin must seed the system with employee data,
> skill definitions, and role assignments. This is the "backend setup" that feeds all other portals.

| # | Task | Description | Component | Owner | Status | ETA |
|----|------|-------------|-----------|-------|--------|-----|
| A1 | Employee Database CSV Upload | Upload master employee list (Name, Email, Department, Group, Band/Grade, ManagerID, Role) | Admin Portal | Luigi | ✅ **COMPLETE** (UI & logic) | Jul 7 |
| A2 | Employee Database Viewer | View/search/filter uploaded employees; edit individual records pre-lock | Admin Portal | Luigi | � **DESIGN READY** (placeholder card) | Jul 9 |
| A3 | Core Skills Definition Upload | Upload/configure the 5 core skills + required levels per band/grade | Admin Portal | Luigi | � **DESIGN READY** (placeholder card) | Jul 9 |
| A4 | Leadership Skills Definition Upload | Upload/configure the 5 leadership skills + required levels per band/grade | Admin Portal | Luigi | � **DESIGN READY** (placeholder card) | Jul 9 |
| A5 | Role Assignment Management | Assign/reassign roles (Manager, Data SPOC, Employee) per employee; bulk update via CSV | Admin Portal | Luigi | � **DESIGN READY** (placeholder card) | Jul 9 |
| A6 | Organizational Hierarchy Setup | Define Corporate → Group → Department → Team structure for Data SPOC dropdown | Admin Portal | Luigi | � **DESIGN READY** (placeholder card) | Jul 9 |
| A7 | Backend: Employee Upload API | AppScript function + Converge route to write employee CSV to Google Sheets | Backend | Luigi | 🔴 TODO | Jul 9 |
| A8 | Backend: Skills Config API | AppScript function + Converge route to write skill definitions to Google Sheets | Backend | Luigi | 🔴 TODO | Jul 9 |
| A9 | Backend: Role Assignment API | AppScript function + Converge route to update roles in Employee Database sheet | Backend | Luigi | 🔴 TODO | Jul 9 |
| A10 | Validation: CSV format checks | Validate required columns, data types, duplicate emails, valid ManagerIDs | Admin Portal | Luigi | ✅ **COMPLETE** (duplicate detection, format validation) | Jul 7 |

**Admin Data Management — Breakdown:**

```
A1: Employee CSV Upload
├── UI: File input + drag-drop zone on Admin Portal "Data Management" tab
├── CSV columns: EmployeeID, Name, Email, Department, Group, Team, Band, Grade, ManagerID, Role
├── Validation: Required fields, email format, no duplicates, valid ManagerID references
├── Backend: Parse CSV → write rows to "Employee Database" Google Sheet tab
└── Feedback: Success count, error rows listed, preview before confirm

A2: Employee Database Viewer
├── UI: Searchable/filterable table of all employees
├── Features: Search by name/email, filter by department/group/role
├── Edit: Click row → inline edit (pre-lock only)
├── Delete: Remove employee (with confirmation)
└── Export: Download current employee list as CSV

A3 + A4: Skills Definition Upload
├── UI: Form or CSV upload for skill configurations
├── Core Skills: Technical Competency, Process Efficiency, Customer Focus, Collaboration, Innovation
├── Leadership Skills: Strategic Thinking, Team Development, Decision Making, Change Management, Stakeholder Management
├── Per skill: Name, Description, Required Level per Band/Grade (0-5 scale)
├── Backend: Write to "SkillDefinitions" config (or SystemConfig tab)
└── Used by: Step 1 (Manager Skills Assessment) to show required vs actual

A5: Role Assignment Management
├── UI: Table with dropdown per employee (MANAGER / DATA_SPOC / EMPLOYEE / ADMIN)
├── Bulk: Upload CSV with Email + Role columns to mass-assign
├── Validation: At least 1 admin, managers must have reports, SPOCs assigned per group
├── Backend: Update "Role" column in Employee Database sheet
└── Effect: Determines which portal each user sees after login

A6: Organizational Hierarchy Setup
├── UI: Tree view or nested dropdowns to define org structure
├── Levels: Corporate → Group → Department → Team
├── Used by: Data SPOC portal (Step 2) dropdown filters
├── Backend: Write to "OrgHierarchy" tab or derive from Employee Database
└── Validation: No orphan departments, all employees mapped to a team
```

### 🟡 HIGH PRIORITY (This Week)

| # | Task | Component | Owner | Status | ETA |
|----|------|-----------|-------|--------|-----|
| 11 | Admin statistics calculation | Admin Portal | Charvin | 🟡 TODO | Jul 9 |
| 12 | Email notification templates | Email service | TBD | 🟡 TODO | Jul 10 |
| 13 | Email sending implementation | Email.gs + email.js | TBD | 🟡 TODO | Jul 10 |
| 14 | Read-only enforcement after Step 5 | Frontend + Backend | Jeremy | 🟡 TODO | Jul 9 |
| 15 | Test both platforms (AppScript + Converge) | Integration | Charvin + Jeremy | 🟡 TODO | Jul 10 |

### 🟢 NICE-TO-HAVE (Phase 2+)

| # | Task | Component | Owner | Status | ETA |
|----|------|-----------|-------|--------|-----|
| 16 | SFTP export to SuccessFactors | export.js | TBD | 🟢 BACKLOG | Jul 15 |
| 17 | Sync status detection | manager-portal.js | TBD | 🟢 BACKLOG | Jul 15 |
| 18 | Audit logging comprehensive | All routes | TBD | 🟢 BACKLOG | Jul 15 |
| 19 | Rate limiting on API routes | Converge middleware | TBD | 🟢 BACKLOG | Jul 15 |
| 20 | CORS security hardening | Converge server | TBD | 🟢 BACKLOG | Jul 15 |

### 📊 Implementation Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| **Portal UIs** | 90% ✅ | HTML/CSS complete for all 4 portals |
| **Hard Gates Logic** | 100% ✅ | Client-side gates complete (gates.js) |
| **OKR Calculations** | 100% ✅ | All formulas correct, performance brackets accurate |
| **Form Validation** | 100% ✅ | All validators implemented (validation.js) |
| **Google OAuth** | 90% ✅ | Testing mode works; production ready |
| **RBAC Middleware** | 100% ✅ | Middleware functions complete |
| **AppScript Database** | 80% ✅ | CRUD mostly complete, conflict detection stubbed |
| **Manager Portal Logic** | 40% 🟡 | UI built, submission handlers incomplete |
| **Employee Portal Logic** | 30% 🟡 | Step 3 form built, no submission handler |
| **DataSPOC Portal Logic** | 40% 🟡 | CSV upload works, OKR submission incomplete |
| **Admin Portal UI** | 70% ✅ | Card-based Data Management grid complete (A1 active, A2-A6 ready) |
| **Admin Portal: A1 Employee Upload** | 100% ✅ | CSV parsing, validation, preview, upload logic complete |
| **Admin Portal: A2-A6 (Placeholders)** | 10% 🔄 | Cards designed & clickable, sections ready for implementation |
| **Converge Backend** | 20% ⚠️ | Routes defined, handlers all TODO |
| **Converge Database (db.js)** | 0% ❌ | 100% stubbed, blocking all data persistence |
| **Email Service** | 0% ❌ | Both Email.gs and email.js stubbed |
| **SFTP Export** | 0% ❌ | export.js stubbed |
| **Hard Lock Enforcement** | 0% ❌ | Set but never checked on save |
| **Server-Side Gates** | 0% ❌ | Only client-side enforcement (bypassable) |

### Legend
- 🔴 **CRITICAL** — Blocks July 17 launch, must complete ASAP
- 🟡 **HIGH PRIORITY** — Required for July 17, complete this week
- 🟢 **BACKLOG** — Can defer to Phase 2 if needed
- ✅ **COMPLETE** — Production ready
- 🟡 **PARTIAL** — Some implementation, needs completion
- ⚠️ **RISKY** — Dual deployment complexity
- ❌ **MISSING** — Zero implementation
- 🔄 **DESIGN READY** — UI/UX ready, implementation pending

### Recent Updates (July 7 — Today)

**Admin Portal: Data Management Tab Redesign**
- Replaced flat tab structure with **card-based grid layout** (6 functional cards)
- **A1: Employee Upload** — Full implementation complete
  - CSV parsing with BOM handling
  - Duplicate detection (email, employee ID)
  - Dynamic column detection (all SAP fields ingested as-is)
  - Preview table with first 50 rows
  - Validation error reporting (max 20 errors shown)
  - File size formatting & drag-drop upload
  - Success/error messaging
- **A2-A6: Placeholder cards** — UI ready, sections prepared for implementation
  - Employee Database Viewer
  - Core Skills Definition
  - Leadership Skills Definition
  - Role Assignment
  - Org Hierarchy Setup
- **Design improvements:**
  - Responsive grid (3 columns desktop, 1 mobile)
  - Hover effects & smooth animations (fade-in)
  - Click card to expand section
  - Clean visual hierarchy
  - No breaking changes to other tabsn B: PostgreSQL)
- Team assignments prepared
- Dual deployment risk assessment done
- **Added Admin Data Management tasks (A1-A10)** — Luigi owns employee upload, skills config, role assignment
- Merged PR #10 (mntre: OKR calculations + DataSPOC form updates)
- Merged PR #12 (xremy23: Manager portal team view bug fix)

---
