// src/components/AuthForm.js
import { useState } from 'react';
import { signUp, logIn } from '../config/firebase';
import { FaEnvelope, FaLock, FaArrowRight } from 'react-icons/fa';
import './AuthForm.css';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';

const AuthForm = ({ type }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (type === 'signup') {
        await signUp(email, password);
      } else {
        await logIn(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>{type === 'signup' ? 'Create Account' : 'Welcome Back'}</h2>
          <p>{type === 'signup' ? 'Sign up to get started' : 'Log in to your account'}</p>
        </div>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <FaEnvelope className="input-icon" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="input-group">
            <FaLock className="input-icon" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
            />
          </div>
          
          {type === 'signup' && (
            <div className="input-group">
              <FaLock className="input-icon" />
              <input
                type="password"
                placeholder="Confirm Password"
                required
                minLength="6"
              />
            </div>
          )}
          
          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? 'Processing...' : (
              <>
                {type === 'signup' ? 'Sign Up' : 'Login'}
                <FaArrowRight className="btn-icon" />
              </>
            )}
          </button>
        </form>
        
        <div className="auth-footer">
          {type === 'signup' ? (
            <p>Already have an account? <Link to="/login">Login</Link></p>
          ) : (
            <p>Don't have an account? <Link to="/signup">Sign up</Link></p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthForm;