// src/components/Navbar.js
import { useState, useEffect } from 'react';
import './Navbar.css';
import '../../App.css'
import { Link, useNavigate } from 'react-router-dom';
import { auth,logOut } from '../../config/firebase';
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
  FaSignInAlt
} from 'react-icons/fa';


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

  // Determine display name
  let displayName = "User"; // Default
  if (user) {
    if (user.displayName) {
      displayName = user.displayName;
    } else if (user.email) {
      // Use part before @, or full email if no @ (though unlikely)
      displayName = user.email.includes('@') ? user.email.split('@')[0] : user.email;
    }
  }

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
              <FaHome style={{ marginRight: '8px' }} /> <span>Home</span>
            </Link>
          </li>

          {user && (
            <>
              {/* <li className="nav-item">
                <Link to="/employees" className="nav-links" onClick={() => setMenuOpen(false)}>
                  <FaListAlt style={{ marginRight: '8px' }} /> <span>Operator List</span>
                </Link>
              </li> */}
              <li className="nav-item">
                <Link to="/add-employee" className="nav-links" onClick={() => setMenuOpen(false)}>
                  <FaPlusCircle style={{ marginRight: '8px' }} /> <span>Add Operator</span>
                </Link>
              </li>
              {/* <li className="nav-item">
                <Link to="/reference-names" className="nav-links" onClick={() => setMenuOpen(false)}>
                  <FaUserPlus style={{ marginRight: '8px' }} /> <span>Reference Names</span>
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/admin/manage-centers" className="nav-links" onClick={() => setMenuOpen(false)}>
                  <FaUsersCog style={{ marginRight: '8px' }} /> <span>Manage Centers</span>
                </Link>
              </li> */}
              <li className="nav-item">
                <Link to="/profile"
                className="nav-links" onClick={() => setMenuOpen(false)}>
                  <FaUserCircle className="user-icon" />
                  <span className="user-display-name">{displayName}</span>
                </Link>
              </li>
              {/* <li className="nav-item">
                <button className="logout-btn" onClick={handleLogout}>
                  <FaSignOutAlt style={{ marginRight: '5px' }} /> <span>Logout</span>
                </button>
              </li> */}
            </>
          )}

          {!user && (
            <>
              <li className="nav-item">
                <Link to="/login" className="nav-links" onClick={() => setMenuOpen(false)}>
                  <FaSignInAlt style={{ marginRight: '8px' }} /> Login
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/signup" className="nav-links signup-btn" onClick={() => setMenuOpen(false)}>
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
