"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Case, TimelineEvent } from "@/types/netra";

export default function CaseTimelinePage() {
  const router = useRouter();
  const { caseCode } = useParams<{ caseCode: string }>();

  const [caseRecord, setCaseRecord] = useState<Case | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/cases/${caseCode}`);
      const payload = await response.json();
      if (!response.ok || !payload.success || !payload.case) {
        setError(payload.error ?? "Case not found.");
        setLoading(false);
        return;
      }
      setCaseRecord(payload.case as Case);
      setEvents([]);
      setLoading(false);
    }
    if (caseCode) void load();
  }, [caseCode]);

  if (loading) return <main className="min-h-screen bg-[#080808] px-6 py-24 text-center font-mono text-xs tracking-widest text-neutral-500">LOADING TIMELINE…</main>;
  if (error || !caseRecord) {
    return (
      <main className="min-h-screen bg-[#080808] px-6 py-24 text-center text-neutral-300">
        <p className="text-sm text-red-400">{error ?? "Case not found."}</p>
        <button onClick={() => router.push("/cases")} className="mt-6 border border-neutral-700 px-4 py-2 text-xs tracking-widest hover:border-red-500">BACK TO CASES</button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080808] text-neutral-200">
      <div className="mx-auto max-w-[900px] px-6 py-10 md:px-10">
        <button onClick={() => router.push(`/cases/${caseCode}`)} className="text-[11px] tracking-[0.16em] text-neutral-400 hover:text-red-400">
          ← BACK TO CASE
        </button>

        <h1 className="mt-5 text-3xl font-bold tracking-tight text-white">EVENT TIMELINE</h1>
        <p className="mt-2 text-xs text-neutral-500">{caseRecord.title}</p>

        {events.length === 0 ? (
          <div className="mt-10 border border-neutral-800 bg-[#0d0d0d] py-16 text-center text-sm text-neutral-500">
            No timeline events recorded yet.
          </div>
        ) : (
          <div className="mt-10 relative pl-6 border-l border-neutral-800">
            {events.map((e) => (
              <div key={e.id} className="relative mb-8 last:mb-0">
                <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-red-500 bg-[#080808]" />
                <div className="text-[10px] tracking-widest text-red-400">
                  {new Date(e.event_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  {e.event_time && <span className="text-neutral-500"> · {e.event_time}</span>}
                </div>
                <div className="mt-1.5 text-sm font-semibold text-white">{e.title}</div>
                {e.details && <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">{e.details}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}