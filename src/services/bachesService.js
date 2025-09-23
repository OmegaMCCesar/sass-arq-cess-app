import { db } from "../lib/firebaseConfig"; // <-- deja solo db desde tu config
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp, // <-- tráelo desde firebase/firestore
} from "firebase/firestore";

const COLL = "baches";

export async function createBache(data) {
  const payload = {
    ...data,
    // hora del servidor (mejor para ordenar y evitar reloj del cliente)
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, COLL), payload);
  return { id: ref.id }; // luego tu UI hace refresh() y trae el createdAt real
}

export async function listBachesByResidente(uid) {
  const q = query(
    collection(db, COLL),
    where("residenteUid", "==", uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listAllBaches() {
  const q = query(collection(db, COLL), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteBache(id) {
  await deleteDoc(doc(db, COLL, id));
}
