import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FaEnvelope, FaLock, FaArrowRight, FaUser, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import './AuthForm.css';

const AuthForm = ({ type }) => {
  useDocumentMeta(
    type === 'signup' ? 'Sign Up' : 'Login',
    type === 'signup'
      ? 'Create your AuthExam account to manage field operators, service centers, and invoices.'
      : 'Log in to your AuthExam account.'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser, loading: authLoading } = useAuth();

  const from = location.state?.from?.pathname || '/';

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    if (!authLoading && currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, authLoading, navigate]);

  const handleForgotPasswordClick = () => {
    setIsForgotPassword(true);
    setError('');
  };

  const handleResetEmailChange = (e) => {
    setResetEmail(e.target.value);
    setResetError('');
    setResetMessage('');
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');
    setLoading(true);

    try {
      // Dynamic imports to reduce unused JS on initial load
      const { getAuth, sendPasswordResetEmail } = await import('firebase/auth');
      const { app } = await import('../../config/firebase');
      const auth = getAuth(app);
      
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage('Password reset link sent to your email address.');
    } catch (err) {
      setResetError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Dynamic imports: Only fetch these when user clicks Submit
      const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser } = await import('firebase/auth');
      const { getDatabase, ref, set } = await import('firebase/database');
      const { app } = await import('../../config/firebase');
      
      const auth = getAuth(app);
      const db = getDatabase(app);

      if (type === 'signup') {
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        if (userCredential?.user) {
          const userId = userCredential.user.uid;
          try {
            await set(ref(db, 'users/' + userId), {
              userId, name, email, phone, address,
            });
            navigate(from, { replace: true });
          } catch (dbError) {
            console.error("Error saving user data:", dbError);
            await deleteUser(userCredential.user);
            setError("Signup failed due to a server issue. Please try again.");
          }
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        navigate(from, { replace: true });
      }
    } catch (authError) {
      console.error('Auth Error:', authError);
      setError(authError.message || `An error occurred during ${type}.`);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (!authLoading && currentUser)) {
    return <div className="auth-container"><p>Loading...</p></div>;
  }

  return (
    <div className={`auth-container ${type === 'signup' ? 'signup-page' : 'login-page'}`}>
      <div className="auth-card">
        <div className="auth-header">
          <h2>{type === 'signup' ? 'Create Account' : isForgotPassword ? 'Reset Password' : 'Welcome Back'}</h2>
          <p>
            {type === 'signup'
              ? 'Sign up to get started'
              : isForgotPassword
              ? 'Enter your email to reset your password'
              : 'Log in to your account'}
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {resetError && <div className="auth-error">{resetError}</div>}
        {resetMessage && <div className="auth-message">{resetMessage}</div>}

        {isForgotPassword ? (
          <form onSubmit={handleResetPasswordSubmit} className="auth-form">
            <div className="input-group">
              <FaEnvelope className="input-icon" />
              <input
                type="email"
                placeholder="Email Address"
                value={resetEmail}
                onChange={handleResetEmailChange}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="auth-btn">
              {loading ? 'Sending...' : 'Send Reset Link'}
              <FaArrowRight className="btn-icon" />
            </button>
            <p className="auth-footer-link" onClick={() => setIsForgotPassword(false)}>
              Back to Login
            </p>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {type === 'signup' && (
              <>
                <div className="input-group">
                  <FaUser className="input-icon" />
                  <input
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <FaPhone className="input-icon" />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <FaMapMarkerAlt className="input-icon" />
                  <input
                    type="text"
                    placeholder="Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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

            {type !== 'signup' && (
              <p className="auth-footer-link" onClick={handleForgotPasswordClick}>
                Forgot Password?
              </p>
            )}
          </form>
        )}

        <div className="auth-footer">
          {type === 'signup' ? (
            <p>
              Already have an account? <Link to="/login">Login</Link>
            </p>
          ) : (
            <p>
              Don't have an account? <Link to="/signup">Sign up</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthForm;