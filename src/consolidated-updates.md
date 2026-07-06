# Consolidated Updates & Development Notes

This file serves as a central repository for:
- Phase-specific testing guides and updates
- Development notes and implementation details
- Extra documentation that doesn't fit in steering or README
- Work-in-progress documentation

All extra markdown content should be consolidated here instead of creating separate files.

---

## Phase 1: Local Frontend Testing

**Status:** ✅ Complete  
**Created:** July 4, 2026  
**Files Involved:** `api.js`, `app.js`, `login.js`, `login.html`

### Overview

Phase 1 enables testing the login flow and portal routing **locally without a backend server**. Uses mock API and test user data in the browser.

### How to Test Locally

#### Option 1: Simple HTTP Server (Recommended)

```bash
# Navigate to frontend directory
cd src/frontend

# Start Python HTTP server (port 3000)
python -m http.server 3000

# Or use Node.js http-server if installed
npx http-server -p 3000
```

Then open: **http://localhost:3000/html/login.html**

#### Option 2: Direct Browser

```bash
# Just open the file in your browser
file:///path/to/own-your-career/src/frontend/html/login.html
```

Note: May have CORS issues with some features. HTTP server is better.

### Test Users (Phase 1 Only)

Use these credentials to test each role:

| Email | Role | Portal | Capabilities |
|-------|------|--------|--------------|
| `manager@example.com` | MANAGER | Manager Portal | Skills Assessment, Feed Forward, Acknowledgement |
| `employee@example.com` | EMPLOYEE | Employee Portal | Self-Assessment, View Scores, Acknowledgement |
| `dataspoc@example.com` | DATA_SPOC | Data SPOC Portal | OKR Upload, View Org Data, Rankings |
| `admin@example.com` | ADMIN | Admin Portal | System Config, Monitoring, SFTP Trigger |

### Testing Steps

#### 1. Open Login Page
Navigate to: **http://localhost:3000/html/login.html**

You should see:
- Own Your Career login form
- Google Sign-In section (non-functional in Phase 1)
- 4 blue test buttons at bottom (Manager, Employee, Data SPOC, Admin)

#### 2. Click Test User Button

Click any test user button (e.g., "Manager").

Expected behavior:
- Button shows "Authenticating..." briefly
- Page redirects to corresponding portal
- URL changes to `manager-portal.html` (or appropriate portal)

#### 3. Verify Session

Once on portal:
- Open browser DevTools (F12)
- Go to **Application → Session Storage**
- Verify `oyc_user` and `oyc_token` are stored
- `oyc_user` should contain email, role, name, department

#### 4. Test Logout

Logout buttons will be on each portal (once portals are built).

Currently, clear session manually:
```javascript
// In browser console:
sessionStorage.removeItem('oyc_user');
sessionStorage.removeItem('oyc_token');
// Then refresh or navigate to login.html
```

### Testing Scenarios

#### Scenario 1: Valid Login
1. Click "Manager" test button
2. ✅ Should redirect to manager-portal.html
3. ✅ Session should be stored

#### Scenario 2: Invalid Email (Future Testing)
1. In browser console, manually call:
   ```javascript
   simulateLogin('invalid@example.com', 'EMPLOYEE')
   ```
2. ✅ Should show error: "Email not authorized"

#### Scenario 3: Role Mismatch (Future Testing)
1. In browser console, call:
   ```javascript
   simulateLogin('manager@example.com', 'EMPLOYEE')
   ```
2. ✅ Should show error: "Invalid role"

#### Scenario 4: Session Persistence
1. Log in as manager
2. Go to manager-portal.html
3. Refresh page (F5)
4. ✅ Should NOT redirect to login (session still active)
5. Close browser tab and reopen
6. ❌ Session lost (sessionStorage cleared on browser close)

### Console Logging

The app logs activity to the browser console for debugging.

Example log output:
```
[App] Initializing...
[Login] Initializing login page
[Login] Simulating login for: manager@example.com role: MANAGER
[Login] Authentication successful, redirecting to portal
[App] Session active for: manager@example.com role: MANAGER
```

**View logs:** Open DevTools (F12) → Console tab

### Known Limitations (Phase 1)

1. **Google Sign-In not functional** — Use test buttons instead
2. **No actual backend** — Mock data only in browser memory
3. **Session lost on browser close** — Uses sessionStorage (not persistent)
4. **No real JWT verification** — Uses mock JWT structure
5. **No database** — All test data hardcoded
6. **Portals not built yet** — Redirects work, but portal pages are empty

These are addressed in Phase 2 (mock Express backend) and Phase 3 (real Converge backend).

### Defensive Programming: Avoiding ".map is not a function"

All Phase 1 code includes defensive checks to prevent array-related errors:

- `api.js`: Checks `Array.isArray(MOCK_ALLOWLIST)` before calling `.find()`
- `login.js`: Checks `Array.isArray(testUsers)` before calling `.map()`
- `app.js`: Verifies querySelectors are iterable before calling `.forEach()`

**If you still see ".map is not a function" error:**
1. Open browser DevTools (F12) → Console tab
2. Look for the error message (should have line number)
3. Check if the variable is actually an array: type `typeof variableName` in console
4. If it's an object `{}` instead of array `[]`, the API may have changed structure

### Implementation Details

**Files Created:**
- `src/frontend/js/api.js` — Mock API with test users (4 roles)
- `src/frontend/js/app.js` — App routing and session management
- Updated `src/frontend/js/login.js` — Integrated mock API + test UI

**Mock API Features:**
- 4 test users with role-based routing
- Mock JWT generation (base64 encoded, 30-min expiry)
- Token validation functions
- Error handling for invalid emails/roles
- 500ms network delay simulation (realistic UX)

**Session Storage:**
- `oyc_user` — User object (email, role, name, department)
- `oyc_token` — JWT token for auth checks

---

## Moving to Phase 2

When ready to add a backend:

1. Create `src/backend-converge/server.js` (Express app)
2. Create `/auth/login` endpoint
3. Update `api.js` to call real backend instead of mock
4. Add actual allowlist database query
5. Generate real JWT tokens

No frontend changes needed—API interface stays the same.

---

## Troubleshooting

### Portal doesn't load after login
- Check browser console for errors
- Verify HTML files exist at expected paths
- Try starting HTTP server again

### Session lost immediately
- This is expected (sessionStorage is per-tab)
- Check DevTools → Application → Session Storage
- If empty, session wasn't stored

### Test buttons don't appear
- Check browser console for errors
- Verify `api.js` and `app.js` loaded
- Clear browser cache (Ctrl+Shift+Delete)

### "Cannot find module" errors
- Using `file://` protocol without HTTP server
- Use HTTP server: `python -m http.server 3000`

---

## Future Phases

1. ✅ Phase 1: Frontend login working locally
2. 🔄 Phase 2: Mock Express backend with real routes
3. 📋 Phase 3: Build portal pages (Manager, Employee, Data SPOC, Admin)
4. 🔗 Phase 4: Connect to real Converge backend
5. 📱 Phase 5: Google Apps Script deployment

---

**Last Updated:** July 4, 2026


---

## Phase 1A: Platform Abstraction Foundation ✅ COMPLETE

**Status:** ✅ COMPLETE (Added to main)  
**Date:** July 6, 2026  
**Files Created:**
- `src/frontend/js/platform.js` — Platform detection (Converge vs AppScript)
- `src/frontend/js/api-adapter.js` — Routes API calls to platform-specific implementation
- `src/frontend/js/api-converge.js` — HTTP-based API for Converge Cloud
- `src/frontend/js/api-appscript.js` — google.script.run API for Google Apps Script
- Updated `src/frontend/html/login.html` — New script include order for abstraction

**How It Works:**
1. Page loads → `platform.js` detects if on Converge or AppScript
2. `api-adapter.js` loads the correct API implementation
3. `login.js` and `app.js` call `API.login()` (same code on both platforms)
4. Behind the scenes, calls route to HTTP (`api-converge.js`) or google.script.run (`api-appscript.js`)

**Deliverable:** Architecture in place; abstraction layer ready for backend integration

---

## Phase 1B: Converge Cloud Implementation ✅ COMPLETE

**Status:** ✅ COMPLETE (On login branch, ready to merge)  
**Objective:** Implement HTTP-based API for Converge  
**Files Updated:**
- `src/frontend/js/api-converge.js` — HTTP API implementation (already created in Phase 1A)
- `src/backend-converge/middleware/auth.js` — Updated for Phase 1B testing
- `src/backend-converge/routes.js` — Implemented `/api/login` and `/api/logout` endpoints

**Phase 1B Implementation Details:**

1. **Frontend (api-converge.js)** — Already implemented in Phase 1A
   - `login(email, role, googleCredential)` — Sends POST to `/api/login`
   - `logout()` — Sends POST to `/api/logout`
   - `verifyToken()` and `decodeToken()` — Client-side JWT validation

2. **Backend (routes.js)** — Updated endpoints
   - `POST /api/login` — Public endpoint, calls `auth.authenticateUser()`
   - `POST /api/logout` — Protected endpoint, requires auth

3. **Authentication (auth.js)** — Phase 1B Testing Mode
   - **Development mode:** Skips Google verification, accepts test users
   - **Test allowlist:**
     - manager@example.com (MANAGER)
     - employee@example.com (EMPLOYEE)
     - dataspoc@example.com (DATA_SPOC)
     - admin@example.com (ADMIN)
   - **Email validation:** Any @-based email (development), @converge.com.ph only (production)
   - **Token generation:** Base64-encoded JWT with 30-min expiry
   - **Token validation:** Checked on all protected routes via auth middleware

**Deliverable:** Login works on Converge Cloud via HTTP

---

## Phase 1C: Google Apps Script Backend ✅ COMPLETE

**Status:** ✅ COMPLETE  
**Objective:** Implement Google Apps Script backend authentication functions  
**Date:** July 6, 2026  
**Files Updated:**
- `src/backend-appscript/Code.gs` — Added Phase 1C authentication section

**Phase 1C Implementation Details:**

1. **authenticateUser() function**
   - Phase 1C Testing Mode: Accepts 4 test users (manager@, employee@, dataspoc@, admin@example.com)
   - Validates email + role match
   - Generates base64-encoded JWT token with 30-min expiry
   - Logs access attempts for audit trail
   - Returns user object with email, role, name, department

2. **logoutUser() function**
   - Simple confirmation endpoint
   - Returns success status
   - In production, may clear session data

3. **generateMockJWT() helper**
   - Creates base64-encoded JSON payload (AppScript-compatible)
   - Includes: email, role, name, department, iat, exp timestamps
   - 30-minute token expiry
   - Uses `Utilities.base64Encode()` (native AppScript function)

4. **verifyTokenServerSide() helper**
   - Server-side token validation
   - Decodes base64 token
   - Checks expiry time
   - Returns decoded user object or null if invalid

5. **logAccessAttempt() helper**
   - Audit logging for all authentication attempts
   - Logs: timestamp, email, role, result (ALLOWED/DENIED), reason
   - Ready for future audit sheet storage

**Deliverable:** Google Apps Script backend now has working authentication compatible with Phase 1A/B abstraction layer

**IMPORTANT:** Frontend is already calling these functions via `google.script.run.authenticateUser()` and `google.script.run.logoutUser()` (defined in `src/frontend/js/api-appscript.js`). Now both backends (Converge + AppScript) have matching authentication interfaces.

---

**Next Phase: Phase 2 — Portal Page Implementation

After Phase 1C completion, all three platforms have working login:
- ✅ Phase 1: Mock frontend login (browser-only)
- ✅ Phase 1A: Platform abstraction layer (routes to correct backend)
- ✅ Phase 1B: Converge Cloud HTTP backend authentication
- ✅ Phase 1C: Google Apps Script backend authentication

---

## ✅ PHASE 1 COMPLETE: Login Flow (All Platforms)

**Status:** ✅ ALL PHASES DONE  
**Date Completed:** July 6, 2026  
**Summary:** Full login flow implemented for all three platforms (mock, Converge, AppScript)

### What Was Built

#### Phase 1: Mock Frontend Login
- File: `src/frontend/js/api.js`, `src/frontend/js/app.js`, `src/frontend/js/login.js`
- 4 test users with mock data
- Browser-only, no backend needed
- Portal routing works

#### Phase 1A: Platform Abstraction Layer
- Files: `src/frontend/js/platform.js`, `api-adapter.js`, `api-converge.js`, `api-appscript.js`
- Runtime detection (Converge vs AppScript)
- Single codebase, two deployments
- Frontend code identical on both platforms

#### Phase 1B: Converge Cloud Backend
- Files: `src/backend-converge/middleware/auth.js`, `src/backend-converge/routes.js`
- HTTP `/api/login` and `/api/logout` endpoints
- Phase 1B Testing Mode with mock allowlist
- JWT token generation (30-min expiry)
- Ready for production migration

#### Phase 1C: Google Apps Script Backend ✅ JUST COMPLETED
- Files: `src/backend-appscript/Code.gs` (new functions added)
- `authenticateUser()` function with Phase 1C Testing Mode
- `logoutUser()` function
- Base64-encoded JWT tokens (AppScript-compatible)
- 4 test users (same as Converge)
- Audit logging via `logAccessAttempt()`

### Architecture Overview

```
User Login Flow (Both Platforms):

Login.html (same on both)
  ↓
login.js (same on both)
  ↓
api-adapter.js (platform detection)
  ↓ (routes to correct implementation)
  ├→ api-converge.js → fetch('/api/login')
  │    ↓
  │    backend-converge/routes.js
  │    ↓
  │    backend-converge/middleware/auth.js
  │
  └→ api-appscript.js → google.script.run.authenticateUser()
       ↓
       backend-appscript/Code.gs
       ↓
       authenticateUser() function
```

### Test Users (Phase 1 & 1C)

Same 4 test users work on BOTH platforms:

```
manager@example.com      (MANAGER role)     → Manager Portal
employee@example.com     (EMPLOYEE role)    → Employee Portal
dataspoc@example.com     (DATA_SPOC role)   → Data SPOC Portal
admin@example.com        (ADMIN role)       → Admin Portal
```

### How to Test Each Platform

#### Platform A: Converge Cloud
```bash
# Terminal 1: Start backend
cd src/backend-converge
npm install
npm run dev
# Server runs on http://localhost:3001

# Terminal 2: Start frontend
cd src/frontend
python -m http.server 3000

# Browser: http://localhost:3000/html/login.html
# Click test user buttons or enter credentials manually
```

#### Platform B: Google Apps Script
1. Open Google Apps Script project in Google Drive
2. Copy files from `src/backend-appscript/` into script editor
3. Deploy as web app (Users with access to script)
4. Note deployment URL
5. Update `platform.js` to detect AppScript environment OR
6. Open web app URL → Will show same login page
7. Click test user buttons → Calls `google.script.run.authenticateUser()` backend

### Session Storage

Both platforms store sessions identically:

```javascript
// Browser sessionStorage (cleared on tab close)
sessionStorage.getItem('oyc_user')   // { email, role, name, department }
sessionStorage.getItem('oyc_token')  // JWT/base64 token
```

### Token Format

**Converge:** Standard JWT format (HS256)
```
header.payload.signature
```

**AppScript:** Base64-encoded JSON (compatible with `Utilities.base64Encode()`)
```
base64(JSON)
```

Both include same payload: `{ email, role, name, department, iat, exp }`

### Next Steps (Phase 2+)

Now that login works on ALL platforms:

1. **Phase 2:** Build portal pages (Manager, Employee, Data SPOC, Admin)
2. **Phase 3:** Connect portals to backend data layer
3. **Phase 4:** Implement step sequencing and gates
4. **Phase 5:** Email notifications and workflow automation

### Files Summary

```
✅ Phase 1C Complete:
├── src/frontend/js/
│   ├── platform.js           ✅ Platform detection
│   ├── api-adapter.js        ✅ API routing layer
│   ├── api-converge.js       ✅ HTTP API
│   ├── api-appscript.js      ✅ google.script.run API
│   ├── api.js                ✅ Legacy mock (fallback)
│   ├── login.js              ✅ Login page logic
│   └── app.js                ✅ App routing
├── src/frontend/html/
│   └── login.html            ✅ Login page UI
├── src/backend-converge/
│   ├── routes.js             ✅ HTTP endpoints
│   └── middleware/auth.js    ✅ Authentication
└── src/backend-appscript/
    ├── Code.gs               ✅ Backend functions (Phase 1C NEW)
    └── Database.gs           ✅ Data layer (existing)
```

### Defensive Programming Verified

✅ All code includes defensive checks:
- `Array.isArray()` before `.map()`
- Null/undefined checks
- Try-catch error handling
- Console logging for debugging
- Type validation on inputs

### What's Working Now

- ✅ Frontend detects platform (Converge vs AppScript)
- ✅ Routes API calls to correct backend
- ✅ Converge backend: HTTP `/api/login` endpoint works
- ✅ AppScript backend: `google.script.run.authenticateUser()` works
- ✅ Both generate JWT tokens with 30-min expiry
- ✅ Session stored in sessionStorage (both platforms)
- ✅ Login UI identical on both (single codebase)
- ✅ 4 test users work on both platforms
- ✅ Token validation on both sides (client + server)
- ✅ Audit logging in place
- ✅ Portal routing works after login

---
