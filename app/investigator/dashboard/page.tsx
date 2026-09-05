"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";

interface CaseItem {
  _id: string;
  case_code: string;
  title: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "ACTIVE" | "UNDER_REVIEW" | "CLOSED";
  last_signal_at: string;
  sources?: { type: string; title: string; content: string; uploaded_at?: string }[];
}

export default function InvestigatorDashboard() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [search, setSearch] = useState("");
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const role = localStorage.getItem("netra_role");
    if (role !== "investigator") router.replace("/login");
  }, [router]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const cRes = await fetch("/api/cases").then((r) => r.json());
        if (cRes.success) setCases(cRes.cases || []);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredCases = useMemo(() => {
    if (!search.trim()) return cases;
    const q = search.toLowerCase();
    return cases.filter(
      (c) => c.title.toLowerCase().includes(q) || c.case_code.toLowerCase().includes(q)
    );
  }, [cases, search]);

  const visibleCases = filteredCases.slice(0, 5);

  const activeCount = useMemo(() => cases.filter((c) => c.status === "ACTIVE").length, [cases]);
  const highPriorityCount = useMemo(
    () => cases.filter((c) => c.priority === "HIGH" || c.priority === "CRITICAL").length,
    [cases]
  );
  const underReviewCount = useMemo(() => cases.filter((c) => c.status === "UNDER_REVIEW").length, [cases]);

  const dateStr = now
    .toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
    .toUpperCase();

  function relativeTime(iso?: string) {
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

  function handleLogout() {
    localStorage.removeItem("netra_role");
    localStorage.removeItem("netra_display_name");
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
            <h1 className="text-[28px] font-semibold tracking-tight text-white sm:text-[36px]">
              Intelligence Workspace
            </h1>
            <p className="mt-2 text-[13px] leading-6 text-neutral-500">
              Your assigned investigations and case workload.
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
                aria-label="Investigator menu"
              >
                <span className="pointer-events-none absolute inset-x-1.5 top-0 h-[42%] rounded-full bg-gradient-to-b from-white/[0.08] to-transparent" />
                I
              </button>

              {avatarOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] z-20 w-52 overflow-hidden rounded-xl border border-white/15 bg-[#0c0c0e]/80 shadow-[0_18px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl">
                  <div className="border-b border-white/10 px-4 py-3">
                    <div className="text-[13px] font-bold text-white">Investigator</div>
                    <div className="mt-0.5 text-[10px] text-neutral-500">Field analyst</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-[12px] text-red-400 transition-colors hover:bg-white/5"
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

        <hr className="mb-8 border-white/10" />

        <div className="mb-4 text-xs font-bold tracking-[3px] text-neutral-200">SITUATION SUMMARY</div>

        <div className="mb-12 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Active Cases", value: activeCount },
            { label: "High Priority", value: highPriorityCount },
            { label: "Under Review", value: underReviewCount },
            { label: "Total Assigned", value: cases.length },
          ].map((m) => (
            <div
              key={m.label}
              className="min-w-0 border border-white/10 bg-white/[0.02] p-5 transition-colors hover:border-red-500/30"
            >
              <div className="text-xs leading-5 text-neutral-500">{m.label}</div>
              <div className="mt-3 truncate text-[32px] font-semibold leading-none text-red-500 sm:text-[36px]">
                {loading ? "—" : m.value}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold tracking-[3px] text-neutral-200">ACTIVE INVESTIGATIONS</div>
          <button onClick={() => router.push("/cases")} className="text-[11px] tracking-wide text-red-500 hover:underline">
            VIEW ALL CASES →
          </button>
        </div>

        <div className="mb-12 border border-white/10 bg-white/[0.01]">
          <div className="hidden border-b border-white/10 px-6 py-3.5 text-[10px] tracking-wide text-neutral-500 lg:grid lg:grid-cols-[minmax(0,2.4fr)_auto_auto_auto_1rem] lg:items-center lg:gap-x-6">
            <div>CASE ID / TITLE</div>
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
                onClick={() => router.push(`/cases/${c.case_code}`)}
                className="cursor-pointer border-b border-white/5 px-4 py-4 transition-colors hover:bg-red-500/[0.03] lg:grid lg:grid-cols-[minmax(0,2.4fr)_auto_auto_auto_1rem] lg:items-center lg:gap-x-6 lg:px-6 lg:py-5"
              >
                <div className="min-w-0">
                  <div className="text-[11px] tracking-wide text-red-500">{c.case_code}</div>
                  <div className="mt-1.5 text-[15px] font-semibold leading-6 break-words text-white">{c.title}</div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 lg:mt-0 lg:contents">
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
