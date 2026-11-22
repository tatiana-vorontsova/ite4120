package ee.taltech.ite4120.complaints.repository;

import ee.taltech.ite4120.complaints.dto.ComplaintQueryParams;
import ee.taltech.ite4120.complaints.model.Complaint;
import ee.taltech.ite4120.complaints.model.DecisionType;
import java.util.List;
import java.util.Map;
import org.helex.commons.db.bean.PgBeanProcessor;
import org.helex.commons.db.repo.BaseRepository;
import org.helex.commons.db.sql.SqlBuilder;
import org.helex.commons.exception.ApiClientException;
import org.helex.commons.model.QueryResult;
import org.springframework.stereotype.Repository;

/**
 * Data access for the complaints register, in the canonical Helex repository
 * shape of AnimalRepository: extend {@link BaseRepository}, map rows with
 * {@link PgBeanProcessor}, build dynamic filters with {@link SqlBuilder}.
 * Every read sees active rows only; nothing here writes a sys_* column.
 */
@Repository
public class ComplaintRepository extends BaseRepository {

    private static final String SELECT = "select c.* from complaints.complaint c ";

    /** The sort keys the list endpoint accepts (`sort=subject`, `sort=-decisionDate`) and their columns. */
    private static final Map<String, String> SORT = Map.of(
            "subject", "c.subject",
            "caseNumber", "c.case_number",
            "decisionDate", "c.decision_date");

    private final PgBeanProcessor bp = new PgBeanProcessor(Complaint.class);
    private final PgBeanProcessor decisionTypeBp = new PgBeanProcessor(DecisionType.class);

    public Complaint load(Long id) {
        return getBean(SELECT + "where c.id = ? and c.sys_status = 'A'", bp, id);
    }

    public Complaint loadByCaseNumber(String caseNumber) {
        return getBean(SELECT + "where c.case_number = ? and c.sys_status = 'A'", bp, caseNumber);
    }

    public QueryResult<Complaint> search(ComplaintQueryParams p) {
        return query(p, this::count, this::list);
    }

    private Integer count(ComplaintQueryParams p) {
        SqlBuilder sb = new SqlBuilder("select count(1) from complaints.complaint c where c.sys_status = 'A'");
        sb.append(filter(p));
        return queryForObject(sb.getSql(), Integer.class, sb.getParams());
    }

    private List<Complaint> list(ComplaintQueryParams p) {
        SqlBuilder sb = new SqlBuilder(SELECT + "where c.sys_status = 'A'");
        sb.append(filter(p));
        sb.append(order(p));
        sb.append(limit(p));
        return getBeans(sb.getSql(), bp, sb.getParams());
    }

    /** A mistyped {@code ?sort=} is the caller's fault: 400 with the allowed keys, not 500. */
    private SqlBuilder order(ComplaintQueryParams p) {
        try {
            return order(p, SORT);
        } catch (IllegalArgumentException e) {
            throw new ApiClientException("unknown sort key; sortable: " + String.join(", ", SORT.keySet().stream().sorted().toList()));
        }
    }

    private SqlBuilder filter(ComplaintQueryParams p) {
        SqlBuilder sb = new SqlBuilder();
        if (p.getTextContains() != null && !p.getTextContains().isBlank()) {
            String like = "%" + p.getTextContains().toLowerCase() + "%";
            sb.and("(lower(c.subject) like ? or lower(c.case_number) like ?)", like, like);
        }
        sb.appendIfNotNull("and c.decision_type_code = ?", p.getDecisionTypeCode());
        return sb;
    }

    public Long insert(Complaint c) {
        String sql = """
                insert into complaints.complaint (case_number, subject, decision_type_code, decision_date,
                                                  complainant_isikukood, decision_reference)
                values (?, ?, ?, ?, ?, ?)
                returning id""";
        return queryForObject(sql, Long.class,
                c.getCaseNumber(), c.getSubject(), c.getDecisionTypeCode(), c.getDecisionDate(),
                c.getComplainantIsikukood(), c.getDecisionReference());
    }

    /** Case number is deliberately absent from the SET list: it never changes. */
    public boolean update(Complaint c) {
        String sql = """
                update complaints.complaint
                   set subject = ?, decision_type_code = ?, decision_date = ?,
                       complainant_isikukood = ?, decision_reference = ?
                 where id = ? and sys_status = 'A'""";
        return jdbcTemplate.update(sql, c.getSubject(), c.getDecisionTypeCode(), c.getDecisionDate(),
                c.getComplainantIsikukood(), c.getDecisionReference(), c.getId()) == 1;
    }

    /** Withdrawal is a soft delete — the row stays, sys_status goes A -> C. */
    public boolean withdraw(Long id) {
        return jdbcTemplate.update(
                "update complaints.complaint set sys_status = 'C' where id = ? and sys_status = 'A'", id) == 1;
    }

    public List<DecisionType> decisionTypes() {
        return getBeans("select d.* from complaints.decision_type d order by d.name", decisionTypeBp);
    }

    public boolean decisionTypeExists(String code) {
        Integer n = queryForObject("select count(1) from complaints.decision_type where code = ?", Integer.class, code);
        return n != null && n > 0;
    }
}
