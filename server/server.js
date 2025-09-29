const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/database');
const { initializeGoogleAPIs } = require('./config/googleApis');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Google APIs
initializeGoogleAPIs();

const app = express();

// Set server timeout to 2 minutes for AI processing
app.use((req, res, next) => {
  req.setTimeout(120000); // 2 minutes
  res.setTimeout(120000); // 2 minutes
  next();
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple analytics middleware for global page tracking
const { trackSimpleAnalytics } = require('./middleware/simpleAnalyticsMiddleware');
app.use(trackSimpleAnalytics);

// Note: Static file serving removed - using Cloudinary for file storage

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/schemes', require('./routes/scheme'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/analytics', require('./routes/simpleAnalytics'));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Database health check route
app.get('/api/health/database', async (req, res) => {
  try {
    const DatabaseUtils = require('./utils/database');
    const stats = await DatabaseUtils.getDatabaseStats();
    
    if (stats.success) {
      res.json({
        status: 'OK',
        message: 'Database is healthy',
        stats: stats.stats
      });
    } else {
      res.status(500).json({
        status: 'ERROR',
        message: 'Database health check failed',
        error: stats.error
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Database health check failed',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!' 
  });
});

const PORT = process.env.PORT || 5000;

// Auto-update analytics trends every hour
setInterval(async () => {
  try {
    const AnalyticsSummary = require('./models/AnalyticsSummary');
    const result = await AnalyticsSummary.updatePreviousCounts();
    console.log('📊 Auto-updated analytics trends:', result);
  } catch (error) {
    console.error('❌ Failed to auto-update analytics trends:', error);
  }
}, 60 * 60 * 1000); // 1 hour = 60 minutes * 60 seconds * 1000 milliseconds

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('📊 Analytics trends will auto-update every hour');
});