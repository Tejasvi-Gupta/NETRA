import { NextResponse } from "next/server";
import { uploadFIRDocument } from "@/lib/aiApi";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const aiCaseId = String(formData.get("ai_case_id") || "");

    if (!(file instanceof File) || !aiCaseId) {
      return NextResponse.json({ error: "Missing file or case_id" }, { status: 400 });
    }

    const result = await uploadFIRDocument(aiCaseId, file);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status || 502 });
    }
    return NextResponse.json(result.data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to upload document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
