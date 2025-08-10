// src/pages/Reportes/Reportes.jsx
import React, { useEffect, useMemo, useState } from "react";
import { fetchReports } from "../../services/reportsService";
import { downloadCSV } from "../../utils/csv";

const STATUSES = ["pending", "in-progress", "completed"];

export default function ReportesPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const [rows, setRows] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const filters = useMemo(() => ({
    fromDate: fromDate || null,
    toDate: toDate || null,
    status: status || null,
    projectId: projectId || null,
    assignedTo: assignedTo || null
  }), [fromDate, toDate, status, projectId, assignedTo]);

  const load = async (reset = false) => {
    try {
      setLoading(true);
      setErr("");
      const res = await fetchReports({
        ...filters,
        pageSize: 20,
        cursor: reset ? null : cursor
      });
      setRows(prev => reset ? res.items : [...prev, ...res.items]);
      setCursor(res.nextCursor);
    } catch (e) {
      console.error(e);
      setErr("No se pudieron cargar los reportes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Cargar al entrar
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => load(true);

  const exportCsv = () => {
    // Normaliza campos de Timestamp a ISO si existen
    const toPlain = (r) => ({
      ...r,
      createdAt: r.createdAt?.toDate ? r.createdAt.toDate().toISOString() : r.createdAt,
      updatedAt: r.updatedAt?.toDate ? r.updatedAt.toDate().toISOString() : r.updatedAt
    });
    downloadCSV("reportes", rows.map(toPlain));
  };

  return (
    <div style={{ padding: 8 }}>
      <h2 style={{ margin: "0 0 12px" }}>Reportes</h2>

      {/* Filtros */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 8,
        marginBottom: 12
      }}>
        <div>
          <label>Desde</label>
          <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} />
        </div>
        <div>
          <label>Hasta</label>
          <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} />
        </div>
        <div>
          <label>Status</label>
          <select value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="">(todos)</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label>Proyecto</label>
          <input placeholder="projectId" value={projectId} onChange={e=>setProjectId(e.target.value)} />
        </div>
        <div>
          <label>Asignado a</label>
          <input placeholder="assignedTo" value={assignedTo} onChange={e=>setAssignedTo(e.target.value)} />
        </div>
        <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
          <button onClick={applyFilters} disabled={loading}>Aplicar filtros</button>
          <button onClick={exportCsv} disabled={!rows.length}>Exportar CSV</button>
        </div>
      </div>

      {err && <p style={{ color: "crimson" }}>{err}</p>}

      {/* Tabla */}
      <div style={{ overflowX: "auto" }}>
        <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f4f6f8" }}>
              <th align="left">ID</th>
              <th align="left">Proyecto</th>
              <th align="left">Asignado</th>
              <th align="left">Status</th>
              <th align="left">Creado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td>{r.id}</td>
                <td>{r.projectId || "-"}</td>
                <td>{r.assignedTo || "-"}</td>
                <td>{r.status || "-"}</td>
                <td>{r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : String(r.createdAt || "-")}</td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 16 }}>Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div style={{ marginTop: 12 }}>
        <button onClick={() => load(false)} disabled={loading || !cursor}>
          {cursor ? "Cargar más" : "No hay más"}
        </button>
      </div>
    </div>
  );
}
