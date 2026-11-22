--liquibase formatted sql

--changeset ite4120:complaints-01-decision-type
--comment Decision type reference table
/* The kinds of automated decision a complaint can contest. Natural-key
   reference data like animals.species: no core.seq_id, no sys columns.
   Compare with 02-complaint.sql, which is a full business table. */
create table complaints.decision_type (
    code                text not null,
    name                text not null,
    constraint decision_type_pk primary key (code)
);
--

--changeset ite4120:complaints-01-decision-type-seed
--comment Seed the decision type reference list
/* Reference data, NOT demo data: no context, so it lands in every
   environment. Its own changeset, separate from the DDL, and convergent —
   ON CONFLICT DO NOTHING is safe on a database that holds some rows already. */
insert into complaints.decision_type (code, name) values
    ('BENEFIT',    'Benefit eligibility'),
    ('TAX',        'Tax assessment'),
    ('PERMIT',     'Permit'),
    ('RISK_SCORE', 'Risk score')
on conflict do nothing;
--
