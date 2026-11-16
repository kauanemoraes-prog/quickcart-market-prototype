# Foundation: Spacing (contract)

Agnostic rules for spacing and layout rhythm. The concrete scale values are delegated to the design system.

## Rules

- Spacing comes from a consistent scale with semantic steps, not arbitrary pixel values; reuse the same step for the same relationship.
- Do not use negative margins to pull elements together; adjust the layout or the scale step instead.
- Do not add padding to the page wrapper; the runtime content area already provides the outer padding. Add padding only to inner surfaces (cards, panels, sections) that need it.
- Keep a consistent rhythm: equal spacing for equal relationships, less space to group related items, more space to separate groups.

## Parameters (resolved per project)

- `foundations.spacingScale`: the project's spacing scale, from its design system.

Design and the Reviewer resolve this from the workspace's active design system in `.davinci/assets/design-system/`, either a fetched pack or a derived reference.

## Values (resolved token set)

The concrete spacing scale values and token names live in the active design system's `tokens/spacing.md`. Core ships no default values. Confirm a token name exists in that file before using it, since the browser falls back silently on an undefined token.

## Sources

`nielsen` (consistency and standards, aesthetic and minimalist design).
