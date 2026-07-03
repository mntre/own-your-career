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
