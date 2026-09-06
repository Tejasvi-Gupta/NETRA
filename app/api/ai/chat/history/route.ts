import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import CaseChat from "@/models/caseChat";
import { normalizeChatAudience } from "@/lib/caseChat";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const caseId = url.searchParams.get("case_id");
  const audience = normalizeChatAudience(url.searchParams.get("audience"));

  if (!caseId || !audience) {
    return NextResponse.json(
      { success: false, error: "Missing case_id or audience", messages: [] },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const thread = await CaseChat.findOne({ ai_case_id: caseId, audience }).lean();
    return NextResponse.json({
      success: true,
      messages: thread?.messages || [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load chat history";
    return NextResponse.json({ success: false, error: message, messages: [] }, { status: 500 });
  }
}
