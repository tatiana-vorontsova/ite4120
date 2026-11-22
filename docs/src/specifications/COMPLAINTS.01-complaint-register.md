# COMPLAINTS.01 · Complaint register

> **COMPLAINTS.01** · state **Implemented** · traces from [COMPLAINTS-US-001](../user-stories/COMPLAINTS-US-001.md)
> · source `backend/src/main/java/ee/taltech/ite4120/complaints/`, `backend/src/main/resources/complaints/db/changelog/`, `frontend/src/pages/`, `frontend/src/api.ts`, `frontend/src/App.tsx`

## Description

A register of complaints against automated decisions: register, search, view,
update, withdraw (soft delete). Each complaint names the contested decision by
type, date and optional reference. The complainant's identity is held as a
personal code only; name and address are resolved live from the population
registry through the complainant-registry adapter (mock in this course,
X-Road-shaped in production).

Excluded: the handling workflow and any status of a complaint (the
`handling_step` table is created and seeded, but has no API and no screen yet),
the outcome of the review, notifications, checksum validation of the personal
code (only its shape is checked), authentication management (mock auth only),
multi-tenancy, audit beyond the platform sys columns.

## Data model  *(→ session 2, changesets 01–03)*

| Table | Field | Type | Rules |
| --- | --- | --- | --- |
| `complaints.decision_type` | `code` PK | text | reference list: BENEFIT, TAX, PERMIT, RISK_SCORE |
| | `name` | text | display name |
| `complaints.complaint` | `id` PK | bigint | from `core.seq_id` |
| | `case_number` | text | required, ≤50; **unique among active rows**; immutable after creation |
| | `subject` | text | required, ≤255 — one line: what is contested |
| | `decision_type_code` | text | required; FK → decision_type |
| | `decision_date` | date | required; **not in the future** |
| | `complainant_isikukood` | text | **required**; exactly 11 digits — a string, never a number |
| | `decision_reference` | text | optional, ≤50 — the contested decision's own number |
| | `sys_*` | — | platform columns, trigger-managed |
| `complaints.handling_step` | `id` PK | bigint | from `core.seq_id` |
| | `complaint_id` | bigint | required; FK → complaint |
| | `step_type` | text | required; one of RECEIVED, ASSIGNED, HUMAN_REVIEW, CLOSED — enforced by a `check` constraint, since no API validates it |
| | `performed_on` | date | required |
| | `note` | text | optional |
| | `sys_*` | — | platform columns, trigger-managed |

Three tables, two foreign keys. The decision types are seeded by changeset 01
in every environment; only sample complaints and handling steps are demo rows,
under `context:demo`. Nothing the population registry owns (name, address) is
stored.

## API  *(→ session 3)*

| Method + path | Does | Failure answers |
| --- | --- | --- |
| `GET /api/complaints` | paged search: `textContains` (subject or case number), `decisionTypeCode`, `limit`, `offset`, `sort` (`subject`, `caseNumber`, `decisionDate`) | 400 unknown sort key |
| `GET /api/complaints/{id}` | one active complaint | 404 |
| `POST /api/complaints` | register; answers **201 + Location** | 400 validation · 409 duplicate case number (also when two registrations race — the unique index decides, never a 500) |
| `PUT /api/complaints/{id}` | update; case number immutable — a different one in the body is refused, not ignored | 400 validation · 400 "caseNumber cannot be changed" · 404 |
| `DELETE /api/complaints/{id}` | withdraw (soft) — **204** | 404 |
| `GET /api/complaints/{id}/complainant` | complainant via the registry adapter | 404 complaint not found · 404 "complainant not found in the population registry" · 502 registry down |
| `GET /api/complaints/decision-types` | the reference list | — |

Every error is `application/problem+json`. All endpoints require
`Authorization: Bearer <user>` (mock auth); the API contract is live at
`/swagger-ui.html`.

Validation in three places: request shape (Bean Validation on the request
body), rules about the message in the service (unknown decision type, decision
date in the future), constraints in the database (foreign key, 11-digit check,
unique index among active rows).

**Failure policy** for the complainant lookup: **fail open** — an unreachable
registry answers 502 on the complainant endpoint only; registering, reading,
updating and withdrawing complaints do not call the registry and keep working.
Rationale: a complaint is a person's way to contest a decision; refusing to
register it because a registry is down would turn an infrastructure outage into
a denial of redress. The name and address are needed later, to answer the
complainant — not as a precondition for accepting the complaint. A personal
code the registry does not know is a miss, not a failure: it answers 404 with
its own `detail`, never 502, and never an empty 200.

The registry is reached at `complaints.complainant-registry.url` — locally the
imitated registry the animals example serves. The adapter's four outcomes
(mapped, miss, fault, unreachable) are covered by
`HttpComplainantRegistryAdapterTest`. To see the policy at work, start the
backend with `COMPLAINTS_COMPLAINANTREGISTRY_URL` pointing at a closed port:
`/complainant` answers 502, every other endpoint works.

## UI  *(→ session 4)*

**Theme: TEDI** (`VITE_THEME=tedi` in `frontend/.env`), the design system of TEHIK for the Estonian
public sector, built into `@helex/ui`. A register of complaints against public-sector decisions is a
public-sector service, so it takes the public sector's visual language: Roboto, the TEDI blue as brand
colour, semantic success / warning / error / info colours, larger controls. The theme is global — the
animals example takes it too. Every colour on the complaint screens comes from the theme through a
component prop (`AppTag color`, `AppBadge status`, `AppAlert type`, `AppTypography.Text type`); no hex
codes. `main.tsx` changes in one line only, the tab title (below).

| Screen | Element | Component | Rules |
| --- | --- | --- | --- |
| All | navigation | `AppNavMenu` (horizontal) inside `AppLayout`, in `App.tsx` | entries Complaints (first; `/` opens it) and Animals (the course's worked example, kept beside it for comparison); the active one follows the first path segment, so a record page keeps its register highlighted |
| | browser tab title | `AppRoot` `appName` in `main.tsx`, and `<title>` in `index.html` | "ITE4120 Registers" — neutral for both registers. The one line of `main.tsx` this component changes |
| Complaint list | heading | `ResourceList` `title` with `AppTypography.Text type="secondary"` | "Complaints", and under it one line: the count of active complaints ("· matching" when searched or filtered), then what the register is. The count leads, so a narrow header trims the description, not the number |
| | table | `ResourceList` | columns: case number (locked, **a link to the complaint's page**), subject, decision type tag, decision date, decision reference (hidden by default); newest decision date first; search field; row detail panel (the list's details toggle) |
| | decision type tag | `AppTag` with `color` | one theme colour per type: PERMIT `processing` (brand), BENEFIT `success`, TAX `warning`, RISK_SCORE `error`; an unknown code `default`. Only antd's status colours are theme tokens — the named presets (`blue`, `cyan`…) are antd's generic palette and are not used. Same tag on the list, the detail panel and the page header |
| | decision type filter | `Select` in `ResourceList`'s filter card | options from `/decision-types`; narrows the list when applied with Apply |
| | register button | `AppButtonPrimary` | navigates to the form |
| | detail panel | `ResourceList.detailView` | the complainant's name and address via `/complainant`; otherwise an `AppBadge` with the registry outcome (below) |
| Complaint page `/complaints/{id}` | view / edit | `ResourceForm` + `useDataController` | sections Identity (case number read-only, subject, decision type) and Contested decision (decision date, decision reference, complainant code); Edit → Save is `PUT`, Cancel restores; Withdraw is the soft `DELETE` with confirmation; Back to the list; decision date is a `custom` field (`DateField`, as in `AnimalDetail`) — the built-in `date` field crashes the picker |
| | complainant | `AppCard` in `ResourceForm.sidebar`, above the metadata | its own card: an `AppBadge` with the registry outcome, then `FieldItem`s — personal code, and when found, name and address ("looked up live — never stored"). Found: `success` "Found in the population registry". 404: `warning` "Not found in the population registry" and a warning `AppAlert` to check the code with the complainant. 502: `default` "Population registry unavailable" and an info `AppAlert` that the complaint is unaffected — fail open, readable; the page never waits for the card |
| | metadata | `ResourceForm.sidebar` — `AppCard` of `FieldItem`s | created at / by, modified at / by, version — the platform `sys*` columns, read-only |
| Register form `/complaints/new` | form | `ResourceForm` in `create` mode | **the same two sections as the complaint page** (shared definition, `complaintUi.tsx`), so registering and reading look alike; Register and Cancel in the header; field hints as tooltips |
| | fields | as on the page | case number required, ≤50 (editable here); subject required, ≤255; decision type required; decision date required; complainant code required, pattern `\d{11}`; decision reference ≤50 |
| | decision date | `DateField` with future dates allowed | on purpose — the rule is the backend's (business test 1) and its 400 is shown verbatim. On the complaint page the `DateField` does not offer future dates, as in `AnimalDetail`; the backend checks either way |
| | submit | `ResourceForm` save | 400/409 problem text shown verbatim in a notification |

Out of scope here, deliberately: the handling steps on screen (data only, see Excluded), any new
endpoint.

## Business tests  *(→ executable in `ComplaintBusinessRulesIT`)*

1. **A complaint cannot contest a decision dated in the future.**
   Given a request whose contested decision is dated tomorrow, when the
   complaint is registered, then the registration is refused with
   "decisionDate must not be in the future".
2. **A case number is unique among active complaints.**
   Given an active complaint with case number X, when a second complaint claims
   X, then the registration conflicts (409). And when the first is withdrawn,
   case number X may be used again — withdrawal is a soft delete.
3. **A case number never changes.**
   Given an active complaint with case number X, when it is updated with case
   number Y, then the update is refused (400) with "caseNumber cannot be
   changed", and the complaint still carries case number X.
