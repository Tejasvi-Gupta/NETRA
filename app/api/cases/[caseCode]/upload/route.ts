import { NextResponse } from "next/server";

export async function POST(
  request: Request
) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const aiCaseId = formData.get("ai_case_id") as string;

    if (!file || !aiCaseId) {
      return NextResponse.json({ error: "Missing file or ai_case_id" }, { status: 400 });
    }

    // Forward file from Next.js server directly to Render FastAPI (No CORS issue)
    const backendFormData = new FormData();
    backendFormData.append("file", file);

    const backendRes = await fetch(
      `https://fir-intelligence-api.onrender.com/api/v1/cases/${aiCaseId}/documents`,
      {
        method: "POST",
        body: backendFormData,
      }
    );

    if (!backendRes.ok) {
      const errText = await backendRes.text();
      return NextResponse.json({ error: errText }, { status: backendRes.status });
    }

    const data = await backendRes.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to upload document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}