--liquibase formatted sql

--changeset ite4120:complaints-03-handling-step
--comment Handling step child table
/* One row per handling event of a complaint, FK to the complaint. With
   decision_type and complaint this makes three tables and two foreign keys,
   the data-layer minimum. Data only: no API and no screen yet (spec
   COMPLAINTS.01). Because no API validates step_type, the database does:
   the check constraint is the only guard the value has. */
create table complaints.handling_step (
    id                  bigint default nextval('core.seq_id') not null,
    complaint_id        bigint not null,
    step_type           text not null,
    performed_on        date not null,
    note                text,
    sys_status          char(1),
    sys_version         int,
    sys_created_at      timestamptz,
    sys_created_by      text,
    sys_modified_at     timestamptz,
    sys_modified_by     text,
    constraint handling_step_pk primary key (id),
    constraint handling_step_complaint_fk foreign key (complaint_id) references complaints.complaint (id),
    constraint handling_step_type_chk check (step_type in ('RECEIVED', 'ASSIGNED', 'HUMAN_REVIEW', 'CLOSED'))
);

select core.create_table_metadata('complaints.handling_step');

create index handling_step_complaint_idx on complaints.handling_step (complaint_id) where (sys_status = 'A');
--
