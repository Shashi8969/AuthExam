import { app } from './firebase';
import { getDatabase, ref } from "firebase/database";
export const db = getDatabase(app);
export const employeesRef = ref(db, 'Employees');