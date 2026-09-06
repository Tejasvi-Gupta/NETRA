"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  aiCaseId: string;
  audience: "admin" | "investigator";
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
}

const DEFAULT_WIDTH = 420;
const MIN_WIDTH = 360;

function maxDrawerWidth() {
  if (typeof window === "undefined") return 960;
  return Math.min(window.innerWidth - 24, 960);
}

export default function CaseChatDrawer({ aiCaseId, audience, isOpen, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    if (!isOpen || !aiCaseId) return;
    setMessages([]);

    async function loadHistory() {
      setFetchingHistory(true);
      try {
        const res = await fetch(`/api/ai/chat/history?case_id=${aiCaseId}&audience=${audience}`);
        const data = await res.json();
        const historyArray = Array.isArray(data.messages)
          ? data.messages
          : Array.isArray(data)
            ? data
            : data.history || [];

        if (Array.isArray(historyArray) && historyArray.length > 0) {
          setMessages(
            historyArray
              .map((item: Record<string, unknown> | string) => {
                if (typeof item === "string") {
                  return { id: crypto.randomUUID(), role: "user" as const, content: item };
                }
                const content = String(item.content || item.message || item.text || "").trim();
                if (!content) return null;
                return {
                  id: crypto.randomUUID(),
                  role: item.role === "assistant" || item.role === "ai" ? "ai" as const : "user" as const,
                  content,
                };
              })
              .filter((item): item is ChatMessage => Boolean(item))
          );
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      } finally {
        setFetchingHistory(false);
      }
    }

    loadHistory();
  }, [isOpen, aiCaseId, audience]);

  useEffect(() => {
    if (isOpen) {
      document.body.dataset.caseCopilot = "open";
      inputRef.current?.focus();
    } else {
      delete document.body.dataset.caseCopilot;
    }
    window.dispatchEvent(new CustomEvent("netra-case-copilot", { detail: { open: isOpen } }));
    return () => {
      delete document.body.dataset.caseCopilot;
      window.dispatchEvent(new CustomEvent("netra-case-copilot", { detail: { open: false } }));
    };
  }, [isOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, isOpen]);

  useEffect(() => {
    if (isOpen) setWidth(Math.min(DEFAULT_WIDTH, maxDrawerWidth()));
  }, [isOpen]);

  const beginResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragRef.current = { startX: event.clientX, startWidth: width };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const next = dragRef.current.startWidth + (dragRef.current.startX - event.clientX);
    setWidth(Math.min(maxDrawerWidth(), Math.max(MIN_WIDTH, next)));
  };

  const endResize = () => {
    dragRef.current = null;
  };

  if (!isOpen) return null;

  const isAdmin = audience === "admin";
  const accent = isAdmin
    ? {
        bar: "from-red-600 via-red-500 to-orange-600",
        border: "border-red-500/20",
        label: "text-red-400",
        handle: "hover:bg-red-500/50",
        close: "hover:text-red-300",
        empty: "border-red-500/15 bg-red-500/[0.04]",
        user: "border-red-500/25 bg-red-500/10 text-red-50",
        input: "border-red-500/20",
        send: "bg-red-600 hover:bg-red-500",
      }
    : {
        bar: "from-orange-500 via-amber-400 to-orange-600",
        border: "border-orange-500/20",
        label: "text-orange-400",
        handle: "hover:bg-orange-500/50",
        close: "hover:text-orange-300",
        empty: "border-orange-500/15 bg-orange-500/[0.04]",
        user: "border-orange-500/25 bg-orange-500/10 text-orange-50",
        input: "border-orange-500/20",
        send: "bg-orange-600 hover:bg-orange-500",
      };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: userText }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_case_id: aiCaseId, message: userText, audience }),
      });

      const data = await res.json();
      const aiReply =
        data.response ||
        data.reply ||
        data.answer ||
        data.message ||
        "No response received from Netra Ai.";
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "ai", content: aiReply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "ai", content: "Could not reach Netra Ai. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ width }}
      className={`fixed inset-y-0 right-0 z-[60] flex flex-col border-l bg-[#0a0a0c]/95 font-[ui-sans-serif,system-ui,-apple-system,"Segoe_UI",sans-serif] print:hidden shadow-[-24px_0_64px_rgba(0,0,0,0.45)] ${accent.border}`}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize Netra Ai"
        onPointerDown={beginResize}
        onPointerMove={onResize}
        onPointerUp={endResize}
        onPointerCancel={endResize}
        className={`absolute inset-y-0 left-0 z-10 w-1.5 cursor-ew-resize touch-none bg-transparent ${accent.handle}`}
      />
      <div className={`h-1 w-full bg-gradient-to-r ${accent.bar}`} />

      <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <p className={`text-[11px] font-medium tracking-[0.16em] ${accent.label}`}>Netra Ai</p>
            <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-neutral-400">
              {isAdmin ? "Admin" : "Investigator"}
            </span>
          </div>
          <h3 className="mt-1 text-[16px] font-semibold tracking-tight text-white">This case only</h3>
          <p className="mt-1 text-[12px] leading-5 text-neutral-500">
            Uses evidence, people, and links from the open case.
          </p>
        </div>
        <button
          onClick={onClose}
          className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-white/5 ${accent.close}`}
          aria-label="Close Netra Ai"
        >
          ✕
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
        {fetchingHistory ? (
          <p className="mt-10 text-center text-[13px] text-neutral-500">Loading case memory…</p>
        ) : messages.length === 0 ? (
          <div className={`rounded-lg border px-4 py-3 text-[13px] leading-6 text-neutral-300 ${accent.empty}`}>
            Ask about people, the timeline, transactions, or links in this case.
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[88%] whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-[13px] leading-6 ${
                  m.role === "user" ? accent.user : "border border-white/10 bg-white/[0.04] text-neutral-200"
                }`}
              >
                <span className="mb-1 block text-[10px] uppercase tracking-[0.12em] text-neutral-500">
                  {m.role === "user" ? "You" : "Netra Ai"}
                </span>
                {m.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[13px] text-neutral-400">
            Reviewing this case…
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="border-t border-white/10 bg-black/20 p-4">
        <div className={`flex items-center gap-2 rounded-lg border bg-black/40 px-3 py-2 ${accent.input}`}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this case…"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-neutral-200 outline-none placeholder:text-neutral-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className={`case-btn h-8 px-3 text-white disabled:opacity-40 ${accent.send}`}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
