"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import CaseChatDrawer from "@/components/CaseChatDrawer";
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

type AnalysisResult = InvestigationAnalysis;

interface NexusMatch {
  suspectName: string;
  matchedCaseCode: string;
  matchedCaseTitle: string;
  matchType: string;
}

type ActiveTab = "sources" | "persons" | "unknowns" | "incidents" | "entities" | "relations" | "graph";

function humanize(value?: string | null, fallback = "") {
  if (!value) return fallback;
  return value.replace(/[_-]+/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function isActiveTab(value: string | null): value is ActiveTab {
  return value === "sources" || value === "persons" || value === "unknowns" || value === "incidents" || value === "entities" || value === "relations" || value === "graph";
}

export default function CaseWorkspacePage() {
  return (
    <Suspense fallback={<div className="p-8 text-[14px] text-neutral-500">Loading case…</div>}>
      <CaseWorkspace />
    </Suspense>
  );
}

function CaseWorkspace() {
  const { caseCode } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [previewSource, setPreviewSource] = useState<SourceData | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("sources");

  // Analysis & Graph States
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [caseSummary, setCaseSummary] = useState<CaseSummary | null>(null);
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
  const [linkingAi, setLinkingAi] = useState(false);
  const [closingCase, setClosingCase] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (isActiveTab(tab)) {
      setActiveTab(tab);
      return;
    }
    if (!tab) setActiveTab("sources");
  }, [searchParams]);

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
    const code = Array.isArray(caseCode) ? caseCode[0] : caseCode;
    if (!code) return;
    const found = await loadWorkspaceCase(code);
    setNexusMatches([]);
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
      void logActivity("Closed the case");
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

  const aiData = caseData?.ai_extracted_data || {};
  const personsList = useMemo(() => aiData.persons || [], [aiData.persons]);
  const unknownsList = aiData.unknown_identities || [];
  const incidentsList = aiData.incidents || [];
  const relationsList = aiData.relationships || [];
  const entitiesList = aiData.entities || [];

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

  const activeJob = (caseData.ingestion_jobs || []).find((job) => {
    const status = jobStatusLabel(job.status);
    return status !== "completed" && status !== "failed";
  });

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

  function selectTab(tab: ActiveTab) {
    setActiveTab(tab);
    const code = Array.isArray(caseCode) ? caseCode[0] : caseCode;
    const next = tab === "sources" ? `/cases/${code}` : `/cases/${code}?tab=${tab}`;
    router.replace(next, { scroll: false });
  }

  return (
    <>
      <div className="mx-auto min-h-screen max-w-295 p-6 text-neutral-200 print:hidden sm:p-8">

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

      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <span className="text-[13px] font-medium text-orange-400">{caseData.case_code}</span>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-white sm:text-[32px]">{caseData.title}</h1>
          <p className="mt-2 text-[13px] leading-6 text-neutral-500">{caseData.investigation_summary || "No summary provided."}</p>
          <p className="mt-3 text-[13px] text-neutral-400">
            Investigator: <span className="text-neutral-200">{formatInvestigator(caseData.assigned_investigator)}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-2.5 py-1.5 text-[13px] text-orange-300">
              {humanize(caseData.status, caseData.status)}
            </span>
            <button
              onClick={() => router.push(`/cases/${caseData.case_code}/add`)}
              className="h-9 rounded-lg border border-orange-600/50 bg-orange-950/40 px-3 text-[13px] font-medium text-orange-200 transition hover:border-orange-400/60 hover:text-white"
            >
              Add files
            </button>
            <button
              onClick={() => setIsChatOpen(true)}
              className="h-9 rounded-lg border border-orange-500/40 bg-zinc-900 px-3 text-[13px] text-orange-300 transition hover:border-orange-400/60 hover:text-white"
            >
              Ask copilot
            </button>
            <button
              onClick={handleRunAnalysis}
              disabled={analyzing || !caseData.ai_case_id || caseData.status === "CLOSED" || caseSummary?.status === "CLOSED"}
              className="h-9 rounded-lg border border-orange-600/50 bg-orange-950/40 px-3 text-[13px] font-medium text-orange-200 transition hover:border-orange-400/60 hover:text-white disabled:opacity-50"
            >
              {analyzing ? "Analyzing…" : "Run analysis"}
            </button>
            {caseData.status !== "CLOSED" && caseSummary?.status !== "CLOSED" ? (
              <button
                onClick={() => void handleCloseCase()}
                disabled={closingCase}
                className="h-9 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 text-[13px] text-neutral-200 hover:border-white/25 hover:text-white disabled:opacity-50"
              >
                {closingCase ? "Closing…" : "Close case"}
              </button>
            ) : (
              <span className="h-9 rounded-lg border border-white/10 px-3 py-2 text-[13px] text-neutral-500">
                Closed
              </span>
            )}
            {!caseData.ai_case_id && (
              <button
                onClick={linkAiCase}
                disabled={linkingAi}
                className="h-9 rounded-lg border border-orange-600/50 bg-orange-950/40 px-3 text-[13px] font-medium text-orange-200 disabled:opacity-50"
              >
                {linkingAi ? "Linking…" : "Link to FIR API"}
              </button>
            )}
            <button
              onClick={() => void fetchCase()}
              className="h-9 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 text-[13px] text-neutral-200 hover:border-white/25 hover:text-white"
            >
              Refresh
            </button>
            <button
              onClick={handleExportDossier}
              className="h-9 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 text-[13px] text-neutral-200 hover:border-white/25 hover:text-white"
            >
              Export report
            </button>
          </div>
          <div className="text-[12px] text-neutral-500">
            {caseData.ai_case_id ? "Linked to FIR API" : "Not linked to FIR API yet"}
          </div>
        </div>
      </div>

      <CaseChatDrawer
        aiCaseId={caseData?.ai_case_id ?? ""}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      {activeJob && (
        <div className="mb-6 rounded-lg border border-orange-500/30 bg-orange-500/[0.04] p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-[12px] text-neutral-500">FIR processing pipeline</span>
            <button
              onClick={() => router.push(`/cases/${caseData.case_code}/add`)}
              className="text-[13px] text-orange-300 hover:underline"
            >
              Add files
            </button>
          </div>
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
            onClick={() => selectTab(t.key as ActiveTab)}
            className={`pb-3 border-b-2 transition-all whitespace-nowrap ${
              activeTab === t.key ? "border-orange-500 text-orange-400" : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {t.label}
                      </button>
        ))}
      </div>

      {activeTab === "sources" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(!caseData.sources || caseData.sources.length === 0) && (!caseData.documents || caseData.documents.length === 0) ? (
              <div className="col-span-full rounded-lg border border-white/5 p-8 text-center">
                <p className="text-[13px] text-neutral-500">No files have been added to this case yet.</p>
                <button
                  onClick={() => router.push(`/cases/${caseData.case_code}/add`)}
                  className="mt-3 text-[13px] font-medium text-orange-400 hover:underline"
                >
                  Add files
                </button>
              </div>
            ) : (
              <>
                {(caseData.sources || []).map((s: SourceData, i: number) => (
                  <div key={`local-${i}`} onClick={() => setPreviewSource(s)} className="cursor-pointer border border-white/10 bg-white/2 p-4 hover:border-orange-500/30">
                    <span className="bg-orange-500/10 px-2 py-0.5 text-[11px] text-orange-300">{humanize(s.type)}</span>
                    <div className="mt-2 truncate text-[14px] font-medium text-white">{s.title}</div>
                    <div className="mt-1 text-[12px] text-neutral-500">Open</div>
                  </div>
                ))}
                {(caseData.documents || []).map((doc, i) => (
                  <div key={doc.document_id || doc.id || i} className="border border-white/10 bg-white/2 p-4">
                    <span className="bg-orange-500/10 px-2 py-0.5 text-[11px] text-orange-300">FIR document</span>
                    <div className="mt-2 truncate text-[14px] font-medium text-white">
                      {doc.title || doc.filename || doc.file_name || "Uploaded document"}
                    </div>
                    <div className="mt-1 text-[12px] text-neutral-500">
                      {doc.status ? humanize(doc.status) : "From FIR API"}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

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
              <div key={entity.id || entity.entity_id || i} className="border border-white/10 bg-white/2 p-4">
                <span className="bg-orange-500/10 px-2 py-0.5 text-[11px] text-orange-300">
                  {humanize(entity.type, "Entity")}
                </span>
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

      {activeTab === "graph" && (
        <CaseNetworkMap nodes={graphNodes} edges={graphEdges} loading={loadingGraph} accent="orange" />
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

      {previewSource && (
        <SourcePreviewModal source={previewSource} onClose={() => setPreviewSource(null)} />
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