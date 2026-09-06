"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CaseTimelineView, { type TimelineItem } from "@/components/CaseTimelineView";
import { loadWorkspaceCase } from "@/lib/workspaceCase";

export default function CaseTimelinePage() {
  const router = useRouter();
  const { caseCode } = useParams<{ caseCode: string }>();

  const [title, setTitle] = useState("");
  const [code, setCode] = useState(caseCode || "");
  const [events, setEvents] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!caseCode) return;
      try {
        const found = await loadWorkspaceCase(caseCode);
        if (!found) {
          setError("Case not found.");
          return;
        }

        setCode(found.case_code);
        setTitle(String(found.title || ""));

        const incidents = ((found.ai_extracted_data as { incidents?: TimelineItem[] } | null)?.incidents || []) as TimelineItem[];

        if (found.ai_case_id) {
          const res = await fetch(`/api/ai/timeline?case_id=${found.ai_case_id}`);
          const data = await res.json();
          if (res.ok && data.success && Array.isArray(data.events) && data.events.length > 0) {
            setEvents(data.events);
            return;
          }
          if (res.status === 404) {
            setError(data.error || "Case not found on the FIR API.");
            setEvents(incidents);
            return;
          }
        }

        setEvents(incidents);
      } catch {
        setError("Could not load the timeline.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [caseCode]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#080808] px-6 py-24 text-center font-mono text-xs tracking-widest text-neutral-500">
        Loading timeline…
      </main>
    );
  }

  if (error && events.length === 0) {
    return (
      <main className="min-h-screen bg-[#080808] px-6 py-24 text-center font-mono text-neutral-300">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={() => router.push(`/cases/${caseCode}`)}
          className="mt-6 border border-neutral-700 px-4 py-2 text-xs tracking-widest text-neutral-300 hover:border-red-500"
        >
          Back to case
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080808] font-mono text-neutral-200">
      <div className="mx-auto max-w-[900px] px-6 py-10 md:px-10">
        <button
          onClick={() => router.push(`/cases/${caseCode}`)}
          className="text-[11px] tracking-[0.16em] text-neutral-400 hover:text-red-400"
        >
          ← Back to case
        </button>

        <div className="mt-5 border-b border-white/10 pb-5">
          <span className="text-xs font-bold uppercase text-red-500">{code}</span>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Timeline</h1>
          <p className="mt-1 text-xs text-neutral-400">{title}</p>
        </div>

        <div className="mt-8">
          <CaseTimelineView incidents={events} themeColor="red" />
        </div>
      </div>
    </main>
  );
}
