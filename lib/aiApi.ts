const BASE_URL = process.env.NEXT_PUBLIC_AI_API_URL || "https://fir-intelligence-api.onrender.com/api/v1";

// 1. Health check (Render server ko sleep se jagane ke liye)
export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

// 2. Create Case on AI Backend
export async function createAICase(caseNumber: string, title: string) {
  const res = await fetch(`${BASE_URL}/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ case_number: caseNumber, title }),
  });
  if (!res.ok) throw new Error("Failed to create case on AI server");
  return res.json(); // returns { case_id, case_number, title }
}

// 3. Upload Document / FIR to Case
export async function uploadFIRDocument(caseId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/cases/${caseId}/documents`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload document");
  return res.json(); // returns { document_id, job_id }
}

// 4. Poll FIR Ingestion Job Status
export async function getJobStatus(jobId: string) {
  const res = await fetch(`${BASE_URL}/firs/jobs/${jobId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch job status");
  return res.json(); // returns { job_id, status: 'queued' | 'processing' | 'completed' | 'failed' }
}

// 5. Get Full Case Details (Entities, Persons, etc.)
export async function getAICaseDetails(caseId: string) {
  const res = await fetch(`${BASE_URL}/cases/${caseId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load case details");
  return res.json();
}

// 6. Get Case Graph Data for Cytoscape
export async function getCaseGraph(caseId: string) {
  const res = await fetch(`${BASE_URL}/cases/${caseId}/graph`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch graph data");
  return res.json();
}

// 7. Case Chat (Interrogation Assistant)
export async function sendCaseChatMessage(caseId: string, message: string) {
  const res = await fetch(`${BASE_URL}/cases/${caseId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error("Failed to send chat message");
  return res.json();
}