// components/SourcePreviewGrid.tsx
"use client";

import { useState } from "react";
import type { Source } from "@/types/netra";

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "JUST NOW";
  if (minutes < 60) return `${minutes} MIN AGO`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} HR AGO`;
  return `${Math.floor(minutes / 1440)} D AGO`;
}

function isImage(fileName: string) {
  return /\.(jpe?g|png|gif|webp)$/i.test(fileName);
}

const categoryIcon: Record<string, string> = {
  DOCUMENTS: "📄",
  CSV_EXCEL: "📊",
  IMAGES: "🖼️",
  TEXT_NOTES: "📝",
  URL_SOURCES: "🔗",
};

export default function SourcePreviewGrid({ sources }: { sources: Source[] }) {
  const [previewSource, setPreviewSource] = useState<Source | null>(null);

  if (sources.length === 0) {
    return (
      <div className="py-9 text-center text-sm text-neutral-500">
        No sources uploaded yet for this case.
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {sources.map((s) => {
          const image = isImage(s.file_name) && s.file_url;
          return (
            <button
              key={s.id}
              onClick={() => setPreviewSource(s)}
              className="group border border-neutral-800 bg-[#0d0d0d] text-left hover:border-red-500/50 transition-colors"
            >
              <div className="flex h-28 items-center justify-center border-b border-neutral-800 bg-[#0a0a0a] overflow-hidden">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.file_url!} alt={s.file_name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl opacity-70">{categoryIcon[s.file_category] ?? "📁"}</span>
                )}
              </div>
              <div className="p-3">
                <div className="truncate text-xs font-medium text-neutral-100">{s.file_name}</div>
                <div className="mt-1.5 flex items-center justify-between text-[9px] tracking-wide text-neutral-600">
                  <span>{formatSize(s.file_size)}</span>
                  <span>{relativeTime(s.uploaded_at)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {previewSource && (
        <SourcePreviewModal source={previewSource} onClose={() => setPreviewSource(null)} />
      )}
    </>
  );
}

function SourcePreviewModal({ source, onClose }: { source: Source; onClose: () => void }) {
  const image = isImage(source.file_name) && source.file_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl border border-neutral-800 bg-[#0d0d0d]"
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-white">{source.file_name}</div>
            <div className="mt-1 text-[10px] tracking-wide text-neutral-500">
              {source.file_category.replace("_", " ")} · {formatSize(source.file_size)} · {relativeTime(source.uploaded_at)}
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white text-lg leading-none">
            ✕
          </button>
        </div>

        <div className="p-5">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={source.file_url!} alt={source.file_name} className="max-h-[60vh] w-full object-contain bg-[#0a0a0a]" />
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <span className="text-5xl opacity-70">{categoryIcon[source.file_category] ?? "📁"}</span>
              <p className="text-xs text-neutral-500">
                Preview is not available for this file type in-browser.
              </p>
              {source.file_url && (
                <a
                  href={source.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-red-500/60 px-5 py-2 text-[11px] tracking-widest text-red-300 hover:bg-red-600 hover:text-white"
                >
                  OPEN SOURCE ↗
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}