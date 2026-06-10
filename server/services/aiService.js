const { getGeminiModel } = require('../config/googleApis');
const translationService = require('./translationService');
const azureEmbeddingService = require('./azureEmbeddingService');

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

  // Generate embeddings for text chunks with hybrid Azure/Google approach
  async generateEmbeddings(textChunks, maxRetries = 3) {
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Strategy 1: Try Azure OpenAI first (more reliable)
    try {
      console.log('🔵 Attempting Azure OpenAI embeddings...');
      const azureResult = await azureEmbeddingService.generateEmbeddings(textChunks, 2);
      
      if (azureResult && azureResult.length > 0) {
        console.log('✅ Azure OpenAI embeddings generated successfully');
        return azureResult;
      }
    } catch (azureError) {
      console.warn('⚠️ Azure OpenAI embedding failed, falling back to Google Gemini:', azureError.message);
    }
    
    // Strategy 2: Fallback to Google Gemini
    console.log('🟡 Falling back to Google Gemini embeddings...');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.model) {
          await this.initializeModel();
        }

        console.log(`🧠 Attempting Google embeddings (attempt ${attempt}/${maxRetries})`);
        console.log(`📊 Processing ${textChunks.length} text chunks`);
        
        const embeddings = [];
        
        // Try text-embedding-004 model first, with fallback to embedding-001
        let embeddingModel;
        let modelName = 'text-embedding-004';
        
        try {
          embeddingModel = getGeminiModel('text-embedding-004');
        } catch (modelError) {
          console.warn(`⚠️ Failed to get text-embedding-004 model, trying alternatives: ${modelError.message}`);
          
          // Try alternative embedding models
          try {
            embeddingModel = getGeminiModel('embedding-001');
            modelName = 'embedding-001';
            console.log('🔄 Using embedding-001 as alternative model');
          } catch (altError) {
            throw new Error(`Failed to initialize any embedding model: ${altError.message}`);
          }
        }
        
        // Process chunks with rate limiting to avoid overwhelming the API
        for (let i = 0; i < textChunks.length; i++) {
          const chunk = textChunks[i];
          
          try {
            const result = await embeddingModel.embedContent(chunk);
            embeddings.push({
              text: chunk,
              embedding: result.embedding.values,
              metadata: {
                length: chunk.length,
                timestamp: new Date(),
                model: modelName,
                provider: 'google'
              }
            });
            
            // Add small delay between requests to avoid rate limiting
            if (i < textChunks.length - 1) {
              await delay(200); // 200ms delay between requests
            }
            
          } catch (chunkError) {
            console.error(`❌ Error processing chunk ${i + 1}/${textChunks.length}:`, chunkError.message);
            
            // If individual chunk fails, try once more with longer delay
            await delay(1000);
            try {
              const retryResult = await embeddingModel.embedContent(chunk);
              embeddings.push({
                text: chunk,
                embedding: retryResult.embedding.values,
                metadata: {
                  length: chunk.length,
                  timestamp: new Date(),
                  model: modelName,
                  provider: 'google',
                  retried: true
                }
              });
            } catch (retryError) {
              console.error(`❌ Chunk ${i + 1} failed even after retry, skipping:`, retryError.message);
              // Continue with other chunks instead of failing completely
            }
          }
        }

        if (embeddings.length > 0) {
          console.log(`✅ Successfully generated ${embeddings.length} Google embeddings`);
          return embeddings;
        } else {
          throw new Error('No embeddings were generated');
        }
        
      } catch (error) {
        console.error(`❌ Google embedding error (attempt ${attempt}/${maxRetries}):`, error.message);
        
        // Check if it's a 503 service unavailable error
        if (error.message.includes('503') || error.message.includes('Service Unavailable')) {
          if (attempt < maxRetries) {
            const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
            console.log(`⏳ Waiting ${waitTime}ms before retry...`);
            await delay(waitTime);
            continue;
          }
        } else if (attempt < maxRetries) {
          await delay(1000);
          continue;
        }
      }
    }
    
    // Strategy 3: Final fallback to simulated embeddings (development only)
    console.warn('⚠️ Both Azure and Google embedding services failed. Using simulated embeddings for development...');
    
    return textChunks.map(chunk => ({
      text: chunk,
      embedding: Array.from({length: 1536}, () => Math.random() - 0.5), // Match Azure dimensions
      metadata: {
        length: chunk.length,
        timestamp: new Date(),
        simulated: true,
        provider: 'fallback',
        note: 'Both Azure and Google services unavailable'
      }
    }));
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
      
      const isGoogleServerError = error.message.includes('503') || error.message.includes('Service Unavailable');
      
      if (isGoogleServerError) {
        console.log('🔄 Using fallback response due to Google Gemini server issues (503 Service Unavailable)');
      } else {
        console.log('🔄 Using fallback response due to AI service error');
      }
      
      const fallbackAnswer = this.generateFallbackResponse(question, relevantContext, 'en', isGoogleServerError);
      const translatedFallback = await this.translateResponseToLanguage(fallbackAnswer, language);
      
      return {
        answer: translatedFallback,
        confidence: 0.3,
        sources: this.extractSources(relevantContext),
        language: language,
        googleServerError: isGoogleServerError
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
  generateFallbackResponse(question, relevantContext, language, isGoogleServerError = false) {
    const serverErrorNote = isGoogleServerError
      ? ' I am having a bit of trouble connecting right now due to a temporary issue on the server side. Please try again in a few minutes and it should work fine!'
      : '';

    if (relevantContext && relevantContext.length > 0) {
      const bestContext = relevantContext.reduce((best, current) =>
        (current.score || 0) > (best.score || 0) ? current : best
      );
      const snippet = bestContext.text.substring(0, 400).trim();
      return `Sure! Here is what I found for you based on the scheme information:\n\n${snippet}\n\nIf you need more details, your local government office or the scheme helpline will be happy to help you further.${serverErrorNote}`;
    } else {
      return `Hmm, I could not find specific information about that right now. It is best to check directly with your local government office or the official helpline for this scheme — they will guide you properly.${serverErrorNote}`;
    }
  }

  // Clean the AI response — preserve **bold**, strip all other markdown noise
  refineResponse(response, question, language) {
    try {
      let refined = response;

      // Remove headings (#, ##, ###)
      refined = refined.replace(/#{1,6}\s*/g, '');

      // Remove fenced code blocks and inline backticks
      refined = refined.replace(/```[\s\S]*?```/g, '').replace(/`/g, '');

      // Remove strikethrough but keep text
      refined = refined.replace(/~~(.*?)~~/g, '$1');

      // Remove markdown links but keep label
      refined = refined.replace(/\[(.*?)\]\(.*?\)/g, '$1');

      // Convert "- bullet" lines → plain text on its own line (keep the text, remove dash)
      refined = refined.replace(/^[ \t]*[-•]\s+/gm, '');

      // Collapse triple+ asterisks → double (keep bold)
      refined = refined.replace(/\*{3,}(.*?)\*{3,}/g, '**$1**');

      // Remove lone single asterisks not part of **bold**
      refined = refined.replace(/(?<!\*)\*(?!\*)/g, '');

      // Normalise line endings: \r\n → \n
      refined = refined.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      // Collapse 3+ newlines → exactly two (one blank line = paragraph break)
      refined = refined.replace(/\n{3,}/g, '\n\n');

      // Collapse multiple spaces/tabs on a single line
      refined = refined.replace(/[ \t]+/g, ' ');

      // Remove leading spaces at start of each line
      refined = refined.replace(/\n /g, '\n');

      refined = refined.trim();

      // ── Paragraph splitting ─────────────────────────────────────────
      // Gemini sometimes puts paragraph breaks as single \n instead of \n\n.
      // Treat any line that ends a sentence (. ! ?) followed by a \n
      // and then a capital letter as a paragraph boundary.
      refined = refined.replace(/([.!?])\n(?=[A-Z\u0900-\u097F])/g, '$1\n\n');

      // If still no paragraph breaks and text is long, split at sentence boundaries
      const hasParagraphBreaks = /\n\n/.test(refined);
      if (!hasParagraphBreaks && refined.length > 280) {
        // Match sentences ending with . ! ? (handles English + avoids splitting decimals)
        const sentences = refined.match(/[^.!?]+(?:[.!?]+(?!\s*[a-z])[^.!?]*)?[.!?]+/g)
          || refined.match(/[^.!?]+[.!?]+/g)
          || [];

        if (sentences.length >= 5) {
          const third = Math.ceil(sentences.length / 3);
          refined = [
            sentences.slice(0, third).join(' ').trim(),
            sentences.slice(third, third * 2).join(' ').trim(),
            sentences.slice(third * 2).join(' ').trim()
          ].filter(Boolean).join('\n\n');
        } else if (sentences.length >= 3) {
          const half = Math.ceil(sentences.length / 2);
          refined = [
            sentences.slice(0, half).join(' ').trim(),
            sentences.slice(half).join(' ').trim()
          ].filter(Boolean).join('\n\n');
        }
      }

      // ── Length truncation (must happen AFTER paragraph splitting) ───
      // Truncate by paragraph so we never cut mid-sentence and never
      // destroy the \n\n structure by joining with spaces.
      const questionType = this.analyzeQuestionType(question);
      const maxLength = this.getMaxResponseLength(questionType);

      if (refined.length > maxLength) {
        const paras = refined.split('\n\n');
        let truncated = '';
        for (const para of paras) {
          if ((truncated ? truncated + '\n\n' : '') .length + para.length <= maxLength) {
            truncated = truncated ? truncated + '\n\n' + para : para;
          } else {
            // Try to fit at least part of this paragraph sentence-by-sentence
            const sentences = para.match(/[^.!?]+[.!?]+/g) || [];
            for (const s of sentences) {
              if ((truncated + ' ' + s).length <= maxLength) {
                truncated = truncated ? truncated + ' ' + s.trim() : s.trim();
              } else break;
            }
            break;
          }
        }
        refined = (truncated || refined.substring(0, maxLength)).trim();
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
      benefits:     900,
      eligibility:  800,
      application:  1100,
      documents:    700,
      fees:         500,
      contact:      600,
      timeline:     600,
      general:      1300
    };
    return limits[questionType] || 1100;
  }

  // Build conversational, human-like prompt for AI
  buildPrompt(question, context, language) {
    const languageInstruction = language === 'mr' ?
      'Respond entirely in Marathi language, in a warm conversational tone.' :
      'Respond in clear, friendly English.';

    const questionType = this.analyzeQuestionType(question);
    const responseGuidelines = this.getResponseGuidelines(questionType, language);

    return `You are a friendly and knowledgeable local government scheme helper — like a helpful friend at the gram panchayat office who genuinely wants citizens to get their benefits.

Context from official scheme documents:
${context.map((ctx, index) => `[Source ${index + 1}]: ${ctx.text}`).join('\n\n')}

Citizen's question: ${question}

How to respond:
1. ${languageInstruction}
2. Write like a warm, helpful human being — NOT like a government document or AI report.
3. Always split your response into 2 to 3 short paragraphs separated by a blank line. Each paragraph should cover one idea (e.g. first paragraph: what the scheme is or the direct answer; second paragraph: eligibility or key details; third paragraph: how to apply or a closing note). Never write everything as one long single paragraph. Write in full sentences — do NOT use bullet dashes (-) or numbered lists.
4. Use **double asterisks** ONLY around genuinely important pieces of information — such as specific amounts (like **₹50,000**), key dates or deadlines, scheme names, important eligibility numbers (like **18 to 55 years**), or critical action words (like **apply online**). Do NOT bold every other word — use it sparingly so it stands out.
5. Do NOT use #, ##, ###, backticks, or any other markdown symbols — only **bold** where truly needed.
6. ${responseGuidelines}
7. Only use information from the context provided. If something is not mentioned, say so honestly and warmly.
8. Keep the answer focused and helpful — no unnecessary padding.
9. End with a short, warm sentence inviting further questions.

Write your response now:`;
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

  // Get response guidelines based on question type — all conversational
  getResponseGuidelines(questionType, language) {
    const guidelines = {
      benefits: 'Tell the person warmly what they will get from this scheme — like you are genuinely excited to share good news with them. Describe the benefits in plain sentences.',
      eligibility: 'Explain in a friendly way who can apply and what the conditions are. If there are multiple criteria, describe them naturally in sentences rather than a list.',
      application: 'Walk the person through how to apply as if you are guiding a friend step by step. Keep the language simple and encouraging.',
      documents: 'Tell them what documents they will need in a natural, helpful way — like reminding a friend what to bring before they head to the office.',
      fees: 'Let them know clearly and reassuringly about any fees or whether it is free. Be direct and friendly.',
      contact: 'Share the contact details in a warm way, and encourage them to reach out if they need more help.',
      timeline: 'Explain dates and timelines in plain, clear language — help them understand what to expect and when.',
      general: 'Give a friendly, easy-to-understand overview of the scheme — explain what it is, who it helps, and why it matters in simple words.'
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