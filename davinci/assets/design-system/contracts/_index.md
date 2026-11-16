# MonalisaDS: Contract Index

Registry of this pack's component contracts. DaVinci Design and Dev resolve components
against this index for the active pack. Structure lives here; look-and-feel is realized
by the pack's `components/` (Design) and delegated via each contract's `excludes`.

Contracts follow `contract.schema.md` (DaVinci Core). Concrete token values live in this
pack's `tokens/`; the agnostic semantic-role vocabulary lives in Core's `foundations/*.md`.

| Component | Contract | Status |
| --- | --- | --- |
| avatars | `avatars.contract.yaml` | ready |
| badge-counter | `badge-counter.contract.yaml` | ready |
| breadcrumb | `breadcrumb.contract.yaml` | ready |
| buttons | `buttons.contract.yaml` | ready |
| cards | `cards.contract.yaml` | ready |
| drawer | `drawer.contract.yaml` | ready |
| empty-state | `empty-state.contract.yaml` | ready |
| forms-checkbox | `forms-checkbox.contract.yaml` | ready |
| forms-input | `forms-input.contract.yaml` | ready |
| forms-radio | `forms-radio.contract.yaml` | ready |
| forms-select | `forms-select.contract.yaml` | ready |
| forms-switch | `forms-switch.contract.yaml` | ready |
| forms-textarea | `forms-textarea.contract.yaml` | ready |
| links | `links.contract.yaml` | ready |
| loaders | `loaders.contract.yaml` | ready |
| modal | `modal.contract.yaml` | ready |
| navigation | `navigation.contract.yaml` | ready |
| notifications | `notifications.contract.yaml` | ready |
| pagination | `pagination.contract.yaml` | ready |
| pills | `pills.contract.yaml` | ready |
| popover | `popover.contract.yaml` | ready |
| selection-list | `selection-list.contract.yaml` | ready |
| table | `table.contract.yaml` | ready |
| tabs | `tabs.contract.yaml` | ready |
| tags | `tags.contract.yaml` | ready |

25 contracts. `ready` = authored and validated. When resolving an intent to a component,
match against this list; if a request names a component not in this pack, offer the closest
match rather than inventing a contract.
