const DocumentChunk = require('../models/DocumentChunk');
const Scheme = require('../models/Scheme');
const aiService = require('./aiService');
const pdfExtractionService = require('./pdfExtractionService');
const textPreprocessingService = require('./textPreprocessingService');

class EmbeddingService {
  constructor() {
    this.batchSize = 10; // Process documents in batches
  }

  // Process all documents and generate embeddings (Legacy method - disabled for simplified setup)
  async processAllDocuments() {
    console.log('⚠️ Legacy document processing method is disabled in simplified setup');
    return {
      success: true,
      message: 'Legacy document processing is disabled. Use processPDFForScheme instead.',
      processedCount: 0,
      totalDocuments: 0
    };
  }

  // Process a single document (Legacy method - disabled for simplified setup)
  async processDocument(document) {
    console.log('⚠️ Legacy document processing method is disabled in simplified setup');
    return {
      success: false,
      error: 'Legacy document processing is disabled. Use processPDFForScheme instead.'
    };
  }

  // Get processing status (Legacy method - disabled for simplified setup)
  async getProcessingStatus() {
    console.log('⚠️ Legacy processing status method is disabled in simplified setup');
    return {
      success: true,
      status: {
        totalDocuments: 0,
        processedDocuments: 0,
        pendingDocuments: 0,
        completionPercentage: 0
      },
      recentActivity: []
    };
  }

  // Reprocess a specific document (Legacy method - disabled for simplified setup)
  async reprocessDocument(documentId) {
    console.log('⚠️ Legacy document reprocessing method is disabled in simplified setup');
    return {
      success: false,
      message: 'Legacy document reprocessing is disabled. Use reprocessPDF instead.',
      documentId: documentId
    };
  }

  // Process PDF file and create chunks with embeddings
  async processPDFForScheme(schemeId, pdfFilePath, options = {}) {
    try {
      console.log(`🔄 Processing PDF for scheme ${schemeId}: ${pdfFilePath}`);
      console.log(`📊 Processing options:`, options);
      
      // Get scheme information to include PDF URL in metadata
      const scheme = await Scheme.findById(schemeId);
      const pdfUrl = scheme?.pdfFile?.url || null;
      const pdfFilename = scheme?.pdfFile?.filename || null;
      
      console.log(`📋 Scheme info - Title: ${scheme?.title}, PDF URL: ${pdfUrl}`);
      
      // Step 1: Extract text from PDF
      let extractionResult = await pdfExtractionService.extractTextFromPDF(pdfFilePath, options);
      
      if (!extractionResult.success) {
        console.warn(`⚠️ PDF extraction failed, trying fallback extraction: ${extractionResult.error}`);
        
        // Try fallback extraction for problematic PDFs
        extractionResult = await pdfExtractionService.createFallbackExtraction(pdfFilePath, options);
        
        if (!extractionResult.success) {
          throw new Error(`PDF extraction failed completely: ${extractionResult.error}`);
        }
        
        console.log(`✅ Using fallback extraction for PDF`);
      }
      
      if (!extractionResult.text || extractionResult.text.trim().length === 0) {
        console.warn(`⚠️ No text content extracted, using fallback`);
        extractionResult = await pdfExtractionService.createFallbackExtraction(pdfFilePath, options);
        
        if (!extractionResult.success) {
          throw new Error('No text content could be extracted from PDF and fallback failed');
        }
      }
      
      console.log(`📄 PDF text extracted. Length: ${extractionResult.text.length} characters`);
      
      // Log extraction details for debugging
      if (extractionResult.warning) {
        console.warn(`⚠️ PDF extraction warning: ${extractionResult.warning}`);
      }
      
      if (extractionResult.metadata.fallbackExtraction) {
        console.log(`📋 Using fallback extraction for scheme ${schemeId}`);
      }
      
      // Step 2: Preprocess and chunk the text
      const chunks = await textPreprocessingService.preprocessAndChunk(extractionResult.text, options);
      
      if (!chunks || chunks.length === 0) {
        throw new Error('No chunks created from PDF text');
      }
      
      console.log(`📝 Text chunked into ${chunks.length} pieces`);
      
      // Step 3: Generate embeddings for each chunk
      const chunkTexts = chunks.map(chunk => chunk.content);
      const embeddings = await aiService.generateEmbeddings(chunkTexts);
      
      if (!embeddings || embeddings.length !== chunks.length) {
        throw new Error('Embedding generation failed or count mismatch');
      }
      
      console.log(`🧠 Generated ${embeddings.length} embeddings`);
      
      // Step 4: Create DocumentChunk records
      const documentChunks = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];
        
        const documentChunk = new DocumentChunk({
          schemeId: schemeId,
          chunkId: `${schemeId}_chunk_${i}`,
          content: chunk.content,
          metadata: {
            ...chunk.metadata,
            pageNumber: this.extractPageNumber(chunk.metadata.section, i),
            chunkIndex: i,
            // Add PDF URL information for frontend access
            url: pdfUrl,
            filename: pdfFilename,
            schemeTitle: scheme?.title || 'Government Scheme'
          },
          embedding: embedding.embedding,
          processingStatus: 'completed',
          processedAt: new Date()
        });
        
        documentChunks.push(documentChunk);
      }
      
      // Step 5: Save chunks to database
      await DocumentChunk.insertMany(documentChunks);
      
      console.log(`✅ Successfully processed PDF. Created ${documentChunks.length} chunks`);
      
      return {
        success: true,
        chunksCreated: documentChunks.length,
        totalWords: chunks.reduce((sum, chunk) => sum + chunk.metadata.wordCount, 0),
        totalChars: chunks.reduce((sum, chunk) => sum + chunk.metadata.charCount, 0),
        languageDistribution: this.getLanguageDistribution(chunks),
        processingTime: Date.now() - (options.startTime || Date.now())
      };
      
    } catch (error) {
      console.error(`❌ Error processing PDF for scheme ${schemeId}:`, error.message);
      
      // Clean up any partial chunks if they exist
      try {
        await DocumentChunk.deleteMany({ schemeId: schemeId });
      } catch (cleanupError) {
        console.warn('Failed to cleanup partial chunks:', cleanupError.message);
      }
      
      return {
        success: false,
        error: error.message,
        chunksCreated: 0
      };
    }
  }

  // Get chunks for a scheme with optional filtering
  async getChunksForScheme(schemeId, options = {}) {
    try {
      const {
        limit = 10,
        skip = 0,
        language = null,
        contentType = null,
        minQualityScore = 0.5
      } = options;
      
      const filter = { 
        schemeId: schemeId,
        processingStatus: 'completed',
        'metadata.qualityScore': { $gte: minQualityScore }
      };
      
      if (language) filter['metadata.language'] = language;
      if (contentType) filter['metadata.contentType'] = contentType;
      
      const chunks = await DocumentChunk.find(filter)
        .sort({ 'metadata.chunkIndex': 1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      return {
        success: true,
        chunks: chunks,
        total: await DocumentChunk.countDocuments(filter)
      };
      
    } catch (error) {
      console.error(`❌ Error getting chunks for scheme ${schemeId}:`, error.message);
      return {
        success: false,
        error: error.message,
        chunks: []
      };
    }
  }

  // Delete all chunks for a scheme
  async deleteChunksForScheme(schemeId) {
    try {
      const result = await DocumentChunk.deleteMany({ schemeId: schemeId });
      
      console.log(`🗑️ Deleted ${result.deletedCount} chunks for scheme ${schemeId}`);
      
      return {
        success: true,
        deletedCount: result.deletedCount
      };
      
    } catch (error) {
      console.error(`❌ Error deleting chunks for scheme ${schemeId}:`, error.message);
      return {
        success: false,
        error: error.message,
        deletedCount: 0
      };
    }
  }

  // Get processing status for a scheme
  async getSchemeProcessingStatus(schemeId) {
    try {
      const totalChunks = await DocumentChunk.countDocuments({ schemeId: schemeId });
      const completedChunks = await DocumentChunk.countDocuments({ 
        schemeId: schemeId, 
        processingStatus: 'completed' 
      });
      const pendingChunks = await DocumentChunk.countDocuments({ 
        schemeId: schemeId, 
        processingStatus: 'pending' 
      });
      const failedChunks = await DocumentChunk.countDocuments({ 
        schemeId: schemeId, 
        processingStatus: 'failed' 
      });
      
      return {
        success: true,
        status: {
          schemeId: schemeId,
          totalChunks: totalChunks,
          completedChunks: completedChunks,
          pendingChunks: pendingChunks,
          failedChunks: failedChunks,
          completionPercentage: totalChunks > 0 ? Math.round((completedChunks / totalChunks) * 100) : 0
        }
      };
      
    } catch (error) {
      console.error(`❌ Error getting processing status for scheme ${schemeId}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper method to extract page number from section or chunk index
  extractPageNumber(section, chunkIndex) {
    // Simple heuristic: assume each chunk represents roughly one page
    // In a real implementation, you might want to parse the PDF more carefully
    if (section && section.match(/\d+/)) {
      const match = section.match(/(\d+)/);
      return match ? parseInt(match[1]) : Math.floor(chunkIndex / 2) + 1;
    }
    return Math.floor(chunkIndex / 2) + 1;
  }

  // Helper method to get language distribution
  getLanguageDistribution(chunks) {
    const distribution = {};
    chunks.forEach(chunk => {
      const lang = chunk.metadata.language || 'unknown';
      distribution[lang] = (distribution[lang] || 0) + 1;
    });
    return distribution;
  }

  // Get embedding statistics
  async getEmbeddingStats() {
    try {
      // Get DocumentChunk statistics
      const chunkStats = await DocumentChunk.aggregate([
        {
          $group: {
            _id: null,
            totalChunks: { $sum: 1 },
            completedChunks: {
              $sum: {
                $cond: {
                  if: { $eq: ['$processingStatus', 'completed'] },
                  then: 1,
                  else: 0
                }
              }
            },
            totalSchemes: { $addToSet: '$schemeId' }
          }
        },
        {
          $project: {
            totalChunks: 1,
            completedChunks: 1,
            totalSchemes: { $size: '$totalSchemes' }
          }
        }
      ]);

      const chunkResult = chunkStats[0] || {
        totalChunks: 0,
        completedChunks: 0,
        totalSchemes: 0
      };

      return {
        success: true,
        stats: {
          // New chunk-based stats
          totalDocumentChunks: chunkResult.totalChunks,
          completedDocumentChunks: chunkResult.completedChunks,
          totalSchemesWithChunks: chunkResult.totalSchemes,
          chunkProcessingComplete: chunkResult.totalChunks === chunkResult.completedChunks,
          
          // Legacy stats (disabled in simplified setup)
          totalDocuments: 0,
          documentsWithEmbeddings: 0,
          processingComplete: true,
          averageChunksPerDocument: 0
        }
      };

    } catch (error) {
      console.error('❌ Error getting embedding stats:', error.message);
      throw new Error('Failed to get embedding statistics: ' + error.message);
    }
  }
}

module.exports = new EmbeddingService();