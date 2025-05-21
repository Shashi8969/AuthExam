// src/components/ReferenceNameManager.js
import React, { useState, useEffect } from 'react';
import { ref, push, onValue, remove } from 'firebase/database';
import { db } from '../../config/firebase';
import './ReferenceNameManager.css'; // Import the CSS file

const ReferenceNameManager = () => {
  const [newReferenceName, setNewReferenceName] = useState('');
  const [referenceNames, setReferenceNames] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const referenceNamesRef = ref(db, 'ReferenceNames');

    const unsubscribe = onValue(referenceNamesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setReferenceNames(data);
      } else {
        setReferenceNames({});
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAddReferenceName = async () => {
    if (newReferenceName.trim() === '') {
      setError('Reference Name cannot be empty.');
      return;
    }
    setError(null);
    const referenceNamesRef = ref(db, 'ReferenceNames');
    try {
      await push(referenceNamesRef, newReferenceName);
      setNewReferenceName('');
    } catch (e) {
      setError('Could not add reference name.');
      console.error("Error adding reference name:", e);
    }
  };

  const handleDeleteReferenceName = async (key) => {
    try {
      const referenceNameRef = ref(db, `ReferenceNames/${key}`);
      await remove(referenceNameRef);
    } catch (e) {
      setError('Could not delete reference name.');
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
        <button onClick={handleAddReferenceName}>Add</button>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="reference-name-list">
        <h3>Current Reference Names</h3>
        {Object.entries(referenceNames).length > 0 ? (
          <ul>
            {Object.entries(referenceNames).map(([key, name]) => (
              <li key={key}>
                {name}
                <button onClick={() => handleDeleteReferenceName(key)}>Delete</button>
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