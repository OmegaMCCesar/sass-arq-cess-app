import React, { useEffect, useState, useCallback } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/Navbar.module.css";

export default function Navbar() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);

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

  const closeMenu = useCallback(() => setOpen(false), []);
  const toggleMenu = () => setOpen((v) => !v);

  // Cierra el menú al cambiar tamaño a desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 992) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Escape para cerrar
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Bloquea scroll del body cuando el panel móvil está abierto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const RoleLinks = () => (
    <>
      {["residente", "admin", "superadmin"].includes(role) && (
        <li><NavLink to="/cuadrillas" className={linkClass} onClick={closeMenu}>Cuadrillas</NavLink></li>
      )}
      {role === "superadmin" && (
        <li><NavLink to="/register" className={linkClass} onClick={closeMenu}>Usuarios</NavLink></li>
      )}
      {["residente","admin","superadmin"].includes(role) && (
        <li><NavLink to="/staff" className={linkClass} onClick={closeMenu}>Staff</NavLink></li>
      )}
      {["residente","admin","superadmin"].includes(role) && (
        <li><NavLink to="/baches" className={linkClass} onClick={closeMenu}>Baches</NavLink></li>
      )}
    </>
  );

  return (
    <nav className={styles.navbar}>
      <div className={styles.left}>
        <button
          className={styles.burger}
          aria-label="Abrir menú"
          aria-controls="mobile-menu"
          aria-expanded={open ? "true" : "false"}
          onClick={toggleMenu}
        >
          <span className={styles.burgerBar} />
          <span className={styles.burgerBar} />
          <span className={styles.burgerBar} />
        </button>

        <Link to="/" className={styles.brand}>Bacheo GPS SaaS</Link>
      </div>

      {/* Menú desktop */}
      <ul className={styles.menuDesktop}>
        <li><NavLink to="/" className={linkClass} end>Inicio</NavLink></li>
        <li><Link to="/calculadora" className={styles.link}>Calculadora</Link></li>
        <li><Link to="/reportes" className={styles.link}>Reportes</Link></li>
        <RoleLinks />
      </ul>

      <div className={styles.session}>
        {user ? (
          <>
            <span className={styles.user} title={user.email}>{user.email}</span>
            <button onClick={handleSignOut} className={styles.btn}>Salir</button>
          </>
        ) : (
          <Link to="/login" className={`${styles.btn} ${styles.btnPrimary}`}>Entrar</Link>
        )}
      </div>

      {/* Backdrop móvil */}
      <div
        className={`${styles.backdrop} ${open ? styles.backdropShow : ""}`}
        onClick={closeMenu}
      />

      {/* Panel móvil */}
      <div
        id="mobile-menu"
        className={`${styles.mobile} ${open ? styles.mobileOpen : ""}`}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.mobileHeader}>
          <span className={styles.brandMobile}>Bacheo GPS SaaS</span>
          <button
            className={styles.close}
            aria-label="Cerrar menú"
            onClick={closeMenu}
          >
            ✕
          </button>
        </div>

        <ul className={styles.menuMobile}>
          <li><NavLink to="/" className={linkClass} end onClick={closeMenu}>Inicio</NavLink></li>
          <li><Link to="/calculadora" className={styles.link} onClick={closeMenu}>Calculadora</Link></li>
          <li><Link to="/reportes" className={styles.link} onClick={closeMenu}>Reportes</Link></li>
          <RoleLinks />
        </ul>

        <div className={styles.mobileSession}>
          {user ? (
            <>
              <div className={styles.userMobile} title={user.email}>{user.email}</div>
              <button onClick={() => { closeMenu(); handleSignOut(); }} className={styles.btnFull}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <Link to="/login" className={styles.btnFull} onClick={closeMenu}>
              Entrar
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
