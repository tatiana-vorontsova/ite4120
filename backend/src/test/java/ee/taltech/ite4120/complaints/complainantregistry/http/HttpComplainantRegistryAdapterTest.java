package ee.taltech.ite4120.complaints.complainantregistry.http;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.sun.net.httpserver.HttpServer;
import ee.taltech.ite4120.complaints.complainantregistry.ComplainantInfo;
import ee.taltech.ite4120.complaints.complainantregistry.ComplainantRegistryException;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * The adapter against a tiny registry served in-process — no Spring, no
 * Docker. One test per outcome the failure policy distinguishes
 * (COMPLAINTS.01 § API): a known person is mapped from the Estonian wire
 * names; an unknown person is a miss (empty, later 404); a registry fault and
 * an unreachable registry are failures (exception, later 502).
 */
class HttpComplainantRegistryAdapterTest {

    private HttpServer registry;
    private String url;

    @BeforeEach
    void startRegistry() throws IOException {
        registry = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        registry.createContext("/persons/38102130265", ex -> answer(ex, 200,
                "{\"isikukood\":\"38102130265\",\"eesnimi\":\"Jaan\",\"perekonnanimi\":\"Tamm\","
                        + "\"aadress\":\"Ehitajate tee 5, Tallinn\"}"));
        registry.createContext("/persons/60101010007", ex -> answer(ex, 404, ""));
        registry.createContext("/persons/49999999999", ex -> answer(ex, 500, "boom"));
        registry.start();
        url = "http://localhost:" + registry.getAddress().getPort();
    }

    @AfterEach
    void stopRegistry() {
        registry.stop(0);
    }

    @Test
    void aKnownPersonIsMappedFromTheRegistrysWireNames() {
        Optional<ComplainantInfo> found = new HttpComplainantRegistryAdapter(url).lookup("38102130265");

        assertThat(found).contains(
                new ComplainantInfo("38102130265", "Jaan", "Tamm", "Ehitajate tee 5, Tallinn"));
    }

    @Test
    void aPersonTheRegistryDoesNotKnowIsAMissNotAFailure() {
        assertThat(new HttpComplainantRegistryAdapter(url).lookup("60101010007")).isEmpty();
    }

    @Test
    void aRegistryFaultIsAFailure() {
        assertThatThrownBy(() -> new HttpComplainantRegistryAdapter(url).lookup("49999999999"))
                .isInstanceOf(ComplainantRegistryException.class)
                .hasMessageContaining("HTTP 500");
    }

    @Test
    void anUnreachableRegistryIsAFailure() throws IOException {
        int closedPort;
        try (ServerSocket s = new ServerSocket(0)) {
            closedPort = s.getLocalPort();
        }
        String nowhere = "http://localhost:" + closedPort;

        assertThatThrownBy(() -> new HttpComplainantRegistryAdapter(nowhere).lookup("38102130265"))
                .isInstanceOf(ComplainantRegistryException.class)
                .hasMessageContaining("unreachable")
                .hasMessageNotContaining("null");
    }

    private static void answer(com.sun.net.httpserver.HttpExchange ex, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().add("Content-Type", "application/json");
        ex.sendResponseHeaders(status, bytes.length == 0 ? -1 : bytes.length);
        try (OutputStream out = ex.getResponseBody()) {
            out.write(bytes);
        }
    }
}
