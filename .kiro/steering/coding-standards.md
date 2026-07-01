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
