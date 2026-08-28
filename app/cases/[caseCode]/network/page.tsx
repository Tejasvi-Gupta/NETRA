"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import cytoscape, { Core, NodeSingular } from "cytoscape";
import { useParams, useRouter, useSearchParams } from "next/navigation";

type NodeType = "PERSON" | "ORGANIZATION" | "LOCATION" | "PHONE" | "BANK_ACCOUNT" | "VEHICLE" | "TRANSACTION" | "OTHER";
type Relevance = "HIGH" | "MEDIUM" | "LOW";

interface NetworkNode {
  id: string;
  name: string;
  type: NodeType;
  relevance: Relevance;
  confidence: number;
  sources: number;
  mentions: number;
  aiInsight: string;
}

interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  sources: number;
  confidence: number;
  evidence: string;
}

const typeIcon: Record<NodeType, string> = {
  PERSON: "👤",
  ORGANIZATION: "🏢",
  LOCATION: "📍",
  PHONE: "📞",
  BANK_ACCOUNT: "🏦",
  VEHICLE: "🚗",
  TRANSACTION: "💰",
  OTHER: "🌐",
};

const typeColor: Record<NodeType, string> = {
  PERSON: "#f87171",
  ORGANIZATION: "#c084fc",
  LOCATION: "#38bdf8",
  PHONE: "#fbbf24",
  BANK_ACCOUNT: "#34d399",
  VEHICLE: "#fb923c",
  TRANSACTION: "#4ade80",
  OTHER: "#a3a3a3",
};

// ── emoji icon rendered inside each node via an SVG <text> wrapper ──
const typeIconDataUri = (t: NodeType) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><text x='12' y='17' font-size='16' text-anchor='middle'>${typeIcon[t]}</text></svg>`
  )}`;

// ── mock case graph — replace with a backend fetch (entities + relationships) later ──
const nodes: NetworkNode[] = [
  { id: "1", name: "Ravi Kumar", type: "PERSON", relevance: "HIGH", confidence: 91, sources: 3, mentions: 7,
    aiInsight: "Entity appears across multiple independent sources and is linked to Amit Sharma through documented interactions." },
  { id: "2", name: "Amit Sharma", type: "PERSON", relevance: "MEDIUM", confidence: 78, sources: 2, mentions: 4,
    aiInsight: "Consistently linked to Ravi Kumar across communication and location records." },
  { id: "3", name: "Delhi", type: "LOCATION", relevance: "MEDIUM", confidence: 85, sources: 4, mentions: 12,
    aiInsight: "Recurring meeting point correlated with movement of two flagged entities." },
  { id: "4", name: "+91 98XXXXXXXX", type: "PHONE", relevance: "HIGH", confidence: 88, sources: 2, mentions: 5,
    aiInsight: "Sharp rise in call frequency in the 72 hours preceding the reported incident." },
  { id: "5", name: "A/C XXXX1234", type: "BANK_ACCOUNT", relevance: "MEDIUM", confidence: 74, sources: 1, mentions: 6,
    aiInsight: "Structured pattern of sub-₹50,000 transfers, consistent with funneling." },
  { id: "6", name: "UP16 XX 1234", type: "VEHICLE", relevance: "MEDIUM", confidence: 69, sources: 1, mentions: 2,
    aiInsight: "Overlaps with two known drop-point locations from prior surveillance." },
  { id: "7", name: "XYZ Logistics", type: "ORGANIZATION", relevance: "LOW", confidence: 52, sources: 1, mentions: 1,
    aiInsight: "Mentioned once in association with the vehicle entity." },
  { id: "8", name: "₹2,40,000 Transfer", type: "TRANSACTION", relevance: "MEDIUM", confidence: 74, sources: 1, mentions: 1,
    aiInsight: "Single large transfer flagged as inconsistent with the account's typical activity." },
];

const edges: NetworkEdge[] = [
  { id: "e1", source: "1", target: "2", relationship: "ASSOCIATED WITH", sources: 2, confidence: 87, evidence: "FIR_Report_01.pdf" },
  { id: "e2", source: "1", target: "4", relationship: "CONTACT NUMBER", sources: 2, confidence: 82, evidence: "CDR_Data.csv" },
  { id: "e3", source: "1", target: "5", relationship: "TRANSACTION PARTY", sources: 1, confidence: 74, evidence: "Financial_Record.xlsx" },
  { id: "e4", source: "5", target: "8", relationship: "RECORDED TRANSACTION", sources: 1, confidence: 74, evidence: "Financial_Record.xlsx" },
  { id: "e5", source: "1", target: "3", relationship: "SEEN AT", sources: 3, confidence: 85, evidence: "FIR_Report_01.pdf" },
  { id: "e6", source: "2", target: "3", relationship: "SEEN AT", sources: 2, confidence: 80, evidence: "CDR_Data.csv" },
  { id: "e7", source: "6", target: "3", relationship: "SEEN AT", sources: 1, confidence: 69, evidence: "Field_Note.txt" },
  { id: "e8", source: "6", target: "7", relationship: "REGISTERED TO", sources: 1, confidence: 52, evidence: "Field_Note.txt" },
];

const relevanceColor: Record<Relevance, string> = {
  HIGH: "text-red-400 border-red-500/30 bg-red-500/5",
  MEDIUM: "text-amber-400 border-amber-500/30 bg-amber-500/5",
  LOW: "text-neutral-400 border-neutral-700 bg-neutral-800/30",
};

const HEIGHT = 620;

export default function CaseNetworkPage() {
  const router = useRouter();
  const { caseCode } = useParams<{ caseCode: string }>();
  const searchParams = useSearchParams();
  const initialFocus = searchParams.get("entity") ?? nodes[0]?.id ?? "1";

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialFocus);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilters, setTypeFilters] = useState<Set<NodeType>>(new Set());
  const [relFilter, setRelFilter] = useState<string>("ALL");
  const [relevanceFilter, setRelevanceFilter] = useState<Relevance | "ALL">("ALL");
  const [showLabels, setShowLabels] = useState(true);

  const relationshipTypes = useMemo(
    () => ["ALL", ...Array.from(new Set(edges.map((e) => e.relationship)))],
    []
  );

  const matchesFilter = (n: NetworkNode) => {
    const matchesSearch = !search.trim() || n.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilters.size === 0 || typeFilters.has(n.type);
    const matchesRelevance = relevanceFilter === "ALL" || n.relevance === relevanceFilter;
    return matchesSearch && matchesType && matchesRelevance;
  };

  const edgeMatchesFilter = (e: NetworkEdge) => {
    const matchesRel = relFilter === "ALL" || e.relationship === relFilter;
    const sourceNode = nodes.find((n) => n.id === e.source);
    const targetNode = nodes.find((n) => n.id === e.target);
    const matchesNodes = (sourceNode ? matchesFilter(sourceNode) : true) && (targetNode ? matchesFilter(targetNode) : true);
    return matchesRel && matchesNodes;
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId) ?? null;

  const toggleTypeFilter = (t: NodeType) => {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const cyContainerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);

  // ── init cytoscape once ──
  useEffect(() => {
    if (!cyContainerRef.current) return;

    const cy = cytoscape({
      container: cyContainerRef.current,

      elements: [
        ...nodes.map((node) => ({
          data: {
            id: node.id,
            label: node.name,
            type: node.type,
          },
        })),
        ...edges.map((edge) => ({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: edge.relationship,
          },
        })),
      ],

      style: [
        {
          selector: "node",
          style: {
            shape: (ele: NodeSingular) => {
              const t = ele.data("type") as NodeType;
              if (t === "ORGANIZATION") return "round-rectangle";
              if (t === "TRANSACTION" || t === "OTHER") return "ellipse";
              if (t === "VEHICLE") return "round-hexagon";
              return "ellipse";
            },
            "background-color": (ele: NodeSingular) => typeColor[ele.data("type") as NodeType] ?? "#f87171",
            "background-opacity": 0.18,
            "background-image": (ele: NodeSingular) => typeIconDataUri(ele.data("type") as NodeType),
            "background-fit": "contain",
            "background-width": "70%",
            "background-height": "70%",
            "border-width": 2.5,
            "border-color": (ele: NodeSingular) => typeColor[ele.data("type") as NodeType] ?? "#f87171",
            label: "data(label)",
            color: "#ffffff",
            "text-valign": "bottom",
            "text-margin-y": 8,
            "font-size": 10,
            width: 46,
            height: 46,
          },
        },
        {
          selector: "edge",
          style: {
            width: 1.5,
            "line-color": "#52525b",
            "target-arrow-color": "#52525b",
            "target-arrow-shape": "triangle",
            label: "data(label)",
            color: "#a1a1aa",
            "font-size": 8,
            "curve-style": "bezier",
          },
        },
        // selected node highlight
        {
          selector: "node.selected",
          style: {
            "border-width": 4,
            "border-color": "#ffffff",
            "background-opacity": 0.35,
          },
        },
        // selected edge highlight
        {
          selector: "edge.selected",
          style: {
            width: 3,
            "line-color": "#f87171",
            "target-arrow-color": "#f87171",
            color: "#f87171",
          },
        },
        // filtered-out (hidden) elements
        {
          selector: ".hidden-el",
          style: {
            display: "none",
          },
        },
        // labels hidden toggle
        {
          selector: ".no-label",
          style: {
            label: "",
          },
        },
      ],

      layout: {
        name: "cose",
            animate: false,
        fit: true,
        padding: 50,
      },
    });

    cyRef.current = cy;

    // click a node -> select it, clear edge selection
    cy.on("tap", "node", (evt) => {
      const id = evt.target.id();
      setSelectedNodeId(id);
      setSelectedEdgeId(null);
    });

    // click an edge -> select it, clear node selection
    cy.on("tap", "edge", (evt) => {
      const id = evt.target.id();
      setSelectedEdgeId(id);
      setSelectedNodeId(null);
    });

    // click empty background -> clear selection
    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
      }
    });

    // apply initial focus selection highlight
    if (initialFocus) {
      cy.$id(initialFocus).addClass("selected");
    }

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── keep cytoscape selection highlight in sync with React state ──
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass("selected");
    cy.edges().removeClass("selected");
    if (selectedNodeId) cy.$id(selectedNodeId).addClass("selected");
    if (selectedEdgeId) cy.$id(selectedEdgeId).addClass("selected");
  }, [selectedNodeId, selectedEdgeId]);

  // ── apply filters (search / type / relevance / relationship) to cytoscape ──
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.nodes().forEach((cyNode) => {
      const node = nodes.find((n) => n.id === cyNode.id());
      if (!node) return;
      if (matchesFilter(node)) cyNode.removeClass("hidden-el");
      else cyNode.addClass("hidden-el");
    });

    cy.edges().forEach((cyEdge) => {
      const edge = edges.find((e) => e.id === cyEdge.id());
      if (!edge) return;
      if (edgeMatchesFilter(edge)) cyEdge.removeClass("hidden-el");
      else cyEdge.addClass("hidden-el");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilters, relFilter, relevanceFilter]);

  // ── toggle labels ──
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    if (showLabels) {
      cy.elements().removeClass("no-label");
    } else {
      cy.elements().addClass("no-label");
    }
  }, [showLabels]);

  const searchResults = useMemo(
    () => (search.trim() ? nodes.filter((n) => n.name.toLowerCase().includes(search.toLowerCase())) : []),
    [search]
  );

  return (
    <main className="min-h-screen bg-[#080808] text-neutral-200">
      <div className="mx-auto max-w-[1600px] px-6 py-6 md:px-10">
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => router.push(`/cases/${caseCode}`)}
            className="text-[11px] tracking-[0.16em] text-neutral-400 hover:text-red-400"
          >
            ← BACK TO ENTITY ANALYSIS
          </button>
          <span className="border border-neutral-800 px-3 py-1.5 text-[10px] tracking-widest text-neutral-400">
            CASE ID: {caseCode}
          </span>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-bold tracking-tight text-white">CASE NETWORK ANALYSIS</h1>
          <p className="mt-1 text-xs text-neutral-500">
            {nodes.length} entities · {edges.length} relationships in this case
          </p>
        </div>

        {/* controls */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entity..."
              className="w-full border border-neutral-800 bg-[#0b0b0b] px-3.5 py-2.5 text-xs text-neutral-200 outline-none placeholder:text-neutral-600"
            />
            {searchResults.length > 0 && (
              <div className="absolute z-20 mt-1 w-full border border-neutral-800 bg-[#0d0d0d]">
                {searchResults.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      setSelectedNodeId(n.id);
                      setSelectedEdgeId(null);
                      setSearch("");
                      const cy = cyRef.current;
                      if (cy) {
                        cy.animate({
                          center: { eles: cy.$id(n.id) },
                          zoom: 1.4,
                          duration: 400,
                        });
                      }
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[#161616]"
                  >
                    <span>{typeIcon[n.type]}</span> {n.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <select
            value={relFilter}
            onChange={(e) => setRelFilter(e.target.value)}
            className="border border-neutral-800 bg-[#0b0b0b] px-3 py-2.5 text-xs text-neutral-300 outline-none"
          >
            {relationshipTypes.map((r) => (
              <option key={r} value={r}>{r === "ALL" ? "Relationship: All" : r}</option>
            ))}
          </select>

          <select
            value={relevanceFilter}
            onChange={(e) => setRelevanceFilter(e.target.value as Relevance | "ALL")}
            className="border border-neutral-800 bg-[#0b0b0b] px-3 py-2.5 text-xs text-neutral-300 outline-none"
          >
            {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((r) => (
              <option key={r} value={r}>{r === "ALL" ? "Relevance: All" : `Relevance: ${r}`}</option>
            ))}
          </select>

          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(typeIcon) as NodeType[]).map((t) => (
              <button
                key={t}
                onClick={() => toggleTypeFilter(t)}
                className={`border px-2.5 py-1.5 text-[10px] tracking-wide ${
                  typeFilters.has(t) ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-neutral-800 text-neutral-400 hover:border-neutral-600"
                }`}
              >
                {typeIcon[t]} {t.replace("_", " ")}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowLabels((s) => !s)}
            className="border border-neutral-800 px-3 py-2.5 text-[10px] tracking-widest text-neutral-300 hover:border-neutral-600"
          >
            {showLabels ? "HIDE LABELS" : "SHOW LABELS"}
          </button>
        </div>

        {/* graph + panel */}
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="relative overflow-hidden border border-neutral-800 bg-[#0a0a0a]" style={{ height: HEIGHT }}>
            <div ref={cyContainerRef} className="h-full w-full" />

            {/* legend */}
            <div className="absolute bottom-3 left-3 border border-neutral-800 bg-[#0d0d0dcc] px-3 py-2.5 backdrop-blur-sm">
              <div className="text-[9px] tracking-widest text-neutral-500 mb-1.5">LEGEND</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {(Object.keys(typeIcon) as NodeType[]).map((t) => (
                  <div key={t} className="flex items-center gap-1.5 text-[9px] text-neutral-400">
                    <span>{typeIcon[t]}</span> {t.replace("_", " ")}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* detail panel */}
          <div className="border border-neutral-800 bg-[#111] p-5">
            {selectedNode && (
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{typeIcon[selectedNode.type]}</span>
                  <div>
                    <div className="text-base font-semibold text-white">{selectedNode.name}</div>
                    <div className="text-[9px] tracking-widest text-neutral-500">{selectedNode.type.replace("_", " ")}</div>
                  </div>
                </div>
                <span className={`mt-3 inline-block border px-2 py-0.5 text-[9px] tracking-wide ${relevanceColor[selectedNode.relevance]}`}>
                  {selectedNode.relevance} RELEVANCE
                </span>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <MiniStat label="CONF." value={`${selectedNode.confidence}%`} />
                  <MiniStat label="SOURCES" value={String(selectedNode.sources)} />
                  <MiniStat label="MENTIONS" value={String(selectedNode.mentions)} />
                </div>
                <div className="mt-4 text-[10px] tracking-widest text-cyan-300">AI INSIGHT</div>
                <p className="mt-1.5 text-xs leading-relaxed text-neutral-300">{selectedNode.aiInsight}</p>
                <div className="mt-4 text-[10px] tracking-widest text-neutral-500">
                  CONNECTIONS: {edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id).length}
                </div>
                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => router.push(`/cases/${caseCode}`)}
                    className="flex-1 border border-neutral-700 px-3 py-2 text-[10px] tracking-widest text-neutral-200 hover:border-neutral-500"
                  >
                    VIEW ENTITY
                  </button>
                  <button
                    onClick={() => router.push(`/cases/${caseCode}`)}
                    className="flex-1 border border-red-500/30 bg-red-500/5 px-3 py-2 text-[10px] tracking-widest text-red-300 hover:border-red-500/60"
                  >
                    VIEW EVIDENCE
                  </button>
                </div>
              </div>
            )}

            {selectedEdge && (
              <div>
                <div className="text-[10px] tracking-widest text-neutral-500">RELATIONSHIP</div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {nodes.find((n) => n.id === selectedEdge.source)?.name} ↔ {nodes.find((n) => n.id === selectedEdge.target)?.name}
                </div>
                <div className="mt-4 space-y-3 text-xs">
                  <DetailRow label="Relationship" value={selectedEdge.relationship} />
                  <DetailRow label="Sources" value={String(selectedEdge.sources)} />
                  <DetailRow label="AI Confidence" value={`${selectedEdge.confidence}%`} />
                  <DetailRow label="Supporting evidence" value={selectedEdge.evidence} />
                </div>
              </div>
            )}

            {!selectedNode && !selectedEdge && (
              <div className="py-16 text-center text-xs text-neutral-500">
                Click a node or connection to view details.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-neutral-800 bg-[#0d0d0d] py-2">
      <div className="text-[8px] tracking-widest text-neutral-500">{label}</div>
      <div className="mt-0.5 text-xs font-semibold text-white">{value}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] tracking-widest text-neutral-500">{label.toUpperCase()}</div>
      <div className="mt-1 text-neutral-200">{value}</div>
    </div>
  );
}