// src/components/bache/EvidenceUploader.jsx
import React from 'react';

const EvidenceUploader = ({ row, doUpload, beforeRefs, duringRefs, afterRefs }) => (
  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
    <div>
      <label style={{ display: "block", fontWeight: 600 }}>Antes (before):</label>
      <input type="file" accept="image/*" ref={el => beforeRefs.current[row.id] = el} />
      <button onClick={() => doUpload(row.id, "before")} style={{ marginTop: 6 }}>Subir</button>
      {row.photos?.before && <div><a href={row.photos.before} target="_blank" rel="noreferrer">Ver imagen</a></div>}
    </div>
    <div>
      <label style={{ display: "block", fontWeight: 600 }}>Proceso (during):</label>
      <input type="file" accept="image/*" ref={el => duringRefs.current[row.id] = el} />
      <button onClick={() => doUpload(row.id, "during")} style={{ marginTop: 6 }}>Subir</button>
      {Array.isArray(row.photos?.during) && row.photos.during.length > 0 && (
        <ul style={{ marginTop: 6 }}>
          {row.photos.during.map((u, i) => (
            <li key={i}><a href={u} target="_blank" rel="noreferrer">Ver {i+1}</a></li>
          ))}
        </ul>
      )}
    </div>
    <div>
      <label style={{ display: "block", fontWeight: 600 }}>Final (after):</label>
      <input type="file" accept="image/*" ref={el => afterRefs.current[row.id] = el} />
      <button onClick={() => doUpload(row.id, "after")} style={{ marginTop: 6 }}>Subir</button>
      {row.photos?.after && <div><a href={row.photos.after} target="_blank" rel="noreferrer">Ver imagen</a></div>}
    </div>
  </div>
);

export default EvidenceUploader;