"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AddRelationshipForm from "@/components/AddRelationshipForm";
import CaseTimelineView from "@/components/CaseTimelineView";
import ForensicDossierPrint from "@/components/ForensicDossierPrint";
import SourcePreviewModal from "@/components/SourcePreviewModal";
import CaseNetworkMap from "@/components/CaseNetworkMap";
import CaseChatDrawer from "@/components/CaseChatDrawer";
import CaseAnalysisCard from "@/components/CaseAnalysisCard";
import CaseEntitiesPanel from "@/components/CaseEntitiesPanel";
import { LiveIngestionJob } from "@/components/IngestionPipeline";
import { formatInvestigator } from "@/lib/auth";
import { recordFirActivity } from "@/lib/firActivity";
import { jobStatusLabel, leftoverFirDocuments, loadWorkspaceCase } from "@/lib/workspaceCase";
import type { FirDocument, FirIngestionJob } from "@/lib/workspaceCase";
import type { CaseSummary, InvestigationAnalysis } from "@/lib/aiApi";
import { buildCaseNetwork, type CaseNetworkNode } from "@/lib/caseNetwork";
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
  description?: string;
  summary?: string;
  time?: { start?: string };
  extraction?: { method?: string };
  key_points?: string[];
  entities_involved?: string[];
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

type AnalysisResult = InvestigationAnalysis;

type ActiveTab = "sources" | "persons" | "unknowns" | "incidents" | "entities" | "relations" | "graph";

function isActiveTab(value: string | null): value is ActiveTab {
  return value === "sources" || value === "persons" || value === "unknowns" || value === "incidents" || value === "entities" || value === "relations" || value === "graph";
}

function humanize(value?: string | null, fallback = "") {
  if (!value) return fallback;
  return value.replace(/[_-]+/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminCasePage() {
  return (
    <Suspense fallback={<div className="p-8 text-[14px] text-neutral-500">Loading case…</div>}>
      <AdminCaseView />
    </Suspense>
  );
}

function AdminCaseView() {
  const { caseCode } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [previewSource, setPreviewSource] = useState<SourceData | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("sources");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [caseSummary, setCaseSummary] = useState<CaseSummary | null>(null);
  const [selectedNode, setSelectedNode] = useState<CaseNetworkNode | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [linkingAi, setLinkingAi] = useState(false);
  const [closingCase, setClosingCase] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deletingSource, setDeletingSource] = useState<number | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<IncidentRecord[]>([]);
  const [showAddRelModal, setShowAddRelModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (isActiveTab(tab)) {
      setActiveTab(tab);
      return;
    }
    if (!tab) setActiveTab("sources");
  }, [searchParams]);

  function selectTab(tab: ActiveTab) {
    setActiveTab(tab);
    const code = Array.isArray(caseCode) ? caseCode[0] : caseCode;
    if (!code) return;
    const next = tab === "sources" ? `/admin/cases/${code}` : `/admin/cases/${code}?tab=${tab}`;
    router.replace(next, { scroll: false });
  }

  const fetchCase = useCallback(async () => {
    const code = Array.isArray(caseCode) ? caseCode[0] : caseCode;
    if (!code) return;
    const found = await loadWorkspaceCase(code);
    setCaseData(found as CaseData | null);
  }, [caseCode]);

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
      if (previewSource?.title === title) setPreviewSource(null);
      void recordFirActivity(caseData?.ai_case_id, "EVIDENCE_REMOVED");
      await fetchCase();
    } catch {
      alert("Could not remove that file. Please try again.");
    } finally {
      setDeletingSource(null);
    }
  };

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
  const displayTimeline = timelineEvents.length > 0 ? timelineEvents : incidentsList;
  const uniqueDocuments = leftoverFirDocuments(caseData.sources, caseData.documents);
  const evidenceCount = (caseData.sources?.length || 0) + uniqueDocuments.length;
  const connectionNames = Array.from(new Set([
    ...personsList.map((item) => {
      const profile = item.person || item;
      return (profile.identity?.name || profile.name || profile.canonical_name || "").trim();
    }),
    ...unknownsList.map((unknown) => (unknown.label || unknown.alias || unknown.identifier || "").trim()),
    ...entitiesList.map((entity) => (entity.label || entity.name || entity.value || entity.text || "").trim()),
  ].filter(Boolean))).sort((left, right) => left.localeCompare(right));

  const getEntityName = (relation: RelationRecord, side: "source" | "target") => {
    const fallback = side === "source" ? "Node A" : "Node B";
    return resolveEntityLabel(relationEndKey(relation, side) || fallback, personsList);
  };

  const caseClosed = isCaseClosed(caseData.status, caseSummary?.status);
  const caseStatus = displayCaseStatus(caseData.status, caseSummary?.status);
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

  const { nodes: graphNodes, edges: graphEdges } = buildCaseNetwork({
    persons: personsList,
    unknowns: unknownsList,
    entities: entitiesList,
    relationships: relationsList,
  });

  return (
    <>
    <div className="case-page-zoom relative min-h-screen overflow-x-hidden bg-[#050505] text-neutral-200 print:hidden">
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
      <div className="mb-8 border-b border-white/10 pb-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button onClick={() => router.push("/admin/dashboard")} className="text-[13px] text-neutral-500 hover:text-white">
            ← Intelligence Workspace
          </button>
          <button onClick={() => window.print()} className="case-btn case-btn-secondary shrink-0">
            Export report
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-red-400">{caseData.case_code}</span>
          <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-300">
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
            onClick={handleRunAnalysis}
            disabled={analyzing || !caseData.ai_case_id || caseClosed}
            className="case-btn case-btn-primary-admin"
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
        audience="admin"
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      {activeJob && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/[0.04] p-4">
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
            className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 text-[13px] text-white placeholder-neutral-500 outline-none focus:border-red-500/50"
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
          className="h-9 shrink-0 rounded-lg border border-white/10 px-3 text-[13px] text-neutral-300 hover:border-red-500/40 hover:text-red-200"
        >
          Timeline ({displayTimeline.length})
        </button>
      </div>

      <div className="mb-6 flex items-end gap-3 border-b border-white/10">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex gap-5 text-[13px]">
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
                className={`whitespace-nowrap border-b-2 pb-3 ${
                  activeTab === t.key ? "border-red-500 text-red-300" : "border-transparent text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "sources" && (
        <div className="space-y-6">
          {evidenceCount === 0 ? (
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
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[11px] text-red-400">{humanize(s.type)}</span>
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
        </div>
      )}

      {activeTab === "entities" && <CaseEntitiesPanel entities={entitiesList} />}

      {/* Tab 2: Persons */}
      {activeTab === "persons" && (
        <div className="space-y-3">
          {personsList.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredPersons.map((item: PersonRecord, idx: number) => {
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
            filteredUnknowns.map((u: UnknownIdentityRecord, idx: number) => (
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
            filteredIncidents.map((inc: IncidentRecord, idx: number) => (
              <div key={idx} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-red-300">
                    {incidentWhen(inc)}
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
              accent="red"
              onCancel={() => setShowAddRelModal(false)}
              onSaved={async () => {
                setShowAddRelModal(false);
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
          accent="red"
          onSelectNode={(node) =>
            setSelectedNode({
              id: node.id,
              label: node.label || node.id,
              type: node.type || "NODE",
            })
          }
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
                  .filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id)
                  .map((edge, idx) => {
                    const fromId = edge.source;
                    const toId = edge.target;
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
            <CaseTimelineView incidents={displayTimeline} themeColor="red" />
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
