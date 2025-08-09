import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import Calculadora from "../../components/Calculadora";
import styles from "../../styles/Dashboard.module.css";
import { auth } from "../../lib/firebaseConfig"; // importación estática
import { signOut } from "firebase/auth";

export default function Dashboard() {
  const { user, role } = useAuth();

  const handleLogout = () => {
    signOut(auth).catch(error => {
      console.error("Error cerrando sesión:", error);
    });
  };

  return (
    <div>
      <nav className={styles.navbar}>
        <div className={styles.brand}>SaaS Bacheo</div>
        <div className={styles.userInfo}>
          <span>{user?.email} ({role})</span>
          <button onClick={handleLogout} className={styles.logoutButton}>Cerrar sesión</button>
        </div>
      </nav>
      <main className={styles.main}>
        <Calculadora />
      </main>
    </div>
  );
}
