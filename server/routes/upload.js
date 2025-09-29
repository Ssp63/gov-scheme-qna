const express = require('express');
const router = express.Router();
const {
  uploadDocument,
  getProcessingStatus,
  deleteDocument,
  getAllDocuments
} = require('../controllers/upload');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { upload, handleMulterError } = require('../services/cloudStorage');

// @route   POST /api/upload/documents
// @desc    Upload scheme document
// @access  Private (Admin)
router.post('/documents', authenticateToken, requireAdmin, upload.single('document'), handleMulterError, uploadDocument);

// @route   GET /api/upload/status/:schemeId
// @desc    Get document processing status for a scheme
// @access  Private (Admin)
router.get('/status/:schemeId', authenticateToken, requireAdmin, getProcessingStatus);

// @route   DELETE /api/upload/documents/:documentId
// @desc    Delete document
// @access  Private (Admin)
router.delete('/documents/:documentId', authenticateToken, requireAdmin, deleteDocument);

// @route   GET /api/upload/documents
// @desc    Get all documents for admin
// @access  Private (Admin)
router.get('/documents', authenticateToken, requireAdmin, getAllDocuments);

// @route   GET /api/upload/documents/:documentId
// @desc    Get single document details
// @access  Private (Admin)
router.get('/documents/:documentId', authenticateToken, requireAdmin, (req, res) => {
  // For now, redirect to the processing status endpoint or implement if needed
  res.status(501).json({
    success: false,
    message: 'Single document endpoint not implemented yet'
  });
});

module.exports = router;