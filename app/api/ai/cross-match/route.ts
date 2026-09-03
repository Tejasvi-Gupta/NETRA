import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/netra";

export async function POST(req: Request) {
  try {
    const { current_case_code, suspects = [] } = await req.json();

    if (!suspects.length) {
      return NextResponse.json({ success: true, matches: [] });
    }

    const client = await MongoClient.connect(uri);
    const db = client.db();
    const casesCollection = db.collection("cases");

    // Doosre cases dhundo jinka case_code alag ho
    const otherCases = await casesCollection
      .find({ case_code: { $ne: current_case_code } })
      .toArray();

    const matches: Array<{
      suspectName: string;
      matchedCaseCode: string;
      matchedCaseTitle: string;
      matchType: "NAME" | "PHONE";
      matchedValue: string;
    }> = [];

    // Current suspects ki list normalize karo
    for (const s of suspects) {
      const sName = (s.name || "").trim().toLowerCase();
      const sPhones = (s.phones || []).map((p: string) => p.replace(/\D/g, "")).filter(Boolean);

      if (!sName && !sPhones.length) continue;

      for (const other of otherCases) {
        const otherPersons = other.ai_extracted_data?.persons || [];

        for (const op of otherPersons) {
          const profile = op.person || op;
          const otherName = (profile.identity?.name || profile.name || "").trim().toLowerCase();
          const otherPhones = (profile.contact?.phones || [profile.phone])
            .filter(Boolean)
            .map((p: string) => String(p).replace(/\D/g, ""));

          // Name Match Check
          if (sName && otherName && (sName === otherName || (sName.length > 4 && otherName.includes(sName)))) {
            matches.push({
              suspectName: s.name,
              matchedCaseCode: other.case_code,
              matchedCaseTitle: other.title,
              matchType: "NAME",
              matchedValue: profile.identity?.name || profile.name,
            });
          }

          // Phone Match Check
          for (const ph of sPhones) {
            if (ph.length >= 10 && otherPhones.some((opPh: string) => opPh.includes(ph))) {
              matches.push({
                suspectName: s.name,
                matchedCaseCode: other.case_code,
                matchedCaseTitle: other.title,
                matchType: "PHONE",
                matchedValue: ph,
              });
            }
          }
        }
      }
    }

    await client.close();

    // Deduplicate matches
    const uniqueMatches = matches.filter(
      (m, idx, self) =>
        idx ===
        self.findIndex(
          (t) =>
            t.suspectName === m.suspectName &&
            t.matchedCaseCode === m.matchedCaseCode &&
            t.matchType === m.matchType
        )
    );

    return NextResponse.json({ success: true, matches: uniqueMatches });
  } catch (error: unknown) {
    console.error("Cross-match error:", error);
    const message = error instanceof Error ? error.message : "Unknown cross-match error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}