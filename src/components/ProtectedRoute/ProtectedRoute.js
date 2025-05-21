// src/components/ProtectedRoute/ProtectedRoute.js
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // Adjust path if your AuthContext is elsewhere

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth(); // Assuming your AuthContext provides 'user' and 'loading'
  const location = useLocation();

  if (loading) {
    // Show a loading indicator while authentication status is being determined
    // You can replace this with a more sophisticated spinner component
    return <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '1.2em' }}>Loading authentication status...</div>;
  }

  if (!user) {
    // User is not authenticated, redirect to the /please-login page
    // Pass the current location in state so we can redirect back after login
    return <Navigate to="/please-login" state={{ from: location }} replace />;
  }

  // User is authenticated, render the child components
  return children;
};

export default ProtectedRoute;