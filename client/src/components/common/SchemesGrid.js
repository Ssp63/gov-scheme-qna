import React from 'react';
import SchemeCard from './SchemeCard';
import './SchemesGrid.css';

const SchemesGrid = ({ schemes, loading, error, onRetry }) => {
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading schemes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        <p>{error}</p>
        <button onClick={onRetry} className="retry-btn">
          Try Again
        </button>
      </div>
    );
  }

  if (schemes.length === 0) {
    return (
      <div className="no-results">
        <h3>No schemes found</h3>
        <p>Try adjusting your search or category filter</p>
      </div>
    );
  }

  return (
    <div className="schemes-grid">
      {schemes.map((scheme) => (
        <SchemeCard key={scheme._id} scheme={scheme} />
      ))}
    </div>
  );
};

export default SchemesGrid;
