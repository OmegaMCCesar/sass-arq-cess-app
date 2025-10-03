import React, { useMemo } from "react";
import BacheImageGenerator from "./BacheImageGenerator";
import styles from "../../styles/BacheForm.module.css";

/* Helpers área simple para vista previa */
function polygonAreaMeters(vertices = []) {
  if (!Array.isArray(vertices) || vertices.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}
function vertsFromMedidas(medidas = []) {
  if (medidas.length === 3) {
    const [baseTop = 0, hRight = 0, hLeft = 0] = medidas.map(Number);
    const h = Math.max(hRight, hLeft);
    return [
      { x: 0, y: 0 },
      { x: baseTop, y: 0 },
      { x: baseTop / 2, y: h },
    ];
  }
  if (medidas.length >= 4) {
    const [wTop = 0, hRight = 0, wBottom = 0, hLeft = 0] = medidas.map(Number);
    const offset = (wTop - wBottom) / 2;
    return [
      { x: 0, y: 0 },
      { x: wTop, y: 0 },
      { x: offset + wBottom, y: hRight },
      { x: offset, y: hLeft },
    ];
  }
  return [];
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
  const medidas = useMemo(() =>
    (data.medidasText || "")
      .split("\n").map((s) => s.trim()).filter(Boolean)
      .map((n) => parseFloat(n.replace(",", "."))).filter((v) => !isNaN(v)),
    [data.medidasText]
  );
  const verts = useMemo(() => vertsFromMedidas(medidas), [medidas]);
  const area = useMemo(() => polygonAreaMeters(verts), [verts]);

  const canSubmit = medidas.length >= 3 && !!coords && !isSubmitting;

  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <div className={styles.grid}>
        {/* Lado izquierdo */}
        <div className={styles.left}>
          <label className={styles.label}>
            Calle principal
            <div className={styles.inputRow}>
              <input
                className={styles.input}
                value={data.calle || ""}
                onChange={(e) => { onChange({ ...data, calle: e.target.value }); setAutoFilledCalle(false); }}
                placeholder="Av. Principal"
              />
              {autoFilledCalle && <span className={styles.badge}>auto</span>}
            </div>
          </label>

          <label className={styles.label}>
            Entre calles (separadas por coma)
            <div className={styles.inputRow}>
              <input
                className={styles.input}
                value={(data.entreCalles || []).join(", ")}
                onChange={(e) =>
                  onChange({
                    ...data,
                    entreCalles: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="Calle 1, Calle 2"
              />
              {autoFilledEntre && <span className={styles.badge}>auto</span>}
            </div>
          </label>

          <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
            Medidas (una por línea).
            <div className={styles.help}>
              • Con 3: triángulo → [baseTop, hRight, hLeft] · Con 4: trapecio → [wTop, hRight, wBottom, hLeft]
            </div>
            <textarea
              className={styles.textarea}
              rows={6}
              placeholder={"4\n4\n4\n4"}
              value={data.medidasText || ""}
              onChange={(e) => onChange({ ...data, medidasText: e.target.value })}
            />
          </label>

          <label className={styles.label}>
            Lado pegado a banqueta/guarnición (opcional)
            <select
              className={styles.input}
              value={data.curbSide || ""}
              onChange={(e) => onChange({ ...data, curbSide: e.target.value })}
            >
              <option value="">Ninguna</option>
              <option value="arriba">Arriba</option>
              <option value="derecha">Derecha</option>
              <option value="abajo">Abajo</option>
              <option value="izquierda">Izquierda</option>
              <option value="base">Base (triángulo)</option>
            </select>
          </label>

          <div className={styles.locRow}>
            <button
              type="button"
              onClick={onGetLocation}
              className={styles.btn}
              disabled={!isGeolocationAvailable}
            >
              {locating ? "Obteniendo..." : "Obtener ubicación"}
            </button>
            <span className={styles.locState}>
              {isGeolocationAvailable
                ? isGeolocationEnabled
                  ? coords
                    ? "ok"
                    : (locating ? "pendiente" : "—")
                  : "deshabilitada"
                : "no disponible"}
            </span>
          </div>

          <div className={styles.meta}>
            <strong>Área estimada:</strong> {area.toFixed(2)} m²
          </div>

          <button className={`${styles.btn} ${styles.submit}`} type="submit" disabled={!canSubmit}>
            {isSubmitting ? "Guardando..." : (canSubmit ? "Agregar bache" : "Agrega medidas y ubicación para continuar")}
          </button>
        </div>

        {/* Vista previa */}
        <div>
          <div className={styles.previewTitle}>Vista previa (2D)</div>
          <BacheImageGenerator forma="irregular" medidas={medidas} width={420} height={420} responsive />
          <div className={styles.previewHint}>
            * El mapa mostrará el polígono alrededor de la coordenada capturada.
          </div>
        </div>
      </div>
    </form>
  );
}
