import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Case from "@/models/case";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const res = await fetch(
      `https://fir-intelligence-api.onrender.com/api/v1/firs/jobs/${jobId}`,
      { cache: "no-store" }
    );

    const data = await res.json();

    // Agar job complete ho chuki hai, to extracted data MongoDB me sync karo
    if (data.status === "completed" && (data.result || data.extracted_data || data.data)) {
      const extracted = data.result || data.extracted_data || data.data;
      await connectDB();

      // Case update karo matching ai_case_id ya job result case
      if (extracted.case_id) {
        await Case.findOneAndUpdate(
          { ai_case_id: extracted.case_id },
          { $set: { ai_extracted_data: extracted } }
        );
      }
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch AI job status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}