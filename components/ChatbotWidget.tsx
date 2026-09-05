"use client";

import { useState, useRef, useEffect } from "react";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", sender: "assistant", text: "Workspace chatbot. Ask about any case, entity, or investigation pattern." },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  function handleSend() {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), sender: "user", text: input.trim() };
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: crypto.randomUUID(), sender: "assistant", text: "Chatbot analysis engine is not yet connected. This response is a placeholder." },
    ]);
    setInput("");
  }

  return (
    <div className="fixed inset-x-4 bottom-6 z-50 flex max-w-full flex-col items-end font-mono print:hidden sm:inset-x-auto sm:right-6">
      {open && (
        <div className="relative mb-3 flex h-[440px] max-h-[calc(100dvh-8rem)] w-full max-w-[340px] flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0c0c0e]/70 shadow-[0_24px_64px_rgba(0,0,0,0.55),0_0_36px_rgba(239,68,68,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/12 via-red-500/[0.06] to-transparent" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-red-500/15 blur-3xl" />

          <div className="relative flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                <span className="text-[11px] font-bold tracking-[0.15em] text-white">NETRA CHATBOT</span>
              </div>
              <p className="mt-1 pl-4 text-[10px] tracking-wide text-neutral-500">Workspace · all cases</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-white/10 hover:text-red-300"
              aria-label="Close chatbot"
            >
              ✕
            </button>
          </div>

          <div ref={scrollRef} className="relative flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${
                    m.sender === "user"
                      ? "rounded-br-md border border-red-400/25 bg-gradient-to-b from-red-500/25 to-red-500/10 text-red-50"
                      : "rounded-bl-md border border-white/10 bg-white/[0.06] text-neutral-200"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div className="relative border-t border-white/10 p-3">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask the chatbot…"
                className="min-w-0 flex-1 bg-transparent text-[12px] text-neutral-200 outline-none placeholder:text-neutral-500"
              />
              <button
                onClick={handleSend}
                className="rounded-full bg-gradient-to-b from-red-500 to-red-600 px-3 py-1 text-[11px] font-bold tracking-wide text-white shadow-[0_4px_12px_rgba(239,68,68,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] hover:from-red-400 hover:to-red-500"
              >
                SEND
              </button>
            </div>
          </div>
        </div>
      )}

      {!open && (
        <span className="mb-2 rounded-full border border-white/10 bg-black/50 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.14em] text-red-300/90">
          CHATBOT
        </span>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chatbot" : "Open chatbot"}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-gradient-to-b from-[#2a1212] to-[#0a0a0a] text-red-300 shadow-[0_10px_28px_rgba(0,0,0,0.45),0_0_24px_rgba(239,68,68,0.28),inset_0_1px_0_rgba(255,255,255,0.2)] transition-transform hover:scale-105 hover:text-red-200"
      >
        {open ? (
          <span className="text-lg">✕</span>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}