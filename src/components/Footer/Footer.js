// src/components/Footer/Footer.js
import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';
import { FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section brand-info">
          <h3>AuthExam</h3>
          <p className="brand-description">
            Workforce management for field operators &mdash; onboarding, center
            assignments, invoicing, and approvals in one place.
          </p>
        </div>

        <div className="footer-section navigation">
          <h3>Navigation</h3>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/notices">Notices</Link></li>
            <li><Link to="/login">Member Login</Link></li>
            <li><Link to="/signup">Sign Up</Link></li>
          </ul>
        </div>

        <div className="footer-section resources">
          <h3>Administration</h3>
          <ul>
            <li><Link to="/admin/login">Admin Sign In</Link></li>
          </ul>
        </div>

        <div className="footer-section contact-info">
          <h3>Contact Us</h3>
          <p><FaEnvelope className="contact-icon" /> info@authexam.com</p>
          <p><FaPhone className="contact-icon" /> +91 98019 02516</p>
          <p><FaMapMarkerAlt className="contact-icon" /> Kurhani, Muzaffarpur, Bihar, India</p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} AuthExam. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
