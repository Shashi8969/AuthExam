// src/components/Home.js
import React from 'react';
import './Home.css'; // You'll need to create this CSS file

const Home = () => {
  return (
    <div className="home-container">
      {/* Top Slider Section */}
      <section className="slider-section">
        <div className="slider">
          {/* Add your slider images or components here */}
          <div className="slide active">
            <img src="https://via.placeholder.com/1200x400/FF0000/FFFFFF?Text=Slide%201" alt="Slide 1" />
          </div>
          <div className="slide">
            <img src="https://via.placeholder.com/1200x400/00FF00/FFFFFF?Text=Slide%202" alt="Slide 2" />
          </div>
          <div className="slide">
            <img src="https://via.placeholder.com/1200x400/0000FF/FFFFFF?Text=Slide%203" alt="Slide 3" />
          </div>
          {/* Add navigation buttons or dots for the slider */}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="container">
          <h2>About Us</h2>
          <p>
            This is a brief introduction about your website or company. You can talk about your mission,
            values, and what makes you unique. Feel free to add more details here.
          </p>
          <p>
            Highlight your key achievements or the core purpose of your employee portal.
          </p>
        </div>
      </section>

      {/* Works Section */}
      <section id="works" className="works-section">
        <div className="container">
          <h2>Our Works</h2>
          <div className="works-grid">
            {/* Example work items - replace with your actual work/projects */}
            <div className="work-item">
              <img src="https://via.placeholder.com/300x200/AAAAAA/FFFFFF?Text=Work%201" alt="Work 1" />
              <h3>Project Title 1</h3>
              <p>Brief description of the project.</p>
            </div>
            <div className="work-item">
              <img src="https://via.placeholder.com/300x200/BBBBBB/FFFFFF?Text=Work%202" alt="Work 2" />
              <h3>Project Title 2</h3>
              <p>Brief description of the project.</p>
            </div>
            <div className="work-item">
              <img src="https://via.placeholder.com/300x200/CCCCCC/FFFFFF?Text=Work%203" alt="Work 3" />
              <h3>Project Title 3</h3>
              <p>Brief description of the project.</p>
            </div>
            {/* Add more work items as needed */}
          </div>
        </div>
      </section>

      {/* You can add more sections here like Contact, Services, etc. */}

    </div>
  );
};

export default Home;