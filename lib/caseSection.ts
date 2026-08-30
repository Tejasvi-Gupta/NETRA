export const CASE_SECTION_EVENT = "netra:case-section";

export const CASE_SECTIONS = [
  { id: "ai-insight", label: "AI Insight" },
  { id: "connections", label: "Connections" },
  { id: "source-references", label: "Source References" },
  { id: "supporting-evidence", label: "Evidence" },
  { id: "entity-metadata", label: "Metadata" },
] as const;

export type CaseSectionId = (typeof CASE_SECTIONS)[number]["id"];

export function isCaseSection(id: string): id is CaseSectionId {
  return CASE_SECTIONS.some((section) => section.id === id);
}

export function setCaseSection(id: CaseSectionId | "") {
  const url = id
    ? `${window.location.pathname}${window.location.search}#${id}`
    : `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new CustomEvent(CASE_SECTION_EVENT, { detail: id }));
}

export function subscribeCaseSection(onSection: (id: string) => void) {
  const onCustom = (event: Event) => {
    onSection((event as CustomEvent<string>).detail ?? "");
  };
  const onHash = () => onSection(window.location.hash.replace("#", ""));

  window.addEventListener(CASE_SECTION_EVENT, onCustom);
  window.addEventListener("hashchange", onHash);
  return () => {
    window.removeEventListener(CASE_SECTION_EVENT, onCustom);
    window.removeEventListener("hashchange", onHash);
  };
}
