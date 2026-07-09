# PENDING WORK BREAKDOWN — Due July 10, 2026

**Status:** 43 of 49 items complete (~88%)  
**Last Updated:** July 9, 2026  
**Launch Date:** July 17, 2026  
**Critical Path:** Items 1, 2, 3 (blocking launch)

---

## 🔴 HIGH PRIORITY — BLOCKING LAUNCH (3 Items)

These 3 items must be 100% complete before launch. No exceptions.

---

### ITEM #1: Email Service Implementation (Converge Cloud)

**File:** `src/backend-converge/email.js`  
**Status:** ❌ Empty stub (TODO comments only)  
**Effort:** Medium (4-6 hours)  
**Blocker:** NO emails sent on step transitions; users won't know what's happening  
**Testing:** Required before launch

#### What's Needed

1. **SMTP Configuration**
   - Use `nodemailer` package (already in package.json dependencies)
   - Configure SMTP transport with:
     - `host: process.env.SMTP_HOST` (e.g., "smtp.gmail.com", "mail.company.com")
     - `port: process.env.SMTP_PORT` (465 for SSL, 587 for TLS)
     - `secure: true` if using 465
     - `auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }`
   - Add these env vars to `.env` and `.env.example`

2. **Email Template System**
   - Create 6 notification templates (one per step transition):
     - **Template 1:** "Skills Assessment Complete" → Email Data SPOC
     - **Template 2:** "OKR Upload Complete" → Email Employee
     - **Template 3:** "Self-Assessment Complete" → Email Manager
     - **Template 4:** "Feed Forward Complete" → Email Manager (reminder Step 5)
     - **Template 5:** "Manager Acknowledgement Complete" → Email Employee
     - **Template 6:** "Employee Acknowledgement Complete" → Email Admin
   - Each template should include:
     - Subject line
     - HTML body with employee name, step completed, next action
     - Plain text fallback
     - Placeholder for deadline countdown

3. **Email Queue System (Optional but Recommended)**
   - Store pending emails in `email_queue` DB table
   - Track: email_id, recipient, subject, body, sent_at, retry_count
   - Purpose: Prevent duplicate sends if process crashes mid-send
   - Implementation: After route completes successfully, insert into queue, then async send

4. **Integration Points**
   - Call from route handlers after successful step submission:
     - `POST /api/skills-assessment` → send Template 1 to data SPOC
     - `POST /api/okr-upload` → send Template 2 to employee
     - `POST /api/self-assessment` → send Template 3 to manager
     - `POST /api/feed-forward` → send Template 4 to manager
     - `POST /api/acknowledgement` (step=5) → send Template 5 to employee
     - `POST /api/acknowledgement` (step=7) → send Template 6 to admin
   - Pass result (success/failure) to response; don't fail route if email fails

5. **Error Handling**
   - If email fails, log error and continue (don't crash)
   - Return `{ success: true, warning: "Email failed but data saved" }`
   - Store failure in audit log for admin review

#### Code Structure

```javascript
// src/backend-converge/email.js

const nodemailer = require('nodemailer');

// Initialize transporter once (connection pooling)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

// Template functions
function getTemplate(stepNumber, recipientRole, employeeName, deadline) { /* return HTML */ }

// Send function
async function sendEmail(to, subject, html) { /* use transporter.sendMail() */ }

// Exported functions
module.exports = {
  notifyDataSpocSkillsComplete,
  notifyEmployeeOkrComplete,
  notifyManagerSelfAssessmentComplete,
  notifyManagerFeedForwardReminder,
  notifyEmployeeAcknowledgementReady,
  notifyAdminExportReady
};
```

#### Testing Checklist

- [ ] Can connect to SMTP server without errors
- [ ] All 6 email types send with correct subject/body
- [ ] Recipient emails are correct (extracted from DB)
- [ ] Deadline countdown included if applicable
- [ ] Failed emails don't crash the server
- [ ] Sent emails logged in audit trail
- [ ] Email backoff (retry logic) works

---

### ITEM #2: Email Service Implementation (Google Apps Script)

**File:** `src/backend-appscript/Email.gs`  
**Status:** ❌ Empty stub (TODO comments only)  
**Effort:** Medium (3-4 hours)  
**Blocker:** Same as Item #1 — no emails for AppScript users  
**Testing:** Required before launch

#### What's Needed

1. **Email Service Choice**
   - Use **GmailApp** (simpler, respects Gmail quotas)
   - Alternatives: MailApp (deprecated), SendGrid integration
   - Gmail quota: 100 emails/day per Apps Script project

2. **Email Templates**
   - Same 6 templates as Converge (keep in sync)
   - Format as HTML strings with template variables
   - Include Google Apps Script compatible placeholders

3. **Sending Functions**
   - Create function per step notification
   - Use `GmailApp.sendEmail(recipient, subject, message, options)`
   - Options: `{ htmlBody: html, name: "Own Your Career" }`

4. **Integration Points**
   - Call from `Code.gs` server functions after workflow state updates:
     - After `saveSelfAssessment()` completes → call `notifyManagerStepComplete('SELF_ASSESSMENT', employeeEmail)`
     - After `submitFeedForward()` completes → call `notifyEmployeeStepComplete('FEED_FORWARD', employeeEmail)`
     - etc.

5. **Error Handling**
   - Log failures to sheet (audit trail)
   - Don't throw errors (fail silently so workflow continues)
   - Return status in response: `{ emailSent: true/false, reason: "..." }`

6. **Daily Quota Management**
   - Check remaining quota before sending
   - Queue excess emails for next day if quota exhausted
   - Log quota usage for admin monitoring

#### Code Structure

```javascript
// src/backend-appscript/Email.gs

function getEmailTemplate(stepType, employeeName, deadline) {
  // Return HTML template string
}

function sendEmail(to, subject, html) {
  try {
    GmailApp.sendEmail(to, subject, '', {
      htmlBody: html,
      name: 'Own Your Career'
    });
    return { success: true };
  } catch (error) {
    Logger.log('Email failed: ' + error);
    return { success: false, reason: error.toString() };
  }
}

function notifyDataSpocSkillsComplete(dataSpocEmail, employeeName) { /* send Template 1 */ }
function notifyEmployeeOkrComplete(employeeEmail, employeeName) { /* send Template 2 */ }
// ... etc.
```

#### Testing Checklist

- [ ] Can send test email from AppScript
- [ ] All 6 email templates render correctly
- [ ] Recipients are correct (looked up from Sheets)
- [ ] Quota management works (logs usage, handles exceed)
- [ ] Failed emails don't crash workflow functions
- [ ] Emails logged in "Email Audit" sheet

---

### ITEM #3: Employee Portal — Step 7 Acknowledgement Form

**File:** `src/frontend/html/employee-portal.html`  
**Status:** ⚠️ Partially done — Step 6 exists, Step 7 form missing  
**Current State:** Step 7 locked/placeholder section exists  
**Effort:** Small (1-2 hours)  
**Blocker:** Employees can't finalize acknowledgement; workflow can't close  
**Testing:** Required; part of E2E testing

#### What's Needed

1. **Step 7 Acknowledgement Form HTML**
   - Add new `<section class="step-7-acknowledgement" id="step-7-content">`
   - Must contain:
     - **Checkbox:** "I acknowledge that I have reviewed my performance feedback and scores"
     - **Optional comment field** (textarea, max 500 chars)
     - **Submit button:** "Confirm & Complete Review"
     - **Info message:** "This action will finalize your review and lock all data"

2. **Form Styling**
   - Use `.card` wrapper
   - Use `.form-group` for checkbox + textarea
   - Use `.form-actions` for buttons
   - Badge: "STEP 7" (green, success color)
   - Heading: "Final Acknowledgement"

3. **Form Logic (JavaScript)**
   - Checkbox must be ticked before submit enabled
   - On submit:
     - Collect checkbox state + optional comment
     - Call API: `POST /api/acknowledgement` with `{ step: 7, comment: "..." }`
     - Backend validates and locks workflow
     - Show success message: "Review finalized. All data is now locked."
     - Disable form after submission
     - Redirect to summary screen

4. **Conditional Display**
   - Only show Step 7 if:
     - Step 6 is completed (read-only view shown)
     - Step 5 (manager ack) is complete
     - Hard lock date hasn't passed
   - If hard lock date passed, show locked state instead

5. **Read-Only After Submission**
   - After Step 7 submitted, entire form disabled
   - Show "✓ Acknowledged on [date]"
   - Disable further edits

#### Code Structure

```html
<!-- Step 7 Section (to be added to employee-portal.html) -->
<section class="step-7-acknowledgement" id="step-7-content" style="display: none;">
  <div class="card">
    <h2 class="card__header">
      <span class="step-badge">STEP 7</span>
      Final Acknowledgement
    </h2>
    <p class="form-guidance">
      Please acknowledge that you have reviewed all your performance feedback and scores.
      This action will finalize your review and lock all data.
    </p>

    <form id="step-7-form">
      <div class="form-group">
        <input type="checkbox" id="acknowledge-checkbox" required>
        <label for="acknowledge-checkbox">
          I acknowledge that I have reviewed my performance feedback and all scores.
        </label>
      </div>

      <div class="form-group">
        <label for="acknowledge-comment">Optional Comment (max 500 characters)</label>
        <textarea id="acknowledge-comment" 
                  maxlength="500" 
                  placeholder="Add any final comments..."></textarea>
        <small id="char-count">0 / 500</small>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn--primary" id="step-7-submit">
          Confirm & Complete Review
        </button>
      </div>
    </form>

    <p class="form-note">
      Once you submit this acknowledgement, your review will be finalized and all data will be locked.
    </p>
  </div>
</section>
```

6. **JavaScript Handler**
   - Add to existing event listener in employee-portal.html:
   ```javascript
   const step7Form = document.getElementById('step-7-form');
   step7Form.addEventListener('submit', async (e) => {
     e.preventDefault();
     const comment = document.getElementById('acknowledge-comment').value;
     const result = await API.submitAcknowledgement(7, comment);
     if (result.success) {
       alert('Review finalized! All data is now locked.');
       step7Form.style.display = 'none';
       // Show success summary
     }
   });
   ```

7. **Timeline Update**
   - Step 7 badge changes from "🔒 LOCKED" to "✓ COMPLETED"
   - Green check mark + timestamp "Completed on [date]"

#### Testing Checklist

- [ ] Form displays when Step 5 complete + Step 6 viewed
- [ ] Checkbox required (can't submit unchecked)
- [ ] Optional comment saves correctly
- [ ] API call succeeds and workflow marked complete
- [ ] Form disabled after submission
- [ ] Step 7 badge shows green checkmark
- [ ] All data locked (can't edit Step 3, 1, etc.)

---

## 🟡 MEDIUM PRIORITY — UI Polish (2 Items)

These are cosmetic/UX improvements requested during stakeholder feedback (July 9 check-in). **Non-blocking** but improve user clarity.

---

### ITEM #4: Employee Portal — Section Renames & Timeline Fix

**File:** `src/frontend/html/employee-portal.html`  
**Status:** ⚠️ Partially done — some sections exist, naming needs update  
**Effort:** Small (1 hour)  
**Impact:** Stakeholder feedback — improves clarity  

#### What's Needed

1. **Rename Sections in Employee Portal Timeline**
   - Remove Steps 1, 2, 4 from employee timeline (they're manager tasks)
   - Keep only: Step 3 (Self-Assessment), Step 6 (View Overall Score), Step 7 (Final Acknowledgement)
   - Current timeline shows:
     ```
     Step 1 (Skills) | Step 2 (OKR) | Step 3 | Step 4 (Feed Forward) | Step 5 (Mgr Ack) | Step 6 | Step 7
     ```
   - Should show:
     ```
     Step 3 (Self-Assessment) | Step 6 (View Overall Score) | Step 7 (Final Acknowledgement)
     ```

2. **Rename Step 6 in Timeline**
   - Change from: "Step 6: View Scores" → "View Overall Score"
   - Add badge info: "(Read-Only)"

3. **Rename Step 7 in Timeline**
   - Change from: "Step 7: My Ack" → "Final Acknowledgement"

4. **Add Disclaimer Section**
   - Place above Step 3 form
   - Text: "The Final Acknowledgment Form will become available once you, your manager, and the data SPOC have all submitted your respective forms."
   - Styling: Yellow/info box with ℹ️ icon
   - Display logic: Show if (Step 5 not complete OR Step 6 not unlocked)

5. **Section Heading Updates**
   - "Self-Assessment" (instead of "Step 3")
   - "Your Performance Scores & Feedback" (instead of "Step 6")
   - "Final Acknowledgement" (instead of "Step 7")

#### Code Changes Required

```html
<!-- Update timeline (remove Steps 1, 2, 4, 5) -->
<section class="step-timeline">
  <div class="step-item step-3 in-progress">
    <div class="step-badge">Self-Assessment</div>
  </div>
  <div class="step-item step-6 locked">
    <div class="step-badge">View Overall Score (Read-Only)</div>
  </div>
  <div class="step-item step-7 locked">
    <div class="step-badge">Final Acknowledgement</div>
  </div>
</section>

<!-- Add disclaimer -->
<div class="info-box" id="acknowledgement-disclaimer" style="display: none;">
  <span class="info-icon">ℹ️</span>
  <p>The Final Acknowledgment Form will become available once you, your manager, and the data SPOC have all submitted your respective forms.</p>
</div>
```

#### Testing Checklist

- [ ] Timeline shows only 3 steps (3, 6, 7)
- [ ] Section names match requirements
- [ ] Disclaimer appears/hides correctly
- [ ] No CSS breaks from timeline change
- [ ] Mobile responsive still works

---

### ITEM #5: Manager Portal — Column Renames + Add Column

**File:** `src/frontend/html/manager-portal.html`  
**Status:** ⚠️ Table exists, column names need update  
**Current Columns:** Step 1: Skills, Step 4: Feed Forward, Step 5: Acknowledgement, Actions  
**Effort:** Small (30 minutes)  
**Impact:** Stakeholder feedback — improves clarity  

#### What's Needed

1. **Rename Existing Columns**
   - "Step 1: Skills" → "Skills Assessment"
   - "Step 4: Feed Forward" → "Feed Forward"
   - "Step 5: Acknowledgement" → "Final Acknowledgement"

2. **Add New Column**
   - Insert new column after "Final Acknowledgement": "View Overall Score"
   - This column shows link/button to view employee's calculated scores
   - Only enabled after Step 5 (manager ack) complete
   - Icon: 📊 or link text: "View"

3. **Column Order (Left to Right)**
   ```
   Employee Name | Department | Band | Skills Assessment | Feed Forward | Final Acknowledgement | View Overall Score | Actions
   ```

4. **Styling**
   - Column headers: Bold, teal color
   - "View Overall Score" links styled as `<a>` or button-style link
   - Disabled links (before Step 5) shown in gray

#### Code Changes Required

```html
<!-- Update table headers in manager-portal.html -->
<thead>
  <tr>
    <th scope="col">Employee Name</th>
    <th scope="col">Department</th>
    <th scope="col">Band</th>
    <th scope="col">Skills Assessment</th>
    <th scope="col">Feed Forward</th>
    <th scope="col">Final Acknowledgement</th>
    <th scope="col">View Overall Score</th>
    <th scope="col">Actions</th>
  </tr>
</thead>
```

#### Testing Checklist

- [ ] Column headers renamed correctly
- [ ] New column displays in correct position
- [ ] "View Overall Score" link enabled after Step 5
- [ ] Link disabled before Step 5 (grayed out)
- [ ] Table layout not broken on mobile
- [ ] Sorting/filtering still works (if implemented)

---

## 🟢 LOW PRIORITY — Backend/Optional (1 Item)

This is functional but incomplete. **Lower priority** — can be deferred to Phase 2 if time runs out.

---

### ITEM #6: SFTP Export to SuccessFactors

**File:** `src/shared/export.js` (stub) + `src/backend-converge/routes.js` (route exists but logs only)  
**Status:** 🧪 Stub only — no actual CSV/SFTP logic  
**Effort:** Large (6-8 hours)  
**Impact:** Post-launch integration — not critical for initial go-live  
**Blocker:** No (manual export is interim workaround)

#### Current State

- Route exists: `POST /api/admin/export-sftp` (calls `export.js`)
- Function exists: `generateExportCSV()` (empty)
- Behavior: Logs "Export requested" but doesn't actually send

#### What's Needed

1. **Understand SF Export Format**
   - **BEFORE CODING:** Confirm with SF team / Ernica Castronero
   - Required fields: Employee ID, OKR Score, Performance Bracket, Skills Ratings, Feed Forward, Acknowledgement Date
   - File format: CSV or XML
   - Security: SFTP (not FTP), encryption, authentication

2. **CSV Generation**
   - Query all employees from workflow_status table (where step7Complete = true)
   - For each employee, fetch:
     - Employee ID, Name, Email, Department
     - OKR score + bracket
     - Skills ratings (core + leadership)
     - Feed Forward comment
     - Acknowledgement date
   - Generate CSV with proper headers
   - Handle special characters (escape quotes, commas)

3. **SFTP Connection**
   - Use `ssh2-sftp-client` npm package
   - Configure with:
     - `host: process.env.SFTP_HOST`
     - `port: process.env.SFTP_PORT` (usually 22)
     - `username: process.env.SFTP_USER`
     - `password: process.env.SFTP_PASSWORD` (or private key)
   - Connect, upload file, close connection

4. **Export History Tracking**
   - Log to `export_history` table:
     - export_id, export_date, employee_count, file_name, status, created_by
   - Show admin view of past exports (UI in admin portal)

5. **Error Handling**
   - If SFTP fails, retry 3 times with 30-sec backoff
   - If still fails, alert admin + log error
   - Don't delete local CSV until confirmed uploaded
   - Return status: `{ success: true/false, message: "...", fileSize, rowCount }`

6. **Security**
   - Don't expose SFTP credentials in logs
   - Use environment variables only
   - Delete local CSV after successful upload
   - Encrypt credentials in .env

#### Code Structure

```javascript
// src/shared/export.js

async function generateExportCSV(employees) {
  // For each employee, build CSV row with all required fields
  // Return CSV string (headers + rows)
}

async function uploadToSFTP(csvContent, fileName) {
  // Connect to SFTP
  // Upload CSV
  // Disconnect
  // Return status
}

module.exports = {
  generateExportCSV,
  uploadToSFTP,
  triggerExport  // Main export orchestrator
};
```

7. **Integration**
   - Admin portal: "Trigger SFTP Export" button
   - Shows: "Are you sure? This will export [X] employees."
   - After export: "Export successful! [X] rows uploaded to SuccessFactors."

#### Testing Checklist

- [ ] CSV generated with correct format (ask SF team to validate)
- [ ] SFTP connection succeeds in staging
- [ ] File uploaded successfully
- [ ] Export history logged in DB
- [ ] Error handling works (retry, timeout, credential failure)
- [ ] Credentials not exposed in logs
- [ ] Performance acceptable (test with 1000+ employees)
- [ ] SF team confirms receipt and format

#### Deferred Work (Phase 2)

- Real-time sync (currently one-time bulk)
- Incremental exports (only changed records)
- Rollback capability
- Audit trail per SF requirements

---

## 📋 SUMMARY TABLE

| # | Item | Status | Priority | File(s) | Effort | Blocker? |
|---|------|--------|----------|---------|--------|----------|
| **1** | Email Service (Converge) | ❌ TODO | 🔴 HIGH | `src/backend-converge/email.js` | 4-6h | YES |
| **2** | Email Service (AppScript) | ❌ TODO | 🔴 HIGH | `src/backend-appscript/Email.gs` | 3-4h | YES |
| **3** | Step 7 Acknowledgement Form | ⚠️ PARTIAL | 🔴 HIGH | `src/frontend/html/employee-portal.html` | 1-2h | YES |
| **4** | Employee Portal UI Renames | ⏳ TODO | 🟡 MEDIUM | `src/frontend/html/employee-portal.html` | 1h | NO |
| **5** | Manager Portal Column Updates | ⏳ TODO | 🟡 MEDIUM | `src/frontend/html/manager-portal.html` | 30m | NO |
| **6** | SFTP Export to SuccessFactors | 🧪 STUB | 🟢 LOW | `src/shared/export.js` + route | 6-8h | NO (optional) |

---

## 🎯 RECOMMENDED EXECUTION ORDER

**Day 1 (July 10):**
1. ✅ Complete Item #3 (Step 7 form) — 1-2h — Unblocks E2E testing
2. ✅ Complete Item #1 (Converge email) — 4-6h — Enables notifications
3. ✅ Complete Item #4 (Employee portal renames) — 1h — UI polish

**Day 2 (July 11):**
1. ✅ Complete Item #2 (AppScript email) — 3-4h — Parity with Converge
2. ✅ Complete Item #5 (Manager portal columns) — 30m — UI consistency
3. ⏳ Item #6 (SFTP export) — 6-8h OR defer to post-launch

**Testing (July 12-15):**
- E2E test all 7 steps with both platforms
- Verify all 6 email types send correctly
- Test hard lock enforcement
- UAT with stakeholders

---

## 🚀 LAUNCH READINESS

**Before July 17 Launch:**
- [ ] Items 1-5 100% complete
- [ ] All emails sent and tested
- [ ] Step 7 E2E workflow functional
- [ ] Stakeholder UAT sign-off
- [ ] Zero critical/high defects
- [ ] Monitoring + alerting configured

**Post-Launch (Phase 2):**
- [ ] Item 6 (SFTP export) — full implementation
- [ ] Email template customizations based on feedback
- [ ] Performance monitoring

---

**Questions?** Reference this breakdown for spec details on each item.

