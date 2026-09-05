"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const fieldClass =
  "mt-2 w-full rounded-lg border border-white/[0.12] bg-white/[0.04] px-3.5 py-3 text-[14px] text-neutral-100 outline-none placeholder:text-neutral-500 transition-colors focus:border-white/25 focus:bg-white/[0.07]";

const selectClass = `${fieldClass} [color-scheme:dark]`;
const optionClass = "bg-[#111111] text-neutral-100";

export default function NewCasePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [caseType, setCaseType] = useState("Narcotics");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a case title.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          case_type: caseType,
          priority,
          investigation_summary: summary.trim(),
          assigned_investigator:
            localStorage.getItem("netra_display_name") || "Field Investigator",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not create the case.");
      }

      const createdCode = data.case?.case_code;
      router.push(createdCode ? `/cases/${createdCode}` : "/investigator/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
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

      <div className="relative z-10 mx-auto max-w-[640px] px-4 py-8 sm:px-8 sm:py-10">
        <button
          onClick={() => router.back()}
          className="text-[13px] text-neutral-400 transition-colors hover:text-white"
        >
          ← Cancel
        </button>

        <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.03] p-8">
          <p className="text-[13px] text-neutral-500">New investigation</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-white">Create case</h1>
          <p className="mt-2 text-[13px] leading-6 text-neutral-500">
            Add the basic details. You can upload sources and run analysis after the case is created.
          </p>

          {error && (
            <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-[14px] text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-7">
            <div>
              <label htmlFor="case-title" className="block text-[13px] font-medium text-neutral-200">
                Case title
              </label>
              <p className="mt-1 text-[12px] text-neutral-500">A short name the team will recognize.</p>
              <input
                id="case-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Example: Cross-border meth trafficking"
                className={fieldClass}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="case-type" className="block text-[13px] font-medium text-neutral-200">
                  Case type
                </label>
                <select
                  id="case-type"
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value)}
                  className={selectClass}
                >
                  <option className={optionClass} value="Narcotics">Narcotics</option>
                  <option className={optionClass} value="Financial Fraud">Financial fraud</option>
                  <option className={optionClass} value="Cyber Syndicate">Cyber crime</option>
                  <option className={optionClass} value="Organized Crime">Organized crime</option>
                </select>
              </div>

              <div>
                <label htmlFor="case-priority" className="block text-[13px] font-medium text-neutral-200">
                  Priority
                </label>
                <select
                  id="case-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className={selectClass}
                >
                  <option className={optionClass} value="LOW">Low</option>
                  <option className={optionClass} value="MEDIUM">Medium</option>
                  <option className={optionClass} value="HIGH">High</option>
                  <option className={optionClass} value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="case-summary" className="block text-[13px] font-medium text-neutral-200">
                Summary
              </label>
              <p className="mt-1 text-[12px] text-neutral-500">Optional. A few sentences is enough.</p>
              <textarea
                id="case-summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="What is known so far, and why this case was opened."
                rows={5}
                className={`${fieldClass} resize-y`}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-lg px-4 py-2.5 text-[14px] text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-10 rounded-lg border border-red-500/35 bg-red-500/[0.12] px-5 text-[13px] font-medium text-red-200 transition-colors hover:border-red-400/60 hover:bg-red-500/20 hover:text-white disabled:opacity-50"
              >
                {submitting ? "Creating case…" : "Create case"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
