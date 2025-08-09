import React from "react";
import styles from "../../styles/Navbar.module.css";

export default function Navbar() {
  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>Bacheo GPS SaaS</div>
      <ul className={styles.menu}>
        <li><a href="#calculadora">Calculadora</a></li>
        <li><a href="#tabla">Reportes</a></li>
      </ul>
    </nav>
  );
}
