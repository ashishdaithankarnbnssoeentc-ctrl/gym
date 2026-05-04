import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  linkWithCredential,
  User,
  ConfirmationResult
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { setLogLevel } from 'firebase/app';
import { syncUserToBackend, getUserProfile, updateUserProfile, convertBackendProfileToUserData } from './authUtils';
import { trackAuthError } from './monitoring';
import { canAttemptLogin } from '../utils/rateLimit';
import { authAnalytics } from './analytics';
import { sendAlert } from './alerting';

// Clean logging in production - hide noise, keep errors
const isProd = import.meta.env.PROD;

if (isProd) {
  console.log = () => { };
  console.info = () => { };
  console.warn = () => { };
  // Keep console.error for debugging real issues
}

try {
  setLogLevel('error'); // Only show Firebase errors, not warnings or info
} catch (e) {
  // Ignore if setLogLevel is not available
}

// Firebase configuration - Uses environment variables from .env with production fallbacks
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCymV2NjthGVNV2N71xpRt2e-RND8qshkg',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'elite-fitness-9ecf5.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'elite-fitness-9ecf5',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'elite-fitness-9ecf5.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '657674679661',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:657674679661:web:2c9f6f1e423f464d3c1664',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-LNE3HD8V2X'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with offline persistence and suppressed warnings
let db: ReturnType<typeof getFirestore>;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    }),
    // Suppress network error warnings
    ignoreUndefinedProperties: true
  });
} catch (error) {
  // Fallback to basic Firestore if advanced config fails
  db = getFirestore(app);
}

export { db };

// Suppress ALL Firebase SDK warnings in console (expanded filter)
const originalConsoleWarn = console.warn;
console.warn = (...args: any[]) => {
  const message = args.join(' ');

  // Filter out ALL Firebase warnings (Firestore, Auth, Storage, etc.)
  if (
    message.includes('@firebase/') &&
    (message.includes('WebChannelConnection') ||
      message.includes('Could not reach') ||
      message.includes('transport errored') ||
      message.includes('auth/') ||
      message.includes('Network error') ||
      message.includes('Connection failed'))
  ) {
    return; // Suppress Firebase SDK warnings
  }

  originalConsoleWarn.apply(console, args);
};

// Auth providers
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

// User data interface
export interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  membershipPlan: string;
  location: string;
  joinDate: string;
  uid: string;
}

// Sign up with email and password
export const signUpWithEmail = async (
  email: string,
  password: string,
  userData: Partial<UserData>
): Promise<UserData> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user document
    const newUserData: UserData = {
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      email: user.email || email,
      phone: userData.phone,
      dateOfBirth: userData.dateOfBirth,
      membershipPlan: userData.membershipPlan || 'basic',
      location: userData.location || '',
      joinDate: new Date().toISOString(),
      uid: user.uid,
    };

    // Save to both databases (non-blocking - don't fail registration if databases are unavailable)
    Promise.all([
      syncUserToBackend(user).catch(() => null),
      setDoc(doc(db, 'users', user.uid), newUserData).catch(() => null)
    ]);

    return newUserData;
  } catch (err: any) {
    // Log error code for debugging
    console.error('[SIGNUP ERROR]', err.code);

    // User-friendly error messages
    const errorMessages: Record<string, string> = {
      'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/weak-password': 'Password should be at least 6 characters long.',
      'auth/network-request-failed': 'Network error. Please check your connection and try again.',
    };

    throw new Error(errorMessages[err.code] || err.message || 'Failed to create account');
  }
};

// Sign in with email and password
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<UserData> => {
  // Rate limiting protection
  const rateLimitCheck = canAttemptLogin();
  if (!rateLimitCheck.allowed) {
    const seconds = Math.ceil((rateLimitCheck.retryAfter || 0) / 1000);
    authAnalytics.rateLimited(rateLimitCheck.retryAfter || 0);
    sendAlert('rate_limit_exceeded');
    throw new Error(`Too many login attempts. Please wait ${seconds} seconds and try again.`);
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Track successful auth
    authAnalytics.success('email');

    // Try backend first
    try {
      const backendProfile = await getUserProfile(user);
      if (backendProfile) {
        return convertBackendProfileToUserData(backendProfile);
      }
    } catch (e) {
      // Backend unavailable, continue to Firestore
    }

    // Fallback to Firestore
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        return userDoc.data() as UserData;
      }
    } catch (e) {
      // Firestore unavailable, use basic auth data
    }

    // If both databases fail or no data exists, create basic profile from auth
    const basicUserData: UserData = {
      firstName: user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'User',
      lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
      email: user.email || email,
      membershipPlan: 'basic',
      location: '',
      joinDate: new Date().toISOString(),
      uid: user.uid,
    };

    // Try to save for next time (non-blocking)
    Promise.all([
      syncUserToBackend(user).catch(() => null),
      setDoc(doc(db, 'users', user.uid), basicUserData).catch(() => null)
    ]);

    return basicUserData;
  } catch (err: any) {
    // Log error code for debugging
    console.error('[AUTH ERROR]', err.code);

    // Track to Sentry
    trackAuthError(err.code, email);

    // Track analytics
    authAnalytics.failed(err.code, email);

    // Send alert for auth failure spike
    sendAlert('auth_failure_spike');

    // User-friendly error messages
    const errorMessages: Record<string, string> = {
      'auth/user-not-found': 'No account found with this email. Please sign up first.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/invalid-credential': 'Incorrect email or password. Please try again.',
      'auth/user-disabled': 'This account has been disabled. Please contact support.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection and try again.',
    };

    throw new Error(errorMessages[err.code] || err.message || 'Failed to sign in');
  }
};

// Sign in with Google (Production-Stable Redirect Flow)
export const signInWithGoogle = async (): Promise<void> => {
  try {
    // Use redirect instead of popup - works on all environments
    await signInWithRedirect(auth, googleProvider);
    // User will be redirected away - result handled by handleRedirectResult
  } catch (error: any) {
    console.error('Google sign-in error');

    // Handle specific error codes
    if (error.code === 'auth/unauthorized-domain') {
      throw new Error('This domain is not authorized for Google sign-in. Please contact support or use email sign-in instead.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your connection and try again.');
    }

    throw new Error(error.message || 'Failed to sign in with Google');
  }
};

// Handle redirect result after Google sign-in
export const handleRedirectResult = async (): Promise<UserData | null> => {
  try {
    const result = await getRedirectResult(auth);

    if (!result || !result.user) {
      return null; // No redirect result (normal page load)
    }

    const user = result.user;
    console.log('✅ Google redirect sign-in successful');

    // Check if user data exists in backend first
    const backendProfile = await getUserProfile(user);
    if (backendProfile) {
      return convertBackendProfileToUserData(backendProfile);
    }

    // Check Firestore as fallback
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (userDoc.exists()) {
      return userDoc.data() as UserData;
    } else {
      // Create new user document
      const displayNameParts = user.displayName?.split(' ') || ['', ''];
      const userData: UserData = {
        firstName: displayNameParts[0] || 'User',
        lastName: displayNameParts.slice(1).join(' ') || '',
        email: user.email || '',
        membershipPlan: 'basic',
        location: '',
        joinDate: new Date().toISOString(),
        uid: user.uid,
      };

      // Sync to backend first (primary database)
      try {
        await syncUserToBackend(user);
        console.log('✅ User profile synced to backend');
      } catch (backendError) {
        console.error('❌ Failed to sync to backend:', backendError);
      }

      // Save to Firestore (backup)
      try {
        await setDoc(doc(db, 'users', user.uid), userData);
        console.log('✅ Google user profile saved to Firestore (backup)');
      } catch (firestoreError) {
        console.error('⚠️ Failed to save to Firestore:', firestoreError);
      }

      return userData;
    }
  } catch (error: any) {
    console.error('Redirect result error:', error);

    // Don't throw for normal cases (no redirect)
    if (error.code === 'auth/unauthorized-domain') {
      throw new Error('This domain is not authorized for Google sign-in.');
    }

    return null;
  }
};

// Sign in with Facebook
export const signInWithFacebook = async (): Promise<UserData> => {
  try {
    const result = await signInWithPopup(auth, facebookProvider);
    const user = result.user;

    // Check if user data exists in backend first
    const backendProfile = await getUserProfile(user);
    if (backendProfile) {
      return convertBackendProfileToUserData(backendProfile);
    }

    // Check Firestore as fallback
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (userDoc.exists()) {
      return userDoc.data() as UserData;
    } else {
      // Create new user document
      const displayNameParts = user.displayName?.split(' ') || ['', ''];
      const userData: UserData = {
        firstName: displayNameParts[0] || 'User',
        lastName: displayNameParts.slice(1).join(' ') || '',
        email: user.email || '',
        membershipPlan: 'basic',
        location: '',
        joinDate: new Date().toISOString(),
        uid: user.uid,
      };

      // Sync to backend first (primary database)
      try {
        await syncUserToBackend(user);
        console.log('✅ Facebook user profile synced to backend');
      } catch (backendError) {
        console.error('❌ Failed to sync to backend:', backendError);
      }

      // Save to Firestore (backup)
      try {
        await setDoc(doc(db, 'users', user.uid), userData);
        console.log('✅ Facebook user profile saved to Firestore (backup)');
      } catch (firestoreError) {
        console.error('⚠️ Failed to save to Firestore:', firestoreError);
      }

      return userData;
    }
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign in with Facebook');
  }
};

// Sign out
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign out');
  }
};

// Get current user data
export const getCurrentUserData = async (user: User): Promise<UserData | null> => {
  try {
    // Query backend first instead of Firestore
    const backendProfile = await getUserProfile(user);

    if (backendProfile) {
      // Return data from backend (this is the correct source)
      return convertBackendProfileToUserData(backendProfile);
    }

    // Only if backend has no record, check Firestore as fallback
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserData;
    }

    // If no data exists in either database, this is a brand new user
    // Create a basic profile from auth data (but DON'T save it yet)
    const displayNameParts = user.displayName?.split(' ') || ['', ''];
    const basicUserData: UserData = {
      firstName: displayNameParts[0] || user.email?.split('@')[0] || 'User',
      lastName: displayNameParts.slice(1).join(' ') || '',
      email: user.email || '',
      phone: user.phoneNumber || '',
      membershipPlan: 'basic',
      location: '',
      joinDate: new Date().toISOString(), // Only for genuinely new users
      uid: user.uid,
    };

    return basicUserData;
  } catch (error: any) {
    // Handle offline errors gracefully - return basic user data from auth
    if (error.code === 'unavailable' || error.message?.includes('offline')) {
      console.log('Database offline - using cached auth data');

      const displayNameParts = user.displayName?.split(' ') || ['', ''];
      return {
        firstName: displayNameParts[0] || user.email?.split('@')[0] || 'User',
        lastName: displayNameParts.slice(1).join(' ') || '',
        email: user.email || '',
        phone: user.phoneNumber || '',
        membershipPlan: 'basic',
        location: '',
        joinDate: new Date().toISOString(),
        uid: user.uid,
      };
    }

    // For other errors, log and return null
    console.warn('Error fetching user data:', error.code || error.message);
    return null;
  }
};

// Auth state observer
export const observeAuthState = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Phone Authentication
let recaptchaVerifier: RecaptchaVerifier | null = null;

export const setupRecaptcha = (elementId: string): RecaptchaVerifier => {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      },
      'expired-callback': () => {
        // Response expired
        if (recaptchaVerifier) {
          recaptchaVerifier.clear();
          recaptchaVerifier = null;
        }
      }
    });
  }
  return recaptchaVerifier;
};

export const clearRecaptcha = () => {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
};

// Sign in with phone number
export const signInWithPhone = async (
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> => {
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    return confirmationResult;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to send verification code');
  }
};

// Verify OTP code
export const verifyOTP = async (
  confirmationResult: ConfirmationResult,
  code: string
): Promise<UserData> => {
  try {
    const result = await confirmationResult.confirm(code);
    const user = result.user;

    // Check if user data exists in backend first
    const backendProfile = await getUserProfile(user);
    if (backendProfile) {
      return convertBackendProfileToUserData(backendProfile);
    }

    // Check Firestore as fallback
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (userDoc.exists()) {
      return userDoc.data() as UserData;
    } else {
      // Create new user document
      const userData: UserData = {
        firstName: user.phoneNumber?.substring(0, 5) || 'User',
        lastName: '',
        email: user.email || '',
        phone: user.phoneNumber || '',
        membershipPlan: 'basic',
        location: '',
        joinDate: new Date().toISOString(),
        uid: user.uid,
      };

      // Sync to backend first (primary database)
      try {
        await syncUserToBackend(user);
        console.log('✅ Phone OTP user profile synced to backend');
      } catch (backendError) {
        console.error('❌ Failed to sync to backend:', backendError);
      }

      // Save to Firestore (backup)
      try {
        await setDoc(doc(db, 'users', user.uid), userData);
        console.log('✅ Phone OTP user profile saved to Firestore (backup)');
      } catch (firestoreError) {
        console.error('⚠️ Failed to save to Firestore:', firestoreError);
      }

      return userData;
    }
  } catch (error: any) {
    throw new Error(error.message || 'Invalid verification code');
  }
};

// Sign up with phone number and additional user data
export const signUpWithPhone = async (
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier,
  userData: Partial<UserData>
): Promise<{ confirmationResult: ConfirmationResult; userData: Partial<UserData> }> => {
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    return { confirmationResult, userData };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to send verification code');
  }
};

// Complete phone signup after OTP verification
export const completePhoneSignup = async (
  confirmationResult: ConfirmationResult,
  code: string,
  userData: Partial<UserData>
): Promise<UserData> => {
  try {
    const result = await confirmationResult.confirm(code);
    const user = result.user;

    // Create user document with provided data
    const newUserData: UserData = {
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      email: userData.email || '',
      phone: user.phoneNumber || userData.phone || '',
      dateOfBirth: userData.dateOfBirth,
      membershipPlan: userData.membershipPlan || 'basic',
      location: userData.location || '',
      joinDate: new Date().toISOString(),
      uid: user.uid,
    };

    // Sync to backend first (primary database)
    try {
      await syncUserToBackend(user);
      console.log('✅ Phone signup profile synced to backend');
    } catch (backendError) {
      console.error('❌ Failed to sync to backend:', backendError);
    }

    // Save to Firestore (backup)
    try {
      await setDoc(doc(db, 'users', user.uid), newUserData);
      console.log('✅ Phone signup profile saved to Firestore (backup)');
    } catch (firestoreError) {
      console.error('⚠️ Failed to save to Firestore:', firestoreError);
    }

    return newUserData;
  } catch (error: any) {
    throw new Error(error.message || 'Invalid verification code');
  }
};