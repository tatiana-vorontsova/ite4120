package ee.taltech.ite4120.complaints.complainantregistry.http;

import com.fasterxml.jackson.databind.ObjectMapper;
import ee.taltech.ite4120.complaints.complainantregistry.ComplainantInfo;
import ee.taltech.ite4120.complaints.complainantregistry.ComplainantRegistryAdapter;
import ee.taltech.ite4120.complaints.complainantregistry.ComplainantRegistryException;
import ee.taltech.ite4120.complaints.complainantregistry.http.wire.RrPersonResponse;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;

/**
 * The population registry over plain HTTPS+JSON, plus the mapper from the
 * wire record to our {@link ComplainantInfo}.
 *
 * <p>Locally the URL points at this application's own {@code /mock-registry}
 * — the imitated registry the animals example serves. Point
 * {@code complaints.complainant-registry.url} at a real registry and nothing
 * else changes.
 */
public class HttpComplainantRegistryAdapter implements ComplainantRegistryAdapter {

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private final ObjectMapper json = new ObjectMapper();
    private final String baseUrl;

    public HttpComplainantRegistryAdapter(String baseUrl) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }

    @Override
    public Optional<ComplainantInfo> lookup(String isikukood) {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/persons/" + isikukood))
                .timeout(Duration.ofSeconds(10))
                .header("Accept", "application/json")
                .GET()
                .build();
        try {
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 404) {
                // The registry answered: it does not know this person. A miss, not a failure.
                return Optional.empty();
            }
            if (response.statusCode() != 200) {
                throw new ComplainantRegistryException(
                        "population registry answered HTTP " + response.statusCode());
            }
            RrPersonResponse wire = json.readValue(response.body(), RrPersonResponse.class);
            return Optional.of(toDomain(wire));
        } catch (IOException e) {
            // A refused connection carries no message; never let "null" reach the UI verbatim.
            String why = e.getMessage() == null ? "" : ": " + e.getMessage();
            throw new ComplainantRegistryException("population registry unreachable" + why, e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ComplainantRegistryException("population registry call interrupted", e);
        }
    }

    /** The mapper — the ONLY place where the registry's Estonian names become ours. */
    static ComplainantInfo toDomain(RrPersonResponse wire) {
        return new ComplainantInfo(wire.isikukood(), wire.eesnimi(), wire.perekonnanimi(), wire.aadress());
    }
}
