package ee.taltech.ite4120.complaints.complainantregistry;

import ee.taltech.ite4120.complaints.complainantregistry.http.HttpComplainantRegistryAdapter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Chooses what stands behind {@link ComplainantRegistryAdapter}. One transport
 * in this course — plain HTTPS+JSON against {@code complaints.complainant-registry.url},
 * locally the imitated registry at {@code /mock-registry}. An X-Road transport
 * would be a second implementation chosen here; the service would not change.
 *
 * <p>To see the failure policy at work, start the backend with the URL pointing
 * nowhere (environment variable {@code COMPLAINTS_COMPLAINANTREGISTRY_URL}):
 * {@code /complainant} answers 502, everything else keeps working.
 */
@Configuration
public class ComplainantRegistryConfig {

    @Bean
    public ComplainantRegistryAdapter complainantRegistryAdapter(
            @Value("${complaints.complainant-registry.url:http://localhost:18440/mock-registry}") String url) {
        return new HttpComplainantRegistryAdapter(url);
    }
}
