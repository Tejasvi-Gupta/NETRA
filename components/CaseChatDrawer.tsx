"use client";

import { useState, useEffect } from "react";

interface Props {
  aiCaseId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CaseChatDrawer({ aiCaseId, isOpen, onClose }: Props) {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);

  // Load chat history whenever drawer opens
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
      const aiReply =
        data.response ||
        data.reply ||
        data.answer ||
        data.message ||
        "No response received from agent.";
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
        {fetchingHistory ? (
          <p className="text-zinc-500 text-center mt-8 italic">Loading case memory...</p>
        ) : messages.length === 0 ? (
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
                  : "bg-zinc-900 border border-zinc-800 text-zinc-300 mr-6 whitespace-pre-wrap"
              }`}
            >
              <span className="text-[10px] block opacity-50 mb-1">
                {m.role === "user" ? "INVESTIGATOR" : "AI"}
              </span>
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
          className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 text-xs font-bold rounded disabled:opacity-50"
        >
          SEND
        </button>
      </form>
    </div>
  );
}