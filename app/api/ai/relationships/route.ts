import { NextResponse } from "next/server";
import { createCaseRelationship } from "@/lib/aiApi";

export async function POST(request: Request) {
  try {
    const { case_id, source, target, type, evidence } = await request.json();
    if (!case_id || !source || !target || !type || !evidence) {
      return NextResponse.json(
        { success: false, error: "Case, source, target, type, and evidence are required." },
        { status: 400 }
      );
    }

    const result = await createCaseRelationship(case_id, {
      source: String(source).trim(),
      target: String(target).trim(),
      type: String(type).trim(),
      evidence: String(evidence).trim(),
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status || 502 }
      );
    }

    return NextResponse.json({ success: true, relationship: result.data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create relationship";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
