import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const aiCaseId = formData.get("ai_case_id") as string;

    if (!file || !aiCaseId) {
      return NextResponse.json({ error: "Missing file or ai_case_id" }, { status: 400 });
    }

    // Node.js server to Render server (CORS check browser me hota hai, yahan bilkul nahi hoga)
    const backendForm = new FormData();
    backendForm.append("file", file);

    const res = await fetch(`https://fir-intelligence-api.onrender.com/api/v1/cases/${aiCaseId}/documents`, {
      method: "POST",
      body: backendForm,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}