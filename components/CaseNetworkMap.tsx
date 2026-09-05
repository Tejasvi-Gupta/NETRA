"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

function humanize(value?: string | null, fallback = "Linked") {
  if (!value) return fallback;
  return value.replace(/[_-]+/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function edgeEnds(edge: NetworkEdge) {
  const from = (typeof edge.from === "object" ? edge.from?.id : edge.from) || edge.source || "";
  const to = (typeof edge.to === "object" ? edge.to?.id : edge.to) || edge.target || "";
  return { from, to };
}

export default function CaseNetworkMap({
  nodes,
  edges,
  loading = false,
  accent = "orange",
  onSelectNode,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 400, h: 280 });
  const [revealed, setRevealed] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isOrange = accent === "orange";
  const stroke = isOrange ? "#ea580c" : "#ef4444";
  const glow = isOrange ? "rgba(234,88,12,0.35)" : "rgba(239,68,68,0.35)";
  const markerId = isOrange ? "network-arrow-orange" : "network-arrow-red";

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const update = () => {
      const w = Math.min(400, Math.max(280, el.clientWidth));
      const h = Math.round(w * 0.7);
      setSize({ w, h });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setRevealed(false);
    const timer = window.setTimeout(() => setRevealed(true), 50);
    return () => window.clearTimeout(timer);
  }, [nodes.length]);

  const coords = useMemo(() => {
    const cx = size.w / 2;
    const cy = size.h / 2;
    const radius = Math.min(size.w, size.h) / 2 - 42;
    const next: Record<string, { x: number; y: number; angle: number }> = {};

    nodes.forEach((node, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(nodes.length, 1) - Math.PI / 2;
      next[node.id] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        angle,
      };
    });

    return { cx, cy, radius, points: next };
  }, [nodes, size.h, size.w]);

  const focusId = hoveredId || selectedId;
  const linked = useMemo(() => {
    if (!focusId) return new Set<string>();
    const ids = new Set<string>([focusId]);
    edges.forEach((edge) => {
      const { from, to } = edgeEnds(edge);
      if (from === focusId) ids.add(to);
      if (to === focusId) ids.add(from);
    });
    return ids;
  }, [edges, focusId]);

  function handleNodeClick(node: NetworkNode) {
    setSelectedId((current) => (current === node.id ? null : node.id));
    onSelectNode?.(node);
  }

  return (
    <div className="network-map overflow-hidden rounded-2xl border border-white/10 bg-[#08080a]">
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight text-white">Network map</h3>
          <p className="mt-0.5 text-[13px] text-neutral-500">People and connections found in this case</p>
        </div>
        <span className="w-fit rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[12px] text-neutral-400">
          {nodes.length} people · {edges.length} links
        </span>
      </div>

      {loading ? (
        <div className="flex h-[200px] items-center justify-center text-[13px] text-neutral-500">
          Building the network map…
        </div>
      ) : nodes.length === 0 ? (
        <div className="m-4 rounded-xl border border-dashed border-white/10 p-12 text-center text-[13px] text-neutral-500">
          No network to show yet. Run analysis first.
        </div>
      ) : (
        <>
          <div ref={wrapRef} className="relative mx-auto w-full max-w-[400px] px-3 py-3">
            <div
              className={`pointer-events-none absolute inset-6 rounded-full ${
                isOrange
                  ? "bg-[radial-gradient(circle,rgba(234,88,12,0.08),transparent_62%)]"
                  : "bg-[radial-gradient(circle,rgba(239,68,68,0.08),transparent_62%)]"
              }`}
            />
            <svg
              viewBox={`0 0 ${size.w} ${size.h}`}
              className="relative z-[1] mx-auto h-auto max-h-[280px] w-full select-none"
              role="img"
              aria-label="Case network graph"
              onClick={() => setSelectedId(null)}
            >
              <defs>
                <filter id="node-glow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <marker
                  id={markerId}
                  viewBox="0 0 10 10"
                  refX="10"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={stroke} />
                </marker>
              </defs>

              <circle
                cx={coords.cx}
                cy={coords.cy}
                r={coords.radius}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="3 10"
                className={revealed ? "network-orbit" : ""}
              />

              {edges.map((edge, i) => {
                const { from, to } = edgeEnds(edge);
                const start = coords.points[from];
                const end = coords.points[to];
                if (!start || !end) return null;

                const length = Math.hypot(end.x - start.x, end.y - start.y);
                const active = !focusId || (linked.has(from) && linked.has(to) && (from === focusId || to === focusId));

                return (
                  <line
                    key={`edge-${from}-${to}-${i}`}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={stroke}
                    strokeWidth={active ? 1.5 : 0.9}
                    strokeDasharray={revealed ? "5 7" : length}
                    strokeDashoffset={revealed ? 0 : length}
                    markerEnd={`url(#${markerId})`}
                    opacity={revealed ? (active ? 0.85 : 0.12) : 0}
                    className={revealed && active ? "network-edge-flow" : ""}
                    style={{
                      transition: `stroke-dashoffset 700ms ${120 + i * 45}ms ease-out, opacity 400ms ${80 + i * 30}ms ease-out`,
                    }}
                  />
                );
              })}

              {nodes.map((node, i) => {
                const pt = coords.points[node.id];
                if (!pt) return null;

                const isPerson = node.type === "PERSON";
                const isUnknown = node.type === "UNKNOWN";
                const active = !focusId || linked.has(node.id);
                const selected = selectedId === node.id;
                const fill = isPerson ? (isOrange ? "#7c2d12" : "#7f1d1d") : isUnknown ? "#3b0764" : "#18181b";
                const rim = isPerson ? stroke : isUnknown ? "#c084fc" : "#71717a";
                const x = revealed ? pt.x : coords.cx;
                const y = revealed ? pt.y : coords.cy;

                return (
                  <g
                    key={node.id}
                    className="cursor-pointer"
                    transform={`translate(${x} ${y})`}
                    style={{
                      transition: `transform 720ms ${i * 55}ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms`,
                      opacity: revealed ? (active ? 1 : 0.28) : 0,
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleNodeClick(node);
                    }}
                    onMouseEnter={() => setHoveredId(node.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <circle
                      r={selected || hoveredId === node.id ? 16 : 13}
                      fill={glow}
                      className="network-pulse"
                      style={{ pointerEvents: "none" }}
                    />
                    <circle
                      r="10"
                      fill={fill}
                      stroke={rim}
                      strokeWidth={selected ? 2 : 1.4}
                      filter={active ? "url(#node-glow)" : undefined}
                      className="network-node-core"
                    />
                    <text
                      y="3.5"
                      textAnchor="middle"
                      fill="#fafafa"
                      fontSize="8"
                      fontWeight="700"
                      style={{ pointerEvents: "none" }}
                    >
                      {isPerson ? "P" : isUnknown ? "?" : "N"}
                    </text>
                    <text
                      x={Math.cos(pt.angle) * 20}
                      y={Math.sin(pt.angle) * 20 + 3}
                      textAnchor={Math.cos(pt.angle) > 0.25 ? "start" : Math.cos(pt.angle) < -0.25 ? "end" : "middle"}
                      fill="#d4d4d8"
                      fontSize="8"
                      style={{ pointerEvents: "none" }}
                    >
                      {(node.label || node.id).slice(0, 14)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {selectedId && (
            <div className="mx-4 mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[13px] text-neutral-300">
              Highlighting{" "}
              <span className={isOrange ? "text-orange-300" : "text-red-300"}>
                {nodes.find((node) => node.id === selectedId)?.label || selectedId}
              </span>
              . Hover or tap another person to follow a different path.
            </div>
          )}

          <div className="space-y-2 border-t border-white/10 px-4 py-4 sm:px-5">
            <div className="text-[12px] text-neutral-400">Connections</div>
            {edges.length === 0 ? (
              <p className="text-[13px] text-neutral-500">No links in this network yet.</p>
            ) : (
              edges.map((edge, i) => {
                const { from, to } = edgeEnds(edge);
                const active = !focusId || (linked.has(from) && linked.has(to) && (from === focusId || to === focusId));
                const fromLabel = nodes.find((node) => node.id === from)?.label || from;
                const toLabel = nodes.find((node) => node.id === to)?.label || to;

                return (
                  <div
                    key={`${from}-${to}-${i}`}
                    className={`rounded-xl border p-3 transition-all duration-300 ${
                      active
                        ? isOrange
                          ? "border-orange-500/25 bg-orange-500/[0.04]"
                          : "border-red-500/25 bg-red-500/[0.04]"
                        : "border-white/5 bg-transparent opacity-40"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                      <span className="font-medium text-white">{fromLabel}</span>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[11px] ${
                          isOrange
                            ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
                            : "border-red-500/30 bg-red-500/10 text-red-300"
                        }`}
                      >
                        {humanize(edge.type, "Linked to")}
                      </span>
                      <span className="font-medium text-white">{toLabel}</span>
                    </div>
                    {edge.evidence && (
                      <p className="mt-2 border-t border-white/5 pt-2 text-[12px] leading-5 text-neutral-500">
                        “{edge.evidence}”
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
