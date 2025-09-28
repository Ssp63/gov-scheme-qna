const axios = require('axios');

class TranslationService {
  constructor() {
    this.azureEndpoint = 'https://api.cognitive.microsofttranslator.com';
    this.apiKey = process.env.AZURE_TRANSLATOR_KEY;
    this.region = process.env.AZURE_TRANSLATOR_REGION || 'eastus';
    this.maxTextLength = 50000; // Azure Translator limit
    
    // Debug logging
    console.log('🔧 Translation Service initialized:');
    console.log(`   - API Key present: ${!!this.apiKey}`);
    console.log(`   - Region: ${this.region}`);
    console.log(`   - Endpoint: ${this.azureEndpoint}`);
  }

  /**
   * Translate text from source language to target language
   * @param {string} text - Text to translate
   * @param {string} fromLang - Source language code (e.g., 'mr', 'en')
   * @param {string} toLang - Target language code (e.g., 'en', 'mr')
   * @returns {Promise<string>} Translated text
   */
  async translateText(text, fromLang, toLang) {
    try {
      if (!this.apiKey) {
        console.warn('⚠️ Azure Translator API key not found, returning original text');
        return text;
      }

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return text;
      }

      // If source and target languages are the same, return original text
      if (fromLang === toLang) {
        return text;
      }

      // Check text length
      if (text.length > this.maxTextLength) {
        console.warn(`⚠️ Text too long (${text.length} chars), truncating to ${this.maxTextLength}`);
        text = text.substring(0, this.maxTextLength);
      }

      console.log(`🌐 Translating text from ${fromLang} to ${toLang} (${text.length} chars)`);

      const response = await axios.post(
        `${this.azureEndpoint}/translate`,
        [{ text: text }],
        {
          params: {
            'api-version': '3.0',
            from: fromLang,
            to: toLang
          },
          headers: {
            'Ocp-Apim-Subscription-Key': this.apiKey,
            'Ocp-Apim-Subscription-Region': this.region,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data[0] && response.data[0].translations && response.data[0].translations[0]) {
        const translatedText = response.data[0].translations[0].text;
        console.log(`✅ Translation completed: ${text.length} → ${translatedText.length} chars`);
        return translatedText;
      } else {
        console.warn('⚠️ Translation response format unexpected, returning original text');
        return text;
      }

    } catch (error) {
      console.error('❌ Translation failed:', error.message);
      
      // Return original text if translation fails
      console.log('🔄 Falling back to original text due to translation error');
      return text;
    }
  }

  /**
   * Translate multiple texts in batch
   * @param {Array<string>} texts - Array of texts to translate
   * @param {string} fromLang - Source language code
   * @param {string} toLang - Target language code
   * @returns {Promise<Array<string>>} Array of translated texts
   */
  async translateBatch(texts, fromLang, toLang) {
    try {
      if (!this.apiKey) {
        console.warn('⚠️ Azure Translator API key not found, returning original texts');
        return texts;
      }

      if (!Array.isArray(texts) || texts.length === 0) {
        return texts;
      }

      if (fromLang === toLang) {
        return texts;
      }

      console.log(`🌐 Batch translating ${texts.length} texts from ${fromLang} to ${toLang}`);

      // Prepare texts for batch translation
      const textObjects = texts.map(text => ({ text: text }));
      
      const response = await axios.post(
        `${this.azureEndpoint}/translate`,
        textObjects,
        {
          params: {
            'api-version': '3.0',
            from: fromLang,
            to: toLang
          },
          headers: {
            'Ocp-Apim-Subscription-Key': this.apiKey,
            'Ocp-Apim-Subscription-Region': this.region,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && Array.isArray(response.data)) {
        const translatedTexts = response.data.map(item => {
          if (item.translations && item.translations[0]) {
            return item.translations[0].text;
          }
          return item.text || '';
        });
        
        console.log(`✅ Batch translation completed: ${texts.length} texts`);
        return translatedTexts;
      } else {
        console.warn('⚠️ Batch translation response format unexpected, returning original texts');
        return texts;
      }

    } catch (error) {
      console.error('❌ Batch translation failed:', error.message);
      console.log('🔄 Falling back to original texts due to translation error');
      return texts;
    }
  }

  /**
   * Detect language of text
   * @param {string} text - Text to detect language for
   * @returns {Promise<string>} Detected language code
   */
  async detectLanguage(text) {
    try {
      if (!this.apiKey) {
        console.warn('⚠️ Azure Translator API key not found, using fallback detection');
        return this.fallbackLanguageDetection(text);
      }

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return 'en';
      }

      console.log(`🔍 Detecting language for text (${text.length} chars)`);

      const response = await axios.post(
        `${this.azureEndpoint}/detect`,
        [{ text: text }],
        {
          params: {
            'api-version': '3.0'
          },
          headers: {
            'Ocp-Apim-Subscription-Key': this.apiKey,
            'Ocp-Apim-Subscription-Region': this.region,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data[0] && response.data[0].language) {
        const detectedLang = response.data[0].language;
        console.log(`✅ Language detected: ${detectedLang}`);
        return detectedLang;
      } else {
        console.warn('⚠️ Language detection response format unexpected, using fallback');
        return this.fallbackLanguageDetection(text);
      }

    } catch (error) {
      console.error('❌ Language detection failed:', error.message);
      console.log('🔄 Using fallback language detection');
      return this.fallbackLanguageDetection(text);
    }
  }

  /**
   * Fallback language detection using regex patterns
   * @param {string} text - Text to analyze
   * @returns {string} Detected language code
   */
  fallbackLanguageDetection(text) {
    if (!text || typeof text !== 'string') return 'en';

    // Marathi/Hindi patterns
    const marathiPatterns = [
      /[\u0900-\u097F]/g,  // Devanagari script
      /[अ-ह]/g,            // Hindi/Marathi characters
    ];

    const marathiMatches = marathiPatterns.reduce((count, pattern) => {
      const matches = text.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);

    const totalChars = text.length;
    const marathiRatio = marathiMatches / totalChars;

    if (marathiRatio > 0.1) {
      return 'mr';
    } else {
      return 'en';
    }
  }

  /**
   * Translate PDF content to English for processing
   * @param {string} content - PDF content
   * @returns {Promise<string>} English translated content
   */
  async translatePDFContentToEnglish(content) {
    try {
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return content;
      }

      // If no API key, use fallback detection and return original content
      if (!this.apiKey) {
        console.log('⚠️ No Azure API key found, using fallback language detection');
        const detectedLang = this.fallbackLanguageDetection(content);
        console.log(`📄 PDF content detected as ${detectedLang}, no translation performed`);
        return content;
      }

      // Detect language first
      const detectedLang = await this.detectLanguage(content);
      
      if (detectedLang === 'en') {
        console.log('📄 PDF content is already in English, no translation needed');
        return content;
      }

      console.log(`📄 Translating PDF content from ${detectedLang} to English`);
      return await this.translateText(content, detectedLang, 'en');

    } catch (error) {
      console.error('❌ PDF content translation failed:', error.message);
      return content;
    }
  }

  /**
   * Translate user query to English for search
   * @param {string} query - User query
   * @returns {Promise<string>} English translated query
   */
  async translateQueryToEnglish(query) {
    try {
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return query;
      }

      // If no API key, use fallback detection
      if (!this.apiKey) {
        console.log('⚠️ No Azure API key found, using fallback language detection');
        const detectedLang = this.fallbackLanguageDetection(query);
        if (detectedLang === 'en') {
          console.log('🔍 Query is already in English, no translation needed');
          return query;
        }
        console.log(`🔍 Query detected as ${detectedLang}, but no translation available`);
        return query;
      }

      // Detect language first
      const detectedLang = await this.detectLanguage(query);
      
      if (detectedLang === 'en') {
        console.log('🔍 Query is already in English, no translation needed');
        return query;
      }

      console.log(`🔍 Translating query from ${detectedLang} to English`);
      return await this.translateText(query, detectedLang, 'en');

    } catch (error) {
      console.error('❌ Query translation failed:', error.message);
      return query;
    }
  }

  /**
   * Translate AI response to user's preferred language
   * @param {string} response - AI response in English
   * @param {string} targetLang - Target language for response
   * @returns {Promise<string>} Translated response
   */
  async translateResponseToLanguage(response, targetLang) {
    try {
      if (!response || typeof response !== 'string' || response.trim().length === 0) {
        return response;
      }

      if (targetLang === 'en') {
        console.log('💬 Response is already in English, no translation needed');
        return response;
      }

      console.log(`💬 Translating response to ${targetLang}`);
      return await this.translateText(response, 'en', targetLang);

    } catch (error) {
      console.error('❌ Response translation failed:', error.message);
      return response;
    }
  }

  /**
   * Get supported languages
   * @returns {Array} Array of supported language codes
   */
  getSupportedLanguages() {
    return [
      { code: 'en', name: 'English' },
      { code: 'mr', name: 'Marathi' },
      { code: 'hi', name: 'Hindi' },
      { code: 'gu', name: 'Gujarati' },
      { code: 'bn', name: 'Bengali' },
      { code: 'ta', name: 'Tamil' },
      { code: 'te', name: 'Telugu' },
      { code: 'kn', name: 'Kannada' },
      { code: 'ml', name: 'Malayalam' },
      { code: 'pa', name: 'Punjabi' }
    ];
  }

  /**
   * Check if translation service is available
   * @returns {boolean} True if service is available
   */
  isAvailable() {
    return !!this.apiKey;
  }

  /**
   * Get translation statistics
   * @returns {Object} Translation service statistics
   */
  getStats() {
    return {
      available: this.isAvailable(),
      endpoint: this.azureEndpoint,
      region: this.region,
      maxTextLength: this.maxTextLength,
      supportedLanguages: this.getSupportedLanguages().length
    };
  }
}

module.exports = new TranslationService();
