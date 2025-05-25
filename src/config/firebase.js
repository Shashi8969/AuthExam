// src/config/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase, ref } from "firebase/database"; // Moved ref import here
import { getStorage } from "firebase/storage";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
// For local development, you can keep the direct config or use a .env.local file
// For production, these should ideally come from environment variables

// --- TEMPORARY HARDCODED CONFIG FOR DEBUGGING ---
const firebaseConfig = {
  apiKey: "AIzaSyB1psChXyrky7o5TOJbd5xwvLvsv0dqDFM", // Replace with your actual key
  authDomain: "employee-manager-a2c73.firebaseapp.com",
  databaseURL: "https://employee-manager-a2c73-default-rtdb.firebaseio.com",
  projectId: "employee-manager-a2c73",
  storageBucket: "employee-manager-a2c73.firebasestorage.app",
  messagingSenderId: "27079741851",
  appId: "1:27079741851:web:6430c0b200c5f6f6f1513e",
  measurementId: "G-30WR3SQ2DQ"
};
// --- END TEMPORARY HARDCODED CONFIG ---

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

// Refs exported for direct use
const employeesRef = ref(db, 'Employees');
const referenceNamesRef = ref(db, 'ReferenceNames');
export { db, storage, employeesRef, referenceNamesRef };

// export { db, storage }; // Exporting db and storage is common

// Auth functions
export const signUp = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const logIn = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logOut = () => {
  return signOut(auth);
};
