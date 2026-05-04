/**
 * User Notifications Component
 * 
 * Shows internal notifications from database
 * No external messaging - clean UI layer
 */

import React, { useEffect, useState } from 'react';

export default function UserNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/notifications');
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      setNotifications(data.notifications || []);
      setError(null);
    } catch (err) {
      console.error('[USER NOTIFICATIONS ERROR]', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`/api/user/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (err) {
      console.error('[MARK NOTIFICATION READ ERROR]', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/user/notifications/read-all', {
        method: 'PATCH'
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (err) {
      console.error('[MARK ALL NOTIFICATIONS READ ERROR]', err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'reminder':
        return '⏰';
      case 'expired':
        return '🔴';
      case 'cancelled':
        return '🚫';
      case 'extended':
        return '✅';
      case 'welcome':
        return '🎉';
      default:
        return '📢';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return '#dc3545';
      case 'soon':
        return '#f59e0b';
      case 'upcoming':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading notifications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#dc3545' }}>
        <p>Error: {error}</p>
        <button 
          onClick={fetchNotifications}
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

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        borderBottom: '1px solid #dee2e6',
        paddingBottom: '10px'
      }}>
        <h3 style={{ margin: 0, color: '#333' }}>
          Notifications {unreadCount > 0 && `(${unreadCount})`}
        </h3>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              style={{
                padding: '6px 12px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Mark All Read
            </button>
          )}
          
          <button 
            onClick={fetchNotifications}
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

      {notifications.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#6c757d',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <p style={{ margin: 0, fontSize: '16px' }}>No notifications</p>
          <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#868e96' }}>
            You're all caught up! Check back later for updates.
          </p>
        </div>
      ) : (
        <div>
          {notifications.map(notification => (
            <div 
              key={notification.id}
              style={{
                backgroundColor: notification.read ? '#f8f9fa' : 'white',
                border: `1px solid ${notification.read ? '#dee2e6' : getPriorityColor(notification.priority)}`,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px',
                boxShadow: notification.read ? 'none' : '0 2px 4px rgba(0,0,0,0.1)',
                cursor: notification.read ? 'default' : 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => !notification.read && markAsRead(notification.id)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ fontSize: '20px', lineHeight: 1 }}>
                  {getNotificationIcon(notification.notification_type)}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: getPriorityColor(notification.priority),
                        fontSize: '12px',
                        padding: '2px 6px',
                        backgroundColor: `${getPriorityColor(notification.priority)}20`,
                        borderRadius: '4px'
                      }}>
                        {notification.priority.toUpperCase()}
                      </span>
                      
                      {!notification.read && (
                        <span style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 'bold'
                        }}>
                          NEW
                        </span>
                      )}
                    </div>
                    
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                      {new Date(notification.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div style={{ 
                    fontSize: '14px', 
                    lineHeight: 1.5,
                    color: '#333',
                    marginBottom: '8px'
                  }}>
                    {notification.message}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
