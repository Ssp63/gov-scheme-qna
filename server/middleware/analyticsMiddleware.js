const AnalyticsSummary = require('../models/AnalyticsSummary');

// Middleware to track page views
const trackPageView = async (req, res, next) => {
  try {
    // Skip tracking for admin analytics pages to avoid recursion
    if (req.path.startsWith('/api/analytics')) {
      return next();
    }
    
    // Track page view
    await AnalyticsSummary.incrementEvent('page_view');
    console.log(`📊 Tracked: page_view for ${req.path}`);
    
    next();
  } catch (error) {
    console.error('Error in trackPageView middleware:', error);
    next(); // Continue even if tracking fails
  }
};

// Middleware to track scheme views
const trackSchemeView = async (req, res, next) => {
  try {
    // Skip tracking for admin analytics pages to avoid recursion
    if (req.path.startsWith('/api/analytics')) {
      return next();
    }
    
    // Track scheme view as page_view (since scheme views are also page views)
    await AnalyticsSummary.incrementEvent('page_view');
    console.log(`📊 Tracked: page_view for scheme ${req.params.id}`);
    
    next();
  } catch (error) {
    console.error('Error in trackSchemeView middleware:', error);
    next(); // Continue even if tracking fails
  }
};

module.exports = {
  trackPageView,
  trackSchemeView
};
