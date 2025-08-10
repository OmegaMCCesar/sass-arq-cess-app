// src/pages/Dashboard/Dashboard.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";          // <-- usa el hook nuevo
import styles from "../../styles/Dashboard.module.css";

export default function Dashboard() {
  const { user, role, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error("Error al cerrar sesión:", e);
    }
  };

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>
            Bienvenido{user?.email ? `, ${user.email}` : ""}. Rol: <b>{role || "…"}</b>
          </p>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.grid}>
          <Link to="/calculadora" className={styles.card}>
            <h3>Calculadora</h3>
            <p>Herramientas de cálculo. (No se muestra en inicio)</p>
          </Link>

          <Link to="/reportes" className={styles.card}>
            <h3>Reportes</h3>
            <p>Consulta y exporta tus reportes.</p>
          </Link>

          {["residente","admin","superadmin"].includes(role) && (
            <Link to="/cuadrillas" className={styles.card}>
              <h3>Cuadrillas</h3>
              <p>Gestiona encargados y obreros.</p>
            </Link>
          )}

          {role === "superadmin" && (
            <Link to="/register" className={styles.card}>
              <h3>Usuarios</h3>
              <p>Crear Admins y Residentes.</p>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
