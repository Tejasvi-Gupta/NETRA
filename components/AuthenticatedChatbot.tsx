"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import ChatbotWidget from "@/components/ChatbotWidget";

export default function AuthenticatedChatbot() {
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);
  const [caseCopilotOpen, setCaseCopilotOpen] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("netra_role");
    const isPublic = pathname === "/" || pathname === "/login";
    setAllowed((role === "admin" || role === "investigator") && !isPublic);
  }, [pathname]);

  useEffect(() => {
    const onToggle = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setCaseCopilotOpen(Boolean(detail?.open));
    };

    setCaseCopilotOpen(document.body.dataset.caseCopilot === "open");
    window.addEventListener("netra-case-copilot", onToggle);
    return () => window.removeEventListener("netra-case-copilot", onToggle);
  }, []);

  if (!allowed || caseCopilotOpen) return null;
  return <ChatbotWidget />;
}
