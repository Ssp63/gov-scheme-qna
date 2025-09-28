const express = require('express');
const router = express.Router();
const {
  uploadDocument,
  getProcessingStatus,
  deleteDocument,
  getAllDocuments
} = require('../controllers/upload');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { handleFileUpload } = require('../middleware/upload');

// @route   POST /api/upload/document
// @desc    Upload scheme document
// @access  Private (Admin)
router.post('/document', authenticateToken, requireAdmin, handleFileUpload, uploadDocument);

// @route   GET /api/upload/status/:schemeId
// @desc    Get document processing status for a scheme
// @access  Private (Admin)
router.get('/status/:schemeId', authenticateToken, requireAdmin, getProcessingStatus);

// @route   DELETE /api/upload/document/:documentId
// @desc    Delete document
// @access  Private (Admin)
router.delete('/document/:documentId', authenticateToken, requireAdmin, deleteDocument);

// @route   GET /api/upload/documents
// @desc    Get all documents for admin
// @access  Private (Admin)
router.get('/documents', authenticateToken, requireAdmin, getAllDocuments);

module.exports = router;