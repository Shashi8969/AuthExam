// src/context/AuthContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../config/firebase';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser]   = useState(null);
  const [isAdmin, setIsAdmin]           = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [supervisorData, setSupervisorData] = useState(null); // full supervisor record
  const [profileName, setProfileName]   = useState('');
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);

      if (user) {
        let fetchedName = '';
        let detectedAdmin = false;
        let detectedSupervisor = false;
        let svData = null;

        try {
          // 1. Check Admin
          const adminSnap = await get(ref(db, `Admin/${user.uid}`));
          if (adminSnap.exists()) {
            detectedAdmin = true;
            const d = adminSnap.val();
            fetchedName = d.userName || d.name || '';
          }

          // 2. If not admin, check Supervisors table (by uid)
          if (!detectedAdmin) {
            const svSnap = await get(ref(db, `Supervisors/${user.uid}`));
            if (svSnap.exists()) {
              detectedSupervisor = true;
              svData = svSnap.val();
              fetchedName = svData.name || '';
            }
          }

          // 3. If not admin or supervisor, check regular users table
          if (!detectedAdmin && !detectedSupervisor) {
            const userSnap = await get(ref(db, `users/${user.uid}`));
            if (userSnap.exists()) {
              fetchedName = userSnap.val().name || '';
            }
          }

          // 4. Auto-detect supervisor: check if user's email/phone matches an Employee record
          //    (phone stored in users table, matched against Employees.phoneNo OR addharNo)
          if (!detectedAdmin && !detectedSupervisor) {
            const userSnap = await get(ref(db, `users/${user.uid}`));
            if (userSnap.exists()) {
              const userData = userSnap.val();
              const userPhone = String(userData.phone || '').trim();

              if (userPhone) {
                const phoneQuery = query(
                  ref(db, 'Employees'),
                  orderByChild('phoneNo'),
                  equalTo(userPhone)
                );
                const phoneSnap = await get(phoneQuery);
                if (phoneSnap.exists()) {
                  detectedSupervisor = true;
                  // Build supervisor data from matched employee record
                  const empKey = Object.keys(phoneSnap.val())[0];
                  const empData = phoneSnap.val()[empKey];
                  svData = {
                    name: empData.name,
                    phoneNo: empData.phoneNo,
                    addharNo: empData.addharNo,
                    matchedEmpId: empKey,
                    uid: user.uid,
                  };
                  fetchedName = empData.name || fetchedName;
                }
              }
            }
          }

        } catch (err) {
          console.error('AuthContext: role detection error', err);
        }

        setIsAdmin(detectedAdmin);
        setIsSupervisor(detectedSupervisor);
        setSupervisorData(svData);
        setProfileName(
          fetchedName || user.displayName || (user.email ? user.email.split('@')[0] : '')
        );
      } else {
        setIsAdmin(false);
        setIsSupervisor(false);
        setSupervisorData(null);
        setProfileName('');
      }

      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user: currentUser, isAdmin, isSupervisor, supervisorData, profileName, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
