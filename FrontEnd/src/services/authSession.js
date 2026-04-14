/** Bridge for axios 401 → AuthContext logout (avoids circular imports). */
let onUnauthorized = () => {};

export function registerUnauthorizedHandler(fn) {
  onUnauthorized = typeof fn === "function" ? fn : () => {};
}

export function notifyUnauthorized() {
  try {
    onUnauthorized();
  } catch (e) {
    console.error("[authSession] onUnauthorized error:", e);
  }
}
