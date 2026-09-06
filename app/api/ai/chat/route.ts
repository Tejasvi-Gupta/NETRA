import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import CaseChat from "@/models/caseChat";
import { normalizeChatAudience } from "@/lib/caseChat";

export async function POST(request: Request) {
  try {
    const { ai_case_id, message, audience: rawAudience } = await request.json();
    const audience = normalizeChatAudience(rawAudience);

    if (!ai_case_id || !message || !audience) {
      return NextResponse.json({ error: "Missing case ID, message, or audience" }, { status: 400 });
    }

    const res = await fetch(
      `https://fir-intelligence-api.onrender.com/api/v1/cases/${ai_case_id}/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      }
    );

    const data = await res.json();
    const reply =
      data.response ||
      data.reply ||
      data.answer ||
      data.message ||
      (res.ok ? "No response received from Netra Ai." : data.error || "Netra Ai could not answer.");

    const turns = [
      { id: crypto.randomUUID(), role: "user" as const, content: String(message).trim() },
      { id: crypto.randomUUID(), role: "ai" as const, content: String(reply).trim() },
    ];

    try {
      await connectDB();
      await CaseChat.findOneAndUpdate(
        { ai_case_id, audience },
        { $push: { messages: { $each: turns } } },
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error("Failed to persist isolated chat thread:", error);
    }

    return NextResponse.json({ ...data, response: turns[1].content }, { status: res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
