const { getGeminiModel } = require('../config/googleApis');
const translationService = require('./translationService');

class AIService {
  constructor() {
    this.model = null;
  }

  // Initialize Gemini model
  async initializeModel() {
    try {
      this.model = getGeminiModel('gemini-2.5-flash');
      console.log('✅ Gemini AI model initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Gemini model:', error.message);
      throw error;
    }
  }

  // Generate embeddings for text chunks
  async generateEmbeddings(textChunks) {
    try {
      if (!this.model) {
        await this.initializeModel();
      }

      const embeddings = [];
      
      // Use text-embedding-004 model for embeddings
      const embeddingModel = getGeminiModel('text-embedding-004');
      
      for (const chunk of textChunks) {
        const result = await embeddingModel.embedContent(chunk);
        embeddings.push({
          text: chunk,
          embedding: result.embedding.values,
          metadata: {
            length: chunk.length,
            timestamp: new Date()
          }
        });
      }

      return embeddings;
    } catch (error) {
      console.error('❌ Error generating embeddings:', error.message);
      console.log('ℹ️ Falling back to simulated embeddings for development...');
      
      // Fallback: Generate simulated embeddings for development
      return textChunks.map(chunk => ({
        text: chunk,
        embedding: Array.from({length: 768}, () => Math.random() - 0.5), // Simulated 768-dim embedding
        metadata: {
          length: chunk.length,
          timestamp: new Date(),
          simulated: true
        }
      }));
    }
  }

  // Generate AI response for user questions
  async generateResponse(question, relevantContext, language = 'en') {
    try {
      if (!this.model) {
        await this.initializeModel();
      }

      // Always generate response in English for consistency
      const prompt = this.buildPrompt(question, relevantContext, 'en');
      
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      
      // Refine the response to improve formatting and focus
      const refinedAnswer = this.refineResponse(response.text(), question, 'en');
      
      // Translate response to user's preferred language if needed
      const finalAnswer = await this.translateResponseToLanguage(refinedAnswer, language);
      
      return {
        answer: finalAnswer,
        confidence: this.calculateConfidence(relevantContext),
        sources: this.extractSources(relevantContext),
        language: language
      };
    } catch (error) {
      console.error('❌ Error generating AI response:', error.message);
      
      // Fallback response when AI service fails
      console.log('🔄 Using fallback response due to AI service error');
      const fallbackAnswer = this.generateFallbackResponse(question, relevantContext, 'en');
      const translatedFallback = await this.translateResponseToLanguage(fallbackAnswer, language);
      
      return {
        answer: translatedFallback,
        confidence: 0.3,
        sources: this.extractSources(relevantContext),
        language: language
      };
    }
  }

  // Translate response to user's preferred language
  async translateResponseToLanguage(response, targetLanguage) {
    try {
      if (!response || typeof response !== 'string' || response.trim().length === 0) {
        return response;
      }

      if (targetLanguage === 'en') {
        console.log('💬 Response is already in English, no translation needed');
        return response;
      }

      console.log(`💬 Translating response to ${targetLanguage}`);
      const translatedResponse = await translationService.translateResponseToLanguage(response, targetLanguage);
      
      console.log(`✅ Response translated: ${response.length} → ${translatedResponse.length} chars`);
      return translatedResponse;

    } catch (error) {
      console.error('❌ Response translation failed:', error.message);
      console.log('🔄 Using original response due to translation error');
      return response;
    }
  }

  // Generate fallback response when AI service is unavailable
  generateFallbackResponse(question, relevantContext, language) {
    const languageText = language === 'mr' ? 'मराठी' : 'English';
    
    if (relevantContext && relevantContext.length > 0) {
      // Use the most relevant context as a simple answer
      const bestContext = relevantContext.reduce((best, current) => 
        (current.score || 0) > (best.score || 0) ? current : best
      );
      
      return `Based on the available information about government schemes, here's what I found:\n\n${bestContext.text.substring(0, 500)}...\n\nNote: This is a simplified response. For more detailed information, please contact the relevant government office directly.`;
    } else {
      return `I apologize, but I'm currently unable to process your question about government schemes. Please try again later or contact the relevant government office directly for assistance.`;
    }
  }

  // Refine response to improve formatting and focus
  refineResponse(response, question, language) {
    try {
      let refined = response;

      // First, identify and preserve important content for highlighting
      const importantKeywords = [
        'benefit', 'eligibility', 'required', 'document', 'fee', 'cost', 'deadline',
        'amount', 'percentage', 'age', 'income', 'criteria', 'process', 'step',
        'contact', 'helpline', 'website', 'office', 'address', 'phone', 'email'
      ];

      // Add highlighting to important details while preserving structure
      importantKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b(${keyword}s?)\\b`, 'gi');
        refined = refined.replace(regex, '**$1**');
      });

      // Clean up markdown formatting issues while preserving important formatting
      refined = refined
        .replace(/\*\*\*\*/g, '**') // Convert quadruple asterisks to double
        .replace(/###/g, '') // Remove triple hashes
        .replace(/##/g, '') // Remove double hashes
        .replace(/#/g, '') // Remove single hashes
        .replace(/```/g, '') // Remove code blocks
        .replace(/`/g, ''); // Remove backticks

      // Improve bullet point formatting with proper indentation
      refined = refined
        .replace(/^[\s]*[-•]\s*/gm, '\n- ') // Ensure proper bullet point formatting with line breaks
        .replace(/\n\s*[-•]\s*/g, '\n- '); // Standardize all bullet points

      // Clean up extra whitespace while preserving structure
      refined = refined
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace multiple newlines with double newlines
        .replace(/^\s+|\s+$/g, '') // Trim whitespace
        .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
        .replace(/\n\s+/g, '\n'); // Remove leading spaces from lines

      // Ensure proper spacing around bullet points
      refined = refined
        .replace(/\n-\s*/g, '\n- ') // Ensure consistent spacing after bullets
        .replace(/\n\n-\s*/g, '\n\n- '); // Ensure proper spacing before bullet lists

      // Limit response length based on question type
      const questionType = this.analyzeQuestionType(question);
      const maxLength = this.getMaxResponseLength(questionType);
      
      if (refined.length > maxLength) {
        // Truncate at sentence boundary, preserving bullet points
        const sentences = refined.split(/[.!?]+/);
        let truncated = '';
        for (const sentence of sentences) {
          if ((truncated + sentence).length <= maxLength) {
            truncated += sentence + '.';
          } else {
            break;
          }
        }
        refined = truncated || refined.substring(0, maxLength) + '...';
      }

      return refined;
    } catch (error) {
      console.warn('⚠️ Response refinement failed, using original response:', error.message);
      return response;
    }
  }

  // Get maximum response length based on question type
  getMaxResponseLength(questionType) {
    const limits = {
      benefits: 800,
      eligibility: 600,
      application: 1000,
      documents: 500,
      fees: 300,
      contact: 400,
      timeline: 400,
      general: 1200
    };
    
    return limits[questionType] || 1000;
  }

  // Build comprehensive prompt for AI
  buildPrompt(question, context, language) {
    const languageInstruction = language === 'mr' ? 
      'Please respond in Marathi language.' : 
      'Please respond in English language.';

    // Analyze question type to tailor response
    const questionType = this.analyzeQuestionType(question);
    const responseGuidelines = this.getResponseGuidelines(questionType, language);

    return `
You are a helpful government scheme assistant for Indian citizens. Your role is to provide accurate, helpful, and easy-to-understand information about government schemes and programs.

Context Information:
${context.map((ctx, index) => `[Source ${index + 1}]: ${ctx.text}`).join('\n\n')}

User Question: ${question}
Question Type: ${questionType}

Instructions:
1. ${languageInstruction}
2. Provide accurate information based only on the context provided
3. If the answer is not in the context, clearly state that you don't have that specific information
4. Be helpful and explain things in simple terms
5. ${responseGuidelines}
6. Format your response with proper structure:
   - Use bullet points with dashes (-) for lists
   - Each bullet point should be on a new line with proper indentation
   - Use line breaks to separate different sections
   - Highlight important details like amounts, deadlines, requirements
7. Structure your response as follows:
   - Start with a brief introduction if needed
   - Use bullet points for main information
   - End with any additional important details
8. Keep responses concise and focused on what the user specifically asked
9. If the question is about a specific aspect (like benefits, eligibility, etc.), focus only on that aspect
10. Make sure bullet points are properly formatted with line breaks and indentation

Please provide a helpful and well-formatted answer:`;
  }

  // Analyze the type of question being asked
  analyzeQuestionType(question) {
    const questionLower = question.toLowerCase();
    
    if (questionLower.includes('benefit') || questionLower.includes('advantage') || questionLower.includes('what do i get')) {
      return 'benefits';
    } else if (questionLower.includes('eligib') || questionLower.includes('who can apply') || questionLower.includes('qualif')) {
      return 'eligibility';
    } else if (questionLower.includes('how to apply') || questionLower.includes('application process') || questionLower.includes('apply')) {
      return 'application';
    } else if (questionLower.includes('document') || questionLower.includes('required') || questionLower.includes('need')) {
      return 'documents';
    } else if (questionLower.includes('fee') || questionLower.includes('cost') || questionLower.includes('charge')) {
      return 'fees';
    } else if (questionLower.includes('contact') || questionLower.includes('help') || questionLower.includes('support')) {
      return 'contact';
    } else if (questionLower.includes('deadline') || questionLower.includes('last date') || questionLower.includes('when')) {
      return 'timeline';
    } else if (questionLower.includes('what is') || questionLower.includes('explain') || questionLower.includes('about')) {
      return 'general';
    } else {
      return 'general';
    }
  }

  // Get response guidelines based on question type
  getResponseGuidelines(questionType, language) {
    const guidelines = {
      benefits: 'Focus specifically on the benefits, advantages, and what users will receive from the scheme. List them clearly and concisely.',
      eligibility: 'Focus on who can apply, age requirements, income criteria, and other eligibility conditions. Be specific about requirements.',
      application: 'Focus on the step-by-step application process, where to apply, and how to apply. Include any online/offline options.',
      documents: 'Focus on the specific documents required for application. List them clearly and mention any format requirements.',
      fees: 'Focus on application fees, processing charges, and any other costs involved. Mention if the scheme is free.',
      contact: 'Focus on contact information, helpline numbers, office addresses, and where to get help.',
      timeline: 'Focus on important dates, deadlines, processing time, and duration of the scheme.',
      general: 'Provide a comprehensive overview of the scheme, including its purpose, key features, and main benefits.'
    };

    return guidelines[questionType] || guidelines.general;
  }

  // Calculate confidence score based on context relevance
  calculateConfidence(context) {
    if (!context || context.length === 0) return 0;
    
    // Simple confidence calculation based on context length and sources
    const avgLength = context.reduce((sum, ctx) => sum + ctx.text.length, 0) / context.length;
    const sourceCount = context.length;
    
    let confidence = Math.min(0.9, (avgLength / 1000) * 0.3 + (sourceCount / 5) * 0.7);
    return Math.round(confidence * 100) / 100;
  }

  // Extract source information
  extractSources(context) {
    return context.map((ctx, index) => ({
      id: index + 1,
      snippet: ctx.text.substring(0, 150) + (ctx.text.length > 150 ? '...' : ''),
      relevance: ctx.score || 0.5
    }));
  }

  // Semantic search using embeddings (simplified cosine similarity)
  async semanticSearch(queryEmbedding, documentEmbeddings, topK = 5) {
    try {
      const similarities = documentEmbeddings.map(doc => ({
        ...doc,
        score: this.cosineSimilarity(queryEmbedding, doc.embedding)
      }));

      // Sort by similarity score and return top K results
      return similarities
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    } catch (error) {
      console.error('❌ Error in semantic search:', error.message);
      throw new Error('Failed to perform semantic search: ' + error.message);
    }
  }

  // Calculate cosine similarity between two vectors
  cosineSimilarity(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
}

module.exports = new AIService();