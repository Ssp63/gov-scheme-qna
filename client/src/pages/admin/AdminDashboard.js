import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import SearchBox from '../../components/common/SearchBox';
import './AdminDashboard.css';

// Simple icons with proper sizing
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

const PermanentDeleteIcon = () => (
  <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const RestoreIcon = () => (
  <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const UserIcon = () => (
  <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const AdminDashboard = () => {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [schemes, setSchemes] = useState([]);
  const [filteredSchemes, setFilteredSchemes] = useState([]);
  const [showSchemeForm, setShowSchemeForm] = useState(false);
  const [editingScheme, setEditingScheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);

  // Scheme form state
  const [schemeForm, setSchemeForm] = useState({
    title: '',
    description: '',
    category: '',
    pdfFile: null
  });

  const categories = [
    'Education', 'Healthcare', 'Agriculture', 'Employment', 
    'Housing', 'Social Welfare', 'Business', 'Technology', 'Other'
  ];

  const fetchSchemes = async () => {
    try {
      setLoading(true);
      const response = await apiService.schemes.getAdminAll();
      setSchemes(response.data.schemes || []);
    } catch (error) {
      console.error('Error fetching schemes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSchemes = useCallback(() => {
    let filtered = schemes;

    // Filter by active/inactive status
    if (!showDeleted) {
      filtered = filtered.filter(scheme => scheme.isActive !== false);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(scheme =>
        scheme.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scheme.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scheme.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(scheme =>
        scheme.category === selectedCategory
      );
    }

    setFilteredSchemes(filtered);
  }, [schemes, searchTerm, selectedCategory, showDeleted]);

  useEffect(() => {
    fetchSchemes();
  }, []);

  useEffect(() => {
    filterSchemes();
  }, [filterSchemes]);


  const handleSchemeFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', schemeForm.title);
      formData.append('description', schemeForm.description);
      formData.append('category', schemeForm.category);
      if (schemeForm.pdfFile) {
        formData.append('pdfFile', schemeForm.pdfFile);
      }

      if (editingScheme) {
        const response = await apiService.schemes.update(editingScheme._id, formData);
        console.log('Update response:', response);
        
        // Update the local state immediately with the updated scheme
        setSchemes(prevSchemes => 
          prevSchemes.map(scheme => 
            scheme._id === editingScheme._id 
              ? { ...scheme, ...response.data.scheme }
              : scheme
          )
        );
        
        alert('Scheme updated successfully!');
      } else {
        const response = await apiService.schemes.create(formData);
        console.log('Create response:', response);
        
        // Add the new scheme to the local state immediately
        setSchemes(prevSchemes => [response.data.scheme, ...prevSchemes]);
        
        alert('Scheme created successfully!');
      }

      resetForm();
    } catch (error) {
      console.error('Error saving scheme:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || 'Error saving scheme. Please try again.';
      alert(errorMessage);
    }
  };

  const handleEdit = (scheme) => {
    setEditingScheme(scheme);
    setSchemeForm({
      title: scheme.title,
      description: scheme.description,
      category: scheme.category,
      pdfFile: null
    });
    setShowSchemeForm(true);
  };

  const handleDelete = async (schemeId) => {
    if (window.confirm('Are you sure you want to delete this scheme? This will move it to the deleted section.')) {
      try {
        const response = await apiService.schemes.delete(schemeId);
        console.log('Delete response:', response);
        
        // Update the scheme status in local state
        setSchemes(prevSchemes => 
          prevSchemes.map(scheme => 
            scheme._id === schemeId 
              ? { ...scheme, isActive: false, deletedAt: new Date().toISOString() }
              : scheme
          )
        );
        
        alert('Scheme deleted successfully! It has been moved to the deleted section.');
      } catch (error) {
        console.error('Error deleting scheme:', error);
        console.error('Error response:', error.response?.data);
        const errorMessage = error.response?.data?.message || 'Error deleting scheme. Please try again.';
        alert(errorMessage);
      }
    }
  };

  const handlePermanentDelete = async (schemeId) => {
    if (window.confirm('Are you sure you want to PERMANENTLY delete this scheme? This action cannot be undone and will delete all associated data including PDF chunks.')) {
      try {
        const response = await apiService.schemes.permanentDelete(schemeId);
        console.log('Permanent delete response:', response);
        
        // Remove the scheme completely from local state
        setSchemes(prevSchemes => prevSchemes.filter(scheme => scheme._id !== schemeId));
        
        alert('Scheme permanently deleted successfully!');
      } catch (error) {
        console.error('Error permanently deleting scheme:', error);
        console.error('Error response:', error.response?.data);
        const errorMessage = error.response?.data?.message || 'Error permanently deleting scheme. Please try again.';
        alert(errorMessage);
      }
    }
  };

  const handleRestore = async (schemeId) => {
    if (window.confirm('Are you sure you want to restore this scheme?')) {
      try {
        const response = await apiService.schemes.restore(schemeId);
        console.log('Restore response:', response);
        
        // Update the scheme status in local state
        setSchemes(prevSchemes => 
          prevSchemes.map(scheme => 
            scheme._id === schemeId 
              ? { ...scheme, isActive: true, deletedAt: null, deletedBy: null }
              : scheme
          )
        );
        
        alert('Scheme restored successfully!');
      } catch (error) {
        console.error('Error restoring scheme:', error);
        console.error('Error response:', error.response?.data);
        const errorMessage = error.response?.data?.message || 'Error restoring scheme. Please try again.';
        alert(errorMessage);
      }
    }
  };

  const resetForm = () => {
    setSchemeForm({
      title: '',
      description: '',
      category: '',
      pdfFile: null
    });
    setEditingScheme(null);
    setShowSchemeForm(false);
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    setSchemeForm(prev => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Generate search suggestions based on scheme titles and categories
    if (value.length > 1) {
      const suggestions = schemes
        .filter(scheme => 
          scheme.title.toLowerCase().includes(value.toLowerCase()) ||
          scheme.category.toLowerCase().includes(value.toLowerCase())
        )
        .map(scheme => scheme.title)
        .slice(0, 5);
      setSearchSuggestions(suggestions);
    } else {
      setSearchSuggestions([]);
    }
  };

  const handleSearchSubmit = (searchValue) => {
    setSearchTerm(searchValue);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion);
    setSearchSuggestions([]);
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  return (
    <div className="admin-dashboard">
      <div className="container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <h1>Admin Dashboard</h1>
            <p>Manage government schemes</p>
          </div>
          <div className="header-actions">
            {isSuperAdmin() && (
              <button 
                className="btn-primary"
                onClick={() => navigate('/admin/users')}
                style={{ marginRight: '12px' }}
              >
                <UserIcon />
                Manage Users
              </button>
            )}
            <button 
              className="btn-primary"
              onClick={() => setShowSchemeForm(true)}
            >
              <PlusIcon />
              Add New Scheme
            </button>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="dashboard-filters">
          <SearchBox 
            value={searchTerm}
            onChange={handleSearchChange}
            onSearch={handleSearchSubmit}
            onSuggestionClick={handleSuggestionClick}
            suggestions={searchSuggestions}
            placeholder="Search schemes..."
            className="admin-search-box"
          />
          <select
            className="category-filter"
            value={selectedCategory}
            onChange={handleCategoryChange}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <label className="show-deleted-toggle">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
            />
            Show Deleted
          </label>
        </div>

        {/* Schemes Table */}
        <div className="schemes-table-container">
          <div className="table-header">
            <h2>Schemes Management</h2>
            <p>Total: {filteredSchemes.length} schemes</p>
          </div>
          
          {loading ? (
            <div className="loading-state">Loading schemes...</div>
          ) : (
            <div className="schemes-table">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchemes.map(scheme => (
                    <tr key={scheme._id} className={!scheme.isActive ? 'inactive-scheme' : ''}>
                      <td>
                        <div className="scheme-title">
                          <h4 className="preserve-original-text notranslate">
                            {scheme.title}
                            {!scheme.isActive && <span className="inactive-badge"> (Deleted)</span>}
                          </h4>
                          <p className="preserve-original-text notranslate">{scheme.description.substring(0, 60)}...</p>
                        </div>
                      </td>
                      <td>
                        <span className="category-badge">{scheme.category}</span>
                      </td>
                      <td>
                        {new Date(scheme.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="action-buttons">
                          {scheme.isActive ? (
                            // Active scheme actions
                            <>
                              <button 
                                className="btn-edit"
                                onClick={() => handleEdit(scheme)}
                                title="Edit scheme"
                              >
                                <EditIcon />
                              </button>
                              <button 
                                className="btn-delete"
                                onClick={() => handleDelete(scheme._id)}
                                title="Delete scheme (move to deleted section)"
                              >
                                <DeleteIcon />
                              </button>
                            </>
                          ) : (
                            // Deleted scheme actions
                            <>
                              <button 
                                className="btn-restore"
                                onClick={() => handleRestore(scheme._id)}
                                title="Restore scheme"
                              >
                                <RestoreIcon />
                              </button>
                              <button 
                                className="btn-permanent-delete"
                                onClick={() => handlePermanentDelete(scheme._id)}
                                title="Permanently delete scheme (cannot be undone)"
                              >
                                <PermanentDeleteIcon />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredSchemes.length === 0 && (
                <div className="empty-state">
                  <h3>No schemes found</h3>
                  <p>{schemes.length === 0 ? 'Create your first scheme to get started' : 'No schemes match your search criteria'}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scheme Form Modal */}
        {showSchemeForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>{editingScheme ? 'Edit Scheme' : 'Add New Scheme'}</h2>
                <button className="modal-close" onClick={resetForm}>×</button>
              </div>
              
              <form onSubmit={handleSchemeFormSubmit} className="scheme-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Scheme Title *</label>
                    <input
                      type="text"
                      name="title"
                      value={schemeForm.title}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter scheme title"
                    />
                  </div>
                  <div className="form-group">
                    <label>Category *</label>
                    <select
                      name="category"
                      value={schemeForm.category}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    name="description"
                    value={schemeForm.description}
                    onChange={handleInputChange}
                    rows="4"
                    required
                    placeholder="Enter detailed description of the scheme"
                  />
                </div>

                <div className="form-group">
                  <label>PDF Document</label>
                  <input
                    type="file"
                    name="pdfFile"
                    onChange={handleInputChange}
                    accept=".pdf"
                    className="file-input"
                  />
                  <p className="file-help">Upload scheme PDF document (optional)</p>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={resetForm}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingScheme ? 'Update Scheme' : 'Create Scheme'}
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

export default AdminDashboard;