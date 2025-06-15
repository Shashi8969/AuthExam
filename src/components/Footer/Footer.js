// src/components/Footer/Footer.js
import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';
import { FaFacebook, FaTwitter, FaLinkedin, FaInstagram, FaEnvelope, FaPhone } from 'react-icons/fa'; // More icons

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Section 1: Brand Info & Social Links */}
        <div className="footer-section brand-info">
          {/* Replace with your logo if available */}
          {/* <img src="/path/to/your/logo.png" alt="AuthExam Logo" className="footer-logo"/> */}
          <h3>AuthExam</h3> {/* Or use logo */}
          <p className="brand-description">Your trusted partner in securing exam integrity through advanced biometric authentication.</p>
          <div className="social-links">
            {/* Replace '#' with actual URLs */}
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
            <li>Home</li>
            <li>About Us</li>
            {/* Consider adding links to key features or services */}
            <li>Features</li>
            <li><Link to="/">How it Works</Link></li>
            <li><Link to="/">Contact Us</Link></li>
          </ul>
        </div>

        {/* Section 3: Resources & Legal */}
        <div className="footer-section resources">
          <h3>Resources</h3>
          <ul>
            <li><Link to="/">Privacy Policy</Link></li>
            <li><Link to="/">Terms of Service</Link></li>
            <li><Link to="/">FAQ</Link></li> {/* Added common FAQ link */}
            {/* <li><Link to="/site-map">Site Map</Link></li> Consider if needed */}
          </ul>
        </div>

        {/* Section 4: Contact Info */}
        <div className="footer-section contact-info">
          <h3>Contact Us</h3>
          <p><FaEnvelope className="contact-icon" /> Email: info@authexam.com</p>
          <p><FaPhone className="contact-icon" /> Phone: +91 9801902516</p>
          <p>Address: Kurhani, Muzaffarpur,Bihar, India</p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} AuthExam. All rights reserved.</p>
        <p>Designed & Developed by AuthExam.Pvt.Ltd</p>
      </div>
    </footer>
  );
};

export default Footer;