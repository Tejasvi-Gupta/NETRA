"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AddRelationshipForm from "@/components/AddRelationshipForm";
import CaseChatDrawer from "@/components/CaseChatDrawer";
import CaseTimelineView from "@/components/CaseTimelineView";
import ForensicDossierPrint from "@/components/ForensicDossierPrint";
import SourcePreviewModal from "@/components/SourcePreviewModal";
import CaseNetworkMap from "@/components/CaseNetworkMap";
import CaseAnalysisCard from "@/components/CaseAnalysisCard";
import CaseEntitiesPanel from "@/components/CaseEntitiesPanel";
import { LiveIngestionJob } from "@/components/IngestionPipeline";
import { formatInvestigator } from "@/lib/auth";
import { recordFirActivity } from "@/lib/firActivity";
import { jobStatusLabel, leftoverFirDocuments, loadWorkspaceCase } from "@/lib/workspaceCase";
import type { FirDocument, FirIngestionJob } from "@/lib/workspaceCase";
import type { CaseSummary, InvestigationAnalysis } from "@/lib/aiApi";
import { buildCaseNetwork } from "@/lib/caseNetwork";
import { formatRelationship } from "@/lib/relationships";
import {
  caseStatusLabel,
  displayCaseStatus,
  incidentWhen,
  isCaseClosed,
  relationEndKey,
  resolveEntityLabel,
} from "@/lib/extractedCase";

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
  timestamp?: string | null;
  title?: string;
  summary?: string;
  description?: string;
  key_points?: string[];
  entities_involved?: string[];
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
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [nexusMatches, setNexusMatches] = useState<NexusMatch[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddRelModal, setShowAddRelModal] = useState(false);
  const [linkingAi, setLinkingAi] = useState(false);
  const [closingCase, setClosingCase] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deletingSource, setDeletingSource] = useState<number | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<IncidentRecord[]>([]);

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

  const handleDeleteSource = async (index: number, title: string) => {
    const code = Array.isArray(caseCode) ? caseCode[0] : caseCode;
    if (!code || deletingSource !== null) return;
    if (!window.confirm(`Remove "${title}" from this case?`)) return;

    setDeletingSource(index);
    try {
      const res = await fetch(`/api/cases/${code}/sources?index=${index}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Could not remove that file.");
        return;
      }
      void logActivity(`Removed uploaded file: ${title}`);
      void recordFirActivity(caseData?.ai_case_id, "EVIDENCE_REMOVED");
      if (previewSource?.title === title) setPreviewSource(null);
      await fetchCase();
    } catch {
      alert("Could not remove that file. Please try again.");
    } finally {
      setDeletingSource(null);
    }
  };

  const fetchCase = useCallback(async () => {
    const code = Array.isArray(caseCode) ? caseCode[0] : caseCode;
    if (!code) return;
    const found = await loadWorkspaceCase(code);
    setNexusMatches([]);
    setCaseData(found as CaseData | null);
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

  useEffect(() => {
    if (!caseData?.ai_case_id) {
      setTimelineEvents([]);
      return;
    }

    async function loadTimeline() {
      try {
        const res = await fetch(`/api/ai/timeline?case_id=${caseData?.ai_case_id}`);
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.events)) {
          setTimelineEvents(data.events);
        }
      } catch (error) {
        console.error("Failed to load FIR timeline:", error);
      }
    }

    void loadTimeline();
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
        void recordFirActivity(caseData.ai_case_id, "ANALYSIS_RUN");
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

  const handleSetStatus = async (status: "ACTIVE" | "UNDER_REVIEW") => {
    const code = Array.isArray(caseCode) ? caseCode[0] : caseCode;
    if (!code || updatingStatus || closingCase) return;
    const goingToReview = status === "UNDER_REVIEW";
    if (
      !window.confirm(
        goingToReview
          ? "Mark this case as under review?"
          : "Return this case to active investigation?"
      )
    ) {
      return;
    }

    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/cases/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Could not update case status.");
        return;
      }
      void logActivity(goingToReview ? "Marked the case under review" : "Returned the case to active");
      void recordFirActivity(caseData?.ai_case_id, goingToReview ? "CASE_UNDER_REVIEW" : "CASE_REOPENED");
      await fetchCase();
    } finally {
      setUpdatingStatus(false);
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
  const displayTimeline = timelineEvents.length > 0 ? timelineEvents : incidentsList;
  const connectionNames = useMemo(() => {
    const names = new Set<string>();
    for (const person of personsList) {
      const profile = person.person || person;
      const name = (profile.identity?.name || profile.name || profile.canonical_name || "").trim();
      if (name) names.add(name);
    }
    for (const unknown of unknownsList) {
      const name = (unknown.label || unknown.alias || unknown.identifier || "").trim();
      if (name) names.add(name);
    }
    for (const entity of entitiesList) {
      const name = (entity.label || entity.name || entity.value || entity.text || "").trim();
      if (name) names.add(name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [personsList, unknownsList, entitiesList]);

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

  const getEntityName = (relation: RelationRecord, side: "source" | "target") => {
    const fallback = side === "source" ? "Node A" : "Node B";
    return resolveEntityLabel(relationEndKey(relation, side) || fallback, personsList);
  };

  const caseClosed = isCaseClosed(caseData.status, caseSummary?.status);
  const caseStatus = displayCaseStatus(caseData.status, caseSummary?.status);
  const uniqueDocuments = leftoverFirDocuments(caseData.sources, caseData.documents);
  const evidenceCount = (caseData.sources?.length || 0) + uniqueDocuments.length;

  const { nodes: graphNodes, edges: graphEdges } = buildCaseNetwork({
    persons: personsList,
    unknowns: unknownsList,
    entities: entitiesList,
    relationships: relationsList,
  });
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
    const fromName = getEntityName(relation, "source").toLowerCase();
    const toName = getEntityName(relation, "target").toLowerCase();
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
      <div className="case-page-zoom mx-auto min-h-screen max-w-295 p-6 text-neutral-200 print:hidden sm:p-8">

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

      <div className="mb-8 border-b border-white/10 pb-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              const role = localStorage.getItem("netra_role");
              router.push(role === "admin" ? "/admin/dashboard" : "/investigator/dashboard");
            }}
            className="text-[13px] text-neutral-500 hover:text-white"
          >
            ← Intelligence Workspace
          </button>
          <button onClick={handleExportDossier} className="case-btn case-btn-secondary shrink-0">
            Export report
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-orange-400">{caseData.case_code}</span>
          <span className="rounded-full border border-orange-500/25 bg-orange-500/10 px-2 py-0.5 text-[11px] text-orange-300">
            {caseStatusLabel(caseData.status, caseSummary?.status)}
          </span>
        </div>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-white sm:text-[32px]">{caseData.title}</h1>
        <p className="mt-2 max-w-3xl text-[13px] leading-6 text-neutral-500">
          {caseData.investigation_summary || "No summary provided."}
        </p>
        <p className="mt-3 text-[13px] text-neutral-500">
          Investigator <span className="text-neutral-300">{formatInvestigator(caseData.assigned_investigator)}</span>
        </p>

        <div className="case-toolbar mt-5">
          <button
            onClick={() => router.push(`/cases/${caseData.case_code}/add`)}
            className="case-btn case-btn-primary"
          >
            Add files
          </button>
          <button
            onClick={handleRunAnalysis}
            disabled={analyzing || !caseData.ai_case_id || caseClosed}
            className="case-btn case-btn-secondary"
          >
            {analyzing ? "Analyzing…" : "Run analysis"}
          </button>
          <button onClick={() => setIsChatOpen(true)} className="case-btn case-btn-secondary">
            Netra Ai
          </button>
          {!caseClosed && (
            <>
              <span className="hidden h-4 w-px bg-white/10 sm:block" />
              {caseStatus === "ACTIVE" ? (
                <button
                  onClick={() => void handleSetStatus("UNDER_REVIEW")}
                  disabled={updatingStatus}
                  className="case-btn case-btn-ghost"
                >
                  {updatingStatus ? "Updating…" : "Mark under review"}
                </button>
              ) : (
                <button
                  onClick={() => void handleSetStatus("ACTIVE")}
                  disabled={updatingStatus}
                  className="case-btn case-btn-ghost"
                >
                  {updatingStatus ? "Updating…" : "Return to active"}
                </button>
              )}
              <button
                onClick={() => void handleCloseCase()}
                disabled={closingCase || updatingStatus}
                className="case-btn case-btn-ghost"
              >
                {closingCase ? "Closing…" : "Close case"}
              </button>
            </>
          )}
          {!caseData.ai_case_id && (
            <button
              onClick={linkAiCase}
              disabled={linkingAi}
              className="case-btn case-btn-ghost"
            >
              {linkingAi ? "Linking…" : "Link to FIR API"}
            </button>
          )}
        </div>
      </div>

      <CaseChatDrawer
        aiCaseId={caseData?.ai_case_id ?? ""}
        audience="investigator"
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      {activeJob && (
        <div className="mb-6 rounded-lg border border-orange-500/30 bg-orange-500/[0.04] p-4">
          <div className="mb-3 text-[12px] text-neutral-500">FIR processing pipeline</div>
          <LiveIngestionJob jobId={activeJob.job_id || activeJob.id} initial={activeJob} />
        </div>
      )}

      {analysisResult && (
        <CaseAnalysisCard
          result={analysisResult}
          caseSummary={caseData.investigation_summary}
          onClose={() => setAnalysisResult(null)}
        />
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search people, phone numbers, or incidents…"
            className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 text-[13px] text-white placeholder-neutral-500 outline-none focus:border-orange-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2 text-[13px] text-neutral-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={() => setIsTimelineOpen(true)}
          className="h-9 shrink-0 rounded-lg border border-white/10 px-3 text-[13px] text-neutral-300 hover:border-orange-500/40 hover:text-orange-200"
        >
          Timeline ({displayTimeline.length})
        </button>
      </div>

      {/* Tabs Header */}
      <div className="mb-6 flex gap-5 overflow-x-auto border-b border-white/10 text-[13px]">
        {[
          { key: "sources", label: `Evidence (${evidenceCount})` },
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
            {evidenceCount === 0 ? (
              <div className="col-span-full rounded-lg border border-white/5 p-8 text-center">
                <p className="text-[13px] text-neutral-500">No files have been added to this case yet.</p>
              </div>
            ) : (
              <>
                {(caseData.sources || []).map((s: SourceData, i: number) => (
                  <div
                    key={`local-${i}`}
                    onClick={() => setPreviewSource(s)}
                    className="cursor-pointer border border-white/10 bg-white/2 p-4 hover:border-orange-500/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="bg-orange-500/10 px-2 py-0.5 text-[11px] text-orange-300">{humanize(s.type)}</span>
                      <button
                        type="button"
                        disabled={deletingSource !== null}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDeleteSource(i, s.title);
                        }}
                        className="text-[12px] text-neutral-500 hover:text-red-400 disabled:opacity-50"
                      >
                        {deletingSource === i ? "Removing…" : "Delete"}
                      </button>
                    </div>
                    <div className="mt-2 truncate text-[14px] font-medium text-white">{s.title}</div>
                    <div className="mt-1 text-[12px] text-neutral-500">Open</div>
                  </div>
                ))}
                {uniqueDocuments.map((doc, i) => (
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
        </div>
      )}

      {activeTab === "entities" && <CaseEntitiesPanel entities={entitiesList} />}

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
                    {incidentWhen(inc)}
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
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[13px] text-neutral-400">How people and entities are linked</span>
            {!showAddRelModal && (
              <button
                onClick={() => setShowAddRelModal(true)}
                className="case-btn case-btn-secondary"
              >
                Add connection
              </button>
            )}
          </div>

          {showAddRelModal && caseData.ai_case_id && (
            <AddRelationshipForm
              caseCode={caseData.case_code}
              aiCaseId={caseData.ai_case_id}
              names={connectionNames}
              accent="orange"
              onCancel={() => setShowAddRelModal(false)}
              onSaved={async () => {
                setShowAddRelModal(false);
                void logActivity("Added a manual relationship");
                await fetchCase();
                const timelineRes = await fetch(`/api/ai/timeline?case_id=${caseData.ai_case_id}`);
                const timelineData = await timelineRes.json();
                if (timelineRes.ok && timelineData.success) setTimelineEvents(timelineData.events || []);
              }}
            />
          )}
          {showAddRelModal && !caseData.ai_case_id && (
            <p className="mb-4 text-[13px] text-amber-300">Link this case to the FIR API before adding a connection.</p>
          )}

          {relationsList.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-center text-[13px] leading-6 text-zinc-500">
              No connections recorded yet. Add one when you have evidence that two people or entities are linked.
            </div>
          ) : (
            filteredRelations.map((rel: RelationRecord, idx: number) => {
              const fromName = getEntityName(rel, "source");
              const toName = getEntityName(rel, "target");

              return (
                <div key={idx} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-[14px] leading-6 text-white">
                    {formatRelationship(fromName, rel.type, toName)}
                  </p>
                  {rel.evidence && (
                    <p className="mt-2 text-[13px] leading-6 text-zinc-400">
                      {rel.evidence}
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
         caseId={caseData?.ai_case_id || analysisResult?.case_id}
         nodes={graphNodes}
         edges={graphEdges}
         accent="orange"
       />
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
            <CaseTimelineView incidents={displayTimeline} themeColor="orange" />
          </div>
        </div>
      )}

      {previewSource && (
        <SourcePreviewModal
          source={previewSource}
          caseId={caseData.ai_case_id}
          caseCode={caseData.case_code}
          onClose={() => setPreviewSource(null)}
        />
      )}
      </div>

      {/* Printable Forensic Dossier */}
      <ForensicDossierPrint
        caseData={caseData}
        persons={personsList}
        unknowns={unknownsList}
        incidents={displayTimeline}
        relations={relationsList}
        graphNodes={graphNodes}
        graphEdges={graphEdges}
      />
    </>
  );
}
