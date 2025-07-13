// src/components/AuthForm.js
import { useState, useEffect } from 'react'; // Import useEffect
import { signUp as firebaseSignUp, logIn, db, auth } from '../../config/firebase'; // Import auth for deleteUser and auth object
import { deleteUser, sendPasswordResetEmail } from 'firebase/auth'; // Import deleteUser and sendPasswordResetEmail
import { ref, set } from 'firebase/database'; // Import the necessary database functions
import { useAuth } from '../../context/AuthContext'; // Import useAuth
import { FaEnvelope, FaLock, FaArrowRight, FaUser, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // Import useLocation
import './AuthForm.css';

const AuthForm = ({ type }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // For signup
  const [name, setName] = useState(''); // New state for name
  const [phone, setPhone] = useState(''); // New state for phone number
  const [address, setAddress] = useState(''); // New state for address
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation(); // Get location object
  const { user: currentUser, loading: authLoading } = useAuth(); // Get current user from AuthContext
  // Determine where to redirect after login/signup
  const from = location.state?.from?.pathname || '/'; // Default to homepage

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    // If auth is not loading and a user is already logged in,
    // redirect them from login/signup pages to the home page.
    if (!authLoading && currentUser) {
      console.log('AuthForm: User already logged in, redirecting to home.');
      navigate('/', { replace: true });
    }
  }, [currentUser, authLoading, navigate]);

  const handleForgotPasswordClick = () => {
    setIsForgotPassword(true);
    setError(''); // Clear any existing login errors
  };

  const handleResetEmailChange = (e) => {
    setResetEmail(e.target.value);
    setResetError(''); // Clear any reset email errors
    setResetMessage(''); // Clear any previous reset messages
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage('Password reset link sent to your email address.');
    } catch (resetError) {
      setResetError(resetError.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (type === 'signup') {
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
        const userCredential = await firebaseSignUp(email, password);
        if (userCredential && userCredential.user) {
          const userId = userCredential.user.uid;
          try {
            await set(ref(db, 'users/' + userId), {
              userId: userId,
              name: name,
              email: email,
              phone: phone,
              address: address,
            });
            navigate(from, { replace: true });
          } catch (dbError) {
            console.error("Error saving user data to database:", dbError);
            // Delete the user if database write fails
            await deleteUser(userCredential.user)
              .then(() => {
                console.log("User account deleted due to database error.");
                setError("Signup failed due to a server issue. Please try again.");
                // No need to navigate here, as signup failed
              })
              .catch((deleteError) => {
                console.error("Error deleting user account:", deleteError);
                setError("Signup failed. Please try again. (Could not rollback user creation)");
              });
          }
        }
      } else {
        console.log('AuthForm: Attempting Firebase login...');
        const userCredential = await logIn(email, password);
        console.log('AuthForm: Firebase login successful. UserCredential:', userCredential);
        // Navigate to the 'from' location or home page after successful login
        navigate(from, { replace: true });
      }
    } catch (authError) {
      console.error('AuthForm: Firebase login error:', authError);
      setError(authError.message || `An error occurred during ${type}.`);
    } finally {
      setLoading(false);
    }
  };

  // If auth is still loading or user is already logged in (and useEffect will redirect),
  // you might want to show a loading spinner or null to prevent form flash.
  if (authLoading || (!authLoading && currentUser)) {
    return <div className="auth-container"><p>Loading...</p></div>; // Or some other loading indicator
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
            )}

            {type === 'signup' && (
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
            )}

            {type === 'signup' && (
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