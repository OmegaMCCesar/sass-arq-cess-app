import React, { useMemo, useState } from "react";
import BacheImageGenerator from "./BacheImageGenerator";
import styles from "../../styles/BacheList.module.css";

/* Helpers fecha */
function toDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (val?.seconds) return new Date(val.seconds * 1000);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

/* Helpers geométricos */
function polygonAreaMeters(vertices = []) {
  if (!Array.isArray(vertices) || vertices.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}
function verticesFromMedidas4(m) {
  const wTop = Number(m[0]) || 0;
  const hRight = Number(m[1]) || 0;
  const wBottom = Number(m[2]) || 0;
  const hLeft = Number(m[3]) || 0;
  const offset = (wTop - wBottom) / 2;
  return [
    { x: 0, y: 0 },
    { x: wTop, y: 0 },
    { x: offset + wBottom, y: hRight },
    { x: offset, y: hLeft },
  ];
}
function verticesFromMedidas3(m) {
  const baseTop = Number(m[0]) || 0;
  const hRight = Number(m[1]) || 0;
  const hLeft = Number(m[2]) || 0;
  const h = Math.max(hRight, hLeft);
  return [
    { x: 0, y: 0 },
    { x: baseTop, y: 0 },
    { x: baseTop / 2, y: h },
  ];
}
function parseMedidasText(text) {
  return (text || "")
    .split("\n").map((s) => s.trim()).filter(Boolean)
    .map((n) => parseFloat(n.replace(",", "."))).filter((v) => !isNaN(v));
}

export default function BacheList({
  rows,
  loading,
  onDelete,
  onUpdate,          // (id, partial)
  selectedBacheId,
  onSelectBache,
  onRequestMove,     // activa modo mover en mapa
}) {
  const [editId, setEditId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [drafts, setDrafts] = useState({});

  /* ===== Filtros por fecha ===== */
  const [filterMode, setFilterMode] = useState("all"); // all | today | range
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    if (filterMode === "all") return rows;
    const today = new Date();
    if (filterMode === "today") {
      return rows.filter((r) => {
        const d = toDate(r.createdAt);
        return d ? isSameDay(d, today) : false;
      });
    }
    // range
    const from = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    const to   = dateTo   ? new Date(dateTo   + "T23:59:59") : null;
    return rows.filter((r) => {
      const d = toDate(r.createdAt);
      if (!d) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [rows, filterMode, dateFrom, dateTo]);

  /* ===== Edición inline ===== */
  const startEdit = (r) => {
    setEditId(r.id);
    setDrafts((d) => ({
      ...d,
      [r.id]: {
        calle: r.calle || "",
        entreCallesText: Array.isArray(r.entreCalles) ? r.entreCalles.join(", ") : "",
        medidasText: Array.isArray(r.medidas) ? r.medidas.join("\n") : "",
        curbSide: r.curbSide || "",
      },
    }));
  };
  const cancelEdit = (id) => {
    setEditId(null);
    setDrafts((d) => { const c = { ...d }; delete c[id]; return c; });
  };
  const saveEdit = async (r) => {
    const d = drafts[r.id]; if (!d) return;
    const medidas = parseMedidasText(d.medidasText);
    if (medidas.length < 3) { alert("3 (triángulo) o 4 (trapecio) medidas"); return; }
    let forma, vertices;
    if (medidas.length === 3) { forma = "triangulo"; vertices = verticesFromMedidas3(medidas); }
    else { forma = "trapecio"; vertices = verticesFromMedidas4(medidas); }
    const area = polygonAreaMeters(vertices);
    const calle = (d.calle || "").trim();
    const entreCalles = (d.entreCallesText || "").split(",").map(s => s.trim()).filter(Boolean);

    const patch = { calle, entreCalles, medidas, forma, vertices, area, curbSide: d.curbSide || "" };
    try {
      setSavingId(r.id);
      await onUpdate(r.id, patch);
      setEditId(null);
      setDrafts((prev) => { const c = { ...prev }; delete c[r.id]; return c; });
    } catch (e) {
      console.error(e);
      alert(e?.message || "No se pudo guardar.");
    } finally { setSavingId(null); }
  };

  if (loading) return <p>Cargando...</p>;
  if (!rows?.length) return <p>No hay baches.</p>;

  return (
    <div>
      {/* ====== Controles de filtro ====== */}
      <div className={styles.filters}>
        <div className={styles.filterRow}>
          <label className={styles.filterLabel}>Filtro:</label>
          <select
            className={styles.input}
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="today">Hoy</option>
            <option value="range">Rango de fechas</option>
          </select>
        </div>

        {filterMode === "range" && (
          <div className={styles.filterRow}>
            <label className={styles.filterLabel}>De:</label>
            <input
              type="date"
              className={styles.input}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <label className={styles.filterLabel}>a</label>
            <input
              type="date"
              className={styles.input}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        )}
      </div>

      {filteredRows.map((r) => {
        const selected = r.id === selectedBacheId;
        const isEditing = editId === r.id;
        const draft = drafts[r.id] || {};
        const created = toDate(r.createdAt);

        return (
          <div key={r.id} id={`bache-card-${r.id}`} className={`${styles.card} ${selected ? styles.sel : ""}`}>
            <div>
              <BacheImageGenerator medidas={Array.isArray(r.medidas) ? r.medidas : null} forma="irregular" width={110} height={110} />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span className={styles.badgeNum}>{r.idx}</span>
                <strong>#{r.noBache}</strong>
                {!isEditing ? (
                  <>
                    <span> · {r.calle || "calle"}</span>
                    {r.entreCalles?.length ? <span> ({r.entreCalles.join(" y ")})</span> : null}
                    {r.pendingSync && <span style={{ marginLeft: 6, fontSize: 12, color: "#92400e" }}>(pendiente sync)</span>}
                  </>
                ) : (
                  <span style={{ color: "#6b7280" }}> (editando)</span>
                )}
              </div>

              {!isEditing ? (
                <>
                  <div className={styles.meta}>
                    <span>Forma: {r.forma}</span> · <span>Área: {r.area?.toFixed ? r.area.toFixed(2) : r.area} m²</span>
                    {created && <> · <span>{created.toLocaleDateString()}</span></>}
                  </div>
                  <div className={styles.meta}>
                    Lat/Lng: {r.coordenadas?.lat != null ? Number(r.coordenadas.lat).toFixed(6) : "—"},{" "}
                    {r.coordenadas?.lng != null ? Number(r.coordenadas.lng).toFixed(6) : "—"}
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className={styles.del} onClick={() => onSelectBache && onSelectBache(r.id)} title="Ver en mapa">
                      Ver en mapa
                    </button>
                    <button
                      className={styles.del}
                      onClick={() => onRequestMove && onRequestMove(r.id)}
                      title="Arrastrar pin en el mapa para ajustar"
                      style={{ background: "#fff7ed", borderColor: "#f59e0b", color: "#92400e" }}
                    >
                      Mover en mapa
                    </button>
                    <button
                      className={styles.del}
                      onClick={() => startEdit(r)}
                      title="Editar bache"
                      style={{ background: "#f5faff", borderColor: "#3b82f6", color: "#1e3a8a" }}
                    >
                      Editar
                    </button>
                    {onDelete && r.id && (
                      <button onClick={() => onDelete(r.id)} className={styles.del} title="Eliminar bache">
                        Eliminar
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label>
                    <div className={styles.meta}>Calle</div>
                    <input className={styles.input} value={draft.calle}
                      onChange={(e) => setDrafts((p) => ({ ...p, [r.id]: { ...p[r.id], calle: e.target.value } }))} />
                  </label>
                  <label>
                    <div className={styles.meta}>Entre calles (coma)</div>
                    <input className={styles.input} value={draft.entreCallesText}
                      onChange={(e) => setDrafts((p) => ({ ...p, [r.id]: { ...p[r.id], entreCallesText: e.target.value } }))} />
                  </label>
                  <label style={{ gridColumn: "1 / -1" }}>
                    <div className={styles.meta}>Medidas (una por línea)</div>
                    <textarea className={styles.textarea} rows={5} value={draft.medidasText}
                      onChange={(e) => setDrafts((p) => ({ ...p, [r.id]: { ...p[r.id], medidasText: e.target.value } }))} />
                    <div className={styles.meta} style={{ marginTop: 4 }}>
                      • 3 ➜ triángulo [baseTop, hRight, hLeft] · 4 ➜ trapecio [wTop, hRight, wBottom, hLeft]
                    </div>
                  </label>
                  <label>
                    <div className={styles.meta}>Banqueta/Guarnición</div>
                    <select className={styles.input} value={draft.curbSide}
                      onChange={(e) => setDrafts((p) => ({ ...p, [r.id]: { ...p[r.id], curbSide: e.target.value } }))}>
                      <option value="">Ninguna</option>
                      <option value="arriba">Arriba</option>
                      <option value="derecha">Derecha</option>
                      <option value="abajo">Abajo</option>
                      <option value="izquierda">Izquierda</option>
                      <option value="base">Base (triángulo)</option>
                    </select>
                  </label>
                  <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, marginTop: 4 }}>
                    <button className={styles.del} onClick={() => cancelEdit(r.id)}
                      style={{ background: "#f3f4f6", borderColor: "#9ca3af", color: "#111827" }}>
                      Cancelar
                    </button>
                    <button className={styles.del} onClick={() => saveEdit(r)} disabled={savingId === r.id}
                      style={{ background: "#ecfdf5", borderColor: "#10b981", color: "#065f46" }}>
                      {savingId === r.id ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
