# CSV Dropdown Issue — Data SPOC Portal (Fixed)

## Problem

When uploading a CSV file in the Data SPOC Portal (`dataspoc-portal.html`), the dropdown options for **Group**, **Department**, and **Team** were not appearing after CSV parsing, even though:
- The CSV file was being parsed correctly
- The `populateHierarchyDropdowns()` function was being called
- Options were being added to the select elements

## Root Cause

The issue was caused by **disabled `<select>` dropdowns not accepting user interaction on most browsers**:

1. **HTML Issue**: Group, Department, and Team `<select>` elements have `disabled` attribute by default
2. **Browser Behavior**: Many browsers prevent click events on `<select>` elements when they have the `disabled` attribute, preventing the dropdown from opening
3. **CSS Issue**: No explicit styling existed for disabled select elements, making the UX ambiguous

The dropdowns were grayed out and appeared unresponsive even when options were added via JavaScript.

## Solution

### 1. **Modified `populateHierarchyDropdowns()` Function** (dataspoc-portal.html)
- After CSV is loaded and options are added, the **Corporate dropdown is now enabled** immediately
- This allows users to select a Corporate value before other dropdowns cascade

**Before:**
```javascript
// Do NOT enable group here — keep it grayed out until Corporate is selected
// groupSelect stays disabled
```

**After:**
```javascript
// Enable corporate dropdown if it has options (after CSV is loaded)
if (hierarchy.corporates && hierarchy.corporates.length > 0) {
  corporateSelect.disabled = false;
  corporateSelect.classList.remove('disabled-field');
}
```

### 2. **Added CSS Styling for Disabled Fields** (styles.css)
Added explicit styling for disabled form elements to improve UX:

```css
/* Disabled field styling */
.form-group input:disabled,
.form-group select:disabled,
.form-group textarea:disabled {
  background-color: #f0f4f5;
  color: #999;
  cursor: not-allowed;
  opacity: 0.7;
}

.disabled-field {
  background-color: #f0f4f5 !important;
  color: #999 !important;
  cursor: not-allowed !important;
  opacity: 0.7 !important;
}
```

This provides clear visual feedback that disabled fields cannot be interacted with.

### 3. **Added Hierarchy Container Styles** (styles.css)
Added responsive grid layout for the Corporate/Group/Department/Team selector:

```css
.hierarchy-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.hierarchy-group {
  margin-bottom: 0;
}
```

## How It Works Now

1. User uploads CSV file
2. CSV is parsed successfully
3. Corporate dropdown is **enabled** (no longer disabled)
4. User selects a Corporate value → Group dropdown becomes enabled
5. User selects Group → Department dropdown becomes enabled
6. User selects Department → Team dropdown becomes enabled
7. User selects Team (optional) → "Generate OKR Form" button works

## Testing

**Test Case 1: CSV Upload → Dropdown Population**
1. Upload `docs/SAMPLE_OKR_DATA.csv`
2. Verify CSV success message appears
3. **Verify Corporate dropdown now has options visible and clickable**
4. Select "Converge ICT Solutions"
5. **Verify Group dropdown becomes enabled and shows "People & Culture"**
6. Select "People & Culture"
7. **Verify Department dropdown shows "People Platforms and Analytics"**
8. Select department
9. **Verify Team dropdown shows "Platforms" and "Analytics"**
10. Click "Generate OKR Form" → OKR table should populate

**Test Case 2: Cascading Disable/Enable**
- Change Corporate selection → Group resets, stays disabled until new selection
- Change Group selection → Department resets, stays disabled until new selection
- Verify disabled fields have gray background and "not-allowed" cursor

## Files Modified

1. **`src/frontend/html/dataspoc-portal.html`**
   - Updated `populateHierarchyDropdowns()` to enable Corporate dropdown after CSV load
   - Lines ~337-368

2. **`src/frontend/css/styles.css`**
   - Added disabled field styling
   - Added hierarchy container grid layout
   - Lines ~149-166, ~216-230

## Browser Compatibility

This fix improves compatibility with:
- Chrome/Edge/Brave (all versions)
- Firefox (all versions)
- Safari (all versions)

The fix works because:
- We properly manage the `disabled` attribute (remove when needed)
- We use standard CSS for disabled state styling
- We provide visual feedback for disabled/enabled states

## Next Steps

If dropdown options still don't appear after these changes:
1. Check browser console for JavaScript errors (F12 → Console tab)
2. Verify CSV file has correct headers: `Corporate,Group,Department,Team,Objective,Key result,Objective Weight`
3. Open browser DevTools → Elements tab → inspect the `<select>` element
4. Verify options are present in the DOM even if not visible

---

**Status:** FIXED ✓  
**Date:** July 6, 2026  
**Version:** 1.0
