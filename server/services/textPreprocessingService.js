const natural = require('natural');

class TextPreprocessingService {
  constructor() {
    // Initialize tokenizers
    this.wordTokenizer = new natural.WordTokenizer();
    this.sentenceTokenizer = new natural.SentenceTokenizer();
    
    // Default chunking parameters
    this.defaultChunkSize = 500; // words per chunk
    this.defaultOverlap = 50;    // words overlap between chunks
    this.minChunkSize = 50;      // minimum words per chunk
    this.maxChunkSize = 1000;    // maximum words per chunk
    
    // Language detection patterns
    this.marathiPatterns = [
      /[\u0900-\u097F]/g,  // Devanagari script
      /[अ-ह]/g,            // Hindi/Marathi characters
    ];
    
    this.englishPatterns = [
      /[a-zA-Z]/g,         // English letters
    ];
  }

  /**
   * Preprocess and chunk text content
   * @param {string} text - Raw text content
   * @param {Object} options - Preprocessing options
   * @returns {Promise<Array>} Array of processed chunks
   */
  async preprocessAndChunk(text, options = {}) {
    try {
      console.log(`📝 Starting text preprocessing. Input length: ${text.length}`);
      
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return [];
      }

      // Step 1: Clean and normalize text
      const cleanedText = this.cleanText(text);
      
      // Step 2: Detect language
      const language = this.detectLanguage(cleanedText);
      
      // Step 3: Extract sections and structure
      const sections = this.extractSections(cleanedText);
      
      // Step 4: Create chunks
      const chunks = this.createChunks(sections, {
        chunkSize: options.chunkSize || this.defaultChunkSize,
        overlap: options.overlap || this.defaultOverlap,
        minChunkSize: options.minChunkSize || this.minChunkSize,
        maxChunkSize: options.maxChunkSize || this.maxChunkSize,
        language: language
      });
      
      // Step 5: Enhance chunks with metadata
      const enhancedChunks = await this.enhanceChunks(chunks, {
        language: language,
        extractKeywords: options.extractKeywords !== false,
        calculateQualityScore: options.calculateQualityScore !== false
      });
      
      console.log(`✅ Text preprocessing completed. Created ${enhancedChunks.length} chunks`);
      
      return enhancedChunks;
      
    } catch (error) {
      console.error('❌ Text preprocessing failed:', error.message);
      throw new Error(`Text preprocessing failed: ${error.message}`);
    }
  }

  /**
   * Clean and normalize text
   * @param {string} text - Raw text
   * @returns {string} Cleaned text
   */
  cleanText(text) {
    if (!text || typeof text !== 'string') return '';
    
    let cleaned = text;
    
    // Remove excessive whitespace
    cleaned = cleaned
      .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n\n')    // Normalize paragraph breaks
      .trim();
    
    // Remove common artifacts
    cleaned = cleaned
      .replace(/[^\x00-\x7F\u00A0-\uFFFF\s]/g, ' ')  // Remove non-printable chars
      .replace(/\u00A0/g, ' ')                        // Replace non-breaking spaces
      .replace(/\u2013|\u2014/g, '-')                 // Replace en/em dashes
      .replace(/\u2018|\u2019/g, "'")                 // Replace smart quotes
      .replace(/\u201C|\u201D/g, '"')                 // Replace smart double quotes
      .replace(/\u2026/g, '...');                     // Replace ellipsis
    
    // Fix common spacing issues
    cleaned = cleaned
      .replace(/([a-z])([A-Z])/g, '$1 $2')           // Add space between camelCase
      .replace(/([.!?])([A-Z])/g, '$1 $2')           // Add space after sentences
      .replace(/([a-z])(\d)/g, '$1 $2')              // Add space between letters and numbers
      .replace(/(\d)([A-Z])/g, '$1 $2');             // Add space between numbers and letters
    
    return cleaned;
  }

  /**
   * Detect language of the text
   * @param {string} text - Text to analyze
   * @returns {string} Language code ('en', 'mr', 'mixed')
   */
  detectLanguage(text) {
    if (!text || typeof text !== 'string') return 'en';
    
    const marathiMatches = this.marathiPatterns.reduce((count, pattern) => {
      const matches = text.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
    
    const englishMatches = this.englishPatterns.reduce((count, pattern) => {
      const matches = text.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
    
    const totalChars = text.length;
    const marathiRatio = marathiMatches / totalChars;
    const englishRatio = englishMatches / totalChars;
    
    if (marathiRatio > 0.3 && englishRatio > 0.3) {
      return 'mixed';
    } else if (marathiRatio > 0.1) {
      return 'en'; // Force English for processing since we translate everything to English
    } else {
      return 'en';
    }
  }

  /**
   * Extract sections and structure from text
   * @param {string} text - Cleaned text
   * @returns {Array} Array of sections with metadata
   */
  extractSections(text) {
    if (!text || typeof text !== 'string') return [];
    
    const sections = [];
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    let currentSection = {
      title: '',
      content: '',
      type: 'paragraph',
      level: 0
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect headings (lines that are short and end without punctuation)
      if (this.isHeading(line, i, lines)) {
        // Save previous section if it has content
        if (currentSection.content.trim().length > 0) {
          sections.push({ ...currentSection });
        }
        
        // Start new section
        currentSection = {
          title: line,
          content: '',
          type: 'heading',
          level: this.getHeadingLevel(line)
        };
      } else {
        // Add to current section content
        if (currentSection.content) {
          currentSection.content += ' ' + line;
        } else {
          currentSection.content = line;
        }
        currentSection.type = 'paragraph';
      }
    }
    
    // Add the last section
    if (currentSection.content.trim().length > 0) {
      sections.push(currentSection);
    }
    
    return sections;
  }

  /**
   * Check if a line is a heading
   * @param {string} line - Line to check
   * @param {number} index - Line index
   * @param {Array} lines - All lines
   * @returns {boolean} True if line is a heading
   */
  isHeading(line, index, lines) {
    // Short lines without ending punctuation
    if (line.length < 100 && !line.match(/[.!?]$/)) {
      // Check if next line is content (not another heading)
      if (index + 1 < lines.length) {
        const nextLine = lines[index + 1].trim();
        return nextLine.length > line.length || nextLine.match(/[.!?]$/);
      }
      return true;
    }
    
    // Lines that start with numbers or bullets
    if (line.match(/^[\d\-\*\+]\s/) || line.match(/^\d+\./)) {
      return true;
    }
    
    return false;
  }

  /**
   * Get heading level based on formatting
   * @param {string} heading - Heading text
   * @returns {number} Heading level (1-6)
   */
  getHeadingLevel(heading) {
    if (heading.match(/^\d+\./)) return 1;
    if (heading.match(/^\d+\.\d+/)) return 2;
    if (heading.match(/^[\-\*\+]/)) return 3;
    if (heading.length < 30) return 1;
    if (heading.length < 60) return 2;
    return 3;
  }

  /**
   * Create chunks from sections
   * @param {Array} sections - Array of sections
   * @param {Object} options - Chunking options
   * @returns {Array} Array of chunks
   */
  createChunks(sections, options = {}) {
    const chunks = [];
    const {
      chunkSize = this.defaultChunkSize,
      overlap = this.defaultOverlap,
      minChunkSize = this.minChunkSize,
      maxChunkSize = this.maxChunkSize,
      language = 'en'
    } = options;
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const words = this.wordTokenizer.tokenize(section.content);
      
      if (words.length <= maxChunkSize) {
        // Section fits in one chunk
        chunks.push({
          content: section.content,
          metadata: {
            section: section.title,
            chunkIndex: chunks.length,
            wordCount: words.length,
            charCount: section.content.length,
            language: language,
            contentType: section.type,
            level: section.level
          }
        });
      } else {
        // Split section into multiple chunks
        const sectionChunks = this.splitIntoChunks(
          section.content,
          words,
          {
            chunkSize,
            overlap,
            minChunkSize,
            maxChunkSize,
            sectionTitle: section.title,
            sectionType: section.type,
            sectionLevel: section.level,
            language,
            baseIndex: chunks.length
          }
        );
        
        chunks.push(...sectionChunks);
      }
    }
    
    return chunks;
  }

  /**
   * Split large text into overlapping chunks
   * @param {string} text - Text to split
   * @param {Array} words - Tokenized words
   * @param {Object} options - Splitting options
   * @returns {Array} Array of chunks
   */
  splitIntoChunks(text, words, options = {}) {
    const {
      chunkSize = this.defaultChunkSize,
      overlap = this.defaultOverlap,
      minChunkSize = this.minChunkSize,
      maxChunkSize = this.maxChunkSize,
      sectionTitle = '',
      sectionType = 'paragraph',
      sectionLevel = 0,
      language = 'en',
      baseIndex = 0
    } = options;
    
    const chunks = [];
    let startIndex = 0;
    let chunkIndex = baseIndex;
    
    while (startIndex < words.length) {
      let endIndex = Math.min(startIndex + chunkSize, words.length);
      
      // Try to end at sentence boundary
      const chunkWords = words.slice(startIndex, endIndex);
      const chunkText = chunkWords.join(' ');
      
      // Adjust end index to sentence boundary if possible
      const lastSentenceEnd = chunkText.lastIndexOf('.');
      if (lastSentenceEnd > chunkText.length * 0.7) {
        const adjustedText = chunkText.substring(0, lastSentenceEnd + 1);
        const adjustedWords = this.wordTokenizer.tokenize(adjustedText);
        if (adjustedWords.length >= minChunkSize) {
          endIndex = startIndex + adjustedWords.length;
        }
      }
      
      // Create chunk
      const finalChunkWords = words.slice(startIndex, endIndex);
      const finalChunkText = finalChunkWords.join(' ');
      
      if (finalChunkText.trim().length > 0) {
        chunks.push({
          content: finalChunkText,
          metadata: {
            section: sectionTitle,
            chunkIndex: chunkIndex++,
            wordCount: finalChunkWords.length,
            charCount: finalChunkText.length,
            language: language,
            contentType: sectionType,
            level: sectionLevel
          }
        });
      }
      
      // Move start index with overlap
      startIndex = Math.max(startIndex + chunkSize - overlap, endIndex);
      
      // Prevent infinite loop
      if (startIndex >= words.length) break;
    }
    
    return chunks;
  }

  /**
   * Enhance chunks with additional metadata
   * @param {Array} chunks - Array of chunks
   * @param {Object} options - Enhancement options
   * @returns {Promise<Array>} Enhanced chunks
   */
  async enhanceChunks(chunks, options = {}) {
    const {
      language = 'en',
      extractKeywords = true,
      calculateQualityScore = true
    } = options;
    
    const enhancedChunks = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const enhanced = { ...chunk };
      
      // Extract keywords
      if (extractKeywords) {
        enhanced.metadata.keywords = this.extractKeywords(chunk.content, language);
      }
      
      // Calculate quality score
      if (calculateQualityScore) {
        enhanced.metadata.qualityScore = this.calculateQualityScore(chunk.content, chunk.metadata);
      }
      
      enhancedChunks.push(enhanced);
    }
    
    return enhancedChunks;
  }

  /**
   * Extract keywords from text
   * @param {string} text - Text to extract keywords from
   * @param {string} language - Language of the text
   * @returns {Array} Array of keywords
   */
  extractKeywords(text, language = 'en') {
    if (!text || typeof text !== 'string') return [];
    
    // Simple keyword extraction based on word frequency
    const words = this.wordTokenizer.tokenize(text.toLowerCase());
    const stopWords = this.getStopWords(language);
    
    // Filter out stop words and short words
    const filteredWords = words.filter(word => 
      word.length > 3 && 
      !stopWords.includes(word) &&
      !word.match(/^\d+$/) // Remove pure numbers
    );
    
    // Count word frequency
    const wordCount = {};
    filteredWords.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Sort by frequency and return top keywords
    const sortedWords = Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
    
    return sortedWords;
  }

  /**
   * Get stop words for a language
   * @param {string} language - Language code
   * @returns {Array} Array of stop words
   */
  getStopWords(language) {
    const stopWords = {
      en: ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'],
      mr: ['आणि', 'किंवा', 'पण', 'मध्ये', 'वर', 'खाली', 'साठी', 'च्या', 'ने', 'ला', 'होते', 'होतो', 'होती', 'आहे', 'आहेत', 'होईल', 'होतील', 'होतो', 'होतात', 'मी', 'तू', 'तो', 'ती', 'आम्ही', 'तुम्ही', 'ते', 'त्या', 'मला', 'तुला', 'त्याला', 'तिला', 'आम्हाला', 'तुम्हाला', 'त्यांना', 'हा', 'ही', 'हे', 'तो', 'ती', 'ते', 'या', 'त्या']
    };
    
    return stopWords[language] || stopWords.en;
  }

  /**
   * Calculate quality score for a chunk
   * @param {string} content - Chunk content
   * @param {Object} metadata - Chunk metadata
   * @returns {number} Quality score (0-1)
   */
  calculateQualityScore(content, metadata) {
    if (!content || typeof content !== 'string') return 0;
    
    let score = 0.5; // Base score
    
    // Length score (optimal length gets higher score)
    const wordCount = metadata.wordCount || 0;
    if (wordCount >= 100 && wordCount <= 500) {
      score += 0.2;
    } else if (wordCount >= 50 && wordCount <= 1000) {
      score += 0.1;
    }
    
    // Content type score
    if (metadata.contentType === 'heading') {
      score += 0.1;
    }
    
    // Language consistency score
    if (metadata.language !== 'mixed') {
      score += 0.1;
    }
    
    // Keyword density score
    const keywords = metadata.keywords || [];
    if (keywords.length >= 3 && keywords.length <= 8) {
      score += 0.1;
    }
    
    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Get preprocessing statistics
   * @param {Array} chunks - Array of processed chunks
   * @returns {Object} Statistics
   */
  getPreprocessingStats(chunks) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return {
        totalChunks: 0,
        totalWords: 0,
        totalChars: 0,
        avgChunkSize: 0,
        languageDistribution: {},
        contentTypeDistribution: {}
      };
    }
    
    const stats = {
      totalChunks: chunks.length,
      totalWords: 0,
      totalChars: 0,
      avgChunkSize: 0,
      languageDistribution: {},
      contentTypeDistribution: {}
    };
    
    chunks.forEach(chunk => {
      stats.totalWords += chunk.metadata.wordCount || 0;
      stats.totalChars += chunk.metadata.charCount || 0;
      
      // Language distribution
      const lang = chunk.metadata.language || 'unknown';
      stats.languageDistribution[lang] = (stats.languageDistribution[lang] || 0) + 1;
      
      // Content type distribution
      const type = chunk.metadata.contentType || 'unknown';
      stats.contentTypeDistribution[type] = (stats.contentTypeDistribution[type] || 0) + 1;
    });
    
    stats.avgChunkSize = stats.totalChunks > 0 ? Math.round(stats.totalWords / stats.totalChunks) : 0;
    
    return stats;
  }
}

module.exports = new TextPreprocessingService();
