import type { ComplainantLookup } from '../api';

const muted = { opacity: 0.65, fontSize: 12 } as const;

/**
 * What the population registry says about a complainant, in the words of
 * COMPLAINTS.01 § UI. Shared by the list's detail panel and the complaint page,
 * so the three outcomes read the same everywhere. Fail open in the UI too: the
 * page around it never depends on which outcome arrives.
 */
export const ComplainantLine = ({ code, lookup }: { code: string; lookup: ComplainantLookup | null }) => (
  <>
    {code}
    {lookup?.kind === 'found' && (
      <>
        {' — '}
        <b>
          {lookup.complainant.firstName} {lookup.complainant.lastName}
        </b>
        , {lookup.complainant.address}
        <div style={muted}>via the population-registry adapter (mock / X-Road)</div>
      </>
    )}
    {lookup?.kind === 'unknown' && <div style={muted}>not found in the population registry</div>}
    {lookup?.kind === 'unavailable' && (
      <div style={muted}>population registry unavailable — complaint is unaffected</div>
    )}
  </>
);
