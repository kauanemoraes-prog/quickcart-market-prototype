# DaVinci Core: Spec, Vocabulary & Resolver

DaVinci Core is the **stack- and look-agnostic basis**. It no longer holds component
contracts or concrete token values — those now live inside **design-system packs**
(`design-systems/<id>/`), one per design system, resolved per workspace. Core provides
the three things that keep every pack interoperable:

1. **Spec** — the formats every pack must obey:
   - `contract.schema.md` — the component-contract format.
   - `design-system.schema.md` — the pack shape (manifest, `contracts/`, `tokens/`, `components/`, `dist/`), consumer split, resolution order, and conformance rules.
2. **Vocabulary** — the agnostic foundation roles under `foundations/`. These fix *what roles must exist and what they mean*; each pack's `tokens/` supplies the concrete values.
3. **Resolver** — the convention that points consumers at the selected pack (see below).

## Foundations (the agnostic vocabulary)

`foundations/*.md` hold the semantic roles and rules; the concrete values (palettes, sizes,
scales, icon sets) are delegated to each pack's `tokens/`, exactly as component contracts
delegate look-and-feel via `excludes`.

| Foundation | File | Holds | Delegated to the pack's `tokens/` |
| --- | --- | --- | --- |
| Typography | `foundations/typography.md` | semantic type roles, minimum readable size, semantic-HTML rule | font families, sizes, weights, line-heights |
| Color | `foundations/color.md` | semantic color roles, contrast and not-color-alone, one-accent-per-view | the concrete palette and token names |
| Spacing | `foundations/spacing.md` | consistent scale usage, no negative margins, no wrapper padding | the concrete spacing scale values |
| Icons | `foundations/icons.md` | semantic naming, size-by-role, color hierarchy, icon+text spacing, hit target | the icon set and its rendering component |

Because the rules are fixed in Core, both Design and Dev validate against the same
foundation regardless of which pack is active.

## Resolution

A workspace names its active pack in `.davinci/config.json` (`{ "designSystem": "<id>" }`);
the pack is materialized into `.davinci/assets/design-system/`. Two ids are **reserved** and name no
pack in `design-systems/`:

- **`none`** — the workspace deliberately has no pack (guidance and validation only), so nothing is
  materialized.
- **`reference`** — the workspace prototypes against the **user's own design**, derived in-workspace
  from artifacts they supply (a PDF, a screenshot, a path in their codebase) and authored under
  `.davinci/design-reference/`. A conformant pack *is* materialized: `design-system.sh reference`
  assembles it from that folder, borrowing the structure-only contracts of a real base pack. So
  consumers resolve it exactly like any other pack and need no special case; the look-and-feel
  authority is `.davinci/design-reference/REFERENCE.md` instead of curated `components/` docs.

That file is not design-system-only: it also carries the Canvas chrome config under a
`canvas` key, so anything writing to it must preserve the other keys. Consumers resolve each kind
(`contracts`, `tokens`, `components`) as:

```
.davinci/.overrides/<kind>/          # user additions/overrides (post-MVP content; hook exists now)
  → .davinci/assets/design-system/<kind>/   # the active pack
    → (Core: this spec + foundations/*.md, for validation only)
```

Consumer split: **Design** reads `contracts + tokens + components + dist`; **Dev** reads
`contracts + tokens` only (stack-agnostic — never the as-is HTML or runtime).

## Available packs

Packs live at `design-systems/<id>/` in this marketplace and are read from the marketplace
clone at selection time (not bundled into the tool). The picker lists them by reading each
pack's `design-system.json` (`label` + `description`).

| Pack | id | Status |
| --- | --- | --- |
| MonalisaDS | `monalisa` | ready |
