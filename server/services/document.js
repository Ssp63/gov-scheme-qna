const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { Document } = require('../models');
const { deleteFile } = require('../middleware/upload');

// Text extraction from text file (for testing)
const extractTextFromTXT = async (filePath) => {
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    
    return {
      text: text,
      pages: 1,
      info: { title: 'Text Document' }
    };
  } catch (error) {
    console.error('TXT extraction error:', error);
    throw new Error('Failed to extract text from text file');
  }
};

// Text extraction from PDF
const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    
    return {
      text: data.text,
      pages: data.numpages,
      info: data.info
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
};

// Text extraction from DOCX
const extractTextFromDOCX = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    
    return {
      text: result.value,
      pages: 1, // DOCX doesn't have page concept
      messages: result.messages
    };
  } catch (error) {
    console.error('DOCX extraction error:', error);
    throw new Error('Failed to extract text from DOCX');
  }
};

// Chunk text into smaller pieces for embeddings
const chunkText = (text, chunkSize = 1000, overlap = 200) => {
  const chunks = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  let chunkIndex = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim() + '.';
    
    // If adding this sentence would exceed chunk size, save current chunk
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        chunkId: `chunk_${chunkIndex++}`,
        text: currentChunk.trim(),
        startIndex: chunks.length > 0 ? chunks[chunks.length - 1].endIndex - overlap : 0,
        endIndex: currentChunk.length,
        pageNumber: 1, // Will be updated based on file type
        metadata: {
          section: extractSection(currentChunk),
          keywords: extractKeywords(currentChunk),
          importance: calculateImportance(currentChunk)
        }
      });
      
      // Start new chunk with overlap from previous chunk
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-Math.floor(overlap / 6)); // Approximate overlap
      currentChunk = overlapWords.join(' ') + ' ' + sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  
  // Add the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      chunkId: `chunk_${chunkIndex}`,
      text: currentChunk.trim(),
      startIndex: chunks.length > 0 ? chunks[chunks.length - 1].endIndex - overlap : 0,
      endIndex: currentChunk.length,
      pageNumber: 1,
      metadata: {
        section: extractSection(currentChunk),
        keywords: extractKeywords(currentChunk),
        importance: calculateImportance(currentChunk)
      }
    });
  }
  
  return chunks;
};

// Extract section from text (simple heuristic)
const extractSection = (text) => {
  const sectionKeywords = {
    'eligibility': ['eligibility', 'eligible', 'criteria', 'requirement'],
    'benefits': ['benefit', 'subsidy', 'amount', 'financial'],
    'application': ['application', 'apply', 'form', 'procedure'],
    'documents': ['document', 'certificate', 'proof', 'attachment']
  };
  
  const lowerText = text.toLowerCase();
  
  for (const [section, keywords] of Object.entries(sectionKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return section;
    }
  }
  
  return 'general';
};

// Extract keywords from text (simple approach)
const extractKeywords = (text) => {
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'];
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.includes(word));
  
  // Get word frequency
  const wordCount = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  // Return top 5 keywords
  return Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
};

// Calculate importance score (simple heuristic)
const calculateImportance = (text) => {
  const importantPhrases = [
    'eligible', 'eligibility', 'criteria', 'requirement',
    'benefit', 'subsidy', 'amount', 'financial',
    'application', 'apply', 'procedure', 'process',
    'document', 'required', 'necessary', 'mandatory'
  ];
  
  const lowerText = text.toLowerCase();
  let score = 0.5; // Base score
  
  importantPhrases.forEach(phrase => {
    if (lowerText.includes(phrase)) {
      score += 0.1;
    }
  });
  
  return Math.min(score, 1.0);
};

// Main document processing function
const processDocument = async (schemeId, fileInfo, uploadedBy) => {
  try {
    console.log(`Processing document: ${fileInfo.originalName}`);
    
    // Create document record
    const document = new Document({
      schemeId,
      originalFileName: fileInfo.originalName,
      fileType: fileInfo.mimetype === 'application/pdf' ? 'pdf' : 
                fileInfo.mimetype === 'text/plain' ? 'txt' : 'docx',
      fileSize: fileInfo.size,
      filePath: fileInfo.path,
      extractedText: '',
      chunks: [],
      processingStatus: 'extracting',
      uploadedBy
    });
    
    document.addProcessingLog('started', 'success', 'Document processing started');
    await document.save();
    
    // Extract text based on file type
    let extractedData;
    if (fileInfo.mimetype === 'application/pdf') {
      extractedData = await extractTextFromPDF(fileInfo.path);
    } else if (fileInfo.mimetype === 'text/plain') {
      extractedData = await extractTextFromTXT(fileInfo.path);
    } else {
      extractedData = await extractTextFromDOCX(fileInfo.path);
    }
    
    // Update document with extracted text
    document.extractedText = extractedData.text;
    document.processingStatus = 'chunking';
    document.addProcessingLog('extraction', 'success', `Extracted ${extractedData.text.length} characters`);
    await document.save();
    
    // Create text chunks
    const chunks = chunkText(extractedData.text);
    
    // For now, we'll store chunks without embeddings
    // Embeddings will be added when we integrate Google Gemini API
    document.chunks = chunks.map(chunk => ({
      ...chunk,
      embedding: [] // Will be populated later with Gemini embeddings
    }));
    
    document.processingStatus = 'completed';
    document.addProcessingLog('chunking', 'success', `Created ${chunks.length} text chunks`);
    await document.save();
    
    console.log(`Document processing completed: ${chunks.length} chunks created`);
    
    // Clean up uploaded file (optional - you might want to keep it)
    // deleteFile(fileInfo.path);
    
    return document;
    
  } catch (error) {
    console.error('Document processing error:', error);
    
    // Update document status to failed
    if (document && document._id) {
      document.processingStatus = 'failed';
      document.addProcessingLog('processing', 'error', error.message);
      await document.save();
    }
    
    // Clean up uploaded file on error
    deleteFile(fileInfo.path);
    
    throw error;
  }
};

// Get documents for a scheme
const getSchemeDocuments = async (schemeId) => {
  try {
    const documents = await Document.find({ 
      schemeId, 
      processingStatus: 'completed' 
    }).select('originalFileName fileType fileSize totalChunks createdAt');
    
    return documents;
  } catch (error) {
    console.error('Get scheme documents error:', error);
    throw error;
  }
};

module.exports = {
  processDocument,
  getSchemeDocuments,
  extractTextFromPDF,
  extractTextFromDOCX,
  extractTextFromTXT,
  chunkText
};