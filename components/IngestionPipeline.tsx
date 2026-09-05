import { useEffect, useRef, useState } from "react";
import {
  currentStepHeadline,
  getPipelineView,
  jobStatusLabel,
  type FirIngestionJob,
} from "@/lib/workspaceCase";

export default function IngestionPipeline({
  steps,
  status,
  error,
  compact = false,
}: {
  steps?: unknown;
  status?: string;
  error?: unknown;
  compact?: boolean;
}) {
  const pipeline = getPipelineView(steps, status);
  const headline = currentStepHeadline(steps, status, error);

  return (
    <div>
      {!compact && (
        <div className="mb-4">
          <div className="text-[15px] font-medium text-white">{headline.title}</div>
          <p className="mt-1 text-[13px] leading-5 text-neutral-400">{headline.detail}</p>
        </div>
      )}

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {pipeline.steps.map((step, index) => {
          const isCurrent = step.state === "current";
          const isDone = step.state === "completed";
          const isFailed = step.state === "failed";

          return (
            <li
              key={step.key}
              className={`rounded-lg border px-3 py-2.5 ${
                isFailed
                  ? "border-red-500/40 bg-red-500/10"
                  : isCurrent
                    ? "border-orange-400/50 bg-orange-500/10"
                    : isDone
                      ? "border-emerald-500/25 bg-emerald-500/[0.06]"
                      : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-neutral-500">{index + 1}/6</span>
                {isCurrent && (
                  <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-orange-300">
                    Now
                  </span>
                )}
                {isDone && <span className="text-[10px] text-emerald-400">Done</span>}
                {isFailed && <span className="text-[10px] text-red-300">Failed</span>}
              </div>
              <div className={`mt-1 text-[13px] font-medium ${isCurrent || isFailed ? "text-white" : "text-neutral-200"}`}>
                {step.label}
              </div>
              <div className="mt-0.5 text-[11px] leading-4 text-neutral-500">
                {isCurrent ? step.hint : isDone ? "Finished" : isFailed ? "Stopped here" : "Waiting"}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function LiveIngestionJob({
  jobId,
  initial,
  onSettled,
}: {
  jobId?: string;
  initial?: FirIngestionJob | null;
  onSettled?: (status: "completed" | "failed") => void;
}) {
  const [job, setJob] = useState<FirIngestionJob>(initial || { job_id: jobId });
  const settledRef = useRef(false);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;
  const id = jobId || job.job_id || job.id;

  useEffect(() => {
    if (initial) setJob((prev) => ({ ...prev, ...initial }));
  }, [initial]);

  useEffect(() => {
    if (!id) return;
    let stop = false;

    async function tick() {
      try {
        const res = await fetch(`/api/ai/job/${id}`);
        const data = await res.json();
        if (stop) return;
        if (data.error && !data.status && !data.job_id) return;
        setJob((prev) => ({ ...prev, ...data }));
        const status = jobStatusLabel(data.status);
        if ((status === "completed" || status === "failed") && !settledRef.current) {
          settledRef.current = true;
          onSettledRef.current?.(status);
        }
      } catch (error) {
        console.error("Failed to poll ingestion job:", error);
      }
    }

    void tick();
    const interval = setInterval(tick, 3000);
    return () => {
      stop = true;
      clearInterval(interval);
    };
  }, [id]);

  if (!id && !job.steps) return null;

  return (
    <IngestionPipeline steps={job.steps} status={job.status} error={job.error} />
  );
}
