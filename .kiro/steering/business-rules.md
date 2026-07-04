# Business Rules — Own Your Career

## Performance Brackets

| Bracket | Range | Label |
|---------|-------|-------|
| Exceeded | ≥ 101% | Top performer |
| Achieved | 90.1% – 100% | Meeting expectations |
| Needs Improvement | 81% – 90% | Below expectations |
| Failed | < 80% (strictly below) | Significantly below |

**Note:** "Exceeded" is 101% and above (not 101.01%).

---

## OKR Score Formulas (by role level)

| Role Level | Formula |
|------------|---------|
| Group Heads | 10% Corporate OKR + 90% Group OKR |
| Department Heads | 60% Group OKR + 40% Department OKR |
| Team/Individual | 60% Department OKR + 40% Team OKR |

---

## Step Gate Logic

| Step | Enabled When |
|------|-------------|
| Step 1 (Skills Assessment) | Form period opens |
| Step 2 (OKR Upload) | Form period opens; can resubmit until hard lock date |
| Step 3 (Self-Assessment) | Steps 1 AND 2 complete for that specific employee |
| Step 4 (Feed Forward) | Step 3 complete for that specific employee |
| Step 5 (Manager Ack) | Step 4 complete |
| Step 6 (View Scores) | Step 5 complete — READ-ONLY |
| Step 7 (Employee Ack) | Step 6 accessible — END, all data locked |

**Hard Gates:** Steps 3, 4, 6 are HARD-LOCKED. Zero bypasses allowed.

---

## Self-Assessment Questions (Step 3)

4 mandatory questions referencing "first half of the year (1H)" and "second half of the year (2H)".  
Defined in `src/shared/constants.js`.

---

## Role-Based Access

| Role | Portal Access | Capabilities |
|------|--------------|-------------|
| Manager | Manager Portal | Steps 1, 4, 5; view team summary |
| Data SPOC | Data SPOC Portal | Step 2; view org data, upload status, rankings |
| Employee | Employee Portal | Steps 3, 6, 7; view own scores |
| Admin (PMGM Team) | All portals | System config, hard lock date management |

---

## Email Notifications

Auto-trigger at each step transition:

| Step Completion | Notification Sent To | Purpose |
|-----------------|-------------------|---------|
| Step 1 (Skills Assessment) complete | Data SPOC | Reminder: OKR uploading (Step 2) can now begin |
| Steps 1 + 2 both complete | Employee | Notification: Self-Assessment (Step 3) is now enabled |
| Step 3 (Self-Assessment) complete | Manager | Notification: Feed Forward form (Step 4) is now enabled |
| Step 4 (Feed Forward) complete | Manager | Reminder: Acknowledgement (Step 5) is ready for completion |
| Step 5 (Manager Acknowledgement) complete | Employee | Notification: View all scores & feedback (Step 6) is now available (read-only) |
| Step 7 (Employee Acknowledgement) complete | System Admin | Final: All review data locked for that employee; ready for SFTP export |

---

## Data Locking Rules

- **Editable Until Hard Lock Date:** Steps 1-5 can be **resubmitted/edited until hard lock date** (business flexibility)
- **Hard Lock Date:** Admin-configured system-wide lock date when:
  - NO forms accept further edits (across all portals)
  - ALL data becomes read-only (even for admins)
  - Users receive final notification before lock
- **Step 5 → Read-Only:** After Manager Acknowledgement (Step 5), employee-visible data becomes read-only
- **Step 7 → Permanent Lock:** After Employee Acknowledgement (Step 7), that employee's workflow fully locked
- **SFTP Export:** Only after ALL employees complete Steps 1-7 AND hard lock date passes

---

## BRD v4.0 Additions (Build LAST — lowest priority)

| # | Item | Status |
|---|------|--------|
| 1 | Team Heat Map (Manager Portal) | To Do |
| 2 | Automated Weekly Reporting | To Do |
| 3 | OKR Status Field | To Do |
| 4 | Mutual Acknowledgment (Revised Flow) | To Do |
| 5 | Hard Deadline Admin Lock | To Do |
| 6 | Self-Assessment Wording (1H/2H) | ✅ DONE |
| 7 | Performance Bracket Boundary Fix | ✅ DONE |
