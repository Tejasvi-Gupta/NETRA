export function firActor() {
  if (typeof window === "undefined") return "INVESTIGATOR";
  return localStorage.getItem("netra_display_name") || "INVESTIGATOR";
}

export async function recordFirActivity(caseId: string | undefined | null, action: string, actor?: string) {
  if (!caseId || !action) return;
  try {
    await fetch("/api/ai/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        case_id: caseId,
        action,
        actor: actor || firActor(),
      }),
    });
  } catch {
    // Local UI should not fail if the FIR audit trail is down.
  }
}
