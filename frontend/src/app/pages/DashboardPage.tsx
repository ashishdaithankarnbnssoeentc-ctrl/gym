import { useNavigate } from 'react-router';
import { Dashboard } from '../components/Dashboard';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

/**
 * DashboardPage - Authenticated dashboard with react-router navigation
 */
export function DashboardPage() {
  const navigate = useNavigate();
  const { userData, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.info('You have been signed out', {
        description: 'Come back soon!',
      });
      navigate('/', { replace: true });
    } catch (error) {
      toast.error('Error signing out', {
        description: 'Please try again.',
      });
    }
  };

  const handleNavigateHome = () => {
    navigate('/', { replace: true });
  };

  // userData should always exist due to AuthGuard, but add fallback for safety
  if (!userData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-white/60 text-sm">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <Dashboard
      onSignOut={handleSignOut}
      userData={userData}
      onNavigateHome={handleNavigateHome}
    />
  );
}
