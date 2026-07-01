# AI Assistant Guidelines — Own Your Career Development

## Context

This is the development repository for the PMGM 2026: Own Your Career system. Developers on this team use Kiro (and other AI tools) for coding assistance. This steering file ensures consistent, high-quality output across all AI-assisted development.

## Before Starting Any Task

1. **Read ALL steering files** in `.kiro/steering/` to understand project context, coding standards, and business rules
2. Check existing code to match patterns, naming, and style already established
3. Identify which platform(s) the task affects (shared frontend, Converge backend, AppScript backend, or all)
4. **Before finishing any task**, re-read this steering file as an audit check to ensure compliance

## Core AI Principles (from Team Standards)

**ALL AI tools and assistants MUST:**
1. Read steering documents first before beginning any task
2. **Stay on topic** — Focus on the specific task or question at hand; don't introduce unrelated tangents
3. **Avoid hallucinations** — Only provide information you're confident about; if unsure, ask for clarification or admit uncertainty
4. Follow the project structure, standards, and conventions outlined in these steering files
5. Read steering documents again before finishing any task (audit check)
6. Verify output aligns with team standards
7. Flag any deviations from guidelines and explain the rationale

**Point of View (POV):**
- ALL work documents (README, code comments describing workflow, Jira descriptions, documentation) MUST use **3rd person point of view**
- Use actual names and designations instead of "You", "I", "We"
- Examples:
  - ❌ WRONG: "You will submit the form"
  - ✅ CORRECT: "The manager submits the form"
  - ❌ WRONG: "We calculate the OKR score"
  - ✅ CORRECT: "The system calculates the OKR score based on role-level formula"

**File Handling:**
- If Kiro cannot read a file directly (binary formats like .xlsx, .docx), use Python to extract content
- Never ask users to convert files — handle all formats programmatically

## Rules for AI Assistants

### Must Do
- Follow the project structure defined in `coding-standards.md`
- Implement hard gate logic exactly as specified in `workflow-and-business-rules.md` — no shortcuts
- Use JSDoc comments on all functions
- Handle errors explicitly with user-friendly messages
- Validate all form inputs before backend submission
- Maintain platform abstraction — frontend code must work on BOTH platforms
- Use 3rd person POV in all documentation and code comments (e.g., "The manager submits..." not "You submit...")
- Reference Jira tickets (PAC-6864, PAC-8047) when relevant

### Must NOT Do
- Do NOT build 360-Degree Feedback features (uses existing SuccessFactors module)
- Do NOT build Calibration / 9-Box Matrix (post-launch scope)
- Do NOT build real-time SAP CPI integration (replaced by one-time SFTP)
- Do NOT build Reporting Dashboards (post-launch scope)
- Do NOT build Annual Performance Review features (Mid-Year only)
- Do NOT introduce new libraries/frameworks without justification — keep dependencies minimal
- Do NOT hardcode employee data, deadlines, or configuration values — use constants/config
- Do NOT expose sensitive employee data in console logs or error messages
- Do NOT bypass hard gates for any reason

### When Unsure
- Flag ambiguities to the developer rather than guessing
- Reference the Technical Solutions Document for architecture decisions
- Reference the Functional Requirements (FR-01 to FR-14) for feature specifications
- For business rule clarification, note it as "CONFIRM WITH BA" in a code comment

## Code Review Checklist (for AI-assisted reviews)

When reviewing code, verify:
- [ ] Hard gates enforced correctly (check `workflow-and-business-rules.md`)
- [ ] OKR formulas match the role-level specifications
- [ ] Performance bracket boundaries are correct
- [ ] RBAC is applied (user can only access their permitted data)
- [ ] Form validation is complete (no partial saves possible)
- [ ] Platform abstraction maintained (no platform-specific code in shared frontend)
- [ ] Audit trail logging present for data-modifying operations
- [ ] Email notification triggers at correct step transitions
- [ ] Error handling provides user-friendly messages
- [ ] No sensitive data in logs

## File Patterns & When to Apply

When working on files in these paths, apply these additional considerations:

| Path | Consideration |
|------|--------------|
| `src/frontend/**` | Must work on BOTH platforms; no google.script.run or fetch() directly — use API abstraction layer |
| `src/backend-converge/**` | Node.js/Express patterns; use parameterized DB queries; implement RBAC middleware |
| `src/backend-appscript/**` | Apps Script patterns; use LockService for writes; use PropertiesService for config |
| `src/shared/**` | Pure JavaScript; no platform dependencies; these files are imported by both backends |
| `src/frontend/js/gates.js` | Critical file — hard gate logic; changes here affect entire workflow; verify against gate matrix |
| `src/frontend/js/calculations.js` | Critical file — OKR formulas; must match role-level specifications exactly |

## Definition of Done (for Development Sub-tasks)

A development sub-task is DONE when:
- [ ] Functional requirement implemented and working
- [ ] Code follows team standards (JSDoc, error handling, validation)
- [ ] Works on BOTH platforms (Converge Cloud + Apps Script)
- [ ] Hard gates enforced correctly
- [ ] Developer Self-Integration Test (SIT) passed
- [ ] No critical/high security vulnerabilities
- [ ] Code peer reviewed (at least 1 reviewer)

## RACI (Communication Protocol)

| Task/Decision | Responsible | Accountable | Consulted | Informed |
|---------------|-------------|-------------|-----------|----------|
| Solution Design | Zaira Bajar (BA) | Luigi Espiritu (Dept Head) | Tech Lead | Stakeholders |
| Development | Charvin/Jeremy (Devs) | Luigi Espiritu | BA, QA | QA Team |
| Testing/QA | Mike Escobilla, JC Claudio | Luigi Espiritu | Developers | Stakeholders |
| Deployment | Luigi Espiritu | Luigi Espiritu | All Devs | Stakeholders |

- **Flag blockers immediately** to the Accountable party
- Reference Jira tickets (PAC-6864, PAC-8047) in all communications

## Sprint Context

- **Sprint 1 (Jul 1-3):** Build 3 portals (Manager, Data SPOC, Employee)
- **Sprint 2 (Jul 6-10):** Continue dev, system integration, SIT
- **Sprint 3 (Jul 13-17):** UAT, defect fixes, go-live

Daily standup at 9 AM, managed by JC Claudio.

## Story Points Reference

| Story Points | Time |
|--------------|------|
| 10 | 1 hour |
| 20 | 2 hours |
| 40 | 4 hours (half day) |
| 75 | 7.5 hours (1 full day) |

- Productive hours per day: **7.5 hours** (not 8)
- Max story points per day per person: **75**
