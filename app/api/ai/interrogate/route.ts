import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { ai_case_id, notes } = await request.json();

    if (!ai_case_id || !notes) {
      return NextResponse.json({ error: "Missing case ID or notes" }, { status: 400 });
    }

    // Backend analysis ya document ingest endpoint par raw text bhejte hain
    const res = await fetch(
      `https://fir-intelligence-api.onrender.com/api/v1/cases/${ai_case_id}/analysis`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      }
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}