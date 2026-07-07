# Project Structure — Own Your Career

## File Layout

```
own-your-career/
├── src/
│   ├── frontend/                    # Shared across BOTH platforms
│   │   ├── html/
│   │   │   ├── login.html           # Google SSO login page
│   │   │   ├── manager-portal.html  # Steps 1, 4, 5
│   │   │   ├── dataspoc-portal.html # Step 2
│   │   │   ├── employee-portal.html # Steps 3, 6, 7
│   │   │   └── admin-portal.html    # Admin dashboard (Phase 1)
│   │   ├── css/
│   │   │   └── styles.css           # All styles (Converge brand)
│   │   └── js/
│   │       ├── platform.js          # Platform detection (Converge vs AppScript)
│   │       ├── api-adapter.js       # Routes API to platform-specific implementation
│   │       ├── api-converge.js      # HTTP-based API for Converge Cloud
│   │       ├── api-appscript.js     # google.script.run API for Google Apps Script
│   │       ├── api.js               # (LEGACY Phase 1 mock API - fallback only)
│   │       ├── app.js               # Main app logic, routing
│   │       ├── login.js             # Google SSO authentication
│   │       ├── gates.js             # Hard gate enforcement
│   │       ├── calculations.js      # OKR score formulas
│   │       └── validation.js        # Form validation
│   ├── backend-converge/            # Converge Cloud specific
│   │   ├── server.js                # Express entry point
│   │   ├── routes.js                # API routes
│   │   ├── db.js                    # Database connection
│   │   ├── email.js                 # SMTP email service
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT + Google OAuth verification
│   │   │   └── rbac.js              # Role-Based Access Control
│   │   └── package.json
│   ├── backend-appscript/           # Google Apps Script specific
│   │   ├── Code.gs                  # Main server functions
│   │   ├── Database.gs              # Google Sheets data layer
│   │   ├── Email.gs                 # GmailApp email service
│   │   └── WebApp.gs                # doGet/doPost handlers
│   └── shared/                      # Both platforms use
│       ├── constants.js             # Performance brackets, formulas, config
│       ├── workflow.js              # Step sequencing logic
│       └── export.js                # SFTP export formatter
├── tests/
├── docs/
├── .kiro/steering/
├── .gitignore
└── README.md
```

## Rules

- **Do NOT create new files** beyond this structure unless explicitly requested
- Frontend is platform-agnostic — no platform-specific code in `src/frontend/`
- Platform-specific logic goes in `backend-converge/` or `backend-appscript/`
- Shared business logic goes in `src/shared/`
- One CSS file (`styles.css`) for the entire project

## File Responsibilities

| File | Responsibility |
|------|---------------|
| `platform.js` | Runtime platform detection (Converge vs Google Apps Script) |
| `api-adapter.js` | Routes API calls to correct platform implementation |
| `api-converge.js` | HTTP-based API implementation for Converge Cloud (fetch calls) |
| `api-appscript.js` | google.script.run API implementation for Google Apps Script |
| `api.js` | (LEGACY) Phase 1 mock API — fallback only, not used in production |
| `app.js` | Main orchestrator — portal routing, UI state, step navigation |
| `login.js` | Google Identity Services SSO, token handling |
| `gates.js` | Hard gate checks (is step enabled for this user?) |
| `calculations.js` | OKR formulas, performance bracket assignment |
| `validation.js` | Form field validation, required fields, data types |
| `constants.js` | Brackets, formulas, config values, question text |
| `workflow.js` | Step sequencing, state transitions, status tracking |
| `export.js` | SFTP bulk export data formatting |
| `Code.gs` | Google Apps Script main functions: authenticateUser, logoutUser, workflow handlers |
| `Database.gs` | Google Sheets data layer CRUD operations, conflict detection |

---

## Governance: Alignment & File Creation Rules

### Core Rule
**Do NOT create files or folders that are not explicitly listed in the File Layout or File Responsibilities sections above.**

This ensures code organization remains aligned with the documented architecture and prevents:
- Orphaned or undocumented code
- Inconsistent project structure
- Difficult codebase navigation and maintenance

### Examples of Non-Compliant Files (DO NOT CREATE)
1. **Code files outside the defined structure**
   - ❌ `src/utils/helpers.js` (not in structure)
   - ❌ `src/components/Button.js` (not in structure)
   - ❌ `src/lib/customLogic.js` (not in structure)

2. **Markdown files (updates, docs, notes)**
   - ❌ `UPDATE.md` (use this README instead)
   - ❌ `CHANGELOG.md` (not aligned with project docs)
   - ❌ `NOTES.md` (use steering files or Jira tickets)
   - ❌ `INSTRUCTIONS.md` (belongs in `.kiro/steering/`)
   - ❌ `docs/anything.md` (use `.kiro/steering/` instead)

3. **Temporary or ad-hoc files**
   - ❌ `temp.js`, `test-copy.js`, `archive/` folders
   - ❌ Local config overrides or environment-specific files not in structure

### What to Do Instead
- **Code logic:** Add it to an existing responsible file listed above or request a new structured file in this document
- **Documentation:** Update README.md or create a steering file (e.g., `.kiro/steering/[topic].md`)
- **Temporary changes:** Use Git branches and feature flags, not temporary files
- **Need a new file type?** Update this structure.md AND README.md in sync, then proceed

### Before Creating Any File
1. Check if it appears in the "File Layout" section above
2. Check if it's listed in "File Responsibilities"
3. If not → DO NOT create it; escalate or follow "What to Do Instead"
4. If yes → Proceed with confidence

---

## Markdown File Governance (CRITICAL)

### Allowed Markdown Files ONLY

| File | Location | Purpose | Can Be Modified |
|------|----------|---------|-----------------|
| `README.md` | Root `/` | Project overview, setup, roadmap | ✅ Yes (primary doc) |
| `business-rules.md` | `.kiro/steering/` | Business logic, gates, brackets | ✅ Yes (steering) |
| `product.md` | `.kiro/steering/` | Product definition, stakeholders | ✅ Yes (steering) |
| `structure.md` | `.kiro/steering/` | File layout, responsibilities | ✅ Yes (steering) |
| `tech.md` | `.kiro/steering/` | Tech stack, deployment, constraints | ✅ Yes (steering) |
| `branding.md` | `.kiro/steering/` | Colors, typography, UI standards | ✅ Yes (steering) |
| `consolidated-updates.md` | `src/` | Phase updates, testing guides, extra documentation | ✅ Yes (development notes) |

### FORBIDDEN Markdown Files (VIOLATION if Created)

| File | Reason | Alternative |
|------|--------|-------------|
| `UPDATE.md` | Redundant with README.md | Update README.md instead |
| `CHANGELOG.md` | Use git log or Jira tickets | Reference PAC-6864, PAC-8047 |
| `NOTES.md` | Documentation should be centralized | Use steering files |
| `INSTRUCTIONS.md` | Setup/dev instructions belong in README | Update README.md or add steering file |
| `docs/*.md` | Discouraged structure | Use `.kiro/steering/` instead |
| `SETUP.md` | Redundant with README | Update README.md Development Setup section |
| `API.md` | API docs belong in steering | Add to `.kiro/steering/tech.md` or new file |
| `DEPLOYMENT.md` | Deployment belongs in README or steering | Update README.md or create `.kiro/steering/deployment.md` (request first) |
| Any other `*.md` | Not pre-approved | Request addition to approved list in this document |

### Enforcement Rules for Kiro AI

**BEFORE creating ANY markdown file:**
1. Check the "Allowed" list above
2. If file is NOT in allowed list → **STOP, DO NOT CREATE**
3. If file IS in allowed list → Proceed
4. If you want to create a new markdown → **Ask user first** before creating

**If violation occurs (unauthorized markdown created):**
- File must be deleted immediately
- Content must be merged into appropriate allowed file (README or steering)
- Document the decision in git commit

**Examples:**

❌ **VIOLATION:**
```
User: "Create a DEPLOYMENT.md with setup steps"
Kiro: (creates DEPLOYMENT.md)
→ This violates governance. Should have added to README.md or `.kiro/steering/deployment.md`
```

✅ **CORRECT:**
```
User: "Create a DEPLOYMENT.md with setup steps"
Kiro: "I can't create new markdown files outside the approved list. I can either:
  1. Add these steps to README.md under Development Setup
  2. Create .kiro/steering/deployment.md if you approve
  Which would you prefer?"
```

✅ **ALSO CORRECT:**
```
Kiro: "This needs Phase-specific testing guide. Can I add this to src/consolidated-updates.md?"
User: "Yes"
Kiro: (appends to consolidated-updates.md)
```

---

## Approved Approach for Extra Documentation

**`src/consolidated-updates.md` Usage (MANDATORY):**

This file is the **ONLY** place for all extra markdown documentation:
- Phase-specific testing guides (Phase 1, 2, 3, etc.)
- Implementation details and development notes
- Testing scenarios and troubleshooting
- Work-in-progress documentation
- Updates, notes, or any extra content

**CRITICAL RULE FOR KIRO AI:**

1. **ALL extra content → `src/consolidated-updates.md` ONLY**
2. **NEVER create separate files** like:
   - ❌ `PHASE1_TESTING.md` → Add to consolidated-updates.md
   - ❌ `PHASE2_TESTING.md` → Add to consolidated-updates.md
   - ❌ `SETUP.md` → Add to consolidated-updates.md or README.md
   - ❌ `NOTES.md` → Add to consolidated-updates.md
   - ❌ `DEPLOYMENT.md` → Add to consolidated-updates.md
   - ❌ `INSTRUCTIONS.md` → Add to consolidated-updates.md
   - ❌ `docs/anything.md` → Add to consolidated-updates.md
   - ❌ Any other `*.md` → Add to consolidated-updates.md

3. **Structure principle:** One file = one location = clean structure
4. **If unclear:** Ask user before creating anything
5. **Violation = enforcement:** File must be deleted and content moved to consolidated-updates.md

**Example Conversations:**

❌ **VIOLATION:**
```
User: "Add Phase 2 backend guide"
Kiro: (creates PHASE2_BACKEND.md)
→ WRONG: Should have added to consolidated-updates.md
```

✅ **CORRECT:**
```
User: "Add Phase 2 backend guide"
Kiro: "I'll add this to src/consolidated-updates.md under Phase 2 section"
Kiro: (appends organized section to consolidated-updates.md)
```

✅ **ALSO CORRECT:**
```
User: "Where should I put Phase 3 documentation?"
Kiro: "All phase documentation and extra notes go in src/consolidated-updates.md to keep the structure clean and organized"
```

**For Project Health:**
- No scattered markdown files
- No `docs/` folder with competing documentation
- No `UPDATES.md`, `NOTES.md`, `README-*.md` variants
- Single, organized, consolidated file
- Easy to find, easy to maintain
