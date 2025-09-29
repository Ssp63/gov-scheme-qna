const express = require('express');
const router = express.Router();
const {
  getSimpleOverview,
  resetAnalytics,
  getAnalyticsSummary,
  updatePreviousCounts
} = require('../controllers/simpleAnalytics');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All analytics routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

// Get simple analytics overview
router.get('/overview', getSimpleOverview);

// Reset analytics (for testing)
router.post('/reset', resetAnalytics);

// Get analytics summary for debugging
router.get('/summary', getAnalyticsSummary);

// Update previous counts for trend calculation
router.post('/update-previous-counts', updatePreviousCounts);

module.exports = router;
