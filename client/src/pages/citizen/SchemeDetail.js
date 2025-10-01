import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import './SchemeDetail.css';

const DownloadIcon = () => (
  <svg className="download-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7,10 12,15 17,10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const ChatIcon = () => (
  <svg className="chat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const BackIcon = () => (
  <svg className="back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
  </svg>
);

const CalendarIcon = () => (
  <svg className="calendar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
  </svg>
);

const SchemeDetail = () => {
  const { schemeId } = useParams();
  const navigate = useNavigate();
  const [scheme, setScheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchScheme = async () => {
      try {
        setLoading(true);
        const response = await apiService.schemes.getById(schemeId);
        setScheme(response.data.scheme);
        setError(null);
      } catch (err) {
        console.error('Error fetching scheme:', err);
        setError('Failed to load scheme details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (schemeId) {
      fetchScheme();
    }
  }, [schemeId]);

  const handleDownload = async () => {
    if (scheme.pdfFile && scheme.pdfFile.url) {
      try {
        const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const downloadUrl = `${baseUrl}/schemes/${scheme._id}/download-pdf`;
        window.open(downloadUrl, '_blank');
      } catch (error) {
        console.error('Error with server download:', error);
        window.open(scheme.pdfFile.url, '_blank');
      }
    } else {
      alert('PDF file not available for this scheme.');
    }
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="scheme-detail-page">
        <div className="loading-container">
          <LoadingSpinner size="large" />
          <p>Loading scheme details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="scheme-detail-page">
        <div className="error-container">
          <h2>Error Loading Scheme</h2>
          <p>{error}</p>
          <button onClick={handleBackClick} className="btn btn-primary">
            <BackIcon />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!scheme) {
    return (
      <div className="scheme-detail-page">
        <div className="error-container">
          <h2>Scheme Not Found</h2>
          <p>The requested scheme could not be found.</p>
          <button onClick={handleBackClick} className="btn btn-primary">
            <BackIcon />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="scheme-detail-page">
      <div className="container">
        {/* Back Navigation */}
        <div className="back-section">
          <button onClick={handleBackClick} className="back-btn">
            <BackIcon />
            Back to Schemes
          </button>
        </div>

        {/* Main Content */}
        <div className="scheme-detail-main">
          {/* Header Section */}
          <div className="scheme-header">
            <div className="scheme-meta">
              <span className="scheme-category">{scheme.category}</span>
              <div className="scheme-date">
                <CalendarIcon />
                <span>Created on {formatDate(scheme.createdAt)}</span>
              </div>
            </div>
            
            <div className="scheme-title-container">
              <h1 className="scheme-title preserve-original-text notranslate">
                {scheme.title}
              </h1>
            </div>
          </div>

          {/* Description Section */}
          <div className="scheme-description-section">
            <h2>About This Scheme</h2>
            <div className="description-content preserve-original-text notranslate">
              {scheme.description}
            </div>
          </div>

          {/* Actions Section */}
          <div className="scheme-actions-section">
            <h2>Available Actions</h2>
            <div className="actions-grid">
              {scheme.pdfFile && scheme.pdfFile.url && (
                <button 
                  className="action-card download-action"
                  onClick={handleDownload}
                >
                  <div className="action-icon">
                    <DownloadIcon />
                  </div>
                  <div className="action-content">
                    <h3>Download PDF</h3>
                    <p>Get the complete scheme document</p>
                  </div>
                </button>
              )}
              
              <Link 
                to={`/chat/${scheme._id}`} 
                className="action-card chat-action"
              >
                <div className="action-icon">
                  <ChatIcon />
                </div>
                <div className="action-content">
                  <h3>Ask Questions</h3>
                  <p>Get answers about this scheme</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchemeDetail;