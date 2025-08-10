import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  createBache, listBachesByResidente, listAllBaches,
  updateBache, uploadEvidence
} from "../../services/bachesService";
import { listCuadrillas, listEncargados } from "../../services/cuadrillasService";

const STATUSES = ["registrado", "iniciado", "en-proceso", "terminado"];

export default function BachesPage() {
  const { user, role } = useAuth();
  const canSeeAll = useMemo(() => ["admin","superadmin"].includes(role), [role]);

  // Crear bache
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cuadrillaId, setCuadrillaId] = useState("");
  const [encargadoId, setEncargadoId] = useState("");

  // Listado
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Select data
  const [cuadrillas, setCuadrillas] = useState([]);
  const [encargados, setEncargados] = useState([]);

  // Upload refs por fila
  const beforeRefs = useRef({});
  const duringRefs = useRef({});
  const afterRefs = useRef({});

  const refresh = async () => {
    if (!user) return;
    setLoading(true); setErr(""); setMsg("");
    try {
      const data = canSeeAll ? await listAllBaches() : await listBachesByResidente(user.uid);
      setRows(data);
    } catch (e) {
      console.error(e);
      setErr("No se pudieron cargar los baches.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [cs, es] = await Promise.all([listCuadrillas(), listEncargados()]);
        setCuadrillas(cs);
        setEncargados(es);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => { refresh(); }, [user, role]); // refresca al cambiar usuario/rol

  const onCreate = async (e) => {
    e.preventDefault();
    if (!user) return setErr("Debes iniciar sesión.");
    setErr(""); setMsg("");
    try {
      const id = await createBache({
        title: title || `Bache ${Date.now()}`,
        description: description || "",
        projectId: null,
        residenteUid: user.uid,
        cuadrillaId: cuadrillaId || null,
        encargadoId: encargadoId || null,
        status: "registrado"
      });
      setTitle(""); setDescription(""); setCuadrillaId(""); setEncargadoId("");
      setMsg(`Bache creado (${id}).`);
      refresh();
    } catch (e) {
      console.error(e);
      setErr(e?.message || "No se pudo crear el bache.");
    }
  };

  const changeStatus = async (id, status) => {
    try {
      await updateBache(id, { status });
      setMsg("Estado actualizado.");
      refresh();
    } catch (e) {
      console.error(e);
      setErr("No se pudo actualizar el estado.");
    }
  };

  const doUpload = async (id, phase) => {
    setErr(""); setMsg("");
    const map = phase === "before" ? beforeRefs.current :
                phase === "after" ? afterRefs.current : duringRefs.current;
    const input = map[id];
    if (!input || !input.files || !input.files[0]) {
      setErr("Selecciona un archivo primero.");
      return;
    }
    const file = input.files[0];
    try {
      await uploadEvidence({ bacheId: id, phase, file });
      setMsg("Evidencia subida.");
      input.value = "";
      refresh();
    } catch (e) {
      console.error(e);
      setErr("No se pudo subir la evidencia.");
    }
  };

  const StatusButtons = ({ row }) => {
    const idx = STATUSES.indexOf(row.status || "registrado");
    return (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {STATUSES.map((s, i) => (
          <button
            key={s}
            disabled={i < idx} // no puedes retroceder
            onClick={() => changeStatus(row.id, s)}
            style={{ opacity: i === idx ? 1 : 0.7 }}
            title={i < idx ? "No se puede retroceder" : (i === idx ? "Estado actual" : "Cambiar a " + s)}
          >
            {s}
          </button>
        ))}
      </div>
    );
  };

  const EvidenceUploader = ({ row }) => (
    <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
      <div>
        <label style={{ display: "block", fontWeight: 600 }}>Antes (before):</label>
        <input type="file" accept="image/*" ref={el => beforeRefs.current[row.id] = el} />
        <button onClick={() => doUpload(row.id, "before")} style={{ marginTop: 6 }}>Subir</button>
        {row.photos?.before && <div><a href={row.photos.before} target="_blank" rel="noreferrer">Ver imagen</a></div>}
      </div>
      <div>
        <label style={{ display: "block", fontWeight: 600 }}>Proceso (during):</label>
        <input type="file" accept="image/*" ref={el => duringRefs.current[row.id] = el} />
        <button onClick={() => doUpload(row.id, "during")} style={{ marginTop: 6 }}>Subir</button>
        {Array.isArray(row.photos?.during) && row.photos.during.length > 0 && (
          <ul style={{ marginTop: 6 }}>
            {row.photos.during.map((u, i) => (
              <li key={i}><a href={u} target="_blank" rel="noreferrer">Ver {i+1}</a></li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <label style={{ display: "block", fontWeight: 600 }}>Final (after):</label>
        <input type="file" accept="image/*" ref={el => afterRefs.current[row.id] = el} />
        <button onClick={() => doUpload(row.id, "after")} style={{ marginTop: 6 }}>Subir</button>
        {row.photos?.after && <div><a href={row.photos.after} target="_blank" rel="noreferrer">Ver imagen</a></div>}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: "30px auto", padding: 16 }}>
      <h2>Baches / Tareas</h2>

      {/* Crear bache */}
      <form onSubmit={onCreate} style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 12 }}>
        <input placeholder="Título" value={title} onChange={(e)=>setTitle(e.target.value)} />
        <input placeholder="Descripción (opcional)" value={description} onChange={(e)=>setDescription(e.target.value)} />
        <select value={cuadrillaId} onChange={(e)=>setCuadrillaId(e.target.value)}>
          <option value="">(Cuadrilla — opcional)</option>
          {cuadrillas.map(c => (
            <option key={c.id} value={c.id}>{(c.number ?? "—")} · {c.name}</option>
          ))}
        </select>
        <select value={encargadoId} onChange={(e)=>setEncargadoId(e.target.value)}>
          <option value="">(Encargado — opcional)</option>
          {encargados.map(en => (
            <option key={en.id} value={en.id}>{en.name || "(sin nombre)"} — {en.id}</option>
          ))}
        </select>
        <div>
          <button type="submit">Crear bache</button>
        </div>
      </form>

      {msg && <p style={{ color:"green" }}>{msg}</p>}
      {err && <p style={{ color:"crimson" }}>{err}</p>}

      {/* Tabla */}
      <div style={{ overflowX: "auto", marginTop: 8 }}>
        <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f4f6f8" }}>
              <th align="left">Título</th>
              <th align="left">Residente</th>
              <th align="left">Cuadrilla</th>
              <th align="left">Encargado</th>
              <th align="left">Estado</th>
              <th align="left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td>{r.title}</td>
                <td style={{ fontFamily: "monospace" }}>{r.residenteUid}</td>
                <td style={{ fontFamily: "monospace" }}>{r.cuadrillaId || "-"}</td>
                <td style={{ fontFamily: "monospace" }}>{r.encargadoId || "-"}</td>
                <td><b>{r.status}</b></td>
                <td><StatusButtons row={r} /></td>
              </tr>
            ))}
            {!rows.length && !loading && <tr><td colSpan="6" style={{ textAlign:"center", padding: 16 }}>Sin baches</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Evidencias por fila */}
      {rows.map(r => (
        <div key={r.id} style={{ border:"1px solid #e5e7eb", borderRadius: 8, padding: 12, marginTop: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{r.title} — Evidencias</div>
          <EvidenceUploader row={r} />
        </div>
      ))}
    </div>
  );
}
