import React, { useMemo, useState } from "react";
import BacheImageGenerator from "./BacheImageGenerator";
import styles from "../../styles/BacheList.module.css";

/* === Helpers geométricos (igual que en el resto de la app) === */
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
    .split("\n").map(s => s.trim()).filter(Boolean)
    .map(n => parseFloat(n.replace(",", ".")))
    .filter(v => !isNaN(v));
}

export default function BacheList({
  rows,
  loading,
  onDelete,
  selectedBacheId,
  onSelectBache,
  onUpdateBache, // (id, payload) => Promise<void>
}) {
  const [editId, setEditId] = useState(null);
  const [savingId, setSavingId] = useState(null);

  // Estado local de edición por tarjeta
  const [drafts, setDrafts] = useState({}); // { [id]: { calle, entreCallesText, medidasText, curbSide } }

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
    setDrafts((d) => {
      const copy = { ...d };
      delete copy[id];
      return copy;
    });
  };

  const saveEdit = async (r) => {
    const d = drafts[r.id];
    if (!d) return;

    // Recalcular medidas / vértices / área
    const medidas = parseMedidasText(d.medidasText);
    if (medidas.length < 3) {
      alert("Ingresa 3 (triángulo) o 4 (trapecio) medidas antes de guardar.");
      return;
    }

    let forma, vertices;
    if (medidas.length === 3) {
      forma = "triangulo";
      vertices = verticesFromMedidas3(medidas);
    } else {
      forma = "trapecio";
      vertices = verticesFromMedidas4(medidas);
    }
    const area = polygonAreaMeters(vertices);

    const calle = (d.calle || "").trim();
    const entreCalles = (d.entreCallesText || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      calle,
      entreCalles,
      medidas,
      forma,
      vertices,
      area,
      curbSide: d.curbSide || "",
    };

    try {
      setSavingId(r.id);
      if (onUpdateBache) {
        await onUpdateBache(r.id, payload);
      }
      setEditId(null);
      setDrafts((prev) => {
        const copy = { ...prev };
        delete copy[r.id];
        return copy;
      });
    } catch (e) {
      console.error(e);
      alert(e?.message || "No se pudo guardar la edición.");
    } finally {
      setSavingId(null);
    }
  };

  const isSelected = useMemo(() => {
    const s = new Set([selectedBacheId]);
    return (id) => s.has(id);
  }, [selectedBacheId]);

  if (loading) return <p>Cargando...</p>;
  if (!rows?.length) return <p>No hay baches.</p>;

  return (
    <div>
      {rows.map((r) => {
        const selected = isSelected(r.id);
        const isEditing = editId === r.id;
        const draft = drafts[r.id] || {};

        return (
          <div
            key={r.id || `${r.calle}-${r.noBache}`}
            id={`bache-card-${r.id}`}
            className={`${styles.card} ${selected ? styles.sel : ""}`}
          >
            <div>
              <BacheImageGenerator
                medidas={Array.isArray(r.medidas) ? r.medidas : null}
                forma="irregular"
                width={110}
                height={110}
              />
            </div>

            <div>
              {/* Encabezado con número + nombre */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span className={styles.badgeNum}>{r.idx}</span>
                <strong>#{r.noBache}</strong>
                {!isEditing ? (
                  <>
                    <span> · {r.calle || "calle"}</span>
                    {r.entreCalles?.length ? <span> ({r.entreCalles.join(" y ")})</span> : null}
                  </>
                ) : (
                  <span style={{ color: "#6b7280" }}> (editando)</span>
                )}
              </div>

              {/* Modo lectura */}
              {!isEditing && (
                <>
                  <div className={styles.meta}>
                    Forma: {r.forma} · Área: {r.area?.toFixed ? r.area.toFixed(2) : r.area} m²
                  </div>
                  <div className={styles.meta}>
                    Lat/Lng:{" "}
                    {r.coordenadas?.lat != null ? Number(r.coordenadas.lat).toFixed(6) : "—"},{" "}
                    {r.coordenadas?.lng != null ? Number(r.coordenadas.lng).toFixed(6) : "—"}
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className={styles.del}
                      onClick={() => onSelectBache && onSelectBache(r.id)}
                      title="Ver este bache en el mapa"
                    >
                      Ver en mapa
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
                      <button
                        onClick={() => onDelete(r.id)}
                        className={styles.del}
                        title="Eliminar bache"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Modo edición */}
              {isEditing && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label>
                    <div className={styles.meta}>Calle</div>
                    <input
                      className={styles.input}
                      value={draft.calle}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [r.id]: { ...prev[r.id], calle: e.target.value } }))
                      }
                    />
                  </label>

                  <label>
                    <div className={styles.meta}>Entre calles (coma)</div>
                    <input
                      className={styles.input}
                      value={draft.entreCallesText}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [r.id]: { ...prev[r.id], entreCallesText: e.target.value } }))
                      }
                      placeholder="Calle 1, Calle 2"
                    />
                  </label>

                  <label style={{ gridColumn: "1 / -1" }}>
                    <div className={styles.meta}>Medidas (una por línea)</div>
                    <textarea
                      className={styles.textarea}
                      rows={5}
                      value={draft.medidasText}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [r.id]: { ...prev[r.id], medidasText: e.target.value } }))
                      }
                      placeholder={"Triángulo:\n3\n2\n2\n\nTrapecio:\n2\n3\n5\n3"}
                    />
                    <div className={styles.meta} style={{ marginTop: 4 }}>
                      • 3 medidas ➜ triángulo [baseTop, hRight, hLeft] · 4 medidas ➜ trapecio [wTop, hRight, wBottom, hLeft]
                    </div>
                  </label>

                  <label>
                    <div className={styles.meta}>Banqueta/Guarnición (opcional)</div>
                    <select
                      className={styles.input}
                      value={draft.curbSide}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [r.id]: { ...prev[r.id], curbSide: e.target.value } }))
                      }
                    >
                      <option value="">Ninguna</option>
                      <option value="arriba">Arriba</option>
                      <option value="derecha">Derecha</option>
                      <option value="abajo">Abajo</option>
                      <option value="izquierda">Izquierda</option>
                      <option value="base">Base (triángulo)</option>
                    </select>
                  </label>

                  <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, marginTop: 4 }}>
                    <button
                      className={styles.del}
                      onClick={() => cancelEdit(r.id)}
                      title="Cancelar edición"
                      style={{ background: "#f3f4f6", borderColor: "#9ca3af", color: "#111827" }}
                    >
                      Cancelar
                    </button>
                    <button
                      className={styles.del}
                      onClick={() => saveEdit(r)}
                      disabled={savingId === r.id}
                      title="Guardar cambios"
                      style={{ background: "#ecfdf5", borderColor: "#10b981", color: "#065f46" }}
                    >
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
