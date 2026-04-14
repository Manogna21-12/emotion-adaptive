import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./contexts/ThemeContext";

import {
  LazyWrapper,
  LazyStudentDashboard,
  LazyAdminDashboard,
  LazyReports,
  LazyProgress,
  LazyProfile,
  LazyCoursesPage,
  LazyModulesPage,
  LazyLessonsPage,
} from "./components/LazyComponents";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import SimpleOptimizedDashboard from "./components/SimpleOptimizedDashboard";

/**
 * Keep routes in sync with App.jsx + Sidebar links.
 * Missing routes were hitting `*` → Navigate to `/`, which looked like "auto logout".
 */
function AppSimple() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route
                path="/student-dashboard"
                element={
                  <ProtectedRoute requiredRole="student">
                    <LazyWrapper>
                      <LazyStudentDashboard />
                    </LazyWrapper>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin-dashboard"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <LazyWrapper>
                      <LazyAdminDashboard />
                    </LazyWrapper>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard-optimized"
                element={
                  <ProtectedRoute>
                    <SimpleOptimizedDashboard userId="test_user_123" />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <LazyWrapper>
                      <LazyProfile />
                    </LazyWrapper>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/progress"
                element={
                  <ProtectedRoute>
                    <LazyWrapper>
                      <LazyProgress />
                    </LazyWrapper>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <LazyWrapper>
                      <LazyReports />
                    </LazyWrapper>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/courses"
                element={
                  <ProtectedRoute>
                    <LazyWrapper>
                      <LazyCoursesPage />
                    </LazyWrapper>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/course/:courseId/modules"
                element={
                  <ProtectedRoute>
                    <LazyWrapper>
                      <LazyModulesPage />
                    </LazyWrapper>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/module/:moduleId/lessons"
                element={
                  <ProtectedRoute>
                    <LazyWrapper>
                      <LazyLessonsPage />
                    </LazyWrapper>
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default AppSimple;
