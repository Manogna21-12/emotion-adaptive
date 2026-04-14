import axios from "axios";
import { notifyUnauthorized } from "./authSession";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Vite exposes env vars on import.meta.env.* (must be prefixed with VITE_)
const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || "https://emotion-adaptive.onrender.com";

if (!API_BASE_URL) {
  console.error("❌ VITE_API_URL is not defined in the environment variables!");
}


const MAX_RETRIES = 3;

export const http = axios.create({
  baseURL: API_BASE_URL,
  // Increase timeout to 60s to handle Render free-tier cold starts
  timeout: 60000,
});

http.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config;
    if (!config) {
      return Promise.reject(err);
    }

    if (config.skipRetry === true) {
      if (isNetworkOrTimeoutError(err)) {
        return Promise.reject(wrapBackendUnreachable(err, API_BASE_URL));
      }
      return Promise.reject(err);
    }

    const status = err.response?.status;
    const retryable =
      isNetworkOrTimeoutError(err) || status === 502 || status === 503 || status === 504;

    if (retryable) {
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount < MAX_RETRIES) {
        config.__retryCount += 1;
        const delay = 400 * config.__retryCount;
        console.warn(
          `[http] retry ${config.__retryCount}/${MAX_RETRIES} ${config.method?.toUpperCase()} ${config.url} after ${delay}ms`
        );
        await sleep(delay);
        return http(config);
      }
    }

    if (isNetworkOrTimeoutError(err)) {
      return Promise.reject(wrapBackendUnreachable(err, API_BASE_URL));
    }

    // 401: invalid/expired token — clear session (never on login/signup/health)
    const url = String(config.url || "");
    const skipAuth = config.skipAuthRedirect === true;
    if (
      status === 401 &&
      !skipAuth &&
      !url.includes("/login") &&
      !url.includes("/auth/signup") &&
      !url.includes("/health")
    ) {
      notifyUnauthorized();
    }

    return Promise.reject(err);
  }
);

function wrapBackendUnreachable(err, baseUrl) {
  const e = new Error(
    `The backend service is currently unreachable at ${baseUrl}. ` +
    `Please check your internet connection or the server status. If you are a developer, ensure your environment variables are correctly configured.`
  );
  e.name = "BackendUnreachableError";
  e.cause = err;
  return e;
}

export function isNetworkOrTimeoutError(err) {
  if (!err || err.response) return false;
  const msg = String(err.message || "").toLowerCase();
  return (
    err.code === "ECONNABORTED" ||
    err.code === "ERR_NETWORK" ||
    msg.includes("network error") ||
    msg.includes("failed to fetch")
  );
}

/** @deprecated use isNetworkOrTimeoutError */
export function isNetworkError(err) {
  return isNetworkOrTimeoutError(err);
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

/** Lightweight health probe (no retries) */
export async function checkBackendHealth() {
  const res = await http.get("/health", { timeout: 5000, skipRetry: true });
  return res.data;
}
