import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  listCuadrillas,
  createCuadrilla,
  updateCuadrilla,
  removeCuadrilla,
  listObreros,
  listEncargados,
  addMembersToCuadrilla,
  removeMemberFromCuadrilla,
} from "../../services/cuadrillasService";

export default function Cuadrillas() {
  const { user, role } = useAuth();

  const [items, setItems] = useState([]);
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [encargadoId, setEncargadoId] = useState("");
  const [encargados, setEncargados] = useState([]);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Miembros - panel
  const [showMembersFor, setShowMembersFor] = useState(null);
  const [obreros, setObreros] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const canEdit = useMemo(() => ['residente','admin','superadmin'].includes(role), [role]);

  async function refresh() {
    try {
      const [data, encs] = await Promise.all([
        listCuadrillas(),
        listEncargados()
      ]);
      setItems(data);
      setEncargados(encs);
    } catch (e) {
      console.error(e);
      setErr("No se pudieron cargar las cuadrillas.");
    }
  }

  useEffect(() => { refresh(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      await createCuadrilla({
        number: number ? Number(number) : null,
        name,
        encargadoId: encargadoId || null,
        members: [],
        projectId: null,
        createdBy: user?.uid,
      });
      setNumber(""); setName(""); setEncargadoId("");
      setMsg("Cuadrilla creada.");
      refresh();
    } catch (e) {
      console.error(e);
      setErr("No se pudo crear la cuadrilla.");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      await updateCuadrilla(editing.id, {
        number: number ? Number(number) : null,
        name,
        encargadoId: encargadoId || null
      });
      setEditing(null); setNumber(""); setName(""); setEncargadoId("");
      setMsg("Cuadrilla actualizada.");
      refresh();
    } catch (e) {
      console.error(e);
      setErr("No se pudo actualizar.");
    }
  };

  const handleEdit = (it) => {
    setEditing(it);
    setNumber(it.number || "");
    setName(it.name || "");
    setEncargadoId(it.encargadoId || "");
  };

  const handleDelete = async (id) => {
    try {
      await removeCuadrilla(id);
      refresh();
    } catch (e) {
      console.error(e);
      setErr("No se pudo eliminar.");
    }
  };

  const openMembers = async (cuadrilla) => {
    setErr(""); setMsg("");
    setShowMembersFor(cuadrilla);
    try {
      const ws = await listObreros();
      setObreros(ws);
      setSelectedIds(Array.isArray(cuadrilla.members) ? cuadrilla.members : []);
    } catch (e) {
      console.error(e);
      setErr("No se pudieron cargar los obreros.");
    }
  };

  const toggleSelected = (workerId) => {
    setSelectedIds(prev =>
      prev.includes(workerId) ? prev.filter(id => id !== workerId) : [...prev, workerId]
    );
  };

  const saveMembers = async () => {
    if (!showMembersFor) return;
    setErr(""); setMsg("");
    const current = Array.isArray(showMembersFor.members) ? showMembersFor.members : [];
    const toAdd = selectedIds.filter(id => !current.includes(id));
    const toRemove = current.filter(id => !selectedIds.includes(id));

    try {
      if (toAdd.length) {
        await addMembersToCuadrilla(showMembersFor.id, toAdd);
      }
      for (const id of toRemove) {
        await removeMemberFromCuadrilla(showMembersFor.id, id);
      }
      setMsg("Miembros actualizados.");
      setShowMembersFor(null);
      setSelectedIds([]);
      await refresh();
    } catch (e) {
      console.error(e);
      setErr("No se pudieron actualizar los miembros.");
    }
  };

  return (
    <div style={{ maxWidth: 980, margin: "30px auto", padding: 16 }}>
      <h2>Cuadrillas</h2>

      {canEdit && (
        <form onSubmit={editing ? handleUpdate : handleCreate} style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="number"
            placeholder="Número"
            value={number}
            onChange={(e)=>setNumber(e.target.value)}
            style={{ width: 140 }}
          />
          <input
            placeholder="Nombre"
            value={name}
            onChange={(e)=>setName(e.target.value)}
            required
            style={{ minWidth: 220 }}
          />
          <select
            value={encargadoId}
            onChange={(e)=>setEncargadoId(e.target.value)}
            style={{ minWidth: 260 }}
          >
            <option value="">(sin encargado)</option>
            {encargados.map(en => (
              <option key={en.id} value={en.id}>
                {en.name || "(sin nombre)"} — {en.id}
              </option>
            ))}
          </select>
          <button type="submit">{editing ? "Actualizar" : "Crear"}</button>
          {editing && (
            <button type="button" onClick={()=>{ setEditing(null); setNumber(''); setName(''); setEncargadoId(''); }}>
              Cancelar
            </button>
          )}
      </form>
      )}

      {msg && <p style={{ color: "green" }}>{msg}</p>}
      {err && <p style={{ color: "crimson" }}>{err}</p>}

      <div style={{ overflowX: "auto" }}>
        <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f4f6f8" }}>
              <th align="left">#</th>
              <th align="left">Nombre</th>
              <th align="left">EncargadoId</th>
              <th align="left">Miembros</th>
              <th align="left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td>{it.number ?? "-"}</td>
                <td>{it.name}</td>
                <td>{it.encargadoId || "-"}</td>
                <td>{Array.isArray(it.members) ? it.members.length : 0}</td>
                <td>
                  {canEdit && (
                    <>
                      <button onClick={()=>handleEdit(it)}>Editar</button>
                      <button onClick={()=>handleDelete(it.id)} style={{ marginLeft: 8 }}>Eliminar</button>
                      <button onClick={()=>openMembers(it)} style={{ marginLeft: 8 }}>
                        Gestionar miembros
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 16 }}>Sin cuadrillas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Panel simple para miembros */}
      {showMembersFor && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.35)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16
        }}>
          <div style={{ background: "#fff", borderRadius: 10, width: "min(800px, 100%)", padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Miembros de: {showMembersFor.name}</h3>

            <div style={{ maxHeight: "50vh", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }}>
              {obreros.map(w => (
                <label key={w.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(w.id)}
                    onChange={() => toggleSelected(w.id)}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>{w.name || "(sin nombre)"}</div>
                    <div style={{ fontSize: 12, opacity: .7 }}>
                      {w.phone ? `Tel: ${w.phone}` : "—"} · id: {w.id}
                    </div>
                  </div>
                </label>
              ))}
              {!obreros.length && <div style={{ padding: 12, textAlign: "center" }}>No hay obreros registrados.</div>}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button onClick={()=>{ setShowMembersFor(null); setSelectedIds([]); }}>Cancelar</button>
              <button onClick={saveMembers}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
