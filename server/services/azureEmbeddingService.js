const OpenAI = require('openai');

/**
 * Azure OpenAI Embedding Service
 * Handles embedding generation using Azure OpenAI Service
 */
class AzureEmbeddingService {
  constructor() {
    this.client = null;
    this.deploymentName = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT;
    this.apiVersion = process.env.AZURE_OPENAI_API_VERSION;
    this.isInitialized = false;
  }

  /**
   * Initialize Azure OpenAI client
   */
  async initialize() {
    if (this.isInitialized && this.client) {
      return true;
    }

    try {
      // Validate required environment variables
      const requiredEnvVars = [
        'AZURE_OPENAI_ENDPOINT',
        'AZURE_OPENAI_API_KEY',
        'AZURE_OPENAI_EMBEDDING_DEPLOYMENT',
        'AZURE_OPENAI_API_VERSION'
      ];

      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          throw new Error(`Missing required environment variable: ${envVar}`);
        }
      }

      console.log('🔧 Initializing Azure OpenAI embedding service...');
      
      this.client = new OpenAI({
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${this.deploymentName}`,
        defaultQuery: { 'api-version': this.apiVersion },
        defaultHeaders: {
          'api-key': process.env.AZURE_OPENAI_API_KEY,
        },
      });

      this.isInitialized = true;
      console.log('✅ Azure OpenAI embedding service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Azure OpenAI embedding service:', error.message);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Generate embeddings for text chunks
   * @param {Array<string>} textChunks - Array of text strings to embed
   * @param {number} maxRetries - Maximum number of retry attempts
   * @returns {Promise<Array>} Array of embedding objects
   */
  async generateEmbeddings(textChunks, maxRetries = 3) {
    if (!Array.isArray(textChunks) || textChunks.length === 0) {
      throw new Error('textChunks must be a non-empty array');
    }

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Ensure client is initialized
        if (!this.isInitialized) {
          const initialized = await this.initialize();
          if (!initialized) {
            throw new Error('Failed to initialize Azure OpenAI client');
          }
        }

        console.log(`🧠 Attempting to generate Azure embeddings (attempt ${attempt}/${maxRetries})`);
        console.log(`📊 Processing ${textChunks.length} text chunks`);
        
        const startTime = Date.now();
        
        // Generate embeddings using Azure OpenAI
        const response = await this.client.embeddings.create({
          model: this.deploymentName,
          input: textChunks,
        });

        const endTime = Date.now();
        const processingTime = endTime - startTime;

        if (!response.data || response.data.length !== textChunks.length) {
          throw new Error(`Expected ${textChunks.length} embeddings, got ${response.data?.length || 0}`);
        }

        // Format response to match the expected structure
        const embeddings = response.data.map((item, index) => ({
          text: textChunks[index],
          embedding: item.embedding,
          metadata: {
            length: textChunks[index].length,
            timestamp: new Date(),
            model: this.deploymentName,
            dimensions: item.embedding.length,
            processingTime: processingTime,
            provider: 'azure'
          }
        }));

        console.log(`✅ Successfully generated ${embeddings.length} Azure embeddings`);
        console.log(`📊 Embedding dimensions: ${embeddings[0].embedding.length}`);
        console.log(`⏱️ Total processing time: ${processingTime}ms`);
        console.log(`⚡ Average time per embedding: ${(processingTime / textChunks.length).toFixed(2)}ms`);

        return embeddings;

      } catch (error) {
        console.error(`❌ Azure embedding generation failed (attempt ${attempt}/${maxRetries}):`, error.message);
        
        // Check for specific Azure OpenAI errors
        if (error.status === 429) {
          // Rate limit error - wait longer before retry
          const waitTime = Math.pow(2, attempt) * 2000; // Exponential backoff: 4s, 8s, 16s
          console.log(`⏳ Rate limit hit, waiting ${waitTime}ms before retry...`);
          await delay(waitTime);
          continue;
        } else if (error.status >= 500) {
          // Server error - retry with exponential backoff
          const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`⏳ Server error, waiting ${waitTime}ms before retry...`);
          await delay(waitTime);
          continue;
        } else if (attempt < maxRetries) {
          // Other errors - short delay before retry
          await delay(1000);
          continue;
        }
        
        // If all retries failed, throw the error
        throw new Error(`Azure embedding generation failed after ${maxRetries} attempts: ${error.message}`);
      }
    }
  }

  /**
   * Test the Azure embedding service
   * @returns {Promise<Object>} Test result
   */
  async testConnection() {
    try {
      console.log('🧪 Testing Azure OpenAI embedding connection...');
      
      const testText = "This is a test embedding.";
      const result = await this.generateEmbeddings([testText]);
      
      if (result && result.length > 0 && result[0].embedding) {
        console.log('✅ Azure embedding connection test successful');
        return {
          success: true,
          dimensions: result[0].embedding.length,
          model: this.deploymentName,
          provider: 'azure'
        };
      } else {
        throw new Error('Invalid response from Azure embedding service');
      }
    } catch (error) {
      console.error('❌ Azure embedding connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
        provider: 'azure'
      };
    }
  }

  /**
   * Get service status and configuration
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      deployment: this.deploymentName,
      apiVersion: this.apiVersion,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      provider: 'azure'
    };
  }
}

module.exports = new AzureEmbeddingService();
