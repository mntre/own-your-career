# Coding Standards — Own Your Career

## Project Structure

```
own-your-career/
├── src/
│   ├── frontend/                # Shared across BOTH platforms (platform-agnostic)
│   │   ├── html/                # HTML templates
│   │   │   ├── manager-portal.html
│   │   │   ├── dataspoc-portal.html
│   │   │   └── employee-portal.html
│   │   ├── css/                 # Stylesheets
│   │   │   └── styles.css
│   │   └── js/                  # Client-side JavaScript
│   │       ├── app.js           # Main app logic
│   │       ├── gates.js         # Hard gate logic
│   │       ├── calculations.js  # OKR score formulas
│   │       └── validation.js    # Form validation
│   │
│   ├── backend-converge/        # Converge Cloud specific
│   │   ├── server.js            # Express server
│   │   ├── routes.js            # API routes
│   │   ├── db.js                # Database connection
│   │   ├── middleware/          # Auth, RBAC, logging
│   │   └── email.js             # SMTP email service
│   │
│   ├── backend-appscript/       # Google Apps Script specific
│   │   ├── Code.gs              # Main server functions
│   │   ├── Database.gs          # Google Sheets data layer
│   │   ├── Email.gs             # GmailApp email service
│   │   └── WebApp.gs            # doGet/doPost handlers
│   │
│   └── shared/                  # Shared utilities (both platforms use)
│       ├── constants.js         # Performance brackets, formulas, config
│       ├── workflow.js          # Step sequencing logic
│       └── export.js            # SFTP export formatter
│
├── tests/                       # Test files
├── docs/                        # Developer documentation
├── .kiro/                       # Kiro steering files
│   └── steering/
├── .gitignore
└── README.md
```

## Coding Conventions

### JavaScript (Shared Frontend + Converge Backend)

- Use **ES6+ syntax** (const/let, arrow functions, template literals, destructuring)
- Use **JSDoc comments** for all functions — include @param, @returns, @description
- Use **camelCase** for variables and functions
- Use **PascalCase** for classes and constructors
- Use **UPPER_SNAKE_CASE** for constants
- Handle errors explicitly — no silent failures
- Validate all user inputs before processing
- Keep functions small and single-purpose

```javascript
/**
 * Calculates the OKR final score based on employee role level.
 * @param {string} roleLevel - One of: 'GROUP_HEAD', 'DEPT_HEAD', 'TEAM_HEAD', 'INDIVIDUAL'
 * @param {number} corporateScore - Corporate scorecard percentage
 * @param {number} groupScore - Group grid percentage
 * @param {number} deptScore - Department OKR percentage
 * @param {number} teamScore - Team OKR percentage
 * @returns {number} Final weighted score as a percentage
 */
function calculateOKRScore(roleLevel, corporateScore, groupScore, deptScore, teamScore) {
  // Implementation
}
```

### Google Apps Script (.gs files)

- Follow the same JavaScript conventions above
- Use `google.script.run` for client-to-server calls (with `.withSuccessHandler()` and `.withFailureHandler()`)
- Use `PropertiesService` for configuration (never hardcode secrets)
- Use `LockService` for concurrent write protection on Google Sheets
- Structure Sheets data with headers in Row 1; never rely on column position alone — use column name lookup

### HTML Templates

- Use semantic HTML5 elements
- Include `aria-` attributes for accessibility
- Forms must have proper `label` elements tied to inputs
- All interactive elements must be keyboard-accessible
- Use `data-*` attributes for JavaScript hooks (not classes)

### CSS

- Use CSS custom properties (variables) for colors, spacing, and typography
- Mobile-first responsive design (min-width breakpoints)
- BEM naming convention for class names: `.block__element--modifier`
- No inline styles in HTML
- **MUST follow Converge Brand Guidelines** (see Branding section below)

## Platform Abstraction

Since the same frontend serves both platforms, abstract all backend calls behind a common interface:

```javascript
// src/frontend/js/api.js — Platform-agnostic API layer

const API = {
  /**
   * Saves skills assessment data for an employee.
   * Implementation differs per platform (REST vs google.script.run).
   */
  saveSkillsAssessment: function(employeeId, assessmentData) {
    if (PLATFORM === 'CONVERGE') {
      return fetch('/api/skills-assessment', { method: 'POST', body: JSON.stringify({ employeeId, ...assessmentData }) });
    } else if (PLATFORM === 'APPSCRIPT') {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .saveSkillsAssessment(employeeId, assessmentData);
      });
    }
  }
};
```

This pattern ensures frontend code never contains platform-specific branching inline — all platform differences live in the API layer.

---

## Converge Brand Guidelines

**Source:** CONVERGE Brand Guidelines 2026 (condensed PDF)

All projects under Converge MUST follow the official brand guidelines. This applies to all UI elements, portals, and user-facing pages.

### Color Palette

#### Primary Colors

| Color Name | Hex Code | RGB | Usage |
|------------|----------|-----|-------|
| **Converge Teal** | `#038F8D` | rgb(3, 143, 141) | Primary brand color — buttons, headers, links, key UI elements |
| **Phantom Black** | `#000000` | rgb(0, 0, 0) | Text, dark backgrounds |
| **Pure White** | `#FFFFFF` | rgb(255, 255, 255) | Backgrounds, white space, contrast |

#### Secondary Colors

| Color Name | Hex Code | RGB | Usage |
|------------|----------|-----|-------|
| **Deepwave Teal** | `#024645` | rgb(2, 70, 69) | Dark accents, footers, depth |
| **Midwave Teal** | `#027574` | rgb(1, 116, 115) | Secondary buttons, hover states |
| **Visionary Aquamarine** | `#49D7D1` | — | Highlights, success states, accents |
| **Softwave Teal** | `#9AC0C3` | rgb(154, 192, 195) | Subtle backgrounds, borders, disabled states |
| **Pulse Violet** | `#8965F5` | — | Accent color, notifications, badges |

### CSS Custom Properties (Required)

All projects must define these brand variables and use them throughout:

```css
:root {
  /* Primary */
  --color-primary: #038F8D;          /* Converge Teal */
  --color-black: #000000;            /* Phantom Black */
  --color-white: #FFFFFF;            /* Pure White */

  /* Secondary */
  --color-teal-dark: #024645;        /* Deepwave Teal */
  --color-teal-mid: #027574;         /* Midwave Teal */
  --color-aquamarine: #49D7D1;       /* Visionary Aquamarine */
  --color-teal-soft: #9AC0C3;        /* Softwave Teal */
  --color-violet: #8965F5;           /* Pulse Violet */

  /* Typography */
  --font-heading: 'Funnel Display', sans-serif;
  --font-body: 'Funnel Sans', 'DM Sans', sans-serif;
}
```

### Typography

| Type | Font | Usage |
|------|------|-------|
| **Primary** | Funnel Display | Titles and headings |
| **Secondary** | Funnel Sans | Body text |
| **Fallback** | DM Sans | Body text (alternative) |

### Art Style

**Geometric Isometric Minimalist**
- Geometric shapes utilizing 3D perspective without a vanishing point (Isometric)
- "Less is more" approach to color and detail (Minimalism)
- Clean, modern, uncluttered interfaces

### Brand Usage Rules

1. **Never mix primary colors** — use proper contrast ratios
2. **Never use dark on dark** — ensure readability
3. **Never use light on light** — maintain contrast
4. **Never change the logo colors** — use official versions only
5. Use Converge Teal (`#038F8D`) as the dominant accent throughout the UI
6. Use Phantom Black for body text on white backgrounds
7. Use Pulse Violet sparingly for highlights and attention-drawing elements

---

## Security Rules

- Never expose employee data to unauthorized roles
- All API endpoints must validate user role before returning data
- Sanitize all text inputs (prevent XSS)
- Use parameterized queries for database operations (Converge backend)
- Never log sensitive employee data (scores, feedback content) in plain text
- Session management: enforce timeout after 30 minutes of inactivity

## Git Conventions

- **Branch naming:** `feature/[step-number]-[short-description]` (e.g., `feature/step1-skills-assessment`)
- **Commit messages:** Reference Jira ticket + concise description
  - Format: `PAC-XXXX: [verb] [what]` (e.g., `PAC-6864: implement OKR calculation engine`)
- **PR reviews:** At least 1 reviewer before merge to main
- **Never push directly to main** — always use feature branches + PR

## Error Handling

- Display user-friendly error messages (never expose stack traces)
- Log errors with context (user ID, step, action attempted, timestamp)
- For form submissions: validate all fields before sending to backend
- For backend failures: return structured error responses with error codes

```javascript
// Standard error response structure
{
  success: false,
  error: {
    code: 'GATE_LOCKED',
    message: 'Step 3 is not yet available. Steps 1 and 2 must be completed first.',
    details: { step1Complete: true, step2Complete: false }
  }
}
```

## Testing Approach

- Developer Self-Integration Test (SIT) before marking any sub-task as Done
- Test on BOTH platforms before raising PR
- Verify hard gate logic with edge cases (partial completions, missing data)
- Verify OKR calculations against manual calculation samples
- Test email notifications trigger correctly at each step transition
