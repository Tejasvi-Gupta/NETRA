"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import IngestionPipeline, { LiveIngestionJob } from "@/components/IngestionPipeline";
import { jobStatusLabel, loadWorkspaceCase, type FirIngestionJob } from "@/lib/workspaceCase";

interface CaseData {
  case_code: string;
  title: string;
  ai_case_id?: string;
  ingestion_jobs?: FirIngestionJob[];
}

function humanize(value?: string | null, fallback = "") {
  if (!value) return fallback;
  return value.replace(/[_-]+/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AddFilesPage() {
  const { caseCode } = useParams();
  const router = useRouter();
  const code = Array.isArray(caseCode) ? caseCode[0] : caseCode;

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [modalType, setModalType] = useState<string | null>(null);
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [isSubmittingNotes, setIsSubmittingNotes] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<"idle" | "queued" | "processing" | "completed" | "failed">("idle");
  const [jobSnapshot, setJobSnapshot] = useState<FirIngestionJob | null>(null);
  const [linkingAi, setLinkingAi] = useState(false);

  const docInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const fetchCase = useCallback(async () => {
    if (!code) return;
    const found = await loadWorkspaceCase(code);
    if (!found) return;
    setCaseData(found as CaseData);
    if (jobId) return;
    const jobs: FirIngestionJob[] = found.ingestion_jobs || [];
    const active = jobs.find((job: FirIngestionJob) => {
      const status = jobStatusLabel(job.status);
      return status !== "completed" && status !== "failed";
    }) || jobs[0];
    if (active?.job_id || active?.id) {
      setJobSnapshot(active);
      setJobId(active.job_id || active.id || null);
      setJobStatus(jobStatusLabel(active.status));
    }
  }, [code, jobId]);

  useEffect(() => {
    void fetchCase();
  }, [fetchCase]);

  const logActivity = async (action: string) => {
    try {
      await fetch(`/api/cases/${code}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, actor: "INVESTIGATOR" }),
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  };

  const syncAiData = useCallback(async (aiCaseId: string) => {
    try {
      await fetch("/api/ai/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_code: code,
          ai_case_id: aiCaseId,
        }),
      });
      await fetchCase();
    } catch (err) {
      console.error("Sync error:", err);
    }
  }, [code, fetchCase]);

  const handleJobSettled = useCallback(async (status: "completed" | "failed") => {
    setJobStatus(status);
    if (status === "completed" && caseData?.ai_case_id) {
      await syncAiData(caseData.ai_case_id);
    }
  }, [caseData?.ai_case_id, syncAiData]);

  async function saveSourceToDB(type: string, title: string, content: string) {
    try {
      const res = await fetch(`/api/cases/${code}/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title,
          content,
          ai_case_id: caseData?.ai_case_id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setModalType(null);
        setSourceTitle("");
        setSourceContent("");
        void logActivity(`Added ${type.toLowerCase()}: ${title}`);
        fetchCase();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, type: string) {
    const file = e.target.files?.[0];
    if (!file || !caseData) return;

    if (type === "DOCUMENT" && !file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please upload a PDF file.");
      e.target.value = "";
      return;
    }

    setSubmitting(true);
    const reader = new FileReader();

    reader.onload = async () => {
      const base64Data = reader.result as string;
      let documentId = "";

      if (caseData.ai_case_id) {
        try {
          setJobStatus("queued");
          const uploadData = new FormData();
          uploadData.append("file", file);
          uploadData.append("ai_case_id", caseData.ai_case_id);

          const res = await fetch("/api/ai/upload", {
            method: "POST",
            body: uploadData,
          });

          const result = await res.json();
          documentId = result.document_id || "";
          if (res.ok && result.job_id) {
            setJobSnapshot({
              job_id: result.job_id,
              status: result.status || "QUEUED",
              steps: result.steps,
            });
            setJobId(result.job_id);
            setJobStatus("queued");
          } else {
            setJobStatus("failed");
            alert(result.error || "Could not upload this file to the FIR API.");
            setSubmitting(false);
            return;
          }
        } catch {
          setJobStatus("failed");
        }
      }

      const storedContent = type === "IMAGE" ? base64Data : documentId ? `document_id:${documentId}` : file.name;
      await saveSourceToDB(type, file.name, storedContent);
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleModalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceTitle || !sourceContent || !modalType) return;
    setSubmitting(true);
    await saveSourceToDB(modalType, sourceTitle, sourceContent);
  }

  const handleNotesSubmit = async () => {
    if (!notesText.trim() || isSubmittingNotes) return;
    setIsSubmittingNotes(true);

    try {
      const res = await fetch("/api/ai/interrogate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai_case_id: caseData?.ai_case_id,
          notes: notesText,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        void logActivity("Added interview notes");
        setNotesText("");
        if (result.job_id) {
          setJobId(result.job_id);
          setJobStatus("queued");
        } else if (caseData?.ai_case_id) {
          setJobStatus("processing");
        }
      } else {
        alert("Could not add those notes. Please try again.");
      }
    } catch {
      alert("Could not add those notes. Please try again.");
    } finally {
      setIsSubmittingNotes(false);
    }
  };

  async function linkAiCase() {
    if (!code || linkingAi) return;
    setLinkingAi(true);
    try {
      const res = await fetch("/api/ai/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_code: code }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Could not link this case to the FIR API.");
        return;
      }
      await fetchCase();
    } finally {
      setLinkingAi(false);
    }
  }

  if (!caseData) {
    return <div className="p-8 text-[14px] text-neutral-500">Loading case…</div>;
  }

  return (
    <div className="mx-auto min-h-screen max-w-[860px] p-6 text-neutral-200 sm:p-8">
      <input type="file" ref={docInputRef} onChange={(e) => handleFileUpload(e, "DOCUMENT")} accept=".pdf" className="hidden" />
      <input type="file" ref={csvInputRef} onChange={(e) => handleFileUpload(e, "CSV")} accept=".csv,.xlsx" className="hidden" />
      <input type="file" ref={imgInputRef} onChange={(e) => handleFileUpload(e, "IMAGE")} accept="image/*" className="hidden" />

      <button
        onClick={() => router.push(`/cases/${code}`)}
        className="text-[13px] text-neutral-400 hover:text-white"
      >
        ← Back to case
      </button>

      <div className="mt-6">
        <p className="text-[13px] text-orange-400">{caseData.case_code}</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-white">Add files to this case</h1>
        <p className="mt-2 text-[13px] leading-6 text-neutral-500">
          Upload reports, records, photos, or notes. Processing continues in the background after upload.
        </p>
      </div>

      {!caseData.ai_case_id && (
        <div className="mt-6 rounded-lg border border-orange-500/30 bg-orange-500/[0.04] p-4 text-[13px] text-neutral-300">
          This case is not linked to the FIR API yet, so documents cannot be processed.
          <button onClick={linkAiCase} disabled={linkingAi} className="ml-2 text-orange-300 hover:underline disabled:opacity-50">
            {linkingAi ? "Linking…" : "Link now"}
          </button>
        </div>
      )}

      {(jobStatus !== "idle" || jobId) && (
        <div className="mt-8 rounded-lg border border-orange-500/30 bg-orange-500/[0.04] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-[12px] text-neutral-500">FIR processing pipeline</span>
            {jobId && <span className="font-mono text-[11px] text-neutral-500">Job {jobId.slice(0, 8)}</span>}
          </div>
          {jobId ? (
            <LiveIngestionJob jobId={jobId} initial={jobSnapshot} onSettled={handleJobSettled} />
          ) : (
            <IngestionPipeline status={jobStatus} />
          )}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-6 text-center hover:border-orange-500/40">
          <div className="text-[14px] font-medium text-white">Documents / FIR</div>
          <div className="mt-1 text-[12px] text-neutral-500">PDF only</div>
          <button
            disabled={submitting}
            onClick={() => docInputRef.current?.click()}
            className="mt-4 text-[13px] font-medium text-orange-400 hover:underline disabled:opacity-50"
          >
            Upload and process
          </button>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-6 text-center hover:border-orange-500/40">
          <div className="text-[14px] font-medium text-white">Spreadsheet</div>
          <div className="mt-1 text-[12px] text-neutral-500">CDR, bank statements</div>
          <button
            disabled={submitting}
            onClick={() => csvInputRef.current?.click()}
            className="mt-4 text-[13px] font-medium text-orange-400 hover:underline disabled:opacity-50"
          >
            Upload spreadsheet
          </button>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-6 text-center hover:border-orange-500/40">
          <div className="text-[14px] font-medium text-white">Photos</div>
          <div className="mt-1 text-[12px] text-neutral-500">CCTV, scene, vehicles</div>
          <button
            disabled={submitting}
            onClick={() => imgInputRef.current?.click()}
            className="mt-4 text-[13px] font-medium text-orange-400 hover:underline disabled:opacity-50"
          >
            Upload photo
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-medium text-neutral-200">Interview notes</span>
            <button
              onClick={handleNotesSubmit}
              disabled={isSubmittingNotes}
              className="h-8 rounded-lg border border-orange-600/50 bg-orange-950/40 px-2.5 text-[12px] font-medium text-orange-200 hover:border-orange-400/60 disabled:opacity-50"
            >
              {isSubmittingNotes ? "Adding…" : "Add to case"}
            </button>
          </div>
          <textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            placeholder="Paste interview notes, statements, or tips…"
            className="h-28 w-full resize-none rounded-lg border border-white/[0.12] bg-white/[0.04] p-2.5 text-[13px] text-neutral-200 outline-none focus:border-white/25"
          />
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
          <div className="text-[14px] font-medium text-white">Web link</div>
          <div className="mb-3 text-[12px] text-neutral-500">Add a public record or open-source link</div>
          <button
            onClick={() => setModalType("URL")}
            className="w-full rounded-lg border border-white/10 bg-black p-3 text-left text-[13px] text-neutral-500"
          >
            https://...
          </button>
        </div>
      </div>

      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form onSubmit={handleModalSubmit} className="w-full max-w-md rounded-lg border border-white/20 bg-[#0a0a0a] p-6">
            <h3 className="mb-4 text-[15px] font-medium text-white">Add {humanize(modalType)}</h3>
            <input
              value={sourceTitle}
              onChange={(e) => setSourceTitle(e.target.value)}
              placeholder="Title"
              className="mb-3 w-full rounded-lg border border-white/10 bg-black p-2.5 text-[13px] text-white outline-none"
              required
            />
            <textarea
              value={sourceContent}
              onChange={(e) => setSourceContent(e.target.value)}
              placeholder={modalType === "URL" ? "https://..." : "Write notes…"}
              className="mb-4 w-full rounded-lg border border-white/10 bg-black p-2.5 text-[13px] text-white outline-none"
              rows={4}
              required
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 text-[13px] text-neutral-400 hover:text-white">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-9 rounded-lg border border-orange-600/50 bg-orange-950/40 px-4 text-[13px] font-medium text-orange-200 disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
