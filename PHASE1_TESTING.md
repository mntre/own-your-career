# Phase 1: Local Frontend Testing Guide

## Overview

Phase 1 enables testing the login flow and portal routing **locally without a backend server**. Uses mock API and test user data in the browser.

**Status:** Ready to test  
**Files Created:**
- `src/frontend/js/api.js` — Mock API with test users
- `src/frontend/js/app.js` — App routing and session management
- Updated `src/frontend/js/login.js` — Integrated mock API
- Updated `src/frontend/html/login.html` — Added script includes

---

## How to Test Locally

### Option 1: Simple HTTP Server (Recommended)

```bash
# Navigate to frontend directory
cd src/frontend

# Start Python HTTP server (port 3000)
python -m http.server 3000

# Or use Node.js http-server if installed
npx http-server -p 3000
```

Then open: **http://localhost:3000/html/login.html**

### Option 2: Direct Browser

```bash
# Just open the file in your browser
file:///path/to/own-your-career/src/frontend/html/login.html
```

Note: May have CORS issues with some features. HTTP server is better.

---

## Test Users (Phase 1 Only)

Use these credentials to test each role:

| Email | Role | Portal | Capabilities |
|-------|------|--------|--------------|
| `manager@example.com` | MANAGER | Manager Portal | Skills Assessment, Feed Forward, Acknowledgement |
| `employee@example.com` | EMPLOYEE | Employee Portal | Self-Assessment, View Scores, Acknowledgement |
| `dataspoc@example.com` | DATA_SPOC | Data SPOC Portal | OKR Upload, View Org Data, Rankings |
| `admin@example.com` | ADMIN | Admin Portal | System Config, Monitoring, SFTP Trigger |

---

## Testing Steps

### 1. Open Login Page
Navigate to: **http://localhost:3000/html/login.html**

You should see:
- Own Your Career login form
- Google Sign-In section (non-functional in Phase 1)
- **New:** 4 blue test buttons at bottom (Manager, Employee, Data SPOC, Admin)

### 2. Click Test User Button

Click any test user button (e.g., "Manager").

Expected behavior:
- Button shows "Authenticating..." briefly
- Page redirects to corresponding portal
- URL changes to `manager-portal.html` (or appropriate portal)

### 3. Verify Session

Once on portal:
- Open browser DevTools (F12)
- Go to **Application → Session Storage**
- Verify `oyc_user` and `oyc_token` are stored
- `oyc_user` should contain email, role, name, department

### 4. Test Logout

Logout buttons will be on each portal (once portals are built).

Currently, clear session manually:
```javascript
// In browser console:
sessionStorage.removeItem('oyc_user');
sessionStorage.removeItem('oyc_token');
// Then refresh or navigate to login.html
```

---

## Testing Scenarios

### Scenario 1: Valid Login
1. Click "Manager" test button
2. ✅ Should redirect to manager-portal.html
3. ✅ Session should be stored

### Scenario 2: Invalid Email (Future Testing)
1. In browser console, manually call:
   ```javascript
   simulateLogin('invalid@example.com', 'EMPLOYEE')
   ```
2. ✅ Should show error: "Email not authorized"

### Scenario 3: Role Mismatch (Future Testing)
1. In browser console, call:
   ```javascript
   simulateLogin('manager@example.com', 'EMPLOYEE')
   ```
2. ✅ Should show error: "Invalid role"

### Scenario 4: Session Persistence
1. Log in as manager
2. Go to manager-portal.html
3. Refresh page (F5)
4. ✅ Should NOT redirect to login (session still active)
5. Close browser tab and reopen
6. ❌ Session lost (sessionStorage cleared on browser close)

---

## Console Logging

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

---

## Known Limitations (Phase 1)

1. **Google Sign-In not functional** — Use test buttons instead
2. **No actual backend** — Mock data only in browser memory
3. **Session lost on browser close** — Uses sessionStorage (not persistent)
4. **No real JWT verification** — Uses mock JWT structure
5. **No database** — All test data hardcoded
6. **Portals not built yet** — Redirects work, but portal pages are empty

These are addressed in Phase 2 (mock Express backend) and Phase 3 (real Converge backend).

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

## Next Steps

1. ✅ Phase 1: Frontend login working locally
2. 🔄 Phase 2: Mock Express backend with real routes
3. 📋 Phase 3: Build portal pages (Manager, Employee, Data SPOC, Admin)
4. 🔗 Phase 4: Connect to real Converge backend
5. 📱 Phase 5: Google Apps Script deployment

---

**Questions?** Check browser console logs or see `api.js` and `app.js` comments for implementation details.
