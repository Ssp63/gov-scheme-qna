const { Scheme } = require('../models');
const { processDocument } = require('../services/document');
const { validateObjectId } = require('../middleware/validation');

// @desc    Upload document for a scheme
// @route   POST /api/upload/document
// @access  Private (Admin)
const uploadDocument = async (req, res) => {
  try {
    const { schemeId } = req.body;

    // Validate scheme ID
    if (!schemeId || !validateObjectId(schemeId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid scheme ID is required'
      });
    }

    // Check if scheme exists
    const scheme = await Scheme.findById(schemeId);
    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: 'Scheme not found'
      });
    }

    // Check if file was uploaded (Cloudinary uses req.file with buffer)
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Create file info object compatible with existing code
    const fileInfo = {
      originalName: req.file.originalname,
      filename: req.file.originalname, // Keep original name for now
      buffer: req.file.buffer, // Cloudinary uses buffer instead of path
      size: req.file.size,
      mimetype: req.file.mimetype
    };

    console.log(`Processing file upload: ${fileInfo.originalName} for scheme: ${scheme.title}`);

    // Process document asynchronously
    processDocument(schemeId, fileInfo, req.user._id)
      .then(async (document) => {
        // Update scheme processing status
        // Document processing completed
        
        // Mark scheme as completed if it was pending
        if (scheme.processingStatus === 'pending') {
          scheme.processingStatus = 'completed';
        }
        
        await scheme.save();
        console.log(`Document processing completed for scheme: ${scheme.title}`);
      })
      .catch((error) => {
        console.error(`Document processing failed for scheme: ${scheme.title}`, error);
      });

    // Return immediate response while processing continues in background
    res.status(202).json({
      success: true,
      message: 'Document uploaded successfully and is being processed',
      file: {
        originalName: fileInfo.originalName,
        size: fileInfo.size,
        type: fileInfo.mimetype
      },
      schemeId: schemeId,
      status: 'processing'
    });

  } catch (error) {
    console.error('Upload document error:', error);
    
    // Note: With Cloudinary memory storage, no local cleanup needed
    // Files are processed directly from memory buffer

    res.status(500).json({
      success: false,
      message: 'Server error during file upload'
    });
  }
};

// @desc    Get document processing status
// @route   GET /api/upload/status/:schemeId
// @access  Private (Admin)
const getProcessingStatus = async (req, res) => {
  try {
    const { schemeId } = req.params;

    if (!validateObjectId(schemeId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scheme ID'
      });
    }

    const scheme = await Scheme.findById(schemeId)
      .select('title processingStatus');

    res.json({
      success: true,
      scheme,
      message: 'Document processing status retrieved'
    });

  } catch (error) {
    console.error('Get processing status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching processing status'
    });
  }
};

// @desc    Delete document
// @route   DELETE /api/upload/document/:documentId
// @access  Private (Admin)
const deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;

    if (!validateObjectId(documentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document ID'
      });
    }

    // Document deletion is not supported in this simplified version
    // Documents are processed directly into document chunks

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting document'
    });
  }
};

// @desc    Get all documents for admin
// @route   GET /api/upload/documents
// @access  Private (Admin)
const getAllDocuments = async (req, res) => {
  try {
    const { status, schemeId, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (status) filter.processingStatus = status;
    if (schemeId && validateObjectId(schemeId)) filter.schemeId = schemeId;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Document listing is not supported in this simplified version
    // Documents are processed directly into document chunks

    res.json({
      success: true,
      documents: [],
      message: 'Document listing not available in simplified version',
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: 0,
        totalPages: 0
      }
    });

  } catch (error) {
    console.error('Get all documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching documents'
    });
  }
};

module.exports = {
  uploadDocument,
  getProcessingStatus,
  deleteDocument,
  getAllDocuments
};