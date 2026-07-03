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
| Step 2 (OKR Upload) | Form period opens; can resubmit until deadline |
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
| Admin (PMGM Team) | All portals | System config, deadline management |

---

## Email Notifications

Auto-trigger at each step transition:
- Step 1 complete → notify Data SPOC (Step 2 reminder)
- Steps 1+2 complete → notify Employee (Step 3 enabled)
- Step 3 complete → notify Manager (Step 4 enabled)
- Step 4 complete → notify Manager (Step 5 ready)
- Step 5 complete → notify Employee (Step 6 scores available)

---

## Data Locking Rules

- Steps can be **resubmitted/edited until deadline** (soft deadlines)
- After Step 5 complete: all previous step data becomes **read-only** for Employee
- After Step 7 complete: ALL data locked for that employee (no further edits)
- SFTP export happens only after ALL employees complete full workflow

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
