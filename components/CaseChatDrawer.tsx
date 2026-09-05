"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  aiCaseId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
}

export default function CaseChatDrawer({ aiCaseId, isOpen, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !aiCaseId) return;

    async function loadHistory() {
      setFetchingHistory(true);
      try {
        const res = await fetch(`/api/ai/chat/history?case_id=${aiCaseId}`);
        if (!res.ok) return;
        const data = await res.json();

        const historyArray = Array.isArray(data) ? data : data.messages || data.history || [];

        if (Array.isArray(historyArray) && historyArray.length > 0) {
          setMessages(
            historyArray.map((item: Record<string, unknown>) => ({
              id: crypto.randomUUID(),
              role: item.role === "assistant" || item.role === "ai" ? "ai" : "user",
              content: (item.content || item.message || item.text || "") as string,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      } finally {
        setFetchingHistory(false);
      }
    }

    loadHistory();
  }, [isOpen, aiCaseId]);

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

  if (!isOpen) return null;

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
        body: JSON.stringify({ ai_case_id: aiCaseId, message: userText }),
      });

      const data = await res.json();
      const aiReply =
        data.response ||
        data.reply ||
        data.answer ||
        data.message ||
        "No response received from the copilot.";
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "ai", content: aiReply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "ai", content: "Could not reach the case copilot. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-[420px] flex-col border-l border-orange-500/20 bg-[#0a0a0c]/95 print:hidden shadow-[-24px_0_64px_rgba(0,0,0,0.45)]">
      <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600" />

      <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-orange-400">Case copilot</p>
          <h3 className="mt-1 text-[16px] font-semibold tracking-tight text-white">This case only</h3>
          <p className="mt-1 text-[12px] leading-5 text-neutral-500">
            Uses evidence, people, and links from the open case.
          </p>
        </div>
        <button
          onClick={onClose}
          className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-white/5 hover:text-orange-300"
          aria-label="Close case copilot"
        >
          ✕
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
        {fetchingHistory ? (
          <p className="mt-10 text-center text-[13px] text-neutral-500">Loading case memory…</p>
        ) : messages.length === 0 ? (
          <div className="rounded-xl border border-orange-500/15 bg-orange-500/[0.04] px-4 py-3 text-[13px] leading-6 text-neutral-300">
            Ask about people, the timeline, transactions, or links in this case.
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[88%] whitespace-pre-wrap rounded-xl px-3.5 py-2.5 text-[13px] leading-6 ${
                  m.role === "user"
                    ? "border border-orange-500/25 bg-orange-500/10 text-orange-50"
                    : "border border-white/10 bg-white/[0.04] text-neutral-200"
                }`}
              >
                <span className="mb-1 block text-[10px] uppercase tracking-[0.12em] text-neutral-500">
                  {m.role === "user" ? "You" : "Copilot"}
                </span>
                {m.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[13px] italic text-neutral-400">
            Reviewing this case…
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="border-t border-white/10 bg-black/20 p-4">
        <div className="flex items-center gap-2 rounded-xl border border-orange-500/20 bg-black/40 px-3 py-2">
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
            className="h-8 rounded-lg bg-orange-600 px-3 text-[12px] font-medium text-white hover:bg-orange-500 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
