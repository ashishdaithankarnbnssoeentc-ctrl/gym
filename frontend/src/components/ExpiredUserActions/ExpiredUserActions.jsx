import React, { useState, useEffect } from 'react';
import { useMembership } from '../../hooks/useMembership';

const ExpiredUserActions = () => {
  const { membership, loading } = useMembership();
  const [renewalOptions, setRenewalOptions] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (membership?.status === 'expired') {
      fetchRenewalOptions();
    }
  }, [membership]);

  const fetchRenewalOptions = async () => {
    try {
      const response = await fetch('/api/membership/renewal-options');
      if (response.ok) {
        const options = await response.json();
        setRenewalOptions(options);
      }
    } catch (error) {
      console.error('Failed to fetch renewal options:', error);
    }
  };

  const handleRenewal = async (planId) => {
    try {
      setProcessing(true);
      const response = await fetch('/api/membership/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });

      if (response.ok) {
        window.location.href = '/membership/success';
      } else {
        const error = await response.json();
        alert(error.message || 'Renewal failed');
      }
    } catch (error) {
      alert('Renewal failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  if (membership?.status !== 'expired') {
    return null;
  }

  return (
    <div className="expired-user-actions">
      <div className="expired-notice">
        <h3>Membership Expired</h3>
        <p>
          Your membership expired on {new Date(membership.nextPaymentDate).toLocaleDateString()}.
          Renew now to continue enjoying our services.
        </p>
      </div>

      <div className="renewal-options">
        <h4>Choose a Plan to Renew:</h4>
        <div className="plans-grid">
          {renewalOptions.map(plan => (
            <div 
              key={plan.id}
              className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''}`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              <div className="plan-header">
                <h5>{plan.name}</h5>
                <div className="price">${plan.price}/month</div>
              </div>
              
              <div className="plan-features">
                {plan.features.map((feature, index) => (
                  <div key={index} className="feature">
                    <span className="checkmark">✓</span>
                    {feature}
                  </div>
                ))}
              </div>

              <button 
                className={`renew-btn ${selectedPlan === plan.id ? 'active' : ''}`}
                onClick={() => handleRenewal(plan.id)}
                disabled={processing || selectedPlan !== plan.id}
              >
                {processing ? 'Processing...' : 'Renew Now'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="expired-benefits">
        <h4>Why Renew?</h4>
        <ul>
          <li>Continue accessing all premium features</li>
          <li>Maintain your progress and data</li>
          <li>Get priority customer support</li>
          <li>Access to new features and updates</li>
        </ul>
      </div>

      <div className="support-section">
        <p>
          Need help? Contact our support team at{' '}
          <a href="mailto:support@elitefitness.com">support@elitefitness.com</a>
        </p>
      </div>
    </div>
  );
};

export default ExpiredUserActions;
