package ee.taltech.ite4120.complaints.dto;

import org.helex.commons.model.QueryParams;

/**
 * Query parameters for the complaint list endpoint. Extends the platform
 * {@link QueryParams}, which carries {@code limit}, {@code offset} and {@code sort}
 * — the same list contract as the animals example.
 */
public class ComplaintQueryParams extends QueryParams {

    /** Case-insensitive substring match on subject or case number. */
    private String textContains;
    /** Exact decision type filter, e.g. {@code TAX}. */
    private String decisionTypeCode;

    public String getTextContains() { return textContains; }
    public void setTextContains(String textContains) { this.textContains = textContains; }
    public String getDecisionTypeCode() { return decisionTypeCode; }
    public void setDecisionTypeCode(String decisionTypeCode) { this.decisionTypeCode = decisionTypeCode; }
}
