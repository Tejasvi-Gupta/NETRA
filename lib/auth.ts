const SESSION_KEY = "netra-session";
const ACCESS_KEY = "netra-access-key";
const OPERATOR_KEY = "netra-operator-id";
const ROLE_KEY = "netra-role";

export const ADMIN_OPERATOR_ID = "netra-admin";
export const ADMIN_ACCESS_KEY = "netra@2026";

export const INVESTIGATOR_OPERATOR_ID = "netra-investigator";
export const INVESTIGATOR_ACCESS_KEY = "investigator@2026";
export const DISPLAY_NAME_KEY = "netra_display_name";
export const INVESTIGATOR_DISPLAY_NAME = "Field Investigator";
export const ADMIN_DISPLAY_NAME = "Administrator";

export type UserRole = "admin" | "investigator";

export function getOperatorId() {
  if (typeof window === "undefined") return ADMIN_OPERATOR_ID;

  return localStorage.getItem(OPERATOR_KEY) ?? ADMIN_OPERATOR_ID;
}

export function getAccessKey() {
  if (typeof window === "undefined") return ADMIN_ACCESS_KEY;

  return localStorage.getItem(ACCESS_KEY) ?? ADMIN_ACCESS_KEY;
}

export function getRole(): UserRole | null {
  if (typeof window === "undefined") return null;

  const role = localStorage.getItem(ROLE_KEY);

  if (role === "admin" || role === "investigator") {
    return role;
  }

  return null;
}

export function login(
  operatorId: string,
  accessKey: string,
  role: UserRole
) {
  localStorage.setItem(SESSION_KEY, "1");
  localStorage.setItem(OPERATOR_KEY, operatorId);
  localStorage.setItem(ACCESS_KEY, accessKey);
  localStorage.setItem(ROLE_KEY, role);
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(OPERATOR_KEY);
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(DISPLAY_NAME_KEY);
}

export function getDisplayName() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(DISPLAY_NAME_KEY) ?? "";
}

export function formatInvestigator(name?: string | null) {
  const stored = name?.trim() || "";
  if (/^(lead investigator|netra investigator)$/i.test(stored)) {
    return INVESTIGATOR_DISPLAY_NAME;
  }
  return stored || "Unassigned";
}

export function updateAccessKey(nextKey: string) {
  localStorage.setItem(ACCESS_KEY, nextKey);
}

export function verifyCredentials(
  operatorId: string,
  accessKey: string
): UserRole | null {
  const id = operatorId.trim();

  if (
    id === ADMIN_OPERATOR_ID &&
    accessKey === ADMIN_ACCESS_KEY
  ) {
    return "admin";
  }

  if (
    id === INVESTIGATOR_OPERATOR_ID &&
    accessKey === INVESTIGATOR_ACCESS_KEY
  ) {
    return "investigator";
  }

  return null;
}