# Developer Documentation

Additional documentation for the development team.

## Contents

- Architecture decisions and rationale
- API endpoint documentation
- Deployment guides (Converge Cloud & Apps Script)
- Troubleshooting guides

## BRD v4.0 Updates (July 1, 2026)

The following items were added to the roadmap as "last to develop" based on BRD v4.0 from Jelyn Ira Parreño & Gladys Erika Munsalud. These are to be tackled only after all core Steps 1–7 and portal features are stable.

1. **Team Heat Map** — Manager Portal consolidated dashboard with color-coded score variances (Red = off track, Amber = needs attention, Green = on track). Must update in real-time.
2. **Automated Weekly Reporting** — Email reports to admins 1–2x/week with a Friday automation rule.
3. **OKR Status Field** — New enum: Not Started, On Track, Completed, Postponed. Already added to `shared/constants.js`.
4. **Mutual Acknowledgment** — BRD specifies a single mutual acknowledgment (both parties) instead of separate Steps 5 & 7. Evaluate workflow adjustment.
5. **Hard Deadline Admin Lock** — PMGM team sets a hard deadline after which forms lock. Requires admin control.

### Quick Fixes Already Applied (July 3, 2026)
- Self-assessment questions updated to 1H/2H wording (`shared/constants.js`)
- Performance bracket boundary corrected: Exceeded = 101% and above (`shared/constants.js`, `frontend/js/calculations.js`)
- OKR Status enum added to `shared/constants.js`

## Reference Documents

Full requirements, wireframes, and technical solutions are maintained in the
Technical Documents workspace (separate from this repo). Contact Zaira Bajar
or Luigi Espiritu for access.
