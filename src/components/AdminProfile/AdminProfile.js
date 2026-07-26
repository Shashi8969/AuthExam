// src/components/AdminProfile.js
import React from 'react';
import './AdminProfile.css'; // Import CSS for this component
import { FaEnvelope, FaUser } from 'react-icons/fa';

const AdminProfile = ({ adminData }) => {
  const adminId = Object.keys(adminData)[0];
  const adminInfo = adminData[adminId];

  return (
    <div className="admin-profile-container">
      <div className="profile-header">
        <div className="avatar-container">
          <FaUser className="profile-avatar-icon" /> {/* Using an icon as a placeholder */}
        </div>
        <div className="profile-info">
          <h2 className="profile-name">{adminInfo["Basic Information"]?.name}</h2>
          <p className="profile-email">
            <FaEnvelope className="icon" /> {adminInfo.email}
          </p>
          <p className="profile-id">Admin ID: {adminInfo.adminId}</p>
        </div>
      </div>

      <div className="contact-info">
        <h3>Contact Information</h3>
        <ul>
          <li>
            <strong>Email:</strong> {adminInfo.email}
          </li>
          <li>
            <strong>Address:</strong> {adminInfo.Address}
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AdminProfile;