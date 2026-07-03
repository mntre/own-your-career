# Technology Stack — Own Your Career

## Dual Deployment Strategy

Same codebase deployed to BOTH platforms simultaneously:

| Platform | Stack | Backend | Database |
|----------|-------|---------|----------|
| Platform A: Converge Cloud | HTML, CSS, JS (standard web app) | Node.js / Express | Secure DB |
| Platform B: Google Apps Script | AppScript with HTML Service | Apps Script (.gs) | Google Sheets |

**Rationale:** Both apps built in parallel. Management chooses preferred platform after seeing both. Acts as fallback if one has limitations.

## Frontend (Platform-Agnostic)

- HTML5 / CSS3 / Vanilla JavaScript (ES6+)
- Shared across both platforms
- No frontend frameworks (React, Vue, etc.)
- Google Sign-In (Google Identity Services) for SSO

## Converge Cloud Backend

- Node.js v18+
- Express.js
- JWT authentication via Google OAuth
- SMTP email (nodemailer)
- Role-Based Access Control (RBAC) middleware

## Google Apps Script Backend

- `google.script.run` for client-to-server calls
- `.withSuccessHandler()` and `.withFailureHandler()` pattern
- `PropertiesService` for secrets (never hardcode)
- `LockService` for concurrent write protection
- `GmailApp` for email
- Google Sheets as data layer (headers in Row 1, column name lookup)

## Integrations

| System | Method | Timing |
|--------|--------|--------|
| SAP SuccessFactors | SFTP bulk export | One-time, after ALL reviews complete |
| 360 Feedback | Existing SF module | Separate workflow (not built here) |
| Email | SMTP / GmailApp | Auto-notify at each step transition |

## Development Setup

### Converge Cloud
```bash
cd src/backend-converge
npm install
npm run dev
```

### Google Apps Script
1. Open Apps Script project in Google Drive
2. Copy files from `src/backend-appscript/` into script editor
3. Deploy as web app for testing

## Constraints

- Both platforms must produce identical user experience
- Frontend code must work in both deployment contexts
- Google Apps Script: 6-min execution limit (30-min for Workspace)
- Forms can be resubmitted/edited until deadline (soft deadlines)
- After Step 5 complete: all data becomes read-only for employee
