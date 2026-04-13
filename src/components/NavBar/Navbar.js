// src/components/Navbar.js
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logOut } from '../../config/firebase'; // auth is not needed directly if using context
import { useAuth } from '../../context/AuthContext'; // Import useAuth
import {
  FaUserCircle,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaHome,
  FaListAlt,
  FaPlusCircle,
  FaUserPlus,
  FaUsersCog,
  FaSignInAlt,
  FaCaretDown,
  FaBullhorn,
  FaNewspaper,
} from 'react-icons/fa';

import './Navbar.css';
import '../../App.css';

const Navbar = () => {
  const { user, profileName, isAdmin } = useAuth(); // Get user, profileName and isAdmin from context
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  
  const handleLogout = async () => {
    try {
      await logOut();
      setMenuOpen(false); // Close mobile menu on logout
      setDropdownOpen(false); // Close dropdown on logout
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getFirstName = (fullName) => {
    if (!fullName || typeof fullName !== 'string') return 'User'; // Basic check for invalid fullName
    return fullName.split(' ')[0] || 'User'; // Return first part or 'User' if split results in empty
  };
  const displayName = getFirstName(profileName); // Use profileName from context

  // Helper to close all menus, useful for navigation links
  const closeAllMenus = () => {
    setMenuOpen(false);
    setDropdownOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={() => setMenuOpen(false)}>
          <img src="/logo.webp" alt="Logo" className="logo-image" />
          <span className="logo-text">AuthExam</span>
        </Link>

        <button
          className="menu-icon"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="main-nav-menu"
        >
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>

        <ul className={`nav-menu ${menuOpen ? 'active' : ''}`} id="main-nav-menu">
          <li className="nav-item">
            <Link to="/" className="nav-links" onClick={closeAllMenus}>
              <FaHome style={{ marginRight: '8px' }} /> Home
            </Link>
          </li>

          {/* Notices link visible to everyone */}
          <li className="nav-item">
            <Link to="/notices" className="nav-links" onClick={closeAllMenus}>
              <FaNewspaper style={{ marginRight: '8px' }} /> Notices
            </Link>
          </li>

          {user && (
            <>
              <li className="nav-item">
                <Link to="/add-employee" className="nav-links" onClick={closeAllMenus}>
                  <FaPlusCircle style={{ marginRight: '8px' }} /> Add Operator
                </Link>
              </li>

              <li className="nav-item profile-dropdown" ref={dropdownRef}>
                <button
                  className="nav-links profile-toggle"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                  aria-controls="profile-menu"
                >
                  <FaUserCircle className="user-icon" />
                  {displayName}
                  <FaCaretDown className="caret-icon" />
                </button>

                {dropdownOpen && (
                  <ul className="dropdown-menu" id="profile-menu">
                    <li>
                      <Link to="/profile" onClick={closeAllMenus}>
                        <FaUserCircle style={{ marginRight: '8px' }} /> View profile
                      </Link>
                    </li>
                    <li>
                      <Link to="/employees" onClick={closeAllMenus}>
                        <FaListAlt style={{ marginRight: '8px' }} /> Operator List
                      </Link>
                    </li>
                    <li>
                      <Link to="/reference-names" onClick={closeAllMenus}>
                        <FaUserPlus style={{ marginRight: '8px' }} /> Reference Names
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/admin/manage-centers"
                        onClick={closeAllMenus}
                      >
                        <FaUsersCog style={{ marginRight: '8px' }} /> Manage Centers
                      </Link>
                    </li>
                    <li>
                      <Link to="/saved-assignments" onClick={closeAllMenus}>
                        <FaListAlt style={{ marginRight: '8px' }} /> Saved Assignment
                    </Link>
                    </li>
                    {isAdmin && (
                      <li>
                        <Link to="/admin/blog" onClick={closeAllMenus}>
                          <FaBullhorn style={{ marginRight: '8px' }} /> Manage Blog
                        </Link>
                      </li>
                    )}
                    <li>
                      <button
                        onClick={handleLogout} // handleLogout now also closes menus
                        className="logout-button"
                      >
                        <FaSignOutAlt style={{ marginRight: '8px' }} /> Logout
                      </button>
                    </li>
                  </ul>
                )}
              </li>
            </>
          )}

          {!user && (
            <>
              <li className="nav-item">
                <Link to="/login" className="nav-links" onClick={closeAllMenus}>
                  <FaSignInAlt style={{ marginRight: '8px' }} /> Login
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/signup" className="nav-links signup" onClick={closeAllMenus}>
                  <FaUserPlus style={{ marginRight: '8px' }} /> Sign Up
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
