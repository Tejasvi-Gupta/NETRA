"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Case, Evidence } from "@/types/netra";

const categoryLabel: Record<string, { label: string; icon: string }> = {
  POSTMORTEM: { label: "Postmortem", icon: "🩺" },
  FSL: { label: "Forensic Lab", icon: "🔬" },
  DIGITAL_FORENSICS: { label: "Digital Forensics", icon: "💻" },
  WITNESS_STATEMENT: { label: "Witness Statement", icon: "🗣️" },
  CCTV: { label: "CCTV", icon: "🎥" },
  RECOVERED_MATERIAL: { label: "Recovered Material", icon: "📦" },
  SOCIAL_MEDIA: { label: "Social Media", icon: "📱" },
};

export default function CaseEvidencePage() {
  const router = useRouter();
  const { caseCode } = useParams<{ caseCode: string }>();

  const [caseRecord, setCaseRecord] = useState<Case | null>(null);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  useEffect(() => {
    async function load() {
      const { data: caseData, error: caseError } = await supabase.from("cases").select("*").eq("case_code", caseCode).single();
      if (caseError || !caseData) {
        setError(caseError?.message ?? "Case not found.");
        setLoading(false);
        return;
      }
      setCaseRecord(caseData);

      const { data, error: evError } = await supabase
        .from("evidence")
        .select("*")
        .eq("case_id", caseData.id)
        .order("event_date", { ascending: true });

      if (evError) setError(evError.message);
      else setEvidenceList(data ?? []);
      setLoading(false);
    }
    if (caseCode) void load();
  }, [caseCode]);

  const categories = useMemo(() => ["ALL", ...Array.from(new Set(evidenceList.map((e) => e.category)))], [evidenceList]);
  const filtered = useMemo(
    () => (categoryFilter === "ALL" ? evidenceList : evidenceList.filter((e) => e.category === categoryFilter)),
    [evidenceList, categoryFilter]
  );

  if (loading) return <main className="min-h-screen bg-[#080808] px-6 py-24 text-center font-mono text-xs tracking-widest text-neutral-500">LOADING EVIDENCE LOG…</main>;
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
      <div className="mx-auto max-w-[1100px] px-6 py-10 md:px-10">
        <button onClick={() => router.push(`/cases/${caseCode}`)} className="text-[11px] tracking-[0.16em] text-neutral-400 hover:text-red-400">
          ← BACK TO CASE
        </button>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">EVIDENCE LOG</h1>
            <p className="mt-2 text-xs text-neutral-500">{evidenceList.length} items · {caseRecord.title}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1.5 text-[10px] tracking-wide border ${
                categoryFilter === c ? "border-red-500 text-red-300 bg-red-500/5" : "border-neutral-800 text-neutral-400 hover:border-neutral-600"
              }`}
            >
              {c === "ALL" ? "All" : (categoryLabel[c]?.label ?? c)}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-10 border border-neutral-800 bg-[#0d0d0d] py-16 text-center text-sm text-neutral-500">
            No evidence recorded yet.
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {filtered.map((ev) => {
              const meta = categoryLabel[ev.category] ?? { label: ev.category, icon: "📄" };
              return (
                <div key={ev.id} className="border border-neutral-800 bg-[#111] p-5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[10px] tracking-widest text-red-400">
                      <span>{meta.icon}</span>{meta.label}
                    </span>
                    {ev.event_date && (
                      <span className="text-[9px] text-neutral-600">
                        {new Date(ev.event_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 text-sm font-semibold text-white">{ev.title}</div>
                  {ev.summary && <p className="mt-2 text-xs leading-relaxed text-neutral-400">{ev.summary}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}