import React from 'react';
import './AIServiceCard.css';

const AIServiceCard = ({ service, index }) => {
  const {
    name,
    description,
    icon: IconComponent,
    status,
    color,
    gradient
  } = service;

  return (
    <div 
      className={`ai-service-card ${status.toLowerCase()}`}
      style={{ 
        '--card-color': color,
        '--card-gradient': gradient,
        '--animation-delay': `${index * 0.1}s`
      }}
    >
      <div className="card-header">
        <div className="service-icon">
          <IconComponent />
        </div>
        <div className="status-indicator">
          <div className={`status-dot ${status.toLowerCase()}`}></div>
          <span className="status-text">{status}</span>
        </div>
      </div>
      
      <div className="card-content">
        <h3 className="service-name">{name}</h3>
        <p className="service-description">{description}</p>
      </div>
      
      <div className="card-footer">
        <div className="service-badge">
          <span className="badge-text">AI Service</span>
        </div>
      </div>
    </div>
  );
};

export default AIServiceCard;
