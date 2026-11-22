package ee.taltech.ite4120.complaints;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ee.taltech.ite4120.complaints.model.Complaint;
import ee.taltech.ite4120.complaints.service.ComplaintService;
import java.time.LocalDate;
import org.helex.commons.exception.ApiClientException;
import org.helex.commons.exception.ConflictException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * THE BUSINESS TESTS of the complaints register — the executable form of
 * docs/src/specifications/COMPLAINTS.01 § Business tests, one test per rule,
 * in the same order and words. Written before the implementation and watched
 * fail first.
 *
 * <p>Runs against a real PostgreSQL via Testcontainers: the whole Liquibase
 * changelog (core + animals + complaints) is applied to a throwaway database,
 * so these tests also prove the complaints migrations run clean from empty.
 */
@Testcontainers
@SpringBootTest
@ActiveProfiles("test")
class ComplaintBusinessRulesIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18-alpine");

    @Autowired
    ComplaintService service;

    /** Business test 1. */
    @Test
    void aComplaintCannotContestADecisionDatedInTheFuture() {
        // Given a request whose contested decision is dated tomorrow
        Complaint c = complaint("IT-FUT-001");
        c.setDecisionDate(LocalDate.now().plusDays(1));

        // When the complaint is registered, then the registration is refused as a client error
        assertThatThrownBy(() -> service.create(c))
                .isInstanceOf(ApiClientException.class)
                .hasMessageContaining("decisionDate must not be in the future");
    }

    /** Business test 2. */
    @Test
    void aCaseNumberIsUniqueAmongActiveComplaints() {
        // Given an active complaint with case number X
        Complaint first = service.create(complaint("IT-DUP-001"));
        assertThat(first.getId()).isNotNull();

        // When a second complaint claims X, then the registration conflicts
        assertThatThrownBy(() -> service.create(complaint("IT-DUP-001")))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already exists");

        // And when the first is withdrawn, X may be used again — withdrawal is a soft delete
        service.withdraw(first.getId());
        Complaint reused = service.create(complaint("IT-DUP-001"));
        assertThat(reused.getId()).isNotEqualTo(first.getId());
    }

    /** Business test 3. */
    @Test
    void aCaseNumberNeverChanges() {
        // Given an active complaint with case number X
        Complaint existing = service.create(complaint("IT-IMM-001"));

        // When it is updated with case number Y, then the update is refused
        Complaint changed = complaint("IT-IMM-002");
        assertThatThrownBy(() -> service.update(existing.getId(), changed))
                .isInstanceOf(ApiClientException.class)
                .hasMessageContaining("caseNumber cannot be changed");

        // And the complaint still carries case number X
        assertThat(service.require(existing.getId()).getCaseNumber()).isEqualTo("IT-IMM-001");
    }

    private static Complaint complaint(String caseNumber) {
        Complaint c = new Complaint();
        c.setCaseNumber(caseNumber);
        c.setSubject("Test complaint");
        c.setDecisionTypeCode("BENEFIT");
        c.setDecisionDate(LocalDate.of(2026, 1, 15));
        c.setComplainantIsikukood("38102130265");
        return c;
    }
}
