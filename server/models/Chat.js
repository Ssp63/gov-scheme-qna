const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: [true, 'Session ID is required'],
    index: true
  },
  schemeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scheme',
    required: [true, 'Scheme ID is required']
  },
  messages: [{
    messageId: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['user', 'bot', 'system'],
      required: true
    },
    content: {
      text: {
        type: String,
        required: true,
        maxlength: [2000, 'Message text cannot exceed 2000 characters']
      },
      textMarathi: {
        type: String // Translated version
      },
      audio: {
        type: String // Base64 encoded audio or file path
      },
      language: {
        type: String,
        enum: ['en', 'mr'],
        default: 'mr'
      }
    },
    metadata: {
      inputMethod: {
        type: String,
        enum: ['text', 'voice'],
        default: 'text'
      },
      processingTime: {
        type: Number // Time taken to process in milliseconds
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1
      }
    },
    sources: [{
      documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document'
      },
      chunkId: {
        type: String
      },
      relevanceScore: {
        type: Number,
        min: 0,
        max: 1
      },
      pageNumber: {
        type: Number
      },
      excerpt: {
        type: String,
        maxlength: [500, 'Excerpt cannot exceed 500 characters']
      }
    }],
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  userInfo: {
    ipAddress: {
      type: String
    },
    userAgent: {
      type: String
    },
    preferredLanguage: {
      type: String,
      enum: ['en', 'mr'],
      default: 'mr'
    },
    location: {
      state: String,
      district: String,
      taluka: String
    }
  },
  analytics: {
    totalMessages: {
      type: Number,
      default: 0
    },
    totalUserMessages: {
      type: Number,
      default: 0
    },
    totalBotMessages: {
      type: Number,
      default: 0
    },
    sessionDuration: {
      type: Number, // Duration in minutes
      default: 0
    },
    avgResponseTime: {
      type: Number, // Average response time in milliseconds
      default: 0
    },
    satisfactionRating: {
      type: Number,
      min: 1,
      max: 5
    },
    issues: [{
      type: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  },
  status: {
    type: String,
    enum: ['active', 'ended', 'abandoned'],
    default: 'active'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
chatSchema.index({ sessionId: 1 });
chatSchema.index({ schemeId: 1 });
chatSchema.index({ status: 1 });
chatSchema.index({ startTime: -1 });
chatSchema.index({ 'userInfo.preferredLanguage': 1 });
chatSchema.index({ 'messages.timestamp': -1 });

// Virtual for message count
chatSchema.virtual('messageCount').get(function() {
  return this.messages.length;
});

// Update analytics before saving
chatSchema.pre('save', function(next) {
  this.analytics.totalMessages = this.messages.length;
  this.analytics.totalUserMessages = this.messages.filter(msg => msg.type === 'user').length;
  this.analytics.totalBotMessages = this.messages.filter(msg => msg.type === 'bot').length;
  
  // Calculate session duration if ended
  if (this.endTime && this.startTime) {
    this.analytics.sessionDuration = Math.round((this.endTime - this.startTime) / (1000 * 60)); // in minutes
  }
  
  // Calculate average response time
  const botMessages = this.messages.filter(msg => msg.type === 'bot');
  if (botMessages.length > 0) {
    const totalResponseTime = botMessages.reduce((sum, msg) => {
      return sum + (msg.metadata.processingTime || 0);
    }, 0);
    this.analytics.avgResponseTime = Math.round(totalResponseTime / botMessages.length);
  }
  
  next();
});

// Method to add a new message
chatSchema.methods.addMessage = function(type, content, metadata = {}, sources = []) {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  this.messages.push({
    messageId,
    type,
    content,
    metadata,
    sources,
    timestamp: new Date()
  });
  
  return messageId;
};

// Method to end session
chatSchema.methods.endSession = function(rating = null) {
  this.status = 'ended';
  this.endTime = new Date();
  if (rating) {
    this.analytics.satisfactionRating = rating;
  }
};

// Static method to find active sessions
chatSchema.statics.findActiveSessions = function() {
  return this.find({ status: 'active' });
};

// Static method to get chat analytics
chatSchema.statics.getAnalytics = function(schemeId = null, dateRange = null) {
  const match = {};
  if (schemeId) match.schemeId = schemeId;
  if (dateRange) {
    match.createdAt = {
      $gte: dateRange.start,
      $lte: dateRange.end
    };
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        totalMessages: { $sum: '$analytics.totalMessages' },
        avgSessionDuration: { $avg: '$analytics.sessionDuration' },
        avgResponseTime: { $avg: '$analytics.avgResponseTime' },
        avgSatisfactionRating: { $avg: '$analytics.satisfactionRating' }
      }
    }
  ]);
};

module.exports = mongoose.model('Chat', chatSchema);