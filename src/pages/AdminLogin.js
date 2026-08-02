// src/pages/AdminLogin.js
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FaLock, FaEnvelope, FaShieldAlt, FaArrowRight } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import useDocumentMeta from '../hooks/useDocumentMeta';
import './AdminLogin.css';

const AdminLogin = () => {
  useDocumentMeta('Admin Portal', 'Restricted admin sign-in for AuthExam administrators.');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, loading: authLoading } = useAuth();

  const from = location.state?.from?.pathname || '/admin/approvals';

  // Already-authenticated admins skip straight through; logged-in non-admins are told plainly.
  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      navigate(from, { replace: true });
    }
  }, [authLoading, user, isAdmin, from, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { getAuth, signInWithEmailAndPassword, signOut } = await import('firebase/auth');
      const { getDatabase, ref, get } = await import('firebase/database');
      const { app } = await import('../config/firebase');

      const auth = getAuth(app);
      const db = getDatabase(app);

      const cred = await signInWithEmailAndPassword(auth, email, password);
      const adminSnap = await get(ref(db, `Admin/${cred.user.uid}`));

      if (!adminSnap.exists()) {
        await signOut(auth);
        setError('This account does not have admin access.');
        setLoading(false);
        return;
      }

      navigate(from, { replace: true });
    } catch (authError) {
      console.error('Admin login error:', authError);
      setError('Invalid admin email or password.');
      setLoading(false);
    }
  };

  if (authLoading || (user && isAdmin)) {
    return <div className="admin-login-container"><p className="admin-login-loading">Loading...</p></div>;
  }

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-badge">
          <FaShieldAlt />
        </div>
        <div className="admin-login-header">
          <h1>Admin Portal</h1>
          <p>Restricted access &mdash; AuthExam administrators only</p>
        </div>

        {error && <div className="admin-login-error">{error}</div>}
        {user && !isAdmin && !error && (
          <div className="admin-login-error">
            You're signed in, but this account isn't an admin.
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="admin-input-group">
            <FaEnvelope className="admin-input-icon" />
            <input
              type="email"
              placeholder="Admin Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="admin-input-group">
            <FaLock className="admin-input-icon" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="admin-login-btn">
            {loading ? 'Verifying...' : (<>Sign In <FaArrowRight className="btn-icon" /></>)}
          </button>
        </form>

        <div className="admin-login-footer">
          <Link to="/">&larr; Back to main site</Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
