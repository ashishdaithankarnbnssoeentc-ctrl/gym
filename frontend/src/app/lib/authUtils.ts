/**
 * Production-Stable Authentication Utilities
 *
 * Handles:
 * - Backend user sync
 * - Token refresh
 * - Error handling
 * - Session persistence
 */

import { User } from 'firebase/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Sync authenticated user to backend database
 * Critical: Ensures backend user record exists for all operations
 */
export async function syncUserToBackend(user: User): Promise<void> {
  try {
    const token = await user.getIdToken();

    const response = await fetch(`${API_BASE_URL}/api/auth/sync-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'User',
        last_name: user.displayName?.split(' ').slice(1).join(' ') || '',
        phone: user.phoneNumber || null,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to sync user to backend');
    }

    console.log('✅ User synced to backend successfully');
  } catch (error) {
    console.error('❌ Backend sync failed:', error);
    // Don't throw - allow login to proceed even if backend sync fails
  }
}

/**
 * Get current auth token (always fresh)
 * Used for API requests
 *
 * SECURITY: Always fetches fresh token, never from localStorage
 */
export async function getAuthToken(user: User | null): Promise<string | null> {
  if (!user) return null;

  try {
    // Always get fresh token - Firebase handles caching internally
    const token = await user.getIdToken();
    return token;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

/**
 * Production-ready error messages
 */
export const AUTH_ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  'auth/popup-blocked': {
    title: 'Popup Blocked',
    description: 'Please allow popups for this site and try again.',
  },
  'auth/network-request-failed': {
    title: 'Network Error',
    description: 'Check your internet connection and try again.',
  },
  'auth/unauthorized-domain': {
    title: 'Domain Not Authorized',
    description: 'This domain is not authorized. Please contact support.',
  },
  'auth/popup-closed-by-user': {
    title: 'Sign-in Cancelled',
    description: 'You closed the sign-in window. Please try again.',
  },
  'auth/cancelled-popup-request': {
    title: 'Multiple Attempts Detected',
    description: 'Please wait a moment and try again.',
  },
  'auth/user-not-found': {
    title: 'Account Not Found',
    description: 'No account exists with this email. Please sign up first.',
  },
  'auth/wrong-password': {
    title: 'Incorrect Password',
    description: 'The password you entered is incorrect.',
  },
  'auth/invalid-credential': {
    title: 'Invalid Credentials',
    description: 'Incorrect email or password. Please try again.',
  },
  'auth/too-many-requests': {
    title: 'Too Many Attempts',
    description: 'Please wait a few minutes before trying again.',
  },
  'auth/user-disabled': {
    title: 'Account Disabled',
    description: 'This account has been disabled. Contact support.',
  },
};

/**
 * Get user-friendly error message from Firebase error code
 */
export function getAuthError(errorCode: string): { title: string; description: string } {
  return AUTH_ERROR_MESSAGES[errorCode] || {
    title: 'Authentication Failed',
    description: 'An unexpected error occurred. Please try again.',
  };
}

/**
 * Convert backend profile to UserData format
 */
export function convertBackendProfileToUserData(profile: any): any {
  return {
    firstName: profile.first_name,
    lastName: profile.last_name,
    email: profile.email,
    phone: profile.phone,
    dateOfBirth: profile.date_of_birth,
    membershipPlan: profile.membership_plan,
    location: profile.location,
    joinDate: profile.join_date,
    uid: profile.firebase_uid,
    emergencyContact: profile.emergency_contact,
    goals: profile.goals,
    preferredClasses: profile.preferred_classes,
  };
}

/**
 * Get user profile from backend
 * GET /api/auth/me
 */
export async function getUserProfile(user: User): Promise<any | null> {
  try {
    const token = await user.getIdToken();

    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      // User not found in database
      return null;
    }

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const data = await response.json();
    return data.user || data;
  } catch (error) {
    console.error('Failed to get user profile:', error);
    return null;
  }
}

/**
 * Update user profile via backend
 * PATCH /api/auth/me
 */
export async function updateUserProfile(user: User, updates: any): Promise<any | null> {
  try {
    const token = await user.getIdToken();

    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update user profile');
    }

    const data = await response.json();
    return data.user || data;
  } catch (error) {
    console.error('Failed to update user profile:', error);
    return null;
  }
}

/**
 * Check if running on localhost or production domain
 */
export function isAuthorizedDomain(): boolean {
  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.firebaseapp.com') ||
    hostname.endsWith('.web.app') ||
    hostname.endsWith('.figma.site')
  );
}
