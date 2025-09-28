const mongoose = require('mongoose');
const { Scheme, DocumentChunk, User } = require('../models');

/**
 * Database utility functions for common operations
 */
class DatabaseUtils {
  
  /**
   * Clean up orphaned data
   */
  static async cleanupOrphanedData() {
    try {
      console.log('🧹 Starting database cleanup...');
      
      // Find schemes that don't exist
      const schemes = await Scheme.find({ isActive: true }).select('_id');
      const schemeIds = schemes.map(s => s._id);
      
      // Delete chunks for non-existent schemes
      const orphanedChunks = await DocumentChunk.deleteMany({
        schemeId: { $nin: schemeIds }
      });
      
      console.log(`🗑️ Cleaned up ${orphanedChunks.deletedCount} orphaned chunks`);
      
      return {
        success: true,
        orphanedChunks: orphanedChunks.deletedCount
      };
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get database statistics
   */
  static async getDatabaseStats() {
    try {
      const stats = {
        schemes: {
          total: await Scheme.countDocuments(),
          active: await Scheme.countDocuments({ isActive: true }),
          inactive: await Scheme.countDocuments({ isActive: false })
        },
        chunks: {
          total: await DocumentChunk.countDocuments(),
          completed: await DocumentChunk.countDocuments({ processingStatus: 'completed' }),
          pending: await DocumentChunk.countDocuments({ processingStatus: 'pending' }),
          failed: await DocumentChunk.countDocuments({ processingStatus: 'failed' })
        },
        users: {
          total: await User.countDocuments(),
          active: await User.countDocuments({ isActive: true }),
          admins: await User.countDocuments({ role: 'admin' }),
          superAdmins: await User.countDocuments({ role: 'super_admin' })
        }
      };
      
      return {
        success: true,
        stats,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Failed to get database stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Validate all embeddings in the database
   */
  static async validateEmbeddings() {
    try {
      console.log('🔍 Validating embeddings...');
      
      const chunks = await DocumentChunk.find({ processingStatus: 'completed' });
      const results = {
        total: chunks.length,
        valid: 0,
        invalid: 0,
        errors: []
      };
      
      for (const chunk of chunks) {
        const validation = chunk.validateEmbedding();
        if (validation.valid) {
          results.valid++;
        } else {
          results.invalid++;
          results.errors.push({
            chunkId: chunk.chunkId,
            schemeId: chunk.schemeId,
            error: validation.error
          });
        }
      }
      
      console.log(`✅ Validation complete: ${results.valid} valid, ${results.invalid} invalid`);
      
      return {
        success: true,
        results
      };
    } catch (error) {
      console.error('❌ Embedding validation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Rebuild indexes for better performance
   */
  static async rebuildIndexes() {
    try {
      console.log('🔧 Rebuilding database indexes...');
      
      // Rebuild indexes for all models
      await Scheme.collection.createIndexes();
      await DocumentChunk.collection.createIndexes();
      await User.collection.createIndexes();
      
      console.log('✅ Indexes rebuilt successfully');
      
      return {
        success: true,
        message: 'Indexes rebuilt successfully'
      };
    } catch (error) {
      console.error('❌ Index rebuild failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get scheme processing status
   */
  static async getSchemeProcessingStatus(schemeId) {
    try {
      const scheme = await Scheme.findById(schemeId);
      if (!scheme) {
        return {
          success: false,
          error: 'Scheme not found'
        };
      }
      
      const chunks = await DocumentChunk.find({ schemeId });
      const status = {
        totalChunks: chunks.length,
        completed: chunks.filter(c => c.processingStatus === 'completed').length,
        pending: chunks.filter(c => c.processingStatus === 'pending').length,
        processing: chunks.filter(c => c.processingStatus === 'processing').length,
        failed: chunks.filter(c => c.processingStatus === 'failed').length
      };
      
      return {
        success: true,
        schemeId,
        schemeTitle: scheme.title,
        status,
        isComplete: status.failed === 0 && status.pending === 0 && status.processing === 0
      };
    } catch (error) {
      console.error('❌ Failed to get processing status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = DatabaseUtils;
