# MDS Foundation - Typography

Design tokens for the Monalisa UI Lib typography scale.

## Font Family

**SF Hello** (Apple system fonts):
```css
font-family: -apple-system, -apple-system-font, "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif;
```

CSS Variable: `--font-family-main`

---

## Font Weights

| Weight | Value | CSS Variable | Usage |
|--------|-------|--------------|-------|
| **Thin** | 200 | `--font-weight-thin` | Rarely used |
| **Light** | 300 | `--font-weight-light` | Large headings (H1, H2, H3) |
| **Regular** | 400 | `--font-weight-regular` | Body text, paragraphs |
| **Medium** | 500 | `--font-weight-medium` | Emphasis, labels |
| **Semi Bold** | 600 | `--font-weight-semibold` | Strong emphasis, links |
| **Bold** | 700 | `--font-weight-bold` | H4, strong text |

---

## Typography Scale

### Headings

#### H1 - Light Weight
| Font Size | Line Height | CSS Variable |
|-----------|-------------|--------------|
| 32px | 32px | `--font-size-h1` / `--line-height-h1` |

**Usage**: `<h1>Main Page Title</h1>`

#### H1 Subtitle - Light Weight
| Font Size | Line Height | CSS Variable |
|-----------|-------------|--------------|
| 24px | 24px | `--font-size-h1-subtitle` / `--line-height-h1-subtitle` |

**Usage**: `<h1 class="subtitle">Subtitle text</h1>`

#### H2 - Light Weight
| Font Size | Line Height | CSS Variable |
|-----------|-------------|--------------|
| 26px | 26px | `--font-size-h2` / `--line-height-h2` |

**Usage**: `<h2>Section Title</h2>`

#### H2 Subtitle - Light Weight
| Font Size | Line Height | CSS Variable |
|-----------|-------------|--------------|
| 20px | 20px | `--font-size-h2-subtitle` / `--line-height-h2-subtitle` |

**Usage**: `<h2 class="subtitle">Section subtitle</h2>`

#### H3 - Light Weight
| Font Size | Line Height | CSS Variable |
|-----------|-------------|--------------|
| 20px | 20px | `--font-size-h3` / `--line-height-h3` |

**Usage**: `<h3>Subsection Title</h3>`

#### H3 Subtitle - Light Weight
| Font Size | Line Height | CSS Variable |
|-----------|-------------|--------------|
| 15px | 16px | `--font-size-h3-subtitle` / `--line-height-h3-subtitle` |

**Usage**: `<h3 class="subtitle">Subsection subtitle</h3>`

#### H4 - Bold Weight
| Font Size | Line Height | CSS Variable |
|-----------|-------------|--------------|
| 14px | 16px | `--font-size-h4` / `--line-height-h4` |

**Usage**: `<h4>Small Heading</h4>`

#### H4 Subtitle - Bold Weight
| Font Size | Line Height | CSS Variable |
|-----------|-------------|--------------|
| 10px | 16px | `--font-size-h4-subtitle` / `--line-height-h4-subtitle` |

**Usage**: `<h4 class="subtitle">Small subtitle</h4>`

---

### Body Text

#### Body / Table Text - Regular Weight
| Property | Value | CSS Variable |
|----------|-------|--------------|
| Font Size | 14px | `--font-size-body` |
| Line Height | 24px | `--line-height-body` |
| Paragraph Spacing | 16px | - |

**Usage**: `<p>Body text content</p>`

#### Caption - Regular Weight
| Property | Value | CSS Variable |
|----------|-------|--------------|
| Font Size | 12px | `--font-size-caption` |
| Line Height | 16px | `--line-height-caption` |
| Paragraph Spacing | 16px | - |

**Usage**: `<p class="caption">Caption text</p>`

---

## Additional Font Sizes

| Size | Value | CSS Variable | Usage |
|------|-------|--------------|-------|
| **XXXS** | 10px | `--font-size-xxxs` | Very small text, uppercase micro-labels |
| **Tiny** | 12px | `--font-size-tiny` | Small text, captions |
| **XXS** | 14px | `--font-size-xxs` | Body text (same as `--font-size-body`) |
| **XS** | 16px | `--font-size-xs` | Slightly larger body |
| **SM** | 18px | `--font-size-sm` | Medium-large text |

---

## Line Heights

| Name | Value | CSS Variable | Usage |
|------|-------|--------------|-------|
| **Default** | 24px | `--line-height-default` | General text |
| **Tight** | 1 | `--line-height-tight` | Headings |

---

## Usage Examples

### Semantic HTML (Recommended)
```html
<!-- MDS automatically styles semantic HTML -->
<h1>Main Title</h1>
<h1 class="subtitle">Subtitle</h1>
<h2>Section Title</h2>
<p>Body text paragraph</p>
<p class="caption">Caption text</p>
```

### Custom Styling
```css
/* Use typography variables */
.custom-text {
  font-family: var(--font-family-main);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-default);
}

.custom-heading {
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-light);
  line-height: var(--line-height-h2);
}
```

---

## Typography Rules

### DO
- Use semantic HTML (`<h1>`, `<h2>`, `<p>`, etc.)
- Let MDS handle typography styling automatically
- Use CSS variables for custom text
- Maintain hierarchy (H1 > H2 > H3 > H4)
- Use appropriate font weights (light for headings, regular for body)

### DON'T
- Override MDS typography unless explicitly requested
- Hardcode font sizes or weights
- Skip heading levels (H1 > H3)
- Use custom fonts without design approval
- Mix font families

---

## Accessibility

- **Minimum font size**: 12px (caption text)
- **Body text**: 14px for readability
- **Line height**: Minimum 1.5 for body text
- **Contrast**: Ensure sufficient contrast with background

---

## Notes

- All typography tokens are defined in [`src/scss/_variables.scss`](../src/scss/_variables.scss)
- Typography is compiled into [`dist/css/monalisa.min.css`](../dist/css/monalisa.min.css)
- Use semantic HTML for best results

---

**Reference**: Full typography showcase in [`../index.html`](../index.html) (Typography Section)
