type EntityItem = {
  id?: string;
  entity_id?: string;
  type?: string;
  label?: string;
  name?: string;
  value?: string;
  normalized_value?: string;
  text?: string;
};

const TYPE_ORDER = ["Organization", "Location", "Account", "Contact", "Vehicle", "Person", "Other"];

function entityName(entity: EntityItem) {
  return (
    entity.label ||
    entity.name ||
    entity.value ||
    entity.normalized_value ||
    entity.text ||
    "Unnamed entity"
  ).trim();
}

function entityType(entity: EntityItem) {
  const raw = (entity.type || "").toLowerCase().replace(/[_-]+/g, " ");
  if (!raw) return "Other";
  if (/(locat|place|address|city|area)/.test(raw)) return "Location";
  if (/(org|compan|bank|institut|agency|cafe|shop)/.test(raw)) return "Organization";
  if (/(account|wallet|upi|card)/.test(raw)) return "Account";
  if (/(phone|contact|email)/.test(raw)) return "Contact";
  if (/vehicle/.test(raw)) return "Vehicle";
  if (/person/.test(raw)) return "Person";
  return raw.replace(/\b\w/g, (c) => c.toUpperCase());
}

function looksLikeAddress(name: string) {
  return (
    /\d{3,}/.test(name) ||
    /\b(road|rd\.?|street|st\.?|nagar|lane|platform|room|plot|sector|east|west)\b/i.test(name)
  );
}

function organizeEntities(entities: EntityItem[]) {
  const unique = new Map<string, { name: string; type: string }>();

  for (const entity of entities) {
    const name = entityName(entity);
    const type = entityType(entity);
    const key = name.toLowerCase().replace(/\s+/g, " ");
    const existing = unique.get(key);

    if (!existing) {
      unique.set(key, { name, type });
      continue;
    }

    if (existing.type === type) continue;
    if (looksLikeAddress(name)) unique.set(key, { name, type: "Location" });
    else if (existing.type === "Other") unique.set(key, { name, type });
    else if (type === "Organization" && existing.type === "Location" && !looksLikeAddress(name)) {
      unique.set(key, { name, type: "Organization" });
    }
  }

  const groups = new Map<string, string[]>();
  for (const item of unique.values()) {
    const list = groups.get(item.type) || [];
    list.push(item.name);
    groups.set(item.type, list);
  }

  return TYPE_ORDER.filter((type) => groups.has(type))
    .concat([...groups.keys()].filter((type) => !TYPE_ORDER.includes(type)).sort())
    .map((type) => ({
      type,
      items: (groups.get(type) || []).sort((a, b) => a.localeCompare(b)),
    }));
}

export default function CaseEntitiesPanel({ entities }: { entities: EntityItem[] }) {
  const groups = organizeEntities(entities);

  if (entities.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.01] p-8 text-center text-[13px] text-neutral-500">
        No entities have been extracted for this case yet.
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.type}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[11px] font-medium tracking-[0.16em] text-neutral-400">
              {group.type.toUpperCase()}
            </h3>
            <span className="text-[11px] tabular-nums text-neutral-600">{group.items.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {group.items.map((name) => (
              <div
                key={`${group.type}-${name}`}
                className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3.5"
              >
                <div className="text-[14px] font-medium leading-6 text-white">{name}</div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
