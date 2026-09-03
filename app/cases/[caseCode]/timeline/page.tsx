"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface IncidentRecord {
  title?: string;
  description?: string;
  summary?: string;
  key_points?: string[];
  time?: { start?: string };
  extraction?: { method?: string };
}

interface CaseRecord {
  _id?: string;
  case_code: string;
  title: string;
  status: string;
  ai_extracted_data?: {
    incidents?: IncidentRecord[];
  };
}

export default function CaseTimelinePage() {
  const router = useRouter();
  const { caseCode } = useParams<{ caseCode: string }>();

  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [events, setEvents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/cases/${caseCode}`);
        const payload = await response.json();

        if (!response.ok || !payload.success || !payload.case) {
          setError(payload.error ?? "Case not found.");
          setLoading(false);
          return;
        }

        const caseData = payload.case as CaseRecord;
        setCaseRecord(caseData);

        // AI extracted incidents se timeline populate karega
        const incidents = caseData.ai_extracted_data?.incidents || [];
        setEvents(incidents);
      } catch {
        setError("Could not load the timeline.");
      } finally {
        setLoading(false);
      }
    }

    if (caseCode) void load();
  }, [caseCode]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#080808] px-6 py-24 text-center font-mono text-xs tracking-widest text-neutral-500">
        Loading timeline…
      </main>
    );
  }

  if (error || !caseRecord) {
    return (
      <main className="min-h-screen bg-[#080808] px-6 py-24 text-center text-neutral-300 font-mono">
        <p className="text-sm text-red-400">{error ?? "Case not found."}</p>
        <button
          onClick={() => router.push("/cases")}
          className="mt-6 border border-neutral-700 px-4 py-2 text-xs tracking-widest hover:border-red-500 text-neutral-300"
        >
          Back to cases
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080808] text-neutral-200 font-mono">
      <div className="mx-auto max-w-[900px] px-6 py-10 md:px-10">
        <button
          onClick={() => router.push(`/cases/${caseCode}`)}
          className="text-[11px] tracking-[0.16em] text-neutral-400 hover:text-red-400"
        >
          ← Back to case
        </button>

        <div className="mt-5 border-b border-white/10 pb-5">
          <span className="text-xs text-red-500 font-bold uppercase">{caseRecord.case_code}</span>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Timeline</h1>
          <p className="mt-1 text-xs text-neutral-400">{caseRecord.title}</p>
        </div>

        {events.length === 0 ? (
          <div className="mt-10 border border-neutral-800 bg-[#0d0d0d] py-16 text-center text-xs text-neutral-500">
            No timeline events yet. Run analysis first.
          </div>
        ) : (
          <div className="mt-10 relative pl-6 border-l border-red-900/40">
            {events.map((e, idx) => (
              <div key={idx} className="relative mb-10 last:mb-0 group">
                <span className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-red-500 bg-[#080808] group-hover:bg-red-500 transition-colors" />

                <div className="text-[13px] font-medium text-red-400">
                  {e.time?.start ? e.time.start : `Event ${idx + 1}`}
                  {e.extraction?.method && (
                    <span className="ml-2 text-neutral-500">· {e.extraction.method.replace(/[_-]+/g, " ")}</span>
                  )}
                </div>

                <div className="mt-2 text-sm font-semibold text-white">
                  {e.title || "Incident"}
                </div>

                <p className="mt-2 text-xs leading-relaxed text-neutral-300">
                  {e.description || e.summary || "No narrative details recorded."}
                </p>

                {e.key_points && e.key_points.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-neutral-850">
                    <span className="mb-1 block text-[12px] text-neutral-500">
                      Key points
                    </span>
                    <ul className="space-y-1">
                      {e.key_points.map((pt, ptIdx) => (
                        <li key={ptIdx} className="text-[11px] text-neutral-400 flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}