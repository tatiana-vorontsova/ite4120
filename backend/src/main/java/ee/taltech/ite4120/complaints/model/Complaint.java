package ee.taltech.ite4120.complaints.model;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * One complaint against an automated decision. Maps 1:1 onto
 * {@code complaints.complaint} — see 02-complaint.sql under
 * {@code resources/complaints/db/changelog/complaints/}.
 *
 * <p>The {@code sys*} fields are filled by the shared {@code core.sys_columns()}
 * trigger, never by application code.
 */
public class Complaint {

    private Long id;
    /** Case number, e.g. CMP-2026-0001. Unique among active rows; never changes. */
    private String caseNumber;
    /** One line: what is contested. */
    private String subject;
    /** FK → complaints.decision_type(code). */
    private String decisionTypeCode;
    /** Date of the contested decision; required, not in the future. */
    private LocalDate decisionDate;
    /** Estonian personal code of the complainant. A STRING, never a number. */
    private String complainantIsikukood;
    /** The contested decision's own number; optional. */
    private String decisionReference;

    private String sysStatus;
    private Long sysVersion;
    private OffsetDateTime sysCreatedAt;
    private String sysCreatedBy;
    private OffsetDateTime sysModifiedAt;
    private String sysModifiedBy;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCaseNumber() { return caseNumber; }
    public void setCaseNumber(String caseNumber) { this.caseNumber = caseNumber; }
    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
    public String getDecisionTypeCode() { return decisionTypeCode; }
    public void setDecisionTypeCode(String decisionTypeCode) { this.decisionTypeCode = decisionTypeCode; }
    public LocalDate getDecisionDate() { return decisionDate; }
    public void setDecisionDate(LocalDate decisionDate) { this.decisionDate = decisionDate; }
    public String getComplainantIsikukood() { return complainantIsikukood; }
    public void setComplainantIsikukood(String complainantIsikukood) { this.complainantIsikukood = complainantIsikukood; }
    public String getDecisionReference() { return decisionReference; }
    public void setDecisionReference(String decisionReference) { this.decisionReference = decisionReference; }
    public String getSysStatus() { return sysStatus; }
    public void setSysStatus(String sysStatus) { this.sysStatus = sysStatus; }
    public Long getSysVersion() { return sysVersion; }
    public void setSysVersion(Long sysVersion) { this.sysVersion = sysVersion; }
    public OffsetDateTime getSysCreatedAt() { return sysCreatedAt; }
    public void setSysCreatedAt(OffsetDateTime sysCreatedAt) { this.sysCreatedAt = sysCreatedAt; }
    public OffsetDateTime getSysModifiedAt() { return sysModifiedAt; }
    public void setSysModifiedAt(OffsetDateTime sysModifiedAt) { this.sysModifiedAt = sysModifiedAt; }
    public String getSysCreatedBy() { return sysCreatedBy; }
    public void setSysCreatedBy(String sysCreatedBy) { this.sysCreatedBy = sysCreatedBy; }
    public String getSysModifiedBy() { return sysModifiedBy; }
    public void setSysModifiedBy(String sysModifiedBy) { this.sysModifiedBy = sysModifiedBy; }
}
