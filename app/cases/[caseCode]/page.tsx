"use client";

import Image from "next/image";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  id?: string;
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
  source_type?: string;
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

interface NexusMatch {
  suspectName: string;
  matchedCaseCode: string;
  matchedCaseTitle: string;
  matchType: string;
}

type ActiveTab = "sources" | "persons" | "unknowns" | "incidents" | "relations" | "graph";

function humanize(value?: string | null, fallback = "") {
  if (!value) return fallback;
  return value.replace(/[_-]+/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

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
  const [nexusMatches, setNexusMatches] = useState<NexusMatch[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddRelModal, setShowAddRelModal] = useState(false);
  const [relSource, setRelSource] = useState("");
  const [relTarget, setRelTarget] = useState("");
  const [relType, setRelType] = useState("COLLABORATOR");
  const [relEvidence, setRelEvidence] = useState("");
  const [relSubmitting, setRelSubmitting] = useState(false);

  const docInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const logActivity = async (action: string) => {
    try {
      await fetch(`/api/cases/${caseCode}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, actor: "INVESTIGATOR" }),
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  };

  const handleAddRelation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!relSource || !relTarget || relSubmitting) return;

    setRelSubmitting(true);
    try {
      const res = await fetch(`/api/cases/${caseCode}/relations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: relSource,
          target: relTarget,
          type: relType,
          evidence: relEvidence,
        }),
      });
      const data = await res.json();
      if (data.success) {
        void logActivity(`Added manual relation link: ${relSource} -> ${relTarget} [${relType}]`);
        setShowAddRelModal(false);
        setRelSource("");
        setRelTarget("");
        setRelEvidence("");
        await fetchCase();
      } else {
        alert(data.error || "Could not save that connection.");
      }
    } catch (error) {
      console.error("Failed to link relations:", error);
    } finally {
      setRelSubmitting(false);
    }
  };

  const fetchCase = useCallback(async () => {
    const res = await fetch("/api/cases");
    const data = await res.json();
    if (data.success) {
      const found = data.cases.find((c: CaseData) => c.case_code === caseCode);
      setNexusMatches([]);
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
      alert("This case is not linked to analysis yet.");
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
        void logActivity("Triggered live graph analysis & inference engine");
        await fetchCase();
      } else {
        alert(data.error || data.detail || "Analysis failed. Please try again.");
      }
    } catch {
      alert("Could not start analysis. Please try again.");
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
        void logActivity(`Ingested new ${type.toLowerCase()} evidence: ${title}`);
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
        alert("Interview notes added.");
        void logActivity("Submitted interrogation statement intel for AI linking");
        setNotesText("");
        if (caseData?.ai_case_id) syncAiData(caseData.ai_case_id);
      } else {
        alert("Could not add those notes. Please try again.");
      }
    } catch {
      alert("Could not add those notes. Please try again.");
    } finally {
      setIsSubmittingNotes(false);
    }
  };

  const aiData = caseData?.ai_extracted_data || {};
  const personsList = useMemo(() => aiData.persons || [], [aiData.persons]);
  const unknownsList = aiData.unknown_identities || [];
  const incidentsList = aiData.incidents || [];
  const relationsList = aiData.relationships || [];

  useEffect(() => {
    const currentCaseCode = caseData?.case_code;
    if (!currentCaseCode || personsList.length === 0) return;

    const suspectsPayload = personsList.map((item) => {
      const person = item.person || item;
      return {
        name: person.identity?.name || person.name || person.canonical_name || "",
        phones: person.contact?.phones || [person.phone].filter(Boolean),
      };
    });

    async function checkNexus() {
      try {
        const res = await fetch("/api/ai/cross-match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            current_case_code: currentCaseCode,
            suspects: suspectsPayload,
          }),
        });
        const data = await res.json();
        if (data.success && data.matches?.length > 0) {
          setNexusMatches(data.matches);
        } else {
          setNexusMatches([]);
        }
      } catch (error) {
        console.error("Nexus check error:", error);
      }
    }

    void checkNexus();
  }, [caseData?.case_code, personsList]);

  if (!caseData) return <div className="p-8 text-[14px] text-neutral-500">Loading case…</div>;

  const getEntityName = (id: string) => {
    const found = personsList.find(
      (item) => (item.person?.person_id || item.person_id) === id
    );
    return found?.person?.identity?.name || found?.name || id;
  };

  const graphNodes = graphData?.nodes || [];
  const graphEdges = [
    ...(graphData?.edges || graphData?.relationships || []),
    ...relationsList.filter((relation) => relation.source_type === "MANUAL_FIELD_ENTRY"),
  ];
  const query = searchQuery.toLowerCase().trim();

  const filteredPersons = personsList.filter((item: PersonRecord) => {
    const person = item.person || item;
    const name = (person.identity?.name || person.name || person.canonical_name || "").toLowerCase();
    const role = ((item.roles && item.roles[0]) || person.role || "").toLowerCase();
    const phone = (person.contact?.phones?.join(" ") || person.phone || "").toLowerCase();
    const aliases = (person.identity?.aliases?.join(" ") || "").toLowerCase();
    return name.includes(query) || role.includes(query) || phone.includes(query) || aliases.includes(query);
  });

  const filteredUnknowns = unknownsList.filter((unknown: UnknownIdentityRecord) => {
    const label = (unknown.label || unknown.alias || "").toLowerCase();
    const description = (unknown.description || "").toLowerCase();
    return label.includes(query) || description.includes(query);
  });

  const filteredIncidents = incidentsList.filter((incident: IncidentRecord) => {
    const text = (incident.title || incident.description || incident.summary || "").toLowerCase();
    const points = (incident.key_points?.join(" ") || "").toLowerCase();
    return text.includes(query) || points.includes(query);
  });

  const filteredRelations = relationsList.filter((relation: RelationRecord) => {
    const fromName = getEntityName(relation.from?.id || relation.source || "").toLowerCase();
    const toName = getEntityName(relation.to?.id || relation.target || "").toLowerCase();
    const type = (relation.type || "").toLowerCase();
    const evidence = (relation.evidence || "").toLowerCase();
    return fromName.includes(query) || toName.includes(query) || type.includes(query) || evidence.includes(query);
  });

  const handleExportDossier = () => {
    void logActivity("Exported legal case dossier PDF");
    window.print();
  };

  return (
    <>
      <div className="mx-auto min-h-screen max-w-295 bg-[#050505] p-8 text-neutral-200 print:hidden">
      <input type="file" ref={docInputRef} onChange={(e) => handleFileUpload(e, "DOCUMENT")} accept=".pdf" className="hidden" />
      <input type="file" ref={csvInputRef} onChange={(e) => handleFileUpload(e, "CSV")} accept=".csv,.xlsx" className="hidden" />
      <input type="file" ref={imgInputRef} onChange={(e) => handleFileUpload(e, "IMAGE")} accept="image/*" className="hidden" />

      <button onClick={() => router.push("/investigator/dashboard")} className="text-xs text-neutral-500 hover:text-white mb-4">
        ← Intelligence Workspace
        </button>

      {nexusMatches.length > 0 && (
        <div className="mb-6 border border-red-500/50 bg-red-950/25 p-4 rounded text-xs font-mono">
          <div className="mb-2 flex items-center gap-2 text-[14px] font-medium text-red-300">
            <span className="h-2.5 w-2.5 animate-ping rounded-full bg-red-500" />
            Possible link to {nexusMatches.length} other {nexusMatches.length === 1 ? "case" : "cases"}
          </div>
          <p className="mb-3 text-[13px] text-zinc-400">
            Someone in this case also appears in another open FIR.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {nexusMatches.map((match, index) => (
              <div key={index} className="p-2.5 bg-black/60 border border-red-900/40 rounded flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">{match.suspectName}</span>
                  <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[11px] text-red-200">
                    Matched by {humanize(match.matchType)}
                  </span>
          </div>
                <span className="text-[12px] text-zinc-500">
                  Also in <strong className="text-red-400">{match.matchedCaseCode}</strong> ({match.matchedCaseTitle})
          </span>
        </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-6">
        <div>
          <span className="text-xs text-orange-500 font-bold">{caseData.case_code}</span>
          <h1 className="text-3xl font-black text-white mt-1">{caseData.title}</h1>
          <p className="text-xs text-neutral-400 mt-2">{caseData.investigation_summary || "No summary provided."}</p>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-[13px] text-orange-300">
              {humanize(caseData.status, caseData.status)}
            </span>
                <button
              onClick={() => setIsChatOpen(true)}
              className="rounded border border-orange-500/40 bg-zinc-900 px-3 py-1 text-[13px] text-orange-300 transition hover:bg-orange-500 hover:text-black"
            >
              Ask copilot
            </button>
            <button
              onClick={handleRunAnalysis}
              disabled={analyzing || !caseData.ai_case_id}
              className="rounded border border-orange-600/50 bg-orange-950/40 px-3 py-1 text-[13px] font-medium text-orange-300 transition hover:bg-orange-600 hover:text-black disabled:opacity-50"
            >
              {analyzing ? "Analyzing…" : "Run analysis"}
            </button>
            <button
              onClick={() => caseData?.ai_case_id && syncAiData(caseData.ai_case_id)}
              className="rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[13px] text-zinc-300 hover:border-white"
            >
              Refresh
            </button>
            <button
              onClick={handleExportDossier}
              className="flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[13px] text-zinc-300 transition hover:border-white"
            >
              Export report
            </button>
                      </div>
          {caseData.ai_case_id ? (
            <div className="text-[12px] text-neutral-500">Analysis ready</div>
          ) : (
            <div className="text-[12px] text-neutral-500">Analysis not linked yet</div>
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
        <div className="mb-8 rounded-lg border border-white/10 bg-white/[0.03] p-5 text-[13px] shadow-xl">
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-[14px] font-medium text-white">
              Analysis results
            </span>
            <button
              onClick={() => setAnalysisResult(null)}
              className="text-[13px] text-neutral-400 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="max-h-80 space-y-3 overflow-y-auto text-neutral-300">
            {analysisResult.summary && (
              <div>
                <span className="text-[12px] text-neutral-500">Summary</span>
                <p className="mt-1 leading-6 text-zinc-300">{analysisResult.summary}</p>
              </div>
            )}

            {analysisResult.key_findings && (
              <div>
                <span className="text-[12px] text-neutral-500">Key findings</span>
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
              <div className="text-[14px] font-medium text-white">
                {jobStatus === "queued" && "In the queue"}
                {jobStatus === "processing" && "Processing file"}
                {jobStatus === "completed" && "Processing complete"}
                {jobStatus === "failed" && "Processing failed"}
              </div>
              <div className="mt-0.5 text-[13px] text-neutral-400">
                {jobStatus === "queued" && "Your FIR is waiting to be processed."}
                {jobStatus === "processing" && "Reading the document and pulling out people, events, and links."}
                {jobStatus === "completed" && "People and connections are ready to review."}
                {jobStatus === "failed" && "Something went wrong. Try uploading again."}
                    </div>
                  </div>
                  </div>
          {jobId && <span className="font-mono text-[11px] text-neutral-500">Job {jobId.slice(0, 8)}</span>}
                </div>
      )}

      {/* Ingestion Cards */}
      <div className="mb-10">
        <div className="text-[14px] font-medium text-neutral-200">Add files to this case</div>
        <div className="mb-5 mt-1 text-[13px] text-neutral-500">Upload reports, records, photos, or notes.</div>

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="border border-white/10 bg-white/1 p-6 text-center hover:border-orange-500/40">
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

          <div className="border border-white/10 bg-white/1 p-6 text-center hover:border-orange-500/40">
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

          <div className="border border-white/10 bg-white/1 p-6 text-center hover:border-orange-500/40">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-medium text-zinc-200">Interview notes</span>
              <button
                onClick={handleNotesSubmit}
                disabled={isSubmittingNotes}
                className="rounded bg-orange-600 px-2.5 py-1 text-[12px] font-medium text-white hover:bg-orange-500 disabled:opacity-50"
              >
                {isSubmittingNotes ? "Adding…" : "Add to case"}
              </button>
                      </div>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Paste interview notes, statements, or tips…"
              className="h-20 w-full resize-none rounded border border-zinc-800 bg-zinc-900 p-2 text-[13px] text-zinc-200 outline-none focus:border-orange-500"
            />
          </div>
          <div className="border border-white/10 bg-white/1 p-5">
            <div className="text-[14px] font-medium text-white">Web link</div>
            <div className="mb-3 text-[12px] text-neutral-500">Add a public record or open-source link</div>
            <button onClick={() => setModalType("URL")} className="w-full text-left text-xs text-neutral-500 border border-white/10 p-3 bg-black">
              https://...
                    </button>
                </div>
                        </div>
                      </div>

      <div className="mb-3 flex justify-end">
                      <button
          onClick={() => setIsTimelineOpen(true)}
          className="h-10 rounded-lg border border-orange-600/50 bg-orange-950/40 px-4 text-[13px] font-medium text-orange-200 transition-colors hover:border-orange-400/60 hover:bg-orange-600/20 hover:text-white"
                      >
          Timeline ({incidentsList.length})
                      </button>
                    </div>

      {/* Quick Search / Filter Bar */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search people, phone numbers, or incidents…"
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3.5 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-orange-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2 text-xs text-neutral-500 hover:text-white"
            >
              ✕
            </button>
          )}
                </div>
        {searchQuery && (
          <span className="text-[11px] text-orange-400 whitespace-nowrap">
            Filtering active
          </span>
        )}
      </div>

      {/* Tabs Header */}
      <div className="mb-6 flex gap-5 overflow-x-auto border-b border-white/10 text-[13px]">
        {[
          { key: "sources", label: `Evidence (${caseData.sources?.length || 0})` },
          { key: "persons", label: `People (${personsList.length})` },
          { key: "unknowns", label: `Unknown identities (${unknownsList.length})` },
          { key: "incidents", label: `Incidents (${incidentsList.length})` },
          { key: "relations", label: `Relationships (${relationsList.length})` },
          { key: "graph", label: "Network" },
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
            <div className="col-span-3 rounded-lg border border-white/5 p-8 text-center text-[13px] text-neutral-500">
              No files have been added to this case yet.
            </div>
          ) : (
            caseData.sources.map((s: SourceData, i: number) => (
              <div key={i} onClick={() => setPreviewSource(s)} className="cursor-pointer border border-white/10 bg-white/2 p-4 hover:border-orange-500/30">
                <span className="bg-orange-500/10 px-2 py-0.5 text-[11px] text-orange-300">{humanize(s.type)}</span>
                <div className="mt-2 truncate text-[14px] font-medium text-white">{s.title}</div>
                <div className="mt-1 text-[12px] text-neutral-500">Open</div>
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
              {filteredPersons.map((item: PersonRecord, idx: number) => {
                const p = item.person || item;
                const name = p.identity?.name || p.name || p.canonical_name || "Unnamed person";
                const role = humanize((item.roles && item.roles[0]) || p.role, "Person of interest");
                const phone = p.contact?.phones?.[0] || p.phone || null;
                const address = p.addresses?.[0]?.text || null;
                const aliases = p.identity?.aliases?.join(", ") || null;

                return (
                  <div key={idx} className="flex flex-col justify-between border border-white/10 bg-white/2 p-4">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[14px] font-medium text-white">{name}</div>
                        <span className="border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[11px] text-orange-300">
                          {role}
                        </span>
                      </div>
                      {aliases && <div className="mt-1 text-[12px] text-orange-400/80">Also known as {aliases}</div>}
                      {phone && <div className="mt-2 text-[13px] text-neutral-400">{phone}</div>}
                      {address && <div className="mt-1 text-[13px] text-neutral-500">{address}</div>}
                    </div>
                  </div>
                    );
                  })}
                </div>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-center text-[13px] text-zinc-500">
              No people have been identified in this case yet.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Unknowns */}
      {activeTab === "unknowns" && (
        <div className="grid grid-cols-2 gap-3">
          {unknownsList.length === 0 ? (
            <div className="col-span-2 rounded-lg border border-white/5 p-8 text-center text-[13px] text-neutral-500">
              No unknown identities in this case.
                </div>
          ) : (
            filteredUnknowns.map((u: UnknownIdentityRecord, idx: number) => (
              <div key={idx} className="flex flex-col justify-between rounded-lg border border-red-500/30 bg-red-950/10 p-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[14px] font-medium text-red-300">{u.label || u.alias || "Unknown person"}</span>
                    <span className="border border-red-700/50 bg-red-900/40 px-2 py-0.5 text-[11px] text-red-200">
                      {humanize(u.status, "Unidentified")}
                    </span>
            </div>
                  <p className="mt-2 text-[13px] leading-6 text-zinc-400">
                    {u.description?.replace(/^Unidentified Node:\s*/i, "") || "Identity is not confirmed yet."}
                  </p>
                </div>
                <div className="mt-3 text-[12px] text-neutral-500">
                  Role: {humanize(u.roles?.[0], "Unknown")}
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
            filteredIncidents.map((inc: IncidentRecord, idx: number) => (
              <div key={idx} className="p-4 border border-zinc-800 bg-zinc-950 rounded">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-orange-300">
                    {inc.time?.start ? inc.time.start : "Incident"}
                  </span>
                  {inc.extraction?.method && (
                    <span className="border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-400">
                      {humanize(inc.extraction.method)}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[13px] leading-6 text-zinc-300">
                  {inc.description || inc.title || inc.summary || "Details will appear after analysis."}
                </p>
                {inc.key_points && inc.key_points.length > 0 && (
                  <div className="mt-3 border-t border-zinc-900 pt-3">
                    <div className="mb-2 text-[12px] text-zinc-500">Key points</div>
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
            <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-center text-[13px] text-zinc-500">
              No incidents recorded yet.
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Relations */}
      {activeTab === "relations" && (
        <div className="space-y-2">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[13px] text-neutral-400">How people are connected</span>
            <button
              onClick={() => setShowAddRelModal(!showAddRelModal)}
              className="rounded border border-orange-500/40 bg-orange-600/20 px-3 py-1 text-[13px] text-orange-300 hover:bg-orange-600/30"
            >
              {showAddRelModal ? "Cancel" : "Add connection"}
            </button>
      </div>

          {showAddRelModal && (
            <form onSubmit={handleAddRelation} className="mb-6 bg-zinc-950 border border-zinc-800 p-4 rounded space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-[12px] text-zinc-500">From</label>
                  <select
                    value={relSource}
                    onChange={(event) => setRelSource(event.target.value)}
                    className="w-full rounded border border-zinc-800 bg-zinc-900 p-2 text-[13px] text-white outline-none"
                    required
                  >
                    <option value="">Select a person</option>
                    {personsList.map((person, index) => {
                      const profile = person.person || person;
                      const id = profile.person_id || profile.id || `p-${index}`;
                      const name = profile.identity?.name || profile.name || id;
                      return <option key={id} value={id}>{name}</option>;
                    })}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[12px] text-zinc-500">Connection type</label>
                  <input
                    type="text"
                    value={relType}
                    onChange={(event) => setRelType(event.target.value)}
                    placeholder="e.g. Calls, Transfers funds, Associate"
                    className="w-full bg-zinc-900 border border-zinc-800 text-white text-xs p-2 rounded outline-none"
                    required
                  />
    </div>

    <div>
                  <label className="mb-1 block text-[12px] text-zinc-500">To</label>
                  <select
                    value={relTarget}
                    onChange={(event) => setRelTarget(event.target.value)}
                    className="w-full rounded border border-zinc-800 bg-zinc-900 p-2 text-[13px] text-white outline-none"
                    required
                  >
                    <option value="">Select a person</option>
                    {personsList.map((person, index) => {
                      const profile = person.person || person;
                      const id = profile.person_id || profile.id || `p-${index}`;
                      const name = profile.identity?.name || profile.name || id;
                      return <option key={id} value={id}>{name}</option>;
                    })}
                  </select>
    </div>
              </div>

          <div>
                <label className="mb-1 block text-[12px] text-zinc-500">Supporting note</label>
                <input
                  type="text"
                  value={relEvidence}
                  onChange={(event) => setRelEvidence(event.target.value)}
                  placeholder="e.g. Call records show 14 calls between 1:00 AM and 3:00 AM."
                  className="w-full bg-zinc-900 border border-zinc-800 text-white text-xs p-2 rounded outline-none"
                />
          </div>

              <button
                type="submit"
                disabled={relSubmitting}
                className="text-xs bg-orange-500 text-black font-bold px-4 py-1.5 rounded hover:bg-orange-400 disabled:opacity-50"
              >
                {relSubmitting ? "Saving…" : "Save connection"}
          </button>
            </form>
          )}

          {relationsList.length === 0 ? (
            <div className="text-xs text-neutral-500 p-8 text-center border border-white/5">
              No relationships recorded yet.
        </div>
          ) : (
            filteredRelations.map((rel: RelationRecord, idx: number) => {
              const fromName = getEntityName(rel.from?.id || rel.source || "Node A");
              const toName = getEntityName(rel.to?.id || rel.target || "Node B");

              return (
                <div key={idx} className="border border-zinc-800 bg-zinc-950 p-4 rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{fromName}</span>
                    <span className="border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-[12px] text-orange-300">
                      {humanize(rel.type, "Linked to")}
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
              <h3 className="text-[14px] font-medium text-white">
                Network map
              </h3>
              <p className="mt-0.5 text-[13px] text-zinc-500">
                People and connections found in this case
              </p>
            </div>
            <span className="rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[12px] text-neutral-400">
              {graphNodes.length} people · {graphEdges.length} links
            </span>
          </div>

          {loadingGraph ? (
            <div className="p-12 text-center text-xs text-neutral-500">
              Building the network map…
        </div>
          ) : graphNodes.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-500 border border-dashed border-zinc-800 rounded">
              No network to show yet. Run analysis first.
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
                <div className="mb-2 text-[12px] text-neutral-400">
                  Connections
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
                        <span className="rounded border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[11px] text-orange-300">
                          {humanize(e.type, "Linked to")}
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
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-[13px] text-neutral-400 hover:border-orange-500 hover:text-white"
              >
                Close
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
            <h3 className="mb-4 text-[15px] font-medium text-white">Add {humanize(modalType)}</h3>
            <input
              value={sourceTitle}
              onChange={(e) => setSourceTitle(e.target.value)}
              placeholder="Title"
              className="mb-3 w-full border border-white/10 bg-black p-2.5 text-[13px] text-white outline-none"
              required
            />
            <textarea
              value={sourceContent}
              onChange={(e) => setSourceContent(e.target.value)}
              placeholder={modalType === "URL" ? "https://..." : "Write notes…"}
              className="mb-4 w-full border border-white/10 bg-black p-2.5 text-[13px] text-white outline-none"
              rows={4}
              required
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModalType(null)} className="border border-white/10 px-4 py-2 text-[13px]">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="bg-orange-600 px-4 py-2 text-[13px] font-medium text-white">
                {submitting ? "Saving…" : "Save"}
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
                <span className="bg-orange-500/10 px-2 py-0.5 text-[12px] text-orange-300">
                  {humanize(previewSource.type)}
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
                  <p className="mb-6 text-[13px] text-neutral-400">Download to review the full file.</p>
                  {previewSource.content.startsWith("data:") ? (
                    <a
                      href={previewSource.content}
                      download={previewSource.title}
                      className="bg-orange-600 px-6 py-3 text-[13px] font-medium text-white transition-colors hover:bg-orange-500"
                    >
                      Download file
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