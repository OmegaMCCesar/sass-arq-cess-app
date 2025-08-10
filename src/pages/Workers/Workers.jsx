import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { listWorkers, createWorker, updateWorker, deleteWorker } from "../../services/workersService";

export default function WorkersPage() {
  const { user, role } = useAuth();
  const canManage = useMemo(() => ["residente","admin","superadmin"].includes(role), [role]);

  const [filter, setFilter] = useState("obrero"); // vista por defecto
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // formulario
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [encargadoId, setEncargadoId] = useState("");
  const [editing, setEditing] = useState(null);

  async function refresh() {
    try {
      setErr(""); setMsg("");
      const data = await listWorkers(filter || undefined);
      setRows(data);
    } catch (e) {
      console.error(e);
      setErr("No se pudo cargar el personal.");
    }
  }

  useEffect(() => { refresh(); }, [filter]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) return setErr("No tienes permisos.");
    try {
      if (editing) {
        await updateWorker(editing.id, {
          name, phone, encargadoId: filter === "obrero" ? (encargadoId || null) : null
        });
        setMsg("Actualizado.");
      } else {
        await createWorker({
          type: filter,
          name, phone,
          encargadoId: filter === "obrero" ? (encargadoId || null) : null,
          createdBy: user?.uid,
          createdByEmail: user?.email || null,
          createdByRole: role || null,
        });
        setMsg("Creado.");
      }
      setName(""); setPhone(""); setEncargadoId(""); setEditing(null);
      refresh();
    } catch (e) {
      console.error(e);
      setErr(e?.message || "No se pudo guardar.");
    }
  };

  const onEdit = (r) => {
    setEditing(r);
    setName(r.name || "");
    setPhone(r.phone || "");
    setEncargadoId(r.encargadoId || "");
  };

  const onDelete = async (id) => {
    if (!canManage) return setErr("No tienes permisos.");
    try {
      await deleteWorker(id);
      refresh();
    } catch (e) {
      console.error(e);
      setErr("No se pudo eliminar.");
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: "30px auto", padding: 16 }}>
      <h2>Staff</h2>

      {/* Filtro tipo */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <label>Ver:</label>
        <select value={filter} onChange={(e)=>setFilter(e.target.value)}>
          <option value="encargado">Encargados</option>
          <option value="obrero">Obreros</option>
        </select>
      </div>

      {/* Formulario */}
      {canManage && (
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: 12 }}>
          <input placeholder={`Nombre de ${filter}`} value={name} onChange={(e)=>setName(e.target.value)} required />
          <input placeholder="Teléfono (opcional)" value={phone} onChange={(e)=>setPhone(e.target.value)} />
          {filter === "obrero" && (
            <input placeholder="ID Encargado (opcional)" value={encargadoId} onChange={(e)=>setEncargadoId(e.target.value)} />
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit">{editing ? "Actualizar" : "Crear"}</button>
            {editing && <button type="button" onClick={()=>{ setEditing(null); setName(""); setPhone(""); setEncargadoId(""); }}>Cancelar</button>}
          </div>
        </form>
      )}

      {msg && <p style={{ color: "green" }}>{msg}</p>}
      {err && <p style={{ color: "crimson" }}>{err}</p>}

      {/* Tabla mínima */}
      <div style={{ overflowX: "auto" }}>
        <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f4f6f8" }}>
              <th align="left">Nombre</th>
              <th align="left">Teléfono</th>
              {filter === "obrero" && <th align="left">EncargadoId</th>}
              <th align="left">ID</th>
              <th align="left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td>{r.name || "-"}</td>
                <td>{r.phone || "-"}</td>
                {filter === "obrero" && <td>{r.encargadoId || "-"}</td>}
                <td style={{ fontFamily: "monospace" }}>{r.id}</td>
                <td>
                  {canManage && (
                    <>
                      <button onClick={()=>onEdit(r)}>Editar</button>
                      <button onClick={()=>onDelete(r.id)} style={{ marginLeft: 8 }}>Eliminar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={filter === "obrero" ? 5 : 4} style={{ textAlign: "center", padding: 16 }}>Sin registros</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
