import React, { useState, useEffect } from 'react';
import { useMembership } from '../../hooks/useMembership';

const RetentionDashboard = () => {
  const [retentionData, setRetentionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { membership } = useMembership();

  useEffect(() => {
    if (membership?.plan === 'pro') {
      fetchRetentionData();
    } else {
      setLoading(false);
      setError('Retention analytics available for pro plans only');
    }
  }, [membership]);

  const fetchRetentionData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/retention-analytics');
      if (!response.ok) throw new Error('Failed to fetch retention data');
      
      const data = await response.json();
      setRetentionData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading retention analytics...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="retention-dashboard">
      <h3>Retention Analytics Dashboard</h3>
      
      {retentionData && (
        <>
          <div className="retention-overview">
            <div className="overview-cards">
              <div className="card">
                <h4>Overall Retention Rate</h4>
                <div className="metric">{retentionData.overallRetention}%</div>
              </div>
              
              <div className="card">
                <h4>Monthly Churn Rate</h4>
                <div className="metric">{retentionData.monthlyChurn}%</div>
              </div>
              
              <div className="card">
                <h4>Active Users</h4>
                <div className="metric">{retentionData.activeUsers}</div>
              </div>
              
              <div className="card">
                <h4>At Risk Users</h4>
                <div className="metric warning">{retentionData.atRiskUsers}</div>
              </div>
            </div>
          </div>

          <div className="retention-by-plan">
            <h4>Retention by Plan</h4>
            <div className="plan-retention">
              {Object.entries(retentionData.retentionByPlan).map(([plan, data]) => (
                <div key={plan} className="plan-card">
                  <h5>{plan.charAt(0).toUpperCase() + plan.slice(1)} Plan</h5>
                  <div className="retention-metrics">
                    <div className="metric">
                      <span>Retention:</span>
                      <strong>{data.retention}%</strong>
                    </div>
                    <div className="metric">
                      <span>Churn:</span>
                      <strong>{data.churn}%</strong>
                    </div>
                    <div className="metric">
                      <span>Users:</span>
                      <strong>{data.totalUsers}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="retention-trends">
            <h4>Retention Trends (Last 6 Months)</h4>
            <div className="trends-chart">
              <div className="chart-placeholder">
                <p>Retention trend chart would go here</p>
                <small>Integration with charting library needed</small>
              </div>
            </div>
          </div>

          <div className="at-risk-users">
            <h4>Users at Risk of Churn</h4>
            <div className="risk-list">
              {retentionData.atRiskUsersList?.slice(0, 5).map(user => (
                <div key={user.id} className="risk-user">
                  <div className="user-info">
                    <span className="user-name">{user.name}</span>
                    <span className="user-plan">{user.plan}</span>
                  </div>
                  <div className="risk-factors">
                    <span className="risk-score">Risk Score: {user.riskScore}%</span>
                    <span className="last-active">Last Active: {user.lastActive}</span>
                  </div>
                  <button className="intervention-btn">
                    Send Intervention
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="retention-actions">
            <h4>Recommended Actions</h4>
            <div className="actions-list">
              {retentionData.recommendedActions?.map((action, index) => (
                <div key={index} className="action-item">
                  <div className="action-content">
                    <h5>{action.title}</h5>
                    <p>{action.description}</p>
                    <div className="action-impact">
                      <span>Expected Impact: {action.impact}</span>
                      <span>Effort: {action.effort}</span>
                    </div>
                  </div>
                  <button className="implement-btn">
                    Implement
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RetentionDashboard;
