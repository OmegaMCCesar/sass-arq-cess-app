import { db, storage } from "../lib/firebaseConfig";
import {
  collection, addDoc, doc, updateDoc, getDoc, getDocs, query, where,
  serverTimestamp, orderBy
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const col = collection(db, "baches"); // o "activities" si prefieres

export async function createBache({
  title, description = "",
  projectId = null,
  residenteUid,
  cuadrillaId = null,
  encargadoId = null,
  status = "registrado"   // registrado | iniciado | en-proceso | terminado
}) {
  const docRef = await addDoc(col, {
    title, description,
    projectId,
    residenteUid,
    cuadrillaId,
    encargadoId,
    status,
    photos: {
      before: null,
      during: [], // array de urls
      after: null,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateBache(id, data) {
  await updateDoc(doc(db, "baches", id), { ...data, updatedAt: serverTimestamp() });
}

export async function getBache(id) {
  const snap = await getDoc(doc(db, "baches", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listBachesByResidente(residenteUid) {
  const q = query(col, where("residenteUid", "==", residenteUid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function listAllBaches() {
  const q = query(col, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Subir evidencia y guardar URL en el campo correspondiente */
export async function uploadEvidence({ bacheId, phase, file }) {
  // phase: "before" | "during" | "after"
  const path = `baches/${bacheId}/${phase}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  const docRef = doc(db, "baches", bacheId);

  if (phase === "before") {
    await updateDoc(docRef, { "photos.before": url, updatedAt: serverTimestamp() });
  } else if (phase === "after") {
    await updateDoc(docRef, { "photos.after": url, updatedAt: serverTimestamp() });
  } else {
    // during: append a array
    const snap = await getDoc(docRef);
    const data = snap.exists() ? snap.data() : {};
    const existing = Array.isArray(data?.photos?.during) ? data.photos.during : [];
    await updateDoc(docRef, { "photos.during": [...existing, url], updatedAt: serverTimestamp() });
  }
  return url;
}
