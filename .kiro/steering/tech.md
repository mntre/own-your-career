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
- Forms can be resubmitted/edited until hard lock date (admin-configured system-wide deadline)
- After hard lock date: ALL forms non-editable across all portals (no exceptions)
- After Step 5 complete: all data becomes read-only for employee

---

## Development Constraints & Best Practices

### Array/Collection Handling (Avoid "i.map is not a function" Error)

When iterating over collections in JavaScript:

1. **Always verify the type before calling .map()**
   ```javascript
   // ❌ WRONG - may fail if arr is not an array
   const users = response.data;
   const names = users.map(u => u.name);
   
   // ✅ CORRECT - check type first
   if (Array.isArray(response.data)) {
     const names = response.data.map(u => u.name);
   }
   ```

2. **Common causes of ".map is not a function":**
   - Response is an object `{}` instead of array `[]`
   - Response is `null` or `undefined`
   - Variable was reassigned to non-array value
   - API returned different structure than expected

3. **Defensive programming:**
   ```javascript
   // Always assume API data might be malformed
   const items = response?.data || [];
   const results = Array.isArray(items) ? items.map(i => i.value) : [];
   ```

4. **When working with Kiro AI:**
   - Always include type checks in generated code
   - Specify: "Make this defensive — check if data is array before calling .map()"
   - Request null/undefined handling upfront

5. **Mock data for testing (Phase 1):**
   - Always return arrays (even empty arrays) from mock APIs
   - Never return single objects where array is expected
   ```javascript
   // ❌ WRONG
   const API = { getUsers: () => ({ id: 1, name: 'John' }) };
   
   // ✅ CORRECT
   const API = { getUsers: () => [{ id: 1, name: 'John' }] };
   ```

---

## Security & DDoS Prevention

**CRITICAL:** Security is not optional for a system handling sensitive employee performance data.

See `.kiro/steering/security.md` for comprehensive best practices covering:
- Authentication & authorization (OAuth, JWT, RBAC)
- Input validation & SQL injection prevention
- XSS/CSRF prevention
- HTTPS enforcement
- Secrets management
- Rate limiting & DDoS defense
- Audit logging & monitoring
- Deployment security checklist

All development MUST follow security.md guidelines before launch.

---

### Markdown File Policy

**CRITICAL:** Only the following markdown files are permitted:

**Allowed Markdown Files:**
- `README.md` — Project overview (at root)
- `.kiro/steering/*.md` — Guidance files (business-rules, product, structure, tech, branding)
- `src/consolidated-updates.md` — Phase updates, testing guides, implementation notes

**FORBIDDEN Markdown Files:**
- ❌ `UPDATE.md` — Use README.md instead
- ❌ `CHANGELOG.md` — Use git log or Jira tickets
- ❌ `NOTES.md` — Use consolidated-updates.md
- ❌ `INSTRUCTIONS.md` — Put in steering files or consolidated-updates.md
- ❌ `docs/*.md` — Must use `.kiro/steering/` instead
- ❌ `SETUP.md` — Must update README.md
- ❌ `PHASE*.md` (PHASE1_TESTING.md, PHASE2_TESTING.md, etc.) — Add to consolidated-updates.md
- ❌ `API.md` — Add to `.kiro/steering/tech.md` or consolidated-updates.md
- ❌ Any other `*.md` file not explicitly listed above

**Why:** Prevents documentation sprawl and maintains single source of truth (README + steering + consolidated-updates).

**For Kiro AI:** If you need to create any new markdown:
1. Check this list FIRST
2. If not in allowed list → DO NOT CREATE
3. Instead: Update existing file or add to `src/consolidated-updates.md`
4. Violation: Creating unauthorized markdown = violates governance rules
5. Consequence: File must be deleted and content merged into allowed files

**Example: Correct vs Incorrect**

❌ Incorrect:
- Create `PHASE1_TESTING.md` for testing guide
- Create `DEPLOYMENT.md` for deployment steps
- Create `docs/design.md` for architecture notes

✅ Correct:
- Add Phase 1 testing to `src/consolidated-updates.md`
- Add deployment steps to README.md → "Development Setup" section
- Add architecture notes to `src/consolidated-updates.md`
