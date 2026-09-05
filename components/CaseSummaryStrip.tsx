import type { CaseSummary } from "@/lib/aiApi";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <div className="text-[11px] text-neutral-500">{label}</div>
      <div className="mt-1 text-[18px] font-medium text-white">{value}</div>
    </div>
  );
}

export default function CaseSummaryStrip({ summary }: { summary: CaseSummary }) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px] text-neutral-500">
        <span>FIR status: <span className="text-neutral-300">{summary.status}</span></span>
        {summary.police_station && (
          <span>· Station: <span className="text-neutral-300">{summary.police_station}</span></span>
        )}
        <span
          className={
            summary.analysis_available
              ? "rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-300"
              : "rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-neutral-400"
          }
        >
          {summary.analysis_available ? "Analysis saved" : "No analysis yet"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Documents" value={summary.document_count} />
        <Stat label="People" value={summary.person_count} />
        <Stat label="Unknowns" value={summary.unknown_identity_count} />
        <Stat label="Incidents" value={summary.incident_count} />
        <Stat label="Entities" value={summary.entity_count} />
        <Stat label="Relationships" value={summary.relationship_count} />
      </div>
    </div>
  );
}
