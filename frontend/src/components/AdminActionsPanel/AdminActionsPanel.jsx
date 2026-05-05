import React, { useState, useEffect } from 'react';
import { useMembership } from '../../hooks/useMembership';

const AdminActionsPanel = () => {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { membership } = useMembership();

  useEffect(() => {
    if (membership?.plan === 'pro') {
      fetchUsers();
    }
  }, [membership]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      setMessage('Failed to fetch users');
    }
  };

  const handleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAction = async () => {
    if (!action || selectedUsers.length === 0) {
      setMessage('Please select an action and at least one user');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userIds: selectedUsers
        })
      });

      if (response.ok) {
        setMessage(`Action "${action}" completed successfully`);
        setSelectedUsers([]);
        setAction('');
        await fetchUsers(); // Refresh user list
      } else {
        const error = await response.json();
        setMessage(error.message || 'Action failed');
      }
    } catch (error) {
      setMessage('Action failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = async (userId, message) => {
    try {
      await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          message,
          type: 'admin_action'
        })
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  if (membership?.plan !== 'pro') {
    return (
      <div className="admin-actions-denied">
        <h3>Admin Actions Panel</h3>
        <p>This panel is available for pro plan administrators only.</p>
      </div>
    );
  }

  return (
    <div className="admin-actions-panel">
      <h3>Admin Actions Panel</h3>
      
      {message && (
        <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="actions-section">
        <h4>Bulk Actions</h4>
        <div className="action-controls">
          <select 
            value={action} 
            onChange={(e) => setAction(e.target.value)}
            className="action-select"
          >
            <option value="">Select Action</option>
            <option value="extend_membership">Extend Membership (7 days)</option>
            <option value="send_reminder">Send Payment Reminder</option>
            <option value="grant_trial">Grant Trial Access</option>
            <option value="suspend_user">Suspend User</option>
            <option value="activate_user">Activate User</option>
          </select>

          <button 
            onClick={handleAction}
            disabled={loading || !action || selectedUsers.length === 0}
            className="execute-btn"
          >
            {loading ? 'Processing...' : 'Execute Action'}
          </button>
        </div>
      </div>

      <div className="users-section">
        <h4>Select Users</h4>
        <div className="users-list">
          {users.map(user => (
            <div key={user.id} className="user-item">
              <div className="user-info">
                <input 
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => handleUserSelection(user.id)}
                  className="user-checkbox"
                />
                <div className="user-details">
                  <span className="user-name">{user.name}</span>
                  <span className="user-email">{user.email}</span>
                  <span className={`user-status ${user.membership?.status}`}>
                    {user.membership?.status || 'No membership'}
                  </span>
                  <span className="user-plan">{user.membership?.plan || 'N/A'}</span>
                </div>
              </div>
              
              <div className="user-actions">
                <button 
                  onClick={() => sendNotification(user.id, 'Your account has been reviewed by an administrator.')}
                  className="notify-btn"
                >
                  Notify
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="selection-info">
          <p>
            {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
          </p>
          {selectedUsers.length > 0 && (
            <button 
              onClick={() => setSelectedUsers([])}
              className="clear-selection"
            >
              Clear Selection
            </button>
          )}
        </div>
      </div>

      <div className="recent-actions">
        <h4>Recent Actions</h4>
        <div className="actions-log">
          <div className="log-placeholder">
            <p>Recent admin actions would appear here</p>
            <small>Integration with audit logs needed</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminActionsPanel;
