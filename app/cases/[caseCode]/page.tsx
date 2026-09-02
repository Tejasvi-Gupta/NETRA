"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  investigation_summary?: string;
  sources?: SourceData[];
}

export default function CaseWorkspace() {
  const { caseCode } = useParams();
  const router = useRouter();

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [modalType, setModalType] = useState<string | null>(null);
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [previewSource, setPreviewSource] = useState<SourceData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const docInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const fetchCase = useCallback(async () => {
    const res = await fetch("/api/cases");
    const data = await res.json();
    if (data.success) {
      const found = data.cases.find((c: CaseData) => c.case_code === caseCode);
      setCaseData(found);
    }
  }, [caseCode]);

  useEffect(() => {
    // The fetch updates workspace state when the external request completes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCase();
  }, [fetchCase]);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, type: string) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      await saveSourceToDB(type, file.name, base64Data);
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function saveSourceToDB(type: string, title: string, content: string) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/cases/${caseCode}/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title, content }),
      });
      const data = await res.json();
      if (data.success) {
        setModalType(null);
        setSourceTitle("");
        setSourceContent("");
        fetchCase();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleModalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceTitle || !sourceContent || !modalType) return;
    await saveSourceToDB(modalType, sourceTitle, sourceContent);
  }

  if (!caseData) return <div className="p-8 text-neutral-500 font-mono">Loading workspace...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 font-mono p-8 max-w-[1180px] mx-auto">
      <input type="file" ref={docInputRef} onChange={(e) => handleFileUpload(e, "DOCUMENT")} accept=".pdf,.docx,.txt" className="hidden" />
      <input type="file" ref={csvInputRef} onChange={(e) => handleFileUpload(e, "CSV")} accept=".csv,.xlsx" className="hidden" />
      <input type="file" ref={imgInputRef} onChange={(e) => handleFileUpload(e, "IMAGE")} accept="image/*" className="hidden" />

      <button onClick={() => router.push("/investigator/dashboard")} className="text-xs text-neutral-500 hover:text-white mb-4">
        ← DASHBOARD
      </button>

      <div className="flex justify-between items-start mb-8 border-b border-white/10 pb-6">
        <div>
          <span className="text-xs text-orange-500 font-bold">{caseData.case_code}</span>
          <h1 className="text-3xl font-black text-white mt-1">{caseData.title}</h1>
          <p className="text-xs text-neutral-400 mt-2">{caseData.investigation_summary || "No summary provided."}</p>
        </div>
        <div className="text-right">
          <span className="text-xs px-2.5 py-1 bg-orange-500/10 border border-orange-500/30 text-orange-400">
            {caseData.status}
          </span>
        </div>
      </div>

      {/* Multi-Source Ingestion */}
      <div className="mb-10">
        <div className="text-xs font-bold tracking-widest text-neutral-300">MULTI-SOURCE DATA INGESTION</div>
        <div className="text-[11px] text-neutral-500 mt-1 mb-5">Bring different intelligence sources into one case workspace.</div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="border border-white/10 bg-white/[0.01] p-6 text-center hover:border-orange-500/40">
            <div className="text-xs font-bold text-white">DOCUMENTS</div>
            <div className="text-[10px] text-neutral-500 mt-1">PDF, DOCX, TXT</div>
            <button
              disabled={submitting}
              onClick={() => docInputRef.current?.click()}
              className="mt-4 text-[11px] font-bold text-orange-500 hover:underline disabled:opacity-50"
            >
              ↑ ADD SOURCE
            </button>
          </div>

          <div className="border border-white/10 bg-white/[0.01] p-6 text-center hover:border-orange-500/40">
            <div className="text-xs font-bold text-white">CSV / EXCEL</div>
            <div className="text-[10px] text-neutral-500 mt-1">CSV, XLSX</div>
            <button
              disabled={submitting}
              onClick={() => csvInputRef.current?.click()}
              className="mt-4 text-[11px] font-bold text-orange-500 hover:underline disabled:opacity-50"
            >
              ↑ ADD SOURCE
            </button>
          </div>

          <div className="border border-white/10 bg-white/[0.01] p-6 text-center hover:border-orange-500/40">
            <div className="text-xs font-bold text-white">IMAGES</div>
            <div className="text-[10px] text-neutral-500 mt-1">JPG, PNG, WEBP</div>
            <button
              disabled={submitting}
              onClick={() => imgInputRef.current?.click()}
              className="mt-4 text-[11px] font-bold text-orange-500 hover:underline disabled:opacity-50"
            >
              ↑ ADD SOURCE
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="border border-white/10 bg-white/[0.01] p-5">
            <div className="text-xs font-bold text-white">TEXT NOTES</div>
            <div className="text-[10px] text-neutral-500 mb-3">Paste intelligence notes</div>
            <button onClick={() => setModalType("NOTES")} className="w-full text-left text-xs text-neutral-500 border border-white/10 p-3 bg-black">
              Click to write notes...
            </button>
          </div>
          <div className="border border-white/10 bg-white/[0.01] p-5">
            <div className="text-xs font-bold text-white">URL SOURCE</div>
            <div className="text-[10px] text-neutral-500 mb-3">Reference an intelligence URL</div>
            <button onClick={() => setModalType("URL")} className="w-full text-left text-xs text-neutral-500 border border-white/10 p-3 bg-black">
              https://...
            </button>
          </div>
        </div>
      </div>

      {/* Sources List */}
      <div className="border-t border-white/10 pt-6">
        <div className="text-xs font-bold tracking-widest text-neutral-300 mb-4">
          ATTACHED INTELLIGENCE SOURCES ({caseData.sources?.length || 0})
        </div>
        <div className="grid grid-cols-3 gap-3">
          {caseData.sources?.map((s: SourceData, i: number) => (
            <div
              key={i}
              onClick={() => setPreviewSource(s)}
              className="border border-white/10 bg-white/[0.02] p-4 cursor-pointer hover:border-orange-500/30"
            >
              <span className="text-[9px] px-2 py-0.5 bg-orange-500/10 text-orange-400 font-bold">{s.type}</span>
              <div className="text-xs font-bold text-white mt-2 truncate">{s.title}</div>
              <div className="text-[10px] text-neutral-500 mt-1">Click to view ↗</div>
            </div>
          ))}
        </div>
      </div>

      {/* Input Modal */}
      {modalType && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleModalSubmit} className="border border-white/20 bg-[#0a0a0a] p-6 max-w-md w-full">
            <h3 className="text-sm font-bold text-white mb-4">INGEST SOURCE: {modalType}</h3>
            <input
              value={sourceTitle}
              onChange={(e) => setSourceTitle(e.target.value)}
              placeholder="Source Title"
              className="w-full border border-white/10 bg-black p-2.5 text-xs text-white mb-3 outline-none"
              required
            />
            <textarea
              value={sourceContent}
              onChange={(e) => setSourceContent(e.target.value)}
              placeholder={modalType === "URL" ? "https://..." : "Write intelligence notes..."}
              className="w-full border border-white/10 bg-black p-2.5 text-xs text-white mb-4 outline-none"
              rows={4}
              required
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 border border-white/10 text-xs">
                CANCEL
              </button>
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-orange-600 text-xs font-bold text-white">
                {submitting ? "INGESTING..." : "SAVE SOURCE"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Preview Modal */}
      {previewSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="flex h-[80vh] w-full max-w-3xl flex-col border border-white/20 bg-[#0c0c0d] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold tracking-widest text-orange-400">
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
                      className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-6 py-3 transition-colors"
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