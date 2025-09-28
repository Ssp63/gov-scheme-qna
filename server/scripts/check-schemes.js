#!/usr/bin/env node

/**
 * Comprehensive script to check schemes in the database
 * Based on the Scheme data model with all fields
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Scheme, User } = require('../models');

// Load environment variables
dotenv.config();

async function checkSchemes() {
  try {
    console.log('🔍 Checking schemes in database...');
    
    // Connect to database using the same method as the server
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    // Get comprehensive scheme counts
    const totalSchemes = await Scheme.countDocuments();
    const activeSchemes = await Scheme.countDocuments({ isActive: true });
    const inactiveSchemes = await Scheme.countDocuments({ isActive: false });
    const schemesWithPdfs = await Scheme.countDocuments({ 
      'pdfFile.filename': { $exists: true, $ne: null } 
    });
    const schemesWithoutPdfs = await Scheme.countDocuments({ 
      $or: [
        { 'pdfFile.filename': { $exists: false } },
        { 'pdfFile.filename': null }
      ]
    });
    
    // Get category breakdown
    const categoryStats = await Scheme.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get recent schemes (last 10)
    const recentSchemes = await Scheme.find({})
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role')
      .populate('deletedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log('\n📊 Comprehensive Scheme Statistics:');
    console.log(`  Total schemes: ${totalSchemes}`);
    console.log(`  Active schemes: ${activeSchemes}`);
    console.log(`  Inactive schemes: ${inactiveSchemes}`);
    console.log(`  Schemes with PDFs: ${schemesWithPdfs}`);
    console.log(`  Schemes without PDFs: ${schemesWithoutPdfs}`);
    
    if (categoryStats.length > 0) {
      console.log('\n📈 Category Breakdown:');
      categoryStats.forEach(cat => {
        const status = cat.active > 0 ? '✅' : '❌';
        console.log(`  ${cat._id}: ${cat.count} total (${cat.active} active) ${status}`);
      });
    }
    
    if (totalSchemes > 0) {
      console.log('\n📋 Recent Schemes (Last 10):');
      recentSchemes.forEach((scheme, index) => {
        const status = scheme.isActive ? '✅ Active' : '❌ Inactive';
        const pdfStatus = scheme.pdfFile?.filename ? `📄 ${scheme.pdfFile.filename}` : '📄 No PDF';
        const createdBy = scheme.createdBy ? `${scheme.createdBy.name} (${scheme.createdBy.email})` : 'Unknown';
        const deletedInfo = scheme.deletedAt ? ` | Deleted: ${new Date(scheme.deletedAt).toLocaleDateString()}` : '';
        
        console.log(`\n  ${index + 1}. ${scheme.title}`);
        console.log(`     Status: ${status} | Category: ${scheme.category}`);
        console.log(`     PDF: ${pdfStatus}`);
        console.log(`     Created by: ${createdBy}`);
        console.log(`     Created: ${new Date(scheme.createdAt).toLocaleDateString()}${deletedInfo}`);
        
        if (scheme.description && scheme.description.length > 100) {
          console.log(`     Description: ${scheme.description.substring(0, 100)}...`);
        } else if (scheme.description) {
          console.log(`     Description: ${scheme.description}`);
        }
      });
      
      // Show PDF file details
      const schemesWithPdfDetails = recentSchemes.filter(s => s.pdfFile?.filename);
      if (schemesWithPdfDetails.length > 0) {
        console.log('\n📄 PDF File Details:');
        schemesWithPdfDetails.forEach(scheme => {
          const pdf = scheme.pdfFile;
          const sizeKB = Math.round(pdf.size / 1024);
          console.log(`  ${scheme.title}:`);
          console.log(`    File: ${pdf.filename}`);
          console.log(`    Original: ${pdf.originalName}`);
          console.log(`    Size: ${sizeKB} KB`);
          console.log(`    Uploaded: ${new Date(pdf.uploadDate).toLocaleDateString()}`);
        });
      }
      
    } else {
      console.log('\n📭 No schemes found in database');
    }
    
    // Check for orphaned files
    const fs = require('fs').promises;
    const path = require('path');
    try {
      const uploadsDir = path.join(__dirname, '..', 'uploads', 'schemes');
      const files = await fs.readdir(uploadsDir);
      const pdfFiles = files.filter(file => file.endsWith('.pdf'));
      
      if (pdfFiles.length > 0) {
        console.log(`\n⚠️  Found ${pdfFiles.length} PDF files in uploads directory:`);
        pdfFiles.forEach(file => console.log(`    - ${file}`));
        console.log('    These might be orphaned files if no schemes reference them.');
      } else {
        console.log('\n✅ No PDF files found in uploads directory');
      }
    } catch (error) {
      console.log('\n📁 Could not check uploads directory:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error checking schemes:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.disconnect();
    console.log('\n👋 Database connection closed');
  }
}

// Run the check
checkSchemes();
