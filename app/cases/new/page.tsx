"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { CasePriority, CaseStatus } from "@/types/netra";

type SourceKind = "Documents" | "CSV / Excel" | "Images";

const uploadSources: { id: SourceKind; formats: string; accept: string; icon: string }[] = [
  { id: "Documents", formats: "PDF, DOCX, TXT", accept: ".pdf,.doc,.docx,.txt", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8" },
  { id: "CSV / Excel", formats: "CSV, XLSX", accept: ".csv,.xls,.xlsx", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h2m4 0h2M8 17h2m4 0h2" },
  { id: "Images", formats: "JPG, PNG, WEBP", accept: ".jpg,.jpeg,.png,.webp", icon: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M17 3h4v4M21 3l-9 9M7 16l2.5-2.5a1.5 1.5 0 0 1 2.1 0L13 15l1.5-1.5a1.5 1.5 0 0 1 2.1 0L19 16" },
];

export default function CreateNewCasePage() {
  const router = useRouter();

 
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<CasePriority>("MEDIUM");
  const [status, setStatus] = useState<CaseStatus>("ACTIVE");
  const [investigator, setInvestigator] = useState("");
  const [entitiesCount, setEntitiesCount] = useState("0");
  const [summary, setSummary] = useState("");
  const [sourceFiles, setSourceFiles] = useState<Partial<Record<SourceKind, string>>>({});
  const [notes, setNotes] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
   
    if (!title.trim()) errs.title = "Case title is required.";
    if (!investigator.trim()) errs.investigator = "Assigned investigator is required.";
    if (entitiesCount && isNaN(Number(entitiesCount))) {
      errs.entitiesCount = "Entity count must be a number.";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setSubmitting(true);
    const { data, error: insertError } = await supabase
      .from("cases")
      .insert({
        title: title.trim(),
        priority,
        status,
        assigned_investigator: investigator.trim(),
        entities_count: entitiesCount ? Number(entitiesCount) : 0,
      })
      .select("case_code")
      .single();

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (!data?.case_code) {
      setError("Case was created, but the database did not return its generated ID.");
      return;
    }

    router.push(`/cases/${data.case_code}`);
  }

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 font-sans">
      <div className="max-w-[1180px] mx-auto px-6 py-10 md:px-8">

        <div className="mb-5 flex flex-wrap items-center gap-x-2 text-[11px] tracking-[0.16em] text-neutral-500">
          <button type="button" onClick={() => router.push("/dashboard")} className="hover:text-red-400">
            ← DASHBOARD
          </button>
          <span className="text-neutral-700">/</span>
          <button type="button" onClick={() => router.push("/cases")} className="hover:text-red-400">
            ALL CASES
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] tracking-[2px] text-neutral-500 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          NEW CASE INTAKE
        </div>

        <h1 className="text-[30px] font-bold text-white tracking-tight mb-1">Create New Case</h1>
        <p className="text-[13px] text-neutral-500 mb-8 font-mono">
          Register a new investigation in the NETRA system.
        </p>

        {error && (
          <div className="mb-6 p-4 border border-red-900/40 bg-red-950/20 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
     
          <div>
            <label className="block text-[11px] tracking-wide text-neutral-500 mb-2">
              CASE TITLE
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cross-border Trafficking Network"
              className="w-full px-4 py-3 bg-[#0b0b0b] border border-neutral-800 text-neutral-200 text-sm outline-none focus:border-red-600/50 transition-colors"
            />
            {fieldErrors.title && (
              <p className="text-red-500 text-[11px] mt-1.5">{fieldErrors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] tracking-wide text-neutral-500 mb-2">
                PRIORITY
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as CasePriority)}
                className="w-full px-4 py-3 bg-[#0b0b0b] border border-neutral-800 text-neutral-200 text-sm outline-none focus:border-red-600/50 transition-colors"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] tracking-wide text-neutral-500 mb-2">
                STATUS
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CaseStatus)}
                className="w-full px-4 py-3 bg-[#0b0b0b] border border-neutral-800 text-neutral-200 text-sm outline-none focus:border-red-600/50 transition-colors"
              >
                <option value="ACTIVE">Active</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] tracking-wide text-neutral-500 mb-2">
              ASSIGNED INVESTIGATOR
            </label>
            <input
              value={investigator}
              onChange={(e) => setInvestigator(e.target.value)}
              placeholder="e.g. Insp. R. Chauhan"
              className="w-full px-4 py-3 bg-[#0b0b0b] border border-neutral-800 text-neutral-200 text-sm outline-none focus:border-red-600/50 transition-colors"
            />
            {fieldErrors.investigator && (
              <p className="text-red-500 text-[11px] mt-1.5">{fieldErrors.investigator}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] tracking-wide text-neutral-500 mb-2">
              INITIAL ENTITY COUNT (optional)
            </label>
            <input
              value={entitiesCount}
              onChange={(e) => setEntitiesCount(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 bg-[#0b0b0b] border border-neutral-800 text-neutral-200 text-sm outline-none focus:border-red-600/50 transition-colors"
            />
            {fieldErrors.entitiesCount && (
              <p className="text-red-500 text-[11px] mt-1.5">{fieldErrors.entitiesCount}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] tracking-wide text-neutral-500 mb-2">
              INVESTIGATION SUMMARY (optional)
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Summarize the investigation context, objectives and known entities..."
              rows={4}
              className="w-full resize-y px-4 py-3 bg-[#0b0b0b] border border-neutral-800 text-neutral-200 text-sm outline-none focus:border-red-600/50 transition-colors placeholder:text-neutral-600"
            />
          </div>

          <section className="border border-neutral-800 bg-[#0b0b0b] p-5 md:p-7">
            <div className="mb-6 border-b border-neutral-800 pb-5">
              <div className="flex items-center gap-3 text-sm font-semibold tracking-[0.15em] text-white">
               
                MULTI-SOURCE DATA INGESTION
              </div>
              <p className="mt-3 text-xs text-neutral-500">Bring different intelligence sources into one case workspace.</p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {uploadSources.map((source) => (
                <label
                  key={source.id}
                  className="group flex min-h-44 cursor-pointer flex-col items-center justify-center border border-dashed border-neutral-700 bg-[#0d0d0d] px-5 text-center transition-colors hover:border-red-500/70 hover:bg-red-950/10"
                >
                  <input
                    type="file"
                    accept={source.accept}
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) setSourceFiles((current) => ({ ...current, [source.id]: file.name }));
                    }}
                  />
                  <svg className="mb-3 h-6 w-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d={source.icon} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-xs font-semibold tracking-[0.14em] text-white">{source.id.toUpperCase()}</span>
                  <span className="mt-2 text-[10px] tracking-wide text-neutral-500">{sourceFiles[source.id] ?? source.formats}</span>
                  <span className="mt-3 text-[10px] font-semibold tracking-widest text-red-400">↑ ADD SOURCE</span>
                </label>
              ))}

              <div className="min-h-44 border border-dashed border-neutral-700 bg-[#0d0d0d] p-5">
                <div className="text-center text-xs font-semibold tracking-[0.14em] text-white">TEXT NOTES</div>
                <p className="mt-2 text-center text-[10px] text-neutral-500">Paste intelligence notes</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Paste notes..."
                  rows={3}
                  className="mt-3 w-full resize-none border border-neutral-700 bg-[#111] px-3 py-2 text-xs text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-red-600/50"
                />
              </div>

              <div className="min-h-44 border border-dashed border-neutral-700 bg-[#0d0d0d] p-5">
                <div className="text-center text-xs font-semibold tracking-[0.14em] text-white">URL SOURCE</div>
                <p className="mt-2 text-center text-[10px] text-neutral-500">Reference an intelligence URL</p>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://"
                  className="mt-5 w-full border border-neutral-700 bg-[#111] px-3 py-2.5 text-xs text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-red-600/50"
                />
              </div>
            </div>
          
          </section>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-semibold tracking-wide transition-colors"
            >
              {submitting ? "CREATING…" : "CREATE CASE"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/cases")}
              className="px-6 py-3 border border-neutral-800 text-neutral-400 text-[13px] tracking-wide hover:border-neutral-600 transition-colors"
            >
              CANCEL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
