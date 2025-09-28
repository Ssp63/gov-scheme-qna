const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
const { Scheme } = require('../models');

/**
 * File cleanup utilities for managing orphaned files
 */
class FileCleanupUtils {
  
  /**
   * Clean up orphaned PDF files that don't have corresponding database records
   */
  static async cleanupOrphanedPDFs() {
    try {
      console.log('🧹 Starting orphaned PDF cleanup...');
      
      const uploadsDir = path.join(__dirname, '..', 'uploads', 'schemes');
      
      // Get all PDF files in uploads directory
      const files = await fs.readdir(uploadsDir);
      const pdfFiles = files.filter(file => file.endsWith('.pdf'));
      
      console.log(`📁 Found ${pdfFiles.length} PDF files in uploads directory`);
      
      // Get all scheme PDF filenames from database
      const schemes = await Scheme.find({}, 'pdfFile.filename');
      const dbPdfFilenames = schemes
        .map(scheme => scheme.pdfFile?.filename)
        .filter(filename => filename);
      
      console.log(`🗄️ Found ${dbPdfFilenames.length} PDF files referenced in database`);
      
      // Find orphaned files
      const orphanedFiles = pdfFiles.filter(file => !dbPdfFilenames.includes(file));
      
      console.log(`🗑️ Found ${orphanedFiles.length} orphaned PDF files`);
      
      if (orphanedFiles.length === 0) {
        console.log('✅ No orphaned files found');
        return {
          success: true,
          orphanedCount: 0,
          deletedFiles: [],
          message: 'No orphaned files found'
        };
      }
      
      // Delete orphaned files
      const deletedFiles = [];
      const failedDeletions = [];
      
      for (const file of orphanedFiles) {
        try {
          const filePath = path.join(uploadsDir, file);
          await fs.unlink(filePath);
          deletedFiles.push(file);
          console.log(`✅ Deleted orphaned file: ${file}`);
        } catch (error) {
          console.error(`❌ Failed to delete ${file}:`, error.message);
          failedDeletions.push({ file, error: error.message });
        }
      }
      
      console.log(`🧹 Cleanup complete: ${deletedFiles.length} files deleted, ${failedDeletions.length} failed`);
      
      return {
        success: true,
        orphanedCount: orphanedFiles.length,
        deletedFiles,
        failedDeletions,
        message: `Cleaned up ${deletedFiles.length} orphaned files`
      };
      
    } catch (error) {
      console.error('❌ Orphaned file cleanup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get statistics about uploads directory vs database
   */
  static async getFileStats() {
    try {
      const uploadsDir = path.join(__dirname, '..', 'uploads', 'schemes');
      
      // Count files in uploads directory
      const files = await fs.readdir(uploadsDir);
      const pdfFiles = files.filter(file => file.endsWith('.pdf'));
      
      // Count schemes in database
      const totalSchemes = await Scheme.countDocuments();
      const activeSchemes = await Scheme.countDocuments({ isActive: true });
      const schemesWithPdfs = await Scheme.countDocuments({ 
        'pdfFile.filename': { $exists: true, $ne: null } 
      });
      
      return {
        success: true,
        stats: {
          uploadsDirectory: {
            totalFiles: files.length,
            pdfFiles: pdfFiles.length
          },
          database: {
            totalSchemes,
            activeSchemes,
            schemesWithPdfs
          },
          orphanedFiles: pdfFiles.length - schemesWithPdfs
        }
      };
      
    } catch (error) {
      console.error('❌ Failed to get file stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Delete a specific PDF file safely
   */
  static async deletePDFFile(filename) {
    try {
      const uploadsDir = path.join(__dirname, '..', 'uploads', 'schemes');
      const filePath = path.join(uploadsDir, filename);
      
      // Check if file exists
      await fs.access(filePath);
      
      // Delete the file
      await fs.unlink(filePath);
      
      console.log(`✅ Deleted PDF file: ${filename}`);
      
      return {
        success: true,
        message: `File ${filename} deleted successfully`
      };
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          success: false,
          error: 'File not found'
        };
      }
      
      console.error(`❌ Failed to delete ${filename}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Clean up files for a specific scheme
   */
  static async cleanupSchemeFiles(schemeId) {
    try {
      const scheme = await Scheme.findById(schemeId);
      if (!scheme) {
        return {
          success: false,
          error: 'Scheme not found'
        };
      }
      
      if (!scheme.pdfFile || !scheme.pdfFile.filename) {
        return {
          success: true,
          message: 'No PDF file associated with this scheme'
        };
      }
      
      const result = await this.deletePDFFile(scheme.pdfFile.filename);
      
      if (result.success) {
        // Clear PDF file info from scheme
        scheme.pdfFile = undefined;
        await scheme.save();
        
        console.log(`✅ Cleaned up files for scheme: ${scheme.title}`);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Failed to cleanup scheme files:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = FileCleanupUtils;
