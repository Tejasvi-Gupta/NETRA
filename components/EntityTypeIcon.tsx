export type EntityIconType =
  | "PERSON"
  | "ORGANIZATION"
  | "LOCATION"
  | "PHONE"
  | "VEHICLE"
  | "BANK_ACCOUNT"
  | "TRANSACTION"
  | "OTHER";

const PATHS: Record<EntityIconType, string> = {
  PERSON:
    '<circle cx="12" cy="7.5" r="3.8"/><path d="M4.4 20c1.3-3.8 4-6 7.6-6s6.3 2.2 7.6 6"/>',
  ORGANIZATION:
    '<path d="M4 21V8.5L12 4l8 4.5V21"/><path d="M4 21h16"/><path d="M9 11h2M13 11h2M9 15h2M13 15h2"/><path d="M10.5 21v-3.5h3V21"/>',
  LOCATION:
    '<path d="M12 21s7.2-6.4 7.2-11.2A7.2 7.2 0 0 0 4.8 9.8C4.8 14.6 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.4"/>',
  PHONE:
    '<path d="M7.2 3.8c.5-.6 1.4-.7 2-.3l1.8 1.2c.6.4.8 1.1.5 1.8l-.9 2c2.6 2.4 4.6 4.4 7.2 7.1l2-.8c.7-.3 1.5 0 1.8.6l1.3 2c.4.7.2 1.6-.4 2.1-1.5 1.2-3.6 1.9-5.8 1.2C9.8 19.4 5 13.8 3.9 6.8c-.3-1.6.7-3 3.3-3z"/>',
  VEHICLE:
    '<path d="M4 14l1.8-4.4c.3-.8 1-1.3 1.8-1.3h8.8c.8 0 1.5.5 1.8 1.3L20.8 14"/><path d="M3.5 14h17v3.8H3.5z"/><circle cx="7.2" cy="17.8" r="1.5"/><circle cx="16.8" cy="17.8" r="1.5"/><path d="M8 8.3 9.2 6h5.6L16 8.3"/>',
  BANK_ACCOUNT:
    '<path d="M3 10.2h18"/><path d="M5.2 10.2V18M9.4 10.2V18M14.6 10.2V18M18.8 10.2V18"/><path d="M3 18h18"/><path d="M2.4 10.2 12 4.2l9.6 6"/><path d="M3 20.4h18"/>',
  TRANSACTION:
    '<rect x="2.5" y="6" width="19" height="12" rx="1.6"/><circle cx="12" cy="12" r="2.4"/><path d="M6 12h1.8M16.2 12H18"/>',
  OTHER:
    '<circle cx="11" cy="11" r="6.4"/><path d="M20.5 20.5 16 16"/>',
};

const TYPE_TONE: Record<EntityIconType, string> = {
  PERSON: "text-red-300 bg-red-500/10 border-red-500/25",
  ORGANIZATION: "text-purple-300 bg-purple-500/10 border-purple-500/25",
  LOCATION: "text-sky-300 bg-sky-500/10 border-sky-500/25",
  PHONE: "text-amber-300 bg-amber-500/10 border-amber-500/25",
  BANK_ACCOUNT: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
  VEHICLE: "text-orange-300 bg-orange-500/10 border-orange-500/25",
  TRANSACTION: "text-lime-300 bg-lime-500/10 border-lime-500/25",
  OTHER: "text-neutral-300 bg-neutral-800 border-neutral-700",
};

export const ENTITY_ICON_TYPES = Object.keys(PATHS) as EntityIconType[];

function resolveType(type: string): EntityIconType {
  return type in PATHS ? (type as EntityIconType) : "OTHER";
}

export function EntityTypeIcon({
  type,
  size = 20,
  className,
}: {
  type: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: PATHS[resolveType(type)] }}
    />
  );
}

export function EntityTypeMark({
  type,
  size = "md",
}: {
  type: string;
  size?: "sm" | "md" | "lg";
}) {
  const box = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-10 w-10" : "h-11 w-11";
  const icon = size === "lg" ? 28 : size === "sm" ? 20 : 22;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border ${box} ${TYPE_TONE[resolveType(type)]}`}
    >
      <EntityTypeIcon type={type} size={icon} />
    </span>
  );
}

export function entityTypeIconDataUri(type: string, color = "#fafafa") {
  const inner = PATHS[resolveType(type)];
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
  )}`;
}
