"use client";

import Image from "next/image";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import CaseChatDrawer from "@/components/CaseChatDrawer";

interface SourceData {
  type: string;
  title: string;
  content: string;
  uploaded_at?: string;
}

interface PersonRecord {
  name?: string;
  canonical_name?: string;
  role?: string;
  phone?: string;
  notes?: string;
}

interface UnknownIdentityRecord {
  alias?: string;
  identifier?: string;
  description?: string;
}

interface IncidentRecord {
  title?: string;
  summary?: string;
  description?: string;
}

interface RelationshipRecord {
  source?: string;
  target?: string;
  type?: string;
}

interface AiExtractedData {
  persons?: PersonRecord[];
  unknown_identities?: UnknownIdentityRecord[];
  incidents?: IncidentRecord[];
  relationships?: RelationshipRecord[];
}

interface CaseData {
  _id: string;
  case_code: string;
  title: string;
  status: string;
  investigation_summary?: string;
  sources?: SourceData[];
  ai_case_id?: string;
  ai_extracted_data?: AiExtractedData;
}

type ActiveTab = "sources" | "persons" | "unknowns" | "incidents" | "relations";

export default function CaseWorkspace() {
  const { caseCode } = useParams();
  const router = useRouter();

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [modalType, setModalType] = useState<string | null>(null);
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [previewSource, setPreviewSource] = useState<SourceData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [isSubmittingNotes, setIsSubmittingNotes] = useState(false);

  // AI Pipeline States
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<"idle" | "queued" | "processing" | "completed" | "failed">("idle");
  const [activeTab, setActiveTab] = useState<ActiveTab>("sources");

  const docInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const fetchCase = useCallback(async () => {
    const res = await fetch("/api/cases");
    const data = await res.json();
    if (data.success) {
      const found = data.cases.find((c: CaseData) => c.case_code === caseCode);
      setCaseData(found);
    }
  }, [caseCode]);

  useEffect(() => {
    // Initial hydration/fetch pattern is intentional; the data is loaded from the API and
    // then rendered without creating a stale loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCase();
  }, [fetchCase]);

  // Status Polling via Next.js Proxy (No CORS)
useEffect(() => {
    if (!jobId || jobStatus === "completed" || jobStatus === "failed") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/ai/job/${jobId}`);
        const data = await res.json();

        if (data && data.status) {
          const st = String(data.status).toLowerCase();
          setJobStatus(st as "idle" | "queued" | "processing" | "completed" | "failed");

          if (st === "completed") {

            // Render backend se extracted data sync karke MongoDB me daalo
            if (caseData?.ai_case_id) {
              await fetch("/api/ai/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  case_code: caseCode,
                  ai_case_id: caseData.ai_case_id,
                }),
              });
            }

            fetchCase();
          }
        }
      } catch (e) {
        console.error("Job polling error:", e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobId, jobStatus, caseData?.ai_case_id, caseCode, fetchCase]);
async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, type: string) {
    const file = e.target.files?.[0];
    if (!file || !caseData) return;

    // Strict validation for FIR Documents
    if (type === "DOCUMENT" && !file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please upload a valid .pdf file. Text/Word files are not supported by the AI parser.");
      e.target.value = "";
      return;
    }

    setSubmitting(true);
    const reader = new FileReader();

    reader.onload = async () => {
      const base64Data = reader.result as string;

      if (caseData.ai_case_id && (type === "DOCUMENT" || type === "IMAGE")) {
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
          if (res.ok && result.job_id) {
            setJobId(result.job_id);
            setJobStatus("processing");
          } else {
            console.error("Upload proxy response error:", result);
            setJobStatus("failed");
          }
        } catch (uploadErr) {
          console.error("Upload proxy failed:", uploadErr);
          setJobStatus("failed");
        }
      }

      await saveSourceToDB(type, file.name, base64Data);
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function saveSourceToDB(type: string, title: string, content: string) {
    try {
      const res = await fetch(`/api/cases/${caseCode}/sources`, {
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
        fetchCase();
      }
    } finally {
      setSubmitting(false);
    }
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
        alert("Interrogation intel submitted successfully!");
        setNotesText("");
      } else {
        alert("Submission failed. Check backend status.");
      }
    } catch (err) {
      alert("Network error occurred.");
      console.error("Interrogation submit error:", err);
    } finally {
      setIsSubmittingNotes(false);
    }
  };

  if (!caseData) return <div className="p-8 text-neutral-500 font-mono">Loading workspace...</div>;

  const aiData = caseData.ai_extracted_data || {};

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 font-mono p-8 max-w-[1180px] mx-auto">
      <input type="file" ref={docInputRef} onChange={(e) => handleFileUpload(e, "DOCUMENT")} accept=".pdf,.docx,.txt" className="hidden" />
      <input type="file" ref={csvInputRef} onChange={(e) => handleFileUpload(e, "CSV")} accept=".csv,.xlsx" className="hidden" />
      <input type="file" ref={imgInputRef} onChange={(e) => handleFileUpload(e, "IMAGE")} accept="image/*" className="hidden" />

      <button onClick={() => router.push("/investigator/dashboard")} className="text-xs text-neutral-500 hover:text-white mb-4">
        ← DASHBOARD
      </button>

      <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-6">
        <div>
          <span className="text-xs text-orange-500 font-bold">{caseData.case_code}</span>
          <h1 className="text-3xl font-black text-white mt-1">{caseData.title}</h1>
          <p className="text-xs text-neutral-400 mt-2">{caseData.investigation_summary || "No summary provided."}</p>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 bg-orange-500/10 border border-orange-500/30 text-orange-400">
              {caseData.status}
            </span>
            <button
              onClick={() => setIsChatOpen(true)}
              className="text-xs bg-zinc-900 border border-orange-500/40 text-orange-400 px-3 py-1 rounded hover:bg-orange-500 hover:text-black transition"
            >
              OPEN AI COPILOT
            </button>
          </div>
          {caseData.ai_case_id && (
            <div className="text-[10px] text-neutral-500 mt-0 font-mono">AI_UUID: {caseData.ai_case_id.slice(0, 8)}...</div>
          )}
        </div>
      </div>

      <CaseChatDrawer
        aiCaseId={caseData?.ai_case_id ?? ""}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      {/* AI Pipeline Live Status Bar */}
      {jobStatus !== "idle" && (
        <div className="mb-8 p-4 border border-orange-500/30 bg-orange-500/[0.03] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${
              jobStatus === "completed" ? "bg-emerald-400" : jobStatus === "failed" ? "bg-red-500" : "bg-orange-400 animate-ping"
            }`} />
            <div>
              <div className="text-xs font-bold text-white uppercase">AI FIR Processing Engine: {jobStatus}</div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                {jobStatus === "queued" && "FIR queued for background S3/SQS ingestion..."}
                {jobStatus === "processing" && "Performing OCR, Gemini Entity Extraction & Graph Linking..."}
                {jobStatus === "completed" && "Entity extraction complete. Knowledge graph ready."}
                {jobStatus === "failed" && "Processing failed. Check document format."}
              </div>
            </div>
          </div>
          {jobId && <span className="text-[10px] text-neutral-500 font-mono">JOB: {jobId.slice(0, 8)}</span>}
        </div>
      )}

      {/* Ingestion Cards */}
      <div className="mb-10">
        <div className="text-xs font-bold tracking-widest text-neutral-300">MULTI-SOURCE DATA INGESTION</div>
        <div className="text-[11px] text-neutral-500 mt-1 mb-5">Bring different intelligence sources into this case workspace.</div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="border border-white/10 bg-white/[0.01] p-6 text-center hover:border-orange-500/40">
            <div className="text-xs font-bold text-white">DOCUMENTS / FIR</div>
            <div className="text-[10px] text-neutral-500 mt-1">PDF, DOCX, TXT</div>
            <button
              disabled={submitting}
              onClick={() => docInputRef.current?.click()}
              className="mt-4 text-[11px] font-bold text-orange-500 hover:underline disabled:opacity-50"
            >
              ↑ INGEST & PROCESS
            </button>
          </div>

          <div className="border border-white/10 bg-white/[0.01] p-6 text-center hover:border-orange-500/40">
            <div className="text-xs font-bold text-white">CSV / EXCEL</div>
            <div className="text-[10px] text-neutral-500 mt-1">CDR, BANK STATEMENTS</div>
            <button
              disabled={submitting}
              onClick={() => csvInputRef.current?.click()}
              className="mt-4 text-[11px] font-bold text-orange-500 hover:underline disabled:opacity-50"
            >
              ↑ INGEST SPREADSHEET
            </button>
          </div>

          <div className="border border-white/10 bg-white/[0.01] p-6 text-center hover:border-orange-500/40">
            <div className="text-xs font-bold text-white">IMAGE EVIDENCE</div>
            <div className="text-[10px] text-neutral-500 mt-1">CCTV, SCENE, VEHICLES</div>
            <button
              disabled={submitting}
              onClick={() => imgInputRef.current?.click()}
              className="mt-4 text-[11px] font-bold text-orange-500 hover:underline disabled:opacity-50"
            >
              ↑ INGEST IMAGE
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="border border-zinc-800 bg-zinc-950 p-4 rounded">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-zinc-300">INTERROGATION NOTES</span>
              <button
                onClick={handleNotesSubmit}
                disabled={isSubmittingNotes}
                className="text-[11px] bg-orange-600 hover:bg-orange-500 text-white font-semibold px-2.5 py-1 rounded disabled:opacity-50"
              >
                {isSubmittingNotes ? "ANALYZING..." : "INGEST INTEL"}
              </button>
            </div>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Paste interrogation statements, confessions, or informant tips..."
              className="w-full h-20 bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-200 outline-none focus:border-orange-500 resize-none"
            />
          </div>
          <div className="border border-white/10 bg-white/[0.01] p-5">
            <div className="text-xs font-bold text-white">URL / OSINT INTEL</div>
            <div className="text-[10px] text-neutral-500 mb-3">Reference OSINT or public record link</div>
            <button onClick={() => setModalType("URL")} className="w-full text-left text-xs text-neutral-500 border border-white/10 p-3 bg-black">
              https://...
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10 mb-6 flex gap-6 text-xs font-bold">
        {[
          { key: "sources", label: `RAW EVIDENCE (${caseData.sources?.length || 0})` },
          { key: "persons", label: `IDENTIFIED PERSONS (${aiData.persons?.length || 0})` },
          { key: "unknowns", label: `UNKNOWN IDENTITIES (${aiData.unknown_identities?.length || 0})` },
          { key: "incidents", label: `INCIDENTS (${aiData.incidents?.length || 0})` },
          { key: "relations", label: `RELATIONSHIPS (${aiData.relationships?.length || 0})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as ActiveTab)}
            className={`pb-3 border-b-2 transition-all ${
              activeTab === t.key ? "border-orange-500 text-orange-400" : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Sources */}
      {activeTab === "sources" && (
        <div className="grid grid-cols-3 gap-3">
          {(!caseData.sources || caseData.sources.length === 0) ? (
            <div className="col-span-3 text-xs text-neutral-500 p-8 text-center border border-white/5">
              No evidence sources attached yet.
            </div>
          ) : (
            caseData.sources.map((s: SourceData, i: number) => (
              <div key={i} onClick={() => setPreviewSource(s)} className="border border-white/10 bg-white/[0.02] p-4 cursor-pointer hover:border-orange-500/30">
                <span className="text-[9px] px-2 py-0.5 bg-orange-500/10 text-orange-400 font-bold">{s.type}</span>
                <div className="text-xs font-bold text-white mt-2 truncate">{s.title}</div>
                <div className="text-[10px] text-neutral-500 mt-1">Click to inspect ↗</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Persons */}
      {activeTab === "persons" && (
        <div className="space-y-3">
          {(aiData?.persons?.length ?? 0) > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {(aiData?.persons ?? []).map((p: PersonRecord, idx: number) => (
                <div key={idx} className="border border-white/10 bg-white/[0.02] p-4">
                  <div className="text-xs font-bold text-white">{p.name || p.canonical_name || "Unnamed Person"}</div>
                  <div className="text-[10px] text-orange-400 mt-1">ROLE: {p.role || "Role unassigned"}</div>
                  {p.phone && <div className="text-[11px] text-neutral-400 mt-2">📞 {p.phone}</div>}
                  {p.notes && <div className="text-[11px] text-neutral-500 mt-2 leading-relaxed">{p.notes}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 border border-dashed border-zinc-800 rounded text-center text-zinc-500 text-sm">
              No identified persons detected in this document yet.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Unknowns */}
      {activeTab === "unknowns" && (
        <div className="grid grid-cols-2 gap-3">
          {(!aiData.unknown_identities || aiData.unknown_identities.length === 0) ? (
            <div className="col-span-2 text-xs text-neutral-500 p-8 text-center border border-white/5">
              No unknown aliases or shadowy identifiers flagged.
            </div>
          ) : (
            aiData.unknown_identities.map((u: UnknownIdentityRecord, idx: number) => (
              <div key={idx} className="border border-red-500/20 bg-red-500/[0.02] p-4">
                <div className="text-xs font-bold text-red-400">{u.alias || u.identifier || "Unknown Subject"}</div>
                <div className="text-[11px] text-neutral-400 mt-1">{u.description || "Unidentified accomplice"}</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Incidents */}
      {activeTab === "incidents" && (
        <div className="space-y-3">
          {(aiData?.incidents?.length ?? 0) > 0 ? (
            (aiData?.incidents ?? []).map((inc: IncidentRecord, idx: number) => (
              <div key={idx} className="p-4 border border-zinc-800 bg-zinc-950 rounded">
                <p className="font-semibold text-zinc-200">{inc.title || "FIR Incident"}</p>
                <p className="text-xs text-zinc-400 mt-1">
                  {inc.description || inc.summary || "Detailed narrative pending AI extraction / resolution."}
                </p>
              </div>
            ))
          ) : (
            <div className="p-6 border border-dashed border-zinc-800 rounded text-center text-zinc-500 text-sm">
              No incident statements found.
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Relations */}
      {activeTab === "relations" && (
        <div className="space-y-2">
          {(!aiData.relationships || aiData.relationships.length === 0) ? (
            <div className="text-xs text-neutral-500 p-8 text-center border border-white/5">
              Relationships will appear after Graph Entity linking finishes.
            </div>
          ) : (
            aiData.relationships.map((rel: RelationshipRecord, idx: number) => (
              <div key={idx} className="border border-white/10 bg-black p-3 flex items-center justify-between text-xs">
                <span className="font-bold text-white">{rel.source || "Entity A"}</span>
                <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 text-[10px] font-bold uppercase tracking-wider">
                  ── {rel.type || "LINKED_TO"} ──▶
                </span>
                <span className="font-bold text-white">{rel.target || "Entity B"}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal & Preview */}
      {modalType && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleModalSubmit} className="border border-white/20 bg-[#0a0a0a] p-6 max-w-md w-full">
            <h3 className="text-sm font-bold text-white mb-4">INGEST SOURCE: {modalType}</h3>
            <input
              value={sourceTitle}
              onChange={(e) => setSourceTitle(e.target.value)}
              placeholder="Source Title"
              className="w-full border border-white/10 bg-black p-2.5 text-xs text-white mb-3 outline-none"
              required
            />
            <textarea
              value={sourceContent}
              onChange={(e) => setSourceContent(e.target.value)}
              placeholder={modalType === "URL" ? "https://..." : "Write intelligence notes..."}
              className="w-full border border-white/10 bg-black p-2.5 text-xs text-white mb-4 outline-none"
              rows={4}
              required
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 border border-white/10 text-xs">
                CANCEL
              </button>
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-orange-600 text-xs font-bold text-white">
                {submitting ? "INGESTING..." : "SAVE SOURCE"}
              </button>
            </div>
          </form>
        </div>
      )}

      {previewSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="flex h-[80vh] w-full max-w-3xl flex-col border border-white/20 bg-[#0c0c0d] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold tracking-widest text-orange-400">
                  {previewSource.type}
                </span>
                <h3 className="max-w-md truncate text-sm font-bold text-white">{previewSource.title}</h3>
              </div>
              <button onClick={() => setPreviewSource(null)} className="px-2 text-sm text-neutral-500 hover:text-white">✕</button>
            </div>

            <div className="flex-1 overflow-hidden bg-[#050505] p-6 flex items-center justify-center">
              {previewSource.type === "IMAGE" && (
                <div className="flex h-full w-full items-center justify-center">
                  <Image
                    src={previewSource.content}
                    alt={previewSource.title}
                    width={1200}
                    height={800}
                    unoptimized
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}

              {(previewSource.type === "NOTES" || previewSource.type === "URL") && (
                <div className="h-full w-full overflow-y-auto p-4 font-mono text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">
                  {previewSource.content}
                </div>
              )}

              {previewSource.type !== "IMAGE" && previewSource.type !== "NOTES" && previewSource.type !== "URL" && (
                <div className="flex flex-col items-center justify-center text-center p-8 border border-white/10 bg-white/[0.01] rounded max-w-md">
                  <div className="text-4xl mb-3">📁</div>
                  <h4 className="text-sm font-bold text-white mb-2">{previewSource.title}</h4>
                  <p className="text-xs text-neutral-400 mb-6">Download to inspect document locally.</p>
                  {previewSource.content.startsWith("data:") ? (
                    <a
                      href={previewSource.content}
                      download={previewSource.title}
                      className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-6 py-3 transition-colors"
                    >
                      DOWNLOAD FILE ⤓
                    </a>
                  ) : (
                    <span className="text-xs text-red-400">Invalid file data.</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}