// src/components/AdminLogin/AdminLogin.js
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { get, ref } from 'firebase/database';
import { auth, db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { FaEnvelope, FaLock, FaShieldAlt, FaArrowRight } from 'react-icons/fa';
import '../AuthForm/AuthForm.css';
import './AdminLogin.css';

// Dedicated sign-in page for administrators, kept separate from the public
// user login/signup flow. Access is verified against the Admin table directly
// (rather than the shared AuthContext) so a non-admin account is rejected
// immediately, before it ever reaches an authenticated app state.
const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && isAdmin) {
      navigate('/admin/approvals', { replace: true });
    }
  }, [user, isAdmin, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const adminSnap = await get(ref(db, `Admin/${credential.user.uid}`));

      if (!adminSnap.exists()) {
        await signOut(auth);
        setError('This account does not have administrator access.');
        return;
      }

      navigate('/admin/approvals', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="auth-container"><p>Loading...</p></div>;
  }

  return (
    <div className="auth-container admin-login-page">
      <div className="auth-card admin-login-card">
        <div className="admin-login-badge"><FaShieldAlt /></div>
        <div className="auth-header">
          <h2>Admin Sign In</h2>
          <p>Restricted access for AuthExam administrators</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <FaEnvelope className="input-icon" />
            <input
              type="email"
              placeholder="Admin Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
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
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" disabled={submitting} className="auth-btn">
            {submitting ? 'Verifying...' : (
              <>
                Sign In <FaArrowRight className="btn-icon" />
              </>
            )}
          </button>
        </form>

        <p className="admin-login-note">
          Not an administrator? <Link to="/login">Go to member login</Link>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
