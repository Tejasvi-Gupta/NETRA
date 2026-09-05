import { NextResponse } from "next/server";
import { getCaseSummary } from "@/lib/aiApi";

export async function GET(request: Request) {
  const caseId = new URL(request.url).searchParams.get("case_id");
  if (!caseId) {
    return NextResponse.json({ success: false, error: "Missing case_id" }, { status: 400 });
  }

  const result = await getCaseSummary(caseId);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status || 502 }
    );
  }

  return NextResponse.json({ success: true, summary: result.data });
}
