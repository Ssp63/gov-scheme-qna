import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LanguageToggle from './LanguageToggle';
import chatLogo from '../../assets/chatlogo.png';
import './Navbar.css';

const Navbar = () => {
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };


  return (
    <nav className="navbar">
      <div className="container navbar-content">
        {/* Brand */}
        <Link to="/" className="navbar-brand" onClick={closeMenu}>
          <img src={chatLogo} alt="LokMitra Logo" className="navbar-logo" />
          LokMitra
        </Link>

        {/* Desktop Navigation */}
        <div className="navbar-nav desktop-nav">
          {!isAuthenticated ? (
            // Public navigation
            <>
              <LanguageToggle />
              <Link 
                to="/" 
                className={`navbar-link ${isActivePath('/') ? 'active' : ''}`}
              >
                Home
              </Link>
              <Link 
                to="/chat" 
                className={`navbar-link ${location.pathname.startsWith('/chat') ? 'active' : ''}`}
              >
                Ask Questions
              </Link>
              <Link 
                to="/admin/login" 
                className="btn btn-outline btn-sm"
              >
                Admin Login
              </Link>
            </>
          ) : (
            // Authenticated navigation
            <>
              {!isAdmin() ? (
                // Citizen navigation
                <>
                  <LanguageToggle />
                  <Link 
                    to="/" 
                    className={`navbar-link ${isActivePath('/') ? 'active' : ''}`}
                  >
                    Home
                  </Link>
                  <Link 
                    to="/chat" 
                    className={`navbar-link ${location.pathname.startsWith('/chat') ? 'active' : ''}`}
                  >
                    Ask Questions
                  </Link>
                </>
              ) : (
                // Admin navigation
                <>
                  <LanguageToggle />
                  <Link 
                    to="/admin/dashboard" 
                    className={`navbar-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    to="/" 
                    className="navbar-link"
                  >
                    Public View
                  </Link>
                </>
              )}
              
              {/* User Profile Dropdown */}
              <div className="user-menu">
                <button 
                  className="user-menu-trigger"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                  <div className="user-avatar">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="user-name">{user?.name}</span>
                  <svg 
                    className={`dropdown-icon ${isMenuOpen ? 'open' : ''}`}
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor"
                  >
                    <polyline points="6,9 12,15 18,9"></polyline>
                  </svg>
                </button>
                
                {isMenuOpen && (
                  <div className="user-dropdown">
                    <div className="dropdown-header">
                      <div className="user-info">
                        <div className="user-name-full">{user?.name}</div>
                        <div className="user-email">{user?.email}</div>
                        <div className="user-role">{user?.role?.replace('_', ' ')}</div>
                      </div>
                    </div>
                    <div className="dropdown-divider"></div>
                    {isAdmin() && (
                      <Link 
                        to="/admin/profile" 
                        className="dropdown-item"
                        onClick={closeMenu}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        Profile
                      </Link>
                    )}
                    <button 
                      className="dropdown-item"
                      onClick={handleLogout}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16,17 21,12 16,7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Mobile Controls - Language Toggle + Menu Button */}
        <div className="mobile-controls">
          <LanguageToggle />
          <button 
            className="mobile-menu-btn"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <div className={`hamburger ${isMenuOpen ? 'open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="mobile-nav">
          <div className="mobile-nav-content">
            {!isAuthenticated ? (
              // Public mobile navigation
              <>
                <Link 
                  to="/" 
                  className={`mobile-nav-link ${isActivePath('/') ? 'active' : ''}`}
                  onClick={closeMenu}
                >
                  Home
                </Link>
                <Link 
                  to="/chat" 
                  className={`mobile-nav-link ${location.pathname.startsWith('/chat') ? 'active' : ''}`}
                  onClick={closeMenu}
                >
                  Ask Questions
                </Link>
                <Link 
                  to="/admin/login" 
                  className="mobile-nav-link"
                  onClick={closeMenu}
                >
                  Admin Login
                </Link>
              </>
            ) : (
              // Authenticated mobile navigation
              <>
                {!isAdmin() ? (
                  // Citizen mobile navigation
                  <>
                    <Link 
                      to="/" 
                      className={`mobile-nav-link ${isActivePath('/') ? 'active' : ''}`}
                      onClick={closeMenu}
                    >
                      Home
                    </Link>
                    <Link 
                      to="/chat" 
                      className={`mobile-nav-link ${location.pathname.startsWith('/chat') ? 'active' : ''}`}
                      onClick={closeMenu}
                    >
                      Ask Questions
                    </Link>
                  </>
                ) : (
                  // Admin mobile navigation
                  <>
                    <Link 
                      to="/admin/dashboard" 
                      className={`mobile-nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
                      onClick={closeMenu}
                    >
                      Dashboard
                    </Link>
                    <Link 
                      to="/admin/profile" 
                      className={`mobile-nav-link ${location.pathname === '/admin/profile' ? 'active' : ''}`}
                      onClick={closeMenu}
                    >
                      Profile
                    </Link>
                    <Link 
                      to="/" 
                      className="mobile-nav-link"
                      onClick={closeMenu}
                    >
                      Public View
                    </Link>
                  </>
                )}
                
                <div className="mobile-user-info">
                  <div className="user-details">
                    <div className="user-name-mobile">{user?.name}</div>
                    <div className="user-email-mobile">{user?.email}</div>
                  </div>
                  <button 
                    className="mobile-logout-btn"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;