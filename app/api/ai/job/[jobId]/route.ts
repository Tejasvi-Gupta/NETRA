import { NextResponse } from "next/server";
import { getJobStatus } from "@/lib/aiApi";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const result = await getJobStatus(jobId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status || 502 });
  }
  return NextResponse.json(result.data);
}
