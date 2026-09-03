import { NextResponse } from "next/server";

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
    return NextResponse.json(data, { status: res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch AI job status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}