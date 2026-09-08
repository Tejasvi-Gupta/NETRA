"use client";

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
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  loading?: boolean;
  accent?: "orange" | "red";
  onSelectNode?: (node: NetworkNode) => void;
}

const GRAPH_URL = "https://netra-graph.vercel.app/";

export default function CaseNetworkMap({
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

  return (
    <div className="network-map overflow-hidden rounded-2xl border border-white/10 bg-[#08080a]">
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight text-white">Network Intelligence Graph</h3>
          <p className="mt-0.5 text-[13px] text-neutral-500">External knowledge graph launcher</p>
        </div>

        <span className="w-fit rounded-lg border border-white/10 bg-white/3 px-2.5 py-1 text-[12px] text-neutral-400">
          {nodes.length} people · {edges.length} links
        </span>
      </div>

      <div className="p-4">
        <div className="w-full rounded-xl border border-zinc-800 bg-linear-to-b from-zinc-900/60 to-black p-8 text-center">
          <div className="mb-5 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 text-3xl font-bold text-red-400">
              ⬡
            </div>
          </div>

          <div>
            <h4 className="text-base font-semibold text-zinc-100">Criminal Network Knowledge Graph</h4>
            <p className="mx-auto mt-2 max-w-lg text-[13px] leading-6 text-zinc-400">
              Explore multi-node suspect links, entity clustering, and relationship intelligence directly in the dedicated graph engine.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <a
              href={GRAPH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-red-600 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-red-500 shadow-lg shadow-red-950"
            >
              Launch Graph Visualizer ↗
            </a>
            <a
              href={GRAPH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-zinc-700 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Open Fullscreen
            </a>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] uppercase tracking-wider text-zinc-500">
              Live Graph
            </span>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] uppercase tracking-wider text-zinc-500">
              Netra Intelligence
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[12px] text-neutral-400">
              {nodes.length} people · {edges.length} links
            </span>
          </div>
          <a
            href={GRAPH_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`rounded-md border ${border} ${bg} px-3 py-1.5 text-[11px] font-medium ${text} transition hover:opacity-90`}
          >
            Open External Graph ↗
          </a>
        </div>
      </div>
    </div>
  );
}
