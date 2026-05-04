/**
 * Membership Analytics Component
 * 
 * Shows decision-making power for administrators
 * Displays membership trends, revenue, and user metrics
 */

import React, { useEffect, useState } from 'react';

export default function MembershipAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/analytics/memberships?period=${period}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      
      const analyticsData = await response.json();
      setData(analyticsData.analytics);
    } catch (err) {
      console.error('[ANALYTICS ERROR]', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (score) => {
    if (score >= 90) return '#28a745';
    if (score >= 80) return '#ffc107';
    if (score >= 70) return '#fd7e14';
    if (score >= 50) return '#fd7e14';
    return '#dc3545';
  };

  const getTrendIcon = (current, previous) => {
    if (current > previous) return '📈';
    if (current < previous) return '📉';
    return '➡️';
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#dc3545' }}>
        <p>Error: {error}</p>
        <button 
          onClick={fetchAnalytics}
          style={{ 
            marginTop: '10px', 
            padding: '8px 16px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>No analytics data available</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '30px',
        borderBottom: '1px solid #dee2e6',
        paddingBottom: '20px'
      }}>
        <h2 style={{ margin: 0, color: '#333' }}>
          Membership Analytics
        </h2>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ fontSize: '14px', color: '#666' }}>Period:</label>
          <select 
            value={period}
            onChange={(e) => setPeriod(parseInt(e.target.value))}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid #ced4da',
              fontSize: '14px'
            }}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          
          <button 
            onClick={fetchAnalytics}
            style={{
              padding: '6px 12px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px', 
        marginBottom: '30px' 
      }}>
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>Total Memberships</h4>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#007bff' }}>
            {data.summary.totalMemberships}
          </div>
        </div>

        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>Active Memberships</h4>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#28a745' }}>
            {data.summary.activeMemberships}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            {data.summary.totalMemberships > 0 ? 
              Math.round((data.summary.activeMemberships / data.summary.totalMemberships) * 100) : 0
            }% activation rate
          </div>
        </div>

        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>Expiring Soon</h4>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffc107' }}>
            {data.summary.expiringMemberships}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            Need attention in next 30 days
          </div>
        </div>

        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>Expired</h4>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#dc3545' }}>
            {data.summary.expiredMemberships}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            {data.summary.totalMemberships > 0 ? 
              Math.round((data.summary.expiredMemberships / data.summary.totalMemberships) * 100) : 0
            }% churn rate
          </div>
        </div>

        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>Health Score</h4>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            color: getHealthColor(data.summary.healthScore) 
          }}>
            {data.summary.healthScore}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            System health indicator
          </div>
        </div>
      </div>

      {/* Plan Breakdown */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '30px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>
          Plan Distribution
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {Object.entries(data.planBreakdown).map(([plan, stats]) => (
            <div key={plan} style={{
              backgroundColor: 'white',
              padding: '16px',
              borderRadius: '6px',
              border: '1px solid #dee2e6'
            }}>
              <h4 style={{ 
                margin: '0 0 10px 0', 
                textTransform: 'capitalize',
                color: '#333'
              }}>
                {plan}
              </h4>
              
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#666', fontSize: '14px' }}>Active:</span>
                <span style={{ 
                  marginLeft: '8px', 
                  fontSize: '18px', 
                  fontWeight: 'bold',
                  color: '#28a745'
                }}>
                  {stats.active || 0}
                </span>
              </div>
              
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#666', fontSize: '14px' }}>Expired:</span>
                <span style={{ 
                  marginLeft: '8px', 
                  fontSize: '18px', 
                  fontWeight: 'bold',
                  color: '#dc3545'
                }}>
                  {stats.expired || 0}
                </span>
              </div>
              
              <div>
                <span style={{ color: '#666', fontSize: '14px' }}>Cancelled:</span>
                <span style={{ 
                  marginLeft: '8px', 
                  fontSize: '18px', 
                  fontWeight: 'bold',
                  color: '#6c757d'
                }}>
                  {stats.cancelled || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Insights */}
      <div style={{ 
        backgroundColor: '#fff3cd', 
        padding: '20px', 
        borderRadius: '8px', 
        border: '1px solid #ffeaa7'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#856404' }}>
          Key Insights
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {data.summary.expiringMemberships > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <div>
                <strong>{data.summary.expiringMemberships}</strong> memberships expiring soon
                <div style={{ fontSize: '12px', color: '#856404' }}>
                  Action: Send renewal reminders or extend memberships
                </div>
              </div>
            </div>
          )}
          
          {data.summary.expiredMemberships > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🔴</span>
              <div>
                <strong>{data.summary.expiredMemberships}</strong> memberships expired
                <div style={{ fontSize: '12px', color: '#856404' }}>
                  Action: Contact users for reactivation or cleanup
                </div>
              </div>
            </div>
          )}
          
          {data.summary.healthScore < 70 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>📉</span>
              <div>
                <strong>Low retention rate</strong>
                <div style={{ fontSize: '12px', color: '#856404' }}>
                  Action: Review membership value and pricing
                </div>
              </div>
            </div>
          )}
          
          {data.summary.activeMemberships / data.summary.totalMemberships > 0.8 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🎉</span>
              <div>
                <strong>High activation rate</strong>
                <div style={{ fontSize: '12px', color: '#155724' }}>
                  Action: Focus on retention and upselling
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Last Updated */}
      <div style={{ 
        textAlign: 'center', 
        color: '#6c757d', 
        fontSize: '12px',
        marginTop: '20px'
      }}>
        Last updated: {new Date(data.generated_at).toLocaleString()}
      </div>
    </div>
  );
}
