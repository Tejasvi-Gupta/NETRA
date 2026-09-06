import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Case from "@/models/case";
import { getAICaseDetails } from "@/lib/aiApi";
import { preferExtractedList } from "@/lib/extractedCase";

export async function POST(request: Request) {
  try {
    const { case_code, ai_case_id } = await request.json();

    if (!case_code || !ai_case_id) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const result = await getAICaseDetails(ai_case_id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status || 502 });
    }

    await connectDB();
    const existing = await Case.findOne({ case_code }).lean();
    const cached = (existing?.ai_extracted_data || {}) as Record<string, unknown>;
    const extracted = {
      persons: preferExtractedList(result.data.persons, cached.persons),
      unknown_identities: preferExtractedList(result.data.unknown_identities, cached.unknown_identities),
      incidents: preferExtractedList(result.data.incidents, cached.incidents),
      entities: preferExtractedList(result.data.entities, cached.entities),
      relationships: preferExtractedList(result.data.relationships, cached.relationships),
    };

    const updatedCase = await Case.findOneAndUpdate(
      { case_code },
      { $set: { ai_extracted_data: extracted } },
      { new: true }
    );

    return NextResponse.json({ success: true, case: updatedCase });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
