package ee.taltech.ite4120.complaints.complainantregistry.http.wire;

/**
 * WIRE RECORD — the population registry's person response exactly as the
 * registry defines it.
 *
 * <p>Field names are the provider's Estonian names, deliberately NOT
 * translated, so the record stays diffable against the provider's schema.
 * The component keeps its own copy instead of importing the animals one:
 * a component depends on the registry's contract, not on another component.
 * The English renaming happens in exactly one place — the mapper in
 * {@link ee.taltech.ite4120.complaints.complainantregistry.http.HttpComplainantRegistryAdapter}.
 */
public record RrPersonResponse(
        String isikukood,
        String eesnimi,
        String perekonnanimi,
        String aadress) {}
