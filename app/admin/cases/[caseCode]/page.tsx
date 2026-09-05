"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import CaseTimelineView from "@/components/CaseTimelineView";
import ForensicDossierPrint from "@/components/ForensicDossierPrint";
import SourcePreviewModal from "@/components/SourcePreviewModal";
import CaseNetworkMap from "@/components/CaseNetworkMap";
import CaseAnalysisCard from "@/components/CaseAnalysisCard";
import CaseSummaryStrip from "@/components/CaseSummaryStrip";
import { LiveIngestionJob } from "@/components/IngestionPipeline";
import { formatInvestigator } from "@/lib/auth";
import { jobStatusLabel, loadWorkspaceCase } from "@/lib/workspaceCase";
import type { FirDocument, FirIngestionJob } from "@/lib/workspaceCase";
import type { CaseSummary, InvestigationAnalysis } from "@/lib/aiApi";

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
  description?: string;
  time?: { start?: string };
  extraction?: { method?: string };
  key_points?: string[];
}

interface RelationRecord {
  from?: { id?: string };
  to?: { id?: string };
  source?: string;
  target?: string;
  type?: string;
  evidence?: string;
}

interface EntityRecord {
  id?: string;
  entity_id?: string;
  type?: string;
  label?: string;
  name?: string;
  value?: string;
  normalized_value?: string;
  text?: string;
}

interface AiExtractedData {
  persons?: PersonRecord[];
  unknown_identities?: UnknownIdentityRecord[];
  incidents?: IncidentRecord[];
  relationships?: RelationRecord[];
  entities?: EntityRecord[];
}

interface CaseData {
  _id: string;
  case_code: string;
  title: string;
  status: string;
  assigned_investigator?: string;
  investigation_summary?: string;
  sources?: SourceData[];
  ai_case_id?: string;
  ai_extracted_data?: AiExtractedData;
  documents?: FirDocument[];
  ingestion_jobs?: FirIngestionJob[];
}

interface GraphNode {
  id: string;
  label?: string;
  type?: string;
}

interface GraphEntityRef {
  id?: string;
}

interface GraphEdge {
  from?: GraphEntityRef | string;
  to?: GraphEntityRef | string;
  source?: string;
  target?: string;
  type?: string;
  label?: string;
  evidence?: string;
}

interface GraphData {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  relationships?: GraphEdge[];
}

type AnalysisResult = InvestigationAnalysis;

type ActiveTab = "sources" | "persons" | "unknowns" | "incidents" | "entities" | "relations" | "graph";

function humanize(value?: string | null, fallback = "") {
  if (!value) return fallback;
  return value.replace(/[_-]+/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminCaseView() {
  const { caseCode } = useParams();
  const router = useRouter();

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [previewSource, setPreviewSource] = useState<SourceData | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("sources");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [caseSummary, setCaseSummary] = useState<CaseSummary | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [linkingAi, setLinkingAi] = useState(false);
  const [closingCase, setClosingCase] = useState(false);

  const fetchCase = useCallback(async () => {
    const code = Array.isArray(caseCode) ? caseCode[0] : caseCode;
    if (!code) return;
    const found = await loadWorkspaceCase(code);
    setCaseData(found);
  }, [caseCode]);

  const linkAiCase = async () => {
    const code = Array.isArray(caseCode) ? caseCode[0] : caseCode;
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
  };

  useEffect(() => {
    void (async () => {
      await fetchCase();
    })();
  }, [fetchCase]);

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

  useEffect(() => {
    if (!caseData?.ai_case_id) return;

    async function loadSavedAnalysis() {
      try {
        const res = await fetch(`/api/ai/analysis?case_id=${caseData?.ai_case_id}`);
        const data = await res.json();
        if (res.ok && data.success) setAnalysisResult(data);
      } catch (error) {
        console.error("Failed to load saved analysis:", error);
      }
    }

    void loadSavedAnalysis();
  }, [caseData?.ai_case_id]);

  useEffect(() => {
    if (!caseData?.ai_case_id) {
      setCaseSummary(null);
      return;
    }

    async function loadSummary() {
      try {
        const res = await fetch(`/api/ai/summary?case_id=${caseData?.ai_case_id}`);
        const data = await res.json();
        if (res.ok && data.success) setCaseSummary(data.summary);
      } catch (error) {
        console.error("Failed to load FIR case summary:", error);
      }
    }

    void loadSummary();
  }, [caseData?.ai_case_id, analysisResult?.case_id]);

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
      if (res.ok && data.success !== false) {
        setAnalysisResult(data);
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

  const handleCloseCase = async () => {
    const code = Array.isArray(caseCode) ? caseCode[0] : caseCode;
    if (!code || closingCase) return;
    if (!window.confirm("Close this case on the FIR API and mark it closed in NETRA?")) return;

    setClosingCase(true);
    try {
      const res = await fetch("/api/ai/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_code: code }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Could not close this case.");
        return;
      }
      await fetchCase();
      if (caseData?.ai_case_id) {
        const summaryRes = await fetch(`/api/ai/summary?case_id=${caseData.ai_case_id}`);
        const summaryData = await summaryRes.json();
        if (summaryRes.ok && summaryData.success) setCaseSummary(summaryData.summary);
      }
    } finally {
      setClosingCase(false);
    }
  };

  if (!caseData) return <div className="p-8 text-[14px] text-neutral-500">Loading case…</div>;

  const activeJob = (caseData.ingestion_jobs || []).find((job) => {
    const status = jobStatusLabel(job.status);
    return status !== "completed" && status !== "failed";
  });

  const aiData = caseData.ai_extracted_data || {};
  const personsList = aiData.persons || [];
  const unknownsList = aiData.unknown_identities || [];
  const incidentsList = aiData.incidents || [];
  const relationsList = aiData.relationships || [];
  const entitiesList = aiData.entities || [];

  const getEntityName = (id: string) => {
    const found = personsList.find(
      (item: PersonRecord) => (item.person?.person_id || item.person_id) === id
    );
    return found?.person?.identity?.name || found?.name || id;
  };

  const graphNodes = graphData?.nodes || [];
  const graphEdges = graphData?.edges || graphData?.relationships || [];

  return (
    <>
    <div className="relative min-h-screen overflow-x-hidden bg-[#050505] text-neutral-200 print:hidden">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(239,68,68,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.5) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 90% 90% at 50% 0%, black 20%, transparent 75%)",
        }}
      />
      <div className="pointer-events-none fixed -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-red-600/10 blur-[130px]" />
      <div className="pointer-events-none fixed -bottom-40 right-0 h-[500px] w-[500px] rounded-full bg-orange-600/10 blur-[130px]" />

      <div className="relative z-10 mx-auto max-w-[1180px] px-4 py-8 sm:px-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => router.push("/admin/dashboard")} className="text-[13px] text-neutral-400 hover:text-white">
          ← Intelligence Workspace
        </button>

        <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleRunAnalysis}
          disabled={analyzing || !caseData.ai_case_id || caseData.status === "CLOSED" || caseSummary?.status === "CLOSED"}
          className="h-10 rounded-lg border border-red-500/35 bg-red-500/[0.12] px-4 text-[13px] font-medium text-red-200 transition-colors hover:border-red-400/60 hover:bg-red-500/20 hover:text-white disabled:opacity-50"
        >
          {analyzing ? "Analyzing…" : "Run analysis"}
        </button>
        {caseData.status !== "CLOSED" && caseSummary?.status !== "CLOSED" ? (
          <button
            onClick={() => void handleCloseCase()}
            disabled={closingCase}
            className="h-10 rounded-lg border border-white/[0.12] bg-white/[0.04] px-4 text-[13px] font-medium text-neutral-200 transition-colors hover:border-white/25 hover:text-white disabled:opacity-50"
          >
            {closingCase ? "Closing…" : "Close case"}
          </button>
        ) : (
          <span className="h-10 rounded-lg border border-white/10 px-4 py-2 text-[13px] text-neutral-500">
            Closed
          </span>
        )}
        <button
          onClick={() => window.print()}
          className="h-10 rounded-lg border border-white/[0.12] bg-white/[0.04] px-4 text-[13px] font-medium text-neutral-200 transition-colors hover:border-white/25 hover:text-white"
        >
          Export report
        </button>
        </div>
      </div>

      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <span className="text-[11px] font-semibold tracking-wide text-red-500">{caseData.case_code}</span>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-white sm:text-[32px]">{caseData.title}</h1>
          <p className="mt-2 text-[13px] leading-6 text-neutral-500">{caseData.investigation_summary || "No summary provided."}</p>
        </div>
        <div className="w-full shrink-0 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-4 sm:w-[240px]">
          <div className="text-[12px] text-neutral-500">Status</div>
          <div className="mt-1 text-[14px] font-medium text-white">
            {caseData.status === "UNDER_REVIEW"
              ? "Under review"
              : caseData.status === "CLOSED"
                ? "Closed"
                : "Active"}
          </div>

          <div className="mt-4 text-[12px] text-neutral-500">Investigator</div>
          <div className="mt-1 text-[14px] font-medium leading-5 text-white">
            {formatInvestigator(caseData.assigned_investigator)}
          </div>

          <div className="mt-4 text-[12px] text-neutral-500">FIR API</div>
          <div className="mt-1 text-[14px] font-medium text-white">
            {caseData.ai_case_id ? "Linked" : "Not linked"}
          </div>
          {!caseData.ai_case_id && (
            <button
              onClick={linkAiCase}
              disabled={linkingAi}
              className="mt-3 text-[13px] text-red-300 hover:underline disabled:opacity-50"
            >
              {linkingAi ? "Linking…" : "Link to FIR API"}
            </button>
          )}
        </div>
      </div>

      {activeJob && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/[0.04] p-4">
          <div className="mb-3 text-[12px] text-neutral-500">FIR processing pipeline</div>
          <LiveIngestionJob jobId={activeJob.job_id || activeJob.id} initial={activeJob} />
        </div>
      )}

      {caseSummary && <CaseSummaryStrip summary={caseSummary} />}

      {analysisResult && (
        <CaseAnalysisCard result={analysisResult} onClose={() => setAnalysisResult(null)} />
      )}

      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setIsTimelineOpen(true)}
          className="h-10 rounded-lg border border-red-500/35 bg-red-500/[0.12] px-4 text-[13px] font-medium text-red-200 transition-colors hover:border-red-400/60 hover:bg-red-500/20 hover:text-white"
        >
          Timeline ({incidentsList.length})
        </button>
      </div>

      <div className="mb-6 flex gap-5 overflow-x-auto border-b border-white/10 text-[13px]">
        {[
          { key: "sources", label: `Evidence (${(caseData.sources?.length || 0) + (caseData.documents?.length || 0)})` },
          { key: "persons", label: `People (${personsList.length})` },
          { key: "unknowns", label: `Unknown identities (${unknownsList.length})` },
          { key: "incidents", label: `Incidents (${incidentsList.length})` },
          { key: "entities", label: `Entities (${entitiesList.length})` },
          { key: "relations", label: `Relationships (${relationsList.length})` },
          { key: "graph", label: "Network" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as ActiveTab)}
            className={`whitespace-nowrap border-b-2 pb-3 ${
              activeTab === t.key ? "border-red-500 text-red-300" : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "sources" && (
        <div className="space-y-6">
          {(!caseData.sources || caseData.sources.length === 0) && (!caseData.documents || caseData.documents.length === 0) ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.01] p-8 text-center text-[13px] text-neutral-500">
              No files have been added to this case yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(caseData.sources || []).map((s: SourceData, i: number) => (
                <div
                  key={`local-${i}`}
                  onClick={() => setPreviewSource(s)}
                  className="cursor-pointer rounded-lg border border-white/10 bg-white/[0.02] p-4 hover:border-red-500/40"
                >
                  <span className="text-[11px] text-red-400">{humanize(s.type)}</span>
                  <div className="mt-2 truncate text-[14px] font-medium text-white">{s.title}</div>
                  <div className="mt-1 text-[12px] text-neutral-500">Open</div>
                </div>
              ))}
              {(caseData.documents || []).map((doc, i) => (
                <div key={doc.document_id || doc.id || i} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                  <span className="text-[11px] text-red-400">FIR document</span>
                  <div className="mt-2 truncate text-[14px] font-medium text-white">
                    {doc.title || doc.filename || doc.file_name || "Uploaded document"}
                  </div>
                  <div className="mt-1 text-[12px] text-neutral-500">{doc.status ? humanize(doc.status) : "From FIR API"}</div>
                </div>
              ))}
            </div>
          )}
          {(caseData.ingestion_jobs?.length || 0) > 0 && (
            <div>
              <div className="mb-2 text-[12px] text-neutral-400">FIR processing pipeline</div>
              <div className="space-y-4">
                {caseData.ingestion_jobs?.map((job, i) => (
                  <div key={job.job_id || job.id || i} className="rounded-lg border border-white/10 p-4">
                    <LiveIngestionJob jobId={job.job_id || job.id} initial={job} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "entities" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {entitiesList.length === 0 ? (
            <div className="col-span-full rounded-lg border border-white/5 p-8 text-center text-[13px] text-neutral-500">
              No entities have been extracted for this case yet.
            </div>
          ) : (
            entitiesList.map((entity, i) => (
              <div key={entity.id || entity.entity_id || i} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                <span className="text-[11px] text-red-400">{humanize(entity.type, "Entity")}</span>
                <div className="mt-2 text-[14px] font-medium text-white">
                  {entity.label || entity.name || entity.value || entity.normalized_value || entity.text || "Unnamed entity"}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Persons */}
      {activeTab === "persons" && (
        <div className="space-y-3">
          {personsList.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {personsList.map((item: PersonRecord, idx: number) => {
                const p = item.person || item;
                const name = p.identity?.name || p.name || p.canonical_name || "Unnamed person";
                const role = humanize((item.roles && item.roles[0]) || p.role, "Person of interest");
                const phone = p.contact?.phones?.[0] || p.phone || null;
                const address = p.addresses?.[0]?.text || null;
                const aliases = p.identity?.aliases?.join(", ") || null;

                return (
                  <div key={idx} className="flex flex-col justify-between rounded-lg border border-white/10 bg-white/[0.02] p-4">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[14px] font-medium text-white">{name}</div>
                        <span className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-300">
                          {role}
                        </span>
                      </div>
                      {aliases && <div className="mt-1 text-[12px] text-neutral-400">Also known as {aliases}</div>}
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {unknownsList.length === 0 ? (
            <div className="col-span-full rounded-lg border border-white/5 p-8 text-center text-[13px] text-neutral-500">
              No unknown identities in this case.
            </div>
          ) : (
            unknownsList.map((u: UnknownIdentityRecord, idx: number) => (
              <div key={idx} className="flex flex-col justify-between rounded-lg border border-red-500/30 bg-red-950/10 p-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[14px] font-medium text-red-300">{u.label || u.alias || "Unknown person"}</span>
                    <span className="rounded border border-red-700/50 bg-red-900/40 px-2 py-0.5 text-[11px] text-red-200">
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
            incidentsList.map((inc: IncidentRecord, idx: number) => (
              <div key={idx} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-red-300">
                    {inc.time?.start ? inc.time.start : "Incident"}
                  </span>
                  {inc.extraction?.method && (
                    <span className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-400">
                      {humanize(inc.extraction.method)}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-[13px] leading-6 text-zinc-300">
                  {inc.description || inc.title}
                </p>

                {inc.key_points && inc.key_points.length > 0 && (
                  <div className="mt-3 border-t border-zinc-900 pt-3">
                    <div className="mb-2 text-[12px] text-zinc-500">Key points</div>
                    <ul className="space-y-1">
                      {inc.key_points.map((pt: string, i: number) => (
                        <li key={i} className="text-[11px] text-zinc-400 flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">•</span>
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
          {relationsList.length === 0 ? (
            <div className="text-xs text-neutral-500 p-8 text-center border border-white/5">
              No relationships recorded yet.
            </div>
          ) : (
            relationsList.map((rel: RelationRecord, idx: number) => {
              const fromName = getEntityName(rel.from?.id || rel.source || "Node A");
              const toName = getEntityName(rel.to?.id || rel.target || "Node B");

              return (
                <div key={idx} className="border border-zinc-800 bg-zinc-950 p-4 rounded">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-2">
                    <span className="text-xs font-bold text-white">{fromName}</span>
                    <span className="rounded border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[12px] text-red-300">
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

      {activeTab === "graph" && (
        <CaseNetworkMap
          nodes={graphNodes}
          edges={graphEdges}
          loading={loadingGraph}
          accent="red"
          onSelectNode={setSelectedNode}
        />
      )}

      {/* Node Inspector Slide-over Panel */}
      {selectedNode && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-96 flex-col justify-between border-l border-zinc-800 bg-[#0a0a0c] p-6 shadow-2xl">
          <div>
            <div className="mb-5 flex items-center justify-between border-b border-zinc-800 pb-4">
              <span className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[12px] text-red-300">
                {humanize(selectedNode.type, "Person")}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-[13px] text-neutral-500 hover:text-white"
              >
                Close
              </button>
            </div>

            <h2 className="mb-2 text-lg font-semibold text-white">{selectedNode.label || selectedNode.id}</h2>
            <p className="mb-6 break-all text-[12px] text-neutral-500">Ref: {selectedNode.id}</p>

            <div className="space-y-3">
              <div className="text-[13px] text-neutral-400">
                Connections
              </div>
              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                {graphEdges
                  .filter((edge) => {
                    const fromId = typeof edge.from === "object" ? edge.from?.id : edge.from;
                    const toId = typeof edge.to === "object" ? edge.to?.id : edge.to;
                    return (fromId || edge.source) === selectedNode.id || (toId || edge.target) === selectedNode.id;
                  })
                  .map((edge, idx) => {
                    const fromId = (typeof edge.from === "object" ? edge.from?.id : edge.from) || edge.source || "";
                    const toId = (typeof edge.to === "object" ? edge.to?.id : edge.to) || edge.target || "";
                    const isSource = fromId === selectedNode.id;
                    const targetNode = graphNodes.find((node) => node.id === (isSource ? toId : fromId));

                    return (
                      <div key={idx} className="p-3 bg-zinc-950 border border-zinc-850 rounded text-xs">
                        <div className="mb-1 text-[12px] text-red-300">
                          {isSource ? "To" : "From"} · {humanize(edge.type, "Linked")}
                        </div>
                        <div className="text-zinc-200 font-bold">
                          {targetNode?.label || (isSource ? toId : fromId)}
                        </div>
                        {edge.evidence && (
                          <div className="text-[10px] text-neutral-500 italic mt-1.5 border-t border-zinc-900 pt-1">
                            &quot;{edge.evidence}&quot;
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          <button
            onClick={() => setSelectedNode(null)}
            className="mt-4 w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 text-[13px] text-neutral-300 transition-colors hover:bg-zinc-800"
          >
            Close
          </button>
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
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-[13px] text-neutral-400 hover:border-red-500 hover:text-white"
              >
                Close
              </button>
            </div>
            <CaseTimelineView incidents={incidentsList} themeColor="red" />
          </div>
        </div>
      )}

      {previewSource && (
        <SourcePreviewModal source={previewSource} onClose={() => setPreviewSource(null)} />
      )}
    </div>
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