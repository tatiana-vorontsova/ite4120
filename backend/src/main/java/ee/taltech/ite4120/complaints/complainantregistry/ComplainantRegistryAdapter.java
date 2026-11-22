package ee.taltech.ite4120.complaints.complainantregistry;

import java.util.Optional;

/**
 * The population registry, as the complaints register sees it. The service
 * knows only this interface; which transport answers is configuration
 * (ComplainantRegistryConfig).
 *
 * <p>Two different "no name" outcomes, kept apart on purpose (COMPLAINTS.01):
 * <ul>
 *   <li>the registry answered and does not know the person — a MISS:
 *       {@link Optional#empty()}, which the API answers with 404;</li>
 *   <li>the registry could not answer — a FAILURE:
 *       {@link ComplainantRegistryException}, which the API answers with 502.</li>
 * </ul>
 */
public interface ComplainantRegistryAdapter {

    /**
     * Look up a person by Estonian personal code.
     *
     * @return the person, or empty when the registry does not know the code
     * @throws ComplainantRegistryException when the registry cannot be reached or
     *         answers with a fault
     */
    Optional<ComplainantInfo> lookup(String isikukood);
}
