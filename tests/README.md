# Tests

Test files for the Own Your Career system.

## Structure

```
tests/
├── calculations.test.js    # OKR formula and bracket tests
├── gates.test.js           # Hard gate logic tests
├── validation.test.js      # Form validation tests
└── workflow.test.js        # Step sequencing tests
```

## Running Tests

```bash
npm test
```

## Test Priorities

1. OKR calculations — verify all role-level formulas produce correct results
2. Hard gate logic — verify steps cannot be bypassed
3. Performance brackets — verify boundary values
4. Form validation — verify mandatory fields are enforced
