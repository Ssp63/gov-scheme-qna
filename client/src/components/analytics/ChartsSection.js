import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import './ChartsSection.css';

const ChartsSection = ({ 
  overview = {},
  loading = false 
}) => {
  const chartRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  // Color palette for charts
  const colors = {
    primary: '#d97706',
    secondary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#8b5cf6'
  };


  // Create simple bar chart data from overview stats
  const createBarChartData = () => {
    return [
      {
        name: 'Page Views',
        value: overview.pageViews || 0,
        color: colors.primary
      },
      {
        name: 'Unique Sessions', 
        value: overview.uniqueSessions || 0,
        color: colors.secondary
      },
      {
        name: 'Search Queries',
        value: overview.searchQueries || 0,
        color: colors.success
      },
      {
        name: 'Chat Interactions',
        value: overview.chatInteractions || 0,
        color: colors.warning
      }
    ];
  };


  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="tooltip-item" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading || !isMounted) {
    return (
      <div className="charts-section loading">
        <div className="charts-header">
          <div className="skeleton-title"></div>
        </div>
        <div className="charts-content">
          <div className="skeleton-chart"></div>
        </div>
      </div>
    );
  }

  const barChartData = createBarChartData();

  return (
    <div className="charts-section" ref={chartRef}>
      <div className="charts-header">
        <h2>Analytics Overview</h2>
      </div>

      <div className="charts-content">
        <div className="chart-container">
          <h3>Activity Metrics</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  fill={colors.primary}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartsSection;
