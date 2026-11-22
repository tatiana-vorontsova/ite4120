package ee.taltech.ite4120.complaints.service;

/**
 * The population registry answered, and it does not know the complainant's
 * personal code. A miss, not a failure: 404 with its own detail, never 502
 * and never an empty 200 (COMPLAINTS.01 § API).
 */
public class ComplainantUnknownException extends RuntimeException {

    public ComplainantUnknownException() {
        super("complainant not found in the population registry");
    }
}
