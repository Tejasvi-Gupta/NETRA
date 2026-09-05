import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Case from "@/models/case";
import Activity from "@/models/activity";
import { closeAICase } from "@/lib/aiApi";

export async function POST(request: Request) {
  try {
    const { case_code } = await request.json();
    if (!case_code) {
      return NextResponse.json({ success: false, error: "Missing case_code" }, { status: 400 });
    }

    await connectDB();
    const caseDoc = await Case.findOne({ case_code });
    if (!caseDoc) {
      return NextResponse.json({ success: false, error: "Case not found" }, { status: 404 });
    }

    if (caseDoc.ai_case_id) {
      const closed = await closeAICase(caseDoc.ai_case_id);
      const alreadyClosed = !closed.ok && /already closed|closed/i.test(closed.error);
      if (!closed.ok && !alreadyClosed) {
        return NextResponse.json(
          { success: false, error: closed.error },
          { status: closed.status || 502 }
        );
      }
    }

    caseDoc.status = "CLOSED";
    await caseDoc.save();

    await Activity.create({
      case_code: caseDoc.case_code,
      event_type: "CASE_STATUS_CHANGED",
      description: `Case "${caseDoc.title}" (${caseDoc.case_code}) closed.`,
    });

    return NextResponse.json({ success: true, case: caseDoc });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to close case";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
