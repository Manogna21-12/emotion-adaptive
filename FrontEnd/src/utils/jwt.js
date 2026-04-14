/**
 * Decode JWT payload (no signature verify — server validates).
 * Used for instant session restore; always refresh profile via /auth/me when online.
 */
export function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    if (pad) base64 += "=".repeat(4 - pad);
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function userFromJwtPayload(payload) {
  if (!payload || !payload.user_id) return null;
  return {
    id: String(payload.user_id),
    email: payload.email || "",
    name: payload.name || "",
    role: payload.role || "student",
  };
}
