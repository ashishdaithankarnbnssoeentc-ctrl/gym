import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Phone, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';
import { toast } from 'sonner';
import { 
  signInWithEmail, 
  signInWithGoogle, 
  signInWithFacebook,
  setupRecaptcha,
  signInWithPhone,
  verifyOTP,
  clearRecaptcha
} from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import type { ConfirmationResult } from 'firebase/auth';

interface SignInProps {
  onBack: () => void;
  onSwitchToJoin: () => void;
  onSignInSuccess: () => void;
}

export function SignIn({ onBack, onSwitchToJoin, onSignInSuccess }: SignInProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [activeTab, setActiveTab] = useState<'email' | 'phone'>('email');
  const [recaptchaInitialized, setRecaptchaInitialized] = useState(false);
  const { setUserData } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phoneNumber: '',
    rememberMe: false,
  });

  // Lazy load recaptcha only when phone tab is selected
  useEffect(() => {
    if (activeTab === 'phone' && !recaptchaInitialized) {
      const timer = setTimeout(() => {
        const recaptchaContainer = document.getElementById('recaptcha-container');
        if (recaptchaContainer && !recaptchaContainer.hasChildNodes()) {
          setupRecaptcha('recaptcha-container');
          setRecaptchaInitialized(true);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [activeTab, recaptchaInitialized]);

  useEffect(() => {
    return () => {
      if (recaptchaInitialized) {
        clearRecaptcha();
      }
    };
  }, [recaptchaInitialized]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userData = await signInWithEmail(formData.email, formData.password);
      setUserData(userData);
      toast.success(`Welcome back, ${userData.firstName}!`);
      onSignInSuccess();
    } catch (error: any) {
      toast.error('Sign in failed', {
        description: error.message || 'Please check your credentials and try again.',
      });
      
      // If no account found, offer to create one
      if (error.message?.includes('No account found')) {
        setTimeout(() => {
          toast.info('Don\'t have an account yet?', {
            description: 'Click below to create one now.',
            action: {
              label: 'Join Now',
              onClick: () => onSwitchToJoin(),
            },
            duration: 8000,
          });
        }, 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const recaptchaVerifier = setupRecaptcha('recaptcha-container');
      const result = await signInWithPhone(formData.phoneNumber, recaptchaVerifier);
      setConfirmationResult(result);
      setOtpSent(true);
      toast.success('Verification code sent!', {
        description: 'Please check your phone for the OTP code.',
      });
    } catch (error: any) {
      toast.error('Failed to send code', {
        description: error.message || 'Please try again.',
      });
      clearRecaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || otpCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);

    try {
      const userData = await verifyOTP(confirmationResult, otpCode);
      setUserData(userData);
      toast.success(`Welcome back, ${userData.firstName}!`);
      onSignInSuccess();
    } catch (error: any) {
      toast.error('Verification failed', {
        description: error.message || 'Invalid code. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // Redirect-based login - user will be redirected to Google
      // Result will be handled by AuthContext after redirect
      await signInWithGoogle();
      // This won't be reached - user redirects away
    } catch (error: any) {
      setLoading(false);

      // Enhanced error handling with helpful messages
      let errorTitle = 'Google Sign-In Failed';
      let errorDescription = error.message || 'Please try again.';

      if (error.message?.includes('unauthorized-domain') || error.message?.includes('domain')) {
        errorTitle = '🔒 Domain Not Authorized';
        errorDescription = 'Google sign-in requires domain authorization in Firebase Console. Please use Email or Phone authentication instead.';
      } else if (error.message?.includes('network')) {
        errorTitle = 'Network Error';
        errorDescription = 'Please check your internet connection and try again.';
      }

      toast.error(errorTitle, {
        description: errorDescription,
        duration: 6000,
      });
    }
  };

  const handleFacebookSignIn = async () => {
    setLoading(true);
    try {
      const userData = await signInWithFacebook();
      setUserData(userData);
      toast.success(`Welcome back, ${userData.firstName}!`);
      onSignInSuccess();
    } catch (error: any) {
      // Enhanced error handling with helpful messages
      let errorTitle = 'Facebook sign in failed';
      let errorDescription = error.message || 'Please try again.';
      
      if (error.message?.includes('unauthorized-domain')) {
        errorTitle = 'Domain Not Authorized';
        errorDescription = 'Facebook sign-in is only available on authorized domains. Please use Email or Phone authentication, or contact support.';
      } else if (error.message?.includes('popup-blocked')) {
        errorTitle = 'Popup Blocked';
        errorDescription = 'Please allow popups for this site in your browser settings and try again.';
      } else if (error.message?.includes('popup-closed')) {
        errorTitle = 'Sign-in Cancelled';
        errorDescription = 'You closed the sign-in window. Click the button again to continue.';
      }
      
      toast.error(errorTitle, {
        description: errorDescription,
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-white text-4xl md:text-5xl mb-3">Welcome Back</h1>
            <p className="text-white/60">Sign in to continue your fitness journey</p>
          </div>

          {/* Recaptcha Container */}
          <div id="recaptcha-container"></div>

          {/* Form */}
          <Tabs defaultValue="email" className="space-y-6" onValueChange={(value) => setActiveTab(value as 'email' | 'phone')}>
            <TabsList className="grid w-full grid-cols-2 bg-white/5">
              <TabsTrigger value="email" className="data-[state=active]:bg-orange-500">
                Email
              </TabsTrigger>
              <TabsTrigger value="phone" className="data-[state=active]:bg-orange-500">
                Phone
              </TabsTrigger>
            </TabsList>

            {/* Email Sign In */}
            <TabsContent value="email">
              <form onSubmit={handleEmailSubmit} className="space-y-6">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-11 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-orange-500 h-12"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="pl-11 pr-11 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-orange-500 h-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={formData.rememberMe}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, rememberMe: checked as boolean })
                      }
                      className="border-white/20"
                    />
                    <label htmlFor="remember" className="text-white/60 text-sm cursor-pointer">
                      Remember me
                    </label>
                  </div>
                  <button type="button" className="text-orange-500 hover:text-orange-400 text-sm transition-colors">
                    Forgot Password?
                  </button>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white h-12"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            {/* Phone Sign In */}
            <TabsContent value="phone">
              {!otpSent ? (
                <form onSubmit={handlePhoneSubmit} className="space-y-6">
                  {/* Phone Number */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-white">
                      Phone Number
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        className="pl-11 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-orange-500 h-12"
                        required
                      />
                    </div>
                    <p className="text-white/40 text-xs">
                      Please enter your phone number with country code (e.g., +1234567890)
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white h-12"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? 'Sending code...' : 'Send Verification Code'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleOTPVerify} className="space-y-6">
                  {/* OTP Input */}
                  <div className="space-y-2">
                    <Label className="text-white">
                      Enter Verification Code
                    </Label>
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={otpCode}
                        onChange={(value) => setOtpCode(value)}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} className="bg-white/5 border-white/10 text-white" />
                          <InputOTPSlot index={1} className="bg-white/5 border-white/10 text-white" />
                          <InputOTPSlot index={2} className="bg-white/5 border-white/10 text-white" />
                          <InputOTPSlot index={3} className="bg-white/5 border-white/10 text-white" />
                          <InputOTPSlot index={4} className="bg-white/5 border-white/10 text-white" />
                          <InputOTPSlot index={5} className="bg-white/5 border-white/10 text-white" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <p className="text-white/40 text-xs text-center">
                      Enter the 6-digit code sent to {formData.phoneNumber}
                    </p>
                  </div>

                  {/* Verify Button */}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white h-12"
                    size="lg"
                    disabled={loading || otpCode.length !== 6}
                  >
                    {loading ? 'Verifying...' : 'Verify & Sign In'}
                  </Button>

                  {/* Resend Code */}
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode('');
                      clearRecaptcha();
                    }}
                    className="w-full text-orange-500 hover:text-orange-400 text-sm transition-colors"
                  >
                    Resend Code
                  </button>
                </form>
              )}
            </TabsContent>
          </Tabs>

          {!otpSent && (
            <>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-black text-white/60">Or continue with</span>
              </div>
            </div>

            {/* Social Sign In - Temporarily Disabled */}
            <div className="space-y-3">
              {/* Info Message */}
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                <p className="text-orange-500 text-sm text-center">
                  🔒 Social sign-in temporarily unavailable
                </p>
                <p className="text-white/60 text-xs text-center mt-1">
                  Please use Email or Phone authentication
                </p>
              </div>

              {/* Disabled Google Button */}
              <div className="grid grid-cols-2 gap-4 opacity-50">
                <button
                  type="button"
                  className="border border-white/10 bg-white/5 h-12 rounded-md px-4 inline-flex items-center justify-center gap-2 w-full cursor-not-allowed"
                  disabled={true}
                  title="Google sign-in requires domain authorization. Please use Email or Phone authentication."
                >
                  <svg className="w-5 h-5" style={{ flexShrink: 0 }} viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span style={{ color: '#ffffff', fontSize: '16px', fontWeight: '500', opacity: 1, display: 'inline-block' }}>Google</span>
                </button>

                {/* Disabled Facebook Button */}
                <button
                  type="button"
                  className="border border-white/10 bg-white/5 h-12 rounded-md px-4 inline-flex items-center justify-center gap-2 w-full cursor-not-allowed"
                  disabled={true}
                  title="Facebook sign-in requires domain authorization. Please use Email or Phone authentication."
                >
                  <svg className="w-5 h-5" style={{ flexShrink: 0 }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span style={{ color: '#ffffff', fontSize: '16px', fontWeight: '500', opacity: 1, display: 'inline-block' }}>Facebook</span>
                </button>
              </div>
            </div>
          </>
          )}

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
            <p className="text-white/60">
              Don't have an account?{' '}
              <button
                onClick={onSwitchToJoin}
                className="text-orange-500 hover:text-orange-400 transition-colors"
              >
                Join Now
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1761971975769-97e598bf526b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxneW0lMjB3b3Jrb3V0JTIwbW9kZXJufGVufDF8fHx8MTc2Mjc3MTM2N3ww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Gym workout"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-red-600/20" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center">
            <h2 className="text-white text-4xl md:text-5xl mb-4">
              Your Fitness Journey Continues
            </h2>
            <p className="text-white/80 text-lg">
              Access your personalized workout plans, track progress, and connect with your trainer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}