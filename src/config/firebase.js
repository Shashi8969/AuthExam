// src/config/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase, ref } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB1psChXyrky7o5TOJbd5xwvLvsv0dqDFM",
  authDomain: "employee-manager-a2c73.firebaseapp.com",
  databaseURL: "https://employee-manager-a2c73-default-rtdb.firebaseio.com",
  projectId: "employee-manager-a2c73",
  storageBucket: "employee-manager-a2c73.firebasestorage.app",
  messagingSenderId: "27079741851",
  appId: "1:27079741851:web:6430c0b200c5f6f6f1513e",
  measurementId: "G-30WR3SQ2DQ"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

const employeesRef = ref(db, 'Employees');

export { db, storage, employeesRef };