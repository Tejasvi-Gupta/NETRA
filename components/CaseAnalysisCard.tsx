"use client";

import { useMemo, useState } from "react";
import type { InvestigationAnalysis } from "@/lib/aiApi";

function FindingList({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <span className="text-[11px] text-neutral-500">{title}</span>
      <ul className="mt-1 list-disc space-y-1 pl-4 text-[13px] leading-5 text-neutral-300">
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function sameText(left?: string | null, right?: string | null) {
  return (left || "").trim().toLowerCase() === (right || "").trim().toLowerCase();
}

function coveredBySummary(item?: string | null, summary?: string | null) {
  const text = (item || "").trim().toLowerCase();
  const hay = (summary || "").trim().toLowerCase();
  if (!text || !hay) return false;
  if (text === hay) return true;
  return hay.includes(text) || (text.length > 40 && text.includes(hay));
}

export default function CaseAnalysisCard({
  result,
  caseSummary,
  onClose,
}: {
  result: InvestigationAnalysis;
  caseSummary?: string | null;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const showSummary = Boolean(result.summary) && !sameText(result.summary, caseSummary);
  const uniqueFindings = (result.key_findings || []).filter((item) => !coveredBySummary(item, caseSummary));
  const uniqueRelations = (result.relationship_findings || []).filter((item) => !coveredBySummary(item, caseSummary));
  const recommendations = result.investigation_recommendations || [];
  const gaps = result.evidence_gaps || [];
  const hasStructured =
    showSummary ||
    uniqueFindings.length > 0 ||
    (result.unresolved_identities && result.unresolved_identities.length > 0) ||
    uniqueRelations.length > 0 ||
    gaps.length > 0 ||
    recommendations.length > 0;

  const preview = useMemo(() => {
    const parts: string[] = [];
    if (uniqueFindings.length) parts.push(`${uniqueFindings.length} finding${uniqueFindings.length === 1 ? "" : "s"}`);
    if (gaps.length) parts.push(`${gaps.length} evidence gap${gaps.length === 1 ? "" : "s"}`);
    if (recommendations.length) parts.push(`${recommendations.length} recommendation${recommendations.length === 1 ? "" : "s"}`);
    if (uniqueRelations.length) parts.push(`${uniqueRelations.length} link${uniqueRelations.length === 1 ? "" : "s"}`);
    return parts.join(" · ") || "Analysis is ready";
  }, [gaps.length, recommendations.length, uniqueFindings.length, uniqueRelations.length]);

  return (
    <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-white">Analysis results</div>
          {!open && <p className="mt-0.5 truncate text-[12px] text-neutral-500">{preview}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="text-[12px] text-neutral-300 hover:text-white"
          >
            {open ? "Hide details" : "View details"}
          </button>
          <button type="button" onClick={onClose} className="text-[12px] text-neutral-500 hover:text-white">
            Close
          </button>
        </div>
      </div>

      {open && (
        <div className="max-h-[32vh] space-y-3 overflow-y-auto border-t border-white/10 px-4 py-3 text-[13px] text-neutral-300">
          {showSummary && (
            <div>
              <span className="text-[11px] text-neutral-500">Summary</span>
              <p className="mt-1 leading-5 text-neutral-200">{result.summary}</p>
            </div>
          )}

          <FindingList title="Key findings" items={uniqueFindings} />
          <FindingList title="Unresolved identities" items={result.unresolved_identities} />
          <FindingList title="Relationship findings" items={uniqueRelations} />
          <FindingList title="Evidence gaps" items={gaps} />

          {recommendations.length > 0 && (
            <div>
              <span className="text-[11px] text-neutral-500">Recommendations</span>
              <div className="mt-1.5 space-y-2">
                {recommendations.map((item, index) => (
                  <div key={index} className="border-l border-white/15 pl-3">
                    <div className="text-[10px] tracking-[0.12em] text-neutral-500">
                      {(item.priority || "Recommendation").toUpperCase()}
                    </div>
                    <div className="mt-0.5 font-medium text-white">{item.recommendation}</div>
                    {item.reason && <p className="mt-0.5 leading-5 text-neutral-400">{item.reason}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasStructured && (
            <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-zinc-300">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
