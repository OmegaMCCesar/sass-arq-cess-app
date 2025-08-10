import { db } from "../lib/firebaseConfig";
import {
  collection, addDoc, doc, updateDoc, deleteDoc, getDocs, query, where,
  serverTimestamp
} from "firebase/firestore";

const col = collection(db, "workers");

export async function listWorkers(type) {
  const q = type ? query(col, where("type", "==", type)) : col;
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createWorker({
  type, name, phone = "",
  encargadoId = null,   // solo para obreros
  createdBy, createdByEmail, createdByRole
}) {
  if (!["encargado","obrero"].includes(type)) throw new Error("Tipo inválido");
  const ref = await addDoc(col, {
    type, name, phone,
    // obreros pueden tener encargado asignado
    encargadoId: type === "obrero" ? (encargadoId || null) : null,
    // trazabilidad
    createdBy: createdBy || null,
    createdByEmail: createdByEmail || null,
    createdByRole: createdByRole || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id; // usarás este id como encargadoId
}

export async function updateWorker(id, data) {
  await updateDoc(doc(db, "workers", id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteWorker(id) {
  await deleteDoc(doc(db, "workers", id));
}
