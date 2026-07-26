// src/pages/PleaseLoginPage.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaSignInAlt } from 'react-icons/fa';
import useDocumentMeta from '../hooks/useDocumentMeta';
import './PleaseLoginPage.css';

const PleaseLoginPage = () => {
  const location = useLocation();
  // The 'from' state is passed by ProtectedRoute if user was redirected
  const fromPath = location.state?.from?.pathname || '/';

  useDocumentMeta({ title: 'Login Required', noindex: true });

  return (
    <div className="please-login-container">
      <FaSignInAlt className="please-login-icon" />
      <h1 className="please-login-title">Authentication Required</h1>
      <p className="please-login-message">
        You need to be logged in to access this page. Please log in to continue.
      </p>
      <Link to="/login" state={{ from: { pathname: fromPath } }} className="please-login-button">
        Go to Login Page
      </Link>
    </div>
  );
};

export default PleaseLoginPage;