# Branding & UI Standards — Own Your Career

## Brand Identity

**Brand:** Converge 2026  
**Style:** Clean, professional, teal-forward with minimal accent colors  
**Tone:** Corporate but approachable — no playful UI, no heavy gradients

---

## Color Palette

### Primary Colors
| Name | Hex | CSS Variable | Usage |
|------|-----|-------------|-------|
| Converge Teal | `#038F8D` | `--color-primary` | Primary actions, headers, active states |
| Phantom Black | `#000000` | `--color-black` | Body text, headings |
| Pure White | `#FFFFFF` | `--color-white` | Backgrounds, button text on primary |

### Secondary Colors
| Name | Hex | CSS Variable | Usage |
|------|-----|-------------|-------|
| Deepwave Teal | `#024645` | `--color-teal-dark` | Table headers, dark accents |
| Midwave Teal | `#027574` | `--color-teal-mid` | Hover states on primary buttons |
| Visionary Aquamarine | `#49D7D1` | `--color-aquamarine` | Focus outlines, secondary hover |
| Softwave Teal | `#9AC0C3` | `--color-teal-soft` | Borders, dividers, disabled backgrounds |
| Pulse Violet | `#8965F5` | `--color-violet` | Badges, notification indicators |

### Status Colors (Performance Brackets)
| Status | Background | Text Color | Usage |
|--------|-----------|-----------|-------|
| Exceeded | `#e6f9f0` | `#0a7c42` | ≥101% performance |
| Achieved | `#e8f4fd` | `#038F8D` | 90.1–100% performance |
| Needs Improvement | `#fff3e0` | `#e65100` | 81–90% performance |
| Failed | `#fde8e8` | `#c62828` | <80% performance |

### RAG Indicators (Skills Assessment)
| Indicator | Color | Usage |
|-----------|-------|-------|
| Go (Pass) | `#0a7c42` | Skill meets threshold |
| Fail | `#c62828` | Skill below threshold |

---

## Typography

| Element | Font Family | CSS Variable | Weight | Size |
|---------|------------|-------------|--------|------|
| Headings (h1–h6) | Funnel Display | `--font-heading` | 700 | h1: 2rem, h2: 1.5rem, h3: 1.25rem |
| Body text | Funnel Sans, DM Sans | `--font-body` | 400 | 1rem (16px base) |
| Buttons | Funnel Sans, DM Sans | `--font-body` | 500 | 1rem |
| Badges | Funnel Sans, DM Sans | `--font-body` | 600 | 0.75rem |

**Line height:** Body 1.6, Headings 1.2

---

## Spacing System

| Token | Value | CSS Variable |
|-------|-------|-------------|
| XS | 0.25rem (4px) | `--spacing-xs` |
| SM | 0.5rem (8px) | `--spacing-sm` |
| MD | 1rem (16px) | `--spacing-md` |
| LG | 1.5rem (24px) | `--spacing-lg` |
| XL | 2rem (32px) | `--spacing-xl` |
| 2XL | 3rem (48px) | `--spacing-2xl` |

---

## Border Radius

| Size | Value | CSS Variable |
|------|-------|-------------|
| Small | 4px | `--radius-sm` |
| Medium | 8px | `--radius-md` |
| Large | 12px | `--radius-lg` |

---

## Shadows

| Size | Value | CSS Variable |
|------|-------|-------------|
| Small | `0 1px 2px rgba(0,0,0,0.05)` | `--shadow-sm` |
| Medium | `0 4px 6px rgba(0,0,0,0.07)` | `--shadow-md` |
| Large | `0 10px 15px rgba(0,0,0,0.1)` | `--shadow-lg` |

---

## Component Conventions

### Buttons
- **Primary (`.btn--primary`):** Teal background, white text → hover: Midwave Teal
- **Secondary (`.btn--secondary`):** Softwave Teal background, dark text → hover: Aquamarine
- **Disabled (`.btn--disabled`):** Softwave Teal, grey text, 60% opacity, `cursor: not-allowed`
- **Focus:** 3px Aquamarine outline, 2px offset (accessibility)

### Cards
- White background, Softwave Teal border, 8px radius, small shadow
- Header uses `--font-heading` in Deepwave Teal

### Tables
- Header row: Deepwave Teal background, white text
- Row hover: 15% opacity Softwave Teal
- Border: 1px Softwave Teal bottom

### Forms
- Input border: Softwave Teal
- Focus: Primary Teal border + 3px rgba glow
- Labels: 500 weight, black

### Gate Lock Indicator
- Locked sections: 50% opacity, no pointer events
- Lock icon + "🔒 Locked" text centered over locked content

### Step Timeline
- Horizontal flex row with scroll
- States: `.completed` (green bg), `.in-progress` (teal bg, white text), `.locked` (grey, 70% opacity)

---

## Rules

1. **Use CSS variables only** — never hardcode hex values in HTML or JS
2. **One CSS file** — all styles live in `src/frontend/css/styles.css`
3. **No CSS frameworks** — no Bootstrap, Tailwind, or similar
4. **No inline styles** — all styling via classes in `styles.css`
5. **BEM-like naming** — use `.block__element--modifier` pattern (e.g., `.btn--primary`, `.card__header`)
6. **Accessibility:** All interactive elements must have visible focus states (`:focus-visible`)
7. **Responsive:** Use `@media (max-width: 768px)` for mobile adjustments
8. **New colors:** Must be added as CSS variable in `:root` first, then referenced by variable name
9. **Performance bracket colors** are strictly tied to business rules — do not repurpose for other UI elements
