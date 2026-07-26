// src/components/EmployeeForm.js
import React, { useState, useEffect, useMemo } from 'react'; // Added useMemo
import useForm from '../../hooks/useForm';
import FileUpload from './FileUpload';
import BulkEmployeeUpload from './BulkEmployeeUpload';
import { formFields as initialFormFieldsConfig } from '../../constants/formFields'; // Renamed for clarity
import { imageUploadFields } from '../../constants/imageUploadFields';
import { ref, onValue, push, set, query, orderByChild, equalTo, get, serverTimestamp } from 'firebase/database'; // Import Firebase functions, added serverTimestamp
import Employee from '../../models/Employee'; // Import Employee model
import './EmployeeForm.css'; // Import the new CSS file
import { db } from '../../config/firebase'; // Your Firebase configuration
import { useAuth } from '../../context/AuthContext'; // Import useAuth

// Helper to generate a unique key for form sessions or new entities
const generateUniqueKey = () => push(ref(db, '_tempKeys')).key; // Using a dummy path for key generation

const EmployeeForm = () => {
  const [referenceNameOptions, setReferenceNameOptions] = useState([{ value: '', label: 'Loading references...' }]);
  const [rawReferenceNames, setRawReferenceNames] = useState({}); // Store raw data for easier checking
  const [makeReferencable, setMakeReferencable] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  // This ID is used for grouping uploaded files for a new, unsaved employee.
  const [formSessionId, setFormSessionId] = useState(null);
  const { user: authUser, isAdmin } = useAuth(); // Get user and isAdmin status

  const {
    formData,
    // empId, // Not directly used from useForm for new employee ID logic here
    error,
    loading,
    handleChange,
    handleImageUpload, // Correctly get handleImageUpload from useForm
    setLoading,
    setError,
    resetForm, // Import resetForm from the hook
  } = useForm(new Employee({})); // Initialize useForm with an empty Employee model

  useEffect(() => {
    setFormSessionId(generateUniqueKey()); // Generate a unique ID for this form session
  }, []);

  useEffect(() => {
    if (!authUser && !isAdmin) return () => { }; // No user and not admin, do nothing for references

    let queryRef;
    if (isAdmin) {
      queryRef = ref(db, 'ReferenceNames'); // Admin sees all
    } else if (authUser) {
      queryRef = query(ref(db, 'ReferenceNames'), orderByChild('createdBy'), equalTo(authUser.uid)); // User sees their own
    } else {
      setReferenceNameOptions([{ value: '', label: 'Select a Reference' }]);
      setRawReferenceNames({});
      return () => { }; // Should not happen if authUser check above is correct
    }

    const unsubscribe = onValue(queryRef, (snapshot) => {
      const data = snapshot.val();
      const loadedReferences = {};
      const optionsArray = [];
      if (data) {
        Object.keys(data).forEach(key => {
          loadedReferences[key] = { ...data[key], id: key }; // Store full object with ID
          optionsArray.push({ value: data[key].name, label: data[key].name });
        });
      }
      setReferenceNameOptions([{ value: '', label: 'Select a Reference' }, ...optionsArray.sort((a, b) => a.label.localeCompare(b.label))]);
      setRawReferenceNames(loadedReferences); // Store the fetched objects
    });
    return () => unsubscribe();
  }, [authUser, isAdmin]);

  // Dynamically build formFields configuration based on state
  const formFields = useMemo(() => {
    return initialFormFieldsConfig.map(field => {
      if (field.name === 'referenceName') {
        return {
          ...field,
          options: referenceNameOptions,
          required: !makeReferencable, // Update required status based on toggle
        };
      }
      return field;
    });
  }, [referenceNameOptions, makeReferencable]);


  const handleMakeReferencableChange = (e) => {
    setMakeReferencable(e.target.checked);
    // The 'required' status of referenceName is now handled by the useMemo for formFields
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!authUser) {
      setError(new Error('You must be logged in to add an employee.'));
      return;
    }
    // Ensure addharNo is treated as a string for .trim()
    const aadharNumber = String(formData.addharNo || '').trim();
    if (!aadharNumber) {
      setError(new Error('Aadhar number is required.'));
      return;
    }
    setLoading(true);
    setError(null); // Clear any previous errors

    try {
      // 1. Check for duplicate Aadhar number within the current user's employees
      const userEmployeesQuery = query(ref(db, 'Employees'), orderByChild('createdBy'), equalTo(authUser.uid));
      const userEmployeesSnapshot = await get(userEmployeesQuery);
      let duplicateFound = false;
      if (userEmployeesSnapshot.exists()) {
        userEmployeesSnapshot.forEach(childSnapshot => {
          const employee = childSnapshot.val();
          if (employee.addharNo && String(employee.addharNo).trim() === aadharNumber) {
            duplicateFound = true;
          }
        });
      }
      if (duplicateFound) {
        setError(new Error('Aadhar number already exists in your records. This person may already be registered.'));
        setLoading(false);
        return;
      }

      // 2. Prepare and save new employee data
      const newEmployeeRef = push(ref(db, 'Employees'));
      const generatedEmpId = newEmployeeRef.key;

      // Ensure all data, including image URLs from formData, is included
      const employeeToSave = new Employee({
        ...formData, // Contains text inputs and image URLs
        empId: generatedEmpId,
        createdBy: authUser.uid, // Set the creator
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // isBiometricOperator: true, // Default or from a form field if you add one
        // Ensure phoneNo and addharNo are stored as strings if that's the model's expectation
        phoneNo: String(formData.phoneNo || ''),
        addharNo: String(formData.addharNo || ''),
      });

      const dataToSave = employeeToSave.toFirebase();

      if (!dataToSave.createdBy || dataToSave.createdBy !== authUser.uid) {
        console.error("[EmployeeForm] 'createdBy' field is missing or incorrect in the data to save.");
        throw new Error("'createdBy' field is missing or incorrect. Cannot save employee.");
      }
      await set(newEmployeeRef, dataToSave);
      alert('Employee added successfully!');

      // 3. Add to ReferenceNames if applicable
      if (makeReferencable && formData.name && formData.name.trim() !== '') {
        const trimmedName = formData.name.trim();
        // Check if this name already exists in the current user's reference names
        let nameExists = false;
        if (authUser) {
          const userReferences = Object.values(rawReferenceNames).filter(refObj => refObj.createdBy === authUser.uid);
          nameExists = userReferences.some(refObj => refObj.name === trimmedName);
        }

        if (!nameExists) {
          const referenceNamesRef = ref(db, 'ReferenceNames');
          // Save as an object with name and createdBy
          await push(referenceNamesRef, { name: trimmedName, createdBy: authUser.uid });
        }
      }

      // 4. Reset form state
      resetForm(); // Resets formData in useForm to initial Employee({})
      setMakeReferencable(false); // Reset the toggle
      // formFields will auto-update via useMemo due to makeReferencable change
      // No need to manually reset formFields to initialFormFieldsConfig here,
      // as useMemo handles its dynamic nature.

      // Generate a new formSessionId for the next form entry
      setFormSessionId(generateUniqueKey());

    } catch (err) {
      console.error("Error submitting form:", err);
      setError(new Error(err.message || 'Failed to add employee. Please try again.'));
      setLoading(false); // Ensure loading is false on error
    }
    // setLoading(false) should be in a finally if not handled in all paths of try/catch
    // It is handled in the success path (implicitly by resetForm or explicitly if needed)
    // and explicitly in the catch path.
    // And in the early return paths (aadhar exists, aadhar empty).
  };

  return (
    <div className="employee-form-container"> {/* Added a container div */}
      <div className="employee-form-top-bar">
        <h2 style={{ margin: 0 }}>Add New Operator</h2>
        <button
          type="button"
          className="btn-bulk-upload-trigger"
          onClick={() => setShowBulkUpload(true)}
          disabled={loading}
        >
          📊 Bulk Upload (Excel)
        </button>
      </div>

      {showBulkUpload && (
        <BulkEmployeeUpload
          onClose={() => setShowBulkUpload(false)}
          onSuccess={(count) => {
            alert(`${count} employee(s) added successfully via bulk upload!`);
            setShowBulkUpload(false);
          }}
        />
      )}

      <form onSubmit={handleSubmit} className="employee-form">

        {formFields.map((field) => (
          <div key={field.name} className="form-group">
            <label htmlFor={field.name}>{field.label}:</label>
            {field.type === 'select' ? ( // Simplified condition for select
              <select
                id={field.name}
                name={field.name}
                value={formData[field.name] || ''}
                onChange={handleChange}
                required={field.required}
                disabled={loading}
              >
                {field.options?.map((option) => ( // Added optional chaining for safety
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={field.name}
                type={field.type}
                name={field.name}
                value={formData[field.name] || ''}
                onChange={handleChange}
                required={field.required}
                pattern={field.pattern}
                title={field.title}
                disabled={loading}
              />
            )}
          </div>
        ))}

        <div className="form-group">
          <label htmlFor="makeReferencableToggle" className="make-referencable-label"> {/* Use class for styling */}
            Make this person a referencable option?
            <input
              type="checkbox"
              id="makeReferencableToggle"
              name="makeReferencable"
              checked={makeReferencable}
              onChange={handleMakeReferencableChange}
              // style={{ marginLeft: '10px' }} // Removed inline style
              disabled={loading}
            />
          </label>
        </div>

        {imageUploadFields.map((field) => (
          <div key={field.name} className="form-group file-upload-wrapper"> {/* Added file-upload-wrapper for potential specific styling */}
            <label>{field.label}:</label> {/* Consider adding htmlFor if FileUpload input has an id */}
            <FileUpload
              label={`Upload ${field.label}`}
              onUpload={(url) => handleImageUpload(field.name, url)}
              employeeId={formSessionId}
              cropType={field.cropType || 'profile'}
              disabled={loading}
            />
            {formData[field.name] && (
              <div className="image-preview-container">
                <img src={formData[field.name]} alt={`${field.label} preview`} className="preview-image" />
              </div>
            )}
          </div>
        ))}

        <button type="submit" className="submit-btn" disabled={loading || !formSessionId}>
          {loading ? 'Submitting...' : 'Add Employee'}
        </button>

        {error && <p className="error-message">{error.message}</p>}
      </form>
    </div>
  );
};

export default EmployeeForm;