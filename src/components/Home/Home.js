import React, { useState, useEffect, useCallback } from 'react';
import './Home.css';
import { Link } from 'react-router-dom';
import { FaUserPlus, FaMapMarkedAlt, FaFileInvoiceDollar, FaBullhorn } from 'react-icons/fa';
import Footer from '../Footer/Footer';

// Use simple absolute paths for public folder assets
const images = ["/banner1.webp", "/banner2.webp", "/banner3.webp", "/banner4.webp"];

const Home = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // LCP FIX: Preload banner1 immediately (before React renders)
  useEffect(() => {
    const lcpImg = new Image();
    lcpImg.src = '/banner1.webp';
    lcpImg.fetchpriority = 'high';
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, []);

  useEffect(() => {
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [nextSlide]);

  const steps = [
    {
      title: "Onboard operators",
      desc: "Add field operators with verified contact and ID details in a guided form.",
    },
    {
      title: "Assign to centers",
      desc: "Match operators to service centers and track assignments in real time.",
    },
    {
      title: "Approve & invoice",
      desc: "Supervisors submit changes for admin approval, then generate invoices instantly.",
    },
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
              aria-label={`Field operator ${index + 1}`}
              fetchpriority={index === 0 ? "high" : "auto"}
              loading={index === 0 ? "eager" : "lazy"}
            />
          ))}
        </div>
        <div className="hero-overlay"></div>
        <div className="hero-content container">
          <h1>Run Your Field Workforce With Confidence</h1>
          <p className="subtitle">
            Onboard operators, assign service centers, and manage invoices &mdash;
            all backed by role-based approvals.
          </p>
          <div className="cta-group">
            <Link to="/signup" className="cta-button primary">Get Started</Link>
            <Link to="/notices" className="cta-button secondary">View Notices</Link>
          </div>
        </div>
        <button className="hero-slider-control prev" onClick={prevSlide} aria-label="Previous Slide">&#10094;</button>
        <button className="hero-slider-control next" onClick={nextSlide} aria-label="Next Slide">&#10095;</button>
      </section>

      {/* Key Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <h2>What You Can Do</h2>
          <div className="features-grid">
            <FeatureItem
              icon={<FaUserPlus />}
              title="Operator Onboarding"
              desc="Add and manage field operators with photo ID capture and reference tracking."
            />
            <FeatureItem
              icon={<FaMapMarkedAlt />}
              title="Center Assignment"
              desc="Assign operators to service centers and save reusable assignment lists."
            />
            <FeatureItem
              icon={<FaFileInvoiceDollar />}
              title="Invoicing"
              desc="Generate and track invoices tied to completed assignments."
            />
            <FeatureItem
              icon={<FaBullhorn />}
              title="Notices & Approvals"
              desc="Publish notices and route supervisor changes through admin approval."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="works-section">
        <div className="container">
          <h2>How It Works</h2>
          <div className="works-grid">
            {steps.map((step, i) => (
              <div className="work-item" key={step.title}>
                <h3>{`${i + 1}. ${step.title}`}</h3>
                <p>{step.desc}</p>
              </div>
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
