# core

DaVinci prototype workspace. This file holds **project** context only: what this workspace is for
and the conventions specific to it.

DaVinci's own rules (how to build a prototype, canvas architecture, component usage, icons,
impersonation, workspace plugins) live in the DaVinci plugin's skills and load on demand. Do not
paste framework instructions back into this file: they would go stale the moment the plugin updates,
and they override nothing.

## What this workspace is

<!-- One or two lines: which product/area these prototypes cover, and who reviews them. -->

## Where things live

- `prototypes/<name>/` — one folder per prototype. Each has `index.html`, `css/`, `js/`, `maps/`,
  and a `PROTOTYPE.md` router.
- `.davinci/` — the DaVinci runtime, owned by the plugin. Read-only except for `plugins/`,
  `files/`, `.overrides/`, `design-reference/`, `davinci-users.json`, and
  `canvas-navigation-data.json`. Never hand-edit `.davinci/assets/` — it is replaced on every
  plugin top-up.
- `.davinci/plugins/` — workspace plugin components: project-specific reusable UI that supplements
  the design system.
- `canvas-navigation-data.json` (in `.davinci/`) — workspace navigation.

## Design system

Active pack: **monalisa** (recorded in `.davinci/config.json`, materialized at
`.davinci/assets/design-system/`). Verify tokens against that pack's `tokens/` and the Core
foundations in `.davinci/assets/core/foundations/` before writing any `var(--…)`. If the pack reads
`none`, this workspace deliberately has no design system: DaVinci guides and validates only, and
there are no pack tokens to verify against. If it reads `reference`, the design system is **derived
from this project's own design** and authored under `.davinci/design-reference/`: read
`REFERENCE.md` there for the look-and-feel, and remember that an edit under that folder only reaches
the canvas once `design-system.sh reference` re-assembles the pack.

`.davinci/config.json` also holds the Canvas chrome config under a `canvas` key (ribbon and footer:
visibility, collapse tab, colors, message, footer regions). Reference:
`.davinci/assets/canvas/CANVAS-CONFIG.md`.

## Prototypes

- `prototypes/Smart-Import-bkp/`
- `prototypes/components/`
- `prototypes/design-manager-mapping/`
- `prototypes/equipment-list-tab/`
- `prototypes/equipment-vendor/`
- `prototypes/help-landing-page/`
- `prototypes/program-index/`
- `prototypes/programs/`
- `prototypes/settings/`
- `prototypes/smart-import/`
- `prototypes/station-branch/`

## Project conventions

<!-- Domain glossary, naming rules, roles used for impersonation, data shapes, review process,
     anything a newcomer to THIS project needs and cannot infer from the code. -->
