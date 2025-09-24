import React from "react";
import BacheImageGenerator from "./BacheImageGenerator";

export default function BacheList({ rows, loading, onDelete, selectedBacheId, onSelectBache }) {
  if (loading) return <p>Cargando...</p>;
  if (!rows?.length) return <p>No hay baches.</p>;

  return (
    <div>
      <style>{`
        .card {
          border: 1px solid #ddd; padding: 12px; border-radius: 6px; margin-bottom: 10px;
          display: grid; grid-template-columns: 120px 1fr; gap: 12px; align-items: center;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
          cursor: pointer;
        }
        .card:hover { border-color: #9ec5ff; box-shadow: 0 1px 4px rgba(26,71,255,0.15); }
        .card.sel { border-color: #1a47ff; background: #f5f8ff; }
        .badge-num {
          display: inline-flex; align-items: center; justify-content: center;
          width: 26px; height: 26px; border-radius: 50%; background: #1a47ff; color: #fff;
          font-weight: 700; margin-right: 8px; font-size: 13px;
        }
      `}</style>

      {rows.map((r) => {
        const selected = r.id === selectedBacheId;
        return (
          <div
            key={r.id || `${r.calle}-${r.noBache}`}
            id={`bache-card-${r.id}`}
            className={`card ${selected ? "sel" : ""}`}
            onMouseEnter={() => onSelectBache && onSelectBache(r.id)}
            onClick={() => onSelectBache && onSelectBache(r.id)}
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
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="badge-num">{r.idx}</span>
                <strong>#{r.noBache}</strong> · {r.calle || "calle"}{" "}
                {r.entreCalles?.length ? `(${r.entreCalles.join(" y ")})` : ""}
              </div>
              <div>Forma: {r.forma} · Área: {r.area?.toFixed ? r.area.toFixed(2) : r.area} m²</div>
              <div>
                Lat/Lng:{" "}
                {r.coordenadas?.lat != null ? Number(r.coordenadas.lat).toFixed(6) : "—"},{" "}
                {r.coordenadas?.lng != null ? Number(r.coordenadas.lng).toFixed(6) : "—"}
              </div>

              {onDelete && r.id && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(r.id); }}
                  style={{
                    marginTop: 8, background: "#fff0f0", border: "1px solid #f00",
                    padding: "6px 10px", borderRadius: 4, cursor: "pointer",
                  }}
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
