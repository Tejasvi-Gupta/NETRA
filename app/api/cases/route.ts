import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Case from "@/models/case";
import Activity from "@/models/activity";

// GET: Cases list fetch karne ke liye (5 limit for dashboard, ya all)
export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam) : 0;

    const cases = await Case.find({})
      .sort({ last_signal_at: -1 })
      .limit(limit)
      .lean();

    // Summary calculation for dashboard
    const activeCount = await Case.countDocuments({ status: "ACTIVE" });
    const highRiskCount = await Case.countDocuments({
      priority: { $in: ["HIGH", "CRITICAL"] },
      status: { $ne: "CLOSED" },
    });
    const resolvedCount = await Case.countDocuments({ status: "CLOSED" });

    return NextResponse.json({
      success: true,
      cases,
      summary: { activeCount, highRiskCount, resolvedCount },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch cases";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST: Add new case
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();

    // Auto-generate CASE-XXXX
    const count = await Case.countDocuments();
    const case_code = `CASE-${String(count + 1).padStart(4, "0")}`;

    const newCase = await Case.create({
      case_code,
      title: body.title,
      case_type: body.case_type,
      priority: body.priority,
      status: "ACTIVE",
      assigned_investigator: body.assigned_investigator || "Netra Investigator",
      investigation_summary: body.investigation_summary,
      last_signal_at: new Date(),
    });

    // Auto add activity log
    await Activity.create({
      case_code: newCase.case_code,
      event_type: "CASE_CREATED",
      description: `New case "${newCase.title}" (${newCase.case_code}) created and assigned.`,
    });

    return NextResponse.json({ success: true, case: newCase }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create case";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}