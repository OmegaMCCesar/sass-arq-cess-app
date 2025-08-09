import React from "react";
import { BrowserRouter, Routes, Route} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Dashboard from "./pages/Dashboard/Dashboard";  // Aquí iría la app principal con calculadora y demás
import Unauthorized from "./pages/Unauthorized";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={
            <ProtectedRoute allowedRoles={["superadmin"]}>
              <Register />
            </ProtectedRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute allowedRoles={["superadmin","admin","residente"]}>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/unauthorized" element={<Unauthorized />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
