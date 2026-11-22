--liquibase formatted sql

--changeset ite4120:complaints-schema
--comment Create the complaints schema
/* One schema per component, as in the animals example: the boundary of the
   component in the code is the boundary of its data in the database. */
create schema if not exists complaints;
--
