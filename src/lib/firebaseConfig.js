// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBT6BHBZnr5no26W1rC-LBkzouYLV2BJWw",
  authDomain: "saas-arq-cess-app.firebaseapp.com",
  projectId: "saas-arq-cess-app",
  storageBucket: "saas-arq-cess-app.firebasestorage.app",
  messagingSenderId: "1017019155262",
  appId: "1:1017019155262:web:31946c4f970ebc400d626f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { db, storage, auth };