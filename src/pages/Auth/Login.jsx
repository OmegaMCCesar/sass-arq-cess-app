import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function Login() {
  const { signIn, user, role, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  // Redirige cuando ya hay sesión y el rol está cargado
  useEffect(() => {
    if (!loading && user) {
      // Ajusta destinos por rol si quieres
      if (role === "superadmin") navigate("/", { replace: true });      // o "/register" si tu flujo lo prefiere
      else if (role === "admin") navigate("/", { replace: true });
      else if (role === "residente") navigate("/", { replace: true });
      else navigate("/", { replace: true }); // fallback
    }
  }, [user, role, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await signIn(email, password);
      // No navegues aquí: espera a que useEffect redirija cuando role esté listo
    } catch (error) {
      console.error(error);
      setErr("No se pudo iniciar sesión. Verifica tus datos.");
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "40px auto" }}>
      <h2>Iniciar sesión</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ display: "block", width: "100%", marginBottom: 8 }}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ display: "block", width: "100%", marginBottom: 8 }}
        />
        <button type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
    </div>
  );
}
