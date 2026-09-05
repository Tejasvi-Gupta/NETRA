import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Case from "@/models/case";
import Activity from "@/models/activity";

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

    // Server-to-Server call to FastAPI backend (Bypasses Browser CORS)
    try {
      const aiRes = await fetch("https://fir-intelligence-api.onrender.com/api/v1/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          case_number: caseCode,
          title: body.title,
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        aiCaseId = aiData.case_id || null;
      } else {
        const errText = await aiRes.text();
        console.error("AI Server returned error:", errText);
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

    return NextResponse.json({ success: true, case: newCase }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create case";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}