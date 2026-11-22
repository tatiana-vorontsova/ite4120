package ee.taltech.ite4120.complaints.api;

import ee.taltech.ite4120.complaints.model.Complaint;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * The create/update request body. Bean Validation checks the SHAPE of the
 * message at the edge; the rules that depend on state or on today's date
 * (case number free, decision date not in the future, known decision type)
 * live in ComplaintService; the database constraints are the last line.
 * Validation in three places, as in the animals example.
 */
public class ComplaintRequest {

    /* Every constraint carries its own English message. Without one, Bean
       Validation picks the JVM's locale, and on a Russian-locale machine the UI
       would show "не должно быть пустым" verbatim in an English interface. */

    @NotBlank(message = "is required")
    @Size(max = 50, message = "must be at most 50 characters")
    private String caseNumber;

    @NotBlank(message = "is required")
    @Size(max = 255, message = "must be at most 255 characters")
    private String subject;

    @NotBlank(message = "is required")
    private String decisionTypeCode;

    @NotNull(message = "is required")
    private LocalDate decisionDate;

    /** Required; 11 digits — and a string, never a number. */
    @NotBlank(message = "is required")
    @Pattern(regexp = "\\d{11}", message = "must be exactly 11 digits")
    private String complainantIsikukood;

    @Size(max = 50, message = "must be at most 50 characters")
    private String decisionReference;

    public Complaint toModel() {
        Complaint c = new Complaint();
        c.setCaseNumber(caseNumber);
        c.setSubject(subject);
        c.setDecisionTypeCode(decisionTypeCode);
        c.setDecisionDate(decisionDate);
        c.setComplainantIsikukood(complainantIsikukood);
        c.setDecisionReference(decisionReference);
        return c;
    }

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
}
