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
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Chronological Investigation Timeline
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Sequence of crimes, seizures, intercepts, and raid statements
          </p>
        </div>
        <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded text-neutral-400">
          {incidents.length} Chronological Events
        </span>
      </div>

      {incidents.length === 0 ? (
        <div className="p-12 text-center text-xs text-neutral-500 border border-dashed border-zinc-800 rounded">
          No chronological timeline points logged yet. Trigger AI analysis first.
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
                    {inc.time?.start ? `⏰ ${inc.time.start}` : `EVENT #${idx + 1}`}
                  </span>
                  <span className={`text-[9px] px-2 py-0.5 border font-bold uppercase rounded ${badgeBg}`}>
                    {inc.extraction?.method || "EVIDENCE PARSED"}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white mb-2">
                  {inc.title || "Incident Report Log"}
                </h4>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  {inc.description || inc.summary || "No specific narrative captured."}
                </p>

                {inc.key_points && inc.key_points.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-800/60">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block mb-1.5">
                      Extracted Intel Points:
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