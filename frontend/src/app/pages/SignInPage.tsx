import { useNavigate } from 'react-router';
import { SignIn } from '../components/SignIn';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

/**
 * SignInPage - Handles sign-in with react-router navigation
 */
export function SignInPage() {
  const navigate = useNavigate();
  const { setUserData } = useAuth();

  const handleSignInSuccess = () => {
    navigate('/dashboard', { replace: true });
  };

  const handleBack = () => {
    navigate('/', { replace: true });
  };

  const handleSwitchToJoin = () => {
    navigate('/joinnow', { replace: true });
  };

  return (
    <SignIn
      onBack={handleBack}
      onSwitchToJoin={handleSwitchToJoin}
      onSignInSuccess={handleSignInSuccess}
    />
  );
}
