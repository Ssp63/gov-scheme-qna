const { Scheme } = require('../models');
const { validateObjectId, sanitizeInput } = require('../middleware/validation');
const embeddingService = require('../services/embeddingService');
const path = require('path');

// @desc    Get all schemes for citizens (public)
// @route   GET /api/schemes
// @access  Public
const getAllSchemes = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;

    // Build filter object
    const filter = { isActive: true };

    if (category && category !== 'all') {
      filter.category = category;
    }

    // Text search if search query provided
    if (search) {
      const searchRegex = new RegExp(sanitizeInput(search), 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex }
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get schemes with pagination
    const schemes = await Scheme.find(filter)
      .select('title description category createdAt pdfFile')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination
    const total = await Scheme.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      schemes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Get schemes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching schemes'
    });
  }
};

// @desc    Get single scheme details
// @route   GET /api/schemes/:id
// @access  Public
const getScheme = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scheme ID'
      });
    }

    const scheme = await Scheme.findById(id)
      .populate('createdBy', 'name email department')
      .lean();

    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: 'Scheme not found'
      });
    }

    // Only show active schemes to public
    if (!scheme.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Scheme not available'
      });
    }

    res.json({
      success: true,
      scheme
    });

  } catch (error) {
    console.error('Get scheme error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching scheme'
    });
  }
};

// @desc    Create new scheme (Admin only)
// @route   POST /api/schemes
// @access  Private (Admin)
const createScheme = async (req, res) => {
  try {
    console.log('Create scheme request body:', req.body);
    console.log('Request file:', req.file);
    console.log('User from auth middleware:', req.user);
    
    const {
      title,
      description,
      category
    } = req.body;

    // Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and category are required'
      });
    }

    // Sanitize inputs
    const schemeData = {
      title: sanitizeInput(title.trim()),
      description: sanitizeInput(description.trim()),
      category: category.trim(),
      createdBy: req.user._id
    };

    // Add file information if uploaded
    if (req.file) {
      schemeData.pdfFile = {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        uploadDate: new Date()
      };
      console.log('File uploaded:', req.file.filename);
    }

    // Create new scheme
    const newScheme = new Scheme(schemeData);
    await newScheme.save();

    // Populate created by info
    await newScheme.populate('createdBy', 'name email');

    // Process PDF if uploaded (async, don't wait for completion)
    if (req.file && req.file.path) {
      console.log(`🔄 Starting PDF processing for scheme: ${newScheme._id}`);
      
      // Process PDF in background
      embeddingService.processPDFForScheme(newScheme._id, req.file.path, {
        startTime: Date.now(),
        chunkSize: 500,
        overlap: 50
      }).then(result => {
        if (result.success) {
          console.log(`✅ PDF processing completed for scheme ${newScheme._id}: ${result.chunksCreated} chunks created`);
        } else {
          console.error(`❌ PDF processing failed for scheme ${newScheme._id}: ${result.error}`);
        }
      }).catch(error => {
        console.error(`❌ PDF processing error for scheme ${newScheme._id}:`, error.message);
      });
    }

    res.status(201).json({
      success: true,
      message: 'Scheme created successfully',
      scheme: newScheme,
      pdfProcessing: req.file ? 'started' : 'none'
    });

  } catch (error) {
    console.error('Create scheme error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating scheme'
    });
  }
};

// @desc    Update scheme (Admin only)
// @route   PUT /api/schemes/:id
// @access  Private (Admin)
const updateScheme = async (req, res) => {
  try {
    console.log('Update scheme request:', req.params, req.body, req.file);
    const { id } = req.params;
    const { title, description, category } = req.body;

    // Validate ObjectId
    if (!validateObjectId(id)) {
      console.log('Invalid ObjectId:', id);
      return res.status(400).json({
        success: false,
        message: 'Invalid scheme ID'
      });
    }

    // Find scheme
    const scheme = await Scheme.findById(id);
    if (!scheme) {
      console.log('Scheme not found with ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Scheme not found'
      });
    }

    // Sanitize update data
    const updateData = {};
    if (title) updateData.title = sanitizeInput(title.trim());
    if (description) updateData.description = sanitizeInput(description.trim());
    if (category) updateData.category = category.trim();

    // Handle file update if uploaded
    if (req.file) {
      // Delete old PDF file if it exists
      if (scheme.pdfFile && scheme.pdfFile.filename) {
        try {
          const fs = require('fs').promises;
          const path = require('path');
          const oldFilePath = path.join(__dirname, '..', 'uploads', 'schemes', scheme.pdfFile.filename);
          await fs.unlink(oldFilePath);
          console.log(`🗑️ Deleted old PDF file: ${scheme.pdfFile.filename}`);
        } catch (fileError) {
          console.warn(`⚠️ Failed to delete old PDF file ${scheme.pdfFile.filename}:`, fileError.message);
        }
      }
      
      updateData.pdfFile = {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        uploadDate: new Date()
      };
    }

    // Update scheme
    console.log('Updating scheme with data:', updateData);
    const updatedScheme = await Scheme.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    // Process new PDF if uploaded (async, don't wait for completion)
    if (req.file && req.file.path) {
      console.log(`🔄 Starting PDF processing for updated scheme: ${id}`);
      
      // Delete existing chunks for this scheme
      await embeddingService.deleteChunksForScheme(id);
      
      // Process new PDF in background
      embeddingService.processPDFForScheme(id, req.file.path, {
        startTime: Date.now(),
        chunkSize: 500,
        overlap: 50
      }).then(result => {
        if (result.success) {
          console.log(`✅ PDF processing completed for updated scheme ${id}: ${result.chunksCreated} chunks created`);
        } else {
          console.error(`❌ PDF processing failed for updated scheme ${id}: ${result.error}`);
        }
      }).catch(error => {
        console.error(`❌ PDF processing error for updated scheme ${id}:`, error.message);
      });
    }

    console.log('Scheme updated successfully:', updatedScheme);
    res.json({
      success: true,
      message: 'Scheme updated successfully',
      scheme: updatedScheme,
      pdfProcessing: req.file ? 'started' : 'none'
    });

  } catch (error) {
    console.error('Update scheme error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating scheme'
    });
  }
};

// @desc    Delete scheme (Admin only)
// @route   DELETE /api/schemes/:id
// @access  Private (Admin)
const deleteScheme = async (req, res) => {
  try {
    console.log('Delete scheme request:', req.params);
    const { id } = req.params;

    // Validate ObjectId
    if (!validateObjectId(id)) {
      console.log('Invalid ObjectId for delete:', id);
      return res.status(400).json({
        success: false,
        message: 'Invalid scheme ID'
      });
    }

    // Find scheme
    const scheme = await Scheme.findById(id);
    if (!scheme) {
      console.log('Scheme not found for delete with ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Scheme not found'
      });
    }

    // Use soft delete method
    console.log('Deleting scheme:', scheme.title);
    const deletedScheme = await Scheme.softDelete(id, req.user._id);

    console.log('Scheme deleted successfully');
    res.json({
      success: true,
      message: 'Scheme deleted successfully'
    });

  } catch (error) {
    console.error('Delete scheme error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting scheme'
    });
  }
};

// @desc    Get all schemes for admin (including inactive)
// @route   GET /api/schemes/admin/all
// @access  Private (Admin)
const getAdminSchemes = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 10 } = req.query;

    // Build filter
    const filter = {};
    if (status) {
      if (status === 'active') filter.isActive = true;
      if (status === 'inactive') filter.isActive = false;
    }
    if (category && category !== 'all') filter.category = category;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const schemes = await Scheme.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Scheme.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      schemes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Get admin schemes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching schemes'
    });
  }
};

// @desc    Get PDF processing status for a scheme
// @route   GET /api/schemes/:id/processing-status
// @access  Private (Admin)
const getProcessingStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scheme ID'
      });
    }

    // Check if scheme exists
    const scheme = await Scheme.findById(id);
    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: 'Scheme not found'
      });
    }

    // Get processing status
    const status = await embeddingService.getSchemeProcessingStatus(id);

    res.json({
      success: true,
      schemeId: id,
      schemeTitle: scheme.title,
      ...status
    });

  } catch (error) {
    console.error('Get processing status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching processing status'
    });
  }
};

// @desc    Reprocess PDF for a scheme
// @route   POST /api/schemes/:id/reprocess-pdf
// @access  Private (Admin)
const reprocessPDF = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scheme ID'
      });
    }

    // Check if scheme exists and has PDF
    const scheme = await Scheme.findById(id);
    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: 'Scheme not found'
      });
    }

    if (!scheme.pdfFile || !scheme.pdfFile.path) {
      return res.status(400).json({
        success: false,
        message: 'No PDF file found for this scheme'
      });
    }

    // Delete existing chunks
    await embeddingService.deleteChunksForScheme(id);

    // Reprocess PDF
    const result = await embeddingService.processPDFForScheme(id, scheme.pdfFile.path, {
      startTime: Date.now(),
      chunkSize: 500,
      overlap: 50
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'PDF reprocessed successfully',
        schemeId: id,
        chunksCreated: result.chunksCreated,
        totalWords: result.totalWords,
        totalChars: result.totalChars,
        languageDistribution: result.languageDistribution
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to reprocess PDF',
        error: result.error
      });
    }

  } catch (error) {
    console.error('Reprocess PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while reprocessing PDF'
    });
  }
};

// @desc    Get chunks for a scheme
// @route   GET /api/schemes/:id/chunks
// @access  Private (Admin)
const getSchemeChunks = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, language, contentType } = req.query;

    // Validate ObjectId
    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scheme ID'
      });
    }

    // Check if scheme exists
    const scheme = await Scheme.findById(id);
    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: 'Scheme not found'
      });
    }

    // Get chunks
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const result = await embeddingService.getChunksForScheme(id, {
      limit: parseInt(limit),
      skip: skip,
      language: language,
      contentType: contentType
    });

    if (result.success) {
      res.json({
        success: true,
        schemeId: id,
        schemeTitle: scheme.title,
        chunks: result.chunks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.total,
          totalPages: Math.ceil(result.total / parseInt(limit))
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch chunks',
        error: result.error
      });
    }

  } catch (error) {
    console.error('Get scheme chunks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching chunks'
    });
  }
};

// @desc    Permanently delete scheme (Admin only)
// @route   DELETE /api/schemes/:id/permanent
// @access  Private (Admin)
const permanentDeleteScheme = async (req, res) => {
  try {
    console.log('Permanent delete scheme request:', req.params);
    const { id } = req.params;

    // Validate ObjectId
    if (!validateObjectId(id)) {
      console.log('Invalid ObjectId for permanent delete:', id);
      return res.status(400).json({
        success: false,
        message: 'Invalid scheme ID'
      });
    }

    // Check if scheme exists
    const scheme = await Scheme.findById(id);
    if (!scheme) {
      console.log('Scheme not found for permanent delete with ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Scheme not found'
      });
    }

    // Perform permanent delete
    console.log('Permanently deleting scheme:', scheme.title);
    const result = await Scheme.permanentDelete(id);

    console.log('Scheme permanently deleted successfully');
    res.json({
      success: true,
      message: 'Scheme permanently deleted successfully',
      deletedScheme: result.deletedScheme,
      deletedChunks: result.deletedChunks
    });

  } catch (error) {
    console.error('Permanent delete scheme error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while permanently deleting scheme'
    });
  }
};

// @desc    Restore soft-deleted scheme (Admin only)
// @route   POST /api/schemes/:id/restore
// @access  Private (Admin)
const restoreScheme = async (req, res) => {
  try {
    console.log('Restore scheme request:', req.params);
    const { id } = req.params;

    // Validate ObjectId
    if (!validateObjectId(id)) {
      console.log('Invalid ObjectId for restore:', id);
      return res.status(400).json({
        success: false,
        message: 'Invalid scheme ID'
      });
    }

    // Check if scheme exists
    const scheme = await Scheme.findById(id);
    if (!scheme) {
      console.log('Scheme not found for restore with ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Scheme not found'
      });
    }

    // Check if scheme is already active
    if (scheme.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Scheme is already active'
      });
    }

    // Restore scheme
    console.log('Restoring scheme:', scheme.title);
    const restoredScheme = await Scheme.restore(id);

    console.log('Scheme restored successfully');
    res.json({
      success: true,
      message: 'Scheme restored successfully',
      scheme: restoredScheme
    });

  } catch (error) {
    console.error('Restore scheme error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while restoring scheme'
    });
  }
};

module.exports = {
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
};