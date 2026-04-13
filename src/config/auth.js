import { app } from './firebase';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
export const auth = getAuth(app);
export const logIn = (email, password) => signInWithEmailAndPassword(auth, email, password);