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
  const [profileName, setProfileName] = useState(''); // To store user's full name
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async user => {
      // console.log('AuthContext - onAuthStateChanged fired. User object:', user);
      setCurrentUser(user);
      if (user) {
        let fetchedName = '';
        try {
          // Check if the user is an admin and fetch their name
          const adminRef = ref(db, `Admin/${user.uid}`);
          const adminSnap = await get(adminRef);
          if (adminSnap.exists()){
            setIsAdmin(true);
            const adminData = adminSnap.val();
            // Admin might have 'userName' (from ProfilePage logic) or 'name'
            fetchedName = adminData.userName || adminData.name;
            // console.log('AuthContext - User is admin:', user.uid);
          } else {
            setIsAdmin(false);
            // If not admin, fetch regular user's name
            const userRef = ref(db, `users/${user.uid}`);
            const userSnap = await get(userRef);
            if (userSnap.exists()) {
              fetchedName = userSnap.val().name;
            }
            // console.log('AuthContext - User is NOT admin:', user.uid);
          }
        } catch (error) {
          console.error("AuthContext - Error fetching profile name from DB:", error);
          // Error in DB fetch, isAdmin might be set based on previous logic or default to false
        }
        // Fallback logic for profileName: DB name > Auth displayName > email prefix > empty string
        setProfileName(fetchedName || user.displayName || (user.email ? user.email.split('@')[0] : ''));
      } else {
        setIsAdmin(false);
        setProfileName(''); // Clear name when logged out
        // console.log('AuthContext - No user, isAdmin set to false.');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    user: currentUser,
    isAdmin,
    profileName, // Provide the fetched profile name
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}