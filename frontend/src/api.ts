// The animals API client — thin fetch wrappers over the backend the group owns.
// The Vite dev proxy forwards /api to the backend, so paths are same-origin.
// The Authorization header is set by MockAuthProvider's session (dev).

export interface Animal {
  id: number;
  registryCode: string;
  name: string;
  speciesCode: string;
  birthDate?: string;
  ownerIsikukood?: string;
  chipNumber?: string;
  /** Platform columns, filled by the database trigger; read-only. */
  sysStatus?: string;
  sysVersion?: number;
  sysCreatedAt?: string;
  sysCreatedBy?: string;
  sysModifiedAt?: string;
  sysModifiedBy?: string;
}

export interface OwnerInfo {
  isikukood: string;
  firstName: string;
  lastName: string;
  address: string;
}

export interface QueryResult<T> {
  data: T[];
  meta?: { total?: number };
}

function authHeaders(): Record<string, string> {
  // MockAuthProvider persists the signed-in mock user here.
  const user = localStorage.getItem('helex_mock_user') || 'superadmin';
  return { Authorization: `Bearer ${user}` };
}

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    // The backend answers application/problem+json — surface its human text.
    const problem = await response.json().catch(() => null);
    throw new Error(problem?.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

export const animalsApi = {
  list: (textContains?: string, speciesCode?: string): Promise<QueryResult<Animal>> =>
    fetch(
      '/api/animals?limit=50' +
        (textContains ? `&textContains=${encodeURIComponent(textContains)}` : '') +
        (speciesCode ? `&speciesCode=${encodeURIComponent(speciesCode)}` : ''),
      { headers: authHeaders() },
    ).then((r) => handle<QueryResult<Animal>>(r)),

  get: (id: number): Promise<Animal> =>
    fetch(`/api/animals/${id}`, { headers: authHeaders() }).then((r) => handle<Animal>(r)),

  create: (body: Omit<Animal, 'id'>): Promise<Animal> =>
    fetch('/api/animals', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => handle<Animal>(r)),

  /** PUT — the registry code is immutable; the backend keeps the stored one whatever is sent. */
  update: (id: number, body: Omit<Animal, 'id'>): Promise<Animal> =>
    fetch(`/api/animals/${id}`, {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => handle<Animal>(r)),

  /** DELETE — a soft delete: 204, and the registry code becomes reusable. */
  retire: (id: number): Promise<void> =>
    fetch(`/api/animals/${id}`, { method: 'DELETE', headers: authHeaders() }).then((r) =>
      r.ok ? undefined : handle<void>(r),
    ),

  owner: (id: number): Promise<OwnerInfo> =>
    fetch(`/api/animals/${id}/owner`, { headers: authHeaders() }).then((r) =>
      handle<OwnerInfo>(r),
    ),

  species: (): Promise<{ code: string; name: string }[]> =>
    fetch('/api/animals/species', { headers: authHeaders() }).then((r) =>
      handle<{ code: string; name: string }[]>(r),
    ),
};

// ---------------------------------------------------------------------------
// The complaints API client (COMPLAINTS.01). Same thin-wrapper shape as
// animalsApi above; every call of the complaints pages lives here.
// ---------------------------------------------------------------------------

export interface Complaint {
  id: number;
  caseNumber: string;
  subject: string;
  decisionTypeCode: string;
  decisionDate: string;
  complainantIsikukood: string;
  decisionReference?: string;
  /** Platform columns, filled by the database trigger; read-only. */
  sysStatus?: string;
  sysVersion?: number;
  sysCreatedAt?: string;
  sysCreatedBy?: string;
  sysModifiedAt?: string;
  sysModifiedBy?: string;
}

export interface ComplainantInfo {
  isikukood: string;
  firstName: string;
  lastName: string;
  address: string;
}

/**
 * The three outcomes of the complainant lookup, kept apart because the UI
 * shows each differently (COMPLAINTS.01 § UI). `handle` would collapse 404 and
 * 502 into one Error, so this call reads the status itself.
 */
export type ComplainantLookup =
  | { kind: 'found'; complainant: ComplainantInfo }
  | { kind: 'unknown' } // 404 — the registry does not know the personal code
  | { kind: 'unavailable' }; // 502 or no answer — the registry is down; the complaint is unaffected

export const complaintsApi = {
  list: (textContains?: string, decisionTypeCode?: string): Promise<QueryResult<Complaint>> =>
    fetch(
      '/api/complaints?limit=50&sort=-decisionDate' +
        (textContains ? `&textContains=${encodeURIComponent(textContains)}` : '') +
        (decisionTypeCode ? `&decisionTypeCode=${encodeURIComponent(decisionTypeCode)}` : ''),
      { headers: authHeaders() },
    ).then((r) => handle<QueryResult<Complaint>>(r)),

  get: (id: number): Promise<Complaint> =>
    fetch(`/api/complaints/${id}`, { headers: authHeaders() }).then((r) => handle<Complaint>(r)),

  create: (body: Omit<Complaint, 'id'>): Promise<Complaint> =>
    fetch('/api/complaints', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => handle<Complaint>(r)),

  /** PUT — the case number never changes; a different one is refused with 400. */
  update: (id: number, body: Omit<Complaint, 'id'>): Promise<Complaint> =>
    fetch(`/api/complaints/${id}`, {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => handle<Complaint>(r)),

  /** DELETE — withdrawal is a soft delete: 204, and the case number becomes reusable. */
  withdraw: (id: number): Promise<void> =>
    fetch(`/api/complaints/${id}`, { method: 'DELETE', headers: authHeaders() }).then((r) =>
      r.ok ? undefined : handle<void>(r),
    ),

  /** Never throws: every outcome, including a network failure, is one of the three kinds. */
  complainant: async (id: number): Promise<ComplainantLookup> => {
    try {
      const r = await fetch(`/api/complaints/${id}/complainant`, { headers: authHeaders() });
      if (r.ok) return { kind: 'found', complainant: (await r.json()) as ComplainantInfo };
      return r.status === 404 ? { kind: 'unknown' } : { kind: 'unavailable' };
    } catch {
      return { kind: 'unavailable' };
    }
  },

  decisionTypes: (): Promise<{ code: string; name: string }[]> =>
    fetch('/api/complaints/decision-types', { headers: authHeaders() }).then((r) =>
      handle<{ code: string; name: string }[]>(r),
    ),
};
