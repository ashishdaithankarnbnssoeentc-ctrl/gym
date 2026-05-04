/**
 * Expired User Actions Component
 * 
 * Provides clear action paths for expired users
 * No payment gateway - just contact/admin actions
 */

import React, { useState } from 'react';

export default function ExpiredUserActions({ 
  membership, 
  onContactAdmin, 
  onRenewRequest 
}) {
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);

  const handleContactAdmin = async () => {
    if (!contactMessage.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onContactAdmin({
        message: contactMessage,
        membershipId: membership.id,
        plan: membership.plan
      });
      
      setContactMessage('');
      setShowContactForm(false);
      
      // Show success message
      alert('Your message has been sent to the admin. We will contact you soon.');
    } catch (err) {
      console.error('[CONTACT ADMIN ERROR]', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenewRequest = async () => {
    setIsSubmitting(true);
    try {
      await onRenewRequest({
        membershipId: membership.id,
        plan: membership.plan
      });
      
      // Show success message
      alert('Your renewal request has been received. We will contact you with payment instructions.');
    } catch (err) {
      console.error('[RENEW REQUEST ERROR]', err);
      alert('Failed to send renewal request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const daysExpired = membership.daysExpired || 
    Math.ceil((Date.now() - new Date(membership.nextPaymentDate).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div style={{
      backgroundColor: '#fff5f5',
      border: '2px solid #feb2b2',
      borderRadius: '8px',
      padding: '24px',
      textAlign: 'center',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      {/* Expiration Notice */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔴</div>
        <h2 style={{ 
          color: '#dc3545', 
          margin: '0 0 8px 0',
          fontSize: '24px'
        }}>
          Membership Expired
        </h2>
        <p style={{ 
          color: '#6c757d', 
          margin: '0 0 16px 0',
          fontSize: '16px'
        }}>
          Your {membership.plan} membership expired {daysExpired} day{daysExpired === 1 ? '' : 's'} ago
        </p>
      </div>

      {/* Action Options */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ 
          color: '#333', 
          margin: '0 0 16px 0',
          fontSize: '18px'
        }}>
          What would you like to do?
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Renew Option */}
          <button
            onClick={handleRenewRequest}
            disabled={isSubmitting}
            style={{
              padding: '16px 24px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? 'Processing...' : '🔄 Request Renewal'}
          </button>

          {/* Contact Admin Option */}
          <button
            onClick={() => setShowContactForm(!showContactForm)}
            disabled={isSubmitting}
            style={{
              padding: '16px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            💬 Contact Admin
          </button>
        </div>
      </div>

      {/* Contact Form */}
      {showContactForm && (
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '6px',
          padding: '16px',
          textAlign: 'left'
        }}>
          <h4 style={{ 
            margin: '0 0 12px 0', 
            color: '#333' 
          }}>
            Send Message to Admin
          </h4>
          
          <textarea
            value={contactMessage}
            onChange={(e) => setContactMessage(e.target.value)}
            placeholder="Please let us know how we can help you..."
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '12px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '14px',
              resize: 'vertical',
              marginBottom: '12px'
            }}
          />
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleContactAdmin}
              disabled={isSubmitting || !contactMessage.trim()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: (isSubmitting || !contactMessage.trim()) ? 'not-allowed' : 'pointer',
                opacity: (isSubmitting || !contactMessage.trim()) ? 0.7 : 1
              }}
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
            
            <button
              onClick={() => {
                setShowContactForm(false);
                setContactMessage('');
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div style={{
        backgroundColor: '#e7f3ff',
        border: '1px solid #b3d9ff',
        borderRadius: '6px',
        padding: '16px',
        textAlign: 'left'
      }}>
        <h4 style={{ 
          margin: '0 0 8px 0', 
          color: '#004085',
          fontSize: '14px'
        }}>
          💡 What happens next?
        </h4>
        <ul style={{ 
          margin: '0', 
          paddingLeft: '20px',
          color: '#004085',
          fontSize: '14px'
        }}>
          <li style={{ marginBottom: '4px' }}>
            <strong>Renewal Request:</strong> We'll contact you with payment instructions
          </li>
          <li style={{ marginBottom: '4px' }}>
            <strong>Contact Admin:</strong> We'll respond within 24 hours
          </li>
          <li style={{ marginBottom: '4px' }}>
            <strong>No Data Loss:</strong> Your account and data are preserved
          </li>
        </ul>
      </div>

      {/* Contact Info */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px'
      }}>
        <p style={{ 
          margin: '0', 
          color: '#6c757d',
          fontSize: '14px'
        }}>
          Need immediate help? Email us at support@yourapp.com
        </p>
      </div>
    </div>
  );
}
