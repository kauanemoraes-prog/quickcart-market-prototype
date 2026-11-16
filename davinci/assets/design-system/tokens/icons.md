# DaVinci Core: Default Foundation Tokens (Icons)

> Shipped default icon set reference, editable and swappable (same model as the other token files). DaVinci Core ships this so the tool is self-contained.

The default icon set is Apple SF Symbols, rendered by the `sf-symbol` web component.

## Defaults

- Set: SF Symbols. Names use dots, for example `heart.circle.fill`, `person.crop.circle.badge.checkmark`.
- Renderer: the `sf-symbol` component (auto-loaded by the Canvas runtime in DaVinci Design; a dev's own app provides its own icon component).
- State variants: base, `.fill` (selected or active), `.slash` (off), `.badge` (count).

## Swap

A project overrides this by setting `foundations.iconSet` in the target profile (for example Material Symbols, lucide, or a custom set) and providing its own renderer. The rules in `foundations/icons.md` (semantic naming, size-by-role, color hierarchy, hit target) apply to any icon set.
