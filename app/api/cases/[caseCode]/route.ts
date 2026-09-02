import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Case from "@/models/case";
import Activity from "@/models/activity";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseCode: string }> }
) {
  try {
    await connectDB();
    const { caseCode } = await params;
    const caseRecord = await Case.findOne({ case_code: caseCode }).lean();

    if (!caseRecord) {
      return NextResponse.json({ success: false, error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, case: caseRecord });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch case";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ caseCode: string }> }
) {
  try {
    await connectDB();
    const { caseCode } = await params;
    const body = await request.json();

    const updatedCase = await Case.findOneAndUpdate(
      { case_code: caseCode },
      { 
        ...body, 
        last_signal_at: new Date() 
      },
      { new: true }
    );

    if (!updatedCase) {
      return NextResponse.json({ success: false, error: "Case not found" }, { status: 404 });
    }

    // Activity log entry jab status update ho
    if (body.status) {
      await Activity.create({
        case_code: updatedCase.case_code,
        event_type: "CASE_STATUS_CHANGED",
        description: `Case "${updatedCase.title}" (${updatedCase.case_code}) status changed to ${body.status}.`,
      });
    }

    return NextResponse.json({ success: true, case: updatedCase });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update case";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}