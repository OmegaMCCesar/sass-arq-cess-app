import React from "react";
import Navbar from "./Navbar";

export default function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <Navbar />
      <main style={{ padding: 16 }}>{children}</main>
    </div>
  );
}
