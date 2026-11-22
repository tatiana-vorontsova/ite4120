package ee.taltech.ite4120.complaints.api;

import ee.taltech.ite4120.complaints.complainantregistry.ComplainantInfo;
import ee.taltech.ite4120.complaints.dto.ComplaintQueryParams;
import ee.taltech.ite4120.complaints.model.Complaint;
import ee.taltech.ite4120.complaints.model.DecisionType;
import ee.taltech.ite4120.complaints.service.ComplaintService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.helex.commons.model.QueryResult;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The complaints REST API — HTTP only, every rule is in ComplaintService.
 * Errors become application/problem+json through the shared ApiErrorHandler.
 */
@RestController
@RequestMapping("/api/complaints")
@Tag(name = "Complaints", description = "Register of complaints against automated decisions (COMPLAINTS.01)")
public class ComplaintController {

    private final ComplaintService service;

    public ComplaintController(ComplaintService service) {
        this.service = service;
    }

    @Operation(summary = "Search complaints — paginated, filterable by decision type, sortable")
    @ApiResponse(responseCode = "200", description = "One page of active complaints, { data, meta }")
    @ApiResponse(responseCode = "400", description = "Unknown sort key")
    @GetMapping
    public QueryResult<Complaint> search(@ModelAttribute ComplaintQueryParams params) {
        return service.search(params);
    }

    @Operation(summary = "One complaint by id")
    @ApiResponse(responseCode = "200", description = "The complaint")
    @ApiResponse(responseCode = "404", description = "No active complaint with that id")
    @GetMapping("/{id}")
    public Complaint byId(@PathVariable Long id) {
        return service.require(id);
    }

    @Operation(summary = "Register a new complaint")
    @ApiResponse(responseCode = "201", description = "Created — Location header points at the new complaint")
    @ApiResponse(responseCode = "400", description = "Validation failed (decision date in the future, unknown decision type, malformed personal code…)")
    @ApiResponse(responseCode = "409", description = "Case number already in use by an active complaint")
    @PostMapping
    public ResponseEntity<Complaint> create(@Valid @RequestBody ComplaintRequest body) {
        Complaint saved = service.create(body.toModel());
        return ResponseEntity.created(URI.create("/api/complaints/" + saved.getId())).body(saved);
    }

    @Operation(summary = "Update a complaint (the case number never changes)")
    @ApiResponse(responseCode = "200", description = "The updated complaint")
    @ApiResponse(responseCode = "400", description = "Validation failed, or a different case number was sent")
    @ApiResponse(responseCode = "404", description = "No active complaint with that id")
    @PutMapping("/{id}")
    public Complaint update(@PathVariable Long id, @Valid @RequestBody ComplaintRequest body) {
        return service.update(id, body.toModel());
    }

    @Operation(summary = "Withdraw a complaint (soft delete)")
    @ApiResponse(responseCode = "204", description = "Withdrawn")
    @ApiResponse(responseCode = "404", description = "No active complaint with that id")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> withdraw(@PathVariable Long id) {
        service.withdraw(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "The complainant's current name and address, from the population registry",
            description = "Looked up live through ComplainantRegistryAdapter, never stored. "
                    + "Fail open: only this endpoint depends on the registry.")
    @ApiResponse(responseCode = "200", description = "The complainant")
    @ApiResponse(responseCode = "404", description = "No active complaint with that id, or the registry does not know the personal code")
    @ApiResponse(responseCode = "502", description = "The population registry is unavailable — the complaint itself is unaffected")
    @GetMapping("/{id}/complainant")
    public ComplainantInfo complainant(@PathVariable Long id) {
        return service.complainant(id);
    }

    @Operation(summary = "Decision type reference list")
    @ApiResponse(responseCode = "200", description = "All decision types")
    @GetMapping("/decision-types")
    public List<DecisionType> decisionTypes() {
        return service.decisionTypes();
    }
}
