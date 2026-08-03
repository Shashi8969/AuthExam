// src/components/ProtectedRoute/ProtectedRoute.js
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '1.2em' }}>Loading authentication status...</div>;
  }

  if (!user) {
    // User is not authenticated, redirect to the /please-login page
    // Pass the current location in state so we can redirect back after login
    return <Navigate to="/please-login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    // Authenticated but lacks admin privileges for this route
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
