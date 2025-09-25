// Asegúrate que ya importas db y helpers de Firebase
import { db } from "../lib/firebaseConfig";
import { collection, addDoc, getDocs, query, where, orderBy, doc, deleteDoc, updateDoc } from "firebase/firestore";

const coll = collection(db, "baches");

export async function createBache(data) {
  const ref = await addDoc(coll, data);
  return { id: ref.id };
}

export async function updateBache(id, partial) {
  const ref = doc(db, "baches", id);
  await updateDoc(ref, partial);
}

export async function deleteBache(id) {
  const ref = doc(db, "baches", id);
  await deleteDoc(ref);
}

export async function listBachesByResidente(uid) {
  const q = query(coll, where("residenteUid", "==", uid), orderBy("noBache", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function listAllBaches() {
  const q = query(coll, orderBy("noBache", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
