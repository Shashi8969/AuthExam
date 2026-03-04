import React, { useState, useEffect, useCallback } from 'react';
import './Home.css';
import { Link } from 'react-router-dom';
import { FaFingerprint, FaRobot, FaShieldAlt, FaSync } from 'react-icons/fa'; // Professional Icons
import Footer from '../Footer/Footer';

// Use simple absolute paths for public folder assets
const images = ["/banner1.jpg", "/banner2.jpg", "/banner3.jpg"];

const Home = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // UseCallback prevents unnecessary re-renders of the interval
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, []);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  useEffect(() => {
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [nextSlide]);

  const downloadableItems = [
    { id: 1, title: "Mock Report", description: "Biometric Mock Report.", fileName: "https://drive.google.com/...", icon: "📄" },
    { id: 2, title: "CSR Report", description: "Biometric Work Standards.", fileName: "Security_Whitepaper.pdf", icon: "🛡️" },
    { id: 3, title: "User Guide", description: "Admin instructions.", fileName: "User_Guide.pdf", icon: "📖" },
  ];

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-slider">    
          {images.map((src, index) => (
            <div
              className={`hero-slide ${index === currentIndex ? 'active' : ''}`}
              key={src}
              style={{ backgroundImage: `url(${src})` }}
              role="img"
              aria-label={`Exam Security Slide ${index + 1}`}
            />
          ))}
        </div>
        <div className="hero-overlay"></div>
        <div className="hero-content container">
          <h1>Secure Your Exams. Ensure Integrity.</h1>
          <p className="subtitle">Advanced Biometric Authentication for a Fairer Future in Testing.</p>
          <div className="cta-group">
            <Link to="/features" className="cta-button primary">Learn More</Link>
            <Link to="/contact" className="cta-button secondary">Get a Demo</Link>
          </div>
        </div>
        <button className="hero-slider-control prev" onClick={prevSlide} aria-label="Previous Slide">&#10094;</button>
        <button className="hero-slider-control next" onClick={nextSlide} aria-label="Next Slide">&#10095;</button>
      </section>

      {/* Key Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <h2>Why Choose AuthExam?</h2>
          <div className="features-grid">
            <FeatureItem 
              icon={<FaFingerprint />} 
              title="Robust Biometrics" 
              desc="Multi-factor authentication including fingerprint and facial recognition." 
            />
            <FeatureItem 
              icon={<FaRobot />} 
              title="AI Proctoring" 
              desc="Intelligent monitoring for remote exams to detect malpractice." 
            />
            <FeatureItem 
              icon={<FaShieldAlt />} 
              title="Unmatched Security" 
              desc="End-to-end encryption compliant with global standards." 
            />
            <FeatureItem 
              icon={<FaSync />} 
              title="LMS Integration" 
              desc="Seamlessly connect with Moodle, Canvas, and more." 
            />
          </div>
        </div>
      </section>

      {/* ... About and Works Sections ... */}

      {/* Downloadables */}
      <section id="downloads" className="downloadables-section">
        <div className="container">
          <h2>Important Resources</h2>
          <div className="downloadables-grid">
            {downloadableItems.map(item => (
              <a 
                href={item.fileName.startsWith('http') ? item.fileName : `/downloads/${item.fileName}`} 
                download 
                key={item.id} 
                className="download-item"
              >
                <div className="download-icon">{item.icon}</div>
                <div className="download-info">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <div className="download-arrow">↓</div>
              </a>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

// Sub-component for cleaner code
const FeatureItem = ({ icon, title, desc }) => (
  <div className="feature-item">
    <div className="feature-icon">{icon}</div>
    <h3>{title}</h3>
    <p>{desc}</p>
  </div>
);

export default Home;