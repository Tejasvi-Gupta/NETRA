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
    { id: "welcome", sender: "assistant", text: "NETRA Copilot online. Ask about cases, entities, or investigation patterns." },
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
      { id: crypto.randomUUID(), sender: "assistant", text: "Copilot analysis engine is not yet connected. This response is a placeholder." },
    ]);
    setInput("");
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 font-mono">
      {open && (
        <div className="mb-3 flex h-[440px] w-[340px] flex-col border border-red-500/25 bg-[#0a0a0a] shadow-[0_0_40px_rgba(239,68,68,0.15)]">
          <div className="flex items-center justify-between border-b border-red-500/20 bg-red-500/[0.04] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold tracking-[0.15em] text-white">NETRA COPILOT</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-neutral-500 hover:text-red-400 text-sm">✕</button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 text-[12px] leading-relaxed ${
                    m.sender === "user"
                      ? "bg-red-500/10 border border-red-500/25 text-red-100"
                      : "bg-white/[0.03] border border-white/10 text-neutral-300"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-red-500/20 p-3">
            <div className="flex items-center gap-2 border border-neutral-800 bg-[#050505] px-3 py-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask NETRA Copilot…"
                className="flex-1 bg-transparent text-[12px] text-neutral-200 outline-none placeholder:text-neutral-600"
              />
              <button onClick={handleSend} className="text-red-400 hover:text-red-300 text-[11px] font-bold tracking-wide">
                SEND
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-red-500/40 bg-[#0a0a0a] text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.25)] transition-transform hover:scale-105 hover:border-red-500 hover:text-red-300"
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