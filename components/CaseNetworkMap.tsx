"use client";

import { useMemo } from "react";

export interface NetworkNode {
  id: string;
  label?: string;
  type?: string;
}

export interface NetworkEdge {
  from?: { id?: string } | string;
  to?: { id?: string } | string;
  source?: string;
  target?: string;
  type?: string;
  evidence?: string;
  label?: string;
}

interface Props {
  caseId?: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  loading?: boolean;
  accent?: "orange" | "red";
  onSelectNode?: (node: NetworkNode) => void;
}

const BASE_GRAPH_URL = "https://netra-graph.vercel.app/";

export default function CaseNetworkMap({
  caseId,
  nodes,
  edges,
  loading = false,
  accent = "orange",
  onSelectNode,
}: Props) {
  const isOrange = accent === "orange";
  const border = isOrange ? "border-orange-500/30" : "border-red-500/30";
  const text = isOrange ? "text-orange-300" : "text-red-300";
  const bg = isOrange ? "bg-orange-500/10" : "bg-red-500/10";

  // Computes https://netra-graph.vercel.app/?caseId=...
  const graphUrl = useMemo(() => {
    if (!caseId) return BASE_GRAPH_URL;
    return `${BASE_GRAPH_URL}?caseId=${encodeURIComponent(caseId)}`;
  }, [caseId]);

  return (
    <div className="network-map overflow-hidden rounded-2xl border border-white/10 bg-[#08080a]">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight text-white">
            Network Intelligence Graph
          </h3>
          <p className="mt-0.5 text-[13px] text-neutral-500">
            Interactive multi-node criminal network analysis
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="w-fit rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[12px] text-neutral-400">
            {nodes.length} people · {edges.length} links
          </span>

          {/* External launcher button */}
          <a
            href={graphUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`rounded-md border ${border} ${bg} px-3 py-1 text-[11px] font-medium ${text} transition hover:opacity-90`}
          >
            Open Fullscreen ↗
          </a>
        </div>
      </div>

      {/* Live Embedded Iframe */}
      <div className="relative w-full h-[650px] bg-black">
        {caseId ? (
          <iframe
            src={graphUrl}
            title="NETRA Criminal Network Visualizer"
            className="h-full w-full border-0"
            allow="fullscreen"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-zinc-500 text-sm">
            <p className="font-semibold text-zinc-300">Case Not Linked to Graph Engine</p>
            <p className="max-w-md text-xs text-zinc-400">
              This case has not been linked to the FIR Intelligence API yet. Click <span className="font-medium text-amber-400">"Link to FIR API"</span> in the case header to generate the intelligence graph.
            </p>
          </div>
        )}
      </div>

      {/* Footer Status */}
      <div className="border-t border-white/10 px-4 py-2.5">
        <div className="flex items-center justify-between text-[11px] text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>NETRA Visualizer Connected</span>
          </div>
          {caseId && <span className="font-mono text-zinc-500">Case: {caseId}</span>}
        </div>
      </div>
    </div>
  );
}
