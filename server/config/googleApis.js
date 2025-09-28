const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Google APIs
let genAI;

const initializeGoogleAPIs = () => {
  try {
    // Initialize Gemini AI
    if (process.env.GOOGLE_GEMINI_API_KEY) {
      genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
      console.log('✅ Google Gemini AI initialized');
    } else {
      console.warn('⚠️ GOOGLE_GEMINI_API_KEY not found in environment variables');
    }



  } catch (error) {
    console.error('❌ Error initializing Google APIs:', error.message);
  }
};

// Get Gemini AI model
const getGeminiModel = (modelName = 'gemini-2.5-flash') => {
  if (!genAI) {
    throw new Error('Gemini AI not initialized. Check your API key.');
  }
  return genAI.getGenerativeModel({ model: modelName });
};

module.exports = {
  initializeGoogleAPIs,
  getGeminiModel
};