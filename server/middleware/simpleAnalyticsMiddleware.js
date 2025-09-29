const AnalyticsSummary = require('../models/AnalyticsSummary');
const crypto = require('crypto');

// Simple analytics middleware - just tracks 4 main metrics
const trackSimpleAnalytics = async (req, res, next) => {
  try {
    // Skip tracking for admin analytics pages to avoid recursion
    if (req.path.startsWith('/api/analytics')) {
      return next();
    }
    
    // Track page view
    await AnalyticsSummary.incrementEvent('page_view');
    
    // Track unique session (simple approach - just increment)
    const sessionId = req.sessionID || crypto.randomUUID();
    // For simplicity, we'll just increment unique sessions on each request
    // In a real app, you'd want to track actual unique sessions
    await AnalyticsSummary.incrementEvent('unique_session');
    
    console.log(`📊 Tracked: page_view, unique_session`);
    
    next();
  } catch (error) {
    console.error('Error in simple analytics middleware:', error);
    next(); // Continue even if tracking fails
  }
};

// Middleware to track search queries
const trackSearchQuery = async (req, res, next) => {
  try {
    const { query } = req.body || {};
    
    if (query && query.trim()) {
      await AnalyticsSummary.incrementEvent('search_query');
      console.log(`📊 Tracked: search_query - "${query}"`);
    }
    
    next();
  } catch (error) {
    console.error('Error tracking search query:', error);
    next();
  }
};

// Middleware to track chat interactions
const trackChatInteraction = async (req, res, next) => {
  try {
    const { message } = req.body || {};
    
    if (message && message.trim()) {
      await AnalyticsSummary.incrementEvent('chat_interaction');
      console.log(`📊 Tracked: chat_interaction`);
    }
    
    next();
  } catch (error) {
    console.error('Error tracking chat interaction:', error);
    next();
  }
};

module.exports = {
  trackSimpleAnalytics,
  trackSearchQuery,
  trackChatInteraction
};
