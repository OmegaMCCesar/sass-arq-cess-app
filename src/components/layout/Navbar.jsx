import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/Navbar.module.css";

export default function Navbar() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }) =>
    isActive ? `${styles.link} ${styles.active}` : styles.link;

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (e) {
      console.error("Error al cerrar sesión", e);
    }
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
        <Link to="/" className={styles.brand}>Bacheo GPS SaaS</Link>
      </div>

      <ul className={styles.menu}>
        {/* Enlaces base */}
        <li><NavLink to="/" className={linkClass} end>Inicio</NavLink></li>
        {/* Si tus anclas viven dentro de Dashboard, usa Link para no recargar */}
        <li><Link to="/calculadora" className={styles.link}>Calculadora</Link></li>
        <li><Link to="/reportes" className={styles.link}>Reportes</Link></li>

        {/* Enlaces por rol */}
        {["residente", "admin", "superadmin"].includes(role) && (
          <li><NavLink to="/cuadrillas" className={linkClass}>Cuadrillas</NavLink></li>
        )}
        {role === "superadmin" && (
          <li><NavLink to="/register" className={linkClass}>Usuarios</NavLink></li>
        )}
        {["residente","admin","superadmin"].includes(role) && (
  <li><NavLink to="/staff" className={linkClass}>Staff</NavLink></li>
)}{["residente","admin","superadmin"].includes(role) && (
  <li><NavLink to="/baches" className={linkClass}>Baches</NavLink></li>
)}


      </ul>

      <div className={styles.session}>
        {user ? (
          <>
            <span className={styles.user}>{user.email}</span>
            <button onClick={handleSignOut} className={styles.btn}>Salir</button>
          </>
        ) : (
          <Link to="/login" className={styles.btn}>Entrar</Link>
        )}
      </div>
    </nav>
  );
}
