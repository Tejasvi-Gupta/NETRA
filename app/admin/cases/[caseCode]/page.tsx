"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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

interface AnalysisResult {
  summary?: string;
  key_findings?: string[];
  [key: string]: unknown;
}

type ActiveTab = "sources" | "persons" | "unknowns" | "incidents" | "relations" | "graph";

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
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

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

  if (!caseData) return <div className="p-8 text-[14px] text-neutral-500">Loading case…</div>;

  const aiData = caseData.ai_extracted_data || {};
  const personsList = aiData.persons || [];
  const unknownsList = aiData.unknown_identities || [];
  const incidentsList = aiData.incidents || [];
  const relationsList = aiData.relationships || [];

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
          disabled={analyzing || !caseData.ai_case_id}
          className="h-10 rounded-lg border border-red-500/35 bg-red-500/[0.12] px-4 text-[13px] font-medium text-red-200 transition-colors hover:border-red-400/60 hover:bg-red-500/20 hover:text-white disabled:opacity-50"
        >
          {analyzing ? "Analyzing…" : "Run analysis"}
        </button>
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
            {caseData.assigned_investigator || "Unassigned"}
          </div>

          <div className="mt-4 text-[12px] text-neutral-500">Analysis</div>
          <div className="mt-1 text-[14px] font-medium text-white">
            {caseData.ai_case_id ? "Ready" : "Not linked yet"}
          </div>
        </div>
      </div>

      {/* AI Intelligence Report Result Section */}
      {analysisResult && (
        <div className="mb-6 rounded-lg border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-[14px] font-medium text-white">Analysis results</span>
            <button
              onClick={() => setAnalysisResult(null)}
              className="text-[13px] text-neutral-400 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-3 text-[13px] leading-6 text-neutral-300">
            {analysisResult.summary && (
              <div>
                <span className="text-[12px] text-neutral-500">Summary</span>
                <p className="mt-1 text-neutral-200">{analysisResult.summary}</p>
              </div>
            )}

            {analysisResult.key_findings && (
              <div>
                <span className="text-[12px] text-neutral-500">Key findings</span>
                <ul className="mt-1 list-disc list-inside space-y-1 text-neutral-200">
                  {analysisResult.key_findings.map((finding: string, i: number) => (
                    <li key={i}>{finding}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Fallback structured view for arbitrary json return */}
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
          className="h-10 rounded-lg border border-red-500/35 bg-red-500/[0.12] px-4 text-[13px] font-medium text-red-200 transition-colors hover:border-red-400/60 hover:bg-red-500/20 hover:text-white"
        >
          Timeline ({incidentsList.length})
        </button>
      </div>

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
            className={`whitespace-nowrap border-b-2 pb-3 ${
              activeTab === t.key ? "border-red-500 text-red-300" : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Sources */}
      {activeTab === "sources" && (
        <div>
          {!caseData.sources || caseData.sources.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.01] p-8 text-center text-[13px] text-neutral-500">
              No files have been added to this case yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {caseData.sources.map((s: SourceData, i: number) => (
                <div
                  key={i}
                  onClick={() => setPreviewSource(s)}
                  className="cursor-pointer rounded-lg border border-white/10 bg-white/[0.02] p-4 hover:border-red-500/40"
                >
                  <span className="text-[11px] text-red-400">{humanize(s.type)}</span>
                  <div className="mt-2 truncate text-[14px] font-medium text-white">{s.title}</div>
                  <div className="mt-1 text-[12px] text-neutral-500">Open</div>
                </div>
              ))}
            </div>
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

      {/* Tab 6: Network Graph (Interactive Visual Canvas) */}
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
            <div className="p-12 text-center text-xs text-neutral-500 border border-dashed border-zinc-850 rounded">
              No network to show yet. Run analysis first.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="border border-zinc-850 bg-black/60 rounded-lg p-4 overflow-x-auto">
                <svg
                  viewBox="0 0 820 440"
                  className="w-full min-w-[760px] h-[400px] select-none"
                >
                  <defs>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="24"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
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
                        {graphEdges.map((e, i) => {
                          const fId = (typeof e.from === "object" ? e.from?.id : e.from) || e.source || "";
                          const tId = (typeof e.to === "object" ? e.to?.id : e.to) || e.target || "";
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
                                stroke="#dc2626"
                                strokeWidth="1.5"
                                strokeDasharray="3 3"
                                markerEnd="url(#arrow)"
                                opacity="0.6"
                              />
                            </g>
                          );
                        })}

                        {graphNodes.map((n, i) => {
                          const pt = coords[n.id];
                          if (!pt) return null;
                          const isPerson = n.type === "PERSON";
                          const isUnknown = n.type === "UNKNOWN";

                          return (
                            <g
                              key={`node-${i}`}
                              onClick={() => setSelectedNode(n)}
                              className="cursor-pointer group transition-transform hover:scale-110"
                            >
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r="20"
                                fill={isPerson ? "#7f1d1d" : isUnknown ? "#581c87" : "#27272a"}
                                stroke={isPerson ? "#ef4444" : isUnknown ? "#c084fc" : "#71717a"}
                                strokeWidth="2"
                                className="group-hover:stroke-white transition-colors"
                              />
                              <text
                                x={pt.x}
                                y={pt.y + 4}
                                textAnchor="middle"
                                fill="#ffffff"
                                fontSize="10"
                                fontWeight="bold"
                              >
                                {isPerson ? "👤" : isUnknown ? "🎭" : "📌"}
                              </text>
                              <text
                                x={pt.x}
                                y={pt.y + 32}
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

              <div className="space-y-2">
                <div className="mb-2 text-[12px] text-neutral-400">
                  Connections
                </div>
                {graphEdges.map((e, i) => {
                  const fId = (typeof e.from === "object" ? e.from?.id : e.from) || e.source || "";
                  const tId = (typeof e.to === "object" ? e.to?.id : e.to) || e.target || "";
                  const fLabel = graphNodes.find((n) => n.id === fId)?.label || fId;
                  const tLabel = graphNodes.find((n) => n.id === tId)?.label || tId;

                  return (
                    <div
                      key={i}
                      className="text-xs font-mono bg-zinc-950 border border-zinc-800 p-2.5 rounded flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold">{fLabel}</span>
                        <span className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-300">
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

      {/* Source Preview Modal */}
      {previewSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="flex h-[80vh] w-full max-w-3xl flex-col border border-white/20 bg-[#0c0c0d] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="bg-red-500/10 px-2 py-0.5 text-[12px] text-red-400">
                  {humanize(previewSource.type)}
                </span>
                <h3 className="max-w-md truncate text-sm font-bold text-white">{previewSource.title}</h3>
              </div>
              <button onClick={() => setPreviewSource(null)} className="px-2 text-sm text-neutral-500 hover:text-white">✕</button>
            </div>

            <div className="flex-1 overflow-hidden bg-[#050505] p-6 flex items-center justify-center">
              {previewSource.type === "IMAGE" && (
                <div className="flex h-full w-full items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewSource.content} alt={previewSource.title} className="max-h-full max-w-full object-contain" />
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
                  <p className="text-xs text-neutral-400 mb-6">
                    File attached by the investigator. Download to review the full contents.
                  </p>
                  {previewSource.content.startsWith("data:") ? (
                    <a
                      href={previewSource.content}
                      download={previewSource.title}
                      className="bg-red-600 px-6 py-3 text-[13px] font-medium text-white transition-colors hover:bg-red-500"
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