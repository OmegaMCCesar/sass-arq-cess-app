// src/services/reportsService.js
import { db } from "../lib/firebaseConfig";
import {
  collection, query, where, orderBy, limit, getDocs, startAfter,
  Timestamp
} from "firebase/firestore";

const COL = collection(db, "activities"); // cámbialo si tu colección se llama distinto

export function toTimestamp(date) {
  if (!date) return null;
  // Acepta Date o string YYYY-MM-DD
  const d = typeof date === "string" ? new Date(date) : date;
  return Timestamp.fromDate(d);
}

export async function fetchReports({
  fromDate, toDate, status, projectId, assignedTo,
  pageSize = 20, cursor = null
} = {}) {
  let constraints = [];

  // Fechas (usa createdAt: Timestamp en tus docs)
  if (fromDate) constraints.push(where("createdAt", ">=", toTimestamp(fromDate)));
  if (toDate) {
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    constraints.push(where("createdAt", "<=", Timestamp.fromDate(end)));
  }

  if (status) constraints.push(where("status", "==", status));           // pending | in-progress | completed
  if (projectId) constraints.push(where("projectId", "==", projectId));
  if (assignedTo) constraints.push(where("assignedTo", "==", assignedTo)); // uid o encargadoId

  // Orden + paginación
  constraints.push(orderBy("createdAt", "desc"));
  constraints.push(limit(pageSize));

  if (cursor) constraints.push(startAfter(cursor));

  const q = query(COL, ...constraints);
  const snap = await getDocs(q);

  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const nextCursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;

  return { items, nextCursor };
}
