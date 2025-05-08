// src/components/Navbar.js
import { useState, useEffect } from 'react';
import '../App.css';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../config/firebase';
import { logOut } from '../config/firebase';
import { FaUserCircle, FaSignOutAlt, FaBars, FaTimes } from 'react-icons/fa';

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await logOut();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
      <Link to="/" className="navbar-logo">
  <img src="/logo192.png" alt="Company Logo" className="logo-image" />
  AuthExam
</Link>

        <div className="menu-icon" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <FaTimes /> : <FaBars />}
        </div>

        <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
          <li className="nav-item">
            <Link to="/" className="nav-links" onClick={() => setMenuOpen(false)}>
              Home
            </Link>
          </li>

          {user && (
            <>
              <li className="nav-item">
                <Link to="/employees" className="nav-links" onClick={() => setMenuOpen(false)}>
                  Operator List
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/add-employee" className="nav-links" onClick={() => setMenuOpen(false)}>
                  Add Operator
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/reference-names" className="nav-links" onClick={() => setMenuOpen(false)}>
                  Add Supervisior
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/profile"
                className="nav-links" onClick={() => setMenuOpen(false)}>
                  <FaUserCircle className="user-icon" />
                  <span>{user.email}</span>
                </Link>
              </li>
              <li className="nav-item">
                <button className="logout-btn" onClick={handleLogout}>
                  <FaSignOutAlt /> Logout
                </button>
              </li>
            </>
          )}

          {!user && (
            <>
              <li className="nav-item">
                <Link to="/login" className="nav-links" onClick={() => setMenuOpen(false)}>
                  Login
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/signup" className="nav-links signup-btn" onClick={() => setMenuOpen(false)}>
                  Sign Up
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;