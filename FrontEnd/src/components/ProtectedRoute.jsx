import React, { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * Requires an authenticated user (JWT + context). Session persists across routes and refresh.
 */
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  const roleMismatchRedirect = useMemo(() => {
    if (!user || !requiredRole) return null;
    if (user.role !== requiredRole) {
      return user.role === "admin" ? "/admin-dashboard" : "/student-dashboard";
    }
    return null;
  }, [user, requiredRole]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (roleMismatchRedirect && roleMismatchRedirect !== location.pathname) {
    return <Navigate to={roleMismatchRedirect} replace />;
  }

  return children;
};

export default ProtectedRoute;
