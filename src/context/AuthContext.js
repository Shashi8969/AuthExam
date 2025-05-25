// src/context/AuthContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../config/firebase'; // Import db for Realtime Database
import { ref, get } from 'firebase/database'; // Import Realtime Database functions

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async user => {
      console.log('AuthContext - onAuthStateChanged fired. User object:', user);
      setCurrentUser(user);
      if (user) {
        // Check if the user is an admin
        try {
          const adminRef = ref(db, `Admin/${user.uid}`);
          const adminSnap = await get(adminRef);
          if (adminSnap.exists()){
            setIsAdmin(true);
            console.log('AuthContext - User is admin:', user.uid);
          } else {
            setIsAdmin(false);
            console.log('AuthContext - User is NOT admin:', user.uid);
          }
        } catch (error) {
          console.error("AuthContext - Error checking admin status:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
        console.log('AuthContext - No user, isAdmin set to false.');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    user: currentUser,
    isAdmin,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}