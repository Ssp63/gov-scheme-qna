const DocumentChunk = require('../models/DocumentChunk');
const aiService = require('./aiService');
const translationService = require('./translationService');

class SemanticSearchService {
  constructor() {
    this.defaultTopK = 5;
    this.minSimilarityScore = 0.3;
    this.maxResults = 10;
  }

  /**
   * Perform semantic search for relevant chunks based on user query
   * @param {string} query - User's search query
   * @param {string} schemeId - Optional scheme ID to limit search
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results with relevant chunks
   */
  async searchRelevantChunks(query, schemeId = null, options = {}) {
    try {
      console.log(`🔍 Starting semantic search for query: "${query}"${schemeId ? ` in scheme: ${schemeId}` : ''}`);
      
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return {
          success: false,
          error: 'Query is required and must be a non-empty string',
          results: []
        };
      }

      const {
        topK = this.defaultTopK,
        minSimilarityScore = this.minSimilarityScore,
        language = null,
        contentType = null,
        includeMetadata = true
      } = options;

      // Step 1: Translate query to English for better search
      const translatedQuery = await this.translateQueryToEnglish(query);
      console.log(`🔍 Original query: "${query}" → Translated: "${translatedQuery}"`);

      // Step 2: Generate embedding for the translated query
      const queryEmbedding = await this.generateQueryEmbedding(translatedQuery);
      if (!queryEmbedding) {
        throw new Error('Failed to generate query embedding');
      }

      console.log(`🧠 Generated query embedding with ${queryEmbedding.length} dimensions`);

      // Step 3: Build search filter
      const filter = {
        processingStatus: 'completed',
        'metadata.qualityScore': { $gte: 0.5 } // Only high-quality chunks
      };

      if (schemeId) {
        filter.schemeId = schemeId;
      }

      if (language) {
        filter['metadata.language'] = language;
      }

      if (contentType) {
        filter['metadata.contentType'] = contentType;
      }

      // Step 4: Get all relevant chunks from database
      const chunks = await DocumentChunk.find(filter)
        .select('content metadata embedding schemeId chunkId')
        .lean();

      if (!chunks || chunks.length === 0) {
        console.log('📭 No chunks found matching the filter criteria');
        return {
          success: true,
          query: query,
          results: [],
          totalChunks: 0,
          searchTime: 0
        };
      }

      console.log(`📊 Found ${chunks.length} chunks to evaluate`);

      // Step 5: Calculate similarity scores
      const chunksWithScores = await this.calculateSimilarityScores(chunks, queryEmbedding);

      // Step 6: Filter and sort results
      const filteredResults = chunksWithScores
        .filter(chunk => chunk.similarityScore >= minSimilarityScore)
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, topK);

      console.log(`✅ Found ${filteredResults.length} relevant chunks above similarity threshold`);

      // Step 7: Update usage statistics for retrieved chunks
      await this.updateUsageStatistics(filteredResults);

      // Step 8: Format results
      const formattedResults = filteredResults.map(chunk => ({
        chunkId: chunk.chunkId,
        content: chunk.content,
        similarityScore: chunk.similarityScore,
        metadata: includeMetadata ? {
          ...chunk.metadata,
          schemeId: chunk.schemeId
        } : undefined
      }));

      return {
        success: true,
        query: query,
        results: formattedResults,
        totalChunks: chunks.length,
        relevantChunks: filteredResults.length,
        searchTime: Date.now() - (options.startTime || Date.now()),
        searchParams: {
          schemeId: schemeId,
          topK: topK,
          minSimilarityScore: minSimilarityScore,
          language: language,
          contentType: contentType
        }
      };

    } catch (error) {
      console.error('❌ Semantic search failed:', error.message);
      return {
        success: false,
        error: error.message,
        query: query,
        results: []
      };
    }
  }

  /**
   * Translate query to English for better search
   * @param {string} query - Original query
   * @returns {Promise<string>} Translated query
   */
  async translateQueryToEnglish(query) {
    try {
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return query;
      }

      console.log(`🌐 Translating query to English: "${query}"`);
      
      // Use translation service to translate query to English
      const translatedQuery = await translationService.translateQueryToEnglish(query);
      
      console.log(`✅ Query translated: "${query}" → "${translatedQuery}"`);
      return translatedQuery;

    } catch (error) {
      console.error('❌ Query translation failed:', error.message);
      console.log('🔄 Using original query due to translation error');
      return query;
    }
  }

  /**
   * Generate embedding for a search query
   * @param {string} query - Search query
   * @returns {Promise<Array>} Query embedding vector
   */
  async generateQueryEmbedding(query) {
    try {
      // Use the same embedding model as chunks
      const embeddings = await aiService.generateEmbeddings([query]);
      
      if (!embeddings || embeddings.length === 0 || !embeddings[0].embedding) {
        throw new Error('Failed to generate query embedding');
      }

      return embeddings[0].embedding;
    } catch (error) {
      console.error('❌ Error generating query embedding:', error.message);
      throw error;
    }
  }

  /**
   * Calculate similarity scores between query and chunks
   * @param {Array} chunks - Array of chunks with embeddings
   * @param {Array} queryEmbedding - Query embedding vector
   * @returns {Promise<Array>} Chunks with similarity scores
   */
  async calculateSimilarityScores(chunks, queryEmbedding) {
    const chunksWithScores = [];

    for (const chunk of chunks) {
      try {
        if (!chunk.embedding || !Array.isArray(chunk.embedding)) {
          console.warn(`⚠️ Chunk ${chunk.chunkId} has invalid embedding, skipping`);
          continue;
        }

        const similarityScore = this.calculateCosineSimilarity(queryEmbedding, chunk.embedding);
        
        chunksWithScores.push({
          ...chunk,
          similarityScore: similarityScore
        });

      } catch (error) {
        console.warn(`⚠️ Error calculating similarity for chunk ${chunk.chunkId}:`, error.message);
        continue;
      }
    }

    return chunksWithScores;
  }

  /**
   * Calculate cosine similarity between two vectors with dimension compatibility
   * @param {Array} vectorA - First vector
   * @param {Array} vectorB - Second vector
   * @returns {number} Cosine similarity score (0-1)
   */
  calculateCosineSimilarity(vectorA, vectorB) {
    if (!vectorA || !vectorB || !Array.isArray(vectorA) || !Array.isArray(vectorB)) {
      return 0;
    }

    // Handle dimension mismatch by using fallback to Google embeddings for old chunks
    if (vectorA.length !== vectorB.length) {
      console.warn(`⚠️ Vector dimension mismatch: ${vectorA.length} vs ${vectorB.length}`);
      
      // If we have a new query (1536) vs old chunk (768), regenerate query with Google
      if (vectorA.length === 1536 && vectorB.length === 768) {
        console.log('🔄 Dimension mismatch detected - this chunk needs re-embedding with Azure');
        // For now, skip this chunk (return 0) - we'll add a re-embedding strategy later
        return 0;
      }
      
      // If both are different unexpected dimensions, skip
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      const a = vectorA[i];
      const b = vectorB[i];
      
      if (typeof a !== 'number' || typeof b !== 'number') {
        console.warn(`⚠️ Non-numeric values in vectors at index ${i}`);
        return 0;
      }

      dotProduct += a * b;
      normA += a * a;
      normB += b * b;
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Update usage statistics for retrieved chunks
   * @param {Array} chunks - Array of chunks with similarity scores
   */
  async updateUsageStatistics(chunks) {
    try {
      const updatePromises = chunks.map(chunk => {
        return DocumentChunk.findByIdAndUpdate(
          chunk._id,
          {
            $inc: { 'usageStats.retrievalCount': 1 },
            $set: { 'usageStats.lastRetrievedAt': new Date() },
            $set: {
              'usageStats.avgRelevanceScore': this.calculateRunningAverage(
                chunk.usageStats?.avgRelevanceScore || 0,
                chunk.usageStats?.retrievalCount || 0,
                chunk.similarityScore
              )
            }
          },
          { new: true }
        );
      });

      await Promise.all(updatePromises);
      console.log(`📊 Updated usage statistics for ${chunks.length} chunks`);

    } catch (error) {
      console.warn('⚠️ Failed to update usage statistics:', error.message);
    }
  }

  /**
   * Calculate running average for relevance scores
   * @param {number} currentAverage - Current average
   * @param {number} currentCount - Current count
   * @param {number} newValue - New value to add
   * @returns {number} New running average
   */
  calculateRunningAverage(currentAverage, currentCount, newValue) {
    if (currentCount === 0) {
      return newValue;
    }
    
    const totalSum = currentAverage * currentCount + newValue;
    return totalSum / (currentCount + 1);
  }

  /**
   * Search for chunks across multiple schemes
   * @param {string} query - Search query
   * @param {Array} schemeIds - Array of scheme IDs to search in
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results grouped by scheme
   */
  async searchAcrossSchemes(query, schemeIds, options = {}) {
    try {
      console.log(`🔍 Searching across ${schemeIds.length} schemes for: "${query}"`);

      const results = {};
      let totalResults = 0;

      for (const schemeId of schemeIds) {
        const schemeResults = await this.searchRelevantChunks(query, schemeId, options);
        
        if (schemeResults.success && schemeResults.results.length > 0) {
          results[schemeId] = schemeResults;
          totalResults += schemeResults.results.length;
        }
      }

      return {
        success: true,
        query: query,
        results: results,
        totalResults: totalResults,
        schemesSearched: schemeIds.length,
        schemesWithResults: Object.keys(results).length
      };

    } catch (error) {
      console.error('❌ Multi-scheme search failed:', error.message);
      return {
        success: false,
        error: error.message,
        query: query,
        results: {}
      };
    }
  }

  /**
   * Get search suggestions based on popular queries and chunk content
   * @param {string} partialQuery - Partial query string
   * @param {string} schemeId - Optional scheme ID
   * @param {number} limit - Number of suggestions to return
   * @returns {Promise<Array>} Array of search suggestions
   */
  async getSearchSuggestions(partialQuery, schemeId = null, limit = 5) {
    try {
      if (!partialQuery || partialQuery.trim().length < 2) {
        return [];
      }

      const filter = {
        processingStatus: 'completed',
        content: { $regex: partialQuery, $options: 'i' }
      };

      if (schemeId) {
        filter.schemeId = schemeId;
      }

      const chunks = await DocumentChunk.find(filter)
        .select('content metadata.keywords')
        .limit(limit * 2) // Get more to filter and select best ones
        .lean();

      // Extract unique keywords and phrases
      const suggestions = new Set();
      
      chunks.forEach(chunk => {
        // Add keywords from metadata
        if (chunk.metadata && chunk.metadata.keywords) {
          chunk.metadata.keywords.forEach(keyword => {
            if (keyword.toLowerCase().includes(partialQuery.toLowerCase())) {
              suggestions.add(keyword);
            }
          });
        }

        // Extract potential phrases from content
        const words = chunk.content.toLowerCase().split(/\s+/);
        for (let i = 0; i < words.length - 1; i++) {
          const phrase = `${words[i]} ${words[i + 1]}`;
          if (phrase.includes(partialQuery.toLowerCase())) {
            suggestions.add(phrase);
          }
        }
      });

      return Array.from(suggestions).slice(0, limit);

    } catch (error) {
      console.error('❌ Error getting search suggestions:', error.message);
      return [];
    }
  }

  /**
   * Get search analytics and statistics
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} Search analytics
   */
  async getSearchAnalytics(options = {}) {
    try {
      const {
        schemeId = null,
        timeRange = 30, // days
        limit = 10
      } = options;

      const filter = {
        'usageStats.lastRetrievedAt': {
          $gte: new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000)
        }
      };

      if (schemeId) {
        filter.schemeId = schemeId;
      }

      // Get most retrieved chunks
      const topChunks = await DocumentChunk.find(filter)
        .sort({ 'usageStats.retrievalCount': -1 })
        .limit(limit)
        .select('chunkId content metadata usageStats')
        .lean();

      // Get average relevance scores
      const avgRelevanceStats = await DocumentChunk.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            avgRelevanceScore: { $avg: '$usageStats.avgRelevanceScore' },
            totalRetrievals: { $sum: '$usageStats.retrievalCount' },
            uniqueChunks: { $sum: 1 }
          }
        }
      ]);

      return {
        success: true,
        analytics: {
          topRetrievedChunks: topChunks,
          averageRelevanceScore: avgRelevanceStats[0]?.avgRelevanceScore || 0,
          totalRetrievals: avgRelevanceStats[0]?.totalRetrievals || 0,
          uniqueChunksRetrieved: avgRelevanceStats[0]?.uniqueChunks || 0,
          timeRange: timeRange,
          schemeId: schemeId
        }
      };

    } catch (error) {
      console.error('❌ Error getting search analytics:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new SemanticSearchService();
