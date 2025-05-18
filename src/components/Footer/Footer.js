// src/components/Footer/Footer.js
import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';
import { FaFacebook, FaTwitter, FaLinkedin, FaInstagram, FaEnvelope, FaPhone } from 'react-icons/fa'; // More icons

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section company-info">
          <h3>AuthExam</h3>
          <p>Your trusted portal for secure exam authentication.</p>
          <p>We are committed to ensuring integrity and fairness in every assessment through advanced biometric technology.</p>
          <div className="social-links">
            <a href="www.facebook.com" aria-label="Facebook"><FaFacebook /></a>
            <a href="www.instagram.com" aria-label="Twitter"><FaTwitter /></a>
            <a href="#" aria-label="LinkedIn"><FaLinkedin /></a>
            <a href="#" aria-label="Instagram"><FaInstagram /></a>
          </div>
        </div>

        <div className="footer-section navigation">
          <h3>Navigation</h3>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/biometric-verification">Biometric Verification</Link></li> {/* More specific */}
            <li><Link to="/fraud-prevention">Fraud Prevention</Link></li> {/* More specific */}
            <li><Link to="/contact">Contact Us</Link></li>
          </ul>
        </div>

        <div className="footer-section contact-info">
          <h3>Contact Us</h3>
          <p><FaEnvelope className="contact-icon" /> Email: info@authexam.com</p>
          <p><FaPhone className="contact-icon" /> Phone: +91 9801902516</p>
          <p>Address: Kurhani, Muzaffarpur,Bihar, India</p>
        </div>

        <div className="footer-section legal">
          <h3>Legal</h3>
          <ul>
            <li><Link to="/privacy-policy">Privacy Policy</Link></li>
            <li><Link to="/terms-of-service">Terms of Service</Link></li>
            <li><Link to="/site-map">Site Map</Link></li>
          </ul>
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