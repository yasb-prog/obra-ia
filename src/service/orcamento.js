import {
  collection,
  addDoc,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../firebase";

export const salvarOrcamento = async (
  uid,
  resultado
) => {

  return await addDoc(
    collection(db, "orcamentos"),
    {
      uid,
      resultado,
      criadoEm: serverTimestamp()
    }
  );

};