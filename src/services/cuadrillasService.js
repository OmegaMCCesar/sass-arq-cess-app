import { db } from "../lib/firebaseConfig";
import {
  collection, addDoc, doc, updateDoc, deleteDoc, getDocs, getDoc,
  serverTimestamp, query, where, arrayUnion, arrayRemove
} from "firebase/firestore";

const colCuadrillas = collection(db, "cuadrillas");
const colWorkers = collection(db, "workers");

export async function listCuadrillas() {
  const snap = await getDocs(colCuadrillas);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createCuadrilla({ number, name, encargadoId = null, members = [], projectId = null, createdBy }) {
  const ref = await addDoc(colCuadrillas, {
    number: number || null,
    name,
    encargadoId,
    members,
    projectId,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCuadrilla(id, data) {
  const ref = doc(db, "cuadrillas", id);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function removeCuadrilla(id) {
  const ref = doc(db, "cuadrillas", id);
  await deleteDoc(ref);
}

export async function getCuadrilla(id) {
  const ref = doc(db, "cuadrillas", id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listObreros() {
  const q = query(colWorkers, where("type", "==", "obrero"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function listEncargados() {
  const q = query(colWorkers, where("type", "==", "encargado"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addMembersToCuadrilla(cuadrillaId, workerIds = []) {
  const ref = doc(db, "cuadrillas", cuadrillaId);
  await updateDoc(ref, {
    members: arrayUnion(...workerIds),
    updatedAt: serverTimestamp(),
  });
}

export async function removeMemberFromCuadrilla(cuadrillaId, workerId) {
  const ref = doc(db, "cuadrillas", cuadrillaId);
  await updateDoc(ref, {
    members: arrayRemove(workerId),
    updatedAt: serverTimestamp(),
  });
}
