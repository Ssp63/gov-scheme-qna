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

    // File info is added by upload middleware
    const fileInfo = req.fileInfo;
    
    if (!fileInfo) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log(`Processing file upload: ${fileInfo.originalName} for scheme: ${scheme.title}`);

    // Process document asynchronously
    processDocument(schemeId, fileInfo, req.user._id)
      .then(async (document) => {
        // Update scheme document count
        const documentCount = await require('../models').Document.countDocuments({ 
          schemeId, 
          processingStatus: 'completed' 
        });
        scheme.documentCount = documentCount;
        
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
    
    // Clean up uploaded file on error
    if (req.fileInfo && req.fileInfo.path) {
      const { deleteFile } = require('../middleware/upload');
      deleteFile(req.fileInfo.path);
    }

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

    const documents = await require('../models').Document.find({ schemeId })
      .select('originalFileName processingStatus processingLog totalChunks createdAt')
      .sort({ createdAt: -1 });

    const scheme = await Scheme.findById(schemeId)
      .select('title processingStatus documentCount');

    res.json({
      success: true,
      scheme,
      documents
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

    const document = await require('../models').Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Delete physical file
    const { deleteFile } = require('../middleware/upload');
    deleteFile(document.filePath);

    // Delete document from database
    await require('../models').Document.findByIdAndDelete(documentId);

    // Update scheme document count
    const scheme = await Scheme.findById(document.schemeId);
    if (scheme) {
      const documentCount = await require('../models').Document.countDocuments({ 
        schemeId: document.schemeId, 
        processingStatus: 'completed' 
      });
      scheme.documentCount = documentCount;
      await scheme.save();
    }

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

    const documents = await require('../models').Document.find(filter)
      .populate('schemeId', 'title titleMarathi')
      .populate('uploadedBy', 'name email')
      .select('originalFileName fileType fileSize processingStatus totalChunks createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await require('../models').Document.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      documents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
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