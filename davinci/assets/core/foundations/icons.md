# Foundation: Icons (contract)

Agnostic rules for icon usage. The icon set and its rendering component are delegated to the design system and platform.

## Rules

- Icons are semantic: chosen by meaning and named by meaning. Prefer the variant that matches state (filled or selected, slashed for off, badge for a count).
- Size by role, set on the parent, never as a fixed width or height on the icon: inline with text 12 to 16px, control icons 16 to 20px, standalone contextual 20 to 28px. Never exceed 28px; the hero element is a number or text, never an icon.
- Color by the glyph hierarchy: default for standard glyphs, secondary or tertiary for metadata, accent only when the icon is the primary action or the key datum (this counts toward the one-accent-per-view limit).
- Always put a space between an icon and its adjacent text label.
- Interactive icon controls meet the platform minimum hit target (`{profile.platform.minHitTarget}`).

## Parameters (resolved per project)

- `foundations.iconSet` (or `designSystem`): the project's icon set and rendering component (Core default: the design system's set).
- hit target: `{profile.platform.minHitTarget}`.

Design and the Reviewer resolve these from the workspace's active design system in `.davinci/assets/design-system/`, either a fetched pack or a derived reference.

## Values (resolved icon set)

The icon set, the rendering component, and concrete glyph names live in the active design system's `tokens/icons.md`. Core ships no default values. Confirm a token name exists in that file before using it, since the browser falls back silently on an undefined token.

## Sources

`apple-hig` (SF Symbols, hit target for icon controls), `nielsen` (recognition rather than recall, minimalist design), `wcag` (accessible name for icon-only controls).
