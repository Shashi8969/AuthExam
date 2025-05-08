// src/components/EmployeeForm.js
import React from 'react';
import useForm from '../hooks/useForm';
import FileUpload from './FileUpload';
import { formFields } from '../constants/formFields';
import { imageUploadFields } from '../constants/imageUploadFields';

const EmployeeForm = () => {
  const {
    formData,
    empId,
    error,
    loading,
    handleChange,
    handleSubmit,
    handleImageUpload,
  } = useForm();

  return (
    <form onSubmit={handleSubmit} className="employee-form">
      <h2>Add New Employee</h2>

      {formFields.map((field) => (
        <div key={field.name} className="form-group">
          <label>{field.label}:</label>
          <input
            type={field.type}
            name={field.name}
            value={formData[field.name] || ''}
            onChange={handleChange}
            required={field.required}
          />
        </div>
      ))}

      {imageUploadFields.map((field) => (
        <div key={field.name} className="form-group">
          <label>{field.label}:</label>
          <FileUpload
            label={`Upload ${field.label}`}
            onUpload={(url) => handleImageUpload(field.name, url)}
            employeeId={empId}
            cropType={field.cropType}
            imageType={field.imageType}
          />
          {formData[field.name] && (
            <img src={formData[field.name]} alt={field.label} className="preview-image" />
          )}
        </div>
      ))}

      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? 'Submitting...' : 'Add Employee'}
      </button>

      {error && <p style={{ color: 'red' }}>{error.message}</p>}
    </form>
  );
};

export default EmployeeForm;