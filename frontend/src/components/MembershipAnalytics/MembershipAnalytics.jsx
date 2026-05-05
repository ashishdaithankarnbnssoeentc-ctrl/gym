import React, { useState, useEffect } from 'react';
import { useMembership } from '../../hooks/useMembership';

const MembershipAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { membership } = useMembership();

  useEffect(() => {
    if (membership?.plan === 'premium' || membership?.plan === 'pro') {
      fetchAnalytics();
    } else {
      setLoading(false);
      setError('Analytics available for premium and pro plans only');
    }
  }, [membership]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/membership/analytics');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading analytics...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="membership-analytics">
      <h3>Membership Analytics</h3>
      
      <div className="analytics-grid">
        <div className="metric-card">
          <h4>Membership Status</h4>
          <div className={`status ${membership?.status}`}>
            {membership?.status?.toUpperCase()}
          </div>
        </div>

        <div className="metric-card">
          <h4>Current Plan</h4>
          <div className="plan">{membership?.plan}</div>
        </div>

        <div className="metric-card">
          <h4>Next Payment</h4>
          <div className="payment-date">
            {membership?.nextPaymentDate 
              ? new Date(membership.nextPaymentDate).toLocaleDateString()
              : 'N/A'
            }
          </div>
        </div>

        {analytics && (
          <>
            <div className="metric-card">
              <h4>Total Sessions</h4>
              <div className="metric-value">{analytics.totalSessions}</div>
            </div>

            <div className="metric-card">
              <h4>Active Days</h4>
              <div className="metric-value">{analytics.activeDays}</div>
            </div>

            <div className="metric-card">
              <h4>Usage Score</h4>
              <div className="metric-value">{analytics.usageScore}%</div>
            </div>
          </>
        )}
      </div>

      {analytics && (
        <div className="usage-chart">
          <h4>Usage Overview</h4>
          <div className="chart-placeholder">
            <p>Chart visualization would go here</p>
            <small>Integration with charting library needed</small>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembershipAnalytics;
