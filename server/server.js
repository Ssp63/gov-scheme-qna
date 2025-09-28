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

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
    }
  }
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/schemes', require('./routes/scheme'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/upload', require('./routes/upload'));

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});