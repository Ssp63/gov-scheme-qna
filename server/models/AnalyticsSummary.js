const mongoose = require('mongoose');

const analyticsSummarySchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    unique: true,
    enum: ['page_view', 'unique_session', 'search_query', 'chat_interaction']
  },
  count: {
    type: Number,
    default: 0
  },
  previousCount: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Static method to get all analytics summary with trends
analyticsSummarySchema.statics.getAnalyticsSummary = async function() {
  const summary = await this.find().sort({ eventType: 1 });
  
  // Helper function to calculate percentage change
  const calculateTrend = (current, previous) => {
    if (previous === 0) return { type: 'neutral', value: '0%' };
    const change = ((current - previous) / previous) * 100;
    return {
      type: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      value: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`
    };
  };
  
  // Get individual metrics with trends
  const pageViewsData = summary.find(s => s.eventType === 'page_view');
  const uniqueSessionsData = summary.find(s => s.eventType === 'unique_session');
  const searchQueriesData = summary.find(s => s.eventType === 'search_query');
  const chatInteractionsData = summary.find(s => s.eventType === 'chat_interaction');
  
  return {
    pageViews: pageViewsData?.count || 0,
    pageViewsTrend: calculateTrend(pageViewsData?.count || 0, pageViewsData?.previousCount || 0),
    uniqueSessions: uniqueSessionsData?.count || 0,
    uniqueSessionsTrend: calculateTrend(uniqueSessionsData?.count || 0, uniqueSessionsData?.previousCount || 0),
    searchQueries: searchQueriesData?.count || 0,
    searchQueriesTrend: calculateTrend(searchQueriesData?.count || 0, searchQueriesData?.previousCount || 0),
    chatInteractions: chatInteractionsData?.count || 0,
    chatInteractionsTrend: calculateTrend(chatInteractionsData?.count || 0, chatInteractionsData?.previousCount || 0)
  };
};

// Static method to increment a specific event type
analyticsSummarySchema.statics.incrementEvent = async function(eventType) {
  const result = await this.findOneAndUpdate(
    { eventType: eventType },
    { 
      $inc: { count: 1 },
      $set: { lastUpdated: new Date() }
    },
    { 
      upsert: true, // Create if doesn't exist
      new: true 
    }
  );
  return result;
};

// Static method to reset all counters (for testing)
analyticsSummarySchema.statics.resetAll = async function() {
  await this.deleteMany({});
  console.log('Analytics summary reset');
};

// Static method to update previous counts (call this daily/weekly)
analyticsSummarySchema.statics.updatePreviousCounts = async function() {
  try {
    const allEvents = await this.find();
    
    for (const event of allEvents) {
      await this.findByIdAndUpdate(event._id, {
        previousCount: event.count,
        lastUpdated: new Date()
      });
    }
    
    console.log('📊 Updated previous counts for trend calculation');
    return { success: true, updated: allEvents.length };
  } catch (error) {
    console.error('Error updating previous counts:', error);
    return { success: false, error: error.message };
  }
};

module.exports = mongoose.model('AnalyticsSummary', analyticsSummarySchema);
