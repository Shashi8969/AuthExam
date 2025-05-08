// src/components/EmployeeDetails.js
import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore'; // Make sure you have firebase/firestore installed
import { db } from '../config/firebase'; // Ensure your Firebase config is set up correctly
import Employee from '../models/Employee'; // Make sure you have this model defined

const EmployeeDetails = ({ employeeId, onClose }) => {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmployeeDetails = async () => {
      try {
        const docRef = doc(db, 'Employees', employeeId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setEmployee(Employee.fromFirebase({ ...docSnap.data(), empId: docSnap.id }));
        } else {
          setError('Employee not found');
        }
      } catch (e) {
        setError('Failed to load employee details');
        console.error("Error fetching employee details:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeDetails();
  }, [employeeId]);

  if (loading) {
    return <div>Loading employee details...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!employee) {
    return null;
  }

  return (
    <div className="employee-details-modal">
      <h3>Employee Details</h3>
      <button onClick={onClose} className="close-btn">
        Close
      </button>
      {employee.imageUrl && (
        <img
          src={employee.imageUrl}
          alt={employee.name}
          className="large-profile-image"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/150';
          }}
        />
      )}
      <p><strong>Name:</strong> {employee.name}</p>
      <p><strong>Phone:</strong> {employee.phoneNo}</p>
      <p><strong>Aadhar:</strong> {employee.addharNo}</p>
      <p><strong>Address:</strong> {employee.address}</p>
      <p><strong>Reference Name:</strong> {employee.referenceName || '-'}</p>
      {employee.email && <p><strong>Email:</strong> {employee.email}</p>}
      {employee.designation && <p><strong>Designation:</strong> {employee.designation}</p>}
      {/* Add other employee details you want to display here */}
    </div>
  );
};

export default EmployeeDetails;