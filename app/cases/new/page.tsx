"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const fieldClass =
  "mt-2 w-full rounded-lg border border-white/15 bg-[#111] px-3.5 py-3 text-[14px] text-white outline-none placeholder:text-neutral-500 focus:border-red-400/60";

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
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not create the case.");
      }

      router.push("/admin/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-[640px]">
        <button
          onClick={() => router.back()}
          className="text-[13px] text-neutral-400 transition-colors hover:text-white"
        >
          ← Cancel
        </button>

        <div className="mt-6 rounded-xl border border-white/10 bg-[#0d0d0d] p-8">
          <p className="text-[13px] text-neutral-400">New investigation</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-white">Create case</h1>
          <p className="mt-2 text-[14px] leading-6 text-neutral-400">
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
                  className={fieldClass}
                >
                  <option value="Narcotics">Narcotics</option>
                  <option value="Financial Fraud">Financial fraud</option>
                  <option value="Cyber Syndicate">Cyber crime</option>
                  <option value="Organized Crime">Organized crime</option>
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
                  className={fieldClass}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
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
                className="rounded-lg bg-red-600 px-5 py-2.5 text-[14px] font-medium text-white hover:bg-red-500 disabled:opacity-50"
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
