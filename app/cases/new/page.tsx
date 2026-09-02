"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

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
      setError("Case title is required.");
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
        throw new Error(data.error || "Failed to create case.");
      }

      router.push("/admin/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 font-mono p-8 max-w-[800px] mx-auto">
      <button onClick={() => router.back()} className="text-xs text-neutral-500 hover:text-white mb-6">
        ← CANCEL
      </button>

      <div className="border border-white/10 bg-[#0a0a0a] p-8">
        <div className="text-xs text-red-500 font-bold tracking-widest uppercase mb-1">Dossier Initialization</div>
        <h1 className="text-2xl font-black text-white mb-6">CREATE INVESTIGATION CASE</h1>

        {error && <div className="p-3 bg-red-500/10 border border-red-500/30 text-xs text-red-400 mb-6">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-neutral-400 mb-2">CASE TITLE / PRIMARY TARGET</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Syndicate Operation Alpha"
              className="w-full bg-black border border-white/10 p-3 text-xs text-white outline-none focus:border-red-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-2">CASE TYPE</label>
              <select
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
                className="w-full bg-black border border-white/10 p-3 text-xs text-white outline-none focus:border-red-500"
              >
                <option value="Narcotics">Narcotics Cartel</option>
                <option value="Financial Fraud">Financial / Hawala Fraud</option>
                <option value="Cyber Syndicate">Cyber Extortion Ring</option>
                <option value="Organized Crime">Organized Crime Syndicate</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-2">PRIORITY LEVEL</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-black border border-white/10 p-3 text-xs text-white outline-none focus:border-red-500"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-400 mb-2">INTELLIGENCE SYNOPSIS</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief summary of intercepted intelligence..."
              rows={4}
              className="w-full bg-black border border-white/10 p-3 text-xs text-white outline-none focus:border-red-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold p-3 text-xs tracking-widest uppercase transition-all disabled:opacity-50"
          >
            {submitting ? "INITIALIZING DOSSIER & CONNECTING AI..." : "REGISTER CASE DOSSIER"}
          </button>
        </form>
      </div>
    </div>
  );
}