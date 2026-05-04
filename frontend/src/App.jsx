/**
 * Main App Component
 * 
 * Integrates membership system with UI-level access control
 * Shows notifications and handles membership gates
 */

import React, { useState } from 'react';
import { MembershipProvider, useMembership } from './hooks/useMembership.js';
import UserNotifications from './components/UserNotifications.jsx';
import MembershipAnalytics from './components/MembershipAnalytics.jsx';
import MembershipGate from './components/MembershipGate.jsx';

// Example protected components
const BasicFeature = () => (
  <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
    <h3>Basic Feature</h3>
    <p>This is available to all active members.</p>
  </div>
);

const PremiumFeature = () => (
  <div style={{ padding: '20px', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
    <h3>Premium Feature</h3>
    <p>This requires a premium membership.</p>
  </div>
);

const ProFeature = () => (
  <div style={{ padding: '20px', backgroundColor: '#d4edda', borderRadius: '8px' }}>
    <h3>Pro Feature</h3>
    <p>This requires a pro membership.</p>
  </div>
);

function App() {
  const [showAnalytics, setShowAnalytics] = useState(false);
  const { isActive, isExpired, plan } = useMembership();

  return (
    <MembershipProvider>
      <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        {/* Header */}
        <header style={{ 
          backgroundColor: '#fff', 
          padding: '20px', 
          borderBottom: '1px solid #dee2e6',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ margin: 0, color: '#333' }}>
              SaaS Application
            </h1>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {/* Membership Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#666', fontSize: '14px' }}>Membership:</span>
                {isActive ? (
                  <span style={{ 
                    backgroundColor: '#28a745', 
                    color: 'white', 
                    padding: '4px 8px', 
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {plan?.toUpperCase() || 'ACTIVE'}
                  </span>
                ) : (
                  <span style={{ 
                    backgroundColor: '#dc3545', 
                    color: 'white', 
                    padding: '4px 8px', 
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {isExpired ? 'EXPIRED' : 'INACTIVE'}
                  </span>
                )}
              </div>
              
              {/* Navigation */}
              <nav style={{ display: 'flex', gap: '15px' }}>
                <button 
                  onClick={() => setShowAnalytics(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: showAnalytics ? '#007bff' : 'transparent',
                    color: showAnalytics ? 'white' : '#007bff',
                    border: '1px solid #007bff',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Dashboard
                </button>
                <button 
                  onClick={() => setShowAnalytics(true)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: showAnalytics ? 'transparent' : '#007bff',
                    color: showAnalytics ? '#007bff' : 'white',
                    border: '1px solid #007bff',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Analytics
                </button>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
          {!showAnalytics ? (
            <div>
              {/* Notifications Section */}
              <section style={{ marginBottom: '40px' }}>
                <UserNotifications />
              </section>

              {/* Features Section */}
              <section style={{ marginBottom: '40px' }}>
                <h2 style={{ marginBottom: '20px', color: '#333' }}>Features</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                  {/* Basic Feature - Available to all */}
                  <MembershipGate requiredPlan="basic">
                    <BasicFeature />
                  </MembershipGate>

                  {/* Premium Feature - Requires premium */}
                  <MembershipGate requiredPlan="premium">
                    <PremiumFeature />
                  </MembershipGate>

                  {/* Pro Feature - Requires pro */}
                  <MembershipGate requiredPlan="pro">
                    <ProFeature />
                  </MembershipGate>
                </div>
              </section>
            </div>
          ) : (
            /* Analytics Section */
            <section>
              <MembershipAnalytics />
            </section>
          )}
        </main>

        {/* Footer */}
        <footer style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '20px', 
          textAlign: 'center',
          borderTop: '1px solid #dee2e6',
          marginTop: '40px'
        }}>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            SaaS System with Internal Notifications | No External Messaging
          </p>
        </footer>
      </div>
    </MembershipProvider>
  );
}

export default App;
