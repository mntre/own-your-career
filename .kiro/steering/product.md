# Product Overview — Own Your Career

## What is this project?

The **2026 Performance Management & Goals Management (PMGM)** "Own Your Career" system — an internal build to streamline performance evaluations through standardized, automated workflows.

## Scope (July 17, 2026 Launch)

**MID-YEAR PERFORMANCE REVIEW WORKFLOW** — Phase 1 only.

## 3 Portal System

| Portal | Users | Key Steps |
|--------|-------|-----------|
| Manager Portal | People Managers | Step 1 (Skills Assessment), Step 4 (Feed Forward), Step 5 (Acknowledgement) |
| Data SPOC Portal | Group/Pillar data owners (1-2 per group) | Step 2 (OKR Upload), Performance Summary, Rankings |
| Employee Portal | All Employees | Step 3 (Self-Assessment), Step 6 (View Scores), Step 7 (Acknowledgement) |
| Admin Portal | PMGM Team Members | System configuration, hard lock date management, progress monitoring, SFTP export trigger |

## 7-Step Sequential Process

```
Step 1: Manager → Skills Assessment (Core & Leadership Skills)
Step 2: Data SPOC → OKR Upload (Corporate, Group, Team OKR + Targets + Weight)
Step 3: Employee → Self-Assessment (4 mandatory questions)
Step 4: Manager → Feed Forward (Manager Assessment)
Step 5: Manager → Acknowledgement (confirms review)
Step 6: Employee → View All Scores & Feedback (read-only)
Step 7: Employee → Acknowledgement (confirms review) → END - All data locked
FINAL: SFTP Bulk Export to SuccessFactors (one-time, after ALL reviews complete)
```

## Hard Gates

- Step 3 **locked** until Steps 1 & 2 complete for that employee
- Step 4 **locked** until Step 3 complete
- Step 6 **locked** until Step 5 complete
- After Step 5, all previous data becomes **read-only** for Employee

## Key Decisions

1. Internal build over SAP SuccessFactors — 91.8% savings
2. No SAP CPI real-time integration — one-time SFTP bulk export instead
3. 360 Feedback uses existing SuccessFactors module (not built internally)
4. Calibration / 9-Box Matrix — post-launch (not Phase 1)
5. Responsive web only — no mobile-native app

## Stakeholders

| Role | Name |
|------|------|
| Project Champion | Jelyn Ira Parreño (People Capability & Growth) |
| Department Head | Luigi Espiritu |
| Business Analyst | Zaira Bajar |
| Lead Developer | Charvin Penaverde |
| Developer | Jeremy Carino |
| Scrum Master | JC Claudio |
| QA/Analytics | Mike Escobilla |
| Data Validation | Ernica Castronero |

## Jira Tickets

- PAC-6864
- PAC-8047
