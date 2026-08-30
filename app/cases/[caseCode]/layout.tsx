import CaseSidebar from "@/components/CaseSidebar";

export default function CaseLayout({ children }: LayoutProps<"/cases/[caseCode]">) {
  return (
    <div className="flex min-h-screen flex-col bg-[#080808] text-neutral-200 lg:flex-row">
      <CaseSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
