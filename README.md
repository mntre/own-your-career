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

## System Architecture: 3-Portal System

### Portal 1: Manager Portal (People Manager)
**Users:** Immediate Supervisors (People Managers)

**Functions:**
- **Step 1:** Skills Assessment (Core & Leadership Skills rating)
- **Step 4:** Feed Forward (Manager Assessment) form
- **Step 5:** Acknowledgement (Manager confirms mid-performance review)
- **Performance Summary:** Dashboard/summary of team's skills
- **My Details:** View own employee information

### Portal 2: Data SPOC Portal (OKR Uploading)
**Users:** Data SPOCs (Group/Pillar data owners — 1-2 per group)

**Functions:**
- **Step 2:** OKR Uploading Form (Corporate, Group, Team OKR + Targets + Weights)
- **My Organizational Data:** Corporate → Group → Department hierarchy
- **My Uploads:** View all submitted hierarchies with employee lists, delete/re-upload capability
- **Performance Summary:** Dashboard/Rankings with OKR Achievement

### Portal 3: Employee Portal (EE Portal)
**Users:** All Employees

**Functions:**
- **Step 3:** Self-Assessment form (4 mandatory questions)
- **Step 6:** View all scores and feedback (read-only after manager acknowledgement)
- **Step 7:** Acknowledgement (Employee confirms review)

### Portal 4: Admin Portal (PMGM Team)
**Users:** PMGM Team Members (System Administrators)

**Functions:**
- Employee CSV Upload & Database Management
- Core Skills & Leadership Skills Definition
- Organizational Hierarchy Setup
- Hard Lock Date Management
- Progress Monitoring & Reporting
- SFTP Export & Audit Logs

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
| **Soft Deadlines** | Steps can be resubmitted/edited until hard lock date |
| **Hard Lock Date** | Admin-configured system-wide lock; after this date, ALL forms non-editable (no exceptions) |
| **360 Module** | Separate process — leveraging existing SuccessFactors 360 (no internal build) |
| **SFTP Integration** | One-time bulk export after ALL reviews complete |
| **Email Automation** | Auto-trigger notifications at each step transition |
| **Role-Based Access** | Data SPOC, Manager, Employee, Admin roles with specific permissions |
| **Data Locking** | Edits allowed until hard lock date; after lock, ALL forms non-editable |

---

## Self-Assessment Questions (Step 3)

Employees answer **4 mandatory questions** during Step 3. Questions must reference the specific time period:

| # | Period |
|----|--------|
| 1 | First Half of the Year (1H) |
| 2 | First Half of the Year (1H) |
| 3 | Second Half of the Year (2H) |
| 4 | Second Half of the Year (2H) |

**Important:** Use explicit period references (1H/2H), not generic wording like "this quarter."

**Location:** `src/shared/constants.js` defines exact question wording  
**Consistency:** Questions are identical across all portal deployments (Converge Cloud & Google Apps Script)

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
│   │   │   └── admin-portal.html
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
└── README.md                    # This file (product overview)
```

---

## Governance

See `.kiro/steering/structure.md` for file governance rules and steering hierarchy.

All pending work, task tracking, and deployment status lives in this README under "Current Status & Roadmap" and detailed notes in `src/consolidated-updates.md`.

---

## Development Setup

See `.kiro/steering/tech.md` for development environment configuration and deployment instructions.

---

## Current Status & Roadmap

For detailed status on completed and pending work, see `src/consolidated-updates.md`. This includes:
- Implementation details and development notes
- Phase-specific testing guides
- Troubleshooting and debugging tips

**Current Progress:** 35 of 49 items complete (~71%)  
**Last Updated:** July 9, 2026  
**Next Milestone:** Email service + UAT (due July 15)  
**Launch Date:** July 17, 2026

### Recently Completed (July 9)
- ✅ Data SPOC Portal: "My Uploads" tab with accordion view of submitted hierarchies
- ✅ Data SPOC Portal: Delete functionality moved to My Uploads tab
- ✅ Data SPOC Portal: "Confirm & Close" now saves to backend + deletes draft
- ✅ Backend: `GET /api/okr-ownership/details` endpoint (hierarchy + employee list)
- ✅ Backend: OKR ownership, draft save/resume, and delete operations verified
- ✅ Database: SQLite (oyc.db) persistence confirmed across sessions

### Pending (High Priority)
- [ ] Email notification service (auto-trigger at step transitions)
- [ ] Employee Portal: Step 3 Self-Assessment (Converge backend integration)
- [ ] Manager Portal: Step 1 Skills Assessment (Converge backend integration)
- [ ] Manager Portal: Step 4 Feed Forward (Converge backend integration)
- [ ] Hard lock date enforcement across all portals
- [ ] UAT testing with all personas
- [ ] SFTP export to SuccessFactors

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

## Git Conventions

- **Branch naming:** `feature/[step-number]-[short-description]` (e.g., `feature/step1-skills-assessment`)
- **Commit format:** `PAC-XXXX: [verb] [what]` (e.g., `PAC-6864: implement OKR calculation engine`)
- **PR reviews:** At least 1 reviewer before merge to main
- **Never push directly to main**

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

