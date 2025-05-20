// src/components/CenterManager.js
import React, { useState, useEffect } from 'react';
import { ref, set, onValue, remove, get } from 'firebase/database';
import { db } from '../config/firebase';

const CenterManager = () => {
  const [centerCode, setCenterCode] = useState('');
  const [centerName, setCenterName] = useState('');
  const [operatorCount, setOperatorCount] = useState('');
  const [predefinedCenters, setPredefinedCenters] = useState({});
  const [editingCenterKey, setEditingCenterKey] = useState(null); // Store the key (centerCode) of the center being edited
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const centersRef = ref(db, 'PredefinedCenters');
    const unsubscribe = onValue(centersRef, (snapshot) => {
      const data = snapshot.val();
      setPredefinedCenters(data || {});
    });
    return () => unsubscribe();
  }, []);

  const clearForm = () => {
    setCenterCode('');
    setCenterName('');
    setOperatorCount('');
    setEditingCenterKey(null);
    setError('');
    setSuccess('');
  };

  const handleAddOrUpdateCenter = async () => {
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
      // code: currentCode // Storing code as a field is redundant if key is code
    };

    try {
      // If not editing, or if editing and the code (key) has changed, check for code uniqueness
      if (!editingCenterKey || (editingCenterKey && editingCenterKey !== currentCode)) {
        const existingCenterRef = ref(db, `PredefinedCenters/${currentCode}`);
        const snapshot = await get(existingCenterRef);
        if (snapshot.exists()) {
          setError(`Center Code "${currentCode}" already exists. Choose a unique code.`);
          return;
        }
      }

      // If editing and the code (key) changed, remove the old entry
      if (editingCenterKey && editingCenterKey !== currentCode) {
        await remove(ref(db, `PredefinedCenters/${editingCenterKey}`));
      }

      await set(ref(db, `PredefinedCenters/${currentCode}`), centerData);
      setSuccess(editingCenterKey ? 'Center updated successfully!' : 'Center added successfully!');
      clearForm();
    } catch (e) {
      setError(`Failed to ${editingCenterKey ? 'update' : 'add'} center. ${e.message}`);
      console.error(e);
    }
  };

  const handleDeleteCenter = async (codeToDelete) => {
    if (window.confirm(`Are you sure you want to delete center ${codeToDelete}? This action cannot be undone.`)) {
      try {
        await remove(ref(db, `PredefinedCenters/${codeToDelete}`));
        setSuccess('Center deleted successfully!');
        if (editingCenterKey === codeToDelete) {
          clearForm();
        }
      } catch (e) {
        setError('Failed to delete center.');
        console.error(e);
      }
    }
  };

  const handleEditCenter = (code) => {
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
    <div className="center-manager" style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: 'auto' }}>
      <h2>Manage Predefined Centers</h2>

      <div className="center-form" style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        <h3>{editingCenterKey ? 'Edit Center' : 'Add New Center'}</h3>
        {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}
        {success && <p style={{ color: 'green', marginBottom: '10px' }}>{success}</p>}
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="centerCode" style={{ display: 'block', marginBottom: '5px' }}>Center Code:</label>
          <input type="text" id="centerCode" value={centerCode} onChange={(e) => setCenterCode(e.target.value)} placeholder="Unique Center Code (e.g., C001)" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="centerName" style={{ display: 'block', marginBottom: '5px' }}>Center Name:</label>
          <input type="text" id="centerName" value={centerName} onChange={(e) => setCenterName(e.target.value)} placeholder="e.g., Main City Center" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="operatorCount" style={{ display: 'block', marginBottom: '5px' }}>Required Operator Count:</label>
          <input type="number" id="operatorCount" value={operatorCount} onChange={(e) => setOperatorCount(e.target.value)} placeholder="e.g., 5" min="0" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
        </div>
        <button onClick={handleAddOrUpdateCenter} style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '10px' }}>
          {editingCenterKey ? 'Update Center' : 'Add Center'}
        </button>
        {editingCenterKey && (
          <button onClick={clearForm} style={{ padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Cancel Edit
          </button>
        )}
      </div>

      <div className="center-list">
        <h3>Current Predefined Centers</h3>
        {Object.keys(predefinedCenters).length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f2f2f2' }}>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Code</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Name</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Operator Count</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(predefinedCenters).map(([code, center]) => (
                <tr key={code}>
                  <td style={{ border: '1px solid #ddd', padding: '10px' }}>{code}</td>
                  <td style={{ border: '1px solid #ddd', padding: '10px' }}>{center.name}</td>
                  <td style={{ border: '1px solid #ddd', padding: '10px' }}>{center.count}</td>
                  <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                    <button onClick={() => handleEditCenter(code)} style={{ marginRight: '5px', padding: '6px 12px', backgroundColor: '#ffc107', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => handleDeleteCenter(code)} style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No predefined centers added yet. Add one using the form above.</p>
        )}
      </div>
    </div>
  );
};

export default CenterManager;