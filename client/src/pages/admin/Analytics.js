import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import StatsCard from '../../components/analytics/StatsCard';
import ChartsSection from '../../components/analytics/ChartsSection';
import ErrorBoundary from '../../components/analytics/ErrorBoundary';
import './Analytics.css';

// Icons for stats cards
import { 
  FaEye, 
  FaUsers, 
  FaSearch, 
  FaComments,
  FaSync
} from 'react-icons/fa';

const Analytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const analyticsRef = useRef(null);
  
  // Analytics data state
  const [overview, setOverview] = useState(null);

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async (showRefresh = false) => {
    if (!isMounted) return;
    
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Fetch simple analytics data
      const overviewResponse = await apiService.analytics.getOverview();

      setOverview(overviewResponse.data.data.overview || {});

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      // Set default values on error
      setOverview({});
    } finally {
      if (isMounted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [isMounted]);

  // Initial data fetch
  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!isMounted) return;
    
    const interval = setInterval(() => {
      if (isMounted) {
        console.log('Auto-refreshing analytics data...');
        fetchAnalyticsData(true);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearInterval(interval);
    };
  }, [fetchAnalyticsData, isMounted]);


  // Handle manual refresh
  const handleRefresh = () => {
    fetchAnalyticsData(true);
  };


  // Format numbers for display
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };


  if (loading || !isMounted) {
    return (
      <div className="analytics-page">
        <div className="container">
          <div className="analytics-header">
            <div className="skeleton-title"></div>
            <div className="skeleton-controls"></div>
          </div>
          <div className="analytics-stats">
            {[1, 2, 3, 4].map(i => (
              <StatsCard key={i} loading={true} />
            ))}
          </div>
          <ChartsSection loading={true} />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="analytics-page" ref={analyticsRef}>
        <div className="container">
        {/* Header */}
        <div className="analytics-header">
          <div className="header-content">
            <button 
              className="back-button"
              onClick={() => navigate('/admin/dashboard')}
            >
              ← Back to Dashboard
            </button>
            <h1>Analytics Dashboard</h1>
            <p>Track user engagement and system performance</p>
          </div>
          <div className="header-controls">
            <div className="action-buttons">
              <button 
                className="btn-refresh"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <FaSync className={refreshing ? 'spinning' : ''} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="analytics-stats">
          <StatsCard
            title="Total Page Views"
            value={formatNumber(overview?.pageViews || 0)}
            icon={<FaEye />}
            color="blue"
            subtitle="All page visits"
            trend={overview?.pageViewsTrend}
          />
          <StatsCard
            title="Unique Sessions"
            value={formatNumber(overview?.uniqueSessions || 0)}
            icon={<FaUsers />}
            color="green"
            subtitle="Individual visitors"
            trend={overview?.uniqueSessionsTrend}
          />
          <StatsCard
            title="Search Queries"
            value={formatNumber(overview?.searchQueries || 0)}
            icon={<FaSearch />}
            color="orange"
            subtitle="User searches"
            trend={overview?.searchQueriesTrend}
          />
          <StatsCard
            title="Chat Interactions"
            value={formatNumber(overview?.chatInteractions || 0)}
            icon={<FaComments />}
            color="purple"
            subtitle="AI conversations"
            trend={overview?.chatInteractionsTrend}
          />
        </div>

        {/* Charts Section */}
        <ChartsSection
          overview={overview}
          loading={loading}
        />


        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Analytics;
