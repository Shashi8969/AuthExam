// src/components/EmployeeForm.js
import React, { useState, useEffect } from 'react';
import useForm from '../hooks/useForm';
import FileUpload from './FileUpload';
import { formFields as initialFormFields } from '../constants/formFields'; // Rename initial import
import { imageUploadFields } from '../constants/imageUploadFields';
import { ref, onValue, push, set } from 'firebase/database'; // Import Firebase functions
import { db } from '../config/firebase'; // Your Firebase configuration

const EmployeeForm = () => {
  const [referenceNames, setReferenceNames] = useState([]);
  const [formFields, setFormFields] = useState(initialFormFields); // Manage formFields as state
  const [makeReferencable, setMakeReferencable] = useState(false); // New state for the toggle

  const {
    formData,
    empId,
    error,
    loading,
    handleChange,
    handleSubmit: 
    handleImageUpload,
    setLoading,
    setError,
    resetForm // Import resetForm from the hook
  } = useForm();

  useEffect(() => {
    const referenceNamesRef = ref(db, 'ReferenceNames');
    const unsubscribe = onValue(referenceNamesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const optionsArray = Object.values(data).map(name => ({ value: name, label: name }));
        setReferenceNames(data);
        setFormFields(prevFields =>
          prevFields.map(field =>
            field.name === 'referenceName' ? { ...field, options: [{ value: '', label: 'Select a Reference' }, ...optionsArray] } : field
          )
        );
      } else {
        setReferenceNames({});
        setFormFields(prevFields =>
          prevFields.map(field =>
            field.name === 'referenceName' ? { ...field, options: [{ value: '', label: 'Select a Reference' }] } : field
          )
        );
      }
    });
    return () => unsubscribe();
  }, []);

  const handleMakeReferencableChange = (e) => {
    const isChecked = e.target.checked;
    setMakeReferencable(isChecked);
    setFormFields(prevFields =>
      prevFields.map(field =>
        field.name === 'referenceName' ? { ...field, required: !isChecked } : field
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newEmployeeRef = push(ref(db, 'Employees'));
      const generatedEmpId = newEmployeeRef.key;
      const employeeData = { ...formData, empId: generatedEmpId };
      await set(newEmployeeRef, employeeData);

      if (makeReferencable && formData.name.trim() !== '') {
        const referenceNamesRef = ref(db, 'ReferenceNames');
        const nameExists = Object.values(referenceNames).includes(formData.name);
        if (!nameExists) {
          await push(referenceNamesRef, formData.name);
        }
      }

      // Reset form and loading state
      resetForm(); // Use the resetForm function from the hook
      setMakeReferencable(false); // Reset the toggle
      setFormFields(initialFormFields); // Reset form fields to initial state
    } catch (error) {
      setError(error);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="employee-form">
      <h2>Add New Operator</h2>

      {formFields.map((field) => (
        <div key={field.name} className="form-group">
          <label>{field.label}:</label>
          {field.type === 'select' && field.name === 'referenceName' ? (
            <select
              name={field.name}
              value={formData[field.name] || ''}
              onChange={handleChange}
              required={field.required}
            >
              {field.options && field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.type}
              name={field.name}
              value={formData[field.name] || ''}
              onChange={handleChange}
              required={field.required}
              pattern={field.pattern}
              title={field.title}
            />
          )}
        </div>
      ))}

      <div className="form-group">
        <label>
          Make this person a referencable option?
          <input
            type="checkbox"
            name="makeReferencable"
            checked={makeReferencable}
            onChange={handleMakeReferencableChange}
            style={{ marginLeft: '10px' }}
          />
        </label>
      </div>

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