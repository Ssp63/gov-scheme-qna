const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat');
const { authenticateToken } = require('../middleware/auth');
const { trackSearchQuery, trackChatInteraction } = require('../middleware/simpleAnalyticsMiddleware');

// Middleware to add start time for performance tracking and extended timeout for AI processing
router.use((req, res, next) => {
  req.startTime = Date.now();
  // Set extended timeout for AI processing (2 minutes)
  req.setTimeout(120000);
  res.setTimeout(120000);
  next();
});

// @route   POST /api/chat/ask
// @desc    Ask a question about government schemes
// @access  Public
router.post('/ask', trackChatInteraction, (req, res, next) => {
  // Optional authentication - if token exists, decode it, otherwise continue as anonymous
  if (req.headers.authorization) {
    authenticateToken(req, res, next);
  } else {
    req.user = null; // Anonymous user
    next();
  }
}, chatController.askQuestion);

// @route   GET /api/chat/history
// @desc    Get chat history for authenticated user
// @access  Private
router.get('/history', authenticateToken, chatController.getChatHistory);

// @route   GET /api/chat/:chatId
// @desc    Get details of a specific chat
// @access  Private
router.get('/:chatId', authenticateToken, chatController.getChatDetails);

// @route   GET /api/chat/search/query
// @desc    Search through chat history
// @access  Private
router.get('/search/query', authenticateToken, chatController.searchChats);

// @route   GET /api/chat/popular/questions
// @desc    Get popular questions/topics
// @access  Public
router.get('/popular/questions', chatController.getPopularQuestions);

// @route   POST /api/chat/search/all-schemes
// @desc    Search across all schemes using RAG
// @access  Public
router.post('/search/all-schemes', trackSearchQuery, chatController.searchAllSchemes);

// @route   GET /api/chat/search/suggestions
// @desc    Get search suggestions
// @access  Public
router.get('/search/suggestions', chatController.getSearchSuggestions);

module.exports = router;