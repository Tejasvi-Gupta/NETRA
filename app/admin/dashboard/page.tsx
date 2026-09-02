"use client";

import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import ChatbotWidget from "@/components/ChatbotWidget";

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
        fetch("/api/cases?limit=5").then((r) => r.json()),
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
    <div className="relative min-h-screen overflow-hidden bg-[#050505] font-mono text-neutral-200">
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

      <div className="relative z-10 max-w-[1180px] mx-auto px-8 py-10">
        <div className="flex items-center gap-2 text-[11px] tracking-[2px] text-neutral-500 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          OVERVIEW / {dateStr}
        </div>

        <div className="flex items-start justify-between flex-wrap gap-6 mb-6">
          <div>
            <h1 className="text-[36px] font-black text-white tracking-tight">Command Overview</h1>
            <p className="text-[13px] text-neutral-500 mt-2">Full-system view of active investigations and personnel.</p>
          </div>

          <div className="flex items-center gap-5">
            <button
              onClick={() => router.push("/cases/new")}
              className="border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-[11px] font-bold tracking-wide text-red-300 hover:border-red-500 hover:bg-red-500/15 transition-all"
            >
              + ADD NEW CASE
            </button>

            <div className="flex items-center gap-2 px-3.5 py-2 border border-white/10 bg-white/[0.02] min-w-[220px]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search intelligence"
                className="bg-transparent border-none outline-none text-neutral-200 text-xs w-full placeholder:text-neutral-600"
              />
            </div>

            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => setAvatarOpen((o) => !o)}
                className="w-[36px] h-[36px] rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center text-xs text-red-400 font-black hover:border-red-500 transition-all"
              >
                A
              </button>

              {avatarOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] w-52 border border-red-500/25 bg-[#0a0a0a] shadow-[0_0_30px_rgba(0,0,0,0.6)] z-20">
                  <div className="px-4 py-3 border-b border-white/10">
                    <div className="text-[13px] font-bold text-white">Admin</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">System Administrator</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left text-[12px] text-red-400 hover:bg-red-500/10 transition-colors"
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

        <div className="grid grid-cols-4 gap-4 mb-12">
          {[
            { label: "Active Cases", value: summary.activeCount },
            { label: "High-Risk Cases", value: summary.highRiskCount },
            { label: "Cases Resolved", value: summary.resolvedCount },
            { label: "Detection Accuracy", value: "98.4%" },
          ].map((s) => (
            <div
              key={s.label}
              className="border border-white/10 bg-white/[0.02] p-5 hover:border-red-500/30 transition-colors"
            >
              <div className="text-xs text-neutral-500">{s.label}</div>
              <div className="text-[36px] font-black text-red-500 mt-3">{loading ? "—" : s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="text-xs tracking-[3px] font-bold text-neutral-200">ACTIVE INVESTIGATIONS</div>
          <button onClick={() => router.push("/cases")} className="text-[11px] tracking-wide text-red-500 hover:underline flex items-center gap-1">
            VIEW ALL CASES →
          </button>
        </div>

        <div className="mb-12 border border-white/10 bg-white/[0.01]">
          <div className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_24px] px-5 py-3 text-[10px] tracking-wide text-neutral-500 border-b border-white/10">
            <div>CASE ID / TITLE</div>
            <div>INVESTIGATOR(S)</div>
            <div>PRIORITY</div>
            <div>STATUS</div>
            <div>LAST ACTIVITY</div>
            <div />
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-neutral-500">Loading cases…</div>
          ) : filteredCases.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">No matching cases found.</div>
          ) : (
            filteredCases.map((c) => (
              <div
                key={c._id}
                onClick={() => {
                  setSelectedCaseCode(c.case_code);
                  router.push(`/admin/cases/${c.case_code}`);
                }}
                className={`grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_24px] items-center px-5 py-4 border-b border-white/5 cursor-pointer transition-colors hover:bg-red-500/[0.03] ${
                  selectedCaseCode === c.case_code ? "bg-red-500/[0.05] border-l-2 border-l-red-500 pl-[18px]" : ""
                }`}
              >
                <div>
                  <div className="text-[11px] text-red-500 tracking-wide">{c.case_code}</div>
                  <div className="text-[15px] font-semibold text-white mt-1">{c.title}</div>
                </div>
                <div className="text-[11px] text-neutral-400">{c.assigned_investigator}</div>
                <div className={`flex items-center gap-1.5 text-[11px] tracking-wide ${priorityColor[c.priority]}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {c.priority}
                </div>
                <div className={`text-[11px] tracking-wide ${statusColor[c.status]}`}>{c.status}</div>
                <div className="text-[11px] text-neutral-500">{relativeTime(c.last_signal_at)}</div>
                <div className="text-neutral-600 text-sm">›</div>
              </div>
            ))
          )}
        </div>

        {/* Recent System Activity */}
        <div className="mb-4 text-xs tracking-[3px] font-bold text-neutral-200">
          RECENT SYSTEM ACTIVITY
        </div>

        <div className="mb-16 border border-white/10 bg-white/[0.01] p-6">
          {activity.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">No system activity yet.</div>
          ) : (
            <div className="relative pl-6 border-l border-white/10">
              {activity.map((a) => (
                <div key={a._id} className="relative mb-7 last:mb-0">
                  <span
                    className={`absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full border-2 border-[#050505] ${
                      activityDot[a.event_type] ?? "bg-neutral-500"
                    }`}
                  />
                  <div className="text-[10px] tracking-widest text-neutral-500">
                    {relativeTime(a.createdAt).toUpperCase()}
                  </div>
                  <div className="mt-1 text-[13px] text-white">{a.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ChatbotWidget />
    </div>
  );
}