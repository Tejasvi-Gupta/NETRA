import { NextResponse } from "next/server";
import { getCaseTimeline } from "@/lib/aiApi";

export async function GET(request: Request) {
  const caseId = new URL(request.url).searchParams.get("case_id");
  if (!caseId) {
    return NextResponse.json({ success: false, error: "Missing case_id" }, { status: 400 });
  }

  const result = await getCaseTimeline(caseId);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status || 502 }
    );
  }

  const payload = result.data as unknown;
  const events = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { events?: unknown }).events)
      ? (payload as { events: unknown[] }).events
      : [];
  return NextResponse.json({ success: true, events });
}
