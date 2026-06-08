import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "firebase/auth";

const firebaseConfig = {

  apiKey: "AIzaSyADYiTwNB2qljCfRnVa2GDj6SdQ4Ucs_pI",

  authDomain: "obra-ia-faf76.firebaseapp.com",

  projectId: "obra-ia-faf76",

  storageBucket: "obra-ia-faf76.firebasestorage.app",

  messagingSenderId: "786610448234",

  appId: "1:786610448234:web:6014dbe9229d3e005fe713",

  measurementId: "G-6JFRXKH5LX"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const auth = getAuth(app);

export const provider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signOut
};