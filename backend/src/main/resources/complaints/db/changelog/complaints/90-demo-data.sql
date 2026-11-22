--liquibase formatted sql

--changeset ite4120:complaints-90-demo-data context:demo
--comment Demo rows for local development
/* Applied only when the Liquibase context includes `demo`. Three
   complainant codes match the imitated population registry
   (MockOwnerRegistryController), so the complainant lookup works out of the
   box; the fourth, 60101010007, is deliberately unknown to it, to show the
   "not found in the population registry" answer. */
insert into complaints.complaint (case_number, subject, decision_type_code, decision_date, complainant_isikukood, decision_reference) values
    ('CMP-2026-0001', 'Child benefit refused without explanation',   'BENEFIT',    '2026-09-14', '38102130265', 'SKA-2026-118842'),
    ('CMP-2026-0002', 'Income tax assessment counts a sale twice',   'TAX',        '2026-10-02', '47503121234', 'EMTA-2026-55107'),
    ('CMP-2026-0003', 'Building permit rejected by automated check', 'PERMIT',     '2026-08-21', '50011020017', null),
    ('CMP-2026-0004', 'Fraud risk score blocks account access',      'RISK_SCORE', '2026-11-03', '60101010007', null);

insert into complaints.handling_step (complaint_id, step_type, performed_on, note)
select c.id, s.step_type, s.performed_on::date, s.note
from complaints.complaint c
join (values
    ('CMP-2026-0001', 'RECEIVED',     '2026-09-20', null),
    ('CMP-2026-0001', 'ASSIGNED',     '2026-09-22', 'Benefits review team'),
    ('CMP-2026-0001', 'HUMAN_REVIEW', '2026-10-05', 'Decision re-examined by an officer'),
    ('CMP-2026-0002', 'RECEIVED',     '2026-10-06', null),
    ('CMP-2026-0004', 'RECEIVED',     '2026-11-04', null)
) as s(case_number, step_type, performed_on, note)
  on s.case_number = c.case_number;
--
