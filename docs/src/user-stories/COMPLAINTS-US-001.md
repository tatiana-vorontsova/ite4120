# COMPLAINTS-US-001 · Register and look up complaints against automated decisions

> **COMPLAINTS-US-001** · state **Implemented** · traces to [COMPLAINTS.01](../specifications/COMPLAINTS.01-complaint-register.md)

**As** a complaints officer of a public authority
**I want** a register of complaints lodged against automated decisions, each with
the contested decision and the person who lodged it
**so that** I can answer, for any complaint, which decision is contested and who
contests it — and no complaint is lost, or registered twice.

## Context

Public authorities increasingly take decisions by algorithm: benefit
eligibility, tax assessments, permits, risk scores. A person subject to such a
decision is entitled to safeguards, at least human intervention and the right
to contest it: GDPR Art. 22(3) for decisions based on contract or consent; for
decisions authorised by law — how public authorities decide — Art. 22(2)(b)
requires that law to lay down suitable safeguards, and Recital 71 names the
right to challenge the decision among them. The complaint is where that review
begins, so the first duty of the authority is modest and strict: record every
complaint once, under a unique case number, and be able to find it again.

The complainant is **not** stored as free text: the register keeps only the
personal code (isikukood) and asks the population registry — over X-Road in
production, over the imitated registry in this course — whenever a name and
address is needed. One source of truth per fact.

A complaint must be registrable even when the population registry is
unreachable. A redress channel that fails closed turns an infrastructure outage
into a denial of the right to contest.

Out of scope: the handling workflow and status tracking (handling steps exist
in the data model but are not exposed yet), the outcome of the review,
notifications to the complainant, checksum validation of the personal code
(only its shape — exactly 11 digits — is checked), authentication management.

## Acceptance criteria

- A complaint can be registered with a case number, a subject, the type and
  date of the contested decision, the complainant's personal code, and
  optionally the reference of the contested decision.
- A case number identifies exactly one **active** complaint; numbers of
  withdrawn complaints may be reused.
- Obvious nonsense is refused with a clear message: unknown decision type,
  decision date in the future, missing or malformed personal code.
- A complaint can be corrected — except its case number, which never
  changes — and withdrawn; a withdrawn complaint disappears from the list.
- The list is searchable by subject or case number and filterable by decision
  type.
- For any complaint the officer sees the complainant's current name and
  address, fetched live from the registry — never stored locally. When the
  registry is unavailable the complaint stays fully usable.
