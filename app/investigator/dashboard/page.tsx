"use client";

import { useEffect, useState, useMemo } from "react";
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

interface ActivityItem {
  _id: string;
  description: string;
  event_type: string;
  createdAt: string;
}

export default function InvestigatorDashboard() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const role = localStorage.getItem("netra_role");
    if (role !== "investigator") router.replace("/login");
  }, [router]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [cRes, aRes] = await Promise.all([
          fetch("/api/cases").then((r) => r.json()),
          fetch("/api/activities").then((r) => r.json()),
        ]);
        if (cRes.success) setCases(cRes.cases || []);
        if (aRes.success) setActivities(aRes.activities || []);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const activeCount = useMemo(() => cases.filter((c) => c.status === "ACTIVE").length, [cases]);
  const highPriorityCount = useMemo(
    () => cases.filter((c) => c.priority === "HIGH" || c.priority === "CRITICAL").length,
    [cases]
  );
  const underReviewCount = useMemo(() => cases.filter((c) => c.status === "UNDER_REVIEW").length, [cases]);

  function relativeTime(iso?: string) {
    if (!iso) return "—";
    const diff = Math.floor((now.getTime() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return "just now";
    if (diff < 60) return `${diff} min ago`;
    return `${Math.floor(diff / 60)} hrs ago`;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 font-mono p-8 max-w-[1180px] mx-auto">
      <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-5">
        <div>
          <div className="text-xs text-orange-500 tracking-widest uppercase">Investigator Terminal</div>
          <h1 className="text-3xl font-black text-white mt-1">Welcome, Investigator</h1>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem("netra_role");
            router.push("/login");
          }}
          className="text-xs text-red-400 border border-red-500/30 px-3 py-1.5 hover:bg-red-500/10"
        >
          LOG OUT
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4 mb-10">
        {[
          { label: "ACTIVE CASES", val: activeCount, col: "text-emerald-400" },
          { label: "HIGH PRIORITY", val: highPriorityCount, col: "text-red-500" },
          { label: "UNDER REVIEW", val: underReviewCount, col: "text-amber-400" },
          { label: "TOTAL ASSIGNED", val: cases.length, col: "text-orange-400" },
        ].map((m) => (
          <div key={m.label} className="border border-white/10 bg-white/[0.02] p-5">
            <div className="text-[11px] text-neutral-500">{m.label}</div>
            <div className={`text-3xl font-black mt-2 ${m.col}`}>{loading ? "—" : m.val}</div>
          </div>
        ))}
      </div>

      {/* Active Investigations */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-xs font-bold tracking-widest text-neutral-300">02 ACTIVE INVESTIGATIONS</div>
        <button onClick={() => router.push("/cases")} className="text-xs text-orange-400 hover:underline">
          VIEW ALL →
        </button>
      </div>

      <div className="border border-white/10 bg-white/[0.01] mb-12">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_24px] px-5 py-3 text-[10px] text-neutral-500 border-b border-white/10">
          <div>CASE ID / TITLE</div>
          <div>PRIORITY</div>
          <div>STATUS</div>
          <div>LAST SIGNAL</div>
          <div />
        </div>
        {cases.slice(0, 5).map((c) => (
          <div
            key={c._id}
            onClick={() => router.push(`/cases/${c.case_code}`)}
            className="grid grid-cols-[2fr_1fr_1fr_1fr_24px] items-center px-5 py-4 border-b border-white/5 cursor-pointer hover:bg-orange-500/[0.04]"
          >
            <div>
              <div className="text-[11px] text-orange-400">{c.case_code}</div>
              <div className="text-sm font-bold text-white">{c.title}</div>
            </div>
            <div className="text-xs text-neutral-300">{c.priority}</div>
            <div className="text-xs text-neutral-300">{c.status}</div>
            <div className="text-xs text-neutral-500">{relativeTime(c.last_signal_at)}</div>
            <div className="text-neutral-500">›</div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="text-xs font-bold tracking-widest text-neutral-300 mb-4">04 RECENT ACTIVITY</div>
      <div className="border border-white/10 bg-white/[0.01] p-6">
        <div className="relative pl-6 border-l border-white/10">
          {activities.slice(0, 6).map((a) => (
            <div key={a._id} className="relative mb-6 last:mb-0">
              <span className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full bg-orange-400" />
              <div className="text-[10px] text-neutral-500">{relativeTime(a.createdAt).toUpperCase()}</div>
              <div className="text-xs text-neutral-200 mt-1">{a.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}