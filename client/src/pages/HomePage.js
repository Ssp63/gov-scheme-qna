import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import SearchBox from '../components/common/SearchBox';
import CategoryFilter from '../components/common/CategoryFilter';
import SchemesGrid from '../components/common/SchemesGrid';
import './HomePage.css';

const HomePage = () => {
  const [schemes, setSchemes] = useState([]);
  const [filteredSchemes, setFilteredSchemes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchSuggestions, setSearchSuggestions] = useState([]);

  const categories = [
    { id: 'all', name: 'All Schemes' },
    { id: 'Education', name: 'Education' },
    { id: 'Healthcare', name: 'Healthcare' },
    { id: 'Agriculture', name: 'Agriculture' },
    { id: 'Employment', name: 'Employment' },
    { id: 'Housing', name: 'Housing' },
    { id: 'Social Welfare', name: 'Social Welfare' },
    { id: 'Business', name: 'Business' },
    { id: 'Technology', name: 'Technology' },
    { id: 'Other', name: 'Other' }
  ];

  const fetchSchemes = async () => {
    try {
      setLoading(true);
      const response = await apiService.schemes.getAll();
      setSchemes(response.data.schemes || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching schemes:', err);
      setError('Failed to load schemes. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const filterSchemes = useCallback(() => {
    let filtered = schemes;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(scheme =>
        scheme.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scheme.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scheme.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(scheme =>
        scheme.category === selectedCategory
      );
    }

    setFilteredSchemes(filtered);
  }, [schemes, searchTerm, selectedCategory]);

  useEffect(() => {
    fetchSchemes();
  }, []);

  useEffect(() => {
    filterSchemes();
  }, [filterSchemes]);

  const handleSearch = (e) => {
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
    // Scroll to schemes section after search
    const schemesSection = document.querySelector('.schemes-section');
    if (schemesSection) {
      schemesSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion);
    setSearchSuggestions([]);
    // Scroll to schemes section after selecting suggestion
    const schemesSection = document.querySelector('.schemes-section');
    if (schemesSection) {
      schemesSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading schemes...</p>
      </div>
    );
  }

  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              Government Schemes
              <span className="hero-highlight"> Made Simple</span>
            </h1>
            <p className="hero-description">
              Find government schemes and get instant answers to your questions with our AI assistant.
            </p>
            
            {/* Search Bar */}
            <SearchBox 
              value={searchTerm}
              onChange={handleSearch}
              onSearch={handleSearchSubmit}
              onSuggestionClick={handleSuggestionClick}
              suggestions={searchSuggestions}
              placeholder="Search for schemes..."
            />
          </div>
        </div>
      </section>

      {/* Category Filters */}
      <section className="filters-section">
        <div className="container">
          <h2 className="section-title">Browse by Category</h2>
          <CategoryFilter 
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
          />
        </div>
      </section>

      {/* Schemes Grid */}
      <section className="schemes-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">
              {selectedCategory === 'all' ? 'All Schemes' : 
               categories.find(c => c.id === selectedCategory)?.name + ' Schemes'}
            </h2>
            <p className="section-subtitle">
              {filteredSchemes.length} scheme{filteredSchemes.length !== 1 ? 's' : ''} found
            </p>
          </div>

          <SchemesGrid 
            schemes={filteredSchemes}
            loading={loading}
            error={error}
            onRetry={fetchSchemes}
          />
        </div>
      </section>
    </div>
  );
};

export default HomePage;