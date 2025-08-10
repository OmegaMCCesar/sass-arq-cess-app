import { db } from "../lib/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const col = collection(db, "calc_logs");

export async function logCalcUsage({ usedByUid, usedByEmail, usedByRole, params = {}, result = {} }) {
  await addDoc(col, {
    usedByUid: usedByUid || null,
    usedByEmail: usedByEmail || null,
    usedByRole: usedByRole || null,
    params,
    result,
    createdAt: serverTimestamp(),
  });
}
