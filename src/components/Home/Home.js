import React, { useState, useEffect, useCallback } from 'react';
import './Home.css';
import { Link } from 'react-router-dom';
import { ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from '../../config/firebase';
import {
  FaIdCard, FaMapMarkedAlt, FaShieldAlt, FaSync, FaCheckCircle,
  FaUsersCog, FaClipboardCheck, FaFileInvoiceDollar, FaBullhorn,
  FaBuilding, FaStore, FaIndustry, FaHandshake, FaWarehouse, FaUserPlus,
  FaEnvelope, FaPhone, FaMapMarkerAlt, FaArrowRight,
} from 'react-icons/fa';
import Footer from '../Footer/Footer';
import ContactForm from '../ContactForm/ContactForm';

// Use simple absolute paths for public folder assets
const images = ["/banner1.svg", "/banner2.svg", "/banner3.svg", "/banner4.svg"];

const galleryItems = [
  { src: '/gallery1.svg', caption: 'Field Operations', orient: 'landscape' },
  { src: '/gallery2.svg', caption: 'Verified Onboarding', orient: 'portrait' },
  { src: '/gallery3.svg', caption: 'Service Center Network', orient: 'landscape' },
  { src: '/gallery4.svg', caption: 'Reporting & Invoicing', orient: 'portrait' },
];
const galleryRow1 = [...galleryItems, ...galleryItems];
const galleryRow2 = [...galleryItems.slice().reverse(), ...galleryItems.slice().reverse()];

const services = [
  { icon: <FaUserPlus />, title: 'Operator Onboarding', desc: 'Add field operators with photo ID capture and cropping, plus phone and Aadhaar validation, in a guided form.' },
  { icon: <FaMapMarkedAlt />, title: 'Center Assignment', desc: 'Assign operators to service centers and save reusable assignment lists, exportable to Excel.' },
  { icon: <FaUsersCog />, title: 'Reference & Staff Records', desc: 'Maintain reusable reference names and centralized staff records from one dashboard.' },
  { icon: <FaClipboardCheck />, title: 'Approvals Workflow', desc: 'Supervisor-submitted changes route through admin approval before they take effect.' },
  { icon: <FaFileInvoiceDollar />, title: 'Invoicing', desc: 'Create, template, and track invoices tied to assignments, ready whenever you need them.' },
  { icon: <FaBullhorn />, title: 'Notices & Announcements', desc: 'Publish updates once and reach every operator through a single notice board.' },
];

const audiences = [
  { icon: <FaBuilding />, label: 'Facility Management Companies' },
  { icon: <FaStore />, label: 'Service Center Networks' },
  { icon: <FaIndustry />, label: 'Field Service Operations' },
  { icon: <FaHandshake />, label: 'Franchise Networks' },
  { icon: <FaWarehouse />, label: 'Logistics & Distribution' },
  { icon: <FaUsersCog />, label: 'Staffing & Workforce Agencies' },
];

const trustPoints = [
  'Role-based approvals for every change',
  'Centralized operator & center records',
  'Invoicing tied directly to assignments',
  'Built for Indian field operations',
];

const steps = [
  {
    title: 'Onboard operators',
    desc: 'Add field operators with verified contact and ID details in a guided form.',
  },
  {
    title: 'Assign to centers',
    desc: 'Match operators to service centers and track assignments in real time.',
  },
  {
    title: 'Approve & invoice',
    desc: 'Supervisors submit changes for admin approval, then generate invoices instantly.',
  },
];

const Home = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxImg, setLightboxImg] = useState(null);

  useEffect(() => {
    const lcpImg = new Image();
    lcpImg.src = '/banner1.svg';
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
            <a href="#services" className="cta-button secondary">Explore Services</a>
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
          <h2>Built for Field Operations, End to End</h2>
          <p>
            AuthExam is a workforce management platform built to help organizations onboard
            field operators, verify their identity documents, and assign them to service
            centers - all from one dashboard. Reusable reference names, role-based approvals,
            and invoicing tied directly to assignments mean your team always knows who is
            deployed, where, and for what.
          </p>
          <div className="about-pillars">
            <div className="pillar"><FaShieldAlt /><span>Security</span></div>
            <div className="pillar"><FaSync /><span>Reliability</span></div>
            <div className="pillar"><FaIdCard /><span>Transparency</span></div>
            <div className="pillar"><FaCheckCircle /><span>Accountability</span></div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="services-section">
        <div className="container">
          <span className="section-eyebrow">Our Services</span>
          <h2>Everything You Need to Manage Your Field Workforce</h2>
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

      {/* How it works */}
      <section id="how-it-works" className="works-section">
        <div className="container">
          <span className="section-eyebrow">Process</span>
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

      {/* Key Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <span className="section-eyebrow">Platform</span>
          <h2>Why Choose AuthExam?</h2>
          <div className="features-grid">
            <FeatureItem
              icon={<FaIdCard />}
              title="Verified Onboarding"
              desc="Photo ID capture and cropping with phone and Aadhaar validation built in."
            />
            <FeatureItem
              icon={<FaMapMarkedAlt />}
              title="Center Assignment"
              desc="Assign operators to service centers and reuse saved assignment lists."
            />
            <FeatureItem
              icon={<FaShieldAlt />}
              title="Role-Based Access"
              desc="Separate Admin, Supervisor, and member roles, enforced in the UI and Firebase rules."
            />
            <FeatureItem
              icon={<FaSync />}
              title="Real-Time Approvals"
              desc="Supervisor changes route to admins instantly, with a live status trail."
            />
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="gallery-section">
        <div className="container">
          <span className="section-eyebrow">Gallery</span>
          <h2>Inside AuthExam</h2>
        </div>
        <div className="gallery-marquee">
          <div className="gallery-track">
            {galleryRow1.map((item, i) => (
              <button
                type="button"
                className={`gallery-tile ${item.orient}`}
                key={`r1-${i}`}
                onClick={() => setLightboxImg(item)}
                aria-label={`View larger image: ${item.caption}`}
              >
                <img src={item.src} alt={item.caption} loading="lazy" />
                <span className="gallery-caption">{item.caption}</span>
              </button>
            ))}
          </div>
          <div className="gallery-track reverse">
            {galleryRow2.map((item, i) => (
              <button
                type="button"
                className={`gallery-tile ${item.orient}`}
                key={`r2-${i}`}
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
          <h2>Trusted Across Field Operations</h2>
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

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <div className="container contact-section-inner">
          <div className="contact-info-col">
            <span className="section-eyebrow light">Get In Touch</span>
            <h2>Let's Talk About Your Operations</h2>
            <p>Have a question about our platform or want a walkthrough? Send us a message and our team will get back to you.</p>
            <ul className="contact-details">
              <li><FaEnvelope /> info@authexam.com</li>
              <li><FaPhone /> +91 98019 02516</li>
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
