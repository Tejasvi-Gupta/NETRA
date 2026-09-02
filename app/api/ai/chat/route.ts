import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { ai_case_id, message } = await request.json();

    if (!ai_case_id || !message) {
      return NextResponse.json({ error: "Missing case ID or message" }, { status: 400 });
    }

    const res = await fetch(
      `https://fir-intelligence-api.onrender.com/api/v1/cases/${ai_case_id}/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message }),
      }
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}