import React, { useState, useEffect } from 'react';
import { useMembership } from '../../hooks/useMembership';

const AuditLogsViewer = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    action: '',
    userId: '',
    dateRange: '7days'
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { membership } = useMembership();

  useEffect(() => {
    if (membership?.plan === 'pro') {
      fetchLogs();
    } else {
      setLoading(false);
      setError('Audit logs available for pro plans only');
    }
  }, [membership, filters, page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...filters
      });

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      
      const data = await response.json();
      setLogs(data.logs);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(`/api/admin/audit-logs/export?${params}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      setError('Failed to export logs');
    }
  };

  const getActionColor = (action) => {
    const colors = {
      'create': 'success',
      'update': 'info',
      'delete': 'danger',
      'extend': 'primary',
      'cancel': 'warning',
      'pause': 'secondary',
      'upgrade': 'success',
      'downgrade': 'warning'
    };
    return colors[action] || 'secondary';
  };

  if (membership?.plan !== 'pro') {
    return (
      <div className="audit-logs-denied">
        <h3>Audit Logs Viewer</h3>
        <p>Audit logs are available for pro plan administrators only.</p>
      </div>
    );
  }

  return (
    <div className="audit-logs-viewer">
      <h3>Audit Logs Viewer</h3>
      
      {error && (
        <div className="error-message">{error}</div>
      )}

      <div className="filters-section">
        <h4>Filters</h4>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Action Type:</label>
            <select 
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="extend">Extend</option>
              <option value="cancel">Cancel</option>
              <option value="pause">Pause</option>
              <option value="upgrade">Upgrade</option>
              <option value="downgrade">Downgrade</option>
            </select>
          </div>

          <div className="filter-group">
            <label>User ID:</label>
            <input 
              type="text"
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              placeholder="Enter user ID"
            />
          </div>

          <div className="filter-group">
            <label>Date Range:</label>
            <select 
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            >
              <option value="1day">Last 24 hours</option>
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
            </select>
          </div>

          <div className="filter-actions">
            <button onClick={fetchLogs} className="apply-filters-btn">
              Apply Filters
            </button>
            <button onClick={exportLogs} className="export-btn">
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="logs-section">
        {loading ? (
          <div className="loading">Loading audit logs...</div>
        ) : (
          <>
            <div className="logs-header">
              <h4>Audit Logs ({logs.length} entries)</h4>
            </div>

            <div className="logs-table">
              <div className="table-header">
                <div className="header-cell">Timestamp</div>
                <div className="header-cell">User</div>
                <div className="header-cell">Action</div>
                <div className="header-cell">Resource</div>
                <div className="header-cell">IP Address</div>
                <div className="header-cell">Details</div>
              </div>

              <div className="table-body">
                {logs.map(log => (
                  <div key={log.id} className="table-row">
                    <div className="cell timestamp">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                    <div className="cell user">
                      <div className="user-info">
                        <span className="user-id">{log.user_id}</span>
                        <span className="tenant-id">{log.tenant_id}</span>
                      </div>
                    </div>
                    <div className="cell action">
                      <span className={`action-badge ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </div>
                    <div className="cell resource">
                      {log.resource_type || 'N/A'}
                    </div>
                    <div className="cell ip">
                      {log.ip_address || 'N/A'}
                    </div>
                    <div className="cell details">
                      <button 
                        className="details-btn"
                        onClick={() => {/* Show details modal */}}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="page-btn"
                >
                  Previous
                </button>
                
                <span className="page-info">
                  Page {page} of {totalPages}
                </span>
                
                <button 
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="page-btn"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuditLogsViewer;
