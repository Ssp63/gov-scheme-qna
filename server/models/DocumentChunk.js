const mongoose = require('mongoose');

const documentChunkSchema = new mongoose.Schema({
  // Reference to the scheme this chunk belongs to
  schemeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scheme',
    required: [true, 'Scheme ID is required'],
    index: true
  },
  
  // Unique identifier for this chunk within the scheme
  chunkId: {
    type: String,
    required: [true, 'Chunk ID is required'],
    index: true
  },
  
  // The actual text content of this chunk
  content: {
    type: String,
    required: [true, 'Content is required'],
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },
  
  // Metadata about this chunk
  metadata: {
    // Page number in the original PDF (if applicable)
    pageNumber: {
      type: Number,
      min: 1
    },
    
    // Section or heading this chunk belongs to
    section: {
      type: String,
      maxlength: [200, 'Section name cannot exceed 200 characters']
    },
    
    // Index of this chunk within the document
    chunkIndex: {
      type: Number,
      required: true,
      min: 0
    },
    
    // Word count of this chunk
    wordCount: {
      type: Number,
      required: true,
      min: 1
    },
    
    // Character count of this chunk
    charCount: {
      type: Number,
      required: true,
      min: 1
    },
    
    // Language of the content (en/mr)
    language: {
      type: String,
      enum: ['en', 'mr', 'mixed'],
      default: 'en'
    },
    
    // Type of content (paragraph, heading, list, table, etc.)
    contentType: {
      type: String,
      enum: ['paragraph', 'heading', 'list', 'table', 'mixed'],
      default: 'paragraph'
    },
    
    // Keywords extracted from this chunk
    keywords: [{
      type: String,
      maxlength: [50, 'Keyword cannot exceed 50 characters']
    }],
    
    // Confidence score for content quality (0-1)
    qualityScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.8
    }
  },
  
  // Vector embedding for semantic search
  embedding: {
    type: [Number],
    required: [true, 'Embedding is required'],
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length > 0 && v.every(val => typeof val === 'number' && !isNaN(val));
      },
      message: 'Embedding must be a non-empty array of valid numbers'
    }
  },
  
  // Processing status
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  
  // Error information if processing failed
  errorInfo: {
    type: String,
    maxlength: [500, 'Error info cannot exceed 500 characters']
  },
  
  // Processing timestamps
  processedAt: {
    type: Date
  },
  
  // Usage statistics
  usageStats: {
    // Number of times this chunk has been retrieved
    retrievalCount: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Last time this chunk was retrieved
    lastRetrievedAt: {
      type: Date
    },
    
    // Average relevance score when retrieved
    avgRelevanceScore: {
      type: Number,
      min: 0,
      max: 1
    }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
documentChunkSchema.index({ schemeId: 1, chunkIndex: 1 });
documentChunkSchema.index({ schemeId: 1, processingStatus: 1 });
documentChunkSchema.index({ 'metadata.language': 1 });
documentChunkSchema.index({ 'metadata.contentType': 1 });
documentChunkSchema.index({ 'usageStats.retrievalCount': -1 });

// Text search index for content
documentChunkSchema.index({ 
  content: 'text',
  'metadata.section': 'text',
  'metadata.keywords': 'text'
});

// Static method to get chunks for a scheme
documentChunkSchema.statics.getChunksForScheme = function(schemeId, options = {}) {
  const {
    limit = 10,
    skip = 0,
    language = null,
    contentType = null,
    processingStatus = 'completed'
  } = options;
  
  const filter = { schemeId, processingStatus };
  if (language) filter['metadata.language'] = language;
  if (contentType) filter['metadata.contentType'] = contentType;
  
  return this.find(filter)
    .sort({ 'metadata.chunkIndex': 1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// Static method to get chunks by relevance
documentChunkSchema.statics.getRelevantChunks = function(schemeId, queryEmbedding, options = {}) {
  const {
    limit = 5,
    minRelevanceScore = 0.3,
    language = null
  } = options;
  
  const filter = { 
    schemeId, 
    processingStatus: 'completed',
    'usageStats.avgRelevanceScore': { $gte: minRelevanceScore }
  };
  if (language) filter['metadata.language'] = language;
  
  return this.find(filter)
    .sort({ 'usageStats.avgRelevanceScore': -1 })
    .limit(limit)
    .lean();
};

// Instance method to update usage statistics
documentChunkSchema.methods.updateUsageStats = function(relevanceScore) {
  this.usageStats.retrievalCount += 1;
  this.usageStats.lastRetrievedAt = new Date();
  
  if (this.usageStats.avgRelevanceScore) {
    // Calculate running average
    const totalScore = this.usageStats.avgRelevanceScore * (this.usageStats.retrievalCount - 1) + relevanceScore;
    this.usageStats.avgRelevanceScore = totalScore / this.usageStats.retrievalCount;
  } else {
    this.usageStats.avgRelevanceScore = relevanceScore;
  }
  
  return this.save();
};

// Instance method to calculate similarity with another embedding
documentChunkSchema.methods.calculateSimilarity = function(queryEmbedding) {
  if (!this.embedding || !queryEmbedding) return 0;
  if (!Array.isArray(this.embedding) || !Array.isArray(queryEmbedding)) return 0;
  if (this.embedding.length !== queryEmbedding.length) return 0;
  
  // Calculate cosine similarity
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < this.embedding.length; i++) {
    const a = this.embedding[i];
    const b = queryEmbedding[i];
    
    // Skip invalid numbers
    if (isNaN(a) || isNaN(b)) continue;
    
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
};

// Instance method to validate embedding
documentChunkSchema.methods.validateEmbedding = function() {
  if (!this.embedding || !Array.isArray(this.embedding)) {
    return { valid: false, error: 'Embedding is not an array' };
  }
  
  if (this.embedding.length === 0) {
    return { valid: false, error: 'Embedding is empty' };
  }
  
  const invalidValues = this.embedding.filter(val => typeof val !== 'number' || isNaN(val));
  if (invalidValues.length > 0) {
    return { valid: false, error: `Found ${invalidValues.length} invalid values in embedding` };
  }
  
  return { valid: true };
};

module.exports = mongoose.model('DocumentChunk', documentChunkSchema);
