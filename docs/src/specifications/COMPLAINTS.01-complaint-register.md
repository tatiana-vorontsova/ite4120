# COMPLAINTS.01 · Complaint register

> **COMPLAINTS.01** · state **Confirmed** · traces from [COMPLAINTS-US-001](../user-stories/COMPLAINTS-US-001.md)
> · source `backend/src/main/java/ee/taltech/ite4120/complaints/`, `backend/src/main/resources/complaints/db/changelog/`, `frontend/src/pages/`

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
| `POST /api/complaints` | register; answers **201 + Location** | 400 validation · 409 duplicate case number |
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

## UI  *(→ session 4)*

| Screen | Element | Component | Rules |
| --- | --- | --- | --- |
| Complaint list | table | `ResourceList` | columns: case number (locked, **a link to the complaint's page**), subject, decision type tag, decision date, decision reference (hidden by default); search field; row detail panel |
| | decision type filter | `Select` in `ResourceList`'s filter card | options from `/decision-types`; narrows the list when applied with Apply |
| | register button | `AppButtonPrimary` | navigates to the form |
| | detail panel | `ResourceList.detailView` | shows complainant name/address fetched via `/complainant`; on 404 a muted "not found in the population registry", on 502 a muted "population registry unavailable — complaint is unaffected" |
| Complaint page `/complaints/{id}` | view / edit | `ResourceForm` + `useDataController` | sections Identity (case number read-only, subject, decision type) and Contested decision (decision date, decision reference, complainant code); Edit → Save is `PUT`, Cancel restores; Withdraw is the soft `DELETE` with confirmation; Back to the list; decision date is a `custom` field (`DateField`, as in `AnimalDetail`) — the built-in `date` field crashes the picker |
| | complainant | `ResourceForm` field, view mode | the personal code plus name and address via `/complainant`; on 404 / 502 the same muted notes as the detail panel instead of the name — the page never depends on the registry |
| | metadata | `ResourceForm.sidebar` — `AppCard` of `FieldItem`s | created at / by, modified at / by, version — the platform `sys*` columns, read-only |
| Register form | case number | `Input` | required, ≤50 |
| | subject | `Input` | required, ≤255 |
| | decision type | `Select` | required, options from `/decision-types` |
| | decision date | `DatePicker` | required |
| | complainant code | `Input` | required, pattern `\d{11}` |
| | decision reference | `Input` | ≤50 |
| | submit | `AppButtonPrimary` | 400/409 problem text shown verbatim in a notification |

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
