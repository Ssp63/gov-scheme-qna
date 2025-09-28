import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './SchemeCard.css';

const ChatIcon = () => (
  <svg className="chat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="download-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7,10 12,15 17,10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const SchemeCard = ({ scheme }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxDescriptionLength = 100;
  const maxTitleLength = 60;
  
  const shouldTruncateDescription = scheme.description.length > maxDescriptionLength;
  const shouldTruncateTitle = scheme.title.length > maxTitleLength;
  
  const truncatedTitle = shouldTruncateTitle 
    ? scheme.title.substring(0, maxTitleLength) + '...'
    : scheme.title;
    
  const truncatedDescription = shouldTruncateDescription && !isExpanded
    ? scheme.description.substring(0, maxDescriptionLength) + '...'
    : scheme.description;

  const handleDownload = () => {
    if (scheme.pdfFile && scheme.pdfFile.filename) {
      // Remove /api from the base URL since PDFs are served directly from /uploads
      const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
      const pdfUrl = `${baseUrl}/uploads/schemes/${scheme.pdfFile.filename}`;
      
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = scheme.pdfFile.originalName || `${scheme.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="scheme-card">
      <div className="scheme-header">
        <div className="scheme-category">
          {scheme.category}
        </div>
      </div>
      
      <div className="scheme-content">
        <h3 className="scheme-title preserve-original-text notranslate" title={scheme.title}>
          {truncatedTitle}
        </h3>
        
        <div className="scheme-description-container">
          <div className="scheme-description-wrapper">
            <p className={`scheme-description preserve-original-text notranslate ${isExpanded ? 'expanded' : ''}`}>
              {isExpanded ? scheme.description : truncatedDescription}
            </p>
            {shouldTruncateDescription && (
              <button 
                className="read-more-btn"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Read Less' : 'Read More'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="scheme-footer">
        {scheme.pdfFile && scheme.pdfFile.filename && (
          <button 
            className="download-btn"
            onClick={handleDownload}
            title="Download PDF Document"
          >
            <DownloadIcon />
          </button>
        )}
        
        <Link 
          to={`/chat/${scheme._id}`} 
          className="scheme-link"
        >
          <ChatIcon />
          Ask Questions
        </Link>
      </div>
    </div>
  );
};

export default SchemeCard;
