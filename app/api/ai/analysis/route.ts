import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { case_id } = await request.json();

    if (!case_id) {
      return NextResponse.json({ error: "Missing case_id" }, { status: 400 });
    }

    // Trailing slash add kiya taaki 307 redirect se POST -> GET me degrade na ho
    const url = `https://fir-intelligence-api.onrender.com/api/v1/cases/${case_id}/analysis/`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({}),
    });

    // Agar 405/404 aaye toh bina trailing slash ke retry
    if (res.status === 405 || res.status === 404) {
      const retryRes = await fetch(
        `https://fir-intelligence-api.onrender.com/api/v1/cases/${case_id}/analysis`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({}),
        }
      );
      const retryData = await retryRes.json();
      return NextResponse.json(retryData, { status: retryRes.status });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}