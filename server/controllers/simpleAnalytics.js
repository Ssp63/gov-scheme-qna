const AnalyticsSummary = require('../models/AnalyticsSummary');

// Get simple analytics overview
const getSimpleOverview = async (req, res) => {
  try {
    const summary = await AnalyticsSummary.getAnalyticsSummary();
    
    res.json({
      success: true,
      data: {
        overview: summary,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Error getting simple analytics overview:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics overview',
      error: error.message
    });
  }
};

// Reset analytics (for testing)
const resetAnalytics = async (req, res) => {
  try {
    await AnalyticsSummary.resetAll();
    
    res.json({
      success: true,
      message: 'Analytics data reset successfully'
    });
  } catch (error) {
    console.error('Error resetting analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting analytics',
      error: error.message
    });
  }
};

// Get analytics summary for debugging
const getAnalyticsSummary = async (req, res) => {
  try {
    const summary = await AnalyticsSummary.find().sort({ eventType: 1 });
    
    res.json({
      success: true,
      data: {
        summary,
        totalDocuments: summary.length
      }
    });
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics summary',
      error: error.message
    });
  }
};

// Update previous counts for trend calculation
const updatePreviousCounts = async (req, res) => {
  try {
    const result = await AnalyticsSummary.updatePreviousCounts();
    
    res.json({
      success: result.success,
      message: result.success ? 'Previous counts updated successfully' : 'Failed to update previous counts',
      data: result
    });
  } catch (error) {
    console.error('Error updating previous counts:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating previous counts',
      error: error.message
    });
  }
};

module.exports = {
  getSimpleOverview,
  resetAnalytics,
  getAnalyticsSummary,
  updatePreviousCounts
};
