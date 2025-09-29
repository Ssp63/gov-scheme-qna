import React from 'react';
import './StatsCard.css';

const StatsCard = ({ 
  title, 
  value, 
  icon, 
  color = 'blue', 
  trend, 
  subtitle,
  loading = false 
}) => {
  if (loading) {
    return (
      <div className="stats-card loading">
        <div className="stats-card-skeleton">
          <div className="skeleton-icon"></div>
          <div className="skeleton-content">
            <div className="skeleton-title"></div>
            <div className="skeleton-value"></div>
            <div className="skeleton-subtitle"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`stats-card ${color}`}>
      <div className="stats-card-content">
        <div className="stats-icon">
          {icon}
        </div>
        <div className="stats-info">
          <h3 className="stats-title">{title}</h3>
          <div className="stats-value">{value}</div>
          {subtitle && (
            <p className="stats-subtitle">{subtitle}</p>
          )}
          {trend && (
            <div className={`stats-trend ${trend.type}`}>
              <span className="trend-icon">
                {trend.type === 'up' ? '↗' : trend.type === 'down' ? '↘' : '→'}
              </span>
              <span className="trend-text">{trend.value}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
