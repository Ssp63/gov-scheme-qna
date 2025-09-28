const mongoose = require('mongoose');

const schemeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Scheme title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Scheme description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Scheme category is required'],
    enum: [
      'Education',
      'Healthcare', 
      'Agriculture', 
      'Employment', 
      'Housing', 
      'Social Welfare',
      'Business',
      'Technology',
      'Other'
    ],
    default: 'Other'
  },
  // PDF file information
  pdfFile: {
    originalName: {
      type: String
    },
    filename: {
      type: String
    },
    path: {
      type: String
    },
    size: {
      type: Number
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Add audit fields
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better performance
schemeSchema.index({ title: 'text', description: 'text' });
schemeSchema.index({ category: 1 });
schemeSchema.index({ isActive: 1 });
schemeSchema.index({ createdBy: 1 });
schemeSchema.index({ createdAt: -1 });

// Middleware to handle cascade delete
schemeSchema.pre('findOneAndUpdate', async function(next) {
  const update = this.getUpdate();
  
  // If scheme is being soft deleted, also delete related chunks
  if (update.isActive === false) {
    const schemeId = this.getQuery()._id;
    if (schemeId) {
      try {
        const DocumentChunk = mongoose.model('DocumentChunk');
        await DocumentChunk.deleteMany({ schemeId: schemeId });
        console.log(`🗑️ Deleted chunks for scheme: ${schemeId}`);
      } catch (error) {
        console.error('Error deleting chunks:', error);
      }
    }
  }
  
  next();
});

// Static method to soft delete scheme
schemeSchema.statics.softDelete = async function(schemeId, deletedBy) {
  return this.findByIdAndUpdate(
    schemeId,
    {
      isActive: false,
      deletedAt: new Date(),
      deletedBy: deletedBy
    },
    { new: true }
  );
};

// Static method to restore scheme
schemeSchema.statics.restore = async function(schemeId) {
  return this.findByIdAndUpdate(
    schemeId,
    {
      isActive: true,
      $unset: { deletedAt: 1, deletedBy: 1 }
    },
    { new: true }
  );
};

// Static method to permanently delete scheme
schemeSchema.statics.permanentDelete = async function(schemeId) {
  try {
    // Get scheme info before deletion for file cleanup
    const scheme = await this.findById(schemeId);
    if (!scheme) {
      throw new Error('Scheme not found');
    }
    
    // First delete all related document chunks
    const DocumentChunk = mongoose.model('DocumentChunk');
    const deletedChunks = await DocumentChunk.deleteMany({ schemeId: schemeId });
    console.log(`🗑️ Deleted ${deletedChunks.deletedCount} chunks for scheme: ${schemeId}`);
    
    // Delete PDF file if it exists
    let deletedFile = null;
    if (scheme.pdfFile && scheme.pdfFile.filename) {
      try {
        const fs = require('fs').promises;
        const path = require('path');
        const filePath = path.join(__dirname, '..', 'uploads', 'schemes', scheme.pdfFile.filename);
        await fs.unlink(filePath);
        deletedFile = scheme.pdfFile.filename;
        console.log(`🗑️ Deleted PDF file: ${deletedFile}`);
      } catch (fileError) {
        console.warn(`⚠️ Failed to delete PDF file ${scheme.pdfFile.filename}:`, fileError.message);
      }
    }
    
    // Then delete the scheme itself
    const deletedScheme = await this.findByIdAndDelete(schemeId);
    
    console.log(`🗑️ Permanently deleted scheme: ${deletedScheme.title}`);
    
    return {
      success: true,
      deletedScheme,
      deletedChunks: deletedChunks.deletedCount,
      deletedFile
    };
  } catch (error) {
    console.error('Error in permanent delete:', error);
    throw error;
  }
};

// Static method to cleanup PDF file for a scheme
schemeSchema.statics.cleanupPDFFile = async function(schemeId) {
  try {
    const scheme = await this.findById(schemeId);
    if (!scheme) {
      throw new Error('Scheme not found');
    }
    
    if (!scheme.pdfFile || !scheme.pdfFile.filename) {
      return {
        success: true,
        message: 'No PDF file associated with this scheme'
      };
    }
    
    const fs = require('fs').promises;
    const path = require('path');
    const filePath = path.join(__dirname, '..', 'uploads', 'schemes', scheme.pdfFile.filename);
    
    try {
      await fs.unlink(filePath);
      console.log(`🗑️ Deleted PDF file: ${scheme.pdfFile.filename}`);
      
      // Clear PDF file info from scheme
      scheme.pdfFile = undefined;
      await scheme.save();
      
      return {
        success: true,
        deletedFile: scheme.pdfFile.filename,
        message: 'PDF file deleted successfully'
      };
    } catch (fileError) {
      console.warn(`⚠️ Failed to delete PDF file ${scheme.pdfFile.filename}:`, fileError.message);
      return {
        success: false,
        error: fileError.message
      };
    }
  } catch (error) {
    console.error('Error in PDF file cleanup:', error);
    throw error;
  }
};

module.exports = mongoose.model('Scheme', schemeSchema);