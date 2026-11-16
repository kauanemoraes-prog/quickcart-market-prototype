# DaVinci Core: Contract Schema

The format every component contract follows. A contract is the **stack-agnostic** structure, behavior, accessibility, and UX specification of a component, with **look-and-feel excluded** (owned by each tool's design system). This file defines the *format*; the contracts themselves live in each design-system pack (see below), where both DaVinci Design and DaVinci Dev read them.

Format: YAML, one file per component. Contracts are **authored in the design system's source** (for the bundled pack: `src/monalisa-design-system/contracts/<component>.contract.yaml`) and shipped, via the build, inside each design-system pack at `contracts/<component>.contract.yaml` — where consumers (DaVinci Design and Dev) resolve them. See `design-system.schema.md` for the pack shape.

## Fields

- `component` (string, required): stable kebab-case id, matching the source design-system component.
- `summary` (string, required): one line on what the component is for.
- `anatomy` (list, required): the structural parts. Each entry:
  - `id` (kebab), `required` (bool or a condition string like `"if rows > pageSize"`), `multiple` (bool, default false), `role` (what the part is for), `capabilities` (list of behaviors this part carries — see below).
  - `capabilities` names the behaviors a part *carries when present*; it is **not** an opt-in switch. Whether the part (and its capabilities) is present is governed solely by the part's `required` value and `role`, never inferred from the mere presence of a `capabilities` list. A `required: true` part ships with its listed capabilities by default; consumers do not "enable" them. If a capability is genuinely optional per instance, express that with a separate conditionally-`required` part (`required: "if …"`) or a `semantics` variant — do not leave it implicit in `capabilities`.
- `states` (list, required): states the component must be able to represent (e.g. `default`, `hover`, `focus`, `disabled`, `loading`, `empty`, `error`, `selected`). Mark optional states with a trailing `?`.
- `behaviors` (map, optional): behavior name → one-line description of the required interaction.
- `a11y` (list, required): accessibility requirements (semantic roles, ARIA, label associations, keyboard operation, focus management).
- `heuristics` (list, optional): enforceable UX clauses. Each: `id`, `source` (`nielsen` | `apple-hig` | `wcag`), `rule`, `verify` (list of dimensions: `checklist` | `dom` | `visual`). Platform-specific thresholds use `"{profile.platform.*}"` placeholders.
- `semantics` (list, optional): meaning-bearing variants that are **structural, not visual** (e.g. a destructive vs primary action, a required field). Never colors or sizes.
- `excludes` (list, required): what the contract deliberately delegates to the design system (class names, tokens, spacing, color, typography, borders, animation). Always present.
- `origin` (string, optional): `baseline` for a contract shipped in a pack (the default when absent), `project` for one written in a workspace for the product's own anatomy.
- `derived_from` (string, optional): for a `project` contract, the product source path the anatomy was read from.

## Project contracts

In reference mode a workspace can write its own contracts in `.davinci/design-reference/contracts/<component>.contract.yaml`, following this schema with `origin: project`. Write one only when the product's anatomy or states differ from the baseline contract, or no baseline contract exists; a visual difference never justifies one, since visuals are in `excludes`. `design-system.sh reference` assembles them into the pack, where a project contract replaces the baseline contract of the same name.

## Authoring rules

- Structure and behavior only. If a property is purely visual, it goes in `excludes`, not the contract.
- Capture semantic variants (roles), never visual variants (styles).
- Every interactive part needs an `a11y` entry.
- Heuristic thresholds that vary by platform are parameterized via the target profile, never hard-coded.
- Keep part and state names consistent across contracts so guidance reads uniformly.

## Worked snippet (modal)

```yaml
component: modal
summary: "A focused overlay that interrupts the flow for a single task or decision."
anatomy:
  - {id: overlay,  required: true,  role: "backdrop that traps interaction beneath it"}
  - {id: header,   required: true,  role: "title and close affordance"}
  - {id: close,    required: true,  role: "dismiss control", capabilities: [dismiss]}
  - {id: body,     required: true,  role: "the task content"}
  - {id: footer,   required: false, role: "primary and secondary actions"}
states: [default, open, closing?]
behaviors:
  open:    "renders over the page and moves focus into the dialog"
  dismiss: "closes on close control, Esc, and backdrop click; restores focus to the trigger"
a11y:
  - "role=dialog with aria-modal=true"
  - "labelled by the header title (aria-labelledby)"
  - "focus is trapped while open and returned to the trigger on close"
heuristics:
  - {id: user-control, source: nielsen,   rule: "always provide an obvious way to dismiss", verify: [dom]}
  - {id: hit-target,   source: apple-hig, rule: "close control meets the platform minimum hit target", threshold: "{profile.platform.minHitTarget}", verify: [dom]}
excludes: [class names, tokens, spacing, color, typography, borders, animation]
```
