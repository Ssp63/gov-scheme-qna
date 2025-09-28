import React from 'react';

const LoadingSpinner = ({ size = 'normal', color = 'primary' }) => {
  const sizeClasses = {
    small: { width: '16px', height: '16px' },
    normal: { width: '24px', height: '24px' },
    large: { width: '40px', height: '40px' },
  };

  const colorClasses = {
    primary: 'var(--primary-600)',
    secondary: 'var(--secondary-600)',
    white: '#ffffff',
  };

  const spinnerStyle = {
    ...sizeClasses[size],
    border: '3px solid var(--secondary-200)',
    borderTop: `3px solid ${colorClasses[color]}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  };

  return <div className="spinner" style={spinnerStyle}></div>;
};

export default LoadingSpinner;