import React from "react";
import Navbar from "./Navbar";
import styles from "../../styles/AppLayout.module.css";

export default function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <main className={styles.container}>{children}</main>
    </div>
  );
}
