export function preferExtractedList<T = unknown>(live: unknown, cached: unknown): T[] {
  const liveList = Array.isArray(live) ? live : null;
  const cachedList = Array.isArray(cached) ? cached : null;
  if (liveList && liveList.length > 0) return liveList as T[];
  if (cachedList && cachedList.length > 0) return cachedList as T[];
  return (liveList || cachedList || []) as T[];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function personRecord(raw: unknown) {
  const item = asRecord(raw);
  return asRecord(item.person || raw);
}

export function personName(raw: unknown): string {
  const person = personRecord(raw);
  const identity = asRecord(person.identity);
  return text(identity.name, person.name, person.canonical_name);
}

export function personId(raw: unknown): string {
  const item = asRecord(raw);
  const person = personRecord(raw);
  return text(person.person_id, person.id, item.person_id, item.id);
}

export function relationEndKey(relation: unknown, side: "source" | "target"): string {
  const rel = asRecord(relation);
  const named = side === "source" ? rel.source : rel.target;
  if (typeof named === "string" && named.trim()) return named.trim();
  const ref = side === "source" ? rel.from : rel.to;
  if (typeof ref === "string") return ref.trim();
  const rec = asRecord(ref);
  return text(rec.id, rec.label, rec.name);
}

export function resolveEntityLabel(ref: string, people: unknown[]): string {
  if (!ref) return "";
  const needle = ref.trim().toLowerCase();
  for (const raw of people) {
    const id = personId(raw).toLowerCase();
    const name = personName(raw);
    if (id && id === needle) return name || ref;
    if (name && name.toLowerCase() === needle) return name;
  }
  return ref;
}

export function incidentWhen(incident: unknown, fallback = "Incident"): string {
  const inc = asRecord(incident);
  const time = asRecord(inc.time);
  const raw = text(time.start, inc.timestamp);
  if (!raw) return fallback;
  if (!time.start && inc.timestamp) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }
  return raw;
}

export function displayCaseStatus(
  netraStatus?: string | null,
  firStatus?: string | null
): "ACTIVE" | "UNDER_REVIEW" | "CLOSED" {
  const fir = String(firStatus || "").toUpperCase();
  const netra = String(netraStatus || "").toUpperCase();
  if (fir === "CLOSED" || netra === "CLOSED") return "CLOSED";
  if (netra === "UNDER_REVIEW") return "UNDER_REVIEW";
  return "ACTIVE";
}

export function caseStatusLabel(netraStatus?: string | null, firStatus?: string | null): string {
  const status = displayCaseStatus(netraStatus, firStatus);
  if (status === "CLOSED") return "Closed";
  if (status === "UNDER_REVIEW") return "Under review";
  return "Active";
}

export function isCaseClosed(netraStatus?: string | null, firStatus?: string | null) {
  return displayCaseStatus(netraStatus, firStatus) === "CLOSED";
}
