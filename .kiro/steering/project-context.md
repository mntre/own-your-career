# Own Your Career — Project Context

## Overview

**PMGM 2026: Own Your Career** is a 7-step Mid-Year Performance Review system built internally by the People Platforms and Analytics team. It replaces a PHP 3M vendor (SAP SuccessFactors reconfiguration) solution with a PHP 81,915 internal build.

**Target Launch:** July 17, 2026
**Scope:** Mid-Year Performance Review Workflow only (Phase 1)

## Dual Deployment Strategy

This project uses a **shared frontend codebase** deployed simultaneously to two platforms:

| Platform | Frontend | Backend | Database | Auth | Email | API Pattern |
|----------|----------|---------|----------|------|-------|-------------|
| **Converge Cloud** | HTML/CSS/JS | Node.js / Express | SQL/NoSQL (TBD) | Custom SSO | SMTP | REST endpoints |
| **Google Apps Script** | HTML Service (same code) | .gs server-side | Google Sheets | Google OAuth | GmailApp/MailApp | google.script.run |

**Why dual deployment:**
- Management evaluates both platforms side-by-side
- One acts as fallback if the other has limitations
- Frontend logic is platform-agnostic; only backend/data layer differs

## 3-Portal Architecture

### Portal 1: Manager Portal (People Managers)
- Step 1: Skills Assessment (Core & Leadership Skills rating)
- Step 4: Feed Forward / Manager Assessment
- Step 5: Manager Acknowledgement
- Performance Summary dashboard

### Portal 2: Data SPOC Portal (1-2 per group)
- Step 2: OKR Upload (Corporate → Group → Department hierarchy)
- Compute final score (auto-calculation per role-level formula)
- Upload status tracking
- Performance Summary / Rankings

### Portal 3: Employee Portal (All Employees)
- Step 3: Self-Assessment (4 mandatory questions)
- Step 6: View All Scores & Feedback (read-only after Step 5)
- Step 7: Employee Acknowledgement

## Key Decisions

1. **Internal build over SAP SuccessFactors** — Cost and timeline reasons (91.8% savings)
2. **No SAP CPI real-time integration** — Replaced by one-time SFTP bulk export after all reviews complete
3. **360 Feedback NOT built internally** — Uses existing SuccessFactors 360 module (separate workflow)
4. **Calibration / 9-Box Matrix** — Post-launch (not in Phase 1 scope)
5. **Responsive web only** — No mobile-native app

## Team

| Role | Name | Focus |
|------|------|-------|
| Department Head | Luigi Espiritu | Architecture decisions, management oversight |
| Business Analyst | Zaira Bajar | Workflow design, requirements, UAT |
| Lead Developer | Charvin Penaverde | Converge Cloud backend, shared frontend, OKR engine |
| Developer | Jeremy Carino | Google Apps Script backend, Employee Portal, gate logic |
| Scrum Master | JC Claudio | Daily standups, Jira management |
| QA/Analytics | Mike Escobilla | Testing, cross-browser, email validation |
| Data Validation | Ernica Castronero | OKR formula verification, SFTP export validation |

## Integration Points

| Integration | Method | Direction | Frequency |
|------------|--------|-----------|-----------|
| SAP SuccessFactors | SFTP | Internal → SF | One-time (after ALL reviews complete) |
| Email Service | SMTP / GmailApp | Internal → Users | Per step transition |
| Employee Database | SQL / Google Sheets | Read/Write | Per form submission |
| Authentication | SSO / Google OAuth | External → Internal | Per login |

## Non-Functional Requirements

- Page load under 3 seconds
- Available during business hours (8 AM - 5 PM PHT, Mon-Fri)
- Role-based access (employees cannot view other employees' data)
- All form submissions validated before save; no partial saves
- Support concurrent usage during review period
- Cross-browser: Chrome, Edge, Firefox (latest versions)
- Audit trail: log all form submissions with timestamp + user ID
- Same frontend deployable on both platforms without major refactoring

## Related Documentation

The full requirements, wireframes, and technical solutions document are maintained in the Technical Documents workspace (separate from this development repo). Key references:
- Technical Solutions Document (architecture, cost, WBS)
- Functional Requirements (FR-01 to FR-14)
- Wireframe interpretations (3 portals, screen flows)
- Core & Leadership Skills competency framework (5-level scale)
- Stakeholder decisions and updates
