import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { User, onIdTokenChanged } from 'firebase/auth';
import {
  auth,
  observeAuthState,
  getCurrentUserData,
  signOut as firebaseSignOut,
  UserData,
  handleRedirectResult
} from '../lib/firebase';
import { syncUserToBackend } from '../lib/authUtils';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signOut: () => Promise<void>;
  setUserData: (data: UserData | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [userData, setUserData] = React.useState<UserData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const syncedRef = React.useRef(false);

  // Handle Google redirect result on app load
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const redirectUserData = await handleRedirectResult();
        if (redirectUserData) {
          setUserData(redirectUserData);
          syncedRef.current = true; // Mark as synced to prevent duplicate
          console.log('✅ Redirect sign-in complete');
        }
      } catch (error) {
        console.error('Redirect handling error:', error);
      }
    };

    checkRedirect();
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = observeAuthState(async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch user data - getCurrentUserData now queries backend API first
        const data = await getCurrentUserData(firebaseUser);
        setUserData(data);

        // Sync to backend ONCE (prevent double sync on redirect + auth listener)
        if (!syncedRef.current) {
          await syncUserToBackend(firebaseUser);
          syncedRef.current = true;
        }
      } else {
        setUserData(null);
        syncedRef.current = false; // Reset on logout
      }

      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Listen to token changes - Firebase auto-refreshes tokens
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Token refreshed automatically by Firebase
        console.log('🔄 Auth token auto-refreshed');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await firebaseSignOut();
      setUser(null);
      setUserData(null);
      syncedRef.current = false;

      // Clear any cached state
      localStorage.clear();

      // Force reload to clear all app state
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out');
      throw error;
    }
  };

  const value = {
    user,
    userData,
    loading,
    signOut: handleSignOut,
    setUserData,
  };

  // Show loader during initial auth check (prevents flicker)
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};