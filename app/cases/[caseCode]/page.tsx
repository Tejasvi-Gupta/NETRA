"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import CaseChatDrawer from "@/components/CaseChatDrawer";
import CaseTimelineView from "@/components/CaseTimelineView";
import ForensicDossierPrint from "@/components/ForensicDossierPrint";
import SourcePreviewModal from "@/components/SourcePreviewModal";
import CaseNetworkMap from "@/components/CaseNetworkMap";
import { formatInvestigator } from "@/lib/auth";

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
  assigned_investigator?: string;
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

function isActiveTab(value: string | null): value is ActiveTab {
  return value === "sources" || value === "persons" || value === "unknowns" || value === "incidents" || value === "relations" || value === "graph";
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
              disabled={analyzing || !caseData.ai_case_id}
              className="h-9 rounded-lg border border-orange-600/50 bg-orange-950/40 px-3 text-[13px] font-medium text-orange-200 transition hover:border-orange-400/60 hover:text-white disabled:opacity-50"
            >
              {analyzing ? "Analyzing…" : "Run analysis"}
            </button>
            <button
              onClick={() => caseData?.ai_case_id && syncAiData(caseData.ai_case_id)}
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
            {caseData.ai_case_id ? "Analysis ready" : "Analysis not linked yet"}
          </div>
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
            onClick={() => selectTab(t.key as ActiveTab)}
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(!caseData.sources || caseData.sources.length === 0) ? (
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