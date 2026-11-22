package ee.taltech.ite4120.complaints.complainantregistry;

/**
 * A complainant, in OUR domain vocabulary — English names, our shape. The
 * registry's own Estonian field names live in the wire record and never leak
 * past the one mapper in HttpComplainantRegistryAdapter.
 *
 * <p>Never stored: the register keeps only the personal code and asks the
 * population registry each time (one source of truth per fact).
 */
public record ComplainantInfo(String isikukood, String firstName, String lastName, String address) {}
