import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  // 1) Mientras se resuelve auth o el rol, espera
  const roleRequired = allowedRoles && allowedRoles.length > 0;
  const roleReady = role !== undefined && role !== null;

  if (loading || (user && roleRequired && !roleReady)) {
    return <div style={{ padding: 16 }}>Cargando…</div>;
  }

  // 2) No logueado -> login
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 3) Ya hay sesión, pero rol no permitido
  if (roleRequired && roleReady && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 4) Render: soporta children o <Outlet/>
  return children ? <>{children}</> : <Outlet />;
}
