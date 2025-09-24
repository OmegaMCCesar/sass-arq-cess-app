// src/services/bachesService.js
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebaseConfig";

const BACHES_COLL = "baches";

export async function createBache(payload) {
  // payload debe incluir: calle, entreCalles, forma, vertices, area, medidas (opcional),
  // curbSide (opcional), coordenadas {lat,lng}, residenteUid, noBache
  const data = {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, BACHES_COLL), data);
  return { id: ref.id, ...data };
}

export async function deleteBache(id) {
  await deleteDoc(doc(db, BACHES_COLL, id));
}

export async function listBachesByResidente(uid) {
  const q = query(
    collection(db, BACHES_COLL),
    where("residenteUid", "==", uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function listAllBaches() {
  const q = query(collection(db, BACHES_COLL), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
