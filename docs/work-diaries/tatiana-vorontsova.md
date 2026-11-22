# Work diary — Tatiana Vorontsova

Component: COMPLAINTS — register of complaints against automated decisions.
Working alone. AI agent: Claude.

## 14 November 2026

Time spent: __ h

**Work completed**

- Chose the domain: a register of complaints against automated decisions.
- Compiled the requirements from the assessment criteria and the three
  manuals in the template, and split the work into stages, one pull request each.
- Took four design decisions before any specification text was written:
  complainant is required; registry failure policy is fail open; handling
  steps stay data-only (like `vaccination` in the example), no status; two
  business tests — decision date not in the future, case number unique among
  active complaints.

**What I asked the agent**

- To check the lecturer's repository and course materials for anything new.
- To list what the deliverable must contain and propose a plan.
- To draft the user story and the specification from my four decisions.

**What the agent got wrong, and how it was corrected**

- Earlier it had told me the minimum was "two API operations and one view".
  Re-reading the assessment criteria ("at least at the minimum scope described
  in the course materials") against the manuals' *Required minimum* tables
  showed the real bar is higher: full CRUD, three screens, demo data, soft
  delete. The plan was rebuilt on that.
- My local clone of the template was eight commits behind upstream; the fork
  is made from the current upstream instead.

**Open**

- Review the drafted user story and specification line by line before
  confirming them — especially the failure-policy rationale and the legal
  reference in the story's Context.

## 22 November 2026

Time spent: __ h

**Work completed**

- Ran the worked example live for the first time (`run-backend` +
  `run-frontend`): the animals list, a record page, and the owner's name and
  address arriving through the registry adapter mock.
- Reviewed the user story and the specification section by section against
  the animals example, the manuals' *Required minimum* tables and the
  example's actual code; took twelve decisions (below) and confirmed both
  documents. State: Proposed → Confirmed.
- Added both documents to `docs/src/SUMMARY.md`.

**Decisions taken in the review**

- User story: a sixth acceptance criterion — a complaint can be corrected
  (except its case number) and withdrawn; personal-code checksum validation
  declared out of scope (only the 11-digit shape is checked) — in the
  specification's exclusions too.
- Data model: decision types are seeded by changeset 01 in every environment,
  only sample complaints and handling steps are demo rows; `handling_step`
  fields made explicit, `step_type` restricted by a `check` constraint because
  no API validates it.
- API: a `PUT` carrying a different case number is refused with 400, not
  silently ignored as in the example; a personal code the registry does not
  know answers 404 with its own message, not an empty 200.
- UI: the decision-type filter specified as in the example (filter card,
  Apply); the record page uses the custom `DateField` (known pitfall); the
  complainant panel shows a muted note on 404 and on 502 instead of hiding
  silently, so fail open is visible.
- Business tests: a third one — a case number never changes — because the new
  rule from the API review must be executable too. This changes my decision of
  14 November ("two business tests").
- Section headings carry the course-session annotations, as the example does.

**What I asked the agent**

- To start the example and show it to me in the browser.
- To walk me through the user story and specification one section at a time,
  comparing each with the example, and to propose concrete fixes for me to
  accept or reject.

**What the agent got wrong, and how it was corrected**

- The drafts the agent wrote on 14 November had gaps that the review found:
  no acceptance criterion behind the update and withdraw endpoints; reference
  data and demo data not told apart; `handling_step` rules lumped into one
  line; two behaviours left unspecified (a changed case number on update, a
  person unknown to the registry); the session annotations of the example's
  headings missing; the known `date`-field crash not planned for. Each was
  fixed in the documents before confirming them.
- The draft copied "case number immutable" from the example without checking
  what the example does — it silently ignores the change. Found by reading
  `AnimalService`, not the example's specification.

**Open**

- The legal reference in the story's Context (GDPR Art. 22(3)) is still not
  checked against the source text.
- Stage 1 pull request opened in my fork (#1); Verify running.

### Stage 2 — data layer (22 November)

**Work completed**

- Schema `complaints` and changesets 01 `decision_type` (with its seed, no
  context), 02 `complaint`, 03 `handling_step`, 90 demo data under
  `context:demo`; the component's `changelog.xml` and one `<include>` in the
  master changelog. Same shape as the animals files, line for line.
- Demo complaints use the three people the imitated registry knows, plus one
  code (60101010007) it does not know, to show the "not found" answer later.
- Checked: `scripts/check-changesets` clean; `./gradlew test` green, with
  every complaints changeset applied to an empty database by Testcontainers;
  the backend restarted on the local database, rows present, `sys_*` filled by
  the trigger. In a rolled-back transaction the database refused a duplicate
  active case number, a 10-digit personal code, a missing complainant, an
  unknown decision type and an unknown step type, and accepted a withdrawn
  complaint's case number again.

**What I asked the agent**

- To build the data layer from the confirmed specification and show me the
  constraints working, not just the tests passing.

**What the agent got wrong, and how it was corrected**

- Nothing in this stage needed correcting. One thing caught before it went
  wrong: the column `complainant_isikukood` is longer than the 20-character
  alignment width, so the agent read the checker's rule first instead of
  guessing the padding.
- The branch starts from `spec/complaints`, not `main`, because PR #1 is not
  merged yet and both touch this diary.
