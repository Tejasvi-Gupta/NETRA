export const RELATIONSHIP_TYPES = [
  "CONTACTED",
  "PAID",
  "INTRODUCED_TO",
  "WORKED_WITH",
  "ASSOCIATED_WITH",
  "TRANSFERRED_TO",
  "COLLABORATOR",
  "SEEN_WITH",
] as const;

const RELATIONSHIP_TYPE_COPY: Record<(typeof RELATIONSHIP_TYPES)[number], { label: string; phrase: string }> = {
  CONTACTED: { label: "Contacted", phrase: "contacted" },
  PAID: { label: "Paid", phrase: "paid" },
  INTRODUCED_TO: { label: "Introduced to", phrase: "introduced" },
  WORKED_WITH: { label: "Worked with", phrase: "worked with" },
  ASSOCIATED_WITH: { label: "Associated with", phrase: "is associated with" },
  TRANSFERRED_TO: { label: "Transferred to", phrase: "transferred to" },
  COLLABORATOR: { label: "Collaborated with", phrase: "collaborated with" },
  SEEN_WITH: { label: "Seen with", phrase: "was seen with" },
};

function fallbackTypeLabel(type: string) {
  return type.replace(/[_-]+/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function relationshipTypeLabel(type?: string | null) {
  if (!type) return "Linked";
  const known = RELATIONSHIP_TYPE_COPY[type as (typeof RELATIONSHIP_TYPES)[number]];
  return known?.label ?? fallbackTypeLabel(type);
}

export function relationshipPhrase(type?: string | null) {
  if (!type) return "is linked to";
  const known = RELATIONSHIP_TYPE_COPY[type as (typeof RELATIONSHIP_TYPES)[number]];
  return known?.phrase ?? fallbackTypeLabel(type).toLowerCase();
}

export function formatRelationship(source: string, type: string | null | undefined, target: string) {
  return `${source} ${relationshipPhrase(type)} ${target}`;
}

export function relationshipErrorMessage(status: number, error?: string) {
  const detail = (error || "").trim();
  if (status === 404) {
    if (/source/i.test(detail)) return detail;
    if (/target/i.test(detail)) return detail;
    if (/case/i.test(detail)) return detail || "This case was not found on the FIR API.";
    return detail || "That person or entity was not found in this case.";
  }
  if (status === 422) {
    return detail || "Source, target, type, and evidence are all required.";
  }
  return detail || "Could not save that connection.";
}
