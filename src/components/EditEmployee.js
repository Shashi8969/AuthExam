// src/components/EditEmployee.js
import React, { useState, useEffect } from 'react'; // Added React for potential JSX needs if not already implied
import { ref, get, update, onValue, push } from 'firebase/database'; // Added onValue and push
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import FileUpload from './FileUpload';

const EditEmployee = ({ employeeId, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    phoneNo: '',
    addharNo: '',
    address: '',
    referenceName: '',
    imageUrl: '',
    addharFrontImageUrl: '',
    addharBackImageUrl: ''
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [referenceNameOptions, setReferenceNameOptions] = useState([{ value: '', label: 'Select a Reference' }]);
  const [rawReferenceNames, setRawReferenceNames] = useState({});
  const [makeReferencable, setMakeReferencable] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // Fetch employee data and reference names
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const employeeRef = ref(db, `Employees/${employeeId}`);
        const snapshot = await get(employeeRef);
        if (snapshot.exists()) {
          setFormData(snapshot.val());
          // Check if current employee's name is a reference to set initial toggle state
          // This check will be refined in the combined useEffect below
        }
        setInitialDataLoaded(true); // Mark that initial employee data has been attempted to load
      } catch (error) {
        console.error("Error fetching employee:", error);
      } finally {
        setLoading(false);
      }
    };
    const fetchReferenceNames = () => {
      const referenceNamesRef = ref(db, 'ReferenceNames');
      const unsubscribe = onValue(referenceNamesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const optionsArray = Object.values(data).map(name => ({ value: name, label: name }));
          setReferenceNameOptions([{ value: '', label: 'Select a Reference' }, ...optionsArray]);
          setRawReferenceNames(data);
        } else {
          setReferenceNameOptions([{ value: '', label: 'Select a Reference' }]);
          setRawReferenceNames({});
        }
      });
      return unsubscribe;
    };

    fetchEmployee();
    const unsubscribeReferences = fetchReferenceNames();

    return () => {
      unsubscribeReferences();
    };
  }, [employeeId]);

  // Effect to set initial 'makeReferencable' state once both employee data and reference names are loaded
  useEffect(() => {
    if (initialDataLoaded && formData.name && Object.keys(rawReferenceNames).length > 0) {
      if (Object.values(rawReferenceNames).includes(formData.name)) {
        setMakeReferencable(true);
      }
    }
  }, [initialDataLoaded, formData.name, rawReferenceNames]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleImageUpdate = (fieldName) => async (newUrl) => {
    // Delete old image from storage if it exists
    if (formData[fieldName]) {
      try {
        const oldImageRef = storageRef(storage, formData[fieldName]);
        await deleteObject(oldImageRef);
      } catch (error) {
        console.error("Error deleting old image:", error);
      }
    }
    
    setFormData(prev => ({ ...prev, [fieldName]: newUrl }));
  };

  const handleMakeReferencableChange = (e) => {
    setMakeReferencable(e.target.checked);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const employeeRef = ref(db, `Employees/${employeeId}`);
      await update(employeeRef, formData);

      if (makeReferencable && formData.name && formData.name.trim() !== '') {
        const nameExists = Object.values(rawReferenceNames).includes(formData.name.trim());
        if (!nameExists) {
          const referenceNamesDbRef = ref(db, 'ReferenceNames');
          await push(referenceNamesDbRef, formData.name.trim());
          // No need to update local reference names state here as onValue will do it
        }
      }

      alert('Employee updated successfully!');
      onClose();
    } catch (error) {
      console.error("Error updating employee:", error);
      alert('Failed to update employee');
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
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Phone Number:</label>
            <input
              type="text"
              name="phoneNo"
              value={formData.phoneNo}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Aadhar Number:</label>
            <input
              type="text"
              name="addharNo"
              value={formData.addharNo}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Address:</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Reference Name:</label>
            <select
              name="referenceName"
              value={formData.referenceName || ''}
              onChange={handleChange}
              required={!makeReferencable} // Required if not making this person a reference
            >
              {referenceNameOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="makeReferencableEdit" style={{ display: 'flex', alignItems: 'center' }}>
              Make this person a referencable option?
              <input
                type="checkbox"
                id="makeReferencableEdit"
                name="makeReferencable"
                checked={makeReferencable}
                onChange={handleMakeReferencableChange}
                style={{ marginLeft: '10px' }}
              />
            </label>
          </div>

          <div className="form-group">
            <label>Profile Image:</label>
            <FileUpload 
              label="Update Profile Image"
              onUpload={handleImageUpdate('imageUrl')}
              employeeId={employeeId}
            />
            {formData.imageUrl && (
              <img src={formData.imageUrl} alt="Current Profile" className="preview-image" />
            )}
          </div>

          <div className="form-group">
            <label>Aadhar Front Image:</label>
            <FileUpload 
              label="Update Aadhar Front"
              imageType="aadhar"
              cropType="aadhar"
              onUpload={handleImageUpdate('addharFrontImageUrl')}
              employeeId={employeeId}
            />
            {formData.addharFrontImageUrl && (
              <img src={formData.addharFrontImageUrl} alt="Current Aadhar Front" className="preview-image" />
            )}
          </div>

          <div className="form-group">
            <label>Aadhar Back Image:</label>
            <FileUpload 
              label="Update Aadhar Back"
              imageType="aadhar"
              cropType="aadhar"
              onUpload={handleImageUpdate('addharBackImageUrl')}
              employeeId={employeeId}
            />
            {formData.addharBackImageUrl && (
              <img src={formData.addharBackImageUrl} alt="Current Aadhar Back" 
              className="preview-image" 
              />
            )}
          </div>

          <button type="submit" disabled={updating} className="submit-btn">
            {updating ? 'Updating...' : 'Update Employee'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditEmployee;
