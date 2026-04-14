import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { login, signup, getCurrentUser, logLogin } from "../services/authService";
import {
  getApiBaseUrl,
  checkBackendHealth,
  isNetworkOrTimeoutError,
} from "../services/http";
import { registerUnauthorizedHandler } from "../services/authSession";
import { decodeJwtPayload, userFromJwtPayload } from "../utils/jwt";

const TOKEN_KEY = "token";
const USER_ID_KEY = "userId";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

function migrateLegacySession() {
  const legacy = sessionStorage.getItem("userId");
  if (legacy && !localStorage.getItem(USER_ID_KEY)) {
    localStorage.setItem(USER_ID_KEY, legacy);
  }
}

function readUserFromStorage() {
  migrateLegacySession();
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  return userFromJwtPayload(decodeJwtPayload(token));
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => readUserFromStorage());
  const [loading, setLoading] = useState(true);
  /** null = unknown, true = up, false = down */
  const [backendReady, setBackendReady] = useState(null);
  const loginInFlight = useRef(false);
  const lastBackendLog = useRef(/** @type {boolean | null} */ (null));
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      if (!mounted.current) return;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_ID_KEY);
      sessionStorage.removeItem("userId");
      setUser(null);
    });
    return () => registerUnauthorizedHandler(() => {});
  }, []);

  const runHealthCheck = useCallback(async () => {
    try {
      await checkBackendHealth();
      setBackendReady(true);
      if (lastBackendLog.current !== true) {
        console.info("[Auth] Backend healthy:", getApiBaseUrl());
        lastBackendLog.current = true;
      }
      return true;
    } catch (e) {
      setBackendReady(false);
      if (lastBackendLog.current !== false) {
        console.warn("[Auth] Backend not reachable:", getApiBaseUrl());
        lastBackendLog.current = false;
      }
      return false;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      if (mounted.current) setUser(null);
      return;
    }

    const fromJwt = userFromJwtPayload(decodeJwtPayload(token));
    if (!fromJwt) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_ID_KEY);
      sessionStorage.removeItem("userId");
      if (mounted.current) setUser(null);
      return;
    }
    if (mounted.current) {
      setUser((prev) => ({
        ...fromJwt,
        ...prev,
        id: fromJwt.id,
        email: fromJwt.email || prev?.email,
        role: fromJwt.role || prev?.role || "student",
        name: prev?.name || fromJwt.name,
      }));
    }

    const ok = await runHealthCheck();
    if (!ok) return;

    try {
      const response = await getCurrentUser();
      const u = response.data;
      if (!mounted.current) return;
      setUser({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role || "student",
      });
      localStorage.setItem(USER_ID_KEY, u.id);
    } catch (error) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_ID_KEY);
        sessionStorage.removeItem("userId");
        if (mounted.current) setUser(null);
        return;
      }
      if (status === 404) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_ID_KEY);
        sessionStorage.removeItem("userId");
        if (mounted.current) setUser(null);
        return;
      }
      console.warn(
        "[Auth] Profile refresh failed (keeping cached session):",
        error?.message || error
      );
    }
  }, [runHealthCheck]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshProfile();
      if (!cancelled && mounted.current) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshProfile]);

  useEffect(() => {
    if (backendReady !== false) return undefined;
    const id = setInterval(() => {
      runHealthCheck();
    }, 12000);
    return () => clearInterval(id);
  }, [backendReady, runHealthCheck]);

  const loginUser = async (credentials) => {
    if (loginInFlight.current) {
      console.warn("[Auth] login already in progress; ignoring duplicate submit");
      throw new Error("Login already in progress.");
    }
    loginInFlight.current = true;
    try {
      const ok = await runHealthCheck();
      if (!ok) {
        const err = new Error("The authentication server is currently unreachable. Please try again later.");
        err.name = "BackendDownError";
        throw err;
      }

      const response = await login(credentials);
      const { token, user_id, name, role } = response.data;

      if (!token || !user_id) {
        throw new Error("Invalid login response from server.");
      }

      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_ID_KEY, user_id);
      sessionStorage.removeItem("userId");

      const userData = {
        id: user_id,
        name,
        email: credentials.email,
        role: role || "student",
      };
      setUser(userData);

      // Fire-and-forget: notify backend to record session (non-blocking)
      // Note: auth.py already does this server-side; this is a client-side safety call
      logLogin(user_id).catch((e) =>
        console.warn("[Auth] logLogin call failed (non-fatal):", e?.message)
      );

      return { success: true, user: userData };
    } catch (error) {
      if (isNetworkOrTimeoutError(error) || error.name === "BackendUnreachableError") {
        console.error(
          "[AuthContext] loginUser: backend unreachable at",
          getApiBaseUrl(),
          error
        );
      } else {
        console.error("[AuthContext] loginUser error:", error);
      }
      throw error;
    } finally {
      loginInFlight.current = false;
    }
  };

  const signupUser = async (userData) => {
    const ok = await runHealthCheck();
    if (!ok) {
      const err = new Error("The registration server is currently unreachable. Please try again later.");
      err.name = "BackendDownError";
      throw err;
    }
    await signup(userData);
    return { success: true };
  };

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    sessionStorage.removeItem("userId");
    setUser(null);
  }, []);

  const value = {
    user,
    loginUser,
    signupUser,
    logout,
    loading,
    isAuthenticated: Boolean(user),
    backendReady,
    recheckBackend: runHealthCheck,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};
