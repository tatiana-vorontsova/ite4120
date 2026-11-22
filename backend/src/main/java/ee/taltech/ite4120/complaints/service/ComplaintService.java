package ee.taltech.ite4120.complaints.service;

import ee.taltech.ite4120.complaints.complainantregistry.ComplainantInfo;
import ee.taltech.ite4120.complaints.complainantregistry.ComplainantRegistryAdapter;
import ee.taltech.ite4120.complaints.dto.ComplaintQueryParams;
import ee.taltech.ite4120.complaints.model.Complaint;
import ee.taltech.ite4120.complaints.model.DecisionType;
import ee.taltech.ite4120.complaints.repository.ComplaintRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import org.helex.commons.exception.ApiClientException;
import org.helex.commons.exception.ConflictException;
import org.helex.commons.exception.NotFoundException;
import org.helex.commons.model.QueryResult;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Business rules of the complaints register — exactly the rules written as
 * business tests in docs/src/specifications/COMPLAINTS.01, executable in
 * ComplaintBusinessRulesIT. Only {@link #complainant} calls the population
 * registry: the failure policy is fail open, so registering, reading,
 * updating and withdrawing never depend on it.
 */
@Service
public class ComplaintService {

    private final ComplaintRepository repository;
    private final ComplainantRegistryAdapter complainantRegistry;

    public ComplaintService(ComplaintRepository repository, ComplainantRegistryAdapter complainantRegistry) {
        this.repository = repository;
        this.complainantRegistry = complainantRegistry;
    }

    public QueryResult<Complaint> search(ComplaintQueryParams params) {
        return repository.search(params);
    }

    public Complaint require(Long id) {
        Complaint c = repository.load(id);
        if (c == null) {
            throw new NotFoundException("complaint " + id + " not found");
        }
        return c;
    }

    @Transactional
    public Complaint create(Complaint complaint) {
        validate(complaint);
        // Business test 2: a case number is unique among active complaints.
        if (repository.loadByCaseNumber(complaint.getCaseNumber()) != null) {
            throw duplicate(complaint.getCaseNumber());
        }
        try {
            Long id = repository.insert(complaint);
            return require(id);
        } catch (DuplicateKeyException e) {
            // Two concurrent registrations both passed the check above; the unique
            // index decided. Still the caller's conflict, not our 500.
            throw duplicate(complaint.getCaseNumber());
        }
    }

    @Transactional
    public Complaint update(Long id, Complaint complaint) {
        Complaint existing = require(id);
        // Business test 3: a case number never changes — refused, not silently ignored.
        if (complaint.getCaseNumber() != null
                && !Objects.equals(complaint.getCaseNumber(), existing.getCaseNumber())) {
            throw new ApiClientException("caseNumber cannot be changed");
        }
        complaint.setCaseNumber(existing.getCaseNumber());
        validate(complaint);
        complaint.setId(id);
        if (!repository.update(complaint)) {
            throw new NotFoundException("complaint " + id + " not found");
        }
        return require(id);
    }

    @Transactional
    public void withdraw(Long id) {
        if (!repository.withdraw(id)) {
            throw new NotFoundException("complaint " + id + " not found");
        }
    }

    /**
     * The complainant's current name and address, asked from the population
     * registry now — never stored. The ONLY method here that calls the registry:
     * that is the fail-open policy. When the registry is down this one call
     * fails (502); registering, reading, updating and withdrawing do not notice.
     */
    public ComplainantInfo complainant(Long id) {
        Complaint complaint = require(id);
        return complainantRegistry.lookup(complaint.getComplainantIsikukood())
                .orElseThrow(ComplainantUnknownException::new);
    }

    public List<DecisionType> decisionTypes() {
        return repository.decisionTypes();
    }

    private void validate(Complaint c) {
        // Business test 1: a complaint cannot contest a decision dated in the future.
        if (c.getDecisionDate() == null) {
            throw new ApiClientException("decisionDate is required");
        }
        if (c.getDecisionDate().isAfter(LocalDate.now())) {
            throw new ApiClientException("decisionDate must not be in the future");
        }
        // Referential rule surfaced as a clear 400 rather than a raw FK violation.
        if (!repository.decisionTypeExists(c.getDecisionTypeCode())) {
            throw new ApiClientException("unknown decisionTypeCode: " + c.getDecisionTypeCode());
        }
    }

    private static ConflictException duplicate(String caseNumber) {
        return new ConflictException("complaint",
                "an active complaint with case number " + caseNumber + " already exists");
    }
}
