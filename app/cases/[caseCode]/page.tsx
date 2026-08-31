"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SourcePreviewGrid from "@/components/SourcePreviewGrid";
import type { Source } from "@/types/netra";

type EntityType = "PERSON" | "ORGANIZATION" | "LOCATION" | "PHONE" | "VEHICLE" | "BANK_ACCOUNT" | "OTHER";
type Relevance = "HIGH" | "MEDIUM" | "LOW";
type SourceType = "PDF" | "DOCX" | "CSV" | "XLSX" | "IMAGE" | "TEXT" | "URL";

interface EvidenceSnippet {
  source: string;
  snippet: string;
  meta: string;
}

interface Connection {
  name: string;
  type: EntityType;
  relationship: string;
  relevance: Relevance;
  sources: number;
}

interface SourceRef {
  name: string;
  icon: string;
  meta: string;
  type: SourceType;
  addedDate: string;
  // PDF / DOCX
  pageNumber?: number;
  highlightText?: string;
  // CSV / XLSX
  sheetName?: string;
  tableHeaders?: string[];
  tableRows?: string[][];
  highlightRowIndex?: number;
  highlightCellIndices?: [number, number][];
  // IMAGE
  imageUrl?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
  // TEXT
  noteContent?: string;
  // URL
  urlTitle?: string;
  urlDomain?: string;
  urlSnippet?: string;
  sourceUrl?: string;
}

interface Entity {
  id: string;
  name: string;
  type: EntityType;
  relevance: Relevance;
  confidence: number;
  sourceCount: number;
  mentionCount: number;
  aiInsight: string;
  connections: Connection[];
  sourceRefs: SourceRef[];
  evidence: EvidenceSnippet[];
  firstDetected: string;
  lastDetected: string;
  verification: "VERIFIED" | "UNVERIFIED";
}

// ── sample entities for this case — replace with a Supabase fetch once entity extraction exists ──
const sampleEntities: Entity[] = [
  {
    id: "1", name: "Ravi Kumar", type: "PERSON", relevance: "HIGH", confidence: 91,
    sourceCount: 3, mentionCount: 7,
    aiInsight: "Ravi Kumar appears across 3 independent sources. The entity is directly associated with Amit Sharma and appears in a financial transaction recorded in Financial_Record.xlsx.",
    connections: [
      { name: "Amit Sharma", type: "PERSON", relationship: "Associated with", relevance: "MEDIUM", sources: 2 },
      { name: "+91 XXXXXXXX", type: "PHONE", relationship: "Contact number", relevance: "HIGH", sources: 2 },
      { name: "XXXX1234", type: "BANK_ACCOUNT", relationship: "Transaction party", relevance: "MEDIUM", sources: 1 },
    ],
    sourceRefs: [
      {
        name: "FIR_Report_01.pdf", icon: "📄", meta: "Mentioned 4 times · Page 3",
        type: "PDF", addedDate: "20 Apr 2026", pageNumber: 3,
        highlightText: "Ravi Kumar was seen meeting Amit Sharma near Delhi Railway Station.",
      },
      {
        name: "Financial_Record.xlsx", icon: "📊", meta: "2 related records",
        type: "XLSX", addedDate: "22 Apr 2026", sheetName: "Transactions",
        tableHeaders: ["Date", "Party", "Amount", "Account"],
        tableRows: [
          ["16 Apr 2026", "Unknown", "₹40,000", "XXXX1234"],
          ["18 Apr 2026", "Ravi Kumar", "₹2,40,000", "XXXX1234"],
        ],
        highlightRowIndex: 1,
      },
      {
        name: "Field_Note.txt", icon: "📝", meta: "Mentioned 1 time",
        type: "TEXT", addedDate: "18 Apr 2026",
        noteContent: "Vehicle UP16XX1234 observed parked near the location for over 3 hours. Ravi Kumar was noted entering the vehicle around 6:40 PM.",
        highlightText: "Ravi Kumar was noted entering the vehicle around 6:40 PM.",
      },
    ],
    evidence: [
      { source: "FIR_Report_01.pdf", snippet: "Ravi Kumar was seen meeting Amit Sharma near Delhi Railway Station.", meta: "Page 3" },
      { source: "Financial_Record.xlsx", snippet: "Transaction involving Ravi Kumar — ₹2,40,000", meta: "Row 18" },
    ],
    firstDetected: "12 Apr 2026", lastDetected: "27 Apr 2026", verification: "UNVERIFIED",
  },
  {
    id: "2", name: "Amit Sharma", type: "PERSON", relevance: "MEDIUM", confidence: 78,
    sourceCount: 2, mentionCount: 4,
    aiInsight: "Amit Sharma is consistently linked to Ravi Kumar across communication and location records, suggesting a coordinated association rather than incidental contact.",
    connections: [
      { name: "Ravi Kumar", type: "PERSON", relationship: "Associated with", relevance: "HIGH", sources: 2 },
      { name: "Delhi", type: "LOCATION", relationship: "Seen at", relevance: "MEDIUM", sources: 2 },
    ],
    sourceRefs: [
      {
        name: "FIR_Report_01.pdf", icon: "📄", meta: "Mentioned 2 times · Page 3",
        type: "PDF", addedDate: "20 Apr 2026", pageNumber: 3,
        highlightText: "Amit Sharma, known associate of Ravi Kumar, was present at the location.",
      },
      {
        name: "CDR_Data.csv", icon: "📊", meta: "3 related records",
        type: "CSV", addedDate: "21 Apr 2026",
        tableHeaders: ["Timestamp", "Caller", "Callee", "Duration"],
        tableRows: [
          ["14 Apr 2026 10:02", "Amit Sharma", "+91 98XXXXXXXX", "00:04:12"],
          ["15 Apr 2026 19:44", "Amit Sharma", "+91 98XXXXXXXX", "00:01:03"],
          ["16 Apr 2026 08:12", "Amit Sharma", "+91 98XXXXXXXX", "00:07:51"],
        ],
        highlightRowIndex: 0,
      },
    ],
    evidence: [
      { source: "FIR_Report_01.pdf", snippet: "...Amit Sharma, known associate of Ravi Kumar, was present at the location.", meta: "Page 3" },
    ],
    firstDetected: "12 Apr 2026", lastDetected: "25 Apr 2026", verification: "UNVERIFIED",
  },
  {
    id: "3", name: "Delhi", type: "LOCATION", relevance: "MEDIUM", confidence: 85,
    sourceCount: 4, mentionCount: 12,
    aiInsight: "Delhi Railway Station is referenced as a recurring meeting point across multiple sources and appears to correlate with movement patterns of two flagged entities.",
    connections: [
      { name: "Ravi Kumar", type: "PERSON", relationship: "Seen at", relevance: "HIGH", sources: 3 },
      { name: "Amit Sharma", type: "PERSON", relationship: "Seen at", relevance: "MEDIUM", sources: 2 },
    ],
    sourceRefs: [
      {
        name: "FIR_Report_01.pdf", icon: "📄", meta: "Mentioned 5 times · Page 2–3",
        type: "PDF", addedDate: "20 Apr 2026", pageNumber: 2,
        highlightText: "...seen near Delhi Railway Station with Mohit Kumar.",
      },
      {
        name: "CDR_Data.csv", icon: "📊", meta: "Cell tower correlation, 6 records",
        type: "CSV", addedDate: "21 Apr 2026",
        tableHeaders: ["Timestamp", "Tower ID", "Location"],
        tableRows: [
          ["14 Apr 2026 10:02", "DL-4021", "Delhi Railway Station"],
          ["15 Apr 2026 19:44", "DL-4021", "Delhi Railway Station"],
        ],
        highlightRowIndex: 1,
      },
      {
        name: "CCTV_Image_03.jpg", icon: "🖼️", meta: "Visual reference",
        type: "IMAGE", addedDate: "23 Apr 2026",
        imageUrl: "",
        boundingBox: { x: 30, y: 20, width: 25, height: 40 },
      },
    ],
    evidence: [
      { source: "FIR_Report_01.pdf", snippet: "...seen near Delhi Railway Station with Mohit Kumar.", meta: "Page 2" },
    ],
    firstDetected: "10 Apr 2026", lastDetected: "27 Apr 2026", verification: "VERIFIED",
  },
  {
    id: "4", name: "+91 98XXXXXXXX", type: "PHONE", relevance: "HIGH", confidence: 88,
    sourceCount: 2, mentionCount: 5,
    aiInsight: "This number shows a sharp increase in call frequency in the 72 hours preceding the reported incident, correlating with Ravi Kumar's known contacts.",
    connections: [
      { name: "Ravi Kumar", type: "PERSON", relationship: "Registered contact", relevance: "HIGH", sources: 2 },
    ],
    sourceRefs: [
      {
        name: "CDR_Data.csv", icon: "📊", meta: "5 related records",
        type: "CSV", addedDate: "21 Apr 2026",
        tableHeaders: ["Timestamp", "Caller", "Callee", "Duration"],
        tableRows: [
          ["14 Apr 2026 10:02", "Amit Sharma", "+91 98XXXXXXXX", "00:04:12"],
          ["18 Apr 2026 22:10", "Unknown", "+91 98XXXXXXXX", "00:00:41"],
        ],
        highlightRowIndex: 1,
      },
    ],
    evidence: [
      { source: "CDR_Data.csv", snippet: "18 outgoing calls recorded within 24 hours, up from a baseline of 2/day.", meta: "Row 4–22" },
    ],
    firstDetected: "14 Apr 2026", lastDetected: "26 Apr 2026", verification: "UNVERIFIED",
  },
  {
    id: "5", name: "A/C XXXX1234", type: "BANK_ACCOUNT", relevance: "MEDIUM", confidence: 74,
    sourceCount: 1, mentionCount: 6,
    aiInsight: "Six transactions tied to this account form a structured pattern of sub-₹50,000 transfers, consistent with a funneling pattern rather than routine activity.",
    connections: [
      { name: "Ravi Kumar", type: "PERSON", relationship: "Transaction party", relevance: "MEDIUM", sources: 1 },
    ],
    sourceRefs: [
      {
        name: "Financial_Record.xlsx", icon: "📊", meta: "6 related records",
        type: "XLSX", addedDate: "22 Apr 2026", sheetName: "Transactions",
        tableHeaders: ["Date", "Party", "Amount", "Account"],
        tableRows: [
          ["16 Apr 2026", "Unknown", "₹40,000", "XXXX1234"],
          ["18 Apr 2026", "Ravi Kumar", "₹2,40,000", "XXXX1234"],
        ],
        highlightRowIndex: 1,
      },
    ],
    evidence: [
      { source: "Financial_Record.xlsx", snippet: "Transaction involving Ravi Kumar — ₹2,40,000", meta: "Row 18" },
    ],
    firstDetected: "16 Apr 2026", lastDetected: "24 Apr 2026", verification: "UNVERIFIED",
  },
  {
    id: "6", name: "UP16 XX 1234", type: "VEHICLE", relevance: "MEDIUM", confidence: 69,
    sourceCount: 1, mentionCount: 2,
    aiInsight: "Vehicle registration overlaps with two known drop-point locations flagged in prior surveillance reports for this case cluster.",
    connections: [
      { name: "Delhi", type: "LOCATION", relationship: "Seen at", relevance: "MEDIUM", sources: 1 },
    ],
    sourceRefs: [
      {
        name: "Field_Note.txt", icon: "📝", meta: "Mentioned 2 times",
        type: "TEXT", addedDate: "18 Apr 2026",
        noteContent: "Vehicle UP16XX1234 observed parked near the location for over 3 hours. Registered under XYZ Logistics as per RTO lookup.",
        highlightText: "Vehicle UP16XX1234 observed parked near the location for over 3 hours.",
      },
    ],
    evidence: [
      { source: "Field_Note.txt", snippet: "Vehicle UP16XX1234 observed parked near the location for over 3 hours.", meta: "" },
    ],
    firstDetected: "18 Apr 2026", lastDetected: "22 Apr 2026", verification: "UNVERIFIED",
  },
  {
    id: "7", name: "XYZ Logistics", type: "ORGANIZATION", relevance: "LOW", confidence: 52,
    sourceCount: 1, mentionCount: 1,
    aiInsight: "Mentioned once in association with the vehicle entity. Confidence is low due to a single low-context source reference.",
    connections: [
      { name: "UP16 XX 1234", type: "VEHICLE", relationship: "Registered to", relevance: "LOW", sources: 1 },
    ],
    sourceRefs: [
      {
        name: "Field_Note.txt", icon: "📝", meta: "Mentioned 1 time",
        type: "TEXT", addedDate: "18 Apr 2026",
        noteContent: "Vehicle registered under XYZ Logistics as per RTO lookup.",
        highlightText: "Vehicle registered under XYZ Logistics as per RTO lookup.",
      },
    ],
    evidence: [
      { source: "Field_Note.txt", snippet: "Vehicle registered under XYZ Logistics as per RTO lookup.", meta: "" },
    ],
    firstDetected: "18 Apr 2026", lastDetected: "18 Apr 2026", verification: "UNVERIFIED",
  },
];

const typeFilters: (EntityType | "ALL")[] = ["ALL", "PERSON", "ORGANIZATION", "LOCATION", "PHONE", "VEHICLE", "BANK_ACCOUNT", "OTHER"];
const relevanceFilters: (Relevance | "ALL")[] = ["ALL", "HIGH", "MEDIUM", "LOW"];

const relevanceColor: Record<Relevance, string> = {
  HIGH: "text-red-400 border-red-500/30 bg-red-500/5",
  MEDIUM: "text-amber-400 border-amber-500/30 bg-amber-500/5",
  LOW: "text-neutral-400 border-neutral-700 bg-neutral-800/30",
};

type TimelineKind = "case" | "alert" | "upload";

interface TimelineEvent {
  id: string;
  type: TimelineKind;
  title: string;
  detail: string;
  timestamp: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  sourceName?: string;
}

const fallbackTimeline: TimelineEvent[] = [
  {
    id: "case-created",
    type: "case",
    title: "Case created",
    detail: "Investigation intake was logged and assigned for analysis.",
    timestamp: "2026-04-12T09:45:00.000Z",
    severity: "LOW",
  },
  {
    id: "doc-upload-1",
    type: "upload",
    title: "Document uploaded",
    detail: "FIR_Report_01.pdf was added to the case evidence repository.",
    timestamp: "2026-04-20T14:12:00.000Z",
    sourceName: "FIR_Report_01.pdf",
  },
  {
    id: "doc-upload-2",
    type: "upload",
    title: "Data file imported",
    detail: "Financial_Record.xlsx was uploaded for transaction correlation analysis.",
    timestamp: "2026-04-22T10:40:00.000Z",
    sourceName: "Financial_Record.xlsx",
  },
  {
    id: "alert-1",
    type: "alert",
    title: "Alert triggered",
    detail: "Repeated communication pattern was flagged across a high-risk connection set.",
    timestamp: "2026-04-22T12:10:00.000Z",
    severity: "HIGH",
  },
];

function formatTimelineDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function CaseEntitiesPage() {
  const router = useRouter();
  const { caseCode } = useParams<{ caseCode: string }>();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<EntityType | "ALL">("ALL");
  const [relevanceFilter, setRelevanceFilter] = useState<Relevance | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState(sampleEntities[0]?.id ?? "");
  const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null);
  const [previewSource, setPreviewSource] = useState<SourceRef | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>(fallbackTimeline);
  const [sources, setSources] = useState<Source[]>([]);

  useEffect(() => {
    let mounted = true;

    async function fetchTimeline() {
      try {
        const { data: caseRow, error: caseError } = await supabase
          .from("cases")
          .select("id, created_at")
          .eq("case_code", caseCode)
          .maybeSingle();

        if (caseError) throw caseError;
        if (!caseRow) {
          if (mounted) {
            setTimeline(fallbackTimeline);
            setSources([]);
          }
          return;
        }

        const [alertsRes, sourcesRes] = await Promise.all([
          supabase
            .from("alerts")
            .select("*")
            .eq("case_id", caseRow.id)
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("sources")
            .select("*")
            .eq("case_id", caseRow.id)
            .order("uploaded_at", { ascending: false })
            .limit(10),
        ]);

        if (alertsRes.error && !["42P01", "42703"].includes(alertsRes.error.code ?? "")) {
          throw alertsRes.error;
        }

        if (sourcesRes.error && !["42P01", "42703"].includes(sourcesRes.error.code ?? "")) {
          throw sourcesRes.error;
        }

        const events: TimelineEvent[] = [];

        events.push({
          id: `case-${caseRow.id}`,
          type: "case",
          title: "Case created",
          detail: `Investigation ${caseCode} was registered in the system.`,
          timestamp: caseRow.created_at ?? new Date().toISOString(),
          severity: "LOW",
        });

        for (const alert of alertsRes.data ?? []) {
          events.push({
            id: `alert-${alert.id}`,
            type: "alert",
            title: alert.title ?? "Alert triggered",
            detail: alert.description ?? "A new investigation alert was generated.",
            timestamp: alert.created_at ?? new Date().toISOString(),
            severity: (alert.severity as TimelineEvent["severity"]) ?? "MEDIUM",
          });
        }

        for (const source of sourcesRes.data ?? []) {
          events.push({
            id: `source-${source.id}`,
            type: "upload",
            title: "Document uploaded",
            detail: `${source.file_name ?? "Source file"} was uploaded to the case repository.`,
            timestamp: source.uploaded_at ?? new Date().toISOString(),
            sourceName: source.file_name ?? undefined,
          });
        }

        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (mounted) {
          setTimeline(events.length > 0 ? events : fallbackTimeline);
          setSources((sourcesRes.data ?? []) as Source[]);
        }
      } catch {
        if (mounted) {
          setTimeline(fallbackTimeline);
          setSources([]);
        }
      }
    }

    void fetchTimeline();
    return () => {
      mounted = false;
    };
  }, [caseCode]);

  const filtered = useMemo(() => {
    return sampleEntities
      .filter((e) => {
        const matchesSearch = !search.trim() || e.name.toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === "ALL" || e.type === typeFilter;
        const matchesRelevance = relevanceFilter === "ALL" || e.relevance === relevanceFilter;
        return matchesSearch && matchesType && matchesRelevance;
      })
      .sort((a, b) => {
        const byRelevance = relevanceRank[a.relevance] - relevanceRank[b.relevance];
        if (byRelevance !== 0) return byRelevance;
        return b.mentionCount - a.mentionCount;
      });
  }, [search, typeFilter, relevanceFilter]);

  const selected = sampleEntities.find((e) => e.id === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (filtered.length === 0) return;
    if (!filtered.some((e) => e.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    const row = listRef.current?.querySelector(`[data-entity-id="${CSS.escape(selectedId)}"]`);
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (previewSource || filtered.length === 0) return;

      const currentIndex = filtered.findIndex((e) => e.id === selectedId);
      if (currentIndex < 0) return;

      if (event.key === "ArrowDown" || event.key === "j") {
        event.preventDefault();
        const next = filtered[Math.min(filtered.length - 1, currentIndex + 1)];
        if (next) setSelectedId(next.id);
      }
      if (event.key === "ArrowUp" || event.key === "k") {
        event.preventDefault();
        const prev = filtered[Math.max(0, currentIndex - 1)];
        if (prev) setSelectedId(prev.id);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, selectedId, previewSource]);

  return (
    <main className="bg-[#080808] text-neutral-200 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden">
      <div className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col px-6 pt-12 pb-6 md:px-10 lg:min-h-0">
        {/* header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">ALL ENTITIES</h1>
          <p className="mt-2 text-xs text-neutral-500">
            {sampleEntities.length} entities identified across{" "}
            {new Set(sampleEntities.flatMap((e) => e.sourceRefs.map((s) => s.name))).size} sources
          </p>
        </div>

        {/* search + filters */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex min-w-[240px] flex-1 items-center gap-2 border border-neutral-800 bg-[#0b0b0b] px-3.5 py-2.5">
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

          <SelectField
            value={typeFilter}
            onChange={(value) => setTypeFilter(value as EntityType | "ALL")}
            options={typeFilters.map((t) => ({ value: t, label: t === "ALL" ? "All Types" : t.replace("_", " ") }))}
            widthClass="min-w-[150px]"
          />

          <SelectField
            value={relevanceFilter}
            onChange={(value) => setRelevanceFilter(value as Relevance | "ALL")}
            options={relevanceFilters.map((r) => ({ value: r, label: r === "ALL" ? "Relevance: All" : `Relevance: ${r}` }))}
            widthClass="min-w-[160px]"
          />
        </div>

        <section className="mt-6 border border-neutral-800 bg-[#111] p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[11px] font-semibold tracking-[0.16em] text-white">CASE TIMELINE</h3>
            <span className="text-[10px] text-neutral-500">Activity log</span>
          </div>

          <div className="mt-5 space-y-5">
            {timeline.map((event) => {
              const isAlert = event.type === "alert";
              const isUpload = event.type === "upload";
              const dotColor = isAlert ? "bg-red-500" : isUpload ? "bg-cyan-400" : "bg-amber-400";

              return (
                <div key={event.id} className="relative pl-8">
                  <div className={`absolute left-0 top-1.5 h-3 w-3 rounded-full ${dotColor}`} />
                  <div className="border-b border-neutral-800 pb-4 last:border-b-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-[9px] tracking-[0.18em] text-neutral-500 uppercase">
                        {event.type === "case" ? "CASE" : isAlert ? "ALERT" : "UPLOAD"}
                      </span>
                      <span className="text-[10px] text-neutral-600">{formatTimelineDate(event.timestamp)}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">{event.title}</div>
                    <p className="mt-1 text-sm leading-relaxed text-neutral-300">{event.detail}</p>
                    {event.sourceName && (
                      <div className="mt-2 text-[10px] tracking-wide text-neutral-500">
                        Related source: {event.sourceName}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6 border border-neutral-800 bg-[#111] p-5 md:p-6">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-5">
            <h2 className="text-sm font-semibold tracking-[0.14em] text-white">UPLOADED SOURCES</h2>
            <span className="text-[10px] tracking-widest text-neutral-500">{sources.length} FILES</span>
          </div>
          <div className="mt-5">
            <SourcePreviewGrid sources={sources} />
          </div>
        </section>

        {/* master-detail layout */}
        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.7fr)]">
          {/* LEFT: entity list */}
          <div className="flex min-h-0 flex-col border border-neutral-800 bg-[#0d0d0d] lg:overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-3 py-2.5">
              <span className="text-[10px] tracking-[0.16em] text-neutral-500">ENTITIES</span>
              <span className="font-mono text-[10px] text-neutral-400">
                {filtered.length === sampleEntities.length
                  ? `${filtered.length} SHOWN`
                  : `${filtered.length} OF ${sampleEntities.length}`}
                <span className="ml-2 text-neutral-600">↑↓</span>
              </span>
            </div>
            <div ref={listRef} className="max-h-[420px] overflow-y-auto lg:max-h-none lg:flex-1">
              {filtered.length === 0 ? (
                <div className="px-5 py-10 text-center text-xs text-neutral-500">No entities match your filters.</div>
              ) : (
                filtered.map((e) => (
                  <button
                    key={e.id}
                    data-entity-id={e.id}
                    aria-current={selected?.id === e.id ? "true" : undefined}
                    onClick={() => setSelectedId(e.id)}
                    className={`w-full border-b border-neutral-800 px-3 py-3.5 text-left transition-colors last:border-0 hover:bg-[#131313] ${
                      selected?.id === e.id ? "bg-[#160c0c] border-l-2 border-l-red-500 pl-[10px]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <EntityTypeMark type={e.type} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-sm font-semibold text-white">{e.name}</div>
                          <span className={`shrink-0 text-[9px] tracking-wide ${relevanceColor[e.relevance].split(" ")[0]}`}>
                            {e.relevance}
                          </span>
                        </div>
                        <div className="mt-0.5 truncate text-[10px] text-neutral-500">
                          {e.type.replace("_", " ")} · {e.sourceCount} src · {e.mentionCount} mentions
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* RIGHT: sticky header + section tabs */}
          {selected ? (
            <div className="flex min-h-0 flex-col border border-neutral-800 bg-[#111] lg:overflow-hidden">
              <section className="shrink-0 border-b border-neutral-800 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <EntityTypeMark type={selected.type} size="lg" />
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selected.name}</h2>
                      <div className="mt-1 text-[10px] tracking-widest text-neutral-500">{selected.type.replace("_", " ")}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className={`border px-2.5 py-1 text-[9px] tracking-widest ${relevanceColor[selected.relevance]}`}>
                      {selected.relevance} RELEVANCE
                    </span>
                    <span className="border border-cyan-500/30 bg-cyan-500/5 px-2.5 py-1 text-[9px] tracking-widest text-cyan-300">
                      AI IDENTIFIED
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <MiniMetric label="CONFIDENCE" value={`${selected.confidence}%`} />
                  <MiniMetric label="SOURCES" value={String(selected.sourceCount)} />
                  <MiniMetric label="MENTIONS" value={String(selected.mentionCount)} />
                </div>
              </section>

              <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-neutral-800 px-3" role="tablist" aria-label="Entity sections">
                {CASE_SECTIONS.map((item) => {
                  const active = section === item.id;
                  return (
                    <button
                      key={item.id}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setCaseSection(item.id)}
                      className={`whitespace-nowrap px-3 py-3 text-[10px] tracking-[0.14em] transition-colors ${
                        active
                          ? "border-b-2 border-red-500 text-red-300"
                          : "border-b-2 border-transparent text-neutral-500 hover:text-neutral-200"
                      }`}
                    >
                      {item.label.toUpperCase()}
                    </button>
                  );
                })}
              </div>

              <div id={section} className="min-h-0 flex-1 overflow-y-auto p-5" role="tabpanel">
                {section === "ai-insight" && (
                  <div className="flex h-full min-h-[200px] flex-col border border-cyan-500/20 bg-[#0d1315] p-6">
                    <h3 className="text-[11px] font-semibold tracking-[0.16em] text-cyan-300">AI INSIGHT</h3>
                    <p className="mt-4 max-w-2xl text-[15px] leading-7 text-neutral-200">{selected.aiInsight}</p>
                    <button
                      onClick={() => setCaseSection("connections")}
                      className="mt-auto self-start pt-8 text-[10px] tracking-[0.14em] text-neutral-500 hover:text-red-300"
                    >
                      REVIEW CONNECTIONS →
                    </button>
                  </div>
                )}

                {section === "connections" && (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-[11px] font-semibold tracking-[0.16em] text-white">CONNECTIONS</h3>
                      <button
                        onClick={() => router.push(`/cases/${caseCode}/network?entity=${selected.id}`)}
                        className="text-[10px] tracking-widest text-red-400 hover:text-red-300"
                      >
                        VIEW IN NETWORK →
                      </button>
                    </div>
                    <div className="space-y-3">
                      {selected.connections.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            const target = sampleEntities.find((e) => e.name === c.name);
                            if (target) setSelectedId(target.id);
                          }}
                          className="flex w-full items-center justify-between border border-neutral-800 bg-[#0d0d0d] px-4 py-3 text-left hover:border-neutral-600"
                        >
                          <div className="flex items-center gap-3">
                            <EntityTypeMark type={c.type} size="sm" />
                            <div>
                              <div className="text-sm text-white">{c.name}</div>
                              <div className="text-[10px] text-neutral-500">{c.relationship} · {c.type.replace("_", " ")}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-[9px] tracking-wide ${relevanceColor[c.relevance].split(" ")[0]}`}>{c.relevance}</div>
                            <div className="mt-0.5 text-[9px] text-neutral-600">{c.sources} source{c.sources !== 1 ? "s" : ""}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {section === "source-references" && (
                  <div className="space-y-3">
                    {selected.sourceRefs.map((s, i) => (
                      <div key={i} className="flex items-center justify-between border border-neutral-800 bg-[#0d0d0d] px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-base">{s.icon}</span>
                          <div>
                            <div className="text-sm text-white">{s.name}</div>
                            <div className="text-[10px] text-neutral-500">{s.meta}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => setPreviewSource(s)}
                          className="whitespace-nowrap text-[10px] tracking-widest text-red-400 hover:text-red-300"
                        >
                          VIEW SOURCE →
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {section === "supporting-evidence" && (
                  <div className="space-y-3">
                    {selected.evidence.map((ev, i) => {
                      const key = `${selected.id}-${i}`;
                      const expanded = expandedEvidence === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setExpandedEvidence(expanded ? null : key)}
                          className="w-full border border-neutral-800 bg-[#0d0d0d] px-4 py-3 text-left hover:border-neutral-600"
                        >
                          <div className="text-[10px] tracking-widest text-neutral-500">{ev.source}</div>
                          <p className={`mt-2 text-sm text-neutral-200 ${expanded ? "" : "line-clamp-2"}`}>
                            &quot;{ev.snippet}&quot;
                          </p>
                          {ev.meta && <div className="mt-2 text-[9px] text-neutral-600">{ev.meta}</div>}
                        </button>
                      );
                    })}
                  </div>
                )}

                {section === "entity-metadata" && (
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <MetaRow label="First detected" value={selected.firstDetected} />
                    <MetaRow label="Last detected" value={selected.lastDetected} />
                    <MetaRow
                      label="Verification"
                      value={selected.verification}
                      highlight={selected.verification === "VERIFIED" ? "text-emerald-400" : "text-amber-400"}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center border border-neutral-800 bg-[#0d0d0d] text-center text-sm text-neutral-500">
              Select an entity to view its intelligence profile.
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.push(`/cases/${caseCode}/timeline`)}
            className="border border-neutral-800 px-4 py-2 text-[10px] tracking-widest text-neutral-400 hover:border-red-500/60 hover:text-red-300"
          >
            VIEW TIMELINE →
          </button>
          <button
            onClick={() => router.push(`/cases/${caseCode}/evidence`)}
            className="border border-neutral-800 px-4 py-2 text-[10px] tracking-widest text-neutral-400 hover:border-red-500/60 hover:text-red-300"
          >
            VIEW EVIDENCE →
          </button>
        </div>
      </div>

      {previewSource && <SourcePreviewDrawer source={previewSource} onClose={() => setPreviewSource(null)} />}
    </main>
  );
}

function SelectField({
  value,
  onChange,
  options,
  widthClass,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  widthClass: string;
}) {
  return (
    <div className={`relative shrink-0 ${widthClass}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none border border-neutral-700 bg-[#111] py-2.5 pl-3 pr-10 text-xs text-white outline-none [color-scheme:dark]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-white"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
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

function SourcePreviewDrawer({ source, onClose }: { source: SourceRef; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-neutral-800 bg-[#0b0b0b] p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
          <div>
            <div className="text-[10px] tracking-[0.16em] text-cyan-300">SOURCE PREVIEW</div>
            <div className="mt-1 text-lg font-semibold text-white">{source.name}</div>
            <div className="mt-1 text-[10px] text-neutral-500">{source.type} · Added {source.addedDate}</div>
          </div>
          <button onClick={onClose} className="text-[11px] tracking-widest text-neutral-400 hover:text-red-400 whitespace-nowrap">
            ✕ CLOSE
          </button>
        </div>

        <div className="mt-5 flex-1">
          <SourcePreviewBody source={source} />
        </div>
      </div>
    </div>
  );
}

function SourcePreviewBody({ source }: { source: SourceRef }) {
  switch (source.type) {
    case "PDF":
    case "DOCX":
      return (
        <div>
          <div className="border border-neutral-800 bg-[#111] p-5">
            <div className="text-[10px] tracking-widest text-neutral-500">PAGE {source.pageNumber ?? "—"}</div>
            <div className="mt-3 max-h-64 overflow-y-auto rounded-sm bg-[#0d0d0d] p-4 text-sm leading-relaxed text-neutral-300">
              {source.highlightText ? (
                <p>
                  ... <mark className="bg-amber-500/20 text-amber-200 px-1">{source.highlightText}</mark> ...
                </p>
              ) : (
                <p className="text-neutral-500">No preview text available.</p>
              )}
            </div>
          </div>
          <p className="mt-3 text-[10px] text-neutral-600">Highlighted region reflects the AI-detected reference for this entity.</p>
        </div>
      );

    case "CSV":
    case "XLSX":
      return (
        <div>
          {source.sheetName && (
            <div className="mb-2 text-[10px] tracking-widest text-neutral-500">SHEET: {source.sheetName}</div>
          )}
          <div className="overflow-x-auto border border-neutral-800">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-800 bg-[#111]">
                  {(source.tableHeaders ?? []).map((h, i) => (
                    <th key={i} className="px-3 py-2 text-[10px] tracking-widest text-neutral-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(source.tableRows ?? []).map((row, ri) => (
                  <tr key={ri} className={`border-b border-neutral-900 ${ri === source.highlightRowIndex ? "bg-amber-500/10" : ""}`}>
                    {row.map((cell, ci) => {
                      const isHighlightCell = source.highlightCellIndices?.some(([r, c]) => r === ri && c === ci);
                      return (
                        <td key={ci} className={`px-3 py-2 text-neutral-300 ${isHighlightCell ? "bg-amber-500/20 text-amber-200" : ""}`}>
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case "IMAGE":
      return (
        <div>
          <div className="relative border border-neutral-800 bg-[#111]">
            {source.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={source.imageUrl} alt={source.name} className="w-full object-cover" />
            ) : (
              <div className="flex h-64 items-center justify-center text-xs text-neutral-600">Image preview unavailable</div>
            )}
            {source.boundingBox && (
              <div
                className="absolute border-2 border-red-500"
                style={{
                  left: `${source.boundingBox.x}%`,
                  top: `${source.boundingBox.y}%`,
                  width: `${source.boundingBox.width}%`,
                  height: `${source.boundingBox.height}%`,
                }}
              />
            )}
          </div>
          <p className="mt-3 text-[10px] text-neutral-600">Red box marks the AI-detected region, if available.</p>
        </div>
      );

    case "TEXT": {
      const content = source.noteContent ?? "";
      const parts = source.highlightText ? content.split(source.highlightText) : [content];
      return (
        <div className="border border-neutral-800 bg-[#111] p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
            {parts.map((part, i) => (
              <span key={i}>
                {part}
                {i < parts.length - 1 && source.highlightText && (
                  <mark className="bg-amber-500/20 text-amber-200 px-1">{source.highlightText}</mark>
                )}
              </span>
            ))}
          </p>
        </div>
      );
    }

    case "URL":
      return (
        <div className="border border-neutral-800 bg-[#111] p-4">
          <div className="text-sm font-semibold text-white">{source.urlTitle ?? source.name}</div>
          <div className="mt-1 text-[10px] text-neutral-500">{source.urlDomain}</div>
          <p className="mt-3 text-sm leading-relaxed text-neutral-300">{source.urlSnippet}</p>
          {source.sourceUrl && (
            <a
              href={source.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-[10px] tracking-widest text-red-400 hover:text-red-300"
            >
              OPEN SOURCE ↗
            </a>
          )}
        </div>
      );

    default:
      return <div className="text-xs text-neutral-500">No preview available for this source type.</div>;
  }
}