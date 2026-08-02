// src/components/Footer/Footer.js
import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';
import { FaFacebook, FaTwitter, FaLinkedin, FaInstagram, FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Section 1: Brand Info & Social Links */}
        <div className="footer-section brand-info">
          <div className="footer-logo-row">
            <img src="/logo.webp" alt="AuthExam Logo" className="footer-logo" />
            <h3>AuthExam</h3>
          </div>
          <p className="brand-description">Your trusted partner in securing exam integrity through advanced biometric authentication.</p>
          <div className="social-links">
            <a href="#" aria-label="Facebook"><FaFacebook /></a>
            <a href="#" aria-label="Twitter"><FaTwitter /></a>
            <a href="#" aria-label="LinkedIn"><FaLinkedin /></a>
            <a href="#" aria-label="Instagram"><FaInstagram /></a>
          </div>
        </div>

        {/* Section 2: Navigation */}
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

        {/* Section 3: Resources & Legal */}
        <div className="footer-section resources">
          <h3>Resources</h3>
          <ul>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/signup">Sign Up</Link></li>
            <li><a href="/#downloads">Downloads</a></li>
            <li><Link to="/admin/login">Admin Portal</Link></li>
          </ul>
        </div>

        {/* Section 4: Contact Info */}
        <div className="footer-section contact-info">
          <h3>Contact Us</h3>
          <p><FaEnvelope className="contact-icon" /> info@authexam.com</p>
          <p><FaPhone className="contact-icon" /> +91 9801902516</p>
          <p><FaMapMarkerAlt className="contact-icon" /> Kurhani, Muzaffarpur, Bihar, India</p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} AuthExam. All rights reserved.</p>
        <p>Designed &amp; Developed by AuthExam Pvt. Ltd.</p>
      </div>
    </footer>
  );
};

export default Footer;