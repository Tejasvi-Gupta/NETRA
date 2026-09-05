"use client";

import { useEffect } from "react";

export interface PreviewSource {
  type: string;
  title: string;
  content: string;
  uploaded_at?: string;
}

function humanize(value?: string | null, fallback = "File") {
  if (!value) return fallback;
  return value.replace(/[_-]+/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function cleanFileName(title: string) {
  return title.replace(/(\.[A-Za-z0-9]{2,8})\1+$/i, "$1");
}

function fileExtension(title: string) {
  const match = cleanFileName(title).match(/\.([A-Za-z0-9]{2,8})$/);
  return match ? match[1].toUpperCase() : null;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function estimateDataUrlSize(content: string) {
  if (!content.startsWith("data:")) return null;
  const comma = content.indexOf(",");
  if (comma < 0) return null;
  const payload = content.slice(comma + 1);
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
}

function formatAddedAt(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isImageSource(source: PreviewSource) {
  return source.type === "IMAGE" || source.content.startsWith("data:image/");
}

function isPdfSource(source: PreviewSource) {
  const name = cleanFileName(source.title).toLowerCase();
  return name.endsWith(".pdf") || source.content.startsWith("data:application/pdf");
}

function isTextSource(source: PreviewSource) {
  return source.type === "NOTES" || source.type === "URL";
}

export default function SourcePreviewModal({
  source,
  onClose,
}: {
  source: PreviewSource;
  onClose: () => void;
}) {
  const title = cleanFileName(source.title);
  const ext = fileExtension(source.title);
  const size = estimateDataUrlSize(source.content);
  const addedAt = formatAddedAt(source.uploaded_at);
  const canDownload = source.content.startsWith("data:");
  const image = isImageSource(source);
  const pdf = isPdfSource(source);
  const text = isTextSource(source);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="source-preview-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#0c0c0e] shadow-[0_24px_64px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[11px] text-orange-300">
                {humanize(source.type)}
              </span>
              {ext && (
                <span className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-neutral-400">
                  {ext}
                </span>
              )}
            </div>
            <h3 id="source-preview-title" className="mt-2 truncate text-[16px] font-semibold tracking-tight text-white">
              {title}
            </h3>
            <p className="mt-1 text-[12px] text-neutral-500">
              {[size ? formatBytes(size) : null, addedAt ? `Added ${addedAt}` : null]
                .filter(Boolean)
                .join(" · ") || "Attached to this case"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Close preview"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden bg-[#080808]">
          {image && (
            <div className="flex h-full min-h-[320px] items-center justify-center p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={source.content} alt={title} className="max-h-[58vh] max-w-full object-contain" />
            </div>
          )}

          {!image && pdf && canDownload && (
            <iframe title={title} src={source.content} className="h-[58vh] w-full border-0 bg-white" />
          )}

          {!image && !pdf && text && (
            <div className="h-[58vh] overflow-y-auto px-6 py-5">
              {source.type === "URL" ? (
                <a
                  href={source.content}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-[13px] text-orange-300 hover:underline"
                >
                  {source.content}
                </a>
              ) : (
                <p className="whitespace-pre-wrap text-[13px] leading-7 text-neutral-300">{source.content}</p>
              )}
            </div>
          )}

          {!image && !pdf && !text && (
            <div className="flex h-[320px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-orange-300">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <p className="text-[14px] font-medium text-white">{title}</p>
              <p className="mt-1 max-w-sm text-[13px] leading-6 text-neutral-500">
                This file type cannot be previewed here. Download it to review the full contents.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3">
          <p className="text-[12px] text-neutral-500">Evidence file</p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="h-9 rounded-lg border border-white/10 px-3 text-[13px] text-neutral-300 hover:border-white/20 hover:text-white"
            >
              Close
            </button>
            {canDownload && (
              <a
                href={source.content}
                download={title}
                className="inline-flex h-9 items-center rounded-lg border border-orange-600/50 bg-orange-950/40 px-3 text-[13px] font-medium text-orange-200 hover:border-orange-400/60 hover:text-white"
              >
                Download
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
