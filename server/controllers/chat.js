const Scheme = require('../models/Scheme');
const aiService = require('../services/aiService');
const semanticSearchService = require('../services/semanticSearchService');

class ChatController {
  // Ask a question about government schemes
  async askQuestion(req, res) {
    try {
      const { message, schemeId, language = 'en' } = req.body;
      const userId = req.user?.id || 'anonymous';

      console.log(`🤔 User asked: "${message}" about scheme: ${schemeId}`);

      if (!message || !message.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Question is required'
        });
      }

      // Get scheme details if schemeId is provided
      let scheme = null;
      if (schemeId) {
        try {
          scheme = await Scheme.findById(schemeId).lean();
        } catch (error) {
          console.error('Error fetching scheme:', error);
        }
      }

      // Prepare context for AI using RAG
      let context = [];
      
      // Add basic scheme information
      if (scheme) {
        context.push({
          text: `Scheme Title: ${scheme.title}\nCategory: ${scheme.category}\nDescription: ${scheme.description}`,
          score: 1.0,
          source: 'scheme_basic_info'
        });
      }

      // Perform semantic search to find relevant PDF chunks
      if (scheme) {
        try {
          console.log(`🔍 Performing semantic search for scheme: ${schemeId}`);
          
          const searchResults = await semanticSearchService.searchRelevantChunks(
            message,
            schemeId,
            {
              topK: 5,
              minSimilarityScore: 0.3,
              language: language,
              startTime: Date.now()
            }
          );

          if (searchResults.success && searchResults.results.length > 0) {
            console.log(`📚 Found ${searchResults.results.length} relevant chunks from PDF`);
            
            // Add PDF chunks to context
            searchResults.results.forEach((chunk, index) => {
              context.push({
                text: `PDF Content (Chunk ${index + 1}): ${chunk.content}`,
                score: chunk.similarityScore,
                source: 'pdf_chunk',
                metadata: chunk.metadata
              });
            });
          } else {
            console.log('📭 No relevant PDF chunks found for the query');
          }
        } catch (searchError) {
          console.warn('⚠️ Semantic search failed, continuing with basic context:', searchError.message);
        }
      }

      // Generate AI response
      let aiResponse;
      try {
        aiResponse = await aiService.generateResponse(
          message,
          context,
          language
        );
      } catch (error) {
        console.error('AI Service error:', error);
        // Fallback response
        aiResponse = {
          answer: 'I apologize, but I am currently unable to process your question. Please try again later or contact the relevant government office directly.',
          confidence: 0,
          sources: []
        };
      }

      // Chat storage removed - not needed for temporary users
      // System focuses on providing accurate responses using RAG

      // Prepare sources information
      const sources = context
        .filter(ctx => ctx.source === 'pdf_chunk')
        .map(ctx => ({
          type: 'pdf_chunk',
          relevanceScore: ctx.score,
          metadata: {
            ...ctx.metadata,
            schemeTitle: scheme ? scheme.title : 'Government Scheme',
            schemeId: scheme ? scheme._id : null,
            filename: scheme?.pdfFile?.filename || null
          }
        }));

      // Return response
      res.status(200).json({
        success: true,
        response: aiResponse.answer,
        confidence: aiResponse.confidence || 0,
        scheme: scheme ? {
          id: scheme._id,
          title: scheme.title,
          category: scheme.category
        } : null,
        sources: sources,
        contextUsed: {
          hasBasicInfo: context.some(ctx => ctx.source === 'scheme_basic_info'),
          hasPDFContent: sources.length > 0,
          totalSources: sources.length
        },
        timestamp: new Date()
      });

    } catch (error) {
      console.error('❌ Error in askQuestion:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to process question',
        error: error.message
      });
    }
  }

  // Chat history removed - not needed for temporary users
  async getChatHistory(req, res) {
    res.status(200).json({
      success: true,
      message: 'Chat history feature is disabled for public users',
      chats: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalChats: 0,
        hasMore: false
      }
    });
  }

  // Chat details removed - not needed for temporary users
  async getChatDetails(req, res) {
    res.status(404).json({
      success: false,
      message: 'Chat details feature is disabled for public users'
    });
  }

  // Chat search removed - not needed for temporary users
  async searchChats(req, res) {
    res.status(200).json({
      success: true,
      message: 'Chat search feature is disabled for public users',
      query: req.query.query || '',
      results: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalResults: 0,
        hasMore: false
      }
    });
  }

  // Get popular questions/topics
  async getPopularQuestions(req, res) {
    try {
      const { limit = 10 } = req.query;

      // Return some common government scheme questions
      const commonQuestions = [
        "What are the eligibility criteria for this scheme?",
        "How to apply for this scheme?",
        "What documents are required for application?",
        "What are the benefits provided by this scheme?",
        "What is the complete application process?",
        "Is there any application fee?",
        "How long does the approval process take?",
        "Who can I contact for help with application?",
        "What is the application deadline?",
        "Can I apply online or only offline?"
      ];

      res.status(200).json({
        success: true,
        message: 'Popular questions retrieved successfully',
        questions: commonQuestions.slice(0, limit)
      });

    } catch (error) {
      console.error('❌ Error getting popular questions:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve popular questions',
        error: error.message
      });
    }
  }

  // Search across all schemes using RAG
  async searchAllSchemes(req, res) {
    try {
      const { query, language = 'en', limit = 5 } = req.body;

      if (!query || !query.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      console.log(`🔍 Performing cross-scheme search for: "${query}"`);

      // Get all active schemes
      const schemes = await Scheme.find({ isActive: true })
        .select('_id title category')
        .lean();

      if (schemes.length === 0) {
        return res.status(200).json({
          success: true,
          query: query,
          results: [],
          totalSchemes: 0,
          message: 'No active schemes found'
        });
      }

      const schemeIds = schemes.map(scheme => scheme._id);

      // Perform semantic search across all schemes
      const searchResults = await semanticSearchService.searchAcrossSchemes(
        query,
        schemeIds,
        {
          topK: limit,
          minSimilarityScore: 0.3,
          language: language,
          startTime: Date.now()
        }
      );

      if (!searchResults.success) {
        throw new Error(searchResults.error);
      }

      // Format results with scheme information
      const formattedResults = {};
      Object.keys(searchResults.results).forEach(schemeId => {
        const scheme = schemes.find(s => s._id.toString() === schemeId);
        if (scheme) {
          formattedResults[schemeId] = {
            scheme: {
              id: scheme._id,
              title: scheme.title,
              category: scheme.category
            },
            chunks: searchResults.results[schemeId].results,
            totalChunks: searchResults.results[schemeId].results.length
          };
        }
      });

      res.status(200).json({
        success: true,
        query: query,
        results: formattedResults,
        totalSchemes: schemes.length,
        schemesWithResults: Object.keys(formattedResults).length,
        searchTime: searchResults.searchTime || 0
      });

    } catch (error) {
      console.error('❌ Error in searchAllSchemes:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to search across schemes',
        error: error.message
      });
    }
  }

  // Get search suggestions
  async getSearchSuggestions(req, res) {
    try {
      const { query, schemeId, limit = 5 } = req.query;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Query must be at least 2 characters long'
        });
      }

      const suggestions = await semanticSearchService.getSearchSuggestions(
        query,
        schemeId,
        parseInt(limit)
      );

      res.status(200).json({
        success: true,
        query: query,
        suggestions: suggestions
      });

    } catch (error) {
      console.error('❌ Error getting search suggestions:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to get search suggestions',
        error: error.message
      });
    }
  }

}

module.exports = new ChatController();