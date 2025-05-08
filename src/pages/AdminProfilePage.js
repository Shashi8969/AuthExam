// src/pages/AdminProfilePage.js
import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../config/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import AdminProfile from '../components/AdminProfile';
import './AdminProfilePage.css'; // Import CSS for this page

const AdminProfilePage = () => {
  const [adminData, setAdminData] = useState(null);
  const [currentUid, setCurrentUid] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoadingAuth(false);
      if (user) {
        setCurrentUid(user.uid);
        console.log("Current Admin UID:", user.uid);
      } else {
        setCurrentUid(null);
        console.log("No admin is currently signed in.");
        // Optionally handle the case where no admin is logged in (e.g., redirect to login)
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchAdmin = async () => {
      if (currentUid) {
        const adminRef = ref(db, `Admin/${currentUid}`);
        const snapshot = await get(adminRef);
        if (snapshot.exists()) {
          setAdminData(snapshot.val());
        } else {
          console.log(`No admin data found for UID: ${currentUid}`);
          setAdminData(null);
        }
      }
    };

    fetchAdmin();
  }, [currentUid]);

  if (loadingAuth) {
    return <div>Checking authentication...</div>;
  }

  if (currentUid === null) {
    return <div>Please log in to view your profile.</div>;
  }

  if (!adminData) {
    return <div>Admin profile not found.</div>;
  }

  return (
    <div className="admin-profile-page-container">
      <h1>Admin Profile</h1>
      <AdminProfile adminData={adminData} />
    </div>
  );
};

export default AdminProfilePage;