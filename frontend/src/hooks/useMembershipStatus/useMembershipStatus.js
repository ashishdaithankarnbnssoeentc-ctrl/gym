import { useState, useEffect } from 'react';
import { useMembership } from '../useMembership/useMembership';

export const useMembershipStatus = () => {
  const { membership, loading } = useMembership();
  const [statusInfo, setStatusInfo] = useState({
    isActive: false,
    isExpired: false,
    isCancelled: false,
    isPaused: false,
    daysUntilExpiry: null,
    gracePeriodDays: null,
    canRenew: false,
    canUpgrade: false,
    canDowngrade: false,
    canPause: false,
    canCancel: false
  });

  useEffect(() => {
    if (!loading && membership) {
      const now = new Date();
      const nextPaymentDate = membership.nextPaymentDate ? new Date(membership.nextPaymentDate) : null;
      const daysUntilExpiry = nextPaymentDate ? Math.ceil((nextPaymentDate - now) / (1000 * 60 * 60 * 24)) : null;
      
      setStatusInfo({
        isActive: membership.status === 'active',
        isExpired: membership.status === 'expired',
        isCancelled: membership.status === 'cancelled',
        isPaused: membership.status === 'paused',
        daysUntilExpiry,
        gracePeriodDays: daysUntilExpiry && daysUntilExpiry < 0 ? Math.abs(daysUntilExpiry) : null,
        canRenew: ['active', 'expired'].includes(membership.status),
        canUpgrade: membership.status === 'active' && membership.plan !== 'pro',
        canDowngrade: membership.status === 'active' && membership.plan !== 'basic',
        canPause: membership.status === 'active' && membership.plan !== 'basic',
        canCancel: membership.status === 'active'
      });
    } else if (!loading && !membership) {
      setStatusInfo({
        isActive: false,
        isExpired: false,
        isCancelled: false,
        isPaused: false,
        daysUntilExpiry: null,
        gracePeriodDays: null,
        canRenew: false,
        canUpgrade: false,
        canDowngrade: false,
        canPause: false,
        canCancel: false
      });
    }
  }, [membership, loading]);

  const getStatusColor = () => {
    if (!membership) return 'secondary';
    
    switch (membership.status) {
      case 'active': return 'success';
      case 'expired': return 'danger';
      case 'cancelled': return 'warning';
      case 'paused': return 'info';
      default: return 'secondary';
    }
  };

  const getStatusText = () => {
    if (!membership) return 'No Membership';
    
    switch (membership.status) {
      case 'active': 
        return statusInfo.daysUntilExpiry > 0 
          ? `Active (${statusInfo.daysUntilExpiry} days remaining)`
          : 'Active';
      case 'expired': 
        return statusInfo.gracePeriodDays > 0 
          ? `Expired (${statusInfo.gracePeriodDays} days in grace period)`
          : 'Expired';
      case 'cancelled': return 'Cancelled';
      case 'paused': return 'Paused';
      default: return membership.status;
    }
  };

  const getPlanIcon = () => {
    if (!membership) return '🔒';
    
    switch (membership.plan) {
      case 'basic': return '🥉';
      case 'premium': return '🥈';
      case 'pro': return '🥇';
      default: return '📦';
    }
  };

  const getNextAction = () => {
    if (!membership) return { text: 'Get Started', action: '/membership/plans', priority: 'high' };
    
    if (membership.status === 'expired') {
      return { text: 'Renew Now', action: '/membership/renew', priority: 'high' };
    }
    
    if (membership.status === 'cancelled') {
      return { text: 'Reactivate', action: '/membership/plans', priority: 'medium' };
    }
    
    if (membership.status === 'paused') {
      return { text: 'Resume', action: '/membership/resume', priority: 'medium' };
    }
    
    if (statusInfo.daysUntilExpiry <= 7 && statusInfo.daysUntilExpiry > 0) {
      return { text: 'Extend', action: '/membership/extend', priority: 'medium' };
    }
    
    if (statusInfo.canUpgrade) {
      return { text: 'Upgrade', action: '/membership/upgrade', priority: 'low' };
    }
    
    return { text: 'Manage', action: '/membership/manage', priority: 'low' };
  };

  const getExpiryWarning = () => {
    if (!membership || membership.status !== 'active') return null;
    
    if (statusInfo.daysUntilExpiry <= 3 && statusInfo.daysUntilExpiry > 0) {
      return {
        level: 'urgent',
        message: `Your membership expires in ${statusInfo.daysUntilExpiry} day${statusInfo.daysUntilExpiry !== 1 ? 's' : ''}!`
      };
    }
    
    if (statusInfo.daysUntilExpiry <= 7 && statusInfo.daysUntilExpiry > 0) {
      return {
        level: 'warning',
        message: `Your membership expires in ${statusInfo.daysUntilExpiry} days.`
      };
    }
    
    return null;
  };

  return {
    ...statusInfo,
    membership,
    loading,
    getStatusColor,
    getStatusText,
    getPlanIcon,
    getNextAction,
    getExpiryWarning
  };
};
