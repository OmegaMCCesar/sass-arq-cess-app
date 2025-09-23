// components/bache/BacheList.jsx
import React from "react";
import BacheImageGenerator from "./BacheImageGenerator"; // importa

export default function BacheList({ rows, loading, onDelete }) {
  if (loading) return <p>Cargando...</p>;
  if (!rows?.length) return <p>No hay baches.</p>;

  return (
    <div>
      {rows.map((r) => (
        <div
          key={r.id || `${r.calle}-${r.noBache}`}
          style={{ border: "1px solid #ddd", padding: 12, borderRadius: 6, marginBottom: 10, display: "grid", gridTemplateColumns: "120px 1fr", gap: 12 }}
        >
          {/* thumbnail */}
          <div>
            <BacheImageGenerator
              largo={Number(r.largo) || 0}
              ancho={Number(r.ancho) || 0}
              forma={(r.forma || "rectangulo").toLowerCase()}
              lados={Number(r.lados) || 5}
              vertices={r.vertices || null}
              width={110}
              height={110}
            />
          </div>

          {/* info */}
          <div>
            <strong>#{r.noBache}</strong> · {r.calle}{" "}
            {r.entreCalles?.length ? `(${r.entreCalles.join(" y ")})` : ""}
            <div>Área: {r.area} m² · {r.forma}</div>
            <div>
              Lat/Lng:{" "}
              {r.coordenadas?.lat != null ? Number(r.coordenadas.lat).toFixed(6) : "—"},{" "}
              {r.coordenadas?.lng != null ? Number(r.coordenadas.lng).toFixed(6) : "—"}
            </div>
            {onDelete && r.id && (
              <button
                onClick={() => onDelete(r.id)}
                style={{
                  marginTop: 8,
                  background: "#fff0f0",
                  border: "1px solid #f00",
                  padding: "6px 10px",
                  borderRadius: 4,
                }}
              >
                Eliminar
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
