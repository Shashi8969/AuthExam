// src/components/EditEmployee.js
import { useState, useEffect } from 'react';
import { ref, get, update } from 'firebase/database';
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

  // Fetch employee data
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const employeeRef = ref(db, `Employees/${employeeId}`);
        const snapshot = await get(employeeRef);
        if (snapshot.exists()) {
          setFormData(snapshot.val());
        }
      } catch (error) {
        console.error("Error fetching employee:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [employeeId]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const employeeRef = ref(db, `Employees/${employeeId}`);
      await update(employeeRef, formData);
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
            <input
              type="text"
              name="referenceName"
              value={formData.referenceName}
              onChange={handleChange}
            />
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
              onUpload={handleImageUpdate('addharBackImageUrl')}
              employeeId={employeeId}
            />
            {formData.addharBackImageUrl && (
              <img src={formData.addharBackImageUrl} alt="Current Aadhar Back" className="preview-image" />
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
