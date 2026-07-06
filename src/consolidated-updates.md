# CSV Dropdown Issue — Data SPOC Portal (Fixed)

## Problem

When uploading a CSV file in the Data SPOC Portal (`dataspoc-portal.html`), the dropdown options for **Group**, **Department**, and **Team** were not appearing after CSV parsing, even though:
- The CSV file was being parsed correctly
- The `populateHierarchyDropdowns()` function was being called
- Options were being added to the select elements

## Root Cause

The issue was caused by **disabled `<select>` dropdowns not accepting user interaction on most browsers**:

1. **HTML Issue**: Group, Department, and Team `<select>` elements have `disabled` attribute by default
2. **Browser Behavior**: Many browsers prevent click events on `<select>` elements when they have the `disabled` attribute, preventing the dropdown from opening
3. **CSS Issue**: No explicit styling existed for disabled select elements, making the UX ambiguous

The dropdowns were grayed out and appeared unresponsive even when options were added via JavaScript.

## Solution

### 1. **Modified `populateHierarchyDropdowns()` Function** (dataspoc-portal.html)
- After CSV is loaded and options are added, the **Corporate dropdown is now enabled** immediately
- This allows users to select a Corporate value before other dropdowns cascade

**Before:**
```javascript
// Do NOT enable group here — keep it grayed out until Corporate is selected
// groupSelect stays disabled
```

**After:**
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

**Status:** FIXED ✓  
**Date:** July 6, 2026  
**Version:** 1.0
