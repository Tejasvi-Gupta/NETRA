"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

interface SourceData {
  type: string;
  title: string;
  content: string;
  uploaded_at?: string;
}

interface PersonData {
  name?: string;
  role?: string;
  phone?: string;
  notes?: string;
}

interface UnknownIdentityData {
  alias?: string;
  identifier?: string;
  description?: string;
}

interface IncidentData {
  title?: string;
  summary?: string;
  description?: string;
}

interface RelationshipData {
  source?: string;
  type?: string;
  target?: string;
}

interface AIExtractedData {
  persons?: PersonData[];
  unknown_identities?: UnknownIdentityData[];
  incidents?: IncidentData[];
  relationships?: RelationshipData[];
}

interface CaseData {
  _id: string;
  case_code: string;
  title: string;
  status: string;
  assigned_investigator?: string;
  investigation_summary?: string;
  sources?: SourceData[];
  ai_case_id?: string;
  ai_extracted_data?: AIExtractedData;
}

type ActiveTab = "sources" | "persons" | "unknowns" | "incidents" | "relations";

export default function AdminCaseView() {
  const { caseCode } = useParams();
  const router = useRouter();

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [previewSource, setPreviewSource] = useState<SourceData | null>(null);
  const [activeTab, setActiveTab] = useState<"sources" | "persons" | "unknowns" | "incidents" | "relations">("sources");

  const fetchCase = useCallback(async () => {
    const res = await fetch("/api/cases");
    const data = await res.json();
    if (data.success) {
      const found = data.cases.find((c: CaseData) => c.case_code === caseCode);
      setCaseData(found);
    }
  }, [caseCode]);

  useEffect(() => {
    const loadCase = async () => {
      await fetchCase();
    };
    void loadCase();
  }, [fetchCase]);

  if (!caseData) return <div className="p-8 text-neutral-500 font-mono">Loading case review...</div>;

  const aiData = caseData.ai_extracted_data || {};

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
          <div className="text-sm font-bold text-white mt-1">{caseData.assigned_investigator || "Lead Investigator"}</div>
          <span className="inline-block mt-2 text-xs px-2.5 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400">
            {caseData.status}
          </span>
          {caseData.ai_case_id && (
            <div className="text-[10px] text-neutral-500 mt-2 font-mono">AI_UUID: {caseData.ai_case_id.slice(0, 8)}...</div>
          )}
        </div>
      </div>

      {/* Intelligence Workspace Tabs */}
      <div className="border-b border-white/10 mb-6 flex gap-6 text-xs font-bold">
        {[
          { key: "sources", label: `ATTACHED SOURCES (${caseData.sources?.length || 0})` },
          { key: "persons", label: `IDENTIFIED PERSONS (${aiData.persons?.length || 0})` },
          { key: "unknowns", label: `UNKNOWN IDENTITIES (${aiData.unknown_identities?.length || 0})` },
          { key: "incidents", label: `INCIDENTS (${aiData.incidents?.length || 0})` },
          { key: "relations", label: `RELATIONSHIPS (${aiData.relationships?.length || 0})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as ActiveTab)}
            className={`pb-3 border-b-2 transition-all ${
              activeTab === t.key ? "border-red-500 text-red-400" : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
          >
            ai_extracted_data?: AIExtractedData;
          </button>
        ))}
      </div>

      {/* Tab 1: Sources */}
      {activeTab === "sources" && (
        <div>
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
                  <div className="text-[10px] text-neutral-500 mt-1">Click to open & review ↗</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Persons */}
      {activeTab === "persons" && (
        <div className="grid grid-cols-2 gap-3">
          {(!aiData.persons || aiData.persons.length === 0) ? (
            <div className="col-span-2 text-xs text-neutral-500 p-8 text-center border border-white/5">
              No persons extracted yet.
            </div>
          ) : (
            aiData.persons.map((p: PersonData, idx: number) => (
              <div key={idx} className="border border-white/10 bg-white/[0.02] p-4">
                <div className="text-xs font-bold text-white">{p.name || "Unnamed Person"}</div>
                <div className="text-[10px] text-red-400 mt-1">ROLE: {p.role || "Suspect / Associate"}</div>
                {p.phone && <div className="text-[11px] text-neutral-400 mt-2">📞 {p.phone}</div>}
                {p.notes && <div className="text-[11px] text-neutral-500 mt-2 leading-relaxed">{p.notes}</div>}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Unknown Identities */}
      {activeTab === "unknowns" && (
        <div className="grid grid-cols-2 gap-3">
          {(!aiData.unknown_identities || aiData.unknown_identities.length === 0) ? (
            <div className="col-span-2 text-xs text-neutral-500 p-8 text-center border border-white/5">
              No unknown aliases or shadowy identifiers flagged.
            </div>
          ) : (
            aiData.unknown_identities.map((u: UnknownIdentityData, idx: number) => (
              <div key={idx} className="border border-red-500/20 bg-red-500/[0.02] p-4">
                <div className="text-xs font-bold text-red-400">{u.alias || u.identifier || "Unknown Subject"}</div>
                <div className="text-[11px] text-neutral-400 mt-1">{u.description || "Unidentified accomplice"}</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Incidents */}
      {activeTab === "incidents" && (
        <div className="space-y-3">
          {(!aiData.incidents || aiData.incidents.length === 0) ? (
            <div className="text-xs text-neutral-500 p-8 text-center border border-white/5">
              No incidents registered from FIR text.
            </div>
          ) : (
            aiData.incidents.map((inc: IncidentData, idx: number) => (
              <div key={idx} className="border border-white/10 bg-white/[0.02] p-4">
                <div className="text-xs font-bold text-white">{inc.title || "FIR Incident"}</div>
                <div className="text-[11px] text-neutral-400 mt-1 leading-relaxed">{inc.summary || inc.description}</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 5: Relationships */}
      {activeTab === "relations" && (
        <div className="space-y-2">
          {(!aiData.relationships || aiData.relationships.length === 0) ? (
            <div className="text-xs text-neutral-500 p-8 text-center border border-white/5">
              No relationships mapped yet.
            </div>
          ) : (
            aiData.relationships.map((rel: RelationshipData, idx: number) => (
              <div key={idx} className="border border-white/10 bg-black p-3 flex items-center justify-between text-xs">
                <span className="font-bold text-white">{rel.source || "Entity A"}</span>
                <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                  ── {rel.type || "LINKED_TO"} ──▶
                </span>
                <span className="font-bold text-white">{rel.target || "Entity B"}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* CRASH-PROOF PREVIEW MODAL */}
      {previewSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="flex h-[85vh] w-full max-w-4xl flex-col border border-white/20 bg-[#0c0c0d] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="bg-red-500/10 px-2 py-0.5 text-[10px] font-bold tracking-widest text-red-400">
                  {previewSource.type}
                </span>
                <h3 className="max-w-md truncate text-sm font-bold text-white">{previewSource.title}</h3>
              </div>

              <div className="flex items-center gap-3">
                {previewSource.content.startsWith("data:") && (
                  <a
                    href={previewSource.content}
                    download={previewSource.title}
                    className="border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-neutral-300 hover:border-white/30 hover:text-white transition-all"
                  >
                    DOWNLOAD FILE ⤓
                  </a>
                )}
                <button onClick={() => setPreviewSource(null)} className="px-2 text-sm text-neutral-500 hover:text-white">
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden bg-[#050505] p-4 flex items-center justify-center">
              {/* IMAGE */}
              {previewSource.type === "IMAGE" && (
                <div className="relative flex h-full w-full items-center justify-center">
                  <Image
                    src={previewSource.content}
                    alt={previewSource.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 1024px"
                    unoptimized
                    className="rounded border border-white/5 object-contain"
                  />
                </div>
              )}

              {/* PDF */}
              {previewSource.title.toLowerCase().endsWith(".pdf") && previewSource.content.startsWith("data:") && (
                <iframe
                  src={previewSource.content}
                  title={previewSource.title}
                  className="h-full w-full rounded border-none"
                />
              )}

              {/* WORD / EXCEL CRASH PROTECTION */}
              {(previewSource.title.toLowerCase().endsWith(".docx") || previewSource.title.toLowerCase().endsWith(".xlsx")) && (
                <div className="flex flex-col items-center justify-center text-center p-8 border border-white/10 bg-white/[0.01] rounded max-w-md">
                  <div className="text-3xl mb-3">📄</div>
                  <h4 className="text-sm font-bold text-white mb-1">{previewSource.title}</h4>
                  <p className="text-xs text-neutral-400 mb-6">
                    Word and Excel documents are binary formats requiring external software to open.
                  </p>
                  {previewSource.content.startsWith("data:") ? (
                    <a
                      href={previewSource.content}
                      download={previewSource.title}
                      className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-5 py-2.5 rounded transition-all"
                    >
                      DOWNLOAD & OPEN FILE ⤓
                    </a>
                  ) : (
                    <span className="text-xs text-red-400">File format invalid. Re-upload using the file picker.</span>
                  )}
                </div>
              )}

              {/* NOTES / URL / PLAIN TEXT */}
              {(previewSource.type === "NOTES" ||
                previewSource.type === "URL" ||
                (!previewSource.content.startsWith("data:") && !previewSource.title.endsWith(".docx"))) && (
                <div className="h-full w-full overflow-y-auto p-6 font-mono text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap selection:bg-red-500/30">
                  {previewSource.content}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}