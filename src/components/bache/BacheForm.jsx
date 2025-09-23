import React from "react";
import BacheImageGenerator from "./BacheImageGenerator"; // <-- IMPORTA AQUÍ

export default function BacheForm({
  data,
  onChange,
  onSubmit,
  isGeolocationAvailable,
  isGeolocationEnabled,
  coords,
}) {
  const showLados = data.forma === "poligono";
  const showVertices = data.forma === "irregular";

  // parsea texto "x,y" por línea a array de vértices
  const parseVertices = (txt) => {
    const lines = txt.split("\n").map((l) => l.trim()).filter(Boolean);
    const verts = [];
    for (const line of lines) {
      const [xs, ys] = line.split(",").map((s) => s.trim());
      const x = parseFloat(xs), y = parseFloat(ys);
      if (!isNaN(x) && !isNaN(y)) verts.push({ x, y });
    }
    return verts;
  };

  return (
    <form
      onSubmit={onSubmit}
      style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8, marginTop: 10 }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* LADO IZQUIERDO: Inputs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            Calle principal
            <input
              value={data.calle}
              onChange={(e) => onChange({ ...data, calle: e.target.value })}
              placeholder="Av. Principal"
            />
          </label>

          <label>
            Entre calles (separadas por coma)
            <input
              value={(data.entreCalles || []).join(", ")}
              onChange={(e) =>
                onChange({
                  ...data,
                  entreCalles: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
              placeholder="Calle 1, Calle 2"
            />
          </label>

          <label>
            Largo (m)
            <input
              type="number"
              min={0}
              step={0.1}
              value={data.largo}
              onChange={(e) => onChange({ ...data, largo: parseFloat(e.target.value) || 0 })}
            />
          </label>

          <label>
            Ancho (m)
            <input
              type="number"
              min={0}
              step={0.1}
              value={data.ancho}
              onChange={(e) => onChange({ ...data, ancho: parseFloat(e.target.value) || 0 })}
            />
          </label>

          <label>
            Forma
            <select
              value={data.forma}
              onChange={(e) => onChange({ ...data, forma: e.target.value })}
            >
              <option value="cuadrado">Cuadrado</option>
              <option value="rectangulo">Rectángulo</option>
              <option value="triangulo">Triángulo</option>
              <option value="poligono">Polígono (N lados)</option>
              <option value="irregular">Irregular</option>
            </select>
          </label>

          {showLados && (
            <label>
              Lados (≥3)
              <input
                type="number"
                min={3}
                step={1}
                value={data.lados || 5}
                onChange={(e) => onChange({ ...data, lados: parseInt(e.target.value || "5", 10) })}
              />
            </label>
          )}

          {showVertices && (
            <label style={{ gridColumn: "1 / span 2" }}>
              Vértices (uno por línea, formato: <code>x,y</code> en metros)
              <textarea
                rows={4}
                placeholder={"0.2,0.1\n1.6,0.3\n1.7,1.1\n0.9,1.3\n0.3,0.9"}
                value={data.verticesText || ""}
                onChange={(e) =>
                  onChange({
                    ...data,
                    verticesText: e.target.value,
                    vertices: parseVertices(e.target.value),
                  })
                }
              />
            </label>
          )}

          <div style={{ marginTop: 10, fontSize: 12, gridColumn: "1 / span 2" }}>
            Ubicación:{" "}
            {isGeolocationAvailable
              ? isGeolocationEnabled
                ? coords
                  ? "OK"
                  : "esperando..."
                : "deshabilitada"
              : "no disponible"}
          </div>

          <button type="submit" style={{ marginTop: 10 }}>
            Agregar bache
          </button>
        </div>

        {/* LADO DERECHO: Preview */}
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Vista previa</div>
          <BacheImageGenerator
            largo={Number(data.largo) || 0}
            ancho={Number(data.ancho) || 0}
            forma={data.forma || "rectangulo"}
            lados={Number(data.lados) || 5}
            vertices={data.vertices || null}
            width={420}
            height={420}
            showDownload={false}
          />
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
            * La escala es visual para referencia rápida.
          </div>
        </div>
      </div>
    </form>
  );
}
