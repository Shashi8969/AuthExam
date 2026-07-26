// src/components/EmployeeDetails.js
import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database'; // Changed to Realtime Database
import { db } from '../../config/firebase'; // Ensure your Firebase config is set up correctly
import Employee from '../../models/Employee'; // Make sure you have this model defined
import styles from './EmployeeDetails.module.css'; // Import CSS Module


const EmployeeDetails = ({ employeeId, onClose }) => {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmployeeDetails = async () => {
      try {
        const employeeRef = ref(db, `Employees/${employeeId}`); // Use RTDB ref
        const snapshot = await get(employeeRef); // Use RTDB get


       if (snapshot.exists()) {
          setEmployee(Employee.fromFirebase({ ...snapshot.val(), empId: snapshot.key }));
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
    return <div className={styles.error}>Error: {error} <button onClick={onClose} className={styles.closeButtonError}>Close</button></div>;
  }

  if (!employee) {
    return null;
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3>Employee Details</h3>
        <button onClick={onClose} className={styles.closeButton}>
          &times;
        </button>
        {employee.imageUrl && (
            <div className={styles.imageContainer}>
            <img
              src={employee.imageUrl}
              alt={`${employee.name}'s profile`}
              className={styles.largeProfileImage}
              onError={(e) => {
                e.target.src = '/no-image-png-2.webp';
              }}
            />
            <a
              href={employee.imageUrl}
              download={`profile_${employee.name ? employee.name.replace(/\s+/g, '_') : 'image'}.jpg`}
              className={styles.downloadButton}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download Profile
            </a>
          </div>
        )}
        <p><strong>Name:</strong> {employee.name}</p>
        <p><strong>Phone:</strong> {employee.phoneNo}</p>
        <p><strong>Aadhar:</strong> {employee.addharNo}</p>
        <p><strong>Address:</strong> {employee.address}</p>
        <p><strong>Reference Name:</strong> {employee.referenceName || '-'}</p>
        {employee.email && <p><strong>Email:</strong> {employee.email}</p>}
        {employee.designation && <p><strong>Designation:</strong> {employee.designation}</p>}
        {/* Aadhar Images Section */}
        {(employee.addharFrontImageUrl || employee.addharBackImageUrl) && (
          <div className={styles.aadharImagesSection}>
            <h4>Aadhar Card Images</h4>
            <div className={styles.aadharImageContainer}>
              {employee.addharFrontImageUrl && (
                <div className={styles.imageWrapper}>
                  <p><strong>Aadhar Front:</strong></p>
                  <img
                    src={employee.addharFrontImageUrl}
                    alt="Aadhar Card Front"
                    className={styles.aadharImage}
                    onError={(e) => {
                      e.target.src = '/no-image-png-2.webp';
                    }}
                  />
                  <a
                    href={employee.addharFrontImageUrl}
                    download={`aadhar_front_${employee.name ? employee.name.replace(/\s+/g, '_') : 'image'}.jpg`}
                    className={styles.downloadButton}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download Front
                  </a>
                </div>
              )}
              {employee.addharBackImageUrl && (
                <div className={styles.imageWrapper}>
                  <p><strong>Aadhar Back:</strong></p>
                  <img
                    src={employee.addharBackImageUrl}
                    alt="Aadhar Card Back"
                    className={styles.aadharImage}
                    onError={(e) => {
                      e.target.src = '/no-image-png-2.webp';
                    }}
                  />
                  <a
                    href={employee.addharBackImageUrl}
                    download={`aadhar_back_${employee.name ? employee.name.replace(/\s+/g, '_') : 'image'}.jpg`}
                    className={styles.downloadButton}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download Back
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add other employee details you want to display here */}
      </div>
    </div>
  );
};

export default EmployeeDetails;