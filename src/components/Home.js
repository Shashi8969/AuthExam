import React, { useState, useEffect } from 'react';
import './Home.css';

const images = [
  "./banner1.jpg",
  "./banner2.jpg",
  "./banner3.jpg",
];

const Home = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000); // Auto-switch slides every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="home-container">
      {/* Top Slider Section */}
      <section className="slider-section">
        <div className="slider" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
          {images.map((src, index) => (
            <div className="slide" key={index}>
              <img src={src} alt={`Slide ${index + 1}`} />
            </div>
          ))}
        </div>
      </section>

      {/* ✅ About Section */}
      <section id="about" className="about-section">
        <div className="container">
          <h2>About Us</h2>
          <p>Welcome to AuthExam, your trusted portal for exam authentication. We ensure secure biometric verification for exam candidates.</p>
        </div>
      </section>

      {/* ✅ Works Section */}
      <section id="works" className="works-section">
        <div className="container">
          <h2>Our Works</h2>
          <div className="works-grid">
            <div className="work-item">
              <img src="https://via.placeholder.com/300x200/AAAAAA/FFFFFF?Text=Work%201" alt="Work 1" />
              <h3>Project Title 1</h3>
              <p>Biometric exam authentication system.</p>
            </div>
            <div className="work-item">
              <img src="https://via.placeholder.com/300x200/BBBBBB/FFFFFF?Text=Work%202" alt="Work 2" />
              <h3>Project Title 2</h3>
              <p>Fraud prevention solutions for testing centers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ Footer Section */}
      <footer className="footer">
        <div className="container">
          <p>&copy; 2025 AuthExam. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
