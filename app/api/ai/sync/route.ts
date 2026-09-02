import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Case from "@/models/case";

export async function POST(request: Request) {
  try {
    const { case_code, ai_case_id } = await request.json();

    if (!case_code || !ai_case_id) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // FastAPI case details fetch karo
    const res = await fetch(`https://fir-intelligence-api.onrender.com/api/v1/cases/${ai_case_id}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch from AI backend" }, { status: res.status });
    }

    const aiData = await res.json();

    // MongoDB me save karo
    await connectDB();
    const updatedCase = await Case.findOneAndUpdate(
      { case_code },
      { $set: { ai_extracted_data: aiData } },
      { new: true }
    );

    return NextResponse.json({ success: true, case: updatedCase });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}