// src/components/bache/StatusButtons.jsx
import React from 'react';

const STATUSES = ["registrado", "iniciado", "en-proceso", "terminado"];

const StatusButtons = ({ row, changeStatus }) => {
  const idx = STATUSES.indexOf(row.status || "registrado");
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {STATUSES.map((s, i) => (
        <button
          key={s}
          disabled={i < idx}
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

export default StatusButtons;