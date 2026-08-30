"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import UserSettings from "@/components/UserSettings";
import type { Case } from "@/types/netra";

export default function DashboardPage() {
  const router = useRouter();

  const [cases, setCases] = useState<Case[]>([]);
  const [, setAlerts] = useState<unknown[]>([]);
  const [resolvedCount, setResolvedCount] = useState<number>(0);
  const [selectedCaseCode, setSelectedCaseCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(new Date());

  // live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // fetch real data from Supabase
  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      setError(null);

      const [casesRes, alertsRes, resolvedRes] = await Promise.all([
        supabase
          .from("cases")
          .select("*")
          .neq("status", "CLOSED")
          .order("last_signal_at", { ascending: false })
          .limit(10),
        supabase
          .from("alerts")
          .select("*, cases(case_code, title)")
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("cases")
          .select("*", { count: "exact", head: true })
          .eq("status", "CLOSED"),
      ]);

      if (casesRes.error) {
        setError(casesRes.error.message);
        setLoading(false);
        return;
      }
      if (alertsRes.error) {
        setError(alertsRes.error.message);
        setLoading(false);
        return;
      }
      if (resolvedRes.error) {
        setError(resolvedRes.error.message);
        setLoading(false);
        return;
      }

      setCases(casesRes.data ?? []);
      setAlerts(alertsRes.data ?? []);
      setResolvedCount(resolvedRes.count ?? 0);
      if (casesRes.data && casesRes.data.length > 0) {
        setSelectedCaseCode(casesRes.data[0].case_code);
      }
      setLoading(false);
    }

    fetchDashboardData();

    // realtime: refresh when a new case/alert is inserted
    const channel = supabase
      .channel("dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "cases" }, fetchDashboardData)
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, fetchDashboardData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const highRiskCount = useMemo(
    () => cases.filter((c) => c.priority === "HIGH" || c.priority === "CRITICAL").length,
    [cases]
  );

  const filteredCases = useMemo(() => {
    if (!search.trim()) return cases;
    const q = search.toLowerCase();
    return cases.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.case_code.toLowerCase().includes(q) ||
        c.assigned_investigator?.toLowerCase().includes(q)
    );
  }, [cases, search]);

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  })();

  const dateStr = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).toUpperCase();

  function relativeTime(iso: string) {
    const diffMs = now.getTime() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
    return `${Math.floor(hrs / 24)} d ago`;
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
        {/* top meta */}
        <div className="flex items-center gap-2 text-[11px] tracking-[2px] text-neutral-500 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          OVERVIEW / {dateStr}
        </div>

        {/* header */}
        <div className="flex items-start justify-between flex-wrap gap-6 mb-6">
          <div>
            <h1 className="text-[34px] font-bold text-white tracking-tight">
              {greeting}, Investigator
            </h1>
            <p className="text-[13px] text-neutral-500 mt-2 font-mono">
              Here is your investigation overview.
            </p>
          </div>

          <div className="flex items-center gap-5">
            <button
              onClick={() => router.push("/cases/new")}
              className="border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-[11px] font-semibold tracking-wide text-red-300 hover:border-red-500 hover:bg-red-500/15"
            >
              + ADD NEW CASE
            </button>

            <div className="flex items-center gap-2 px-3.5 py-2 border border-neutral-800 bg-[#0b0b0b] min-w-[220px]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search intelligence"
                className="bg-transparent border-none outline-none text-neutral-200 text-xs font-mono w-full placeholder:text-neutral-600"
              />
            </div>

            <button className="relative w-[34px] h-[34px] flex items-center justify-center border border-neutral-800">
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>

            <UserSettings />
          </div>
        </div>

        <hr className="border-neutral-900 mb-8" />

        {error && (
          <div className="mb-8 p-4 border border-red-900/40 bg-red-950/20 text-red-400 text-xs">
            Failed to load dashboard: {error}
          </div>
        )}

        {/* 01 SITUATION SUMMARY */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs tracking-[3px] font-semibold text-neutral-200">
            <span className="text-red-500 mr-2.5">01</span>SITUATION SUMMARY
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-12">
          {[
            { label: "Active Cases", value: cases.filter((c) => c.status === "ACTIVE").length },
            { label: "High-Risk Cases", value: highRiskCount },
            { label: "Cases Resolved", value: resolvedCount },
            { label: "Detection Accuracy", value: "0%" },
          ].map((s) => (
            <div key={s.label} className="border border-neutral-900 bg-[#0a0a0a] p-5 hover:border-neutral-700 transition-colors">
              <div className="text-xs text-neutral-500">{s.label}</div>
              <div className="text-[36px] font-bold text-red-500 mt-3">
                {loading ? "—" : s.value}
              </div>
              <div className="flex items-center gap-1.5 mt-4 text-[10px] tracking-wide text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                LIVE INDEX
              </div>
            </div>
          ))}
        </div>

        {/* 02 ACTIVE INVESTIGATIONS */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs tracking-[3px] font-semibold text-neutral-200">
            <span className="text-red-500 mr-2.5">02</span>ACTIVE INVESTIGATIONS
          </div>
          <button
            onClick={() => router.push("/cases")}
            className="text-[11px] tracking-wide text-red-500 hover:underline flex items-center gap-1"
          >
            VIEW ALL CASES →
          </button>
        </div>

        <div className="mb-12">
          <div className="grid grid-cols-[2.2fr_1fr_1fr_1fr_24px] px-5 pb-3 text-[10px] tracking-wide text-neutral-500 border-b border-neutral-900">
            <div>CASE ID / TITLE</div>
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
                key={c.id}
                onClick={() => {
                  setSelectedCaseCode(c.case_code);
                  router.push(`/cases/${c.case_code}`);
                }}
                className={`grid grid-cols-[2.2fr_1fr_1fr_1fr_24px] items-center px-5 py-4 border-b border-neutral-900 cursor-pointer transition-colors hover:bg-[#0d0d0d] ${
                  selectedCaseCode === c.case_code ? "bg-[#150a0a] border-l-2 border-l-red-500 pl-[18px]" : ""
                }`}
              >
                <div>
                  <div className="text-[11px] text-red-500 tracking-wide">{c.case_code}</div>
                  <div className="text-[15px] font-semibold text-white mt-1">{c.title}</div>
                </div>
                <div className={`flex items-center gap-1.5 text-[11px] tracking-wide ${priorityColor[c.priority]}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {c.priority}
                </div>
                <div className="text-[11px] tracking-wide text-neutral-300">{statusLabel[c.status]}</div>
                <div className="text-[11px] text-neutral-500">{relativeTime(c.last_signal_at)}</div>
                <div className="text-neutral-600 text-sm">›</div>
              </div>
            ))
          )}

          {selectedCaseCode && (
            <div className="flex gap-2.5 items-center px-5 py-3.5 text-[11px] text-neutral-500">
              <span className="tracking-wide text-neutral-600">SELECTED CASE</span>
              <span className="text-red-500 font-semibold">{selectedCaseCode}</span>
              <span>Use the investigation modules to continue analysis</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}