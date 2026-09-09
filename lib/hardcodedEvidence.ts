export const MONSOON_LEDGER_CASE_ID = "ed7b5cb0-f21f-459b-b767-9d0fcb70cd7d";
export const MONSOON_LEDGER_PDF = "/FIR_582_2026_Operation_Monsoon_Ledger.pdf";
export const MONSOON_LEDGER_FILENAME = "FIR_582_2026_Operation_Monsoon_Ledger.pdf";

export function hardcodedEvidenceUrl(input: {
  caseId?: string | null;
  caseCode?: string | null;
  title?: string | null;
}) {
  const caseId = (input.caseId || "").trim().toLowerCase();
  const caseCode = (input.caseCode || "").trim().toLowerCase();
  const title = (input.title || "").trim().toLowerCase();

  if (caseId === MONSOON_LEDGER_CASE_ID) return MONSOON_LEDGER_PDF;
  if (caseCode === "582/2026" || caseCode.includes("582/2026")) return MONSOON_LEDGER_PDF;
  if (title.includes("monsoon_ledger") || title.includes("monsoon ledger") || title.includes("fir_582_2026")) {
    return MONSOON_LEDGER_PDF;
  }
  return null;
}
