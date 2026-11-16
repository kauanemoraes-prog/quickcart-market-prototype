# Foundation: Typography (contract)

Agnostic rules for type. The concrete values (font families, exact sizes, weights, line-heights) are delegated to the design system.

## Rules

- Prefer semantic HTML (`h1` to `h6`, `p`, and a caption style); the design system styles them. Do not set a font size on elements the design system already styles.
- The type system provides a scale with semantic roles: display or title, heading levels, body, secondary or caption, and micro-label. Choose the role that matches meaning, not a size picked by eye.
- Minimum readable size for body and content text is `foundations.minReadableText` (Core default 12px). Never use a micro-label size (around 10px) for readable content such as descriptions, list items, or paragraphs; reserve it for uppercase labels, tiny badges, or tertiary metadata.
- One clear typographic hierarchy per screen; do not skip heading levels for styling.

## Parameters (resolved per project)

- `foundations.minReadableText`: the readable-text floor (Core default 12px).
- `foundations.typeScale`: the project's type scale, from its design system.

Design and the Reviewer resolve these from the workspace's active design system in `.davinci/assets/design-system/`, either a fetched pack or a derived reference.

## Values (resolved token set)

Font families, exact sizes and weights, line-heights, and token names live in the active design system's `tokens/typography.md`. Core ships no default values. Confirm a token name exists in that file before using it, since the browser falls back silently on an undefined token.

## Sources

`wcag` (legibility, minimum readable text), `nielsen` (aesthetic and minimalist design, recognition rather than recall).
