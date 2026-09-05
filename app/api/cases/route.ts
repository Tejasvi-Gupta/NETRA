import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Case from "@/models/case";
import Activity from "@/models/activity";
import { resolveAICaseId } from "@/lib/aiApi";

export async function GET() {
  try {
    await connectDB();
    const cases = await Case.find({}).sort({ updatedAt: -1 });
    return NextResponse.json({ success: true, cases });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch cases";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();

    const caseCode = body.case_code || `FIR-${Date.now().toString().slice(-6)}`;
    let aiCaseId: string | null = null;

    try {
      const resolved = await resolveAICaseId({
        case_number: caseCode,
        title: body.title,
        case_type: body.case_type || "General Investigation",
        priority: body.priority || "MEDIUM",
        synopsis: body.investigation_summary || "",
        police_station: body.police_station,
        district: body.district,
      });
      if (resolved.ok) {
        aiCaseId = resolved.data.case_id;
      } else {
        console.error("AI Server returned error:", resolved.error);
      }
    } catch (err) {
      console.error("Failed to connect to Render server:", err);
    }

    // Save into MongoDB with ai_case_id
    const newCase = await Case.create({
      case_code: caseCode,
      title: body.title,
      case_type: body.case_type || "General Investigation",
      priority: body.priority || "MEDIUM",
      status: body.status || "ACTIVE",
      assigned_investigator: body.assigned_investigator || "Unassigned",
      investigation_summary: body.investigation_summary || "",
      ai_case_id: aiCaseId,
      ai_extracted_data: null,
      sources: [],
    });

    await Activity.create({
      case_code: newCase.case_code,
      event_type: "CASE_CREATED",
      description: `Case ${newCase.case_code} ("${newCase.title}") registered.`,
    });

    return NextResponse.json({ success: true, case: newCase, ai_linked: Boolean(aiCaseId) }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create case";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}