"use client";

import { useState } from "react";

interface Props {
  aiCaseId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CaseChatDrawer({ aiCaseId, isOpen, onClose }: Props) {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_case_id: aiCaseId, message: userText }),
      });

      const data = await res.json();
      const aiReply = data.response || data.reply || data.answer || "No response received from agent.";
      setMessages((prev) => [...prev, { role: "ai", content: aiReply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "ai", content: "Failed to connect to AI engine." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col shadow-2xl">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
        <h3 className="font-semibold text-orange-500 text-sm">CASE AI COPILOT</h3>
        <button onClick={onClose} className="text-zinc-400 hover:text-white text-xs px-2 py-1">
          ✕ CLOSE
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
        {messages.length === 0 ? (
          <p className="text-zinc-500 text-center mt-8">
            Ask questions about suspects, timeline, transactions, or cross-evidence links.
          </p>
        ) : (
          messages.map((m, idx) => (
            <div
              key={idx}
              className={`p-3 rounded ${
                m.role === "user"
                  ? "bg-orange-500/10 border border-orange-500/20 text-orange-200 ml-6"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-300 mr-6"
              }`}
            >
              <span className="text-[10px] block opacity-50 mb-1">{m.role === "user" ? "INVESTIGATOR" : "AI"}</span>
              {m.content}
            </div>
          ))
        )}
        {loading && <div className="text-zinc-500 text-xs italic">Analyzing evidence...</div>}
      </div>

      <form onSubmit={sendMessage} className="p-3 border-t border-zinc-800 flex gap-2 bg-zinc-900">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask case copilot..."
          className="flex-1 bg-zinc-950 border border-zinc-700 px-3 py-1.5 text-xs rounded text-white outline-none focus:border-orange-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 text-xs font-bold rounded"
        >
          SEND
        </button>
      </form>
    </div>
  );
}