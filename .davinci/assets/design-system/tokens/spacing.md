# DaVinci Core: Default Foundation Tokens (Spacing)

> Shipped default VALUES, editable. These are DaVinci Core's baseline, not a mandate. A project overrides them by pointing the target profile `foundations` block at its own token source (or, in DaVinci Design, by using its bundled design system). Core ships self-contained so the tool works with no external design system.

Design tokens for the Monalisa UI Lib spacing scale.

## Spacing Scale

A consistent spacing scale ensures visual harmony throughout the design system. All spacing values are defined in rem units (1rem = 10px with base font-size of 62.5%).

---

## Spacing Tokens

| Token | Value (rem) | Value (px) | CSS Variable | Usage |
|-------|-------------|------------|--------------|-------|
| **XS** | 0.4rem | 4px | `--space-xs` | Icon/text gaps only |
| **S** | 0.8rem | 8px | `--space-s` | Small spacing, compact elements |
| **M** | 1.6rem | 16px | `--space-m` | Medium spacing, default |
| **MP** | 2.4rem | 24px | `--space-mp` | Medium-plus spacing, canvas padding |
| **L** | 3.2rem | 32px | `--space-l` | Large spacing, section gaps |
| **XL** | 6.4rem | 64px | `--space-xl` | Extra large spacing, major sections |

---

## Visual Reference

```
--space-xs   ▮ (4px)
--space-s    ▮▮ (8px)
--space-m    ▮▮▮▮ (16px)
--space-mp   ▮▮▮▮▮▮ (24px)
--space-l    ▮▮▮▮▮▮▮▮ (32px)
--space-xl   ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮ (64px)
```

---

## Usage Guidelines

### Margins

```css
/* Section spacing */
.section {
  margin-bottom: var(--space-l); /* 32px between sections */
}

/* Card spacing */
.card {
  margin-bottom: var(--space-m); /* 16px between cards */
}

/* Tight spacing */
.list-item {
  margin-bottom: var(--space-s); /* 8px between list items */
}
```

### Padding

```css
/* Container padding */
.container {
  padding: var(--space-mp); /* 24px padding (canvas default) */
}

/* Card padding */
.card {
  padding: var(--space-m); /* 16px padding */
}

/* Button padding */
.btn {
  padding: var(--space-s) var(--space-m); /* 8px vertical, 16px horizontal */
}

/* Compact padding */
.compact {
  padding: var(--space-xs); /* 4px padding */
}
```

### Gaps (Flexbox/Grid)

```css
/* Default gap */
.flex-container {
  display: flex;
  gap: var(--space-m); /* 16px gap */
}

/* Large gap */
.grid-container {
  display: grid;
  gap: var(--space-l); /* 32px gap */
}

/* Small gap */
.inline-items {
  display: flex;
  gap: var(--space-s); /* 8px gap */
}
```

---

## Common Patterns

### Page Layout
```css
.page-wrapper {
  /* NO padding - canvas .content already has var(--space-mp) */
}

.page-section {
  margin-bottom: var(--space-l); /* 32px between sections */
}
```

### Card Layout
```css
.card {
  padding: var(--space-m); /* 16px internal padding */
  margin-bottom: var(--space-m); /* 16px between cards */
}

.card__header {
  margin-bottom: var(--space-m); /* 16px below header */
}

.card__footer {
  margin-top: var(--space-m); /* 16px above footer */
}
```

### Form Layout
```css
.form-group {
  margin-bottom: var(--space-m); /* 16px between form fields */
}

.form-label {
  margin-bottom: var(--space-xs); /* 4px below label */
}

.form-actions {
  margin-top: var(--space-l); /* 32px above action buttons */
  gap: var(--space-s); /* 8px between buttons */
}
```

### Button Groups
```css
.button-group {
  display: flex;
  gap: var(--space-s); /* 8px between buttons */
}
```

### List Spacing
```css
.list-item {
  margin-bottom: var(--space-s); /* 8px between items */
}

.list-item:last-child {
  margin-bottom: 0; /* No margin on last item */
}
```

---

## Spacing Rules

### ✅ DO
- Use spacing variables consistently
- Follow the spacing scale (don't create custom values)
- Use appropriate spacing for hierarchy
- Maintain consistent spacing within components
- Use `gap` for flexbox/grid layouts

### ❌ DON'T
- Hardcode spacing values (e.g., `margin: 16px`)
- Use negative margins (except for specific cases)
- Add padding to page wrapper (canvas already has it)
- Mix spacing units (stick to rem via variables)
- Create arbitrary spacing values

---

## Special Cases

### Canvas Padding
```css
/* Canvas .content already has padding */
.content {
  padding: var(--space-mp); /* 24px - DO NOT override */
}
```

### Negative Margins (Avoid)
```css
/* ❌ DON'T DO THIS */
.full-width {
  margin: calc(var(--space-mp) * -1); /* Breaks layout */
}

/* ✅ DO THIS INSTEAD */
.full-width {
  /* Work within the canvas padding */
}
```

### Responsive Spacing
```css
/* Adjust spacing for smaller screens if needed */
@media (max-width: 768px) {
  .section {
    margin-bottom: var(--space-m); /* Reduce from --space-l */
  }
}
```

---

## Spacing Hierarchy

Use spacing to create visual hierarchy:

1. **Major sections**: `--space-xl` (64px) or `--space-l` (32px)
2. **Components**: `--space-m` (16px) or `--space-mp` (24px)
3. **Elements**: `--space-s` (8px)
4. **Icon/text gaps**: `--space-xs` (4px)

---

## Usage Examples

### Complete Page Layout
```css
.page-wrapper {
  /* NO padding - canvas has it */
}

.page-header {
  margin-bottom: var(--space-l); /* 32px */
}

.page-section {
  margin-bottom: var(--space-l); /* 32px */
}

.section-title {
  margin-bottom: var(--space-m); /* 16px */
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-m); /* 16px */
}

.card {
  padding: var(--space-m); /* 16px */
}
```

### Form with Proper Spacing
```css
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-m); /* 16px between fields */
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs); /* 4px between label and input */
}

.form-actions {
  margin-top: var(--space-l); /* 32px above buttons */
  display: flex;
  gap: var(--space-s); /* 8px between buttons */
  justify-content: flex-end;
}
```

---

## Accessibility

- **Touch targets**: Minimum 44×44px (use adequate padding)
- **Readability**: Sufficient spacing between text blocks
- **Visual hierarchy**: Use spacing to group related content
- **Consistency**: Maintain consistent spacing patterns

---

## Notes

- All spacing tokens are defined in [`src/scss/_variables.scss`](../src/scss/_variables.scss)
- Spacing is compiled into [`dist/css/monalisa.min.css`](../dist/css/monalisa.min.css)
- Base font-size is 62.5% (10px) for easy rem calculations
- 1rem = 10px, so 1.6rem = 16px
- Always use CSS variables, never hardcode values

---

**Reference**: Full spacing showcase in [`../index.html`](../index.html) (Spacing Section)
