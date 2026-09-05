import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Case from "@/models/case";
import { getAICaseDetails } from "@/lib/aiApi";

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
    const updatedCase = await Case.findOneAndUpdate(
      { case_code },
      {
        $set: {
          ai_extracted_data: {
            persons: result.data.persons || [],
            unknown_identities: result.data.unknown_identities || [],
            incidents: result.data.incidents || [],
            entities: result.data.entities || [],
            relationships: result.data.relationships || [],
          },
        },
      },
      { new: true }
    );

    return NextResponse.json({ success: true, case: updatedCase });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
