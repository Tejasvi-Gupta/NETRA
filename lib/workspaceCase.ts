export interface FirDocument {
  document_id?: string;
  id?: string;
  filename?: string;
  file_name?: string;
  title?: string;
  content_type?: string;
  status?: string;
  created_at?: string;
}

export interface FirIngestionJob {
  job_id?: string;
  id?: string;
  status?: string;
  steps?: unknown;
  error?: unknown;
  created_at?: string;
}

export const PIPELINE_STEPS = [
  { key: "upload", label: "Upload", hint: "File received" },
  { key: "ocr", label: "OCR", hint: "Reading text from the pages" },
  { key: "segmentation", label: "Split", hint: "Breaking the FIR into sections" },
  { key: "extraction", label: "Extract", hint: "Finding people, phones, and places" },
  { key: "entity_resolution", label: "Match", hint: "Linking names that are the same person" },
  { key: "persistence", label: "Save", hint: "Writing results into the case" },
] as const;

export type PipelineStepState = "pending" | "current" | "completed" | "failed";

export interface PipelineStepView {
  key: string;
  label: string;
  hint: string;
  state: PipelineStepState;
}

function normalizeStepStatus(value: unknown): "pending" | "completed" | "failed" | "running" {
  if (value && typeof value === "object" && "status" in value) {
    return normalizeStepStatus((value as { status: unknown }).status);
  }
  const status = String(value || "pending").toLowerCase();
  if (status === "completed" || status === "done" || status === "success") return "completed";
  if (status === "failed" || status === "error") return "failed";
  if (status === "running" || status === "processing" || status === "in_progress") return "running";
  return "pending";
}

export function getPipelineView(steps: unknown, overallStatus?: string) {
  const raw = steps && typeof steps === "object" && !Array.isArray(steps)
    ? (steps as Record<string, unknown>)
    : {};

  const normalized = PIPELINE_STEPS.map((step) => ({
    ...step,
    raw: normalizeStepStatus(raw[step.key]),
  }));

  const overall = jobStatusLabel(overallStatus);
  const failed = overall === "failed" || normalized.some((step) => step.raw === "failed");

  let currentIndex = normalized.findIndex((step) => step.raw === "failed");
  if (currentIndex < 0 && failed) {
    currentIndex = normalized.findIndex((step) => step.raw === "running" || step.raw === "pending");
  }
  if (currentIndex < 0) currentIndex = normalized.findIndex((step) => step.raw === "running");
  if (currentIndex < 0) currentIndex = normalized.findIndex((step) => step.raw === "pending");

  const allDone = !failed && (overall === "completed" || normalized.every((step) => step.raw === "completed"));

  const view: PipelineStepView[] = normalized.map((step, index) => {
    let state: PipelineStepState = "pending";
    if (step.raw === "failed" || (failed && index === currentIndex)) state = "failed";
    else if (allDone || step.raw === "completed") state = "completed";
    else if (index === currentIndex) state = "current";
    return { key: step.key, label: step.label, hint: step.hint, state };
  });

  const current = view.find((step) => step.state === "current" || step.state === "failed") || null;

  return { steps: view, current, overall, allDone, failed };
}

export function jobErrorMessage(error: unknown) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message || "");
  }
  return "";
}

export function currentStepHeadline(steps: unknown, overallStatus?: string, error?: unknown) {
  const pipeline = getPipelineView(steps, overallStatus);
  const apiError = jobErrorMessage(error);
  if (pipeline.failed && pipeline.current) {
    return {
      title: `Stopped at ${pipeline.current.label}`,
      detail: apiError || (pipeline.current.key === "extraction"
        ? "The FIR API could not structure people and facts from this document."
        : `${pipeline.current.hint} failed.`),
    };
  }
  if (pipeline.allDone) {
    return { title: "Processing complete", detail: "People and connections are ready to review." };
  }
  if (pipeline.current?.key === "ocr") {
    return {
      title: "Now: OCR",
      detail: pipeline.overall === "queued"
        ? "Upload is done. Waiting for the worker to start reading the document."
        : "Reading text from the pages.",
    };
  }
  if (pipeline.current) {
    return { title: `Now: ${pipeline.current.label}`, detail: pipeline.current.hint };
  }
  if (pipeline.overall === "queued") {
    return { title: "In the queue", detail: "Your FIR is waiting to be processed." };
  }
  return { title: "Processing file", detail: "Reading the document and pulling out people, events, and links." };
}

function humanizeStep(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatJobSteps(steps: unknown): string {
  if (Array.isArray(steps) && steps.length > 0) {
    return steps
      .map((step) => (typeof step === "string" ? humanizeStep(step) : JSON.stringify(step)))
      .join(" → ");
  }

  if (steps && typeof steps === "object") {
    return Object.entries(steps as Record<string, unknown>)
      .map(([key, value]) => {
        if (value && typeof value === "object" && "status" in value) {
          return `${humanizeStep(key)} (${String((value as { status: unknown }).status).toLowerCase()})`;
        }
        if (typeof value === "string") {
          return `${humanizeStep(key)} (${value.toLowerCase()})`;
        }
        return humanizeStep(key);
      })
      .join(" → ");
  }

  return "";
}

export function jobStatusLabel(status?: string) {
  const value = String(status || "").toLowerCase();
  if (value === "queued") return "queued";
  if (value === "completed") return "completed";
  if (value === "failed") return "failed";
  if (value === "processing" || value === "running") return "processing";
  return "processing";
}

export async function loadWorkspaceCase(caseCode: string) {
  const localRes = await fetch(`/api/cases/${caseCode}`);
  const localData = await localRes.json();
  if (!localData.success || !localData.case) return null;

  const found = localData.case;
  if (!found.ai_case_id) return found;

  try {
    let liveRes = await fetch(`/api/ai/case?case_id=${found.ai_case_id}`);
    let live = await liveRes.json();

    if (!live.success && liveRes.status === 404) {
      await fetch("/api/ai/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_code: caseCode }),
      });

      const refreshedRes = await fetch(`/api/cases/${caseCode}`);
      const refreshed = await refreshedRes.json();
      if (refreshed.success && refreshed.case) {
        Object.assign(found, refreshed.case);
      }

      if (found.ai_case_id) {
        liveRes = await fetch(`/api/ai/case?case_id=${found.ai_case_id}`);
        live = await liveRes.json();
      }
    }

    if (!live.success || !live.case) return found;

    const ai = live.case;
    found.ai_extracted_data = {
      ...(found.ai_extracted_data || {}),
      persons: ai.persons ?? found.ai_extracted_data?.persons,
      unknown_identities: ai.unknown_identities ?? found.ai_extracted_data?.unknown_identities,
      incidents: ai.incidents ?? found.ai_extracted_data?.incidents,
      relationships: ai.relationships ?? found.ai_extracted_data?.relationships,
      entities: ai.entities ?? found.ai_extracted_data?.entities,
    };
    found.documents = ai.documents || [];
    found.ingestion_jobs = ai.ingestion_jobs || [];
  } catch (error) {
    console.error("Failed to load live FIR case:", error);
  }

  return found;
}
