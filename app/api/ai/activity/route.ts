import { NextResponse } from "next/server";
import { recordCaseActivity } from "@/lib/aiApi";

export async function POST(request: Request) {
  try {
    const { case_id, action, actor } = await request.json();
    if (!case_id || !action || !actor) {
      return NextResponse.json(
        { success: false, error: "Case, action, and actor are required." },
        { status: 400 }
      );
    }

    const result = await recordCaseActivity(case_id, String(action).trim(), String(actor).trim());
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status || 502 }
      );
    }

    return NextResponse.json({ success: true, activity: result.data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to record activity";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
