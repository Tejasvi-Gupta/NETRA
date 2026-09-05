import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Case from "@/models/case";
import { getAICaseDetails, resolveAICaseId } from "@/lib/aiApi";

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
      const live = await getAICaseDetails(caseDoc.ai_case_id);
      if (live.ok) {
        return NextResponse.json({ success: true, case: caseDoc, already_linked: true });
      }
    }

    const resolved = await resolveAICaseId({
      case_number: caseDoc.case_code,
      title: caseDoc.title,
      case_type: caseDoc.case_type,
      priority: caseDoc.priority,
      synopsis: caseDoc.investigation_summary,
      police_station: caseDoc.police_station,
      district: caseDoc.district,
    });

    if (!resolved.ok) {
      return NextResponse.json(
        { success: false, error: resolved.error },
        { status: resolved.status || 502 }
      );
    }

    caseDoc.ai_case_id = resolved.data.case_id;
    await caseDoc.save();

    return NextResponse.json({
      success: true,
      case: caseDoc,
      already_linked: resolved.data.reused,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to link case";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
