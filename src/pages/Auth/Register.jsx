import React, { useMemo, useState } from "react";
import { db } from "../../lib/firebaseConfig";
import { useAuth } from "../../hooks/useAuth";
import {
  doc,
  setDoc,
  serverTimestamp,
  addDoc,
  collection
} from "firebase/firestore";

/**
 * Reglas del flujo:
 * - superadmin: puede crear usuarios de aplicación con rol 'admin' o 'residente'
 * - admin:      puede crear usuarios de aplicación con rol 'residente'
 * - residente:  NO crea cuentas de app; crea "encargados" y "obreros" (documentos para organigrama/cuadrillas)
 */

export default function Register() {
  const { user, role, createUserWithRole } = useAuth();

  // --- Formularios para usuarios con cuenta (solo superadmin/admin) ---
  const [accName, setAccName] = useState("");
  const [accEmail, setAccEmail] = useState("");
  const [accPass, setAccPass] = useState("");
  const [accRole, setAccRole] = useState("residente"); // default
  const [accMsg, setAccMsg] = useState("");
  const [accErr, setAccErr] = useState("");

  // --- Formularios para staff sin cuenta (solo residente) ---
  const [encNombre, setEncNombre] = useState("");
  const [encTelefono, setEncTelefono] = useState("");
  const [encCuadrilla, setEncCuadrilla] = useState("");
  const [encMsg, setEncMsg] = useState("");
  const [encErr, setEncErr] = useState("");

  const [obNombre, setObNombre] = useState("");
  const [obTelefono, setObTelefono] = useState("");
  const [obEncargadoId, setObEncargadoId] = useState(""); // si quieres enlazar al encargado
  const [obMsg, setObMsg] = useState("");
  const [obErr, setObErr] = useState("");

  // Roles disponibles para crear CUENTAS de app según mi rol
  const accountRoles = useMemo(() => {
    if (role === "superadmin") return ["admin", "residente"];
    if (role === "admin") return ["residente"];
    return [];
  }, [role]);

  const canCreateAppUsers = accountRoles.length > 0;
  const isResidente = role === "residente";

  // Crear usuario con cuenta (Auth + users/{uid})
  const handleCreateAppUser = async (e) => {
    e.preventDefault();
    setAccErr("");
    setAccMsg("");

    if (!canCreateAppUsers) {
      setAccErr("No tienes permisos para crear cuentas de aplicación.");
      return;
    }
    if (!accountRoles.includes(accRole)) {
      setAccErr("Rol no permitido para tu nivel.");
      return;
    }

    try {
      // 1) Crear user en Firebase Auth y doc users/{uid}
      const uid = await createUserWithRole({
        email: accEmail,
        password: accPass,
        role: accRole,
        extra: {
          name: accName || "",
          createdBy: user?.uid || null,
        },
      });

      // 2) (Opcional) añadir datos extra al mismo doc
      await setDoc(
        doc(db, "users", uid),
        {
          name: accName || "",
          createdBy: user?.uid || null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setAccMsg(`Usuario ${accEmail} creado con rol ${accRole}.`);
      setAccName("");
      setAccEmail("");
      setAccPass("");
      setAccRole(accountRoles[0] || "residente");
    } catch (error) {
      console.error(error);
      setAccErr("No se pudo crear la cuenta. Revisa el correo/contraseña y vuelve a intentar.");
    }
  };

  // Crear ENCARGADO (sin cuenta de app)
  const handleCreateEncargado = async (e) => {
    e.preventDefault();
    setEncErr("");
    setEncMsg("");

    if (!isResidente) {
      setEncErr("Solo un Residente puede registrar encargados.");
      return;
    }
    try {
      const ref = await addDoc(collection(db, "workers"), {
        type: "encargado",
        name: encNombre,
        phone: encTelefono,
        cuadrilla: encCuadrilla || null,
        createdBy: user?.uid || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setEncMsg(`Encargado creado (ID: ${ref.id}).`);
      setEncNombre("");
      setEncTelefono("");
      setEncCuadrilla("");
    } catch (error) {
      console.error(error);
      setEncErr("No se pudo crear el encargado.");
    }
  };

  // Crear OBRERO (sin cuenta de app)
  const handleCreateObrero = async (e) => {
    e.preventDefault();
    setObErr("");
    setObMsg("");

    if (!isResidente) {
      setObErr("Solo un Residente puede registrar obreros.");
      return;
    }
    try {
      const ref = await addDoc(collection(db, "workers"), {
        type: "obrero",
        name: obNombre,
        phone: obTelefono,
        encargadoId: obEncargadoId || null,
        createdBy: user?.uid || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setObMsg(`Obrero creado (ID: ${ref.id}).`);
      setObNombre("");
      setObTelefono("");
      setObEncargadoId("");
    } catch (error) {
      console.error(error);
      setObErr("No se pudo crear el obrero.");
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h2>Registro</h2>
      <p>Tu rol: <b>{role || "..."}</b></p>

      {/* Bloque: crear cuentas de app (solo superadmin/admin) */}
      {canCreateAppUsers && (
        <section style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8, marginBottom: 24 }}>
          <h3>Crear cuenta de aplicación</h3>
          <form onSubmit={handleCreateAppUser}>
            <input
              type="text"
              placeholder="Nombre (opcional)"
              value={accName}
              onChange={(e) => setAccName(e.target.value)}
              style={{ display: "block", width: "100%", marginBottom: 8 }}
            />
            <input
              type="email"
              placeholder="Correo"
              value={accEmail}
              onChange={(e) => setAccEmail(e.target.value)}
              required
              style={{ display: "block", width: "100%", marginBottom: 8 }}
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={accPass}
              onChange={(e) => setAccPass(e.target.value)}
              required
              style={{ display: "block", width: "100%", marginBottom: 8 }}
            />
            <label style={{ display: "block", marginBottom: 8 }}>
              Rol a asignar:&nbsp;
              <select
                value={accRole}
                onChange={(e) => setAccRole(e.target.value)}
              >
                {accountRoles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <button type="submit">Crear cuenta</button>
          </form>
          {accMsg && <p style={{ color: "green" }}>{accMsg}</p>}
          {accErr && <p style={{ color: "crimson" }}>{accErr}</p>}
        </section>
      )}

      {/* Bloque: crear staff sin cuenta (solo residente) */}
      {isResidente && (
        <>
          <section style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8, marginBottom: 24 }}>
            <h3>Registrar Encargado (sin cuenta)</h3>
            <form onSubmit={handleCreateEncargado}>
              <input
                type="text"
                placeholder="Nombre del encargado"
                value={encNombre}
                onChange={(e) => setEncNombre(e.target.value)}
                required
                style={{ display: "block", width: "100%", marginBottom: 8 }}
              />
              <input
                type="tel"
                placeholder="Teléfono del encargado"
                value={encTelefono}
                onChange={(e) => setEncTelefono(e.target.value)}
                style={{ display: "block", width: "100%", marginBottom: 8 }}
              />
              <input
                type="text"
                placeholder="Cuadrilla (opcional)"
                value={encCuadrilla}
                onChange={(e) => setEncCuadrilla(e.target.value)}
                style={{ display: "block", width: "100%", marginBottom: 8 }}
              />
              <button type="submit">Crear encargado</button>
            </form>
            {encMsg && <p style={{ color: "green" }}>{encMsg}</p>}
            {encErr && <p style={{ color: "crimson" }}>{encErr}</p>}
          </section>

          <section style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
            <h3>Registrar Obrero (sin cuenta)</h3>
            <form onSubmit={handleCreateObrero}>
              <input
                type="text"
                placeholder="Nombre del obrero"
                value={obNombre}
                onChange={(e) => setObNombre(e.target.value)}
                required
                style={{ display: "block", width: "100%", marginBottom: 8 }}
              />
              <input
                type="tel"
                placeholder="Teléfono del obrero"
                value={obTelefono}
                onChange={(e) => setObTelefono(e.target.value)}
                style={{ display: "block", width: "100%", marginBottom: 8 }}
              />
              <input
                type="text"
                placeholder="ID Encargado (opcional)"
                value={obEncargadoId}
                onChange={(e) => setObEncargadoId(e.target.value)}
                style={{ display: "block", width: "100%", marginBottom: 8 }}
              />
              <button type="submit">Crear obrero</button>
            </form>
            {obMsg && <p style={{ color: "green" }}>{obMsg}</p>}
            {obErr && <p style={{ color: "crimson" }}>{obErr}</p>}
          </section>
        </>
      )}

      {!canCreateAppUsers && !isResidente && (
        <p style={{ opacity: 0.8 }}>
          No tienes permisos para registrar nuevos usuarios o staff desde esta sección.
        </p>
      )}
    </div>
  );
}
