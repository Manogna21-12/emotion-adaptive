import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { QueryProvider } from "./providers/QueryProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./contexts/ThemeContext";

// Lazy loaded components for performance
import { 
  LazyWrapper,
  LazyStudentDashboard,
  LazyAdminDashboard,
  LazyReader,
  LazyProgress,
  LazyProfile,
  LazyCoursesPage,
  LazyModulesPage,
  LazyLessonsPage,
  LazyLessonView
} from "./components/LazyComponents";

// Eagerly loaded components (critical for initial load)
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import OptimizedDashboard from "./components/OptimizedDashboard";

// Performance monitoring
import { performanceUtils } from "./services/optimizedApi";

function App() {
  // Preload critical components after initial render
  React.useEffect(() => {
    // Preload dashboard components for better UX
    setTimeout(() => {
      import('./components/LazyComponents').then(({ preloadCriticalComponents }) => {
        preloadCriticalComponents();
      }).catch(error => {
        console.log('LazyComponents not found, skipping preload');
      });
    }, 1000);
  }, []);

  // Performance monitoring
  React.useEffect(() => {
    const measureAppPerformance = performanceUtils.measureTime('App Initial Render', () => {
      // App render logic
    });
    
    return measureAppPerformance;
  }, []);

  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected Routes - Lazy Loaded */}
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

              {/* Optimized Dashboard Route */}
              <Route
                path="/dashboard-optimized"
                element={
                  <ProtectedRoute>
                    <OptimizedDashboard userId="test_user_123" />
                  </ProtectedRoute>
                }
              />

              {/* Other Protected Routes - Lazy Loaded */}
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
                path="/reader"
                element={
                  <ProtectedRoute>
                    <LazyWrapper>
                      <LazyReader />
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

              <Route
                path="/lesson/:courseName"
                element={
                  <ProtectedRoute>
                    <LazyWrapper>
                      <LazyLessonView />
                    </LazyWrapper>
                  </ProtectedRoute>
                }
              />

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}

export default App;