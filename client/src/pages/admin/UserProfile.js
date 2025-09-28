import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';
import ChangePasswordModal from '../../components/common/ChangePasswordModal';
import './UserProfile.css';

const UserProfile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    department: '',
    role: '',
    lastLogin: ''
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        department: user.department || '',
        role: user.role || '',
        lastLogin: user.lastLogin || ''
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiService.auth.updateProfile({
        name: profileData.name,
        department: profileData.department
      });

      if (response.data.success) {
        // Update the user context with new data
        updateUser(response.data.user);
        toast.success('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update profile. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'super_admin':
        return 'Super Administrator';
      case 'admin':
        return 'Administrator';
      default:
        return role;
    }
  };

  const formatLastLogin = (lastLogin) => {
    if (!lastLogin) return 'Never';
    return new Date(lastLogin).toLocaleString();
  };

  return (
    <div className="user-profile">
      <div className="container">
        {/* Header */}
        <div className="profile-header">
          <div className="header-content">
            <h1>User Profile</h1>
            <p>Manage your account settings and preferences</p>
          </div>
        </div>

        <div className="profile-content">
          {/* Profile Information Card */}
          <div className="profile-card">
            <div className="card-header">
              <h2>Profile Information</h2>
              <p>Update your personal information</p>
            </div>

            <form onSubmit={handleProfileUpdate} className="profile-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={profileData.name}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={profileData.email}
                    className="form-input"
                    disabled
                    placeholder="Email address"
                  />
                  <p className="form-help">Email cannot be changed. Contact administrator if needed.</p>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={profileData.department}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter your department"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Role</label>
                  <input
                    type="text"
                    name="role"
                    value={getRoleDisplayName(profileData.role)}
                    className="form-input"
                    disabled
                    placeholder="User role"
                  />
                  <p className="form-help">Role is assigned by administrator.</p>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </form>
          </div>

          {/* Account Security Card */}
          <div className="profile-card">
            <div className="card-header">
              <h2>Account Security</h2>
              <p>Manage your password and security settings</p>
            </div>

            <div className="security-section">
              <div className="security-item">
                <div className="security-info">
                  <h3>Password</h3>
                  <p>Last changed: Unknown</p>
                </div>
                <button
                  onClick={() => setShowChangePasswordModal(true)}
                  className="btn btn-secondary"
                >
                  Change Password
                </button>
              </div>

              <div className="security-item">
                <div className="security-info">
                  <h3>Last Login</h3>
                  <p>{formatLastLogin(profileData.lastLogin)}</p>
                </div>
                <div className="security-status">
                  <span className="status-badge active">Active</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Change Password Modal */}
        <ChangePasswordModal
          isOpen={showChangePasswordModal}
          onClose={() => setShowChangePasswordModal(false)}
        />
      </div>
    </div>
  );
};

export default UserProfile;
