"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface SourceData {
  type: string;
  title: string;
  content: string;
  uploaded_at?: string;
}

interface PersonProfile {
  identity?: { name?: string; aliases?: string[] };
  person_id?: string;
  name?: string;
  canonical_name?: string;
  role?: string;
  phone?: string;
  contact?: { phones?: string[] };
  addresses?: { text?: string }[];
}

interface PersonRecord extends PersonProfile {
  person?: PersonProfile;
  roles?: string[];
}

interface UnknownIdentityRecord {
  label?: string;
  alias?: string;
  identifier?: string;
  description?: string;
  status?: string;
  roles?: string[];
}

interface IncidentRecord {
  title?: string;
  description?: string;
  time?: { start?: string };
  extraction?: { method?: string };
  key_points?: string[];
}

interface RelationRecord {
  from?: { id?: string };
  to?: { id?: string };
  source?: string;
  target?: string;
  type?: string;
  evidence?: string;
}

interface AiExtractedData {
  persons?: PersonRecord[];
  unknown_identities?: UnknownIdentityRecord[];
  incidents?: IncidentRecord[];
  relationships?: RelationRecord[];
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
  ai_extracted_data?: AiExtractedData;
}

type ActiveTab = "sources" | "persons" | "unknowns" | "incidents" | "relations";

export default function AdminCaseView() {
  const { caseCode } = useParams();
  const router = useRouter();

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [previewSource, setPreviewSource] = useState<SourceData | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("sources");

  const fetchCase = useCallback(async () => {
    const res = await fetch("/api/cases");
    const data = await res.json();
    if (data.success) {
      const found = data.cases.find((c: CaseData) => c.case_code === caseCode);
      setCaseData(found);
    }
  }, [caseCode]);

  useEffect(() => {
    void (async () => {
      await fetchCase();
    })();
  }, [fetchCase]);

  if (!caseData) return <div className="p-8 text-neutral-500 font-mono">Loading case review...</div>;

  const aiData = caseData.ai_extracted_data || {};
  const personsList = aiData.persons || [];
  const unknownsList = aiData.unknown_identities || [];
  const incidentsList = aiData.incidents || [];
  const relationsList = aiData.relationships || [];

  const getEntityName = (id: string) => {
    const found = personsList.find(
      (item: PersonRecord) => (item.person?.person_id || item.person_id) === id
    );
    return found?.person?.identity?.name || found?.name || id;
  };

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
          <span className="inline-block mt-2 text-xs px-2.5 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 uppercase">
            {caseData.status}
          </span>
          {caseData.ai_case_id && (
            <div className="text-[10px] text-neutral-600 mt-1 font-mono">AI_UUID: {caseData.ai_case_id.slice(0, 8)}...</div>
          )}
        </div>
      </div>

      {/* Tabs Header */}
      <div className="border-b border-white/10 mb-6 flex gap-6 text-xs font-bold">
        {[
          { key: "sources", label: `RAW EVIDENCE (${caseData.sources?.length || 0})` },
          { key: "persons", label: `IDENTIFIED PERSONS (${personsList.length})` },
          { key: "unknowns", label: `UNKNOWN IDENTITIES (${unknownsList.length})` },
          { key: "incidents", label: `INCIDENTS (${incidentsList.length})` },
          { key: "relations", label: `RELATIONSHIPS (${relationsList.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as ActiveTab)}
            className={`pb-3 border-b-2 transition-all ${
              activeTab === t.key ? "border-red-500 text-red-400" : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {t.label}
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
                  <div className="text-[10px] text-neutral-500 mt-1">Click to view ↗</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Persons */}
      {activeTab === "persons" && (
        <div className="space-y-3">
          {personsList.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {personsList.map((item: PersonRecord, idx: number) => {
                const p = item.person || item;
                const name = p.identity?.name || p.name || p.canonical_name || "Unnamed Person";
                const role = (item.roles && item.roles[0]) || p.role || "PERSON OF INTEREST";
                const phone = p.contact?.phones?.[0] || p.phone || null;
                const address = p.addresses?.[0]?.text || null;
                const aliases = p.identity?.aliases?.join(", ") || null;

                return (
                  <div key={idx} className="border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-bold text-white">{name}</div>
                        <span className="text-[9px] px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 font-bold uppercase">
                          {role}
                        </span>
                      </div>
                      {aliases && <div className="text-[10px] text-red-400/80 mt-1">aka {aliases}</div>}
                      {phone && <div className="text-[11px] text-neutral-400 mt-2">📞 {phone}</div>}
                      {address && <div className="text-[11px] text-neutral-500 mt-1">📍 {address}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 border border-dashed border-zinc-800 rounded text-center text-zinc-500 text-sm">
              No identified persons detected in this case dossier.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Unknowns */}
      {activeTab === "unknowns" && (
        <div className="grid grid-cols-2 gap-3">
          {unknownsList.length === 0 ? (
            <div className="col-span-2 text-xs text-neutral-500 p-8 text-center border border-white/5">
              No unidentified operators or shadowy handles flagged.
            </div>
          ) : (
            unknownsList.map((u: UnknownIdentityRecord, idx: number) => (
              <div key={idx} className="border border-red-500/30 bg-red-950/10 p-4 rounded flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-red-400">🎭 {u.label || u.alias || "Unknown Node"}</span>
                    <span className="text-[9px] px-2 py-0.5 bg-red-900/40 border border-red-700/50 text-red-300 font-bold uppercase">
                      {u.status || "UNIDENTIFIED"}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                    {u.description?.replace(/^Unidentified Node:\s*/i, "") || "Unidentified accomplice in network."}
                  </p>
                </div>
                <div className="mt-3 text-[10px] text-neutral-500">
                  ROLE: {u.roles?.[0] || "UNKNOWN"}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Incidents */}
      {activeTab === "incidents" && (
        <div className="space-y-3">
          {incidentsList.length > 0 ? (
            incidentsList.map((inc: IncidentRecord, idx: number) => (
              <div key={idx} className="p-4 border border-zinc-800 bg-zinc-950 rounded">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wide">
                    {inc.time?.start ? `DATE LOGGED: ${inc.time.start}` : "INCIDENT LOG"}
                  </span>
                  <span className="text-[9px] px-2 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-400">
                    {inc.extraction?.method || "PARSED"}
                  </span>
                </div>

                <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                  {inc.description || inc.title}
                </p>

                {inc.key_points && inc.key_points.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-900">
                    <div className="text-[10px] text-zinc-500 font-bold uppercase mb-2">Key Extracted Points:</div>
                    <ul className="space-y-1">
                      {inc.key_points.map((pt: string, i: number) => (
                        <li key={i} className="text-[11px] text-zinc-400 flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-6 border border-dashed border-zinc-800 rounded text-center text-zinc-500 text-sm">
              No incident statements recorded.
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Relations */}
      {activeTab === "relations" && (
        <div className="space-y-2">
          {relationsList.length === 0 ? (
            <div className="text-xs text-neutral-500 p-8 text-center border border-white/5">
              No linked network entities recorded.
            </div>
          ) : (
            relationsList.map((rel: RelationRecord, idx: number) => {
              const fromName = getEntityName(rel.from?.id || rel.source || "Node A");
              const toName = getEntityName(rel.to?.id || rel.target || "Node B");

              return (
                <div key={idx} className="border border-zinc-800 bg-zinc-950 p-4 rounded">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-2">
                    <span className="text-xs font-bold text-white">{fromName}</span>
                    <span className="px-2.5 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase">
                      ── {rel.type || "LINKED_TO"} ──▶
                    </span>
                    <span className="text-xs font-bold text-white">{toName}</span>
                  </div>
                  {rel.evidence && (
                    <p className="text-[11px] text-zinc-400 italic leading-relaxed mt-1">
                      &quot;{rel.evidence}&quot;
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Source Preview Modal */}
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
              {previewSource.type === "IMAGE" && (
                <div className="flex h-full w-full items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewSource.content} alt={previewSource.title} className="max-h-full max-w-full object-contain" />
                </div>
              )}

              {(previewSource.type === "NOTES" || previewSource.type === "URL") && (
                <div className="h-full w-full overflow-y-auto p-4 font-mono text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">
                  {previewSource.content}
                </div>
              )}

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