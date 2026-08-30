const SESSION_KEY = "netra-session";
const ACCESS_KEY = "netra-access-key";
const OPERATOR_KEY = "netra-operator-id";

export const DEFAULT_OPERATOR_ID = "netra-admin";
export const DEFAULT_ACCESS_KEY = "netra@2026";

export function getOperatorId() {
  if (typeof window === "undefined") return DEFAULT_OPERATOR_ID;
  return localStorage.getItem(OPERATOR_KEY) ?? DEFAULT_OPERATOR_ID;
}

export function getAccessKey() {
  if (typeof window === "undefined") return DEFAULT_ACCESS_KEY;
  return localStorage.getItem(ACCESS_KEY) ?? DEFAULT_ACCESS_KEY;
}

export function login(operatorId: string, accessKey: string) {
  localStorage.setItem(SESSION_KEY, "1");
  localStorage.setItem(OPERATOR_KEY, operatorId);
  localStorage.setItem(ACCESS_KEY, accessKey);
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function updateAccessKey(nextKey: string) {
  localStorage.setItem(ACCESS_KEY, nextKey);
}

export function verifyCredentials(operatorId: string, accessKey: string) {
  return operatorId.trim() === getOperatorId() && accessKey === getAccessKey();
}
