// src/components/CenterManager.js
import React, { useState, useEffect } from 'react';
import { ref, set, onValue, remove, get, query, orderByChild, equalTo } from 'firebase/database';
import { db } from '../../config/firebase';
import './CenterManager.css'; // Import the CSS file
import { useAuth } from '../../context/AuthContext'; // Import useAuth
import useDocumentMeta from '../../hooks/useDocumentMeta';


const CenterManager = () => {
  useDocumentMeta({ title: 'Manage Centers', noindex: true });
  const [centerCode, setCenterCode] = useState('');
  const [centerName, setCenterName] = useState('');
  const [operatorCount, setOperatorCount] = useState('');
  const [predefinedCenters, setPredefinedCenters] = useState({});
  const [editingCenterKey, setEditingCenterKey] = useState(null); // Store the key (centerCode) of the center being edited
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user: authUser, isAdmin } = useAuth(); // Get auth user and admin status

  useEffect(() => {
    if (!authUser) return; // Don't fetch if user is not logged in

    let centersQuery;
    if (isAdmin) {
      centersQuery = ref(db, 'PredefinedCenters'); // Admin sees all
    } else {
      centersQuery = query(ref(db, 'PredefinedCenters'), orderByChild('createdBy'), equalTo(authUser.uid)); // User sees their own
    }

    const unsubscribe = onValue(centersQuery, (snapshot) => {
      const data = snapshot.val();
      setPredefinedCenters(data || {});
    });
    return () => unsubscribe();
  }, [authUser, isAdmin]);

  // Helper to get a display name for the user
  const getUserDisplayName = (user) => {
    if (!user) return 'Unknown User';
    return user.displayName || user.email || user.uid;
  };

  const clearForm = () => {
    setCenterCode('');
    setCenterName('');
    setOperatorCount('');
    setEditingCenterKey(null);
    setError('');
    setSuccess('');
  };

  const handleAddOrUpdateCenter = async () => {
    if (!authUser) {
      setError('You must be logged in to manage centers.');
      return;
    }

    const currentCode = centerCode.trim();
    const currentName = centerName.trim();
    const currentOpCount = operatorCount.trim();

    if (!currentCode || !currentName || !currentOpCount) {
      setError('All fields are required.');
      return;
    }
    if (isNaN(parseInt(currentOpCount)) || parseInt(currentOpCount) < 0) {
      setError('Operator count must be a non-negative number.');
      return;
    }

    setError('');
    setSuccess('');

    const centerData = {
      name: currentName,
      count: parseInt(currentOpCount),
      createdBy: authUser.uid, // Add creator's UID
      createdByName: getUserDisplayName(authUser), // Add creator's display name
      // code: currentCode // Storing code as a field is redundant if key is code
    };

    try {
      let canProceedWithWrite = true;

      // Uniqueness check for the center code:
      // - Admins can check if a code (new or changed) already exists.
      // - Non-admins cannot change the code when editing (input is disabled).
      // - For non-admins ADDING a NEW center, this client-side 'get' check will be permission denied
      //   if the code path doesn't exist or isn't theirs. So, we skip it for them here
      //   and rely on database write rules to handle actual creation/conflicts.
      if (isAdmin && (!editingCenterKey || (editingCenterKey && editingCenterKey !== currentCode))) {
        // Admin is creating a new center or changing the code of an existing one.
        const existingCenterRef = ref(db, `PredefinedCenters/${currentCode}`);
        const existingSnapshot = await get(existingCenterRef);
        if (existingSnapshot.exists()) {
          setError(`Admin: Center Code "${currentCode}" already exists. Please choose a unique code.`);
          canProceedWithWrite = false;
        }
      }

      if (canProceedWithWrite) {
        // If an admin is editing and changed the center code, remove the old entry.
        // Non-admins cannot change the code, so this block is effectively admin-only for code changes.
        if (isAdmin && editingCenterKey && editingCenterKey !== currentCode) {
          await remove(ref(db, `PredefinedCenters/${editingCenterKey}`));
        }

        await set(ref(db, `PredefinedCenters/${currentCode}`), centerData);
        setSuccess(editingCenterKey ? 'Center updated successfully!' : 'Center added successfully!');
        clearForm();
      }
    } catch (e) {
      // Simplified error handling. The detailed permission denied for 'get' is avoided for non-admins.
      // Any remaining "Permission denied" would likely be from the 'set' or 'remove' if rules are misconfigured.
      setError(`Failed to ${editingCenterKey ? 'update' : 'add'} center. ${e.message}`);
      console.error(e);
    }
  };

  const handleDeleteCenter = async (codeToDelete) => {
    if (!authUser) {
      setError('You must be logged in to delete centers.');
      return;
    }
    const centerToDeleteData = predefinedCenters[codeToDelete];
    if (!isAdmin && (!centerToDeleteData || centerToDeleteData.createdBy !== authUser.uid)) {
      setError('You do not have permission to delete this center.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete center ${codeToDelete}? This action cannot be undone.`)) {
      try {
        await remove(ref(db, `PredefinedCenters/${codeToDelete}`));
        setSuccess('Center deleted successfully!');
        if (editingCenterKey === codeToDelete) {
          clearForm();
        }
      } catch (e) { // Added missing brace
        setError('Failed to delete center.');
        console.error(e);
      }
    }
  };

  const handleEditCenter = (code) => {
    if (!authUser) return;
    const centerToEditData = predefinedCenters[code];
    if (!isAdmin && (!centerToEditData || centerToEditData.createdBy !== authUser.uid)) {
      // Non-admin trying to edit a center they don't own
      return;
    }
    const centerToEdit = predefinedCenters[code];
    if (centerToEdit) {
      setEditingCenterKey(code);
      setCenterCode(code);
      setCenterName(centerToEdit.name);
      setOperatorCount(centerToEdit.count.toString());
      setError('');
      setSuccess('');
    }
  };

  return (
    <div className="center-manager-container">
      <h2>Manage Predefined Centers</h2>

      <div className="center-form-container">
        <h3>{editingCenterKey ? 'Edit Center' : 'Add New Center'}</h3>
        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}
        <div className="form-group">
          <label htmlFor="centerCode">Center Code:</label>
          <input type="text" id="centerCode" value={centerCode} onChange={(e) => setCenterCode(e.target.value)} placeholder="Unique Center Code (e.g., C001)"
            disabled={editingCenterKey && !isAdmin} />
        </div>
        <div className="form-group">
          <label htmlFor="centerName">Center Name:</label>
          <input type="text" id="centerName" value={centerName} onChange={(e) => setCenterName(e.target.value)} placeholder="e.g., Main City Center" />
        </div>
        <div className="form-group form-group-last">
          <label htmlFor="operatorCount">Required Operator Count:</label>
          <input type="number" id="operatorCount" value={operatorCount} onChange={(e) => setOperatorCount(e.target.value)} placeholder="e.g., 5" min="0" />
        </div>
        <button onClick={handleAddOrUpdateCenter} className="button-primary">
          {editingCenterKey ? 'Update Center' : 'Add Center'}
        </button>
        {editingCenterKey && (
          <button onClick={clearForm} className="button-secondary">
            Cancel Edit
          </button>
        )}
      </div>

      <div className="center-list-container">
        <h3>Current Predefined Centers</h3>
        {Object.keys(predefinedCenters).length > 0 ? (
          <table className="centers-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Operator Count</th>
                {isAdmin && <th>Added By</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(predefinedCenters)
                .sort(([codeA, centerA], [codeB, centerB]) => {
                  // Sort by center name if defined, else by code
                  const nameA = centerA?.name || '';
                  const nameB = centerB?.name || '';
                  if (nameA && nameB) {
                    return nameA.localeCompare(nameB);
                  }
                  if (nameA) return -1;
                  if (nameB) return 1;
                  // Fallback to code comparison
                  return codeA.localeCompare(codeB);
                })
                .map(([code, center]) => (
                  <tr key={code}>
                    <td>{code}</td>
                    <td>{center.name}</td>
                    <td>{center.count}</td>
                    {isAdmin && <td>{center.createdByName || center.createdBy}</td>}
                    <td>
                      <button onClick={() => handleEditCenter(code)} className="action-button-edit">Edit</button>
                      <button onClick={() => handleDeleteCenter(code)} className="action-button-delete">Delete</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <p className="no-centers-message">No predefined centers added yet. Add one using the form above.</p>
        )}
      </div>
    </div>
  );
};

export default CenterManager;