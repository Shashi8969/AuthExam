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
          <div className="footer-logo-row">
            <img src="/logo.webp" alt="AuthExam Logo" className="footer-logo" />
            <h3>AuthExam</h3>
          </div>
          <p className="brand-description">
            Workforce management for field operators &mdash; onboarding, center
            assignments, invoicing, and approvals in one place.
          </p>
        </div>

        <div className="footer-section navigation">
          <h3>Navigation</h3>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><a href="/#about">About Us</a></li>
            <li><a href="/#services">Services</a></li>
            <li><a href="/#gallery">Gallery</a></li>
            <li><Link to="/notices">Notices & Blog</Link></li>
            <li><a href="/#contact">Contact Us</a></li>
          </ul>
        </div>

        <div className="footer-section resources">
          <h3>Administration</h3>
          <ul>
            <li><Link to="/login">Member Login</Link></li>
            <li><Link to="/signup">Sign Up</Link></li>
            <li><a href="/#downloads">Downloads</a></li>
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
