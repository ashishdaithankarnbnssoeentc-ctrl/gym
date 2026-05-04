/**
 * Global Membership Hook
 * 
 * Provides membership state across the entire application
 * Handles UI-level access control and membership checks
 */

import { useState, useEffect, useContext, createContext } from 'react';

// Create context for global membership state
const MembershipContext = createContext(null);

/**
 * Membership Provider Component
 * Wraps the app and provides membership state
 */
export function MembershipProvider({ children }) {
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMembership();
  }, []);

  const fetchMembership = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/me');
      
      if (!response.ok) {
        throw new Error('Failed to fetch membership');
      }
      
      const data = await response.json();
      setMembership(data.membership);
    } catch (err) {
      console.error('[MEMBERSHIP HOOK ERROR]', err);
      setError(err.message);
      setMembership(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshMembership = () => {
    fetchMembership();
  };

  const value = {
    membership,
    loading,
    error,
    refreshMembership,
    // Helper functions
    isActive: membership?.status === 'active',
    isExpired: membership?.status === 'expired',
    plan: membership?.plan,
    nextPaymentDate: membership?.nextPaymentDate,
    daysUntilExpiry: membership?.nextPaymentDate 
      ? Math.ceil((new Date(membership.nextPaymentDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null
  };

  return (
    <MembershipContext.Provider value={value}>
      {children}
    </MembershipContext.Provider>
  );
}

/**
 * Custom hook to use membership context
 */
export function useMembership() {
  const context = useContext(MembershipContext);
  
  if (context === undefined) {
    throw new Error('useMembership must be used within a MembershipProvider');
  }
  
  return context;
}

/**
 * Hook for membership-based access control
 * Returns whether user can access a feature based on plan
 */
export function useMembershipAccess() {
  const { isActive, isExpired, plan } = useMembership();

  const canAccessFeature = (requiredPlan = 'basic') => {
    if (!isActive || isExpired) {
      return {
        allowed: false,
        reason: 'Membership inactive or expired',
        action: 'renew'
      };
    }

    const planHierarchy = {
      'basic': 1,
      'premium': 2,
      'pro': 3
    };

    const userLevel = planHierarchy[plan] || 0;
    const requiredLevel = planHierarchy[requiredPlan] || 0;

    if (userLevel < requiredLevel) {
      return {
        allowed: false,
        reason: 'Plan upgrade required',
        action: 'upgrade',
        currentPlan: plan,
        requiredPlan
      };
    }

    return {
      allowed: true,
      reason: 'Access granted',
      currentPlan: plan
    };
  };

  const canAccessBasic = () => canAccessFeature('basic');
  const canAccessPremium = () => canAccessFeature('premium');
  const canAccessPro = () => canAccessFeature('pro');

  return {
    canAccessFeature,
    canAccessBasic,
    canAccessPremium,
    canAccessPro,
    // Quick checks
    hasBasicAccess: canAccessBasic().allowed,
    hasPremiumAccess: canAccessPremium().allowed,
    hasProAccess: canAccessPro().allowed
  };
}

/**
 * Hook for membership status messaging
 * Returns user-friendly messages based on membership state
 */
export function useMembershipStatus() {
  const { isActive, isExpired, plan, daysUntilExpiry } = useMembership();

  const getStatusMessage = () => {
    if (isExpired) {
      return {
        type: 'error',
        message: 'Your membership has expired',
        action: 'Please renew to continue access',
        actionType: 'renew'
      };
    }

    if (!isActive) {
      return {
        type: 'warning',
        message: 'No active membership found',
        action: 'Please subscribe to continue',
        actionType: 'subscribe'
      };
    }

    if (daysUntilExpiry !== null) {
      if (daysUntilExpiry <= 3) {
        return {
          type: 'urgent',
          message: `Your membership expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`,
          action: 'Renew now to avoid interruption',
          actionType: 'renew'
        };
      }
      
      if (daysUntilExpiry <= 7) {
        return {
          type: 'warning',
          message: `Your membership expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`,
          action: 'Renew soon to continue access',
          actionType: 'renew'
        };
      }
    }

    return {
      type: 'success',
      message: `Active ${plan} membership`,
      action: 'Enjoy full access to all features',
      actionType: 'none'
    };
  };

  const getStatusColor = () => {
    const status = getStatusMessage();
    switch (status.type) {
      case 'error':
        return '#dc3545';
      case 'urgent':
        return '#ffc107';
      case 'warning':
        return '#fd7e14';
      case 'success':
        return '#28a745';
      default:
        return '#6c757d';
    }
  };

  return {
    getStatusMessage,
    getStatusColor,
    isExpiringSoon: daysUntilExpiry !== null && daysUntilExpiry <= 7,
    isExpiringUrgent: daysUntilExpiry !== null && daysUntilExpiry <= 3
  };
}

/**
 * Hook for membership UI controls
 * Returns components and handlers for membership-based UI
 */
export function useMembershipUI() {
  const { isActive, isExpired, plan, refreshMembership } = useMembership();
  const { canAccessFeature } = useMembershipAccess();
  const { getStatusMessage, getStatusColor } = useMembershipStatus();

  const renderMembershipGate = (requiredPlan = 'basic', children) => {
    const access = canAccessFeature(requiredPlan);
    
    if (!access.allowed) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '2px solid #dee2e6'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h3 style={{ color: getStatusColor(), margin: '0 0 16px 0' }}>
            {access.reason}
          </h3>
          <p style={{ color: '#6c757d', margin: '0 0 24px 0' }}>
            {access.action}
          </p>
          {access.actionType === 'upgrade' && (
            <div style={{ marginTop: '24px' }}>
              <p style={{ marginBottom: '16px' }}>
                Current plan: <strong>{access.currentPlan}</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                Required: <strong>{access.requiredPlan}</strong>
              </p>
              <button
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Upgrade Now
              </button>
            </div>
          )}
          
          {access.actionType === 'renew' && (
            <div style={{ marginTop: '24px' }}>
              <button
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Renew Membership
              </button>
            </div>
          )}
          
          {access.actionType === 'subscribe' && (
            <div style={{ marginTop: '24px' }}>
              <button
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Subscribe Now
              </button>
            </div>
          )}
        </div>
      );
    }

    return children;
  };

  const renderMembershipBadge = () => {
    if (!isActive || isExpired) {
      return null;
    }

    const colors = {
      basic: '#6c757d',
      premium: '#fd7e14',
      pro: '#28a745'
    };

    return (
      <span style={{
        backgroundColor: colors[plan] || '#6c757d',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold',
        textTransform: 'uppercase'
      }}>
        {plan}
      </span>
    );
  };

  return {
    renderMembershipGate,
    renderMembershipBadge,
    refreshMembership,
    statusMessage: getStatusMessage(),
    statusColor: getStatusColor()
  };
}

export default MembershipProvider;
