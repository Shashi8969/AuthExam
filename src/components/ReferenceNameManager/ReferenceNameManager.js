// src/components/ReferenceNameManager.js
import React, { useState, useEffect } from 'react';
import { ref, push, onValue, remove, query, orderByChild, equalTo } from 'firebase/database';
import { db } from '../../config/firebase';
import './ReferenceNameManager.css'; // Import the CSS file
import { useAuth } from '../../context/AuthContext'; // Import useAuth
import useDocumentMeta from '../../hooks/useDocumentMeta';

const ReferenceNameManager = () => {
  useDocumentMeta({ title: 'Reference Names', noindex: true });
  const [newReferenceName, setNewReferenceName] = useState('');
  const [referenceNames, setReferenceNames] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user: authUser, isAdmin } = useAuth(); // Get auth user and admin status

  useEffect(() => {
    if (!authUser) { // Don't fetch if user is not logged in
      setReferenceNames({});
      return;
    }

    let queryRef;
    if (isAdmin) {
      queryRef = ref(db, 'ReferenceNames'); // Admin sees all
    } else {
      // User sees only their own reference names
      queryRef = query(ref(db, 'ReferenceNames'), orderByChild('createdBy'), equalTo(authUser.uid));
    }

    const unsubscribe = onValue(queryRef, (snapshot) => {
      const data = snapshot.val();
      setReferenceNames(data || {});
    });

    return () => unsubscribe();
  }, [authUser, isAdmin]);

  const getUserDisplayName = (user) => {
    if (!user) return 'Unknown User';
    return user.displayName || user.email || user.uid;
  };

  const handleAddReferenceName = async () => {
    if (newReferenceName.trim() === '') {
      setError('Reference Name cannot be empty.');
      return;
    }
    if (!authUser) {
      setError('You must be logged in to add a reference name.');
      return;
    }
    setError(null);
    setLoading(true);

    const referenceData = {
      name: newReferenceName.trim(),
      createdBy: authUser.uid,
      createdByName: getUserDisplayName(authUser), // Optional: for admin view
    };

    const referenceNamesRef = ref(db, 'ReferenceNames');
    try {
      await push(referenceNamesRef, referenceData);
      setNewReferenceName('');
    } catch (e) {
      setError('Could not add reference name. ' + e.message);
      console.error("Error adding reference name:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReferenceName = async (key) => {
    if (!authUser) {
      setError('You must be logged in to delete reference names.');
      return;
    }

    const refToDelete = referenceNames[key];
    if (!refToDelete) {
      setError('Reference name not found.');
      return;
    }

    // Check permissions: admin or owner can delete
    if (!isAdmin && refToDelete.createdBy !== authUser.uid) {
      setError('You do not have permission to delete this reference name.');
      return;
    }

    try {
      const referenceNameRef = ref(db, `ReferenceNames/${key}`);
      await remove(referenceNameRef);
    } catch (e) {
      setError('Could not delete reference name. ' + e.message);
      console.error("Error deleting reference name:", e);
    }
  };

  return (
    <div className="reference-name-manager">
      <h2>Manage Reference Names</h2>

      <div className="add-reference-name">
        <h3>Add New Reference Name</h3>
        <input
          type="text"
          value={newReferenceName}
          onChange={(e) => setNewReferenceName(e.target.value)}
          placeholder="Enter Reference Name"
        />
        <button onClick={handleAddReferenceName} disabled={loading || !authUser}>{loading ? 'Adding...' : 'Add'}</button>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="reference-name-list">
        <h3>Current Reference Names</h3>
        {Object.entries(referenceNames).length > 0 ? (
          <ul>
            {Object.entries(referenceNames).map(([key, refData]) => (
              <li key={key}>
                {refData.name}
                {isAdmin && <span className="created-by-admin"> (By: {refData.createdByName || refData.createdBy})</span>}
                {(isAdmin || (authUser && refData.createdBy === authUser.uid)) && (
                  <button onClick={() => handleDeleteReferenceName(key)} className="delete-button">Delete</button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No reference names added yet.</p>
        )}
      </div>
    </div>
  );
};

export default ReferenceNameManager;