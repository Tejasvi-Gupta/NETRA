"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatInvestigator } from "@/lib/auth";

const CASE_TABS = [
  { id: "sources", label: "Evidence" },
  { id: "persons", label: "People" },
  { id: "unknowns", label: "Unknown identities" },
  { id: "incidents", label: "Incidents" },
  { id: "relations", label: "Relationships" },
  { id: "graph", label: "Network" },
] as const;

interface CaseDetails {
  case_code?: string;
  title?: string;
  case_type?: string;
  priority?: string;
  status?: string;
  assigned_investigator?: string;
}

function humanize(value?: string | null, fallback = "—") {
  if (!value) return fallback;
  return value.replace(/[_-]+/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CaseSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { caseCode } = useParams<{ caseCode: string }>();
  const [workspaceHref, setWorkspaceHref] = useState("/investigator/dashboard");
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<CaseDetails | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("netra_role");
    setWorkspaceHref(role === "admin" ? "/admin/dashboard" : "/investigator/dashboard");
  }, []);

  useEffect(() => {
    if (!caseCode) return;
    let cancelled = false;

    async function loadCase() {
      try {
        const res = await fetch(`/api/cases/${caseCode}`);
        const data = await res.json();
        if (!cancelled && data.success && data.case) {
          setDetails(data.case);
        }
      } catch {
        if (!cancelled) setDetails(null);
      }
    }

    void loadCase();
    return () => {
      cancelled = true;
    };
  }, [caseCode]);

  const caseHome = `/cases/${caseCode}`;
  const addFilesHref = `${caseHome}/add`;
  const onCaseHome = pathname === caseHome;
  const onAddFiles = pathname === addFilesHref;
  const activeTab = searchParams.get("tab") || "sources";

  function goToTab(tabId: string) {
    const next = tabId === "sources" ? caseHome : `${caseHome}?tab=${tabId}`;
    router.push(next);
  }

  return (
    <div
      className={`fixed inset-y-0 left-0 z-40 ${open ? "w-[260px]" : "w-3"}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div
        className={`h-full w-[260px] overflow-hidden border-r border-white/10 bg-[#050505]/95 backdrop-blur-md transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <aside className="flex h-full flex-col px-4 py-8 lg:px-5">
          <button
            onClick={() => router.push(workspaceHref)}
            className="text-left text-[13px] text-neutral-400 hover:text-white"
          >
            ← Intelligence Workspace
          </button>

          <div className="mt-6 border-b border-white/10 pb-5">
            <div className="text-[12px] text-neutral-500">Case</div>
            <div className="mt-1 truncate text-[14px] font-medium text-red-400">
              {details?.case_code || caseCode}
            </div>
            {details?.title && (
              <div className="mt-1 line-clamp-2 text-[13px] leading-5 text-neutral-200">
                {details.title}
              </div>
            )}
          </div>

          <nav className="mt-5 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto" aria-label="Case sections">
            {CASE_TABS.map((item) => {
              const active = onCaseHome && activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => goToTab(item.id)}
                  className={`whitespace-nowrap rounded-lg border px-3 py-2.5 text-left text-[13px] transition-colors ${
                    active
                      ? "border-red-500/40 bg-red-500/10 text-red-200"
                      : "border-transparent text-neutral-400 hover:border-white/10 hover:text-neutral-200"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            <button
              onClick={() => router.push(addFilesHref)}
              className={`mt-3 whitespace-nowrap rounded-lg border px-3 py-2.5 text-left text-[13px] transition-colors ${
                onAddFiles
                  ? "border-orange-500/40 bg-orange-500/10 text-orange-200"
                  : "border-transparent text-neutral-400 hover:border-white/10 hover:text-neutral-200"
              }`}
            >
              Add files
            </button>
          </nav>

          <div className="mt-6 space-y-4 border-t border-white/10 pt-6">
            <div>
              <div className="text-[12px] text-neutral-500">Investigator</div>
              <div className="mt-1 text-[13px] leading-5 text-white">
                {formatInvestigator(details?.assigned_investigator)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[12px] text-neutral-500">Status</div>
                <div className="mt-1 text-[13px] text-neutral-200">{humanize(details?.status)}</div>
              </div>
              <div>
                <div className="text-[12px] text-neutral-500">Priority</div>
                <div className="mt-1 text-[13px] text-neutral-200">{humanize(details?.priority)}</div>
              </div>
            </div>

            <div>
              <div className="text-[12px] text-neutral-500">Type</div>
              <div className="mt-1 text-[13px] text-neutral-200">{humanize(details?.case_type)}</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
