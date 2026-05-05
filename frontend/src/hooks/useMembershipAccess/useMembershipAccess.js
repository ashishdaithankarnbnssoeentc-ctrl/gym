import { useState, useEffect } from 'react';
import { useMembership } from '../useMembership/useMembership';

export const useMembershipAccess = (requiredPlan = 'basic') => {
  const { membership, loading } = useMembership();
  const [hasAccess, setHasAccess] = useState(false);
  const [accessReason, setAccessReason] = useState('');

  const planHierarchy = {
    basic: 1,
    premium: 2,
    pro: 3
  };

  useEffect(() => {
    if (!loading && membership) {
      const userPlanLevel = planHierarchy[membership.plan] || 0;
      const requiredPlanLevel = planHierarchy[requiredPlan] || 0;
      
      if (membership.status !== 'active') {
        setHasAccess(false);
        setAccessReason('Membership is not active');
      } else if (userPlanLevel < requiredPlanLevel) {
        setHasAccess(false);
        setAccessReason(`Requires ${requiredPlan} plan or higher`);
      } else {
        setHasAccess(true);
        setAccessReason('');
      }
    } else if (!loading && !membership) {
      setHasAccess(false);
      setAccessReason('No membership found');
    }
  }, [membership, loading, requiredPlan]);

  const canAccessFeature = (feature) => {
    if (!hasAccess) return false;
    
    const featurePlans = {
      'content': ['basic', 'premium', 'pro'],
      'favorites': ['premium', 'pro'],
      'analytics': ['premium', 'pro'],
      'admin': ['pro'],
      'notifications': ['basic', 'premium', 'pro']
    };

    const allowedPlans = featurePlans[feature] || [];
    return allowedPlans.includes(membership?.plan);
  };

  const getUpgradeMessage = () => {
    if (hasAccess) return '';
    
    if (membership?.status !== 'active') {
      return 'Your membership is not active. Please renew to access this feature.';
    }
    
    return `This feature requires a ${requiredPlan} plan or higher. Upgrade your membership to unlock this feature.`;
  };

  const getUpgradeUrl = () => {
    if (membership?.status !== 'active') {
      return '/membership/renew';
    }
    return '/membership/plans';
  };

  return {
    hasAccess,
    loading,
    accessReason,
    canAccessFeature,
    getUpgradeMessage,
    getUpgradeUrl,
    currentPlan: membership?.plan,
    membershipStatus: membership?.status
  };
};
