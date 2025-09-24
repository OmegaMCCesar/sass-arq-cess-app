import React, { useMemo } from "react";
import BacheImageGenerator from "./BacheImageGenerator";

/* Helpers locales para área previa */
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

export default function BacheForm({
  data,
  onChange,
  onSubmit,
  isGeolocationAvailable,
  isGeolocationEnabled,
  coords,
  locating,
  onGetLocation,

  // badges de autocompletado
  autoFilledCalle,
  setAutoFilledCalle,
  autoFilledEntre,
  setAutoFilledEntre,
}) {
  // Medidas: una por línea. Acepta "2,5" o "2.5"
  const medidas = useMemo(() => {
    return (data.medidasText || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((n) => parseFloat(n.replace(",", ".")))
      .filter((v) => !isNaN(v));
  }, [data.medidasText]);

  const verts = useMemo(() => {
    if (medidas.length >= 4) return verticesFromMedidas4(medidas);
    if (medidas.length === 3) return verticesFromMedidas3(medidas);
    return null;
  }, [medidas]);

  const area = useMemo(() => (verts ? polygonAreaMeters(verts) : 0), [verts]);

  const curbOptions = useMemo(() => {
    if (medidas.length === 3) {
      return [
        { v: "", t: "Ninguna" },
        { v: "base", t: "Base (arriba)" },
        { v: "derecha", t: "Lado derecho" },
        { v: "izquierda", t: "Lado izquierdo" },
      ];
    }
    if (medidas.length >= 4) {
      return [
        { v: "", t: "Ninguna" },
        { v: "arriba", t: "Arriba" },
        { v: "derecha", t: "Derecha" },
        { v: "abajo", t: "Abajo" },
        { v: "izquierda", t: "Izquierda" },
      ];
    }
    return [{ v: "", t: "Ninguna" }];
  }, [medidas.length]);

  const canSubmit = Boolean(verts && coords);

  return (
    <form
      onSubmit={onSubmit}
      style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8, marginTop: 10 }}
    >
      <style>{`
        .spinner {
          width: 16px; height: 16px; border: 2px solid #ddd; border-top-color: #333;
          border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite; margin-left: 8px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .badge {
          display: inline-block; margin-left: 6px; padding: 2px 6px; font-size: 11px;
          border-radius: 999px; background: #eef6ff; color: #0366d6; border: 1px solid #c8e1ff;
        }
        .input-row {
          display: flex; align-items: center; gap: 8px;
        }
        .input-row input {
          flex: 1;
        }
      `}</style>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        {/* Lado izquierdo: datos del bache */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            Calle principal
            <div className="input-row">
              <input
                value={data.calle || ""}
                onChange={(e) => {
                  onChange({ ...data, calle: e.target.value });
                  if (autoFilledCalle) setAutoFilledCalle(false); // al editar, quitar badge
                }}
                placeholder="Av. Principal"
              />
              {autoFilledCalle && <span className="badge">autocompletado</span>}
            </div>
          </label>

          <label>
            Entre calles (separadas por coma)
            <div className="input-row">
              <input
                value={(Array.isArray(data.entreCalles) ? data.entreCalles : []).join(", ")}
                onChange={(e) => {
                  onChange({
                    ...data,
                    entreCalles: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  });
                  if (autoFilledEntre) setAutoFilledEntre(false); // al editar, quitar badge
                }}
                placeholder="Calle 1, Calle 2"
              />
              {autoFilledEntre && <span className="badge">autocompletado</span>}
            </div>
          </label>

          {/* Medidas por línea */}
          <label style={{ gridColumn: "1 / span 2" }}>
            Medidas (una por línea).
            <div style={{ fontSize: 12, opacity: 0.8, margin: "4px 0" }}>
              • Con <strong>3</strong>: triángulo → <code>[baseTop, hRight, hLeft]</code><br/>
              • Con <strong>4</strong>: trapecio → <code>[wTop, hRight, wBottom, hLeft]</code>
            </div>
            <textarea
              rows={6}
              placeholder={"Triángulo:\n3\n2\n2\n\nTrapecio:\n2\n3\n5\n3"}
              value={data.medidasText || ""}
              onChange={(e) => onChange({ ...data, medidasText: e.target.value })}
            />
          </label>

          {/* Selector de banqueta/guarnición */}
          <label style={{ gridColumn: "1 / span 2" }}>
            Lado pegado a banqueta/guarnición (opcional)
            <select
              value={data.curbSide || ""}
              onChange={(e) => onChange({ ...data, curbSide: e.target.value })}
            >
              {curbOptions.map(opt => (
                <option key={opt.v} value={opt.v}>{opt.t}</option>
              ))}
            </select>
          </label>

          {/* Ubicación con botón manual + spinner */}
          <div style={{ gridColumn: "1 / span 2", display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" onClick={onGetLocation} disabled={!isGeolocationAvailable || locating}>
              {locating ? "Obteniendo ubicación..." : "Obtener ubicación"}
            </button>
            {locating && <span className="spinner" />}
            <span style={{ fontSize: 12 }}>
              Estado ubicación:{" "}
              {!isGeolocationAvailable ? "no disponible" :
                !isGeolocationEnabled ? "deshabilitada" :
                  coords ? `OK (${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)})` :
                    locating ? "buscando..." : "pendiente"}
            </span>
          </div>

          {/* Área estimada */}
          <div style={{ gridColumn: "1 / span 2", fontSize: 14 }}>
            {verts ? (
              <span><strong>Área estimada:</strong> {area.toFixed(2)} m²</span>
            ) : (
              <span>Ingresa 3 (triángulo) o 4 (trapecio) medidas.</span>
            )}
          </div>

          <button type="submit" style={{ marginTop: 10 }} disabled={!canSubmit}>
            {canSubmit ? "Agregar bache" : "Agrega medidas y ubicación para continuar"}
          </button>
        </div>

        {/* Lado derecho: vista previa 2D */}
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Vista previa (2D)</div>
          <BacheImageGenerator
            forma="irregular"
            medidas={medidas}
            curbSide={data.curbSide || ""}
            width={420}
            height={420}
          />
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
            * El borde punteado indica el lado contiguo a la banqueta/guarnición.
          </div>
        </div>
      </div>
    </form>
  );
}
