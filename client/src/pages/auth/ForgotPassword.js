import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiService.auth.forgotPassword(email);
      
      if (response.data.success) {
        setEmailSent(true);
        // In development, show the temporary password
        if (response.data.temporaryPassword) {
          setTemporaryPassword(response.data.temporaryPassword);
        }
        toast.success('Password reset successful! Please check your email.');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to reset password. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/admin/login');
  };

  if (emailSent) {
    return (
      <div className="forgot-password-page">
        <div className="forgot-password-container">
          <div className="forgot-password-card">
            <div className="success-header">
              <div className="success-icon">✓</div>
              <h2>Password Reset Sent</h2>
              <p>We've sent a temporary password to your email address.</p>
            </div>

            {temporaryPassword && (
              <div className="temporary-password">
                <h3>Development Mode - Temporary Password:</h3>
                <div className="password-display">
                  <code>{temporaryPassword}</code>
                </div>
                <p className="dev-note">
                  <strong>Note:</strong> In production, this password would be sent via email.
                </p>
              </div>
            )}

            <div className="success-actions">
              <button
                onClick={handleBackToLogin}
                className="btn btn-primary btn-full"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-container">
        <div className="forgot-password-card">
          <div className="forgot-password-header">
            <h2>Forgot Password?</h2>
            <p>Enter your email address and we'll send you a temporary password.</p>
          </div>

          <form onSubmit={handleSubmit} className="forgot-password-form">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                required
                placeholder="Enter your email address"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-full"
            >
              {loading ? 'Sending...' : 'Send Reset Password'}
            </button>
          </form>

          <div className="forgot-password-footer">
            <button
              onClick={handleBackToLogin}
              className="btn btn-secondary btn-full"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
