import { http } from "./http";

export const signup = (body) => http.post(`/auth/signup`, body);
export const login = (body) => http.post(`/login`, body);
/** Uses Authorization: Bearer (see http interceptor). */
export const getCurrentUser = () => http.get(`/auth/me`);
/** Legacy: user_id query (still supported by backend when no Bearer). */
export const getUserById = (userId) =>
  http.get(`/auth/me`, { params: { user_id: userId } });
export const forgotPassword = (email) => http.post(`/auth/forgot-password`, { email });
export const resetPassword = (token, newPassword) =>
  http.post(`/auth/reset-password`, { token, new_password: newPassword });
/** Notify backend a new session has started (increments session count). */
export const logLogin = (userId) =>
  http.post(`/reports/log-login`, { user_id: userId, session_duration: 0 });
