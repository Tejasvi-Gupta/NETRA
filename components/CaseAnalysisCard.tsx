import type { InvestigationAnalysis } from "@/lib/aiApi";

function FindingList({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <span className="text-[12px] text-neutral-500">{title}</span>
      <ul className="mt-1 list-inside list-disc space-y-1 text-neutral-200">
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function CaseAnalysisCard({
  result,
  onClose,
}: {
  result: InvestigationAnalysis;
  onClose: () => void;
}) {
  const hasStructured =
    Boolean(result.summary) ||
    (result.key_findings && result.key_findings.length > 0) ||
    (result.unresolved_identities && result.unresolved_identities.length > 0) ||
    (result.relationship_findings && result.relationship_findings.length > 0) ||
    (result.evidence_gaps && result.evidence_gaps.length > 0) ||
    (result.investigation_recommendations && result.investigation_recommendations.length > 0);

  return (
    <div className="mb-8 rounded-lg border border-white/10 bg-white/[0.03] p-5 text-[13px] shadow-xl">
      <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
        <span className="text-[14px] font-medium text-white">Analysis results</span>
        <button onClick={onClose} className="text-[13px] text-neutral-400 hover:text-white">
          Close
        </button>
      </div>

      <div className="max-h-80 space-y-3 overflow-y-auto text-neutral-300">
        {result.summary && (
          <div>
            <span className="text-[12px] text-neutral-500">Summary</span>
            <p className="mt-1 leading-6 text-neutral-200">{result.summary}</p>
          </div>
        )}

        <FindingList title="Key findings" items={result.key_findings} />
        <FindingList title="Unresolved identities" items={result.unresolved_identities} />
        <FindingList title="Relationship findings" items={result.relationship_findings} />
        <FindingList title="Evidence gaps" items={result.evidence_gaps} />

        {result.investigation_recommendations && result.investigation_recommendations.length > 0 && (
          <div>
            <span className="text-[12px] text-neutral-500">Recommendations</span>
            <div className="mt-2 space-y-3">
              {result.investigation_recommendations.map((item, index) => (
                <div key={index} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                    {item.priority || "Recommendation"}
                  </div>
                  <div className="mt-1 font-medium text-white">{item.recommendation}</div>
                  {item.reason && <p className="mt-1 leading-6 text-neutral-400">{item.reason}</p>}
                  {item.evidence_basis && item.evidence_basis.length > 0 && (
                    <p className="mt-2 text-[12px] text-neutral-500">
                      Evidence: {item.evidence_basis.join(" · ")}
                    </p>
                  )}
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
    </div>
  );
}
