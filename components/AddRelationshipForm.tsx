"use client";

import { useState } from "react";
import { recordFirActivity } from "@/lib/firActivity";
import {
  RELATIONSHIP_TYPES,
  formatRelationship,
  relationshipErrorMessage,
  relationshipTypeLabel,
} from "@/lib/relationships";

interface Props {
  caseCode: string;
  aiCaseId: string;
  names: string[];
  accent?: "orange" | "red";
  onSaved: () => Promise<void> | void;
  onCancel: () => void;
}

export default function AddRelationshipForm({
  caseCode,
  aiCaseId,
  names,
  accent = "orange",
  onSaved,
  onCancel,
}: Props) {
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [type, setType] = useState<(typeof RELATIONSHIP_TYPES)[number]>("CONTACTED");
  const [evidence, setEvidence] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isOrange = accent === "orange";
  const preview =
    source && target && source !== target
      ? formatRelationship(source, type, target)
      : "";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError("");

    if (!source || !target) {
      setError("Choose both people or entities.");
      return;
    }
    if (source === target) {
      setError("Pick two different people or entities.");
      return;
    }
    if (!evidence.trim()) {
      setError("Add the evidence that supports this connection.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/ai/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: aiCaseId,
          source,
          target,
          type,
          evidence: evidence.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(relationshipErrorMessage(res.status, data.error));
        return;
      }

      await recordFirActivity(aiCaseId, "RELATIONSHIP_CREATED");
      await fetch("/api/ai/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_code: caseCode, ai_case_id: aiCaseId }),
      });
      await onSaved();
    } catch {
      setError("Could not save that connection. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const fieldClass =
    "w-full rounded-md border border-zinc-700 bg-[#111113] px-3 py-2.5 text-[13px] leading-5 text-zinc-100 outline-none transition-colors focus:border-zinc-500";
  const labelClass = "mb-1.5 block text-[12px] font-medium text-zinc-400";

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 space-y-5 rounded-lg border border-zinc-800 bg-[#0c0c0e] p-5 font-sans"
    >
      <div>
        <h3 className="text-[15px] font-medium text-white">Record a connection</h3>
        <p className="mt-1 text-[13px] leading-5 text-zinc-500">
          Link two people or entities from this case, and note what evidence supports it.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-[13px] text-red-200" role="alert">
          {error}
        </p>
      ) : null}

      {names.length === 0 ? (
        <p className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-[13px] text-zinc-400">
          People and entities will appear here after they are extracted from the case files.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <div>
          <label htmlFor="relationship-from" className={labelClass}>
            Who
          </label>
          <select
            id="relationship-from"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className={fieldClass}
            required
          >
            <option value="">Select a person or entity</option>
            {names.map((name) => (
              <option key={`from-${name}`} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="lg:min-w-[200px]">
          <label htmlFor="relationship-type" className={labelClass}>
            How they are linked
          </label>
          <select
            id="relationship-type"
            value={type}
            onChange={(event) => setType(event.target.value as (typeof RELATIONSHIP_TYPES)[number])}
            className={fieldClass}
            required
          >
            {RELATIONSHIP_TYPES.map((value) => (
              <option key={value} value={value}>
                {relationshipTypeLabel(value)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="relationship-to" className={labelClass}>
            Connected to
          </label>
          <select
            id="relationship-to"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            className={fieldClass}
            required
          >
            <option value="">Select a person or entity</option>
            {names.map((name) => (
              <option key={`to-${name}`} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {preview ? (
        <p className="rounded-md border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-[13px] leading-6 text-zinc-300">
          <span className="mr-2 text-[11px] uppercase tracking-wide text-zinc-500">Preview</span>
          {preview}
        </p>
      ) : null}

      <div>
        <label htmlFor="relationship-evidence" className={labelClass}>
          Evidence
        </label>
        <textarea
          id="relationship-evidence"
          value={evidence}
          onChange={(event) => setEvidence(event.target.value)}
          placeholder="What supports this link? For example: FIR page 3 notes 14 calls between 1:00 AM and 3:00 AM."
          className={`${fieldClass} min-h-[88px] resize-y leading-6`}
          required
        />
        <p className="mt-1.5 text-[12px] leading-5 text-zinc-500">
          Cite a file, call record, statement, or other source so this can be reviewed later.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting || names.length === 0}
          className={`case-btn ${isOrange ? "case-btn-primary" : "case-btn-primary-admin"}`}
        >
          {submitting ? "Saving…" : "Save connection"}
        </button>
        <button type="button" onClick={onCancel} className="case-btn case-btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}
