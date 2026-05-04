/**
 * Membership Gate Component
 * 
 * UI-level access control component
 * Blocks access to features based on membership status
 */

import React from 'react';
import { useMembershipUI } from '../hooks/useMembership.js';

/**
 * Higher-order component for membership-based access control
 */
export function withMembershipGate(requiredPlan = 'basic') {
  return function WrappedComponent(props) {
    const { renderMembershipGate } = useMembershipUI();

    return renderMembershipGate(requiredPlan, WrappedComponent, props);
  };
}

/**
 * Standalone membership gate component
 */
export default function MembershipGate({ 
  requiredPlan = 'basic', 
  children, 
  fallback = null,
  showUpgradeButton = true 
}) {
  const { renderMembershipGate } = useMembershipUI();

  return renderMembershipGate(requiredPlan, children, fallback, showUpgradeButton);
}
