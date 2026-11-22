package ee.taltech.ite4120.complaints.api;

import ee.taltech.ite4120.complaints.complainantregistry.ComplainantRegistryException;
import ee.taltech.ite4120.complaints.service.ComplainantUnknownException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * The two problem documents only the complaints component produces — the
 * outcomes of the population-registry lookup. Every other error (validation,
 * 404, 409) is rendered by the shared ApiErrorHandler; this class adds to it
 * and overrides nothing, so the error shape stays one: application/problem+json.
 */
@RestControllerAdvice
public class ComplaintErrorHandler {

    /** The registry answered and does not know the person: a miss, 404 with its own detail. */
    @ExceptionHandler(ComplainantUnknownException.class)
    public ProblemDetail complainantUnknown(ComplainantUnknownException e) {
        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);
        pd.setTitle("Complainant not found");
        pd.setDetail(e.getMessage());
        return pd;
    }

    /** The registry could not answer: an upstream failure, not the caller's fault — 502. */
    @ExceptionHandler(ComplainantRegistryException.class)
    public ProblemDetail registryFailure(ComplainantRegistryException e) {
        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.BAD_GATEWAY);
        pd.setTitle("Population registry unavailable");
        pd.setDetail(e.getMessage());
        return pd;
    }
}
