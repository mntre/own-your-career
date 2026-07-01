# Workflow & Business Rules — Own Your Career

This document defines the 7-step workflow logic, hard gate conditions, calculation formulas, and data validation rules that MUST be implemented correctly. Developers and AI assistants should reference this when building any workflow-related feature.

## 7-Step Mid-Year Performance Workflow

```
Step 1: Skills Assessment (Manager Portal)
  ↓ Enabled when form period opens

Step 2: OKR Upload (Data SPOC Portal)
  ↓ Can resubmit until deadline

Step 3: Self-Assessment (Employee Portal)
  ↓ Enabled ONLY when Steps 1 AND 2 complete for that employee

Step 4: Feed Forward / Manager Assessment (Manager Portal)
  ↓ Enabled when Step 3 complete for that employee

Step 5: Manager Acknowledgement (Manager Portal)
  ↓ Enabled when Step 4 complete

Step 6: View All Scores & Feedback — READ-ONLY (Employee Portal)
  ↓ Enabled ONLY after Step 5 complete

Step 7: Employee Acknowledgement (Employee Portal)
  ↓ Workflow complete — ALL DATA LOCKED
```

## Hard Gate Matrix

These gates are NON-NEGOTIABLE. The system must enforce them without exception.

| Step | Gate Condition | What Unlocks |
|------|----------------|--------------|
| Step 1 | Form period opens | Partial unlock of Step 3 |
| Step 2 | Form period opens | Partial unlock of Step 3 |
| Step 3 | Steps 1 AND 2 BOTH complete for this specific employee | Step 4 |
| Step 4 | Step 3 complete for this specific employee | Step 5 |
| Step 5 | Step 4 complete for this specific employee | Step 6 |
| Step 6 | Step 5 complete (auto-unlocked, read-only view) | Step 7 |
| Step 7 | Step 6 has been viewed/accessed | Workflow locked |

**Critical rule:** Step 3 requires BOTH Step 1 AND Step 2 to be complete. If only one is done, the employee CANNOT access self-assessment.

## OKR Calculation Formulas (by Role Level)

```javascript
// Group Heads
finalScore = (corporateScorecard * 0.10) + (groupGrid * 0.90);

// Department Heads
finalScore = (groupGrid * 0.60) + (departmentOKR * 0.40);

// Team Heads & Individual Contributors
finalScore = (departmentOKR * 0.60) + (teamOKR * 0.40);
```

All scores are percentages. The formula output determines the performance bracket.

## Performance Brackets

| Bracket | Score Range | Display |
|---------|-------------|---------|
| Exceeded | > 101% | Green indicator |
| Achieved | 90.1% - 100% | Blue indicator |
| Needs Improvement | 81% - 90% | Orange/Amber indicator |
| Failed | < 80% | Red indicator |

**Edge cases:**
- Exactly 101% = Achieved (NOT Exceeded, since bracket is >101%)
- Exactly 90.1% = Achieved
- Exactly 90% = Needs Improvement
- Exactly 81% = Needs Improvement
- Exactly 80% = Failed (bracket is <80%, so 80% itself falls into Needs Improvement? — CONFIRM WITH BA)

**Note to developers:** Clarify with Zaira Bajar whether 80% is "Needs Improvement" or "Failed". The BRD says Failed is <80%, which means 80% itself would be "Needs Improvement". Implement accordingly but flag for UAT validation.

## Core & Leadership Skills Rating Scale

| Level | Label | Description |
|-------|-------|-------------|
| 0 | Not Demonstrated | No demonstration of the skill |
| 1 | Foundational | Basic understanding, requires guidance |
| 2 | Developing | Can perform with some independence |
| 3 | Proficient | Consistently applies skill effectively |
| 4 | Advanced | Champions the skill, mentors others |
| 5 | Expert | Sets standards, drives org-wide application |

### RAG Indicator Logic
- **Go (Green):** Actual Level ≥ Required Level
- **Fail (Red):** Actual Level < Required Level

Required Level is auto-populated based on the employee's band/grade. Manager inputs the Actual Level.

## Self-Assessment Questions (Step 3)

All 4 questions are **mandatory**. Employee cannot submit with any blank answer.

1. What contributed to your performance this quarter?
2. What challenges or gaps impacted your performance?
3. What support do you need for the upcoming quarter?
4. What specific commitments will you make to improve/sustain performance?

**Validation:** All fields are text areas (no character minimum specified for mid-year, but the annual review requires 100-1000 characters per the BRD).

## Acknowledgement Forms (Steps 5 & 7)

Both acknowledgement forms have the same structure:
- **Checkbox (mandatory):** "I confirm that the mid-performance review discussion took place"
- **Comment field (free text):** Optional additional comments

Submission of acknowledgement LOCKS the data for that employee's review.

## Email Notification Triggers

| Trigger Event | Recipient | Purpose |
|---------------|-----------|---------|
| Step 1 complete (all team members rated) | Data SPOC | Prompt OKR upload |
| Step 2 complete (OKR uploaded for employee) | Employee | Prompt self-assessment |
| Step 3 complete (self-assessment submitted) | Manager | Notify ready for Feed Forward |
| Step 4 complete (Feed Forward submitted) | Manager | Prompt acknowledgement |
| Step 5 complete (Manager acknowledged) | Employee | Scores now visible |
| Step 6 viewed | Employee | Prompt employee acknowledgement |
| Step 7 complete (Employee acknowledged) | Manager | Notify review cycle complete |

## Soft Deadline Rules

- Steps 1, 2, 3 allow **resubmission/editing until the system-configured deadline**
- Once a deadline passes, the form becomes read-only (same as hard lock)
- Deadline dates are configurable by system admin (not hardcoded)

## Data Locking Rules

| Event | What Gets Locked |
|-------|-----------------|
| Step 5 submitted | Steps 1-4 become read-only for Employee view |
| Step 7 submitted | ALL data for that employee's review cycle is permanently locked |
| System deadline passed | Any open form becomes read-only |

## Role-Based Access Control (RBAC)

| Role | Can Access | Cannot Access |
|------|-----------|---------------|
| Manager | Own team's data only; Steps 1, 4, 5 forms; Team performance summary | Other teams' data; Employee self-assessment content (until Step 4) |
| Data SPOC | Own group's OKR data; Upload forms; Group performance summary | Individual feedback/assessment content; Acknowledgement forms |
| Employee | Own data only; Steps 3, 6, 7; Own scores after Step 5 | Other employees' data; Manager assessments before Step 6 |

## Data Model Reference

```
Employee { employeeId, name, email, band, department, group, managerId, dataSPOCId }

SkillsAssessment (Step 1) {
  assessmentId, employeeId, managerId,
  skills: [{ skillName, requiredLevel, actualLevel, remarks }],
  status, submittedAt
}

OKRUpload (Step 2) {
  uploadId, employeeId, dataSPOCId,
  corporateOKR, groupOKR, departmentOKR, teamOKR,
  targets: [{ name, weight, result }],
  finalScore, bracket, submittedAt
}

SelfAssessment (Step 3) {
  selfAssessmentId, employeeId,
  question1, question2, question3, question4,
  status, submittedAt
}

FeedForward (Step 4) {
  feedForwardId, employeeId, managerId,
  assessment, status, submittedAt
}

ManagerAcknowledgement (Step 5) {
  ackId, employeeId, managerId,
  confirmed (boolean), comment, submittedAt
}

EmployeeAcknowledgement (Step 7) {
  ackId, employeeId,
  confirmed (boolean), comment, submittedAt
}

WorkflowStatus {
  employeeId, step1Complete, step2Complete, step3Complete,
  step4Complete, step5Complete, step6Unlocked, step7Complete, allLocked
}
```

## SFTP Export (Final Step)

- Triggered ONLY after ALL employees in the organization have completed Step 7
- One-time bulk export (not per-employee)
- Format: CSV/structured file (confirm template with SF team)
- Contains: All assessment data, OKR scores, brackets, acknowledgement timestamps
- Destination: SAP SuccessFactors (archival/system of record)

## Important Implementation Notes

1. **No partial saves** — All form submissions must be validated completely before persisting
2. **Audit trail** — Log every submission with timestamp + user ID
3. **Concurrent access** — Handle scenarios where Data SPOC and Manager are working simultaneously on the same employee's data
4. **Performance bracket edge cases** — Discuss boundary values (80%, 90%, 100%, 101%) with BA during SIT
5. **Employee view (Step 6)** — Must show ALL accumulated data from Steps 1-4 in read-only format
6. **Auto-save is NOT implemented** — Explicit submit action required (per NFR-04: no partial saves)
