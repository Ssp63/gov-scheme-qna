const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  login,
  register,
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  forgotPassword,
  resetPassword,
  verifyEmail
} = require('../controllers/auth');
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// Validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department name cannot exceed 100 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'super_admin'])
    .withMessage('Role must be either admin or super_admin'),
  handleValidationErrors
];

const profileUpdateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department name cannot exceed 100 characters'),
  handleValidationErrors
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  handleValidationErrors
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  handleValidationErrors
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  handleValidationErrors
];

// @route   POST /api/auth/login
// @desc    Admin login
// @access  Public
router.post('/login', loginValidation, login);

// @route   POST /api/auth/register
// @desc    Register new admin (Super Admin only)
// @access  Private (Super Admin)
router.post('/register', authenticateToken, requireSuperAdmin, registerValidation, register);

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticateToken, getProfile);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, profileUpdateValidation, updateProfile);

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', authenticateToken, changePasswordValidation, changePassword);

// @route   POST /api/auth/verify-token
// @desc    Verify if token is valid
// @access  Private
router.post('/verify-token', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    user: req.user
  });
});

// @route   GET /api/auth/users
// @desc    Get all users (Super Admin only)
// @access  Private (Super Admin)
router.get('/users', authenticateToken, requireSuperAdmin, getAllUsers);

// @route   GET /api/auth/users/:id
// @desc    Get user by ID (Super Admin only)
// @access  Private (Super Admin)
router.get('/users/:id', authenticateToken, requireSuperAdmin, getUserById);

// @route   PUT /api/auth/users/:id
// @desc    Update user (Super Admin only)
// @access  Private (Super Admin)
router.put('/users/:id', authenticateToken, requireSuperAdmin, updateUser);

// @route   DELETE /api/auth/users/:id
// @desc    Delete user (Super Admin only)
// @access  Private (Super Admin)
router.delete('/users/:id', authenticateToken, requireSuperAdmin, deleteUser);

// @route   POST /api/auth/forgot-password
// @desc    Forgot password - send reset email
// @access  Public
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', resetPasswordValidation, resetPassword);

// @route   GET /api/auth/verify-email/:email
// @desc    Verify if email exists
// @access  Public
router.get('/verify-email/:email', verifyEmail);

module.exports = router;