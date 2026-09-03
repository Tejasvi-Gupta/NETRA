import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("case_id");

    if (!caseId) {
      return NextResponse.json({ error: "Missing case_id" }, { status: 400 });
    }

    const res = await fetch(
      `https://fir-intelligence-api.onrender.com/api/v1/cases/${caseId}/graph`
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}