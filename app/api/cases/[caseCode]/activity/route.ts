import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/netra";

interface ActivityEntry {
  action: string;
  actor: string;
  timestamp: string;
}

interface CaseDocument {
  case_code: string;
  activities?: ActivityEntry[];
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ caseCode: string }> }
) {
  let client: MongoClient | null = null;

  try {
    const { caseCode } = await params;
    const { action, actor = "INVESTIGATOR" } = await req.json();

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Action is required" },
        { status: 400 }
      );
    }

    client = await MongoClient.connect(uri);
    const db = client.db();
    const activityEntry = {
      action,
      actor,
      timestamp: new Date().toISOString(),
    };

    await db.collection<CaseDocument>("cases").updateOne(
      { case_code: caseCode },
      { $push: { activities: activityEntry } }
    );

    return NextResponse.json({ success: true, entry: activityEntry });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to log activity";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  } finally {
    await client?.close();
  }
}
