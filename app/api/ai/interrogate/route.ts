import { NextResponse } from "next/server";

// Minimal valid PDF binary generator
function createMinimalPdf(text: string): string {
  // Line wraps aur safe escaping
  const safeText = text.replace(/[()\\]/g, "\\$&").slice(0, 1000);
  const pdfString = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length ${safeText.length + 55} >>
stream
BT
/F1 12 Tf
50 720 Td
(${safeText}) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000350 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
427
%%EOF`;

  return pdfString;
}

export async function POST(request: Request) {
  try {
    const { ai_case_id, notes } = await request.json();

    if (!ai_case_id || !notes) {
      return NextResponse.json({ error: "Missing case ID or notes" }, { status: 400 });
    }

    // Text ko valid PDF byte array me convert kiya
    const pdfString = createMinimalPdf(notes);
    const pdfBlob = new Blob([pdfString], { type: "application/pdf" });

    const backendForm = new FormData();
    backendForm.append("file", pdfBlob, `interrogation_${Date.now()}.pdf`);

    const res = await fetch(
      `https://fir-intelligence-api.onrender.com/api/v1/cases/${ai_case_id}/documents`,
      {
        method: "POST",
        body: backendForm,
      }
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}