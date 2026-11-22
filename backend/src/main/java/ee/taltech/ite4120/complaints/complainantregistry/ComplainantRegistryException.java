package ee.taltech.ite4120.complaints.complainantregistry;

/** The population registry could not answer — transport failure or upstream fault. Maps to 502. */
public class ComplainantRegistryException extends RuntimeException {

    public ComplainantRegistryException(String message) {
        super(message);
    }

    public ComplainantRegistryException(String message, Throwable cause) {
        super(message, cause);
    }
}
