// src/components/EmployeeList/EditEmployee.js
import React, { useState, useEffect } from 'react';
import { ref, get, update, onValue, push, query, orderByChild, equalTo, serverTimestamp } from 'firebase/database';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import FileUpload from '../EmployeeForm/FileUpload';
import { useAuth } from '../../context/AuthContext';

const EditEmployee = ({ employeeId, onClose }) => {
  const [formData, setFormData] = useState({
    name: '', phoneNo: '', addharNo: '', address: '',
    referenceName: '', imageUrl: '', addharFrontImageUrl: '', addharBackImageUrl: ''
  });
  const [originalData, setOriginalData] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [updating, setUpdating] = useState(false);
  const [referenceNameOptions, setReferenceNameOptions] = useState([{ value: '', label: 'Select a Reference' }]);
  const [rawReferenceNames, setRawReferenceNames] = useState({});
  const [makeReferencable, setMakeReferencable] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const { user: authUser, isAdmin, isSupervisor } = useAuth();

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const snap = await get(ref(db, `Employees/${employeeId}`));
        if (snap.exists()) {
          const d = snap.val();
          const normalized = { ...d, phoneNo: String(d.phoneNo || ''), addharNo: String(d.addharNo || '') };
          setFormData(normalized);
          setOriginalData(normalized);
        }
        setInitialDataLoaded(true);
      } catch (err) {
        console.error('Error fetching employee:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchReferenceNames = () => {
      if (!authUser && !isAdmin) return () => {};
      const queryRef = isAdmin
        ? ref(db, 'ReferenceNames')
        : query(ref(db, 'ReferenceNames'), orderByChild('createdBy'), equalTo(authUser.uid));

      const unsub = onValue(queryRef, (snap) => {
        const data = snap.val();
        const loaded = {};
        const opts = [];
        if (data) {
          Object.keys(data).forEach(key => {
            loaded[key] = { ...data[key], id: key };
            opts.push({ value: data[key].name, label: data[key].name });
          });
        }
        setReferenceNameOptions([{ value: '', label: 'Select a Reference' }, ...opts.sort((a, b) => a.label.localeCompare(b.label))]);
        setRawReferenceNames(loaded);
      });
      return unsub;
    };

    fetchEmployee();
    const unsub = fetchReferenceNames();
    return () => unsub();
  }, [employeeId, authUser, isAdmin]);

  useEffect(() => {
    if (initialDataLoaded && formData.name && authUser && Object.keys(rawReferenceNames).length > 0) {
      const userRefs = Object.values(rawReferenceNames).filter(r => r.createdBy === authUser.uid);
      setMakeReferencable(userRefs.some(r => r.name === formData.name));
    }
  }, [initialDataLoaded, formData.name, rawReferenceNames, authUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpdate = (fieldName) => async (newUrl) => {
    if (formData[fieldName]) {
      try { await deleteObject(storageRef(storage, formData[fieldName])); } catch {}
    }
    setFormData(prev => ({ ...prev, [fieldName]: newUrl }));
  };

  // ── Submit: direct save for admin/owner, approval request for supervisor ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);

    const dataToSave = {
      ...formData,
      phoneNo: String(formData.phoneNo || '').trim(),
      addharNo: String(formData.addharNo || '').trim(),
    };

    try {
      if (isSupervisor && !isAdmin) {
        // Supervisor: submit update request for admin approval
        await push(ref(db, 'PendingApprovals'), {
          employeeId,
          oldData: originalData,
          newData: dataToSave,
          requestedBy: authUser.uid,
          supervisorName: authUser.displayName || authUser.email?.split('@')[0] || 'Supervisor',
          requestedAt: serverTimestamp(),
          status: 'pending',
        });
        alert('Update request submitted! An admin will review and approve your changes.');
        onClose();
        return;
      }

      // Admin or record owner: save directly
      await update(ref(db, `Employees/${employeeId}`), dataToSave);

      if (makeReferencable && formData.name?.trim() && authUser) {
        const trimmed = formData.name.trim();
        const userRefs = Object.values(rawReferenceNames).filter(r => r.createdBy === authUser.uid);
        if (!userRefs.some(r => r.name === trimmed)) {
          await push(ref(db, 'ReferenceNames'), { name: trimmed, createdBy: authUser.uid });
        }
      }

      alert('Employee updated successfully!');
      onClose();
    } catch (err) {
      console.error('Update error:', err);
      alert('Failed to update employee. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div>Loading employee data...</div>;

  return (
    <div className="edit-employee-modal">
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}>×</button>
        <h2>Edit Employee</h2>

        {/* Supervisor notice banner */}
        {isSupervisor && !isAdmin && (
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px',
            padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#92400e'
          }}>
            ⚠️ As a supervisor, your changes will be <strong>sent to admin for approval</strong> before being applied.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name:</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Phone Number:</label>
            <input type="text" name="phoneNo" value={formData.phoneNo} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Aadhar Number:</label>
            <input type="text" name="addharNo" value={formData.addharNo} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Address:</label>
            <input type="text" name="address" value={formData.address} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Reference Name:</label>
            <select name="referenceName" value={formData.referenceName || ''} onChange={handleChange} required={!makeReferencable}>
              {referenceNameOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="makeReferencableEdit" style={{ display: 'flex', alignItems: 'center' }}>
              Make this person a referencable option?
              <input type="checkbox" id="makeReferencableEdit" checked={makeReferencable}
                onChange={(e) => setMakeReferencable(e.target.checked)} style={{ marginLeft: '10px' }} />
            </label>
          </div>

          {/* Image uploads — only for admin/owner, not supervisor */}
          {!isSupervisor && (
            <>
              <div className="form-group">
                <label>Profile Image:</label>
                <FileUpload label="Update Profile Image" onUpload={handleImageUpdate('imageUrl')} employeeId={employeeId} />
                {formData.imageUrl && <img src={formData.imageUrl} alt="Profile" className="preview-image" />}
              </div>
              <div className="form-group">
                <label>Aadhar Front:</label>
                <FileUpload label="Update Aadhar Front" cropType="aadhar" onUpload={handleImageUpdate('addharFrontImageUrl')} employeeId={employeeId} />
                {formData.addharFrontImageUrl && <img src={formData.addharFrontImageUrl} alt="Aadhar Front" className="preview-image" />}
              </div>
              <div className="form-group">
                <label>Aadhar Back:</label>
                <FileUpload label="Update Aadhar Back" cropType="aadhar" onUpload={handleImageUpdate('addharBackImageUrl')} employeeId={employeeId} />
                {formData.addharBackImageUrl && <img src={formData.addharBackImageUrl} alt="Aadhar Back" className="preview-image" />}
              </div>
            </>
          )}

          <button type="submit" disabled={updating} className="submit-btn">
            {updating ? 'Submitting...' : isSupervisor && !isAdmin ? '📤 Submit for Approval' : 'Update Employee'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditEmployee;
