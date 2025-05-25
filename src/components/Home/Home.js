import React, { useState, useEffect } from 'react';
import './Home.css';
import { Link } from 'react-router-dom'; // For CTA buttons
import Footer from '../Footer/Footer';

// Assuming images are in the public folder
const images = [
  process.env.PUBLIC_URL + "/banner1.jpg",
  process.env.PUBLIC_URL + "/banner2.jpg",
  process.env.PUBLIC_URL + "/banner3.jpg",
];

const Home = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  // const [isSliderHovered, setIsSliderHovered] = useState(false);

  useEffect(() => {
    const interval = setInterval(nextSlide, 5000); // Auto-switch slides every 5 seconds

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Re-create interval if currentIndex changes externally, though nextSlide handles it

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  // const goToSlide = (index) => {
  //   setCurrentIndex(index);
  // };

  const downloadableItems = [
    { id: 1, title: "Mock Report", description: "Download Biomatric Mock Report Here.", fileName: "https://drive.google.com/uc?export=download&id=1BCFDElm3YLiKLXVXZpG8C0m2FMhHt5Uv", icon: "📄" },
    { id: 2, title: "CSR Report", description: "Download CSR Report For Biomatric Work.", fileName: "Security_Whitepaper.pdf", icon: "🛡️" },
    { id: 3, title: "User Guide", description: "Step-by-step instructions for administrators.", fileName: "User_Guide.pdf", icon: "📖" },
  ];

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-slider">    
              {images.map((src, index) => (
            <div
              className={`hero-slide ${index === currentIndex ? 'active' : ''}`}
              key={index}
              style={{ backgroundImage: `url(${src})` }}
            >
              {/* <img src={src} alt={`Slide ${index + 1}`} /> */}
            </div>
          ))}
        </div>
        <div className="hero-overlay"></div>
        <div className="hero-content container">
          <h1>Secure Your Exams. Ensure Integrity.</h1>
          <p className="subtitle">Advanced Biometric Authentication for a Fairer Future in Testing.</p>
          <Link to="/features" className="cta-button primary">Learn More</Link>
          <Link to="/contact" className="cta-button secondary">Get a Demo</Link>
        </div>
        <button className="hero-slider-control prev" onClick={prevSlide}>&#10094;</button>
        <button className="hero-slider-control next" onClick={nextSlide}>&#10095;</button>
        {/* Dots can be added back if desired */}
        {/* <div className="hero-slider-dots">
          {images.map((_, index) => (
            <span
              key={index}
              className={`dot ${currentIndex === index ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
            ></span>
          ))}
            </div>
        </div> */}
      </section>

{/* Key Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <h2>Why Choose AuthExam?</h2>
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon"> biometric_icon </div> {/* Replace with actual icon/SVG */}
              <h3>Robust Biometrics</h3>
              <p>Multi-factor authentication including fingerprint and facial recognition.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon"> ai_icon </div> {/* Replace with actual icon/SVG */}
              <h3>AI-Powered Proctoring</h3>
              <p>Intelligent monitoring for remote exams to detect and deter malpractice.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon"> secure_icon </div> {/* Replace with actual icon/SVG */}
              <h3>Unmatched Security</h3>
              <p>End-to-end encryption and secure data handling compliant with global standards.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon"> integration_icon </div> {/* Replace with actual icon/SVG */}
              <h3>Seamless Integration</h3>
              <p>Easy to integrate with existing Learning Management Systems (LMS).</p>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ About Section */}
      <section id="about" className="about-section">
        <div className="container">
          <h2>About Us</h2>
          <div className="about-content">
            <img src={process.env.PUBLIC_URL + "/about-us-image.jpg"} alt="About AuthExam" className="about-image" /> {/* Add an image */}
            <p>Welcome to <strong>AuthExam</strong>, your trusted partner in ensuring the integrity of examination processes. We specialize in providing state-of-the-art biometric authentication solutions designed to create a secure and fair testing environment for educational institutions and professional certification bodies. Our mission is to leverage technology to eliminate impersonation and uphold the credibility of assessments worldwide.</p>
          </div>
        </div>
      </section>

      {/* ✅ Works Section */}
      <section id="works" className="works-section">
        <div className="container">
          <h2>Our Works</h2>
          <div className="works-grid">
            {/* Replace placeholders with more descriptive content or actual project images */}
            <div className="work-item">
              <img src={process.env.PUBLIC_URL + "/work-biometric-system.jpg"} alt="Biometric System" />
              <div className="work-item-content">
                <h3>Secure Exam Platform</h3>
                <p>A comprehensive platform integrating multi-factor biometric authentication for high-stakes exams.</p>
              </div>
            </div>
            <div className="work-item">
              <img src={process.env.PUBLIC_URL + "/work-remote-proctoring.jpg"} alt="Remote Proctoring" />
              <h3>AI-Powered Remote Proctoring</h3>
              <p>Advanced remote proctoring solutions using AI to monitor candidates, detect suspicious activities, and maintain exam integrity for online assessments.</p>
            </div>
            <div className="work-item">
              <img src={process.env.PUBLIC_URL + "/work-data-analytics.jpg"} alt="Data Analytics" />
              <div className="work-item-content">
                <h3>Authentication Analytics</h3>
                <p>Detailed analytics and reporting on authentication attempts and security flags.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Downloadables Section */}
      <section id="downloads" className="downloadables-section">
        <div className="container">
          <h2>Important Resources</h2>
          <div className="downloadables-grid">
            {downloadableItems.map(item => (
              <a 
                href={item.fileName.startsWith('http') ? item.fileName : `${process.env.PUBLIC_URL}/downloads/${item.fileName}`} 
                download 
                key={item.id} 
                className="download-item">
                <div className="download-icon">{item.icon}</div>
                <div className="download-info">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <div className="download-arrow">&#x21E9;</div> {/* Downwards arrow */}
              </a>
            ))}
          </div>
        </div>
      </section>
<Footer></Footer>          
      
    </div>
  );
};

export default Home;
