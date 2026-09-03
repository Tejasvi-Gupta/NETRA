"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface CaseItem {
  _id: string;
  case_code: string;
  title: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "ACTIVE" | "UNDER_REVIEW" | "CLOSED";
  assigned_investigator?: string;
  last_signal_at?: string;
}

const priorityColor: Record<string, string> = {
  CRITICAL: "text-red-500",
  HIGH: "text-orange-400",
  MEDIUM: "text-amber-400",
  LOW: "text-neutral-500",
};

const statusColor: Record<string, string> = {
  ACTIVE: "text-emerald-400",
  UNDER_REVIEW: "text-amber-400",
  CLOSED: "text-neutral-500",
};

export default function AllCasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem("netra_role");
    setRole(storedRole);
  }, []);

  useEffect(() => {
    async function loadCases() {
      try {
        const res = await fetch("/api/cases");
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Failed to load cases");
        setCases(data.cases || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load cases");
      } finally {
        setLoading(false);
      }
    }
    void loadCases();
  }, []);

  const filteredCases = useMemo(() => {
    if (!search.trim()) return cases;
    const q = search.toLowerCase();
    return cases.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.case_code.toLowerCase().includes(q) ||
        (c.assigned_investigator || "").toLowerCase().includes(q)
    );
  }, [cases, search]);

  function workspacePath() {
    return role === "investigator" ? "/investigator/dashboard" : "/admin/dashboard";
  }

  function openCase(caseCode: string) {
    if (role === "investigator") {
      router.push(`/cases/${caseCode}`);
      return;
    }
    router.push(`/admin/cases/${caseCode}`);
  }

  function relativeTime(iso?: string) {
    if (!iso) return "—";
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return "—";
    const mins = Math.floor((Date.now() - parsed.getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
    return `${Math.floor(hrs / 24)} d ago`;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050505] font-mono text-neutral-200">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(239,68,68,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.5) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 90% 90% at 50% 0%, black 20%, transparent 75%)",
        }}
      />
      <div className="pointer-events-none fixed -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-red-600/10 blur-[130px]" />
      <div className="pointer-events-none fixed -bottom-40 right-0 h-[500px] w-[500px] rounded-full bg-orange-600/10 blur-[130px]" />

      <div className="relative z-10 mx-auto max-w-[1180px] px-4 py-8 pb-28 sm:px-8 sm:py-10">
        <button
          onClick={() => router.push(workspacePath())}
          className="text-[13px] text-neutral-400 hover:text-white"
        >
          ← Intelligence Workspace
        </button>

        <div className="mt-6 mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold tracking-tight text-white sm:text-[36px]">All cases</h1>
            <p className="mt-2 text-[13px] leading-6 text-neutral-500">
              {loading ? "Loading…" : `${filteredCases.length} case${filteredCases.length === 1 ? "" : "s"}`}
            </p>
          </div>

          <label className="flex h-10 min-w-0 w-full items-center gap-2.5 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3.5 focus-within:border-white/25 lg:w-[280px]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="1.75" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cases"
              className="w-full min-w-0 bg-transparent text-[13px] text-neutral-100 outline-none placeholder:text-neutral-500"
            />
          </label>
        </div>

        {error && (
          <div className="mb-6 border border-red-900/40 bg-red-950/20 p-4 text-xs text-red-400">{error}</div>
        )}

        <div className="border border-white/10 bg-white/[0.01]">
          <div className="hidden border-b border-white/10 px-6 py-3.5 text-[10px] tracking-wide text-neutral-500 lg:grid lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_auto_auto_auto_1rem] lg:items-center lg:gap-x-6">
            <div>CASE ID / TITLE</div>
            <div>INVESTIGATOR(S)</div>
            <div>PRIORITY</div>
            <div>STATUS</div>
            <div>LAST ACTIVITY</div>
            <div />
          </div>

          {loading ? (
            <div className="py-10 text-center text-xs text-neutral-500">Loading cases…</div>
          ) : filteredCases.length === 0 ? (
            <div className="py-10 text-center text-xs text-neutral-500">No matching cases found.</div>
          ) : (
            filteredCases.map((c) => (
              <div
                key={c._id}
                onClick={() => openCase(c.case_code)}
                className="cursor-pointer border-b border-white/5 px-4 py-4 transition-colors hover:bg-red-500/[0.03] lg:grid lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_auto_auto_auto_1rem] lg:items-center lg:gap-x-6 lg:px-6 lg:py-5"
              >
                <div className="min-w-0">
                  <div className="text-[11px] tracking-wide text-red-500">{c.case_code}</div>
                  <div className="mt-1.5 text-[15px] font-semibold leading-6 break-words text-white">{c.title}</div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 lg:mt-0 lg:contents">
                  <div className="min-w-0 text-[12px] leading-5 text-neutral-400">
                    <span className="mr-1 text-neutral-600 lg:hidden">Investigator</span>
                    {c.assigned_investigator || "—"}
                  </div>
                  <div className={`flex items-center gap-2 text-[12px] tracking-wide ${priorityColor[c.priority]}`}>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                    {c.priority}
                  </div>
                  <div className={`text-[12px] tracking-wide ${statusColor[c.status]}`}>{c.status}</div>
                  <div className="text-[12px] text-neutral-500">{relativeTime(c.last_signal_at)}</div>
                  <div className="hidden text-sm text-neutral-600 lg:block">›</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
