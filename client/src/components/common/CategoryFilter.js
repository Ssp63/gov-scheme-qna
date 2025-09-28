import React from 'react';
import './CategoryFilter.css';

const CategoryFilter = ({ categories, selectedCategory, onCategoryChange }) => {
  return (
    <div className="category-filters">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
