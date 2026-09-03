"use client";

import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";

interface CaseItem {
  _id: string;
  case_code: string;
  title: string;
  case_type: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "ACTIVE" | "UNDER_REVIEW" | "CLOSED";
  assigned_investigator: string;
  last_signal_at: string;
}

interface ActivityRow {
  _id: string;
  case_code: string | null;
  event_type: string;
  description: string;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [summary, setSummary] = useState({ activeCount: 0, highRiskCount: 0, resolvedCount: 0 });
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [selectedCaseCode, setSelectedCaseCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(new Date());
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const role = localStorage.getItem("netra_role");
    if (role !== "admin") router.replace("/login");
  }, [router]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [casesRes, actRes] = await Promise.all([
        fetch("/api/cases").then((r) => r.json()),
        fetch("/api/activities").then((r) => r.json()),
      ]);

      if (!casesRes.success) throw new Error(casesRes.error || "Failed to load cases");

      setCases(casesRes.cases || []);
      setSummary(casesRes.summary || { activeCount: 0, highRiskCount: 0, resolvedCount: 0 });
      setActivity(actRes.activities || []);

      if (casesRes.cases?.length > 0) {
        setSelectedCaseCode(casesRes.cases[0].case_code);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong loading dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The fetch updates loading/data state when the external requests complete.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredCases = useMemo(() => {
    if (!search.trim()) return cases;
    const q = search.toLowerCase();
    return cases.filter(
      (c) => c.title.toLowerCase().includes(q) || c.case_code.toLowerCase().includes(q)
    );
  }, [cases, search]);

  const visibleCases = filteredCases.slice(0, 5);

  const dateStr = now
    .toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
    .toUpperCase();

  function relativeTime(iso?: string | null) {
    if (!iso) return "—";
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return "—";

    const diffMs = now.getTime() - parsed.getTime();
    if (diffMs < 0) return "just now";

    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;

    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;

    const days = Math.floor(hrs / 24);
    return `${days} d ago`;
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

  const activityDot: Record<string, string> = {
    CASE_CREATED: "bg-cyan-400",
    CASE_STATUS_CHANGED: "bg-amber-400",
    EVIDENCE_ADDED: "bg-emerald-400",
  };

  function handleLogout() {
    localStorage.removeItem("netra_role");
    router.push("/login");
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
        <div className="mb-5 flex items-center gap-2 text-[11px] tracking-[2px] text-neutral-500">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500 animate-pulse" />
          <span className="min-w-0 break-words">OVERVIEW / {dateStr}</span>
        </div>

        <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold tracking-tight text-white sm:text-[36px]">Intelligence Workspace</h1>
            <p className="mt-2 text-[13px] leading-6 text-neutral-500">
              Full-system view of active investigations and personnel.
            </p>
          </div>

          <div className="flex w-full min-w-0 flex-wrap items-center gap-3 lg:w-auto">
            <button
              onClick={() => router.push("/cases/new")}
              className="h-10 shrink-0 rounded-lg border border-red-500/35 bg-red-500/[0.12] px-4 text-[11px] font-semibold tracking-[0.12em] text-red-200 transition-colors hover:border-red-400/60 hover:bg-red-500/20 hover:text-white"
            >
              + ADD NEW CASE
            </button>

            <label className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3.5 transition-colors focus-within:border-white/25 focus-within:bg-white/[0.07] sm:min-w-[220px] lg:w-[260px] lg:flex-none">
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

            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => setAvatarOpen((o) => !o)}
                className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-[#161010] text-[12px] font-semibold tracking-wide text-red-200 transition-colors hover:border-white/25 hover:text-white"
                aria-label="Admin menu"
              >
                <span className="pointer-events-none absolute inset-x-1.5 top-0 h-[42%] rounded-full bg-gradient-to-b from-white/[0.08] to-transparent" />
                A
              </button>

              {avatarOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] z-20 w-52 overflow-hidden rounded-xl border border-white/15 bg-[#0c0c0e]/80 shadow-[0_18px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl">
                  <div className="px-4 py-3 border-b border-white/10">
                    <div className="text-[13px] font-bold text-white">Admin</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">System Administrator</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left text-[12px] text-red-400 hover:bg-white/5 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    LOG OUT
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <hr className="border-white/10 mb-8" />

        {error && (
          <div className="mb-8 p-4 border border-red-900/40 bg-red-950/20 text-red-400 text-xs">
            Failed to load dashboard: {error}
          </div>
        )}

        <div className="mb-4 text-xs tracking-[3px] font-bold text-neutral-200">
          SITUATION SUMMARY
        </div>

        <div className="mb-12 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Active Cases", value: summary.activeCount },
            { label: "High-Risk Cases", value: summary.highRiskCount },
            { label: "Cases Resolved", value: summary.resolvedCount },
            { label: "Detection Accuracy", value: "98.4%" },
          ].map((s) => (
            <div
              key={s.label}
              className="min-w-0 border border-white/10 bg-white/[0.02] p-5 hover:border-red-500/30 transition-colors"
            >
              <div className="text-xs leading-5 text-neutral-500">{s.label}</div>
              <div className="mt-3 truncate text-[32px] font-semibold leading-none text-red-500 sm:text-[36px]">
                {loading ? "—" : s.value}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs tracking-[3px] font-bold text-neutral-200">ACTIVE INVESTIGATIONS</div>
          <button onClick={() => router.push("/cases")} className="text-[11px] tracking-wide text-red-500 hover:underline">
            VIEW ALL CASES →
          </button>
        </div>

        <div className="mb-12 border border-white/10 bg-white/[0.01]">
          <div className="hidden border-b border-white/10 px-6 py-3.5 text-[10px] tracking-wide text-neutral-500 lg:grid lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_auto_auto_auto_1rem] lg:items-center lg:gap-x-6">
            <div>CASE ID / TITLE</div>
            <div>INVESTIGATOR(S)</div>
            <div>PRIORITY</div>
            <div>STATUS</div>
            <div>LAST ACTIVITY</div>
            <div />
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-neutral-500">Loading cases…</div>
          ) : visibleCases.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">No matching cases found.</div>
          ) : (
            visibleCases.map((c) => (
              <div
                key={c._id}
                onClick={() => {
                  setSelectedCaseCode(c.case_code);
                  router.push(`/admin/cases/${c.case_code}`);
                }}
                className={`cursor-pointer border-b border-white/5 px-4 py-4 transition-colors hover:bg-red-500/[0.03] lg:grid lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_auto_auto_auto_1rem] lg:items-center lg:gap-x-6 lg:px-6 lg:py-5 ${
                  selectedCaseCode === c.case_code ? "bg-red-500/[0.05] shadow-[inset_2px_0_0_#ef4444]" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="text-[11px] tracking-wide text-red-500">{c.case_code}</div>
                  <div className="mt-1.5 text-[15px] font-semibold leading-6 break-words text-white">{c.title}</div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 lg:mt-0 lg:contents">
                  <div className="min-w-0 text-[12px] leading-5 text-neutral-400">
                    <span className="mr-1 text-neutral-600 lg:hidden">Investigator</span>
                    {c.assigned_investigator}
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

        {/* Recent System Activity */}
        <div className="mb-4 text-xs tracking-[3px] font-bold text-neutral-200">
          RECENT SYSTEM ACTIVITY
        </div>

        <div className="mb-8 border border-white/10 bg-white/[0.01] p-4 sm:p-6">
          {activity.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">No system activity yet.</div>
          ) : (
            <div className="relative border-l border-white/10 pl-5 sm:pl-6">
              {activity.map((a) => (
                <div key={a._id} className="relative mb-7 last:mb-0">
                  <span
                    className={`absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#050505] sm:-left-[31px] ${
                      activityDot[a.event_type] ?? "bg-neutral-500"
                    }`}
                  />
                  <div className="text-[10px] tracking-widest text-neutral-500">
                    {relativeTime(a.createdAt).toUpperCase()}
                  </div>
                  <div className="mt-1 pr-2 text-[13px] leading-6 break-words text-white">{a.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}