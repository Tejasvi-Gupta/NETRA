"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Case, Entity, EntityType, PhoneRecord, FinancialTransaction } from "@/types/netra";

const typeIcon: Record<EntityType, string> = {
  PERSON: "👤",
  ORGANIZATION: "🏢",
  LOCATION: "📍",
  PHONE: "📞",
  VEHICLE: "🚗",
  BANK_ACCOUNT: "🏦",
};

const riskColor: Record<string, string> = {
  CRITICAL: "text-red-400 border-red-500/30 bg-red-500/5",
  HIGH: "text-orange-400 border-orange-500/30 bg-orange-500/5",
  MEDIUM_HIGH: "text-amber-400 border-amber-500/30 bg-amber-500/5",
  MEDIUM: "text-amber-400 border-amber-500/30 bg-amber-500/5",
  LOW: "text-neutral-400 border-neutral-700 bg-neutral-800/30",
  WITNESS: "text-cyan-400 border-cyan-500/30 bg-cyan-500/5",
};

interface ConnectionRow {
  id: string;
  relationship: string;
  confidence: number | null;
  evidence_summary: string | null;
  direction: "OUT" | "IN";
  otherEntity: Entity;
}

const typeFilters: (EntityType | "ALL")[] = ["ALL", "PERSON", "ORGANIZATION", "LOCATION", "VEHICLE", "BANK_ACCOUNT"];

export default function CaseEntitiesPage() {
  const router = useRouter();
  const { caseCode } = useParams<{ caseCode: string }>();

  const [caseRecord, setCaseRecord] = useState<Case | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [connections, setConnections] = useState<{ id: string; from_entity: string; to_entity: string; relationship: string; confidence: number | null; evidence_summary: string | null }[]>([]);
  const [phoneRecords, setPhoneRecords] = useState<PhoneRecord[]>([]);
  const [financials, setFinancials] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<EntityType | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!caseCode) return;

    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      const { data: caseData, error: caseError } = await supabase
        .from("cases")
        .select("*")
        .eq("case_code", caseCode)
        .single();

      if (caseError || !caseData) {
        if (!isMounted) return;
        setError(caseError?.message ?? "Case not found.");
        setLoading(false);
        return;
      }

      if (!isMounted) return;
      setCaseRecord(caseData);

      const [entitiesRes, connectionsRes, phonesRes, financialsRes] = await Promise.all([
        supabase.from("entities").select("*").eq("case_id", caseData.id).order("confidence", { ascending: false }),
        supabase.from("entity_connections").select("*").eq("case_id", caseData.id),
        supabase.from("phone_records").select("*").eq("case_id", caseData.id),
        supabase.from("financial_transactions").select("*").eq("case_id", caseData.id),
      ]);

      if (!isMounted) return;

      if (entitiesRes.error) {
        setError(entitiesRes.error.message);
        setLoading(false);
        return;
      }

      setEntities(entitiesRes.data ?? []);
      setConnections(connectionsRes.data ?? []);
      setPhoneRecords(phonesRes.data ?? []);
      setFinancials(financialsRes.data ?? []);
      if (entitiesRes.data && entitiesRes.data.length > 0) {
        setSelectedId(entitiesRes.data[0].id);
      }
      setLoading(false);
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [caseCode]);

  const filtered = useMemo(() => {
    return entities.filter((e) => {
      const matchesSearch = !search.trim() || e.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "ALL" || e.entity_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [entities, search, typeFilter]);

  const selected = entities.find((e) => e.id === selectedId) ?? filtered[0] ?? null;

  const entityConnections: ConnectionRow[] = useMemo(() => {
    if (!selected) return [];
    const rows: ConnectionRow[] = [];
    for (const c of connections) {
      if (c.from_entity === selected.id) {
        const other = entities.find((e) => e.id === c.to_entity);
        if (other) rows.push({ ...c, direction: "OUT", otherEntity: other });
      } else if (c.to_entity === selected.id) {
        const other = entities.find((e) => e.id === c.from_entity);
        if (other) rows.push({ ...c, direction: "IN", otherEntity: other });
      }
    }
    return rows;
  }, [selected, connections, entities]);

  const selectedPhones = useMemo(
    () => (selected ? phoneRecords.filter((p) => p.entity_id === selected.id) : []),
    [selected, phoneRecords]
  );

  const selectedFinancials = useMemo(() => {
    if (!selected) return [];
    return financials
      .filter((f) => f.from_entity === selected.id || f.to_entity === selected.id)
      .map((f) => ({
        ...f,
        direction: f.from_entity === selected.id ? "SENT" : "RECEIVED",
        counterparty: entities.find((e) => e.id === (f.from_entity === selected.id ? f.to_entity : f.from_entity)),
      }));
  }, [selected, financials, entities]);

  if (loading) {
    return <main className="min-h-screen bg-[#080808] px-6 py-24 text-center font-mono text-xs tracking-widest text-neutral-500">LOADING ENTITY INTELLIGENCE…</main>;
  }

  if (error || !caseRecord) {
    return (
      <main className="min-h-screen bg-[#080808] px-6 py-24 text-center text-neutral-300">
        <p className="text-sm text-red-400">{error ?? "Case not found."}</p>
        <button onClick={() => router.push("/cases")} className="mt-6 border border-neutral-700 px-4 py-2 text-xs tracking-widest hover:border-red-500">
          BACK TO CASES
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080808] text-neutral-200">
      <div className="mx-auto max-w-375 px-6 py-8 md:px-10">
        <button onClick={() => router.push(`/cases/${caseCode}`)} className="text-[11px] tracking-[0.16em] text-neutral-400 hover:text-red-400">
          ← BACK TO CASE
        </button>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">ALL ENTITIES</h1>
            <p className="mt-2 text-xs text-neutral-500">
              {entities.length} entities identified · {caseRecord.title}
            </p>
          </div>
          <span className="border border-neutral-800 px-3 py-1.5 text-[10px] tracking-widest text-neutral-400">
            CASE ID: {caseRecord.case_code}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex min-w-60 flex-1 items-center gap-2 border border-neutral-800 bg-[#0b0b0b] px-3.5 py-2.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entities..."
              className="w-full bg-transparent text-xs text-neutral-200 outline-none placeholder:text-neutral-600"
            />
          </div>

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as EntityType | "ALL")} className="border border-neutral-800 bg-[#0b0b0b] px-3 py-2.5 text-xs text-neutral-300 outline-none">
            {typeFilters.map((t) => <option key={t} value={t}>{t === "ALL" ? "All Types" : t.replace("_", " ")}</option>)}
          </select>
        </div>

        {entities.length === 0 ? (
          <div className="mt-10 border border-neutral-800 bg-[#0d0d0d] py-16 text-center">
            <div className="text-sm font-semibold text-white">NO ENTITIES IDENTIFIED</div>
            <p className="mt-2 text-xs text-neutral-500">Upload case sources to begin entity extraction.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.7fr)]">
            {/* LEFT: entity list */}
            <div className="max-h-[calc(100vh-260px)] overflow-y-auto border border-neutral-800 bg-[#0d0d0d]">
              {filtered.length === 0 ? (
                <div className="px-5 py-10 text-center text-xs text-neutral-500">No entities match your filters.</div>
              ) : (
                filtered.map((e) => {
                  const connCount = connections.filter((c) => c.from_entity === e.id || c.to_entity === e.id).length;
                  return (
                    <button
                      key={e.id}
                      onClick={() => setSelectedId(e.id)}
                      className={`w-full border-b border-neutral-800 px-4 py-4 text-left transition-colors last:border-0 hover:bg-[#131313] ${
                        selected?.id === e.id ? "bg-[#160c0c] border-l-2 border-l-red-500 pl-3.5" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg">{typeIcon[e.entity_type]}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-white truncate">{e.name}</div>
                          <div className="mt-1 text-[9px] tracking-widest text-neutral-500">
                            {e.entity_type} {e.entity_code ? `· ${e.entity_code}` : ""}
                          </div>
                          {e.risk_level && (
                            <div className={`mt-2 inline-block border px-2 py-0.5 text-[9px] tracking-wide ${riskColor[e.risk_level] ?? riskColor.LOW}`}>
                              {e.risk_level.replace("_", " ")} RISK
                            </div>
                          )}
                          <div className="mt-2 text-[10px] text-neutral-600">
                            {connCount} connection{connCount !== 1 ? "s" : ""} {e.confidence ? `· ${e.confidence}% confidence` : ""}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* RIGHT: entity analysis panel */}
            {selected ? (
              <div className="space-y-5">
                <section className="border border-neutral-800 bg-[#111] p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{typeIcon[selected.entity_type]}</span>
                      <div>
                        <h2 className="text-2xl font-bold text-white">{selected.name}</h2>
                        <div className="mt-1 text-[10px] tracking-widest text-neutral-500">
                          {selected.entity_type} {selected.entity_code ? `· ${selected.entity_code}` : ""}
                        </div>
                        {selected.role && <div className="mt-1 text-xs text-neutral-400">{selected.role}</div>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {selected.risk_level && (
                        <span className={`border px-2.5 py-1 text-[9px] tracking-widest ${riskColor[selected.risk_level] ?? riskColor.LOW}`}>
                          {selected.risk_level.replace("_", " ")} RISK
                        </span>
                      )}
                      <span className={`border px-2.5 py-1 text-[9px] tracking-widest ${
                        selected.verification === "VERIFIED" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/5" : "text-amber-400 border-amber-500/30 bg-amber-500/5"
                      }`}>
                        {selected.verification}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-3">
                    <MiniMetric label="CONFIDENCE" value={selected.confidence ? `${selected.confidence}%` : "—"} />
                    <MiniMetric label="CONNECTIONS" value={String(entityConnections.length)} />
                    <MiniMetric label="AGE" value={selected.age ? String(selected.age) : "—"} />
                  </div>

                  {selected.occupation && (
                    <div className="mt-5 border-t border-neutral-800 pt-4 text-xs text-neutral-400">
                      <span className="text-neutral-600">OCCUPATION: </span>{selected.occupation}
                    </div>
                  )}
                  {selected.criminal_history && (
                    <div className="mt-2 text-xs text-neutral-400">
                      <span className="text-neutral-600">CRIMINAL HISTORY: </span>{selected.criminal_history}
                    </div>
                  )}
                </section>

                {/* connections */}
                <section className="border border-neutral-800 bg-[#111] p-6">
                  <h3 className="border-b border-neutral-800 pb-4 text-[11px] font-semibold tracking-[0.16em] text-white">CONNECTIONS</h3>
                  {entityConnections.length === 0 ? (
                    <div className="py-6 text-center text-xs text-neutral-500">No documented connections for this entity.</div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {entityConnections.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedId(c.otherEntity.id)}
                          className="flex w-full flex-col gap-2 border border-neutral-800 bg-[#0d0d0d] px-4 py-3 text-left hover:border-neutral-600"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-base">{typeIcon[c.otherEntity.entity_type]}</span>
                              <div>
                                <div className="text-sm text-white">{c.otherEntity.name}</div>
                                <div className="text-[10px] text-neutral-500">
                                  {c.direction === "OUT" ? c.relationship : `Connected via: ${c.relationship}`}
                                </div>
                              </div>
                            </div>
                            {c.confidence != null && (
                              <div className="text-[9px] tracking-wide text-cyan-400">{c.confidence}% CONF.</div>
                            )}
                          </div>
                          {c.evidence_summary && (
                            <p className="text-[11px] leading-relaxed text-neutral-400 pl-8">{c.evidence_summary}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                {/* phone records */}
                {selectedPhones.length > 0 && (
                  <section className="border border-neutral-800 bg-[#111] p-6">
                    <h3 className="border-b border-neutral-800 pb-4 text-[11px] font-semibold tracking-[0.16em] text-white">PHONE / CDR RECORDS</h3>
                    <div className="mt-4 space-y-3">
                      {selectedPhones.map((p) => (
                        <div key={p.id} className="border border-neutral-800 bg-[#0d0d0d] px-4 py-3">
                          <div className="text-sm text-white font-mono">{p.number}</div>
                          <div className="mt-1 text-[11px] text-neutral-500">{p.pattern_summary}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* financial records */}
                {selectedFinancials.length > 0 && (
                  <section className="border border-neutral-800 bg-[#111] p-6">
                    <h3 className="border-b border-neutral-800 pb-4 text-[11px] font-semibold tracking-[0.16em] text-white">FINANCIAL TRAIL</h3>
                    <div className="mt-4 space-y-3">
                      {selectedFinancials.map((f) => (
                        <div key={f.id} className="border border-neutral-800 bg-[#0d0d0d] px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-white">
                              {f.direction === "SENT" ? "→ " : "← "}{f.counterparty?.name ?? "Unknown"}
                            </div>
                            <div className="text-sm font-semibold text-red-400">₹{Number(f.amount).toLocaleString("en-IN")}</div>
                          </div>
                          <div className="mt-1 text-[10px] tracking-wide text-neutral-500">{f.label}</div>
                          <div className="mt-1 text-[11px] text-neutral-400">{f.significance}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* metadata */}
                <section className="border border-neutral-800 bg-[#111] p-6">
                  <h3 className="border-b border-neutral-800 pb-4 text-[11px] font-semibold tracking-[0.16em] text-white">ENTITY METADATA</h3>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                    <MetaRow label="First detected" value={selected.first_detected ?? "—"} />
                    <MetaRow label="Last detected" value={selected.last_detected ?? "—"} />
                    <MetaRow label="Entity type" value={selected.entity_type.replace("_", " ")} />
                    <MetaRow label="Verification status" value={selected.verification} highlight={selected.verification === "VERIFIED" ? "text-emerald-400" : "text-amber-400"} />
                  </div>
                </section>
              </div>
            ) : (
              <div className="flex items-center justify-center border border-neutral-800 bg-[#0d0d0d] py-24 text-center text-sm text-neutral-500">
                Select an entity to view its intelligence profile.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-neutral-800 bg-[#0d0d0d] px-4 py-3 text-center">
      <div className="text-[9px] tracking-widest text-neutral-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function MetaRow({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div>
      <div className="text-[9px] tracking-widest text-neutral-500">{label.toUpperCase()}</div>
      <div className={`mt-1 ${highlight ?? "text-neutral-200"}`}>{value}</div>
    </div>
  );
}