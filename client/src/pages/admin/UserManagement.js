import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';
import './UserManagement.css';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('UserManagement Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-state">
          <h2>Something went wrong</h2>
          <p>Please refresh the page and try again.</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Icons with proper sizing
const PlusIcon = () => (
  <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const EditIcon = () => (
  <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const DeleteIcon = () => (
  <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const UserIcon = () => (
  <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const UserManagement = () => {
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // User form state
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    role: 'admin'
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiService.users.getAll();
      console.log('Users response:', response);
      setUsers(response.data?.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Failed to fetch users');
      setUsers([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Debug: Log current user info
  useEffect(() => {
    console.log('Current user:', user);
    console.log('Current user ID:', user?._id);
    console.log('Current user role:', user?.role);
  }, [user]);

  // Debug: Log users list
  useEffect(() => {
    console.log('Users list:', users);
    users.forEach((userItem, index) => {
      console.log(`User ${index}:`, {
        id: userItem._id,
        name: userItem.name,
        email: userItem.email,
        role: userItem.role
      });
    });
  }, [users]);

  // Show loading while user data is being fetched
  if (!user) {
    return (
      <div className="loading-state">
        <h2>Loading...</h2>
        <p>Please wait while we load your user information.</p>
      </div>
    );
  }

  // Check if user is super admin
  if (!isSuperAdmin()) {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
      </div>
    );
  }

  const handleUserFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Update existing user
        const response = await apiService.users.update(editingUser._id, userForm);
        setUsers(prevUsers => 
          prevUsers.map(u => u._id === editingUser._id ? response.data.user : u)
        );
        toast.success('User updated successfully!');
      } else {
        // Create new user
        const response = await apiService.users.create(userForm);
        setUsers(prevUsers => [response.data.user, ...prevUsers]);
        toast.success('User created successfully!');
      }
      resetForm();
    } catch (error) {
      console.error('Error saving user:', error);
      const errorMessage = error.response?.data?.message || 'Error saving user. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      password: '', // Don't pre-fill password
      department: user.department || '',
      role: user.role
    });
    setShowUserForm(true);
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await apiService.users.delete(userId);
        setUsers(prevUsers => prevUsers.filter(u => u._id !== userId));
        toast.success('User deleted successfully!');
      } catch (error) {
        console.error('Error deleting user:', error);
        const errorMessage = error.response?.data?.message || 'Error deleting user. Please try again.';
        toast.error(errorMessage);
      }
    }
  };

  const resetForm = () => {
    setUserForm({
      name: '',
      email: '',
      password: '',
      department: '',
      role: 'admin'
    });
    setEditingUser(null);
    setShowUserForm(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Filter users based on search and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = !roleFilter || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="user-management">
      <div className="container">
        {/* Header */}
        <div className="management-header">
          <div className="header-content">
            <button 
              className="back-button"
              onClick={() => navigate('/admin/dashboard')}
            >
              ← Back to Dashboard
            </button>
            <h1>User Management</h1>
            <p>Manage admin users and permissions</p>
          </div>
          <div className="header-actions">
            <button 
              className="btn-primary"
              onClick={() => setShowUserForm(true)}
            >
              <PlusIcon />
              Add New User
            </button>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="management-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <select
            className="role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="users-table-container">
          <div className="table-header">
            <h2>Users Management</h2>
            <p>Total: {filteredUsers.length} users</p>
          </div>
          
          {loading ? (
            <div className="loading-state">Loading users...</div>
          ) : (
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(userItem => (
                    <tr key={userItem._id}>
                      <td>
                        <div className="user-info">
                          <div className="user-avatar">
                            <UserIcon />
                          </div>
                          <div className="user-details">
                            <h4>{userItem.name}</h4>
                            {userItem._id && user._id && userItem._id.toString() === user._id.toString() && (
                              <span className="current-user-badge">(You)</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{userItem.email}</td>
                      <td>
                        <span className={`role-badge ${userItem.role}`}>
                          {userItem.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                        </span>
                      </td>
                      <td>{userItem.department || '-'}</td>
                      <td>
                        {userItem.lastLogin 
                          ? new Date(userItem.lastLogin).toLocaleDateString()
                          : 'Never'
                        }
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn-edit"
                            onClick={() => handleEdit(userItem)}
                            title="Edit user"
                          >
                            <EditIcon />
                          </button>
                          {(() => {
                            // Multiple ways to check if it's the current user
                            const isCurrentUserById = userItem._id && user._id && userItem._id.toString() === user._id.toString();
                            const isCurrentUserByEmail = userItem.email === user.email;
                            const isCurrentUser = isCurrentUserById || isCurrentUserByEmail;
                            
                            console.log('User comparison:', {
                              userItemId: userItem._id,
                              currentUserId: user._id,
                              userItemEmail: userItem.email,
                              currentUserEmail: user.email,
                              isCurrentUserById: isCurrentUserById,
                              isCurrentUserByEmail: isCurrentUserByEmail,
                              isCurrentUser: isCurrentUser,
                              userItemName: userItem.name
                            });
                            
                            // For debugging: show delete button for all users except current one
                            // This will help us see if the issue is with the comparison logic
                            return !isCurrentUser;
                          })() && (
                            <button 
                              className="btn-delete"
                              onClick={() => handleDelete(userItem._id)}
                              title="Delete user"
                            >
                              <DeleteIcon />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredUsers.length === 0 && (
                <div className="empty-state">
                  <h3>No users found</h3>
                  <p>{users.length === 0 ? 'Create your first user to get started' : 'No users match your search criteria'}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Form Modal */}
        {showUserForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>
                <button className="modal-close" onClick={resetForm}>×</button>
              </div>
              
              <form onSubmit={handleUserFormSubmit} className="user-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={userForm.name}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      value={userForm.email}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter email address"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Password {!editingUser && '*'}</label>
                    <input
                      type="password"
                      name="password"
                      value={userForm.password}
                      onChange={handleInputChange}
                      required={!editingUser}
                      placeholder={editingUser ? "Leave blank to keep current password" : "Enter password"}
                    />
                  </div>
                  <div className="form-group">
                    <label>Department</label>
                    <input
                      type="text"
                      name="department"
                      value={userForm.department}
                      onChange={handleInputChange}
                      placeholder="Enter department (optional)"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Role *</label>
                  <select
                    name="role"
                    value={userForm.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                  <p className="form-help">
                    Super Admin can create and manage other users. Regular Admin can only manage schemes.
                  </p>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={resetForm}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingUser ? 'Update User' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// Wrap UserManagement with ErrorBoundary
const UserManagementWithErrorBoundary = () => (
  <ErrorBoundary>
    <UserManagement />
  </ErrorBoundary>
);

export default UserManagementWithErrorBoundary;
