"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Case, CasePriority, CaseStatus } from "@/types/netra";

export default function CasesPage() {
  const router = useRouter();

  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "ALL">("ALL");
  const [priorityFilter, setPriorityFilter] = useState<CasePriority | "ALL">("ALL");
  const [now, setNow] = useState(new Date());
  const [updatingCaseCode, setUpdatingCaseCode] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  async function fetchCases() {
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .order("last_signal_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setError(null);
      setCases(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    const initialFetch = window.setTimeout(() => {
      void fetchCases();
    }, 0);

    const channel = supabase
      .channel("cases-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "cases" }, fetchCases)
      .subscribe();

    return () => {
      window.clearTimeout(initialFetch);
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      const matchesSearch =
        !search.trim() ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.case_code.toLowerCase().includes(search.toLowerCase()) ||
        c.assigned_investigator?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
      const matchesPriority = priorityFilter === "ALL" || c.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [cases, search, statusFilter, priorityFilter]);

  function relativeTime(iso: string) {
    const diffMs = now.getTime() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
    return `${Math.floor(hrs / 24)} d ago`;
  }

  async function updateCaseStatus(caseCode: string, status: CaseStatus) {
    setUpdatingCaseCode(caseCode);
    const { error: updateError } = await supabase
      .from("cases")
      .update({ status })
      .eq("case_code", caseCode);

    if (updateError) {
      setError(updateError.message);
    } else {
      setError(null);
      setCases((currentCases) =>
        currentCases.map((currentCase) =>
          currentCase.case_code === caseCode ? { ...currentCase, status } : currentCase
        )
      );
    }
    setUpdatingCaseCode(null);
  }

  const priorityColor: Record<string, string> = {
    CRITICAL: "text-red-500",
    HIGH: "text-red-500",
    MEDIUM: "text-amber-500",
    LOW: "text-neutral-500",
  };

  const statusLabel: Record<string, string> = {
    ACTIVE: "ACTIVE",
    UNDER_REVIEW: "UNDER REVIEW",
    CLOSED: "CLOSED",
  };

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 font-sans">
      <div className="max-w-[1180px] mx-auto px-8 py-10">

        <div className="flex items-center gap-2 text-[11px] tracking-[2px] text-neutral-500 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          CASE MANAGEMENT
        </div>

        <div className="flex items-start justify-between flex-wrap gap-6 mb-8">
          <div>
            <h1 className="text-[32px] font-bold text-white tracking-tight">All Cases</h1>
            <p className="text-[13px] text-neutral-500 mt-2 font-mono">
              {loading ? "Loading…" : `${filtered.length} of ${cases.length} cases`}
            </p>
          </div>

          <button
            onClick={() => router.push("/cases/new")}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-[13px] font-semibold tracking-wide transition-colors"
          >
            + CREATE NEW CASE
          </button>
        </div>

        {/* filters */}
        <div className="flex items-center gap-3 flex-wrap mb-8">
          <div className="flex items-center gap-2 px-3.5 py-2 border border-neutral-800 bg-[#0b0b0b] min-w-[260px] flex-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by case ID, title, investigator…"
              className="bg-transparent border-none outline-none text-neutral-200 text-xs font-mono w-full placeholder:text-neutral-600"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CaseStatus | "ALL")}
            className="px-3 py-2 border border-neutral-800 bg-[#0b0b0b] text-xs text-neutral-300 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as CasePriority | "ALL")}
            className="px-3 py-2 border border-neutral-800 bg-[#0b0b0b] text-xs text-neutral-300 outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {error && (
          <div className="mb-6 p-4 border border-red-900/40 bg-red-950/20 text-red-400 text-xs">
            Failed to load cases: {error}
          </div>
        )}

        {/* table */}
        <div className="grid grid-cols-[2.2fr_1fr_1fr_1fr_1fr_24px] px-5 pb-3 text-[10px] tracking-wide text-neutral-500 border-b border-neutral-900">
          <div>CASE ID / TITLE</div>
          <div>PRIORITY</div>
          <div>STATUS</div>
          <div>INVESTIGATOR NAME</div>
          
          <div>LAST ACTIVITY</div>
          <div />
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-neutral-500">Loading cases…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-500">
            No cases match your filters.
          </div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => router.push(`/cases/${c.case_code}`)}
              className="grid grid-cols-[2.2fr_1fr_1fr_1fr_1fr_24px] items-center px-5 py-4 border-b border-neutral-900 cursor-pointer transition-colors hover:bg-[#0d0d0d]"
            >
              <div>
                <div className="text-[11px] text-red-500 tracking-wide">{c.case_code}</div>
                <div className="text-[15px] font-semibold text-white mt-1">{c.title}</div>
              </div>
              <div className={`flex items-center gap-1.5 text-[11px] tracking-wide ${priorityColor[c.priority]}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {c.priority}
              </div>
              <div>
                <select
                  value={c.status}
                  disabled={updatingCaseCode === c.case_code}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => {
                    event.stopPropagation();
                    void updateCaseStatus(c.case_code, event.target.value as CaseStatus);
                  }}
                  className="border border-neutral-800 bg-[#0b0b0b] px-2 py-1 text-[10px] tracking-wide text-neutral-300 outline-none focus:border-red-500/50 disabled:cursor-wait disabled:opacity-50"
                >
                  <option value="ACTIVE">{statusLabel.ACTIVE}</option>
                  <option value="UNDER_REVIEW">{statusLabel.UNDER_REVIEW}</option>
                  <option value="CLOSED">{statusLabel.CLOSED}</option>
                </select>
              </div>
              <div className="text-[11px] text-neutral-400">{c.assigned_investigator || "—"}</div>
              <div className="text-[11px] text-neutral-500">{relativeTime(c.last_signal_at)}</div>
              <div className="text-neutral-600 text-sm">›</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
