import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        {/* Main Footer Content */}
        <div className="footer-content">
          {/* Brand Section */}
          <div className="footer-section footer-brand">
            <div className="footer-logo">
              <h3>Government Schemes Q&A</h3>
              <p className="footer-tagline">
                Empowering citizens with AI-powered access to government schemes
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-section">
            <h4 className="footer-title">Quick Links</h4>
            <ul className="footer-links">
              <li>
                <Link to="/" className="footer-link">Home</Link>
              </li>
              <li>
                <Link to="/chat" className="footer-link">Ask Questions</Link>
              </li>
              <li>
                <Link to="/admin/login" className="footer-link">Admin Portal</Link>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="footer-section">
            <h4 className="footer-title">Contact & Support</h4>
            <div className="footer-contact">
              <div className="contact-item">
                <svg className="contact-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span>Helpline: 0233-2372725</span>
              </div>
              <div className="contact-item">
                <svg className="contact-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <span>deputyceosangali@gmail.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <div className="footer-copyright">
              <p>
                © {currentYear} Government of Maharashtra. All rights reserved.
              </p>
              <p className="footer-disclaimer">
                This platform is designed to assist citizens in accessing government schemes. 
                For official information, please refer to the respective government departments.
              </p>
              <p className="footer-disclaimer">
                Developed as a project for Zilla Parishad Sangli by students of Walchand College of Engineering, Sangli.
              </p>
            </div>
            
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
