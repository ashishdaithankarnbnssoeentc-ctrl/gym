import { useNavigate } from 'react-router';
import { JoinNow } from '../components/JoinNow';

/**
 * JoinNowPage - Handles registration with react-router navigation
 */
export function JoinNowPage() {
  const navigate = useNavigate();

  const handleJoinSuccess = () => {
    navigate('/dashboard', { replace: true });
  };

  const handleBack = () => {
    navigate('/', { replace: true });
  };

  const handleSwitchToSignIn = () => {
    navigate('/signin', { replace: true });
  };

  return (
    <JoinNow
      onBack={handleBack}
      onSwitchToSignIn={handleSwitchToSignIn}
      onJoinSuccess={handleJoinSuccess}
    />
  );
}
