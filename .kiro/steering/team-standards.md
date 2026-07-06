# Own Your Career — Team Standards

This steering document provides shared guidelines and standards for the own-your-career development project.

## AI Instructions — READ FIRST

**Before doing anything in this project, you MUST:**
1. **Read this steering file** (`.kiro/steering/team-standards.md`)
2. **Read the README.md**
3. **Follow the project structure exactly** - do NOT create new files beyond what's defined in README.md
4. **Use the 3rd person point of view** in all work documents
5. **Verify output aligns** with team standards before finishing any task

## Overview

This repository contains the source code for the **2026 Performance Management & Goals Management (PMGM)** "Own Your Career" system — an internal build to streamline performance evaluations through standardized, automated workflows that eliminate bias, reduce administrative overhead, and provide objective talent insights.

**Target Launch:** July 17, 2026  
**Scope:** Mid-Year Performance Review Workflow only (Phase 1)

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
- **360-Degree Feedback** — Leveraging existing SF 360 module (no internal build; separate workflow to be created)

## Project Structure

```
own-your-career/
├── src/
│   ├── frontend/                # Shared across BOTH platforms (platform-agnostic)
│   │   ├── html/                # HTML templates
│   │   │   ├── manager-portal.html
│   │   │   ├── dataspoc-portal.html
│   │   │   └── employee-portal.html
│   │   ├── css/                 # Stylesheets
│   │   │   └── styles.css
│   │   └── js/                  # Client-side JavaScript
│   │       ├── app.js           # Main app logic
│   │       ├── gates.js         # Hard gate logic
│   │       ├── calculations.js  # OKR score formulas
│   │       └── validation.js    # Form validation
│   │
│   ├── backend-converge/        # Converge Cloud specific
│   │   ├── server.js            # Express server
│   │   ├── routes.js            # API routes
│   │   ├── db.js                # Database connection
│   │   ├── middleware/          # Auth, RBAC, logging
│   │   └── email.js             # SMTP email service
│   │
│   ├── backend-appscript/       # Google Apps Script specific
│   │   ├── Code.gs              # Main server functions
│   │   ├── Database.gs          # Google Sheets data layer
│   │   ├── Email.gs             # GmailApp email service
│   │   └── WebApp.gs            # doGet/doPost handlers
│   │
│   └── shared/                  # Shared utilities (both platforms use)
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

## Development Standards

### Google Apps Script
- Use JSDoc comments for all functions
- Follow ESLint rules for JavaScript
- Include error handling for all API calls
- Document trigger setups in README
- Version control configurations

### Data & Analytics
- Document data sources and transformations
- Include sample datasets for testing
- Document dashboard KPIs and calculations
- Follow naming conventions for Looker/Tableau objects

### Documentation
- All projects require a README.md
- Include setup instructions for any configuration
- Document API endpoints and authentication
- Add examples and common use cases
- Keep documentation updated with changes

## Collaboration Guidelines

- Update the workspace README when adding new projects
- Reference Jira ticket numbers in commit messages
- Document breaking changes clearly
- Share integration credentials securely (use secrets management)
- Test changes in non-production before rolling to production

## Security & Compliance

- Never commit sensitive credentials or API keys
- Use environment variables for configuration
- Review access controls for integrations
- Document data flow for audit purposes
- Follow company data privacy policies

## Cost Estimation & Salary Configuration

### Team Hourly Rates

Team hourly rates are calculated based on internal monthly salary ÷ 22 working days ÷ 8 billable hours.

| Team Member | Role | Hourly Rate (PHP) |
|-------------|------|-------------------|
| Luigi Espiritu | Department Head | 868 |
| Zaira Bajar | Business Analyst / People Platforms Lead | 174 |
| Mike Escobilla | Analytics Lead | 460 |
| JC Claudio | Developer & Scrum Master | 230 |
| Charvin Penaverde | Developer | 230 |
| Ernica Castronero | Developer | 145 |
| Jeremy Carino | Developer | 145 |

**Note:** These rates are for internal project costing only and should not be shared externally.

### Working Hours

- Standard work hours: 8 AM - 5 PM (9 hours including 1-hour lunch)
- Billable hours: **7.5 hours/day, Monday to Friday**
- Monthly working days: **22 days**

### Cost Breakdown Template (Technical Documents)

Include this section in all Technical Documents:

```markdown
## Cost Estimate

### Team Effort
| Role | Team Member | Hours Spent | Rate (PHP) | Total (PHP) |
|------|-------------|-------------|------------|-------------|
| [Role] | [Name] | [Hours] | [Rate] | [Total] |

**Total Development Cost: [Grand Total PHP]**

### Timeline
- Start Date: [Date]
- End Date: [Date]
- Duration: [Number] working days
- Calendar Days: [Number] days

### Cost Summary
| Category | Amount (PHP) |
|----------|-------------|
| Development | [Amount] |
| Testing & QA | [Amount] |
| Documentation | [Amount] |
| **Total Project Cost** | **[Amount]** |
```

### Calculating Project Costs

```
Hourly Rate = Monthly Salary ÷ 22 working days ÷ 7.5 billable hours
Project Cost = Σ(Hours Spent × Hourly Rate)
```

## AI & Tool Usage Policy

We are an open-minded team that leverages multiple AI tools to assist with coding and quality assurance. Our strengths include:
- Using different AI models for coding assistance
- Employing AI for code review and verification
- Leveraging AI-powered testing and debugging tools

### AI Tool Guidelines

**ALL AI tools and assistants MUST:**
1. **Read the steering document first** before beginning any task
2. **Read the README.md** to understand the project structure
3. **Stay on topic** - Focus on the specific task or question at hand
4. **Avoid hallucinations** - Only provide information you're confident about; if unsure, ask for clarification or admit uncertainty
5. **Follow the project structure, standards, and conventions** outlined here
6. **Read the steering document again before finishing** any task for an audit check
7. **Verify output aligns** with team standards and documentation requirements
8. **Flag any deviations** from team guidelines and explain the rationale
9. **Do NOT create new files** beyond the project structure defined in README.md unless explicitly requested

**File Handling Policy:**
- If Kiro cannot read a file directly (binary formats like .xlsx, .docx, encrypted PDFs), use Python to extract content
- Install required Python packages if needed (e.g., pandas, openpyxl, PyPDF2, python-docx)
- Extract and parse content, then categorize appropriately
- Never ask users to convert files - handle all formats programmatically

**Point of View (POV) for Work Documents:**
- ALL work documents (README, Technical Solutions Documents, Jira descriptions, UAT scripts, User Guides) MUST use **3rd person point of view**
- Use actual names and designations instead of "You", "I", "We"
- Examples:
  - ❌ WRONG: "You will decide on the tech stack"
  - ✅ CORRECT: "Luigi Espiritu (Department Head) will decide on the tech stack"
  - ❌ WRONG: "I am testing the system"
  - ✅ CORRECT: "Mike Escobilla (QA Lead) is testing the system"
- This ensures professionalism, clarity, and prevents ambiguity in role assignments

**Stay on topic means:**
- Answer the specific question asked
- Complete the specific task requested
- Don't introduce unrelated information or tangents
- Don't generate content beyond what's needed
- If a request is unclear, ask for clarification rather than guessing

### Project Workflow

**My role as your assistant:**
1. Read all project files you've dumped into the project folder
2. Analyze requirements and technical specifications
3. Help create a solid **Technical Solutions Document** that includes:
   - Solution architecture overview
   - Technical approach and implementation plan
   - Integration points and dependencies
   - Data models and workflows (if applicable)
   - Testing strategy and UAT guidance
   - User guide structure and content recommendations

**What I need from you:**
- Project files dumped in the project folder
- Clear requirements or specifications
- Any specific questions or focus areas

## Project Structure

This repository uses a specific structure. **Do NOT create new files or folders beyond this structure unless explicitly requested.**

```
own-your-career/
├── src/
│   ├── frontend/                # Shared across BOTH platforms (platform-agnostic)
│   │   ├── html/                # HTML templates (manager-portal.html, dataspoc-portal.html, employee-portal.html)
│   │   ├── css/                 # Stylesheets (styles.css)
│   │   └── js/                  # Client-side JavaScript (app.js, gates.js, calculations.js, validation.js)
│   ├── backend-converge/        # Converge Cloud specific
│   │   ├── server.js            # Express server entry point
│   │   ├── routes.js            # API routes
│   │   ├── db.js                # Database connection
│   │   ├── middleware/          # Auth, RBAC, logging
│   │   └── email.js             # SMTP email service
│   ├── backend-appscript/       # Google Apps Script specific
│   │   ├── Code.gs              # Main server functions
│   │   ├── Database.gs          # Google Sheets data layer
│   │   ├── Email.gs             # GmailApp email service
│   │   └── WebApp.gs            # doGet/doPost handlers
│   └── shared/                  # Shared utilities (both platforms use)
│       ├── constants.js         # Performance brackets, formulas, config
│       ├── workflow.js          # Step sequencing logic
│       └── export.js            # SFTP export formatter
├── tests/                       # Test files
├── docs/                        # Developer documentation
└── .kiro/                       # Kiro AI steering files
    └── steering/                # Team standards and guidelines
```

**Current files in this repository:**
- README.md (project overview)
- .kiro/steering/team-standards.md (this file - AI guidance)
- .gitignore
- src/ directory with skeleton files for development

## Development Standards

### JavaScript (Shared Frontend + Converge Backend)

- Use **ES6+ syntax** (const/let, arrow functions, template literals, destructuring)
- Use **JSDoc comments** for all functions — include @param, @returns, @description
- Use **camelCase** for variables and functions
- Use **PascalCase** for classes and constructors
- Use **UPPER_SNAKE_CASE** for constants
- Handle errors explicitly — no silent failures
- Validate all user inputs before processing
- Keep functions small and single-purpose

### Google Apps Script (.gs files)

- Follow the same JavaScript conventions above
- Use `google.script.run` for client-to-server calls (with `.withSuccessHandler()` and `.withFailureHandler()`)
- Use `PropertiesService` for configuration (never hardcode secrets)
- Use `LockService` for concurrent write protection on Google Sheets
- Structure Sheets data with headers in Row 1; never rely on column position alone — use column name lookup

### HTML Templates

- Use semantic HTML5 elements
- Include `aria-` attributes for accessibility
- Forms must have proper `label` elements tied to inputs
- All interactive elements must be keyboard-accessible
- Use `data-*` attributes for JavaScript hooks (not classes)

### CSS

- Use CSS custom properties (variables) for colors, spacing, and typography
- Mobile-first responsive design (min-width breakpoints)
- BEM naming convention for class names: `.block__element--modifier`
- No inline styles in HTML
- **MUST follow Converge Brand Guidelines** (see below)

## Converge Brand Guidelines

**Source:** CONVERGE Brand Guidelines 2026 (condensed PDF)
**Applies to:** ALL projects with user-facing interfaces under Converge

### Color Palette

#### Primary Colors

| Color Name | Hex Code | RGB | Usage |
|------------|----------|-----|-------|
| **Converge Teal** | `#038F8D` | rgb(3, 143, 141) | Primary brand color — buttons, headers, links, key UI elements |
| **Phantom Black** | `#000000` | rgb(0, 0, 0) | Text, dark backgrounds |
| **Pure White** | `#FFFFFF` | rgb(255, 255, 255) | Backgrounds, white space, contrast |

#### Secondary Colors

| Color Name | Hex Code | RGB | Usage |
|------------|----------|-----|-------|
| **Deepwave Teal** | `#024645` | rgb(2, 70, 69) | Dark accents, footers, depth |
| **Midwave Teal** | `#027574` | rgb(1, 116, 115) | Secondary buttons, hover states |
| **Visionary Aquamarine** | `#49D7D1` | — | Highlights, success states, accents |
| **Softwave Teal** | `#9AC0C3` | rgb(154, 192, 195) | Subtle backgrounds, borders, disabled states |
| **Pulse Violet** | `#8965F5` | — | Accent color, notifications, badges |

### CSS Custom Properties (Required)

All projects must define these brand variables and use them throughout:

```css
:root {
  /* Primary */
  --color-primary: #038F8D;          /* Converge Teal */
  --color-black: #000000;            /* Phantom Black */
  --color-white: #FFFFFF;            /* Pure White */

  /* Secondary */
  --color-teal-dark: #024645;        /* Deepwave Teal */
  --color-teal-mid: #027574;         /* Midwave Teal */
  --color-aquamarine: #49D7D1;       /* Visionary Aquamarine */
  --color-teal-soft: #9AC0C3;        /* Softwave Teal */
  --color-violet: #8965F5;           /* Pulse Violet */

  /* Typography */
  --font-heading: 'Funnel Display', sans-serif;
  --font-body: 'Funnel Sans', 'DM Sans', sans-serif;
}
```

### Typography

| Type | Font | Usage |
|------|------|-------|
| **Primary** | Funnel Display | Titles and headings |
| **Secondary** | Funnel Sans | Body text |
| **Fallback** | DM Sans | Body text (alternative) |

### Art Style

**Geometric Isometric Minimalist**
- Geometric shapes utilizing 3D perspective without a vanishing point (Isometric)
- "Less is more" approach to color and detail (Minimalism)
- Clean, modern, uncluttered interfaces

### Brand Usage Rules

1. **Never mix primary colors** — use proper contrast ratios
2. **Never use dark on dark** — ensure readability
3. **Never use light on light** — maintain contrast
4. **Never change the logo colors** — use official versions only
5. Use Converge Teal (`#038F8D`) as the dominant accent throughout the UI
6. Use Phantom Black for body text on white backgrounds
7. Use Pulse Violet sparingly for highlights and attention-drawing elements

### Logo Usage

- Official logos are downloadable from the brand kit
- Localized logos are limited to major programs/projects only
- One-time initiatives don't require logos — branding is reserved for long-term efforts where sustained recall is necessary

## Team

| Role | Name | Focus |
|------|------|-------|
| Department Head | Luigi Espiritu | Architecture decisions, management oversight (2 hrs/day) |
| Business Analyst | Zaira Bajar | Workflow design, requirements, UAT (2 hrs/day) |
| Lead Developer | Charvin Penaverde | Converge backend, shared frontend, OKR engine |
| Developer | Jeremy Carino | AppScript backend, Employee Portal, gate logic |
| Scrum Master | JC Claudio | Daily standups, Jira management |
| QA/Analytics Lead | Mike Escobilla | Testing, cross-browser, email validation |
| Data Validation | Ernica Castronero | OKR formula verification, SFTP export validation |

## Key Decisions

1. **Internal build over SAP SuccessFactors** — Cost and timeline reasons (91.8% savings)
2. **No SAP CPI real-time integration** — Replaced by one-time SFTP bulk export after all reviews complete
3. **360 Feedback NOT built internally** — Uses existing SuccessFactors 360 module (separate workflow)
4. **Calibration / 9-Box Matrix** — Post-launch (not in Phase 1 scope)
5. **Responsive web only** — No mobile-native app

## Git Conventions

- **Branch naming:** `feature/[step-number]-[short-description]` (e.g., `feature/step1-skills-assessment`)
- **Commit messages:** Reference Jira ticket + concise description
  - Format: `PAC-XXXX: [verb] [what]` (e.g., `PAC-6864: implement OKR calculation engine`)
- **PR reviews:** At least 1 reviewer before merge to main
- **Never push directly to main** — always use feature branches + PR

## Documentation References

- **Technical Solutions Document** — Architecture, cost, WBS (in Technical Documents)
- **Functional Requirements** — FR-01 to FR-14 (in Technical Documents)
- **Wireframe interpretations** — 3 portals, screen flows (in Technical Documents)
- **Core & Leadership Skills framework** — 5-level scale (in Technical Documents)
- **Stakeholder decisions** — Updates and references (in Technical Documents)

## Development Timeline

| Sprint | Dates | Focus |
|--------|-------|-------|
| Sprint 1 | Jul 1-3 | Build 3 portals (Manager, Data SPOC, Employee) |
| Sprint 2 | Jul 6-10 | Continue dev, system integration, SIT |
| Sprint 3 | Jul 13-17 | UAT, defect fixes, go-live |

**Daily standup:** 9 AM, led by JC Claudio

## Status
- **Current Phase:** Development (Sprint 1)
- **Target Launch:** July 17, 2026
- **Workflow Design:** Confirmed (Zaira Bajar — 7-step process)
- **Last Updated:** July 1, 2026

## Team Structure

```
Luigi Espirit (Department Head)
├── People Platforms Team (under Zaira Bajar)
│   ├── Zaira Bajar - Business Analyst / People Platforms Lead
│   ├── Charvin Penaverde - Developer
│   ├── Jeremy Carino - Developer
│   └── JC Claudio - Developer & Scrum Master (50/50)
│
└── Analytics Team (under Mike Escobilla)
    ├── Mike Escobilla - Analytics Lead
    └── Ernica Castronero - Developer
```

### Communication Protocol (RACI)

Use **RACI Matrix** to clarify roles and responsibilities:

| Task/Decision | Responsible | Accountable | Consulted | Informed |
|---------------|-------------|-------------|-----------|----------|
| Solution Design | Zaira Bajar (BA) | Luigi Espiritu (Dept Head) | Tech Lead | Stakeholders |
| Development | Charvin/Jeremy (Devs) | Luigi Espiritu | BA, QA | QA Team |
| Testing/QA | Mike Escobilla, JC Claudio | Luigi Espiritu | Developers | Stakeholders |
| Deployment | Luigi Espiritu | Luigi Espiritu | All Devs | Stakeholders |

- **Responsible:** Does the work
- **Accountable:** Final approval/authority (only one)
- **Consulted:** Provides input before decision
- **Informed:** Notified after decision

**Status Updates:**
- Check project timeline first (Sprint dates)
- Report status aligned with SDLC phase cadence
- Flag blockers immediately to the Accountable party (Luigi Espiritu)

### Definition of Done (DoD)

**Task-Level Definition of Done:**

A development sub-task is DONE when:
- [ ] Functional requirement implemented and working
- [ ] Code follows team standards (JSDoc, error handling, validation)
- [ ] Works on BOTH platforms (Converge Cloud + Apps Script)
- [ ] Hard gates enforced correctly (see workflow-and-business-rules.md)
- [ ] Developer Self-Integration Test (SIT) passed
- [ ] No critical/high security vulnerabilities
- [ ] Code peer reviewed (at least 1 reviewer)

**Global Definition of Done - Project Level:**

The project is DONE when ALL of the following are met:
- [ ] All Functional Requirements (FRs) implemented
- [ ] All Non-Functional Requirements (NFRs) met
- [ ] Code follows team standards and conventions
- [ ] Technical documentation complete and up-to-date
- [ ] UAT passed with stakeholder sign-off
- [ ] Zero open critical/high defects
- [ ] Deployment runbook created
- [ ] Rollback plan documented
- [ ] Stakeholder sign-off obtained

### Handover & Support

**Post-Deployment Handover:**

| Phase | Owner | Activities | Duration |
|-------|-------|-----------|----------|
| **Day 1 (Post-Go-Live)** | Tech Lead + Dev | Monitor for critical issues, respond to urgent issues | Full day |
| **Week 1** | Tech Lead | Daily standups with support team, track issues | 2 hours/day |
| **Week 2-4** | Support Owner | Support team takes over, L2 support available | On-call |
| **Month 1+** | Support Owner | Production support, monitor health | Business hours |

**Documentation Package Includes:**
- Technical runbooks (how to deploy, configure, troubleshoot)
- User guides (for end-users)
- Administrator guides (for system admins)
- Support contact list and escalation procedures
- Known issues and workarounds
- Lessons learned document

## Questions or Updates?

For questions about this steering document or to suggest updates, reach out to your team lead or the workspace maintainer.
