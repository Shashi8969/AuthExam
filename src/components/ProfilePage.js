// c:/Users/DELL/employee-manager/src/components/ProfilePage.js
import React, { useState, useEffect } from 'react';
import { ref, get, update as firebaseUpdate, set as firebaseSet } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { db as firebaseDB, auth as firebaseAuth, logOut } from '../config/firebase'; // Import real db, auth and logOut

import './ProfilePage.css';
import { useNavigate } from 'react-router-dom'; // For navigation after logout
import useDocumentMeta from '../hooks/useDocumentMeta';

const ProfilePage = () => {
  useDocumentMeta({ title: 'My Profile', noindex: true });
  const [currentUser, setCurrentUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [initialProfileData, setInitialProfileData] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin', 'user', or null
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate(); // Hook for navigation

  // Use real Firebase db and auth
  const db = firebaseDB;
  const auth = firebaseAuth;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setLoading(true);
        setError('');
        try {
          // Check if user is an Admin
          let adminPathRef = ref(db, `Admin/${user.uid}`);
          let adminSnapshot = await get(adminPathRef);

          if (adminSnapshot.exists()) {
            const data = adminSnapshot.val();
            setProfileData(data);
            setInitialProfileData(data);
            setUserRole('admin');
          } else {
            // If not admin, check if user is a general user
            let userPathRef = ref(db, `users/${user.uid}`);
            let userSnapshot = await get(userPathRef);
            if (userSnapshot.exists()) {
              const data = userSnapshot.val();
              setProfileData(data);
              setInitialProfileData(data);
              setUserRole('user');
            } else {
              // Profile doesn't exist in either 'Admin' or 'users'
              setError("Profile not found. Click 'Edit Profile' to create one.");
              setProfileData({}); // Prepare for new profile creation
              setInitialProfileData({});
              // Default new profiles to 'user'. You might want a more sophisticated role assignment.
              setUserRole('user');
            }
          }
        } catch (err) {
          console.error("Error fetching profile:", err);
          setError(`Failed to load profile: ${err.message}`);
          setProfileData({}); // Ensure profileData is an object on error
          setInitialProfileData({});
        } finally {
          setLoading(false);
        }
      } else {
        setCurrentUser(null);
        setProfileData(null);
        setInitialProfileData(null);
        setUserRole(null);
        setLoading(false);
        setError("Please log in to view your profile.");
        // Optionally navigate to login page if not logged in
        // navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [auth, db, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // If cancelling edit, revert to initial data
      setProfileData(initialProfileData);
    } else {
      // If starting edit, ensure initialProfileData is set (could be empty for new profile)
      setInitialProfileData(profileData || {});
    }
    setIsEditing(!isEditing);
  };

  const handleSaveProfile = async () => {
    if (!currentUser || !userRole) {
      setError("Cannot save profile: User or role not identified.");
      return;
    }
    setLoading(true);
    setError('');

    let pathRef;
    let dataToSave = { ...profileData };

    if (userRole === 'admin') {
      pathRef = ref(db, `Admin/${currentUser.uid}`);
      dataToSave.adminId = currentUser.uid;
      dataToSave["Basic Information"] = {
        name: dataToSave.userName || initialProfileData?.userName || '',
        email: dataToSave.email || initialProfileData?.email || '',
      };
    } else if (userRole === 'user') {
      pathRef = ref(db, `users/${currentUser.uid}`);
      dataToSave.userId = currentUser.uid;
    } else {
      setError("Unknown user role. Cannot save profile.");
      setLoading(false);
      return;
    }

    try {
      // If initialProfileData was empty (new profile), use 'set'. Otherwise, 'update'.
      if (initialProfileData && Object.keys(initialProfileData).length === 0) {
        await firebaseSet(pathRef, dataToSave);
      } else {
        await firebaseUpdate(pathRef, dataToSave);
      }
      setInitialProfileData(dataToSave); // Update baseline after successful save
      setIsEditing(false);
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Error saving profile:", err);
      setError(`Failed to save profile: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
      navigate('/login'); // Navigate to login page after logout
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Logout failed. Please try again.");
    }
  };


  if (loading && !profileData && !error) return <div className="profile-page-container"><p>Loading profile...</p></div>;
  if (!currentUser && !loading) return (
    <div className="profile-page-container">
      <p className="error-message">{error || "Please log in."}</p>
      {/* Optionally add a login button here if not auto-navigating */}
    </div>
  );

  const currentData = profileData || {};

  const renderAdminForm = () => (
    <>
      <div><label htmlFor="userName">User Name:</label><input type="text" id="userName" name="userName" value={currentData.userName || ''} onChange={handleInputChange} required /></div>
      <div><label htmlFor="email">Email:</label><input type="email" id="email" name="email" value={currentData.email || ''} onChange={handleInputChange} required /></div>
      <div><label htmlFor="Address">Address:</label><textarea id="Address" name="Address" value={currentData.Address || ''} onChange={handleInputChange} /></div>
    </>
  );

  const renderUserForm = () => (
    <>
      <div><label htmlFor="name">Name:</label><input type="text" id="name" name="name" value={currentData.name || ''} onChange={handleInputChange} required /></div>
      <div><label htmlFor="email">Email:</label><input type="email" id="email" name="email" value={currentData.email || ''} onChange={handleInputChange} required /></div>
      <div><label htmlFor="phone">Phone:</label><input type="tel" id="phone" name="phone" value={currentData.phone || ''} onChange={handleInputChange} /></div>
      <div><label htmlFor="address">Address:</label><textarea id="address" name="address" value={currentData.address || ''} onChange={handleInputChange} /></div>
    </>
  );

  const renderAdminDetails = () => (
    <>
      <p><strong>User Name:</strong> {currentData.userName || 'N/A'}</p>
      <p><strong>Email:</strong> {currentData.email || 'N/A'}</p>
      <p><strong>Address:</strong> {currentData.Address || 'N/A'}</p>
      {currentData["Basic Information"] && (
        <>
          <p><strong>Basic Info Name:</strong> {currentData["Basic Information"].name || 'N/A'}</p>
          <p><strong>Basic Info Email:</strong> {currentData["Basic Information"].email || 'N/A'}</p>
        </>
      )}
    </>
  );

  const renderUserDetails = () => (
    <>
      <p><strong>Name:</strong> {currentData.name || 'N/A'}</p>
      <p><strong>Email:</strong> {currentData.email || 'N/A'}</p>
      <p><strong>Phone:</strong> {currentData.phone || 'N/A'}</p>
      <p><strong>Address:</strong> {currentData.address || 'N/A'}</p>
    </>
  );

  return (
    <div className="profile-page-container">
      <h2>User Dashboard</h2>
      {error && <p className="error-message">{error}</p>}

      <section className="profile-section card">
        <h3>Your Profile {userRole && `(${userRole.charAt(0).toUpperCase() + userRole.slice(1)})`}</h3>
        {loading && !profileData ? <p>Loading details...</p> : (
            isEditing ? (
            <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }}>
                {userRole === 'admin' ? renderAdminForm() : renderUserForm()}
                <button type="submit" className="profile-action-btn" style={{marginRight: '10px', backgroundColor: '#28a745'}}>Save Profile</button>
                <button type="button" onClick={handleEditToggle} className="profile-action-btn" style={{backgroundColor: '#6c757d'}}>Cancel</button>
            </form>
            ) : (
            <>
                {profileData && Object.keys(profileData).length > 0 ?
                  (userRole === 'admin' ? renderAdminDetails() : renderUserDetails()) :
                  !error && <p>No profile information available. Click Edit to add details.</p>
                }
                <button onClick={handleEditToggle} className="profile-action-btn edit-profile-btn">
                  {initialProfileData && Object.keys(initialProfileData).length > 0 ? "Edit Profile" : "Create Profile"}
                </button>
            </>
            )
        )}
      </section>

      {/* Placeholder sections for other functionalities */}
      <section className="operator-list-section card">
        <h3>All Operators</h3>
        <p><i>Operator list display will be implemented here.</i></p>
        {/* You can add a link or button to navigate to the operator list page */}
        <button onClick={() => navigate('/employees')} className="profile-action-btn view-details-link-profile">View All Operators</button>
      </section>

      <section className="saved-assignments-section-profile card">
        <h3>Saved Assignments</h3>
        <p><i>Saved assignments display will be implemented here.</i></p>
        <button onClick={() => navigate('/saved-assignments')} className="profile-action-btn view-details-link-profile">View Saved Assignments</button>
      </section>

      <section className="reference-names-section card">
        <h3>Reference Names</h3>
        <p><i>Reference names display will be implemented here.</i></p>
        <button onClick={() => navigate('/reference-names')}
        className='profile-action-btn view-details-link-profile'>View Reference Names</button>'
      </section>

      <section className="logout-section">
        <button onClick={handleLogout} className="profile-action-btn logout-btn-profile">Logout</button>
      </section>
    </div>
  );
};

export default ProfilePage;
