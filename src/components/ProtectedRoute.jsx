import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth();

  if (loading) return <div>Cargando...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
  // Normalizamos role para que siempre sea un array
  const userRoles = Array.isArray(role) ? role : [role];

  // Si no hay intersección entre roles del usuario y roles permitidos
  const hasAccess = userRoles.some(r => allowedRoles.includes(r));
  if (!hasAccess) {
    return <Navigate to="/unauthorized" replace />;
  }
}


  return children;
}
