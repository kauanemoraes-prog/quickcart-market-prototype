# Foundation: Color (contract)

Agnostic rules for color. The concrete palette (hex values, token names) is delegated to the design system.

## Rules

- Color is applied through semantic roles, not raw values: a primary accent, a neutral glyph hierarchy (default, secondary, tertiary), surface or fill, and semantic status (info, success, warning, error).
- Use the accent only when an element is the primary action or the key datum; at most one accent focus per view.
- Never convey meaning by color alone; pair color with an icon, text, or shape.
- Meet the project's contrast target (`foundations.contrastLevel`, Core default WCAG 2.2 AA) for text and essential UI.
- Status colors map to the semantic states components declare (a notification's severity, an invalid field), never decorative use.

## Parameters (resolved per project)

- `foundations.contrastLevel`: the contrast target (Core default AA).
- `foundations.colorPalette`: the project's semantic palette, from its design system.

Design and the Reviewer resolve these from the workspace's active design system in `.davinci/assets/design-system/`, either a fetched pack or a derived reference.

## Values (resolved token set)

The concrete palette, hex values, and token names live in the active design system's `tokens/colors.md`. Core ships no default values. Confirm a token name exists in that file before using it, since the browser falls back silently on an undefined token.

## Sources

`wcag` (1.4.1 use of color, 1.4.3 contrast), `apple-hig`, `nielsen`.
