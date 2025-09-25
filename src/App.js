import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import AppLayout from "./components/layout/AppLayout"; // <-- nuevo
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Dashboard from "./pages/Dashboard/Dashboard";
import Unauthorized from "./pages/Unauthorized";
import Cuadrillas from "./pages/Cuadrillas/Cuadrillas";
import CalculadoraPage from "./pages/Calculadora/Calculadora";
import ReportesPage from "./pages/Reportes/Reportes";
import WorkersPage from "./pages/Workers/Workers";
import BachesPage from "./pages/Baches/Baches";
import Navbar from "./components/layout/Navbar";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
      <Navbar />
        <Routes>
          {/* Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protegidas con Layout */}
          <Route
            path="/register"
            element={
              <ProtectedRoute allowedRoles={["superadmin","residente"]}>
                <AppLayout>
                  <Register />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
  path="/baches"
  element={
    <ProtectedRoute allowedRoles={["residente","admin","superadmin"]}>
      <AppLayout>
        <BachesPage />
      </AppLayout>
    </ProtectedRoute>
  }
/>
          <Route
  path="/staff"
  element={
    <ProtectedRoute allowedRoles={["residente","admin","superadmin"]}>
      <AppLayout>
        <WorkersPage />
      </AppLayout>
    </ProtectedRoute>
  }
/>
          <Route
  path="/calculadora"
  element={
    <ProtectedRoute allowedRoles={["superadmin","admin","residente"]}>
      <AppLayout>
        <CalculadoraPage />
      </AppLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/reportes"
  element={
    <ProtectedRoute allowedRoles={["superadmin","admin","residente"]}>
      <AppLayout>
        <ReportesPage />
      </AppLayout>
    </ProtectedRoute>
  }
/>

          <Route
            path="/cuadrillas"
            element={
              <ProtectedRoute allowedRoles={["residente","admin","superadmin"]}>
                <AppLayout>
                  <Cuadrillas />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={["superadmin","admin","residente"]}>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
