import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Activity from "@/models/activity";

export async function GET() {
  try {
    await connectDB();
    const activities = await Activity.find({}).sort({ createdAt: -1 }).limit(8).lean();
    return NextResponse.json({ success: true, activities });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch activities";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}