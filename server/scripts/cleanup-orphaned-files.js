#!/usr/bin/env node

/**
 * Script to clean up orphaned PDF files
 * Usage: node scripts/cleanup-orphaned-files.js [--dry-run] [--stats]
 */

const mongoose = require('mongoose');
const FileCleanupUtils = require('../utils/fileCleanup');
const connectDB = require('../config/database');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const showStats = args.includes('--stats');

async function main() {
  try {
    console.log('🚀 Starting orphaned file cleanup script...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');
    
    if (showStats) {
      console.log('\n📊 File Statistics:');
      const stats = await FileCleanupUtils.getFileStats();
      if (stats.success) {
        console.log('Uploads Directory:');
        console.log(`  Total files: ${stats.stats.uploadsDirectory.totalFiles}`);
        console.log(`  PDF files: ${stats.stats.uploadsDirectory.pdfFiles}`);
        console.log('\nDatabase:');
        console.log(`  Total schemes: ${stats.stats.database.totalSchemes}`);
        console.log(`  Active schemes: ${stats.stats.database.activeSchemes}`);
        console.log(`  Schemes with PDFs: ${stats.stats.database.schemesWithPdfs}`);
        console.log(`\nOrphaned files: ${stats.stats.orphanedFiles}`);
      } else {
        console.error('❌ Failed to get stats:', stats.error);
      }
    }
    
    if (isDryRun) {
      console.log('\n🔍 DRY RUN - No files will be deleted');
      const stats = await FileCleanupUtils.getFileStats();
      if (stats.success) {
        console.log(`Found ${stats.stats.orphanedFiles} orphaned files that would be deleted`);
      }
    } else {
      console.log('\n🧹 Cleaning up orphaned files...');
      const result = await FileCleanupUtils.cleanupOrphanedPDFs();
      
      if (result.success) {
        console.log(`\n✅ Cleanup completed successfully!`);
        console.log(`📊 Results:`);
        console.log(`  Orphaned files found: ${result.orphanedCount}`);
        console.log(`  Files deleted: ${result.deletedFiles.length}`);
        
        if (result.deletedFiles.length > 0) {
          console.log(`\n🗑️ Deleted files:`);
          result.deletedFiles.forEach(file => console.log(`  - ${file}`));
        }
        
        if (result.failedDeletions.length > 0) {
          console.log(`\n❌ Failed deletions:`);
          result.failedDeletions.forEach(failure => 
            console.log(`  - ${failure.file}: ${failure.error}`)
          );
        }
      } else {
        console.error('❌ Cleanup failed:', result.error);
        process.exit(1);
      }
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.disconnect();
    console.log('\n👋 Database connection closed');
  }
}

// Show usage information
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node scripts/cleanup-orphaned-files.js [options]

Options:
  --dry-run    Show what would be deleted without actually deleting
  --stats      Show file statistics
  --help, -h   Show this help message

Examples:
  node scripts/cleanup-orphaned-files.js --stats
  node scripts/cleanup-orphaned-files.js --dry-run
  node scripts/cleanup-orphaned-files.js
`);
  process.exit(0);
}

// Run the script
main();
