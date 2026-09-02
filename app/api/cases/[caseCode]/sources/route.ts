import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Case from "@/models/case";
import Activity from "@/models/activity";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseCode: string }> }
) {
  try {
    await connectDB();
    const { caseCode } = await params;
    const body = await request.json();

    const caseDoc = await Case.findOne({ case_code: caseCode });
    if (!caseDoc) {
      return NextResponse.json({ success: false, error: "Case not found" }, { status: 404 });
    }

    const newSource = {
      type: body.type,
      title: body.title,
      content: body.content,
      uploaded_at: new Date(),
    };

    caseDoc.sources.push(newSource);
    caseDoc.last_signal_at = new Date();

    if (body.ai_case_id) {
      caseDoc.ai_case_id = body.ai_case_id;
    }
    if (body.ai_extracted_data) {
      caseDoc.ai_extracted_data = body.ai_extracted_data;
    }

    await caseDoc.save();

    await Activity.create({
      case_code: caseDoc.case_code,
      event_type: "EVIDENCE_ADDED",
      description: `New ${body.type} source "${body.title}" ingested into case ${caseDoc.case_code}.`,
    });

    return NextResponse.json({ 
      success: true, 
      sources: caseDoc.sources,
      ai_extracted_data: caseDoc.ai_extracted_data 
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to add source";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}