"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface SourceData {
  type: string;
  title: string;
  content: string;
  uploaded_at?: string;
}

interface CaseData {
  _id: string;
  case_code: string;
  title: string;
  status: string;
  assigned_investigator?: string;
  investigation_summary?: string;
  sources?: SourceData[];
}

export default function AdminCaseView() {
  const { caseCode } = useParams();
  const router = useRouter();

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [previewSource, setPreviewSource] = useState<SourceData | null>(null);

  const fetchCase = useCallback(async () => {
    const res = await fetch("/api/cases");
    const data = await res.json();
    if (data.success) {
      const found = data.cases.find((c: CaseData) => c.case_code === caseCode);
      setCaseData(found);
    }
  }, [caseCode]);

  useEffect(() => {
    // The fetch updates case state when the external request completes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCase();
  }, [fetchCase]);

  if (!caseData) return <div className="p-8 text-neutral-500 font-mono">Loading case review...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 font-mono p-8 max-w-[1180px] mx-auto">
      <button onClick={() => router.push("/admin/dashboard")} className="text-xs text-neutral-500 hover:text-white mb-4">
        ← DASHBOARD
      </button>

      <div className="flex justify-between items-start mb-8 border-b border-white/10 pb-6">
        <div>
          <span className="text-xs text-red-500 font-bold">{caseData.case_code}</span>
          <h1 className="text-3xl font-black text-white mt-1">{caseData.title}</h1>
          <p className="text-xs text-neutral-400 mt-2">{caseData.investigation_summary || "No summary provided."}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-neutral-500">ASSIGNED INVESTIGATOR</div>
          <div className="text-sm font-bold text-white mt-1">{caseData.assigned_investigator || "Netra Investigator"}</div>
          <span className="inline-block mt-2 text-xs px-2.5 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400">
            {caseData.status}
          </span>
        </div>
      </div>

      <div>
        <div className="text-xs font-bold tracking-widest text-neutral-300 mb-2">ATTACHED INTELLIGENCE SOURCES</div>
        <p className="text-[11px] text-neutral-500 mb-6">Investigator evidence records and uploaded intelligence dossiers.</p>

        {!caseData.sources || caseData.sources.length === 0 ? (
          <div className="border border-white/10 bg-white/[0.01] p-8 text-center text-xs text-neutral-500">
            No intelligence sources have been ingested yet by the investigator.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {caseData.sources.map((s: SourceData, i: number) => (
              <div
                key={i}
                onClick={() => setPreviewSource(s)}
                className="border border-white/10 bg-white/[0.02] p-4 cursor-pointer hover:border-red-500/40 transition-colors"
              >
                <span className="text-[9px] px-2 py-0.5 bg-red-500/10 text-red-400 font-bold">{s.type}</span>
                <div className="text-xs font-bold text-white mt-2 truncate">{s.title}</div>
                <div className="text-[10px] text-neutral-500 mt-1">Click to view ↗</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="flex h-[80vh] w-full max-w-3xl flex-col border border-white/20 bg-[#0c0c0d] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="bg-red-500/10 px-2 py-0.5 text-[10px] font-bold tracking-widest text-red-400">
                  {previewSource.type}
                </span>
                <h3 className="max-w-md truncate text-sm font-bold text-white">{previewSource.title}</h3>
              </div>
              <button onClick={() => setPreviewSource(null)} className="px-2 text-sm text-neutral-500 hover:text-white">✕</button>
            </div>

            <div className="flex-1 overflow-hidden bg-[#050505] p-6 flex items-center justify-center">
              {/* IMAGE PREVIEW */}
              {previewSource.type === "IMAGE" && (
                <div className="flex h-full w-full items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewSource.content} alt={previewSource.title} className="max-h-full max-w-full object-contain" />
                </div>
              )}

              {/* TEXT NOTES & URLS PREVIEW */}
              {(previewSource.type === "NOTES" || previewSource.type === "URL") && (
                <div className="h-full w-full overflow-y-auto p-4 font-mono text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">
                  {previewSource.content}
                </div>
              )}

              {/* DOCUMENTS & CSVs: SAFE CARD WITH DOWNLOAD */}
              {previewSource.type !== "IMAGE" && previewSource.type !== "NOTES" && previewSource.type !== "URL" && (
                <div className="flex flex-col items-center justify-center text-center p-8 border border-white/10 bg-white/[0.01] rounded max-w-md">
                  <div className="text-4xl mb-3">📁</div>
                  <h4 className="text-sm font-bold text-white mb-2">{previewSource.title}</h4>
                  <p className="text-xs text-neutral-400 mb-6">
                    File attached by investigator. Download to inspect the full contents.
                  </p>
                  {previewSource.content.startsWith("data:") ? (
                    <a
                      href={previewSource.content}
                      download={previewSource.title}
                      className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-6 py-3 transition-colors"
                    >
                      DOWNLOAD FILE ⤓
                    </a>
                  ) : (
                    <span className="text-xs text-red-400">Invalid file data.</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}