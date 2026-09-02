"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CasePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

interface InvestigatorOption {
  id: string;
  full_name: string;
  designation: string;
}

const defaultInvestigator: InvestigatorOption = {
  id: "netra-inv-01",
  full_name: "Netra Investigator",
  designation: "Lead Investigator",
};

const caseTypes = [
  "Organized Crime",
  "Financial Fraud",
  "Narcotics",
  "Cyber Crime",
  "Human Trafficking",
  "Homicide",
  "Political Corruption",
  "Other",
];

const priorities: { value: CasePriority; label: string; color: string }[] = [
  { value: "LOW", label: "LOW", color: "#71717a" },
  { value: "MEDIUM", label: "MEDIUM", color: "#f59e0b" },
  { value: "HIGH", label: "HIGH", color: "#f97316" },
  { value: "CRITICAL", label: "CRITICAL", color: "#ef4444" },
];

export default function CreateNewCasePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [caseType, setCaseType] = useState(caseTypes[0]);
  const [priority, setPriority] = useState<CasePriority>("MEDIUM");
  const [investigatorId, setInvestigatorId] = useState(defaultInvestigator.id);
  const [summary, setSummary] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Case title is required.";
    if (!investigatorId) errs.investigatorId = "Select an investigator to assign this case.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setSubmitting(true);

    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          case_type: caseType,
          priority,
          assigned_investigator: defaultInvestigator.full_name,
          investigation_summary: summary.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create case.");
      }

      router.push("/admin/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong while creating the case.");
    } finally {
      setSubmitting(false);
    }
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

      <div className="relative z-10 max-w-[720px] mx-auto px-6 py-12 md:px-8">
        <div className="mb-5 flex flex-wrap items-center gap-x-2 text-[11px] tracking-[0.16em] text-neutral-500">
          <button type="button" onClick={() => router.push("/admin/dashboard")} className="hover:text-red-400 transition-colors">
            ← DASHBOARD
          </button>
          <span className="text-neutral-700">/</span>
          <button type="button" onClick={() => router.push("/cases")} className="hover:text-red-400 transition-colors">
            ALL CASES
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] tracking-[3px] text-neutral-500 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          NEW CASE INTAKE
        </div>

        <div>
          <h1 className="text-[34px] font-black text-white tracking-tight">Create New Case</h1>
          <p className="text-[13px] text-neutral-500 mt-2">
            Register a new investigation and assign it to an investigator.
          </p>
        </div>

        {error && (
          <div className="mt-6 p-4 border border-red-900/40 bg-red-950/20 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-9 space-y-7">
          {/* CASE TITLE */}
          <div>
            <label className="block text-[11px] tracking-[0.2em] text-neutral-500 mb-2">
              CASE TITLE <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cross-border Trafficking Network"
              className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 text-neutral-200 text-sm outline-none focus:border-red-500/60 focus:shadow-[0_0_16px_rgba(239,68,68,0.1)] transition-all placeholder:text-neutral-600"
            />
            {fieldErrors.title && <p className="text-red-500 text-[11px] mt-1.5">{fieldErrors.title}</p>}
          </div>

          {/* CASE TYPE */}
          <div>
            <label className="block text-[11px] tracking-[0.2em] text-neutral-500 mb-2">
              CASE TYPE <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
                className="w-full appearance-none rounded-none border border-[#ff4d4d]/70 bg-[#0f0f10] px-4 py-3 pr-10 text-sm text-neutral-200 outline-none transition-all focus:border-red-500"
              >
                {caseTypes.map((t) => (
                  <option key={t} value={t} className="bg-[#111111] text-neutral-200">
                    {t}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400">⌄</span>
            </div>
          </div>

          {/* PRIORITY */}
          <div>
            <label className="block text-[11px] tracking-[0.2em] text-neutral-500 mb-3">
              PRIORITY <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {priorities.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className="flex items-center gap-2 border px-3 py-2.5 text-[11px] font-semibold tracking-wide transition-all"
                  style={{
                    borderColor: priority === p.value ? p.color : "rgba(255,255,255,0.1)",
                    backgroundColor: priority === p.value ? `${p.color}1a` : "rgba(255,255,255,0.02)",
                    color: priority === p.value ? p.color : "#a3a3a3",
                  }}
                >
                  <span
                    className="h-3 w-3 rounded-full border-2 flex items-center justify-center shrink-0"
                    style={{ borderColor: priority === p.value ? p.color : "#525252" }}
                  >
                    {priority === p.value && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />}
                  </span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* ASSIGNED INVESTIGATOR */}
          <div>
            <label className="block text-[11px] tracking-[0.2em] text-neutral-500 mb-2">
              ASSIGNED INVESTIGATOR <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={investigatorId}
                onChange={(e) => setInvestigatorId(e.target.value)}
                className="w-full appearance-none rounded-none border border-[#ff4d4d]/70 bg-[#0f0f10] px-4 py-3 pr-10 text-sm text-neutral-200 outline-none transition-all focus:border-red-500"
              >
                <option value={defaultInvestigator.id} className="bg-[#111111] text-neutral-200">
                  {defaultInvestigator.full_name} — {defaultInvestigator.designation}
                </option>
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400">⌄</span>
            </div>
            {fieldErrors.investigatorId && <p className="text-red-500 text-[11px] mt-1.5">{fieldErrors.investigatorId}</p>}
          </div>

          {/* INVESTIGATION SUMMARY */}
          <div>
            <label className="block text-[11px] tracking-[0.2em] text-neutral-500 mb-2">
              INVESTIGATION SUMMARY
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Summarize the investigation context, objectives and known entities..."
              rows={4}
              className="w-full resize-y px-4 py-3 bg-white/[0.02] border border-white/10 text-neutral-200 text-sm outline-none focus:border-red-500/60 transition-all placeholder:text-neutral-600"
            />
          </div>

          <div className="h-px w-full bg-white/10" />

          {/* CASE STATUS */}
          <div>
            <label className="block text-[11px] tracking-[0.2em] text-neutral-500 mb-3">CASE STATUS</label>
            <div className="flex items-start gap-3 border border-cyan-500/25 bg-cyan-500/[0.04] px-4 py-3.5">
              <span className="mt-1 h-2 w-2 rounded-full shrink-0 bg-cyan-400 animate-pulse" />
              <div>
                <div className="text-[12px] font-bold tracking-wide text-cyan-300">ASSIGNED</div>
                <p className="mt-1 text-[11px] text-neutral-500 leading-relaxed">
                  The investigator will be able to add intelligence sources and begin the investigation immediately.
                </p>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-white/10" />

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="px-7 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-bold tracking-wide transition-all"
            >
              {submitting ? "CREATING…" : "CREATE CASE"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/dashboard")}
              className="px-7 py-3 border border-white/10 text-neutral-400 text-[13px] tracking-wide hover:border-white/30 hover:text-neutral-200 transition-all"
            >
              CANCEL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}