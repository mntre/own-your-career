# Phase 1 Updates & Testing Guide

## Overview
Phase 1 implements sync tracking columns and schema updates to align Google Sheets with the portal application. All changes have been completed and are ready for testing.

## Changes Made

### 1. Database.gs Updates (Backend - Google Apps Script)

#### Field Name Consistency (COMPLETED ✓)
- Fixed all field name inconsistencies across read/write functions
- Changed `EmployeeId` → `employeeId` (camelCase)
- Changed `ManagerId` → `managerId` (camelCase)
- Affected functions:
  - `saveSelfAssessment()`, `getSelfAssessment()`
  - `saveFeedForward()`, `getFeedForward()`
  - `saveManagerAcknowledgement()`, `getManagerAcknowledgement()`
  - `saveEmployeeAcknowledgement()`, `getEmployeeAcknowledgement()`
  - `getAllScores()` helper function
  - `getSyncStatusForEmployee()` function call references

#### Sync Column Population (COMPLETED ✓)
All 6 save functions now populate sync tracking columns:
- `lastSyncedAt` - ISO 8601 timestamp (populated on save)
- `syncStatus` - Set to 'SYNCED' on successful save

Functions updated:
- `saveSkillsAssessment()` - Step 1
- `saveOKRUpload()` - Step 2
- `saveSelfAssessment()` - Step 3
- `saveFeedForward()` - Step 4
- `saveManagerAcknowledgement()` - Step 5
- `saveEmployeeAcknowledgement()` - Step 7

#### Array Field JSON Serialization (COMPLETED ✓)

**SkillsAssessment (Step 1):**
- `skills[]` - JSON stringified on save, parsed on read
- `requiredLevel[]` - JSON stringified on save, parsed on read
- `actualLevel[]` - JSON stringified on save, parsed on read
- `remarks[]` - JSON stringified on save, parsed on read

**OKRUpload (Step 2):**
- `targets[]` - JSON stringified on save, parsed on read
- `weight[]` - JSON stringified on save, parsed on read
- `result[]` - JSON stringified on save, parsed on read

Save pattern (example):
```javascript
const assessmentObj = {
  assessmentId: assessmentData.assessmentId || Utilities.getUuid(),
  employeeId: employeeId,
  lastSyncedAt: now,
  syncStatus: 'SYNCED',
  skills: JSON.stringify(assessmentData.skills || []),
  requiredLevel: JSON.stringify(assessmentData.requiredLevel || []),
  actualLevel: JSON.stringify(assessmentData.actualLevel || []),
  remarks: JSON.stringify(assessmentData.remarks || []),
  ...otherData
};
```

Read pattern (example):
```javascript
return {
  ...rowObj,
  skills: rowObj.skills ? JSON.parse(rowObj.skills) : [],
  requiredLevel: rowObj.requiredLevel ? JSON.parse(rowObj.requiredLevel) : [],
  actualLevel: rowObj.actualLevel ? JSON.parse(rowObj.actualLevel) : [],
  remarks: rowObj.remarks ? JSON.parse(rowObj.remarks) : []
};
```

#### Conflict Detection Verification (COMPLETED ✓)
- Verified `detectConflict()` correctly uses `lastSyncedAt` for timestamp comparison
- Conflict triggered when: `sheetsLastSynced > incomingLastSynced`
- Properly handles null timestamps (first sync scenarios)
- Returns detailed conflict info with timestamps and data diff
- `resolveConflict()` function handles resolution strategies

### 2. Google Sheets Schema Updates (REQUIRED - Manual Step)

**⚠️ IMPORTANT: These steps must be completed manually in Google Sheets**

Add two columns to each assessment sheet (at the end, after existing columns):

**Sheets to Update:**
1. PMGM - SkillsAssessment (Step 1)
2. PMGM - OKRUpload (Step 2)
3. PMGM - SelfAssessment (Step 3)
4. PMGM - FeedForward (Step 4)
5. PMGM - ManagerAcknowledgement (Step 5)
6. PMGM - EmployeeAcknowledgement (Step 7)

**For Each Sheet:**

Step 1: Open the Google Sheet
Step 2: Find the last column with data
Step 3: Add two new columns:
   - Column Header: `lastSyncedAt` (Text or DateTime format)
   - Column Header: `syncStatus` (Text format)
Step 4: Set default value for new rows:
   - `lastSyncedAt`: Leave blank initially (will populate on first sync)
   - `syncStatus`: "NOT_STARTED"

**Example (SkillsAssessment Sheet):**
```
Before: assessmentId | employeeId | managerId | skills | ... | submittedAt
After:  assessmentId | employeeId | managerId | skills | ... | submittedAt | lastSyncedAt | syncStatus
```

---

## Testing Instructions

### Phase 1 Backend Verification

The Database.gs file has been updated and is ready for deployment. To verify:

1. **Copy updated Database.gs to Google Apps Script Editor**
   - Log into your Google Apps Script project
   - Replace the contents of Database.gs with the updated version
   - Save the file (Ctrl+S or Cmd+S)

2. **Verify no syntax errors**
   - Apps Script will show syntax errors if any exist
   - Green checkmark indicates all functions are valid

3. **Test in browser console** (after deploying web app)
   - Open the Manager Portal or Employee Portal in browser
   - Open browser DevTools (F12)
   - Go to Console tab
   - Copy and paste entire `integration-verification.js` script
   - Press Enter
   - Expected output: `✓ ALL CHECKS PASSED - Integration ready!`

### Phase 1 Smoke Test (After Sheets columns added)

**Test Scenario: Submit a Skills Assessment**

1. **Preparation**
   - Ensure Google Sheets columns are added (lastSyncedAt, syncStatus)
   - Log into Manager Portal
   - Navigate to employee's Skills Assessment (Step 1)

2. **Submit Form**
   - Fill in skills assessment form
   - Click "Submit" button
   - Watch for success message

3. **Verify Google Sheets**
   - Go to PMGM - SkillsAssessment sheet
   - Find the new row that was created
   - Check:
     - ✓ `lastSyncedAt` column filled with ISO timestamp (e.g., 2024-01-15T14:30:45.123Z)
     - ✓ `syncStatus` column shows "SYNCED"
     - ✓ Array fields display as JSON (e.g., `["Skill1","Skill2"]`)

4. **Verify Portal Display**
   - Refresh portal page
   - Check that skills display correctly (arrays parsed back from JSON)
   - Verify sync status indicator shows green with timestamp

5. **Test Conflict Detection**
   - Manually edit the submittedAt timestamp in Sheets to a future date
   - Submit the same assessment again from portal
   - Expected: Conflict dialog appears showing:
     - Portal data (older)
     - Sheets data (newer)
     - Timestamps for both
   - Click "OK" to resolve (portal data overwrites Sheets)
   - Verify row updates with new `lastSyncedAt` timestamp

### Verification Checklist

After completing all tests, verify:

- [ ] All field names use camelCase (employeeId, not EmployeeId)
- [ ] All sync columns (lastSyncedAt, syncStatus) present in Google Sheets
- [ ] Sync timestamps are ISO 8601 format (e.g., 2024-01-15T14:30:45.123Z)
- [ ] Array fields stored as JSON strings in Sheets
- [ ] Array fields parsed back to arrays in portal display
- [ ] No console errors on form submission
- [ ] Conflict detection works with timestamp comparison
- [ ] Workflow status updates correctly after each step
- [ ] Team sync indicators show correct status and timestamp
- [ ] Integration verification script passes all checks

---

## Troubleshooting

### Issue: "Array field is not an array"
**Cause:** Array field not wrapped in JSON.stringify on save
**Solution:** Verify `saveSkillsAssessment()` and `saveOKRUpload()` include JSON.stringify for array fields

### Issue: "lastSyncedAt is undefined"
**Cause:** Column not added to Google Sheet
**Solution:** Manually add `lastSyncedAt` column to assessment sheets (see Google Sheets Schema Updates section)

### Issue: "Conflict dialog shows no timestamp"
**Cause:** Existing data doesn't have lastSyncedAt value
**Solution:** This is expected for pre-Phase 1 data. New submissions will populate the field.

### Issue: "Portal can't parse array field"
**Cause:** JSON.parse failing on non-JSON string
**Solution:** Verify getSkillsAssessment() and getOKRUpload() use JSON.parse with try/catch

---

## Next Steps

After Phase 1 is complete and verified:

1. **Phase 2:** Database.gs additional updates (if needed)
2. **Phase 3:** Full integration testing with real user data
3. **Phase 4:** Deploy to production after stakeholder sign-off

---

## Summary

**Phase 1 Status: Code Complete ✓ | Manual Sheets Setup: Required | Testing: Ready**

- Backend code changes: ✓ Complete
- Field name consistency: ✓ Fixed
- Sync column population: ✓ Added
- Array field JSON handling: ✓ Implemented
- Conflict detection: ✓ Verified
- Google Sheets schema: ⏳ Manual (not automated)
- Frontend verification: ⏳ Ready to run in browser console

