// components/bache/BacheCroquis.jsx
import React, { useMemo } from "react";

function projectPoints(points) {
  if (!points.length) return [];
  const meanLat = points.reduce((a, p) => a + (p.lat || 0), 0) / points.length || 0;
  const R = 6378137;
  return points.map((p) => {
    const x = ((p.lng || 0) * Math.PI) / 180 * R * Math.cos((meanLat * Math.PI) / 180);
    const y = ((p.lat || 0) * Math.PI) / 180 * R;
    return { x, y };
  });
}

function polygonPoints(cx, cy, radiusX, radiusY, sides) {
  const pts = [];
  const n = Math.max(3, sides | 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2; // rotar para que un vértice mire “arriba”
    const x = cx + Math.cos(a) * radiusX;
    const y = cy + Math.sin(a) * radiusY;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

export default function BacheCroquis({ baches, width = 1100, height = 220 }) {
  const grouped = useMemo(() => {
    const g = new Map();
    (baches || []).forEach((b) => {
      if (!b?.calle) return;
      const key = b.calle.trim().toLowerCase();
      if (!g.has(key)) g.set(key, []);
      g.get(key).push(b);
    });
    return g;
  }, [baches]);

  if (!baches?.length) return <p>Sin datos para croquis.</p>;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {[...grouped.entries()].map(([calleKey, arr]) => {
        const puntos = arr.map((a) => a.coordenadas || {});
        if (!puntos.length) return null;

        const proj = projectPoints(puntos);
        const xs = proj.map((p) => p.x);
        const ys = proj.map((p) => p.y);
        const minX = Math.min.apply(null, xs);
        const maxX = Math.max.apply(null, xs);
        const minY = Math.min.apply(null, ys);
        const maxY = Math.max.apply(null, ys);

        const padding = 30;
        const spanX = Math.max(1, maxX - minX);
        const spanY = Math.max(1, maxY - minY);
        const sx = (width - padding * 2) / spanX;
        const sy = (height - padding * 2) / spanY;
        const s = Math.min(sx, sy);

        const pointsXY = proj.map((p) => ({
          X: padding + (p.x - minX) * s,
          Y: padding + (maxY - p.y) * s,
        }));

        const sorted = pointsXY
          .map((p, i) => ({ ...p, i }))
          .sort((a, b) => a.X - b.X || a.Y - b.Y);

        const d = sorted
          .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.X.toFixed(1)} ${p.Y.toFixed(1)}`)
          .join(" ");

        return (
          <div key={calleKey} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
            <div style={{ marginBottom: 6, fontWeight: 600, fontSize: 14 }}>
              Calle: {arr[0].calle} · Baches: {arr.length}
            </div>

            <svg width={width} height={height} style={{ background: "#fafafa" }}>
              {/* Línea que representa la calle */}
              <path d={d} stroke="#555" strokeWidth={3} fill="none" />

              {/* Dibujo de cada bache según su forma */}
              {sorted.map((p, idx) => {
                const b = arr[p.i];
                const largo = Math.max(8, b.largo || 0); // escala visual
                const ancho = Math.max(8, b.ancho || 0);

                // por defecto usamos rectángulo si no viene forma
                const forma = (b.forma || "rectangulo").toLowerCase();
                const lados = Math.max(3, parseInt(b.lados || 5, 10)); // para polígono

                const common = { stroke: "#c62828", strokeWidth: 1, opacity: 0.9 };

                const label = (
                  <text x={p.X + (largo / 2) + 6} y={p.Y - 4} fontSize={12} fill="#333">
                    #{b.noBache} ({b.largo}x{b.ancho}) {forma === "poligono" ? `· ${lados} lados` : ""}
                  </text>
                );

                if (forma === "cuadrado") {
                  const side = Math.max(largo, ancho);
                  return (
                    <g key={b.id || `${b.calle}-${b.noBache}-${idx}`}>
                      <rect x={p.X - side / 2} y={p.Y - side / 2} width={side} height={side} fill="#e57373" rx={3} {...common} />
                      {label}
                    </g>
                  );
                }

                if (forma === "rectangulo") {
                  return (
                    <g key={b.id || `${b.calle}-${b.noBache}-${idx}`}>
                      <rect x={p.X - largo / 2} y={p.Y - ancho / 2} width={largo} height={ancho} fill="#e57373" rx={3} {...common} />
                      {label}
                    </g>
                  );
                }

                if (forma === "triangulo") {
                  const pts = polygonPoints(p.X, p.Y, largo / 2, ancho / 2, 3);
                  return (
                    <g key={b.id || `${b.calle}-${b.noBache}-${idx}`}>
                      <polygon points={pts} fill="#e57373" {...common} />
                      {label}
                    </g>
                  );
                }

                if (forma === "poligono") {
                  const pts = polygonPoints(p.X, p.Y, largo / 2, ancho / 2, lados);
                  return (
                    <g key={b.id || `${b.calle}-${b.noBache}-${idx}`}>
                      <polygon points={pts} fill="#e57373" {...common} />
                      {label}
                    </g>
                  );
                }

                // irregular -> default a rectángulo (puedes luego dibujar path libre si guardas vértices)
                return (
                  <g key={b.id || `${b.calle}-${b.noBache}-${idx}`}>
                    <rect x={p.X - largo / 2} y={p.Y - ancho / 2} width={largo} height={ancho} fill="#ef9a9a" rx={3} {...common} />
                    {label}
                  </g>
                );
              })}
            </svg>

            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
              Nota: croquis proporcional (visual), útil para ubicar múltiples baches en la misma calle.
            </div>
          </div>
        );
      })}
    </div>
  );
}
