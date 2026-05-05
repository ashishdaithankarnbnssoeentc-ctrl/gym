import React, { useState, useEffect } from 'react';
import { useMembership } from '../../hooks/useMembership';

const MembershipGate = ({ children, requiredPlan = 'basic', fallback = null }) => {
  const { membership, loading } = useMembership();
  const [hasAccess, setHasAccess] = useState(false);

  const planHierarchy = {
    basic: 1,
    premium: 2,
    pro: 3
  };

  useEffect(() => {
    if (!loading && membership) {
      const userPlanLevel = planHierarchy[membership.plan] || 0;
      const requiredPlanLevel = planHierarchy[requiredPlan] || 0;
      
      setHasAccess(
        membership.status === 'active' && 
        userPlanLevel >= requiredPlanLevel
      );
    }
  }, [membership, loading, requiredPlan]);

  if (loading) {
    return (
      <div className="membership-gate-loading">
        <div className="loading-spinner"></div>
        <p>Verifying membership...</p>
      </div>
    );
  }

  if (!hasAccess) {
    if (fallback) {
      return fallback;
    }

    return (
      <div className="membership-gate-denied">
        <div className="gate-content">
          <h3>Membership Required</h3>
          <p>
            {membership?.status !== 'active' 
              ? 'Your membership is not active. Please renew your membership to access this content.'
              : `This content requires a ${requiredPlan} plan or higher.`
            }
          </p>
          
          {membership && (
            <div className="current-membership">
              <p>Current Plan: <strong>{membership.plan}</strong></p>
              <p>Status: <strong>{membership.status}</strong></p>
              {membership.nextPaymentDate && (
                <p>Next Payment: {new Date(membership.nextPaymentDate).toLocaleDateString()}</p>
              )}
            </div>
          )}

          <div className="upgrade-actions">
            <button 
              onClick={() => window.location.href = '/membership/plans'}
              className="upgrade-btn"
            >
              {membership?.status !== 'active' ? 'Renew Membership' : 'Upgrade Plan'}
            </button>
            <button 
              onClick={() => window.history.back()}
              className="back-btn"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default MembershipGate;
