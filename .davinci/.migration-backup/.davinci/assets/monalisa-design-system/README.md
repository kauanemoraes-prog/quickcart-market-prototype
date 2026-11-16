# Monalisa UI Lib

A comprehensive design system with SCSS and vanilla JavaScript components.

## Project Structure

```
monalisa-design-system/
├── src/                          # Source files
│   ├── scss/                     # SCSS source files
│   │   ├── _variables.scss       # Design tokens (colors, spacing, typography)
│   │   ├── _base.scss            # Base styles and resets
│   │   ├── _showcase.scss        # Showcase page styles
│   │   ├── main.scss             # Main SCSS entry point
│   │   └── components/           # Component styles
│   │       ├── _button.scss
│   │       ├── _forms.scss
│   │       └── _components-all.scss
│   └── js/                       # JavaScript source files
│       ├── main.js               # Main JS entry point
│       └── components/           # Component scripts
│           └── all-components.js
├── components/                   # Component documentation & examples
│   ├── _component-index.md
│   ├── README.md
│   ├── MIGRATION-GUIDE.md
│   ├── CURATION-GUIDE.md
│   ├── foundation-*.md           # Foundation documentation
│   └── *.html                    # Component examples
├── dist/                         # Compiled/built files (generated, gitignored)
│   ├── css/
│   │   ├── monalisa.css          # Unminified CSS
│   │   └── monalisa.min.css      # Minified CSS
│   └── js/
│       ├── monalisa.js           # Unminified JS
│       └── monalisa.min.js       # Minified JS
├── build/                        # Build scripts
│   └── bundle-js.js              # JavaScript bundler
├── package.json                  # NPM configuration
└── README.md                     # This file
```

## Setup

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation

1. Navigate to the project directory:
```bash
cd src/monalisa-design-system
```

2. Install dependencies:
```bash
npm install
```

## Build Commands

### Build Everything
Compiles SCSS and bundles JavaScript:
```bash
npm run build
```

### Build SCSS Only
```bash
npm run build:scss        # Unminified
npm run build:scss:min    # Minified
```

### Build JavaScript Only
```bash
npm run build:js
```

### Development Mode
Watch for SCSS changes and auto-compile:
```bash
npm run watch
```

Or run both build and watch:
```bash
npm run dev
```

## Output Files

After building, you'll find:

- `dist/css/monalisa.css` - Unminified CSS (for development)
- `dist/css/monalisa.min.css` - Minified CSS (for production)
- `dist/js/monalisa.js` - Unminified JavaScript (for development)
- `dist/js/monalisa.min.js` - Minified JavaScript (for production)

## Usage

### In HTML

For development:
```html
<link rel="stylesheet" href="dist/css/monalisa.css">
<script src="dist/js/monalisa.js"></script>
```

For production:
```html
<link rel="stylesheet" href="dist/css/monalisa.min.css">
<script src="dist/js/monalisa.min.js"></script>
```

## Components

The design system includes:

### Foundation
- Design Tokens (colors, typography, spacing)
- Base styles and resets

### Components
- Buttons (6 variants, 2 sizes)
- Links
- Forms (inputs, textarea, select, checkbox, radio, switch)
- Notifications (inline and toast)
- Tags
- Tables (with sorting)
- Pagination
- Tabs
- Breadcrumb
- Modals
- Drawers
- Popovers
- Navigation Menu (with dropdowns)
- Cards
- Loaders & Skeletons
- Avatars
- Empty State
- Badge Counter

## Customization

### Modifying Design Tokens

Edit `src/scss/_variables.scss` to customize:
- Colors
- Typography (font sizes, weights, families)
- Spacing scale
- Transitions
- Other design tokens

### Adding New Components

1. Create a new SCSS file in `src/scss/components/`
2. Import it in `src/scss/main.scss`
3. Create corresponding JavaScript in `src/js/components/` (if needed)
4. Rebuild with `npm run build`

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- IE11 with polyfills (not included)

## License

MIT

## Documentation

Component documentation and examples are located in the [`components/`](components/) directory:
- Individual component HTML examples (buttons.html, forms-*.html, etc.)
- Foundation documentation (colors, typography, spacing)
- Migration guides and curation guidelines

## Notes

- All development should be done in the `src/` folder
- The `dist/` folder is generated and should not be edited manually
- The `components/` folder contains documentation and examples (read-only per project guidelines)
- Run `npm run build` before committing changes to generate fresh `dist/` files