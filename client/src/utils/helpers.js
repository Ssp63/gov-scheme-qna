// Format date to readable string
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Format date with time
export const formatDateTime = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Truncate text to specified length
export const truncateText = (text, length = 100) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

// Capitalize first letter
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Convert slug to title
export const slugToTitle = (slug) => {
  return slug
    .split('_')
    .map(word => capitalize(word))
    .join(' ');
};

// Generate random ID
export const generateId = () => {
  return Math.random().toString(36).substr(2, 9);
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Check if file type is image
export const isImage = (file) => {
  return file && file.type && file.type.startsWith('image/');
};

// Check if file type is PDF
export const isPDF = (file) => {
  return file && file.type === 'application/pdf';
};

// Check if file type is document
export const isDocument = (file) => {
  const docTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  return file && file.type && docTypes.includes(file.type);
};

// Validate email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
export const validatePassword = (password) => {
  const minLength = 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  
  const issues = [];
  
  if (password.length < minLength) {
    issues.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasLowerCase) {
    issues.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumbers) {
    issues.push('Password must contain at least one number');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    strength: issues.length === 0 ? 'strong' : issues.length <= 2 ? 'medium' : 'weak'
  };
};

// Get scheme category display name
export const getSchemeCategoryName = (category) => {
  const categoryNames = {
    agriculture: 'Agriculture',
    education: 'Education', 
    healthcare: 'Healthcare',
    employment: 'Employment',
    housing: 'Housing',
    social_welfare: 'Social Welfare',
    women_empowerment: 'Women Empowerment',
    senior_citizen: 'Senior Citizen',
    youth_development: 'Youth Development',
    rural_development: 'Rural Development',
    other: 'Other'
  };
  return categoryNames[category] || capitalize(category);
};

// Get target audience display name
export const getTargetAudienceName = (audience) => {
  const audienceNames = {
    farmers: 'Farmers',
    students: 'Students',
    women: 'Women',
    senior_citizens: 'Senior Citizens',
    youth: 'Youth',
    rural_population: 'Rural Population',
    urban_population: 'Urban Population',
    below_poverty_line: 'Below Poverty Line',
    scheduled_caste: 'Scheduled Caste',
    scheduled_tribe: 'Scheduled Tribe',
    other_backward_class: 'Other Backward Class',
    general: 'General'
  };
  return audienceNames[audience] || slugToTitle(audience);
};

// Copy text to clipboard
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  }
};

// Local storage helpers
export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error getting ${key} from localStorage:`, error);
      return defaultValue;
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error setting ${key} in localStorage:`, error);
      return false;
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing ${key} from localStorage:`, error);
      return false;
    }
  }
};