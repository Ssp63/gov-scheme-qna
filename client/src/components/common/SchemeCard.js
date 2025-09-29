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
  
  // Debug logging removed for production
  
  const shouldTruncateDescription = scheme.description.length > maxDescriptionLength;
  const shouldTruncateTitle = scheme.title.length > maxTitleLength;
  
  const truncatedTitle = shouldTruncateTitle 
    ? scheme.title.substring(0, maxTitleLength) + '...'
    : scheme.title;
    
  const truncatedDescription = shouldTruncateDescription && !isExpanded
    ? scheme.description.substring(0, maxDescriptionLength) + '...'
    : scheme.description;

  const handleDownload = async () => {
    if (scheme.pdfFile && scheme.pdfFile.url) {
      
      try {
        // Always use server endpoint for reliable downloads
        const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const downloadUrl = `${baseUrl}/schemes/${scheme._id}/download-pdf`;
        console.log('Using server download endpoint:', downloadUrl);
        
        // Open server endpoint which handles the Cloudinary redirect properly
        window.open(downloadUrl, '_blank');
        
        // Alternative Method 2: Direct Cloudinary fetch (if server method fails)
        // Uncomment below if you want to also try direct fetch
        /*
        setTimeout(async () => {
          try {
            console.log('Attempting direct fetch from Cloudinary:', scheme.pdfFile.url);
            
            const response = await fetch(scheme.pdfFile.url, {
              method: 'GET',
              headers: {
                'Accept': 'application/pdf',
              },
            });
            
            console.log('Fetch response status:', response.status);
            console.log('Fetch response headers:', Object.fromEntries(response.headers.entries()));
            
            if (response.ok) {
              const blob = await response.blob();
              console.log('Blob created, size:', blob.size, 'type:', blob.type);
              
              // Verify it's actually a PDF
              if (blob.type === 'application/pdf' || blob.type === 'application/octet-stream') {
                // Create download link
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = scheme.pdfFile.filename || `${scheme.title}.pdf`;
                link.style.display = 'none';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Clean up the URL object
                setTimeout(() => window.URL.revokeObjectURL(url), 100);
                
                console.log('Direct download initiated successfully');
              } else {
                console.warn('Downloaded file is not a PDF:', blob.type);
                window.open(scheme.pdfFile.url, '_blank');
              }
            } else {
              console.error('Failed to fetch PDF:', response.status, response.statusText);
              window.open(scheme.pdfFile.url, '_blank');
            }
          } catch (fetchError) {
            console.error('Direct fetch failed:', fetchError);
            window.open(scheme.pdfFile.url, '_blank');
          }
        }, 1000);
        */
        
      } catch (error) {
        console.error('Error with server download:', error);
        // Final fallback: direct Cloudinary URL
        console.log('Falling back to direct Cloudinary URL');
        window.open(scheme.pdfFile.url, '_blank');
      }
    } else {
      console.log('No PDF file found for scheme:', scheme._id);
      console.log('scheme.pdfFile:', scheme.pdfFile);
      alert('PDF file not available for this scheme.');
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
        {scheme.pdfFile && scheme.pdfFile.url && (
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
