import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

interface PublicRouteProps {
  children: React.ReactNode;
  /** If true, redirects authenticated users to dashboard */
  redirectIfAuthenticated?: boolean;
}

/**
 * PublicRoute - Wrapper for public routes
 *
 * Optionally redirects authenticated users away from auth pages
 * (e.g., if user is already logged in, don't show login page)
 */
export function PublicRoute({
  children,
  redirectIfAuthenticated = false
}: PublicRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && redirectIfAuthenticated) {
      // User is authenticated, redirect to dashboard
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, redirectIfAuthenticated, navigate]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-white/60 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
