// src/lib/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Config de tu proyecto (idealmente luego mover a .env)
export const firebaseConfig = {
  apiKey: "AIzaSyBT6BHBZnr5no26W1rC-LBkzouYLV2BJWw",
  authDomain: "saas-arq-cess-app.firebaseapp.com",
  projectId: "saas-arq-cess-app",
  storageBucket: "saas-arq-cess-app.firebasestorage.app",
  messagingSenderId: "1017019155262",
  appId: "1:1017019155262:web:31946c4f970ebc400d626f",
};

// App principal
export const app = initializeApp(firebaseConfig);

// SDKs conectados a la app principal
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
