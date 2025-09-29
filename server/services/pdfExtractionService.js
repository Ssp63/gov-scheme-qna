const pdfParse = require('pdf-parse');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const translationService = require('./translationService');

class PDFExtractionService {
  constructor() {
    this.supportedFormats = ['.pdf'];
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
  }

  /**
   * Extract text content from a PDF file
   * @param {string} filePath - Path to the PDF file or cloud URL
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} Extracted text and metadata
   */
  async extractTextFromPDF(filePath, options = {}) {
    try {
      console.log(`📄 Starting PDF text extraction for: ${filePath}`);
      
      let pdfBuffer;
      
      // Check if it's a cloud URL or local file path
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        // It's a cloud URL - fetch from cloud storage
        console.log(`☁️ Fetching PDF from cloud storage: ${filePath}`);
        pdfBuffer = await this.fetchPDFFromCloud(filePath);
      } else {
        // It's a local file path
        await this.validateFile(filePath);
        pdfBuffer = await fs.readFile(filePath);
      }
      
      // Configure extraction options
      const extractOptions = {
        // Maximum number of pages to extract (0 = all pages)
        max: options.maxPages || 0,
        
        // Version of PDF.js to use
        version: 'v1.10.100',
        
        // Custom page render options
        render_page: options.renderPage || false,
        
        // Normalize whitespace
        normalizeWhitespace: options.normalizeWhitespace !== false,
        
        // Disable font face
        disableFontFace: options.disableFontFace !== false,
        
        // Custom text extraction
        customTextExtractor: options.customTextExtractor || null
      };

      // Extract text from PDF with enhanced error handling
      let pdfData;
      try {
        pdfData = await pdfParse(pdfBuffer, extractOptions);
      } catch (parseError) {
        console.warn(`⚠️ PDF parsing failed with standard options, trying alternative approach: ${parseError.message}`);
        
        // Try with different options for problematic PDFs
        const alternativeOptions = {
          ...extractOptions,
          max: 0, // Try to extract all pages
          version: 'v1.10.100',
          normalizeWhitespace: false,
          disableFontFace: true
        };
        
        try {
          pdfData = await pdfParse(pdfBuffer, alternativeOptions);
          console.log(`✅ PDF extraction succeeded with alternative options`);
        } catch (secondError) {
          console.warn(`⚠️ Alternative PDF parsing also failed: ${secondError.message}`);
          
          // Try with minimal options
          const minimalOptions = {
            max: 0,
            version: 'v1.10.100'
          };
          
          try {
            pdfData = await pdfParse(pdfBuffer, minimalOptions);
            console.log(`✅ PDF extraction succeeded with minimal options`);
          } catch (thirdError) {
            throw new Error(`PDF parsing failed with all methods. Original error: ${parseError.message}, Alternative error: ${secondError.message}, Minimal error: ${thirdError.message}`);
          }
        }
      }
      
      console.log(`✅ PDF extraction completed. Pages: ${pdfData.numpages}, Text length: ${pdfData.text.length}`);
      
      // Check if we got any text
      if (!pdfData.text || pdfData.text.trim().length === 0) {
        console.warn(`⚠️ PDF extraction succeeded but no text content found`);
        return {
          success: true,
          text: '',
          metadata: this.extractMetadata(pdfData, filePath),
          rawData: {
            numpages: pdfData.numpages,
            info: pdfData.info,
            version: pdfData.version
          },
          warning: 'PDF processed but no text content could be extracted. This might be an image-based PDF or scanned document.'
        };
      }
      
      // Process and clean the extracted text
      const processedText = this.processExtractedText(pdfData.text);
      
      // Translate to English for better processing
      const translatedText = await this.translateToEnglish(processedText);
      
      // Extract metadata
      const metadata = this.extractMetadata(pdfData, filePath);
      
      return {
        success: true,
        text: translatedText, // Return translated text for processing
        originalText: processedText, // Keep original for reference
        metadata: metadata,
        rawData: {
          numpages: pdfData.numpages,
          info: pdfData.info,
          version: pdfData.version
        }
      };
      
    } catch (error) {
      console.error(`❌ PDF extraction failed for ${filePath}:`, error.message);
      
      return {
        success: false,
        error: error.message,
        text: '',
        metadata: {
          numpages: 0,
          fileSize: 0,
          extractionTime: 0
        }
      };
    }
  }

  /**
   * Fetch PDF from cloud storage (Cloudinary)
   * @param {string} cloudUrl - Cloud storage URL
   * @returns {Promise<Buffer>} PDF buffer
   */
  async fetchPDFFromCloud(cloudUrl) {
    try {
      console.log(`☁️ Fetching PDF from cloud: ${cloudUrl}`);
      
      // Add a small delay to ensure Cloudinary has processed the file
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      let response;
      let retries = 3;
      
      while (retries > 0) {
        try {
          response = await axios.get(cloudUrl, {
            responseType: 'arraybuffer',
            timeout: 120000, // 2 minutes timeout for PDF processing
            headers: {
              'User-Agent': 'Govt-Scheme-QNA/1.0'
            }
          });
          break; // Success, exit retry loop
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          console.log(`⚠️ PDF fetch failed, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before retry
        }
      }
      
      if (response.status !== 200) {
        throw new Error(`Failed to fetch PDF: HTTP ${response.status}`);
      }
      
      const buffer = Buffer.from(response.data);
      
      // Basic validation
      if (buffer.length < 100) {
        throw new Error('Downloaded file is too small, might be corrupted');
      }
      
      if (buffer.length > this.maxFileSize) {
        throw new Error(`File size (${buffer.length} bytes) exceeds maximum allowed size (${this.maxFileSize} bytes)`);
      }
      
      // Check PDF header
      const header = buffer.toString('ascii', 0, 8);
      if (!header.startsWith('%PDF-')) {
        console.warn(`⚠️ Downloaded file does not appear to be a valid PDF (header: ${header})`);
      }
      
      console.log(`✅ Successfully fetched PDF from cloud: ${buffer.length} bytes`);
      return buffer;
      
    } catch (error) {
      console.error(`❌ Failed to fetch PDF from cloud: ${error.message}`);
      throw new Error(`Cloud PDF fetch failed: ${error.message}`);
    }
  }

  /**
   * Validate PDF file before processing
   * @param {string} filePath - Path to the PDF file
   */
  async validateFile(filePath) {
    try {
      // Check if file exists
      await fs.access(filePath);
      
      // Get file stats
      const stats = await fs.stat(filePath);
      
      // Check file size
      if (stats.size > this.maxFileSize) {
        throw new Error(`File size (${stats.size} bytes) exceeds maximum allowed size (${this.maxFileSize} bytes)`);
      }
      
      // Check if file is too small (might be corrupted)
      if (stats.size < 100) {
        throw new Error(`File size (${stats.size} bytes) is too small, file might be corrupted`);
      }
      
      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      if (!this.supportedFormats.includes(ext)) {
        throw new Error(`Unsupported file format: ${ext}. Supported formats: ${this.supportedFormats.join(', ')}`);
      }
      
      // Basic PDF header check
      const buffer = await fs.readFile(filePath);
      const header = buffer.toString('ascii', 0, 8);
      if (!header.startsWith('%PDF-')) {
        console.warn(`⚠️ File ${filePath} does not appear to be a valid PDF (header: ${header})`);
      }
      
      console.log(`✅ File validation passed: ${filePath} (${stats.size} bytes)`);
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Process and clean extracted text
   * @param {string} rawText - Raw text from PDF
   * @returns {string} Cleaned text
   */
  processExtractedText(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return '';
    }

    let processedText = rawText;

    // Remove excessive whitespace and normalize line breaks
    processedText = processedText
      .replace(/\r\n/g, '\n')           // Normalize line endings
      .replace(/\r/g, '\n')             // Convert remaining \r to \n
      .replace(/\n{3,}/g, '\n\n')       // Replace multiple newlines with double newline
      .replace(/[ \t]+/g, ' ')          // Replace multiple spaces/tabs with single space
      .replace(/^\s+|\s+$/gm, '')       // Trim whitespace from each line
      .trim();

    // Remove common PDF artifacts
    processedText = processedText
      .replace(/\f/g, '\n')             // Replace form feeds with newlines
      .replace(/\u00A0/g, ' ')          // Replace non-breaking spaces
      .replace(/\u2013|\u2014/g, '-')   // Replace en/em dashes with regular dash
      .replace(/\u2018|\u2019/g, "'")   // Replace smart quotes
      .replace(/\u201C|\u201D/g, '"')   // Replace smart double quotes
      .replace(/\u2026/g, '...')        // Replace ellipsis
      .replace(/[^\x00-\x7F\u00A0-\uFFFF]/g, ' '); // Remove other non-printable characters

    // Clean up common PDF extraction issues
    processedText = processedText
      .replace(/([a-z])([A-Z])/g, '$1 $2')  // Add space between camelCase words
      .replace(/([.!?])([A-Z])/g, '$1 $2')  // Add space after sentence endings
      .replace(/([a-z])(\d)/g, '$1 $2')     // Add space between letters and numbers
      .replace(/(\d)([A-Z])/g, '$1 $2');    // Add space between numbers and letters

    console.log(`📝 Text processing completed. Original length: ${rawText.length}, Processed length: ${processedText.length}`);
    
    return processedText;
  }

  /**
   * Extract metadata from PDF data
   * @param {Object} pdfData - PDF data from pdf-parse
   * @param {string} filePath - Original file path
   * @returns {Object} Extracted metadata
   */
  extractMetadata(pdfData, filePath) {
    const startTime = Date.now();
    
    const metadata = {
      // File information
      fileName: path.basename(filePath),
      filePath: filePath,
      fileSize: 0,
      
      // PDF information
      numpages: pdfData.numpages || 0,
      version: pdfData.version || 'unknown',
      
      // Text statistics
      textLength: pdfData.text ? pdfData.text.length : 0,
      wordCount: pdfData.text ? this.countWords(pdfData.text) : 0,
      lineCount: pdfData.text ? pdfData.text.split('\n').length : 0,
      
      // PDF document info
      title: pdfData.info?.Title || null,
      author: pdfData.info?.Author || null,
      subject: pdfData.info?.Subject || null,
      creator: pdfData.info?.Creator || null,
      producer: pdfData.info?.Producer || null,
      creationDate: pdfData.info?.CreationDate || null,
      modificationDate: pdfData.info?.ModDate || null,
      
      // Processing information
      extractionTime: 0,
      processedAt: new Date()
    };

    // Get file size
    try {
      const stats = require('fs').statSync(filePath);
      metadata.fileSize = stats.size;
    } catch (error) {
      console.warn('Could not get file size:', error.message);
    }

    // Calculate extraction time
    metadata.extractionTime = Date.now() - startTime;

    return metadata;
  }

  /**
   * Count words in text
   * @param {string} text - Text to count words in
   * @returns {number} Word count
   */
  countWords(text) {
    if (!text || typeof text !== 'string') return 0;
    
    // Remove extra whitespace and split by whitespace
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    return words.length;
  }

  /**
   * Extract text from multiple PDF files
   * @param {Array<string>} filePaths - Array of PDF file paths
   * @param {Object} options - Extraction options
   * @returns {Promise<Array>} Array of extraction results
   */
  async extractFromMultiplePDFs(filePaths, options = {}) {
    console.log(`📚 Starting batch PDF extraction for ${filePaths.length} files`);
    
    const results = [];
    const batchSize = options.batchSize || 3; // Process 3 files at a time
    
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (filePath) => {
        try {
          const result = await this.extractTextFromPDF(filePath, options);
          return {
            filePath,
            ...result
          };
        } catch (error) {
          console.error(`❌ Batch extraction failed for ${filePath}:`, error.message);
          return {
            filePath,
            success: false,
            error: error.message,
            text: '',
            metadata: {}
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches to avoid overwhelming the system
      if (i + batchSize < filePaths.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Batch extraction completed. Success: ${successCount}/${filePaths.length}`);
    
    return results;
  }

  /**
   * Get supported file formats
   * @returns {Array<string>} Array of supported file extensions
   */
  getSupportedFormats() {
    return [...this.supportedFormats];
  }

  /**
   * Check if file format is supported
   * @param {string} filePath - File path to check
   * @returns {boolean} True if supported
   */
  isSupportedFormat(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.supportedFormats.includes(ext);
  }

  /**
   * Translate text to English for better processing
   * @param {string} text - Text to translate
   * @returns {Promise<string>} Translated text
   */
  async translateToEnglish(text) {
    try {
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return text;
      }

      console.log(`🌐 Translating PDF content to English (${text.length} chars)`);
      
      // Use translation service to translate to English
      const translatedText = await translationService.translatePDFContentToEnglish(text);
      
      console.log(`✅ PDF content translated: ${text.length} → ${translatedText.length} chars`);
      return translatedText;

    } catch (error) {
      console.error('❌ PDF translation failed:', error.message);
      console.log('🔄 Using original text due to translation error');
      return text;
    }
  }

  /**
   * Create a fallback text extraction for problematic PDFs
   * @param {string} filePath - Path to the PDF file
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} Fallback extraction result
   */
  async createFallbackExtraction(filePath, options = {}) {
    try {
      console.log(`🔄 Creating fallback extraction for problematic PDF: ${filePath}`);
      
      let fileName, fileSize;
      
      // Handle cloud URLs vs local files
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        // Extract filename from URL
        const urlParts = filePath.split('/');
        fileName = urlParts[urlParts.length - 1] || 'cloud-document.pdf';
        fileSize = 0; // Unknown size for cloud files
      } else {
        // Local file
        const stats = await fs.stat(filePath);
        fileName = path.basename(filePath);
        fileSize = stats.size;
      }
      
      // Create a basic fallback result
      const fallbackResult = {
        success: true,
        text: `[PDF Document: ${fileName}]\n\nThis PDF document could not be processed for text extraction. The file may be corrupted, password-protected, or in an unsupported format.\n\nFile Information:\n- File Name: ${fileName}\n- File Size: ${fileSize} bytes\n- Upload Date: ${new Date().toISOString()}\n\nPlease contact the administrator if you need assistance with this document.`,
        metadata: {
          fileName: fileName,
          filePath: filePath,
          fileSize: fileSize,
          numpages: 1,
          version: 'unknown',
          textLength: 0,
          wordCount: 0,
          lineCount: 0,
          title: fileName.replace('.pdf', ''),
          author: 'Unknown',
          subject: 'Government Scheme Document',
          creator: 'PDF Upload System',
          producer: 'Unknown',
          creationDate: new Date(),
          modificationDate: new Date(),
          extractionTime: 0,
          processedAt: new Date(),
          fallbackExtraction: true
        },
        rawData: {
          numpages: 1,
          info: {
            Title: fileName.replace('.pdf', ''),
            Author: 'Unknown',
            Subject: 'Government Scheme Document'
          },
          version: 'unknown'
        },
        warning: 'This PDF could not be processed normally. A fallback extraction was created.'
      };
      
      console.log(`✅ Fallback extraction created for ${fileName}`);
      return fallbackResult;
      
    } catch (error) {
      console.error(`❌ Fallback extraction failed for ${filePath}:`, error.message);
      return {
        success: false,
        error: `Fallback extraction failed: ${error.message}`,
        text: '',
        metadata: {}
      };
    }
  }
}

module.exports = new PDFExtractionService();
