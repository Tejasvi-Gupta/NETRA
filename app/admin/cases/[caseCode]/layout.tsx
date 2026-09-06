import { Suspense, type ReactNode } from "react";
import CaseSidebar from "@/components/CaseSidebar";

export default function AdminCaseLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <CaseSidebar />
      </Suspense>
      {children}
    </>
  );
}
