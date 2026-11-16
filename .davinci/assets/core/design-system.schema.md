# DaVinci Core: Design-System Pack Schema

The format every **design-system pack** follows. A pack is a self-contained, swappable
unit that supplies a concrete look-and-feel (and, per DaVinci's model, its own component
**contracts**) for a workspace to prototype or develop against. Core does not hold the
packs; it holds this schema (the shape every pack must obey) plus the agnostic foundation
**vocabulary** (`foundations/*.md`), and it **resolves** consumers to the selected pack.

Packs are **structurally identical** so tooling always knows where to look. A pack that
conforms to this schema is a "DaVinci-compatible design system."

## Pack layout

```
design-systems/<id>/
├── design-system.json     # manifest (required — see below)
├── contracts/             # component contracts for THIS pack (see contract.schema.md)
│   ├── _index.md          # contract registry (same format as Core's legacy _index.md)
│   └── <component>.contract.yaml
├── tokens/                # concrete foundation VALUES for this pack
│   ├── colors.md
│   ├── typography.md
│   ├── spacing.md
│   └── icons.md
├── components/            # stylized component HTML docs ("use as-is" markup, METADATA headers)
│   ├── _component-index.md
│   └── <component>.html
└── dist/                  # compiled runtime bundle for the live prototype
    ├── css/<bundle>.css
    └── js/<bundle>.js
```

`<id>` is a stable, lowercase-kebab identifier (the config key and directory name).

## Manifest (`design-system.json`)

- `id` (string, required): the pack id; matches the directory name and the `.davinci/config.json` value.
- `label` (string, required): user-facing name shown in the picker (e.g. `MonalisaDS`).
- `description` (string, required): one line shown beside the label in the picker.
- `runtime` (object, required): `{ "css": "<path>", "js": "<path>" }` — pack-relative paths to the compiled bundle the canvas loads. Filenames are arbitrary (the canvas reads them from here, never hardcoded), but **by convention name the bundle agnostically** (e.g. `dist/css/design-system.min.css`) so it never carries the design system's own name.
- `contracts` (string, required): pack-relative path to the contract registry (`contracts/_index.md`).
- `components` (string, required): pack-relative path to the component registry (`components/_component-index.md`).
- `tokens` (string, required): pack-relative path to the tokens directory.

```json
{
  "id": "monalisa",
  "label": "MonalisaDS",
  "description": "Apple-inspired system — the DaVinci default look.",
  "runtime": { "css": "dist/css/design-system.min.css", "js": "dist/js/design-system.min.js" },
  "contracts": "contracts/_index.md",
  "components": "components/_component-index.md",
  "tokens": "tokens/"
}
```

## What each directory holds

- **`contracts/`** — one `<component>.contract.yaml` per component, each following `contract.schema.md` (stack-agnostic structure/behavior/a11y/UX, look-and-feel `excludes`). Different packs may declare different components and different anatomies; the *format* is fixed, the *content* is the pack's own. `_index.md` lists them (same table format Core used).
- **`tokens/`** — the concrete VALUES (hex, type ramp, spacing scale, icon set + CSS variable names) that fill the semantic roles Core defines in `foundations/*.md`. Every role named in the foundation vocabulary must have a value here.
- **`components/`** — the stylized HTML docs Design copies as-is (each with its METADATA header). These are the look-and-feel realization of the contracts.
- **`dist/`** — the compiled CSS/JS the canvas auto-loads at runtime. Built from the pack's own source; the manifest names the entry points.

## Consumer split

| Consumer | Reads from the active pack |
|---|---|
| DaVinci Design | `contracts` + `tokens` + `components` + `dist` (builds real, styled prototypes) |
| DaVinci Dev | `contracts` + `tokens` only (stack-agnostic guidance; never the as-is HTML or runtime) |

## Resolution order

A consumer resolves each kind (`contracts`, `tokens`, `components`) in this order:

```
.davinci/.overrides/<kind>/          # user additions/overrides (post-MVP content; the hook exists now)
  → .davinci/assets/design-system/<kind>/   # the active pack, materialized into the workspace
    → (Core: this schema + foundations/*.md, for validation only)
```

The active pack is named in `.davinci/config.json` (`{ "designSystem": "<id>" }`) and is
copied into `.davinci/assets/design-system/` on first selection. Two ids are reserved and name no
pack in `design-systems/`: `none` means the workspace has no pack at all (guidance and validation
only), and `reference` means the pack is **generated in the workspace** rather than shipped (see
below). The file also holds the Canvas chrome
config under `canvas`, so writers must preserve keys they do not own. Core’s `foundations/*.md`
are never a value source — they define the roles a pack’s `tokens/` must satisfy.

## Workspace-generated packs

A conformant pack does not have to ship in a marketplace. When a workspace prototypes against the
user's **own** design, `davinci-design/scripts/design-system.sh reference <ws>` assembles a pack at
`.davinci/assets/design-system/` from `.davinci/design-reference/` — the user's artifacts and the
tokens, `styles.css`, component docs and behaviours derived from them — and borrows the
`contracts/` of a named base pack, overlaid with any project contracts the workspace wrote (see
`contract.schema.md` → Project contracts). Borrowing is sound precisely because a contract is
structure-only (`excludes` lists class names, tokens, spacing, color, typography), so the same
anatomy, states, a11y and heuristic clauses hold whatever the look is.

Such a pack obeys every rule below and is indistinguishable to consumers, with two caveats worth
knowing: its `components/` starts nearly empty and grows as prototypes need components (so the
"missing component doc is a gap to flag" rule below is the normal state, not a defect), and its
`dist/js/` holds only the behaviour of components built so far, assembled from
`.davinci/design-reference/behaviors/`.

## Conformance rules

- A pack MUST provide the manifest and all directories its consumers read (Design needs all four; a Dev-only pack may omit `components/` and `dist/`).
- Every contract in `contracts/` MUST follow `contract.schema.md`.
- `tokens/` MUST supply a value for every semantic role named in Core’s `foundations/*.md`.
- Every component named in a contract SHOULD have a matching `components/<component>.html` (for Design) — a missing one is a gap to flag, not a reason to invent markup.
- `id` MUST be consistent across the directory name, the manifest, and any config reference.
- Packs are read-only in the workspace; users extend via `.davinci/.overrides/`, never by editing the materialized pack.
