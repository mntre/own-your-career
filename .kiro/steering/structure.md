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
│   │   │   └── employee-portal.html # Steps 3, 6, 7
│   │   ├── css/
│   │   │   └── styles.css           # All styles (Converge brand)
│   │   └── js/
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
| `app.js` | Main orchestrator — portal routing, UI state, step navigation |
| `login.js` | Google Identity Services SSO, token handling |
| `gates.js` | Hard gate checks (is step enabled for this user?) |
| `calculations.js` | OKR formulas, performance bracket assignment |
| `validation.js` | Form field validation, required fields, data types |
| `constants.js` | Brackets, formulas, config values, question text |
| `workflow.js` | Step sequencing, state transitions, status tracking |
| `export.js` | SFTP bulk export data formatting |

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
