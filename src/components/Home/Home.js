import React, { useState, useEffect, useCallback } from 'react';
import './Home.css';
import { Link } from 'react-router-dom';
import { ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from '../../config/firebase';
import {
  FaFingerprint, FaRobot, FaShieldAlt, FaSync, FaCheckCircle,
  FaUsersCog, FaClipboardCheck, FaFileInvoiceDollar, FaBullhorn,
  FaUniversity, FaGraduationCap, FaLandmark, FaBriefcase, FaChalkboardTeacher, FaBuilding,
  FaEnvelope, FaPhone, FaMapMarkerAlt, FaArrowRight,
} from 'react-icons/fa';
import Footer from '../Footer/Footer';
import ContactForm from '../ContactForm/ContactForm';
import useDocumentMeta from '../../hooks/useDocumentMeta';

// Use simple absolute paths for public folder assets
const images = ["/banner1.webp", "/banner2.webp", "/banner3.webp", "/banner4.webp"];

const galleryItems = [
  { src: '/banner1.webp', caption: 'Biometric Access Verification' },
  { src: '/banner2.webp', caption: 'Secure Authentication Network' },
  { src: '/banner3.webp', caption: 'Encrypted Data Infrastructure' },
  { src: '/banner4.webp', caption: 'Real-Time Security Monitoring' },
];

const services = [
  { icon: <FaFingerprint />, title: 'Biometric Identity Verification', desc: 'Fingerprint-based candidate verification that stops impersonation before it reaches the exam hall.' },
  { icon: <FaRobot />, title: 'AI-Assisted Proctoring', desc: 'Intelligent monitoring tools that flag irregularities during remote and center-based exams.' },
  { icon: <FaUsersCog />, title: 'Exam Center & Staff Management', desc: 'Centralized control over operators, centers, and reference records from one dashboard.' },
  { icon: <FaClipboardCheck />, title: 'Real-Time Approvals Workflow', desc: 'Admins review and approve pending requests instantly, with a live status trail.' },
  { icon: <FaFileInvoiceDollar />, title: 'Invoicing & Reporting', desc: 'Generate and track invoices tied to exam operations, exportable whenever you need them.' },
  { icon: <FaBullhorn />, title: 'Notices & Announcements Hub', desc: 'Publish updates once and reach every operator and candidate through a single feed.' },
];

const audiences = [
  { icon: <FaUniversity />, label: 'Examination Boards' },
  { icon: <FaGraduationCap />, label: 'Universities & Colleges' },
  { icon: <FaChalkboardTeacher />, label: 'Training Institutes' },
  { icon: <FaLandmark />, label: 'Government Exam Authorities' },
  { icon: <FaBriefcase />, label: 'Recruitment Agencies' },
  { icon: <FaBuilding />, label: 'Certification Bodies' },
];

const trustPoints = [
  'Fingerprint-based candidate verification',
  'Encrypted data at every step',
  'Built for Indian examination workflows',
  'Live admin oversight & approvals',
];

const Home = () => {
  useDocumentMeta(
    'Secure Online Exam Authentication Platform',
    'AuthExam provides biometric candidate verification, AI-assisted proctoring, and exam center management for boards, universities, and training institutes.'
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxImg, setLightboxImg] = useState(null);

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

  const downloadableItems = [
    { id: 1, title: "Mock Report", description: "Biometric Mock Report.", fileName: "https://drive.google.com/...", icon: "📄" },
    { id: 2, title: "CSR Report", description: "Biometric Work Standards.", fileName: "Security_Whitepaper.pdf", icon: "🛡️" },
    { id: 3, title: "User Guide", description: "Admin instructions.", fileName: "User_Guide.pdf", icon: "📖" },
  ];

  return (
    <div className="home-container">
      {/* LCP-OPTIMIZED Hero Section */}
      <section className="hero-section">
        <div className="hero-slider">
          {images.map((src, index) => (
            <div
              className={`hero-slide ${index === currentIndex ? 'active' : ''}`}
              key={src}
              style={{ backgroundImage: `url(${src})` }}
              role="img"
              aria-label={`Exam Security Slide ${index + 1}`}
              fetchpriority={index === 0 ? "high" : "auto"}
              loading={index === 0 ? "eager" : "lazy"}
            />
          ))}
        </div>
        <div className="hero-overlay"></div>
        <div className="hero-content container">
          <h1>Secure Your Exams. Ensure Integrity.</h1>
          <p className="subtitle">Advanced Biometric Authentication for a Fairer Future in Testing.</p>
          <div className="cta-group">
            <a href="#services" className="cta-button primary">Explore Services</a>
            <a href="#contact" className="cta-button secondary">Get in Touch</a>
          </div>
        </div>
        <button className="hero-slider-control prev" onClick={prevSlide} aria-label="Previous Slide">&#10094;</button>
        <button className="hero-slider-control next" onClick={nextSlide} aria-label="Next Slide">&#10095;</button>
      </section>

      {/* Trust strip */}
      <section className="trust-strip">
        <div className="container trust-strip-inner">
          {trustPoints.map((point) => (
            <span className="trust-point" key={point}>
              <FaCheckCircle /> {point}
            </span>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="container about-content">
          <span className="section-eyebrow">About Us</span>
          <h2>Built for Exam Integrity, End to End</h2>
          <p>
            AuthExam is a biometric exam-authentication platform built to help examination boards,
            training institutes, and certification bodies verify candidate identity and prevent
            impersonation - from registration through to the exam hall. Our platform brings
            fingerprint verification, centralized center &amp; staff management, and real-time
            approval workflows together in one dashboard, so your team always knows who is
            testing, where, and when.
          </p>
          <div className="about-pillars">
            <div className="pillar"><FaShieldAlt /><span>Integrity</span></div>
            <div className="pillar"><FaSync /><span>Reliability</span></div>
            <div className="pillar"><FaFingerprint /><span>Transparency</span></div>
            <div className="pillar"><FaCheckCircle /><span>Accountability</span></div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="services-section">
        <div className="container">
          <span className="section-eyebrow">Our Services</span>
          <h2>Everything You Need to Run Secure Exams</h2>
          <div className="services-grid">
            {services.map((s) => (
              <div className="service-card" key={s.title}>
                <div className="service-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <span className="section-eyebrow">Platform</span>
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

      {/* Gallery Section */}
      <section id="gallery" className="gallery-section">
        <div className="container">
          <span className="section-eyebrow">Gallery</span>
          <h2>Inside AuthExam</h2>
          <div className="gallery-grid">
            {galleryItems.map((item) => (
              <button
                type="button"
                className="gallery-item"
                key={item.src}
                onClick={() => setLightboxImg(item)}
                aria-label={`View larger image: ${item.caption}`}
              >
                <img src={item.src} alt={item.caption} loading="lazy" />
                <span className="gallery-caption">{item.caption}</span>
              </button>
            ))}
          </div>
        </div>
        {lightboxImg && (
          <div className="lightbox-overlay" onClick={() => setLightboxImg(null)}>
            <img src={lightboxImg.src} alt={lightboxImg.caption} />
            <button className="lightbox-close" onClick={() => setLightboxImg(null)} aria-label="Close">&times;</button>
          </div>
        )}
      </section>

      {/* Who We Serve Section */}
      <section id="clients" className="audience-section">
        <div className="container">
          <span className="section-eyebrow">Who We Serve</span>
          <h2>Trusted Across the Exam Ecosystem</h2>
          <div className="audience-grid">
            {audiences.map((a) => (
              <div className="audience-chip" key={a.label}>
                <span className="audience-icon">{a.icon}</span>
                <span>{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog / Notices Preview */}
      <BlogPreview />

      {/* Downloadables */}
      <section id="downloads" className="downloadables-section">
        <div className="container">
          <span className="section-eyebrow">Resources</span>
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

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <div className="container contact-section-inner">
          <div className="contact-info-col">
            <span className="section-eyebrow light">Get In Touch</span>
            <h2>Let's Talk About Your Exams</h2>
            <p>Have a question about our platform or want a walkthrough? Send us a message and our team will get back to you.</p>
            <ul className="contact-details">
              <li><FaEnvelope /> info@authexam.com</li>
              <li><FaPhone /> +91 9801902516</li>
              <li><FaMapMarkerAlt /> Kurhani, Muzaffarpur, Bihar, India</li>
            </ul>
            <Link to="/signup" className="cta-button secondary light-outline">
              Create an Account <FaArrowRight className="btn-icon" />
            </Link>
          </div>
          <div className="contact-form-col">
            <ContactForm />
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

// Live preview of latest published notices/blog posts
const BlogPreview = () => {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const postsRef = query(ref(db, 'BlogPosts'), orderByChild('createdAt'), limitToLast(3));
    const unsubscribe = onValue(postsRef, (snapshot) => {
      const data = snapshot.val();
      const loaded = [];
      if (data) {
        Object.keys(data).forEach((key) => {
          const post = data[key];
          if (post.isPublished !== false) loaded.push({ id: key, ...post });
        });
        loaded.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      }
      setPosts(loaded);
    });
    return () => unsubscribe();
  }, []);

  if (posts.length === 0) return null;

  return (
    <section id="blog" className="blog-preview-section">
      <div className="container">
        <span className="section-eyebrow">Latest Updates</span>
        <h2>From Our Notice Board</h2>
        <div className="blog-preview-grid">
          {posts.map((post) => (
            <div className="blog-preview-card" key={post.id}>
              <span className={`pub-cat-tag cat-${(post.category || 'general').toLowerCase()}`}>
                {post.category || 'General'}
              </span>
              <h3>{post.title}</h3>
              <p>{post.content?.length > 120 ? post.content.substring(0, 120) + '...' : post.content}</p>
            </div>
          ))}
        </div>
        <Link to="/notices" className="cta-button primary blog-preview-cta">View All Notices</Link>
      </div>
    </section>
  );
};

export default Home;
