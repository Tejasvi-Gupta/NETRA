export type ChatAudience = "admin" | "investigator";

export function normalizeChatAudience(value?: string | null): ChatAudience | null {
  return value === "admin" || value === "investigator" ? value : null;
}
