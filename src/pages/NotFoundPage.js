// src/pages/NotFoundPage.js
import React from 'react';
import { Link } from 'react-router-dom';
import { FaQuestionCircle } from 'react-icons/fa'; // Example icon
import './NotFoundPage.css'; // Import the CSS

const NotFoundPage = () => {
  return (
    <div className="not-found-container">
      <FaQuestionCircle className="not-found-icon" />
      <h1 className="not-found-title">404 - Page Not Found</h1>
      <p className="not-found-message">
        Oops! It seems like you've stumbled upon a page that doesn't exist or has been moved.
      </p>
      <Link to="/" className="not-found-link">
        Go to Homepage
      </Link>
    </div>
  );
};

export default NotFoundPage;