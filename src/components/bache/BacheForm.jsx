import React, { useMemo } from "react";
import BacheImageGenerator from "./BacheImageGenerator";
import styles from "../../styles/BacheForm.module.css";

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
  autoFilledCalle,
  setAutoFilledCalle,
  autoFilledEntre,
  setAutoFilledEntre,
  isSubmitting,   
}) {
  const medidas = useMemo(() => {
    return (data.medidasText || "")
      .split("\n").map((s) => s.trim()).filter(Boolean)
      .map((n) => parseFloat(n.replace(",", "."))).filter((v) => !isNaN(v));
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
    <form onSubmit={onSubmit} className={styles.form}>
      <div className={styles.grid}>
        {/* IZQ: datos */}
        <div className={styles.left}>
          <label className={styles.label}>
            Calle principal
            <div className={styles.inputRow}>
              <input
                className={styles.input}
                value={data.calle || ""}
                onChange={(e) => {
                  onChange({ ...data, calle: e.target.value });
                  if (autoFilledCalle) setAutoFilledCalle(false);
                }}
                placeholder="Av. Principal"
              />
              {autoFilledCalle && <span className={styles.badge}>autocompletado</span>}
            </div>
          </label>

          <label className={styles.label}>
            Entre calles (separadas por coma)
            <div className={styles.inputRow}>
              <input
                className={styles.input}
                value={(Array.isArray(data.entreCalles) ? data.entreCalles : []).join(", ")}
                onChange={(e) => {
                  onChange({
                    ...data,
                    entreCalles: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  });
                  if (autoFilledEntre) setAutoFilledEntre(false);
                }}
                placeholder="Calle 1, Calle 2"
              />
              {autoFilledEntre && <span className={styles.badge}>autocompletado</span>}
            </div>
          </label>

          <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
            Medidas (una por línea).
            <div className={styles.help}>
              • Con <strong>3</strong>: triángulo → <code>[baseTop, hRight, hLeft]</code><br />
              • Con <strong>4</strong>: trapecio → <code>[wTop, hRight, wBottom, hLeft]</code>
            </div>
            <textarea
              className={styles.textarea}
              rows={6}
              placeholder={"Triángulo:\n3\n2\n2\n\nTrapecio:\n2\n3\n5\n3"}
              value={data.medidasText || ""}
              onChange={(e) => onChange({ ...data, medidasText: e.target.value })}
            />
          </label>

          <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
            Lado pegado a banqueta/guarnición (opcional)
            <select
              className={styles.select}
              value={data.curbSide || ""}
              onChange={(e) => onChange({ ...data, curbSide: e.target.value })}
            >
              {curbOptions.map((opt) => (
                <option key={opt.v} value={opt.v}>{opt.t}</option>
              ))}
            </select>
          </label>

          <div className={styles.locRow}>
            <button
              type="button"
              className={styles.btn}
              onClick={onGetLocation}
              disabled={!isGeolocationAvailable || locating}
            >
              {locating ? "Obteniendo ubicación..." : "Obtener ubicación"}
            </button>
            {locating && <span className={styles.spinner} />}
            <span style={{ fontSize: 12 }}>
              {!isGeolocationAvailable ? "GPS no disponible" :
               !isGeolocationEnabled ? "Permiso deshabilitado" :
               coords ? `OK (${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)})` :
               locating ? "buscando..." : "pendiente"}
            </span>
          </div>

          <div className={styles.areaText}>
            {verts ? (
              <span><strong>Área estimada:</strong> {area.toFixed(2)} m²</span>
            ) : (
              <span>Ingresa 3 (triángulo) o 4 (trapecio) medidas.</span>
            )}
          </div>

           <button
      className={`${styles.btn} ${styles.submit}`}
      type="submit"
      disabled={!Boolean(verts && coords) || isSubmitting}
    >
      {isSubmitting ? "Guardando..." :
        (Boolean(verts && coords) ? "Agregar bache" : "Agrega medidas y ubicación para continuar")}
    </button>
        </div>

        {/* DER: vista previa */}
        <div>
          <div className={styles.previewTitle}>Vista previa (2D)</div>
          <BacheImageGenerator
            forma="irregular"
            medidas={medidas}
            curbSide={data.curbSide || ""}
            width={420}
            height={420}
          />
          <div className={styles.previewHint}>
            * El borde punteado indica el lado contiguo a la banqueta/guarnición.
          </div>
        </div>
      </div>
    </form>
  );
}
