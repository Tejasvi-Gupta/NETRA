import { NextResponse } from "next/server";
import { MongoClient, type UpdateFilter } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/netra";

interface RelationEntry {
  from: { id: string };
  to: { id: string };
  type: string;
  evidence: string;
  created_at: string;
  source_type: "MANUAL_FIELD_ENTRY";
}

interface CaseDocument {
  case_code: string;
  ai_extracted_data?: {
    relationships?: RelationEntry[];
  };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ caseCode: string }> }
) {
  let client: MongoClient | null = null;

  try {
    const { caseCode } = await params;
    const { source, target, type, evidence } = await req.json();

    if (!source || !target || !type) {
      return NextResponse.json(
        { success: false, error: "Source, target, and relationship type are required." },
        { status: 400 }
      );
    }

    const newRelation: RelationEntry = {
      from: { id: String(source) },
      to: { id: String(target) },
      type: String(type).toUpperCase().replace(/\s+/g, "_"),
      evidence: evidence || "Manual field intelligence link.",
      created_at: new Date().toISOString(),
      source_type: "MANUAL_FIELD_ENTRY",
    };

    client = await MongoClient.connect(uri);
    const db = client.db();
    const update = {
      $push: { "ai_extracted_data.relationships": newRelation },
    } as unknown as UpdateFilter<CaseDocument>;

    const result = await db.collection<CaseDocument>("cases").updateOne(
      { case_code: caseCode },
      update
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, relation: newRelation });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create relation";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  } finally {
    await client?.close();
  }
}
