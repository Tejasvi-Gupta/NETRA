"use client";

interface IncidentRecord {
  title?: string;
  description?: string;
  summary?: string;
  key_points?: string[];
  time?: { start?: string };
  extraction?: { method?: string };
}

interface CaseTimelineViewProps {
  incidents: IncidentRecord[];
  themeColor?: "red" | "orange";
}

export default function CaseTimelineView({
  incidents = [],
  themeColor = "red",
}: CaseTimelineViewProps) {
  const isRed = themeColor === "red";

  const dotBorder = isRed ? "border-red-500" : "border-orange-500";
  const textAccent = isRed ? "text-red-400" : "text-orange-400";
  const badgeBg = isRed
    ? "bg-red-950/40 border-red-700/40 text-red-300"
    : "bg-orange-950/40 border-orange-700/40 text-orange-300";
  const hoverBorder = isRed ? "hover:border-red-500/40" : "hover:border-orange-500/40";
  const bulletColor = isRed ? "text-red-500" : "text-orange-500";

  return (
    <div className="border border-zinc-800 bg-zinc-950 p-6 rounded">
      <div className="flex justify-between items-center mb-6 pb-3 border-b border-zinc-900">
        <div>
          <h3 className="text-[14px] font-medium text-white">
            Timeline
          </h3>
          <p className="mt-0.5 text-[13px] text-zinc-500">
            Events in this case, in order
          </p>
        </div>
        <span className="rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[12px] text-neutral-400">
          {incidents.length} {incidents.length === 1 ? "event" : "events"}
        </span>
      </div>

      {incidents.length === 0 ? (
        <div className="p-12 text-center text-xs text-neutral-500 border border-dashed border-zinc-800 rounded">
          No timeline events yet. Run analysis first.
        </div>
      ) : (
        <div className="relative border-l border-zinc-800 ml-4 pl-6 space-y-8 my-4">
          {incidents.map((inc, idx) => (
            <div key={idx} className="relative group">
              {/* Timeline Dot Indicator */}
              <div
                className={`absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full bg-black border-2 ${dotBorder} transition-transform group-hover:scale-125`}
              />

              <div
                className={`bg-zinc-900/30 border border-zinc-800/80 p-4 rounded ${hoverBorder} transition-colors`}
              >
                <div className="flex items-center justify-between gap-4 mb-2">
                  <span className={`text-xs font-bold font-mono tracking-wide ${textAccent}`}>
                    {inc.time?.start ? inc.time.start : `Event ${idx + 1}`}
                  </span>
                  {inc.extraction?.method && (
                    <span className={`rounded border px-2 py-0.5 text-[11px] ${badgeBg}`}>
                      {inc.extraction.method.replace(/[_-]+/g, " ")}
                    </span>
                  )}
                </div>

                <h4 className="mb-2 text-[14px] font-medium text-white">
                  {inc.title || "Incident"}
                </h4>

                <p className="text-[13px] leading-6 text-zinc-300">
                  {inc.description || inc.summary || "No details recorded."}
                </p>

                {inc.key_points && inc.key_points.length > 0 && (
                  <div className="mt-3 border-t border-zinc-800/60 pt-2.5">
                    <span className="mb-1.5 block text-[12px] text-neutral-500">
                      Key points
                    </span>
                    <ul className="space-y-1">
                      {inc.key_points.map((pt, i) => (
                        <li key={i} className="text-[11px] text-zinc-400 flex items-start gap-2">
                          <span className={`${bulletColor} mt-0.5 font-bold`}>•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}