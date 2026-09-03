"use client";

import Image from "next/image";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import CaseChatDrawer from "@/components/CaseChatDrawer";
import CaseTimelineView from "@/components/CaseTimelineView";
import ForensicDossierPrint from "@/components/ForensicDossierPrint";

interface SourceData {
  type: string;
  title: string;
  content: string;
  uploaded_at?: string;
}

interface PersonProfile {
  identity?: { name?: string; aliases?: string[] };
  person_id?: string;
  name?: string;
  canonical_name?: string;
  role?: string;
  phone?: string;
  contact?: { phones?: string[] };
  addresses?: { text?: string }[];
}

interface PersonRecord extends PersonProfile {
  person?: PersonProfile;
  roles?: string[];
}

interface UnknownIdentityRecord {
  label?: string;
  alias?: string;
  identifier?: string;
  description?: string;
  status?: string;
  roles?: string[];
}

interface IncidentRecord {
  title?: string;
  summary?: string;
  description?: string;
  key_points?: string[];
  time?: { start?: string };
  extraction?: { method?: string };
}

interface RelationRecord {
  from?: { id?: string };
  to?: { id?: string };
  source?: string;
  target?: string;
  type?: string;
  evidence?: string;
}

interface AiExtractedData {
  persons?: PersonRecord[];
  unknown_identities?: UnknownIdentityRecord[];
  incidents?: IncidentRecord[];
  relationships?: RelationRecord[];
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

interface GraphNode {
  id: string;
  label?: string;
  type?: string;
}

interface GraphEdge {
  id?: string;
  from?: { id?: string; type?: string };
  to?: { id?: string; type?: string };
  source?: string;
  target?: string;
  type?: string;
  evidence?: string;
  label?: string;
}

interface GraphData {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  relationships?: GraphEdge[];
}

interface AnalysisResult {
  summary?: string;
  key_findings?: string[];
  [key: string]: unknown;
}

type ActiveTab = "sources" | "persons" | "unknowns" | "incidents" | "relations" | "graph";

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

  // Analysis & Graph States
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

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
    void (async () => {
      await fetchCase();
    })();
  }, [fetchCase]);

  // Sync with AI Backend
  const syncAiData = useCallback(async (aiCaseId: string) => {
    try {
      await fetch("/api/ai/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_code: caseCode,
          ai_case_id: aiCaseId,
        }),
      });
      await fetchCase();
    } catch (err) {
      console.error("Sync error:", err);
    }
  }, [caseCode, fetchCase]);

  // Load graph data for the workspace and printable dossier
  useEffect(() => {
    if (!caseData?.ai_case_id) return;

    async function fetchGraph() {
      setLoadingGraph(true);
      try {
        const res = await fetch(`/api/ai/graph?case_id=${caseData?.ai_case_id}`);
        if (res.ok) {
          const data = await res.json();
          setGraphData(data);
        }
      } catch (err) {
        console.error("Failed to load graph data:", err);
      } finally {
        setLoadingGraph(false);
      }
    }

    fetchGraph();
  }, [activeTab, caseData?.ai_case_id]);

  // Handle Run Analysis Action
  const handleRunAnalysis = async () => {
    if (!caseData?.ai_case_id) {
      alert("No AI Case ID linked to this case.");
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch("/api/ai/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseData.ai_case_id }),
      });
      const data = await res.json();
      if (res.ok) {
        setAnalysisResult(data);
        await fetchCase();
      } else {
        alert(`Analysis Error: ${data.error || data.detail || "Failed"}`);
      }
    } catch {
      alert("Failed to trigger analysis.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Polling via Next.js Proxy
  useEffect(() => {
    if (!jobId || jobStatus === "completed" || jobStatus === "failed") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/ai/job/${jobId}`);
        const data = await res.json();

        if (data && data.status) {
          const rawStatus = String(data.status).toUpperCase();

          if (rawStatus === "COMPLETED" || data.steps?.persistence === "COMPLETED") {
            setJobStatus("completed");
            clearInterval(interval);

            if (caseData?.ai_case_id) {
              await syncAiData(caseData.ai_case_id);
            }
          } else if (rawStatus === "FAILED" && data.error) {
            setJobStatus("failed");
            clearInterval(interval);
          } else {
            setJobStatus("processing");
          }
        }
      } catch (e) {
        console.error("Job polling error:", e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobId, jobStatus, caseData?.ai_case_id, syncAiData]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, type: string) {
    const file = e.target.files?.[0];
    if (!file || !caseData) return;

    if (type === "DOCUMENT" && !file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please upload a valid .pdf file.");
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
            setJobStatus("failed");
          }
        } catch {
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
        if (caseData?.ai_case_id) syncAiData(caseData.ai_case_id);
      } else {
        alert("Submission failed.");
      }
    } catch {
      alert("Network error.");
    } finally {
      setIsSubmittingNotes(false);
    }
  };

  if (!caseData) return <div className="p-8 text-neutral-500 font-mono">Loading workspace...</div>;

  const aiData = caseData.ai_extracted_data || {};
  const personsList = aiData.persons || [];
  const unknownsList = aiData.unknown_identities || [];
  const incidentsList = aiData.incidents || [];
  const relationsList = aiData.relationships || [];

  const getEntityName = (id: string) => {
    const found = personsList.find(
      (item) => (item.person?.person_id || item.person_id) === id
    );
    return found?.person?.identity?.name || found?.name || id;
  };

  const graphNodes = graphData?.nodes || [];
  const graphEdges = graphData?.edges || graphData?.relationships || [];

  return (
    <>
      <div className="min-h-screen bg-[#050505] text-neutral-200 font-mono p-8 max-w-[1180px] mx-auto print:hidden">
      <input type="file" ref={docInputRef} onChange={(e) => handleFileUpload(e, "DOCUMENT")} accept=".pdf" className="hidden" />
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
            <button
              onClick={handleRunAnalysis}
              disabled={analyzing || !caseData.ai_case_id}
              className="text-xs bg-orange-950/40 border border-orange-600/50 text-orange-400 px-3 py-1 rounded font-bold hover:bg-orange-600 hover:text-black transition disabled:opacity-50"
            >
              {analyzing ? "ANALYZING..." : "⚡ RUN ANALYSIS"}
            </button>
            <button
              onClick={() => caseData?.ai_case_id && syncAiData(caseData.ai_case_id)}
              className="text-xs bg-zinc-900 border border-zinc-700 text-zinc-300 px-2.5 py-1 rounded hover:border-white"
            >
              🔄 SYNC INTEL
            </button>
            <button
              onClick={() => window.print()}
              className="text-xs bg-zinc-900 border border-zinc-700 text-zinc-300 px-2.5 py-1 rounded hover:border-white transition flex items-center gap-1.5"
            >
              📄 EXPORT DOSSIER
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

      {/* AI Analysis Live Findings Result Card */}
      {analysisResult && (
        <div className="mb-8 p-5 border border-orange-500/50 bg-orange-950/20 rounded font-mono text-xs shadow-xl">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-orange-900/40">
            <span className="text-orange-400 font-bold tracking-widest uppercase flex items-center gap-2">
              ⚡ LIVE ANALYSIS FINDINGS
            </span>
            <button
              onClick={() => setAnalysisResult(null)}
              className="text-neutral-500 hover:text-white px-2 py-0.5 text-xs border border-white/10 rounded"
            >
              ✕ DISMISS
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-3 text-neutral-300">
            {analysisResult.summary && (
              <div>
                <span className="text-[10px] text-neutral-400 font-bold uppercase">Summary:</span>
                <p className="mt-1 text-zinc-300 leading-relaxed">{analysisResult.summary}</p>
              </div>
            )}

            {analysisResult.key_findings && (
              <div>
                <span className="text-[10px] text-neutral-400 font-bold uppercase">Key Findings:</span>
                <ul className="mt-1 list-disc list-inside space-y-1 text-zinc-300">
                  {analysisResult.key_findings.map((finding: string, i: number) => (
                    <li key={i}>{finding}</li>
                  ))}
                </ul>
              </div>
            )}

            {!analysisResult.summary && (
              <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-zinc-300">
                {typeof analysisResult === "string"
                  ? analysisResult
                  : JSON.stringify(analysisResult, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* AI Pipeline Live Status Bar */}
      {jobStatus !== "idle" && (
        <div className="mb-8 p-4 border border-orange-500/30 bg-orange-500/3 flex items-center justify-between">
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
                {jobStatus === "failed" && "Processing status pending or failed."}
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
          <div className="border border-white/10 bg-white/1 p-6 text-center hover:border-orange-500/40">
            <div className="text-xs font-bold text-white">DOCUMENTS / FIR</div>
            <div className="text-[10px] text-neutral-500 mt-1">PDF ONLY</div>
            <button
              disabled={submitting}
              onClick={() => docInputRef.current?.click()}
              className="mt-4 text-[11px] font-bold text-orange-500 hover:underline disabled:opacity-50"
            >
              ↑ INGEST & PROCESS
            </button>
          </div>

          <div className="border border-white/10 bg-white/1 p-6 text-center hover:border-orange-500/40">
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

          <div className="border border-white/10 bg-white/1 p-6 text-center hover:border-orange-500/40">
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
          <div className="border border-white/10 bg-white/1 p-5">
            <div className="text-xs font-bold text-white">URL / OSINT INTEL</div>
            <div className="text-[10px] text-neutral-500 mb-3">Reference OSINT or public record link</div>
            <button onClick={() => setModalType("URL")} className="w-full text-left text-xs text-neutral-500 border border-white/10 p-3 bg-black">
              https://...
            </button>
          </div>
        </div>
      </div>

      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setIsTimelineOpen(true)}
          className="border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-[10px] font-bold tracking-widest text-orange-400 transition-colors hover:bg-orange-500 hover:text-black"
        >
          VIEW TIMELINE ({incidentsList.length})
        </button>
      </div>

      {/* Tabs Header */}
      <div className="border-b border-white/10 mb-6 flex gap-6 text-xs font-bold overflow-x-auto">
        {[
          { key: "sources", label: `RAW EVIDENCE (${caseData.sources?.length || 0})` },
          { key: "persons", label: `IDENTIFIED PERSONS (${personsList.length})` },
          { key: "unknowns", label: `UNKNOWN IDENTITIES (${unknownsList.length})` },
          { key: "incidents", label: `INCIDENTS (${incidentsList.length})` },
          { key: "relations", label: `RELATIONSHIPS (${relationsList.length})` },
          { key: "graph", label: `NETWORK GRAPH` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as ActiveTab)}
            className={`pb-3 border-b-2 transition-all whitespace-nowrap ${
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
              <div key={i} onClick={() => setPreviewSource(s)} className="border border-white/10 bg-white/2 p-4 cursor-pointer hover:border-orange-500/30">
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
          {personsList.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {personsList.map((item: PersonRecord, idx: number) => {
                const p = item.person || item;
                const name = p.identity?.name || p.name || p.canonical_name || "Unnamed Person";
                const role = (item.roles && item.roles[0]) || p.role || "PERSON OF INTEREST";
                const phone = p.contact?.phones?.[0] || p.phone || null;
                const address = p.addresses?.[0]?.text || null;
                const aliases = p.identity?.aliases?.join(", ") || null;

                return (
                  <div key={idx} className="border border-white/10 bg-white/2 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-bold text-white">{name}</div>
                        <span className="text-[9px] px-2 py-0.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold uppercase">
                          {role}
                        </span>
                      </div>
                      {aliases && <div className="text-[10px] text-orange-400/80 mt-1">aka {aliases}</div>}
                      {phone && <div className="text-[11px] text-neutral-400 mt-2">📞 {phone}</div>}
                      {address && <div className="text-[11px] text-neutral-500 mt-1">📍 {address}</div>}
                    </div>
                  </div>
                );
              })}
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
          {unknownsList.length === 0 ? (
            <div className="col-span-2 text-xs text-neutral-500 p-8 text-center border border-white/5">
              No unknown aliases or shadowy identifiers flagged.
            </div>
          ) : (
            unknownsList.map((u: UnknownIdentityRecord, idx: number) => (
              <div key={idx} className="border border-red-500/30 bg-red-950/10 p-4 rounded flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-red-400">🎭 {u.label || u.alias || "Unknown Node"}</span>
                    <span className="text-[9px] px-2 py-0.5 bg-red-900/40 border border-red-700/50 text-red-300 font-bold uppercase">
                      {u.status || "UNIDENTIFIED"}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                    {u.description?.replace(/^Unidentified Node:\s*/i, "") || "Unidentified accomplice in network."}
                  </p>
                </div>
                <div className="mt-3 text-[10px] text-neutral-500">
                  ROLE: {u.roles?.[0] || "UNKNOWN"}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Incidents */}
      {activeTab === "incidents" && (
        <div className="space-y-3">
          {incidentsList.length > 0 ? (
            incidentsList.map((inc: IncidentRecord, idx: number) => (
              <div key={idx} className="p-4 border border-zinc-800 bg-zinc-950 rounded">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-orange-400 uppercase tracking-wide">
                    {inc.time?.start ? `DATE LOGGED: ${inc.time.start}` : "INCIDENT LOG"}
                  </span>
                  <span className="text-[9px] px-2 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-400">
                    {inc.extraction?.method || "PARSED"}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                  {inc.description || inc.title || inc.summary || "Detailed narrative pending AI extraction."}
                </p>
                {inc.key_points && inc.key_points.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-900">
                    <div className="text-[10px] text-zinc-500 font-bold uppercase mb-2">Key Extracted Points:</div>
                    <ul className="space-y-1">
                      {inc.key_points.map((pt: string, i: number) => (
                        <li key={i} className="text-[11px] text-zinc-400 flex items-start gap-2">
                          <span className="text-orange-500 mt-0.5">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
          {relationsList.length === 0 ? (
            <div className="text-xs text-neutral-500 p-8 text-center border border-white/5">
              Relationships will appear after Graph Entity linking finishes.
            </div>
          ) : (
            relationsList.map((rel: RelationRecord, idx: number) => {
              const fromName = getEntityName(rel.from?.id || rel.source || "Node A");
              const toName = getEntityName(rel.to?.id || rel.target || "Node B");

              return (
                <div key={idx} className="border border-zinc-800 bg-zinc-950 p-4 rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{fromName}</span>
                    <span className="px-2.5 py-0.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-bold uppercase">
                      ── {rel.type || "LINKED_TO"} ──▶
                    </span>
                    <span className="text-xs font-bold text-white">{toName}</span>
                  </div>
                  {rel.evidence && (
                    <p className="text-[11px] text-zinc-400 italic leading-relaxed mt-1">
                      &quot;{rel.evidence}&quot;
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 6: Network Graph */}
      {activeTab === "graph" && (
        <div className="border border-zinc-800 bg-zinc-950 p-6 rounded space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Interactive Link Analysis Network
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Visual entity map generated via AI case reasoning
              </p>
            </div>
            <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded text-neutral-400">
              {graphNodes.length} Entities • {graphEdges.length} Links
            </span>
          </div>

          {loadingGraph ? (
            <div className="p-12 text-center text-xs text-neutral-500">
              Generating graph layout...
            </div>
          ) : graphNodes.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-500 border border-dashed border-zinc-800 rounded">
              No graph entities found. Click &quot;⚡ RUN ANALYSIS&quot; to compute network topology.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Circular SVG Visual Canvas */}
              <div className="border border-zinc-850 bg-black/60 rounded-lg p-4 overflow-x-auto">
                <svg viewBox="0 0 820 440" className="w-full min-w-190 h-100 select-none">
                  <defs>
                    <marker
                      id="arrow-investigator"
                      viewBox="0 0 10 10"
                      refX="24"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#ea580c" />
                    </marker>
                  </defs>

                  {(() => {
                    const width = 820;
                    const height = 440;
                    const centerX = width / 2;
                    const centerY = height / 2;
                    const radius = 160;

                    const coords: Record<string, { x: number; y: number }> = {};
                    graphNodes.forEach((node, idx) => {
                      const angle = (2 * Math.PI * idx) / graphNodes.length;
                      coords[node.id] = {
                        x: centerX + radius * Math.cos(angle),
                        y: centerY + radius * Math.sin(angle),
                      };
                    });

                    return (
                      <>
                        {/* Connecting Lines */}
                        {graphEdges.map((e, i) => {
                          const fId = e.from?.id || e.source || "";
                          const tId = e.to?.id || e.target || "";
                          const start = coords[fId];
                          const end = coords[tId];

                          if (!start || !end) return null;

                          return (
                            <g key={`edge-${i}`}>
                              <line
                                x1={start.x}
                                y1={start.y}
                                x2={end.x}
                                y2={end.y}
                                stroke="#ea580c"
                                strokeWidth="1.5"
                                strokeDasharray="3 3"
                                markerEnd="url(#arrow-investigator)"
                                opacity="0.6"
                              />
                            </g>
                          );
                        })}

                        {/* Nodes */}
                        {graphNodes.map((n, i) => {
                          const pt = coords[n.id];
                          if (!pt) return null;
                          const isPerson = n.type === "PERSON";
                          const isUnknown = n.type === "UNKNOWN";

                          return (
                            <g key={`node-${i}`} className="cursor-pointer">
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r="18"
                                fill={isPerson ? "#7c2d12" : isUnknown ? "#581c87" : "#27272a"}
                                stroke={isPerson ? "#ea580c" : isUnknown ? "#c084fc" : "#71717a"}
                                strokeWidth="2"
                              />
                              <text
                                x={pt.x}
                                y={pt.y + 4}
                                textAnchor="middle"
                                fill="#ffffff"
                                fontSize="9"
                                fontWeight="bold"
                              >
                                {isPerson ? "👤" : isUnknown ? "🎭" : "📌"}
                              </text>
                              <text
                                x={pt.x}
                                y={pt.y + 30}
                                textAnchor="middle"
                                fill="#e4e4e7"
                                fontSize="10"
                                fontFamily="monospace"
                              >
                                {n.label?.slice(0, 16) || n.id.slice(0, 8)}
                              </text>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>

              {/* Edge Evidence List */}
              <div className="space-y-2">
                <div className="text-[10px] text-neutral-400 font-bold uppercase mb-2">
                  Targeted Links & Evidence
                </div>
                {graphEdges.map((e, i) => {
                  const fId = e.from?.id || e.source || "";
                  const tId = e.to?.id || e.target || "";
                  const fLabel = graphNodes.find((n) => n.id === fId)?.label || fId;
                  const tLabel = graphNodes.find((n) => n.id === tId)?.label || tId;

                  return (
                    <div
                      key={i}
                      className="text-xs font-mono bg-zinc-950 border border-zinc-800 p-2.5 rounded flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold">{fLabel}</span>
                        <span className="text-orange-400 font-bold px-2 text-[10px] bg-orange-500/10 border border-orange-500/30 rounded py-0.5">
                          ──[{e.type || "LINKED_TO"}]──▶
                        </span>
                        <span className="text-white font-bold">{tLabel}</span>
                      </div>
                      {e.evidence && (
                        <p className="text-[10px] text-neutral-500 italic pt-1 border-t border-zinc-900">
                          &quot;{e.evidence}&quot;
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {isTimelineOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setIsTimelineOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex justify-end">
              <button
                onClick={() => setIsTimelineOpen(false)}
                className="border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-neutral-400 hover:border-orange-500 hover:text-white"
              >
                ✕ CLOSE
              </button>
            </div>
            <CaseTimelineView incidents={incidentsList} themeColor="orange" />
          </div>
        </div>
      )}

      {/* Modals & Previews */}
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
                <div className="flex flex-col items-center justify-center text-center p-8 border border-white/10 bg-white/1 rounded max-w-md">
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

      {/* Printable Forensic Dossier */}
      <ForensicDossierPrint
        caseData={caseData}
        persons={personsList}
        unknowns={unknownsList}
        incidents={incidentsList}
        relations={relationsList}
        graphNodes={graphNodes}
        graphEdges={graphEdges}
      />
    </>
  );
}