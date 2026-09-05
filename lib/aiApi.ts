const BASE_URL = process.env.NEXT_PUBLIC_AI_API_URL || "https://fir-intelligence-api.onrender.com/api/v1";

export type FirResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; detail?: unknown };

export type AICaseCreateInput = {
  case_number: string;
  title: string;
  case_type?: string;
  priority?: string;
  synopsis?: string;
  investigation_summary?: string;
  police_station?: string | null;
  district?: string | null;
};

export type AICaseListItem = {
  case_id: string;
  case_number: string;
  title?: string;
  case_type?: string;
  priority?: string;
  status?: string;
};

export type AICaseDetails = {
  case_id?: string;
  case_number?: string;
  title?: string;
  case_type?: string;
  priority?: string;
  status?: string;
  synopsis?: string;
  persons?: unknown[];
  unknown_identities?: unknown[];
  incidents?: unknown[];
  entities?: unknown[];
  relationships?: unknown[];
  documents?: unknown[];
  ingestion_jobs?: unknown[];
};

function firErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (item && typeof item === "object" && "msg" in item) {
            return String((item as { msg: unknown }).msg);
          }
          return typeof item === "string" ? item : JSON.stringify(item);
        })
        .join("; ");
    }
    if (detail && typeof detail === "object" && "message" in detail) {
      return String((detail as { message?: unknown }).message || fallback);
    }
  }
  return fallback;
}

async function firFetch<T>(path: string, init?: RequestInit): Promise<FirResult<T>> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, { cache: "no-store", ...init });
    const text = await res.text();
    let payload: unknown = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text;
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: firErrorMessage(payload, `FIR API ${res.status}`),
        detail: payload,
      };
    }

    return { ok: true, status: res.status, data: payload as T };
  } catch (error) {
    return {
      ok: false,
      status: 503,
      error: error instanceof Error ? error.message : "FIR API unreachable",
    };
  }
}

function mapPriority(priority?: string) {
  const value = String(priority || "MEDIUM").toUpperCase();
  if (value === "LOW" || value === "MEDIUM" || value === "HIGH" || value === "CRITICAL") return value;
  return "MEDIUM";
}

function optionalText(value?: string | null) {
  const trimmed = String(value || "").trim();
  return trimmed || null;
}

export function toFirCreateBody(input: AICaseCreateInput) {
  return {
    case_number: input.case_number,
    title: input.title,
    case_type: input.case_type || "General Investigation",
    priority: mapPriority(input.priority),
    synopsis: optionalText(input.synopsis || input.investigation_summary),
    police_station: optionalText(input.police_station),
    district: optionalText(input.district),
  };
}

function unwrapCaseDetails(payload: unknown): AICaseDetails {
  if (!payload || typeof payload !== "object") return {};
  const envelope = payload as Record<string, unknown>;
  const inner = envelope.case && typeof envelope.case === "object"
    ? (envelope.case as Record<string, unknown>)
    : null;

  if (inner && ("persons" in envelope || "documents" in envelope || "entities" in envelope || "ingestion_jobs" in envelope)) {
    return {
      ...inner,
      persons: (envelope.persons as unknown[]) ?? [],
      unknown_identities: (envelope.unknown_identities as unknown[]) ?? [],
      incidents: (envelope.incidents as unknown[]) ?? [],
      entities: (envelope.entities as unknown[]) ?? [],
      relationships: (envelope.relationships as unknown[]) ?? [],
      documents: (envelope.documents as unknown[]) ?? [],
      ingestion_jobs: (envelope.ingestion_jobs as unknown[]) ?? [],
    };
  }

  return envelope as AICaseDetails;
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listAICases() {
  return firFetch<AICaseListItem[]>("/cases");
}

export async function findAICaseByNumber(caseNumber: string) {
  const listed = await listAICases();
  if (!listed.ok) return listed;
  const match = listed.data.find((item) => item.case_number === caseNumber) || null;
  return { ok: true as const, status: 200, data: match };
}

export async function createAICase(input: AICaseCreateInput) {
  return firFetch<AICaseListItem>("/cases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toFirCreateBody(input)),
  });
}

export async function resolveAICaseId(input: AICaseCreateInput) {
  const existing = await findAICaseByNumber(input.case_number);
  if (existing.ok && existing.data?.case_id) {
    return { ok: true as const, status: 200, data: { case_id: existing.data.case_id, reused: true } };
  }

  const created = await createAICase(input);
  if (created.ok && created.data.case_id) {
    return { ok: true as const, status: created.status, data: { case_id: created.data.case_id, reused: false } };
  }

  const retry = await findAICaseByNumber(input.case_number);
  if (retry.ok && retry.data?.case_id) {
    return { ok: true as const, status: 200, data: { case_id: retry.data.case_id, reused: true } };
  }

  return created.ok
    ? { ok: false as const, status: 502, error: "FIR API did not return a case_id" }
    : created;
}

export async function uploadFIRDocument(caseId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return firFetch<{ document_id?: string; job_id?: string }>(`/cases/${caseId}/documents`, {
    method: "POST",
    body: formData,
  });
}

export async function getJobStatus(jobId: string) {
  return firFetch<Record<string, unknown>>(`/firs/jobs/${jobId}`);
}

export async function getAICaseDetails(caseId: string) {
  const result = await firFetch<unknown>(`/cases/${caseId}`);
  if (!result.ok) return result;
  return { ok: true as const, status: result.status, data: unwrapCaseDetails(result.data) };
}

export type InvestigationRecommendation = {
  priority?: string;
  recommendation?: string;
  reason?: string;
  evidence_basis?: string[];
};

export type InvestigationAnalysis = {
  case_id?: string;
  summary?: string;
  key_findings?: string[];
  unresolved_identities?: string[];
  relationship_findings?: string[];
  evidence_gaps?: string[];
  investigation_recommendations?: InvestigationRecommendation[];
};

export type CaseSummary = {
  case_id: string;
  case_number: string;
  title: string;
  case_type?: string | null;
  priority?: string | null;
  synopsis?: string | null;
  police_station?: string | null;
  status: string;
  document_count: number;
  person_count: number;
  unknown_identity_count: number;
  incident_count: number;
  entity_count: number;
  relationship_count: number;
  analysis_available: boolean;
};

export async function getCaseSummary(caseId: string) {
  return firFetch<CaseSummary>(`/cases/${caseId}/summary`);
}

export async function closeAICase(caseId: string) {
  return firFetch<unknown>(`/cases/${caseId}/close`, { method: "POST" });
}

export async function getCaseGraph(caseId: string) {
  return firFetch<unknown>(`/cases/${caseId}/graph`);
}

export async function analyzeCase(caseId: string) {
  return firFetch<InvestigationAnalysis>(`/cases/${caseId}/analysis`, { method: "POST" });
}

export async function getCaseAnalysis(caseId: string) {
  return firFetch<InvestigationAnalysis>(`/cases/${caseId}/analysis`);
}

export async function sendCaseChatMessage(caseId: string, message: string) {
  return firFetch<unknown>(`/cases/${caseId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
}

export async function getCaseChatHistory(caseId: string) {
  return firFetch<unknown>(`/cases/${caseId}/chat/history`);
}
