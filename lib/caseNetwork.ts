import { personName, relationEndKey, resolveEntityLabel } from "@/lib/extractedCase";

export interface CaseNetworkNode {
  id: string;
  label: string;
  type: string;
}

export interface CaseNetworkEdge {
  source: string;
  target: string;
  type?: string;
  evidence?: string;
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function buildCaseNetwork(input: {
  persons?: unknown[];
  unknowns?: unknown[];
  entities?: unknown[];
  relationships?: unknown[];
}) {
  const nodes = new Map<string, CaseNetworkNode>();
  const edges: CaseNetworkEdge[] = [];
  const people = input.persons || [];

  const addNode = (id: string, type: string, label = id) => {
    if (!id || nodes.has(id)) return;
    nodes.set(id, { id, label, type });
  };

  for (const raw of people) {
    const name = personName(raw);
    if (name) addNode(name, "PERSON", name);
  }

  for (const raw of input.unknowns || []) {
    const unknown = asRecord(raw);
    const name = firstText(unknown.label, unknown.alias, unknown.identifier);
    if (name) addNode(name, "UNKNOWN", name);
  }

  for (const raw of input.entities || []) {
    const entity = asRecord(raw);
    const name = firstText(entity.label, entity.name, entity.value, entity.text);
    if (name) addNode(name, firstText(entity.type) || "ENTITY", name);
  }

  for (const raw of input.relationships || []) {
    const relation = asRecord(raw);
    const source = resolveEntityLabel(relationEndKey(raw, "source"), people);
    const target = resolveEntityLabel(relationEndKey(raw, "target"), people);
    if (source) addNode(source, nodes.get(source)?.type || "NODE", source);
    if (target) addNode(target, nodes.get(target)?.type || "NODE", target);
    if (source && target) {
      edges.push({
        source,
        target,
        type: firstText(relation.type) || undefined,
        evidence: firstText(relation.evidence) || undefined,
      });
    }
  }

  return { nodes: Array.from(nodes.values()), edges };
}
