--liquibase formatted sql

--changeset ite4120:complaints-02-complaint
--comment The main business table of the complaints register
/* Platform idioms, as in animals.animal:
   - id from the SHARED sequence core.seq_id;
   - sys_* columns declared here, FILLED by the core.sys_columns() trigger,
     which core.create_table_metadata() installs, never by application code;
   - soft delete: a withdrawn complaint is not removed, sys_status goes A -> C;
   - case_number and complainant_isikukood are TEXT: identifiers, not numbers.
   The complainant is required (decision of 14 Nov), so unlike the animal's
   owner code the check has no "is null or" branch. The rule "decision date
   not in the future" depends on today's date and lives in the service. */
create table complaints.complaint (
    id                  bigint default nextval('core.seq_id') not null,
    case_number         text not null,
    subject             text not null,
    decision_type_code  text not null,
    decision_date       date not null,
    complainant_isikukood text not null,
    decision_reference  text,
    sys_status          char(1),
    sys_version         int,
    sys_created_at      timestamptz,
    sys_created_by      text,
    sys_modified_at     timestamptz,
    sys_modified_by     text,
    constraint complaint_pk primary key (id),
    constraint complaint_decision_type_fk foreign key (decision_type_code) references complaints.decision_type (code),
    constraint complaint_isikukood_chk check (complainant_isikukood ~ '^[0-9]{11}$')
);

select core.create_table_metadata('complaints.complaint');

/* Unique among ACTIVE rows only: a withdrawn complaint's case number may be
   reused (business test 2). */
create unique index complaint_case_number_ukey
    on complaints.complaint (case_number) where (sys_status = 'A');

create index complaint_decision_type_idx on complaints.complaint (decision_type_code) where (sys_status = 'A');
--
