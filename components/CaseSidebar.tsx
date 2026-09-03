"use client";

import { useMemo } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { CASE_SECTIONS, isCaseSection, setCaseSection } from "@/lib/caseSection";

type NavItem = {
  id: string;
  label: string;
  href: (caseCode: string, analysisPath: string) => string;
  match: "exact" | "prefix" | "hash";
};

const MODULE_ITEMS: NavItem[] = [
  {
    id: "entities",
    label: "Entities",
    href: (caseCode) => `/cases/${caseCode}`,
    match: "exact",
  },
  {
    id: "network",
    label: "Network",
    href: (caseCode) => `/cases/${caseCode}/network`,
    match: "prefix",
  },
];

const ENTITY_ITEMS: NavItem[] = CASE_SECTIONS.map((section) => ({
  id: section.id,
  label: section.label,
  href: (_caseCode, analysisPath) => `${analysisPath}#${section.id}`,
  match: "hash" as const,
}));

function analysisPathFor(pathname: string, caseCode: string) {
  if (pathname.startsWith(`/cases/${caseCode}/entities`)) {
    return `/cases/${caseCode}/entities`;
  }
  return `/cases/${caseCode}`;
}

export default function CaseSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { caseCode } = useParams<{ caseCode: string }>();

  const analysisPath = analysisPathFor(pathname, caseCode);
  const onAnalysisPage =
    pathname === `/cases/${caseCode}` || pathname === `/cases/${caseCode}/entities`;

  const activeHash = useMemo(() => {
    if (!onAnalysisPage || typeof window === "undefined") {
      return "";
    }

    const hash = window.location.hash.replace("#", "");
    return isCaseSection(hash) ? hash : "";
  }, [onAnalysisPage]);

  function goTo(item: NavItem) {
    const href = item.href(caseCode, analysisPath);
    const [path, hash] = href.split("#");

    if (item.match === "hash" && pathname === path && hash && isCaseSection(hash)) {
      setCaseSection(hash);
      return;
    }

    if (item.match === "exact" && onAnalysisPage) {
      setCaseSection("");
      return;
    }

    router.push(href);
  }

  function isActive(item: NavItem) {
    if (item.match === "prefix") {
      return pathname.startsWith(item.href(caseCode, analysisPath));
    }
    if (item.match === "exact") {
      return onAnalysisPage;
    }
    const currentSection = activeHash || (onAnalysisPage ? "ai-insight" : "");
    return onAnalysisPage && currentSection === item.id;
  }

  function renderItems(items: NavItem[]) {
    return items.map((item) => {
      const active = isActive(item);
      return (
        <button
          key={item.id}
          onClick={() => goTo(item)}
          className={`whitespace-nowrap rounded-sm border px-3 py-2.5 text-left text-[11px] tracking-[0.12em] transition-colors lg:w-full ${
            active
              ? "border-red-500/40 bg-red-500/10 text-red-300"
              : "border-neutral-800 bg-transparent text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
          }`}
        >
          {item.label.toUpperCase()}
        </button>
      );
    });
  }

  return (
    <aside className="shrink-0 border-b border-neutral-800 bg-[#0a0a0a] lg:sticky lg:top-0 lg:h-screen lg:w-[228px] lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col px-4 pt-12 pb-5 lg:px-5">
        <div className="flex flex-wrap items-center gap-x-2 text-[10px] tracking-[0.16em] text-neutral-500">
          <button onClick={() => router.push("/dashboard")} className="hover:text-red-400">
            ← Intelligence Workspace
          </button>
          <span className="text-neutral-700">/</span>
          <button onClick={() => router.push("/cases")} className="hover:text-red-400">
            ALL CASES
          </button>
        </div>

        <div className="mt-10 hidden lg:block">
          <div className="text-[9px] tracking-[0.22em] text-neutral-600">CASE</div>
          <div className="mt-2 truncate font-mono text-[12px] text-red-400">{caseCode}</div>
        </div>

        <nav className="mt-10 flex min-h-0 flex-1 flex-col gap-9 overflow-x-auto lg:overflow-y-auto lg:overflow-x-visible" aria-label="Case navigation">
          <div>
            <div className="text-[9px] tracking-[0.22em] text-neutral-600">CASE MODULES</div>
            <div className="mt-4 flex gap-2.5 lg:flex-col">{renderItems(MODULE_ITEMS)}</div>
          </div>

          <div className={onAnalysisPage ? "" : "opacity-60"}>
            <div className="text-[9px] tracking-[0.22em] text-neutral-600">ON THIS ENTITY</div>
            <div className="mt-4 flex gap-2.5 lg:flex-col">{renderItems(ENTITY_ITEMS)}</div>
          </div>
        </nav>
      </div>
    </aside>
  );
}
