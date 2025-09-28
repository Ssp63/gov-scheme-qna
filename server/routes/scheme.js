const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { body } = require('express-validator');
const {
  getAllSchemes,
  getScheme,
  createScheme,
  updateScheme,
  deleteScheme,
  permanentDeleteScheme,
  restoreScheme,
  getAdminSchemes,
  getProcessingStatus,
  reprocessPDF,
  getSchemeChunks
} = require('../controllers/scheme');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/schemes/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `scheme-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Validation rules
const createSchemeValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('category')
    .isIn(['Education', 'Healthcare', 'Agriculture', 'Employment', 'Housing', 'Social Welfare', 'Business', 'Technology', 'Other'])
    .withMessage('Invalid category'),
  handleValidationErrors
];

const updateSchemeValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('category')
    .optional()
    .isIn(['Education', 'Healthcare', 'Agriculture', 'Employment', 'Housing', 'Social Welfare', 'Business', 'Technology', 'Other'])
    .withMessage('Invalid category'),
  handleValidationErrors
];

// Public routes for citizens
// @route   GET /api/schemes
// @desc    Get all active schemes for citizens
// @access  Public
router.get('/', getAllSchemes);

// Admin routes (these must come before /:id to avoid conflicts)
// @route   GET /api/schemes/admin/all
// @desc    Get all schemes for admin (including inactive)
// @access  Private (Admin)
router.get('/admin/all', authenticateToken, requireAdmin, getAdminSchemes);

// @route   POST /api/schemes
// @desc    Create new scheme (Admin only)
// @access  Private (Admin)
router.post('/', authenticateToken, requireAdmin, upload.single('pdfFile'), createSchemeValidation, createScheme);

// @route   PUT /api/schemes/:id
// @desc    Update scheme (Admin only)
// @access  Private (Admin)
router.put('/:id', authenticateToken, requireAdmin, upload.single('pdfFile'), updateSchemeValidation, updateScheme);

// @route   DELETE /api/schemes/:id
// @desc    Soft delete scheme (Admin only)
// @access  Private (Admin)
router.delete('/:id', authenticateToken, requireAdmin, deleteScheme);

// @route   DELETE /api/schemes/:id/permanent
// @desc    Permanently delete scheme (Admin only)
// @access  Private (Admin)
router.delete('/:id/permanent', authenticateToken, requireAdmin, permanentDeleteScheme);

// @route   POST /api/schemes/:id/restore
// @desc    Restore soft-deleted scheme (Admin only)
// @access  Private (Admin)
router.post('/:id/restore', authenticateToken, requireAdmin, restoreScheme);

// PDF Processing routes (Admin only)
// @route   GET /api/schemes/:id/processing-status
// @desc    Get PDF processing status for a scheme
// @access  Private (Admin)
router.get('/:id/processing-status', authenticateToken, requireAdmin, getProcessingStatus);

// @route   POST /api/schemes/:id/reprocess-pdf
// @desc    Reprocess PDF for a scheme
// @access  Private (Admin)
router.post('/:id/reprocess-pdf', authenticateToken, requireAdmin, reprocessPDF);

// @route   GET /api/schemes/:id/chunks
// @desc    Get chunks for a scheme
// @access  Private (Admin)
router.get('/:id/chunks', authenticateToken, requireAdmin, getSchemeChunks);

// @route   GET /api/schemes/:id
// @desc    Get single scheme details
// @access  Public
router.get('/:id', getScheme);

module.exports = router;