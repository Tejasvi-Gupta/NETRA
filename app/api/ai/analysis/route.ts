import { NextResponse } from "next/server";
import { analyzeCase, getCaseAnalysis } from "@/lib/aiApi";

export async function GET(request: Request) {
  const caseId = new URL(request.url).searchParams.get("case_id");
  if (!caseId) {
    return NextResponse.json({ success: false, error: "Missing case_id" }, { status: 400 });
  }

  const result = await getCaseAnalysis(caseId);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status || 502 }
    );
  }

  return NextResponse.json({ success: true, ...result.data });
}

export async function POST(request: Request) {
  try {
    const { case_id } = await request.json();
    if (!case_id) {
      return NextResponse.json({ success: false, error: "Missing case_id" }, { status: 400 });
    }

    const result = await analyzeCase(case_id);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status || 502 }
      );
    }

    return NextResponse.json({ success: true, ...result.data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to analyze case";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
