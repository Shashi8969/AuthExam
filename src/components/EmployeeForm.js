// src/components/EmployeeForm.js
import { useState } from 'react';
import { push, set } from 'firebase/database';
import { employeesRef } from '../config/firebase';
import FileUpload from './FileUpload';

const EmployeeForm = () => {
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const newEmployeeRef = push(employeesRef);
      await set(newEmployeeRef, {
        ...formData,
        empId: newEmployeeRef.key
      });
      alert('Employee added successfully!');
      setFormData({
        name: '',
        phoneNo: '',
        addharNo: '',
        address: '',
        referenceName: '',
        imageUrl: '',
        addharFrontImageUrl: '',
        addharBackImageUrl: ''
      });
    } catch (error) {
      console.error("Error adding employee:", error);
      alert('Failed to add employee');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="employee-form">
      <h2>Add New Employee</h2>
      
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
        <label>Employee Image:</label>
        <FileUpload 
          label="Upload Profile Image"
          onUpload={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
          employeeId={formData.name.replace(/\s+/g, '-').toLowerCase()}
        />
        {formData.imageUrl && (
          <img src={formData.imageUrl} alt="Employee" className="preview-image" />
        )}
      </div>

      <div className="form-group">
        <label>Aadhar Front Image:</label>
        <FileUpload 
          label="Upload Aadhar Front"
          onUpload={(url) => setFormData(prev => ({ ...prev, addharFrontImageUrl: url }))}
          employeeId={formData.name.replace(/\s+/g, '-').toLowerCase()}
        />
        {formData.addharFrontImageUrl && (
          <img src={formData.addharFrontImageUrl} alt="Aadhar Front" className="preview-image" />
        )}
      </div>

      <div className="form-group">
        <label>Aadhar Back Image:</label>
        <FileUpload 
          label="Upload Aadhar Back"
          onUpload={(url) => setFormData(prev => ({ ...prev, addharBackImageUrl: url }))}
          employeeId={formData.name.replace(/\s+/g, '-').toLowerCase()}
        />
        {formData.addharBackImageUrl && (
          <img src={formData.addharBackImageUrl} alt="Aadhar Back" className="preview-image" />
        )}
      </div>

      <button type="submit" className="submit-btn">Add Employee</button>
    </form>
  );
};

export default EmployeeForm;