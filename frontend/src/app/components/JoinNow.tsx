import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Lock, User, Phone, Eye, EyeOff, Calendar, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';
import { toast } from 'sonner';
import { 
  signUpWithEmail, 
  signUpWithPhone,
  completePhoneSignup,
  setupRecaptcha,
  clearRecaptcha
} from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import type { ConfirmationResult } from 'firebase/auth';

interface JoinNowProps {
  onBack: () => void;
  onSwitchToSignIn: () => void;
  onJoinSuccess: () => void;
}

export function JoinNow({ onBack, onSwitchToSignIn, onJoinSuccess }: JoinNowProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [usePhoneAuth, setUsePhoneAuth] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const { setUserData } = useAuth();
  
  const [formData, setFormData] = useState({
    // Step 1: Personal Info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    
    // Step 2: Membership
    membershipPlan: '',
    location: '',
    
    // Step 3: Account
    password: '',
    confirmPassword: '',
    termsAccepted: false,
    marketingAccepted: false,
  });

  useEffect(() => {
    // Setup recaptcha on mount
    const recaptchaContainer = document.getElementById('recaptcha-container-join');
    if (recaptchaContainer && !recaptchaContainer.hasChildNodes()) {
      setupRecaptcha('recaptcha-container-join');
    }

    return () => {
      clearRecaptcha();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      // Step 3: Create account
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match', {
          description: 'Please make sure both passwords are the same.',
        });
        return;
      }

      if (!formData.termsAccepted) {
        toast.error('Please accept the terms', {
          description: 'You must accept the Terms of Service to continue.',
        });
        return;
      }

      setLoading(true);

      try {
        if (usePhoneAuth) {
          // Send OTP for phone authentication
          const recaptchaVerifier = setupRecaptcha('recaptcha-container-join');
          const { confirmationResult: result } = await signUpWithPhone(
            formData.phone, 
            recaptchaVerifier,
            formData
          );
          setConfirmationResult(result);
          setOtpSent(true);
          toast.success('Verification code sent!', {
            description: 'Please check your phone for the OTP code.',
          });
        } else {
          // Email/password registration
          const userData = await signUpWithEmail(formData.email, formData.password, {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            dateOfBirth: formData.dateOfBirth,
            membershipPlan: formData.membershipPlan,
            location: formData.location,
          });
          setUserData(userData);
          toast.success(`Welcome to Elite Fitness, ${userData.firstName}!`, {
            description: 'Your account has been created successfully.',
          });
          onJoinSuccess();
        }
      } catch (error: any) {
        toast.error('Registration failed', {
          description: error.message || 'Please try again.',
        });
        
        // If email is already in use, offer to switch to sign in
        if (error.message?.includes('already registered')) {
          setTimeout(() => {
            toast.info('Already have an account?', {
              description: 'Click below to sign in instead.',
              action: {
                label: 'Sign In',
                onClick: () => onSwitchToSignIn(),
              },
              duration: 8000,
            });
          }, 1000);
        }
        
        if (usePhoneAuth) {
          clearRecaptcha();
        }
      } finally {
        setLoading(false);
      }
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
      const userData = await completePhoneSignup(confirmationResult, otpCode, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        membershipPlan: formData.membershipPlan,
        location: formData.location,
      });
      setUserData(userData);
      toast.success(`Welcome to Elite Fitness, ${userData.firstName}!`, {
        description: 'Your account has been created successfully.',
      });
      onJoinSuccess();
    } catch (error: any) {
      toast.error('Verification failed', {
        description: error.message || 'Invalid code. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  return (
    <div className="min-h-screen bg-black flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Recaptcha Container */}
          <div id="recaptcha-container-join"></div>

          {/* OTP Verification Modal */}
          {otpSent && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-gray-900 border border-white/10 rounded-lg p-8 max-w-md w-full">
                <h2 className="text-white text-2xl mb-4">Verify Your Phone</h2>
                <form onSubmit={handleOTPVerify} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-white">Enter Verification Code</Label>
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
                      Enter the 6-digit code sent to {formData.phone}
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white h-12"
                    size="lg"
                    disabled={loading || otpCode.length !== 6}
                  >
                    {loading ? 'Verifying...' : 'Verify & Create Account'}
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode('');
                      clearRecaptcha();
                    }}
                    className="w-full text-orange-500 hover:text-orange-400 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {currentStep > 1 ? 'Previous Step' : 'Back to Home'}
          </button>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      step <= currentStep
                        ? 'bg-gradient-to-r from-orange-500 to-red-600 border-orange-500 text-white'
                        : 'border-white/20 text-white/40'
                    }`}
                  >
                    {step}
                  </div>
                  {step < 3 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 transition-colors ${
                        step < currentStep ? 'bg-orange-500' : 'bg-white/10'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-white/60">
              <span>Personal Info</span>
              <span>Membership</span>
              <span>Account</span>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-white text-4xl md:text-5xl mb-3">
              {currentStep === 1 && 'Start Your Journey'}
              {currentStep === 2 && 'Choose Your Plan'}
              {currentStep === 3 && 'Create Account'}
            </h1>
            <p className="text-white/60">
              {currentStep === 1 && 'Tell us a bit about yourself'}
              {currentStep === 2 && 'Select your membership and location'}
              {currentStep === 3 && 'Set up your login credentials'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Personal Info */}
            {currentStep === 1 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-white">
                      First Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="pl-11 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-orange-500 h-12"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-white">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-orange-500 h-12"
                      required
                    />
                  </div>
                </div>

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
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="pl-11 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-orange-500 h-12"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dob" className="text-white">
                    Date of Birth
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <Input
                      id="dob"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="pl-11 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-orange-500 h-12"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Membership */}
            {currentStep === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="plan" className="text-white">
                    Membership Plan
                  </Label>
                  <Select
                    value={formData.membershipPlan}
                    onValueChange={(value) => setFormData({ ...formData, membershipPlan: value })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-orange-500 h-12">
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10">
                      <SelectItem value="basic" className="text-white hover:bg-white/10">
                        Basic - $29/month
                      </SelectItem>
                      <SelectItem value="pro" className="text-white hover:bg-white/10">
                        Pro - $59/month (Most Popular)
                      </SelectItem>
                      <SelectItem value="elite" className="text-white hover:bg-white/10">
                        Elite - $99/month
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-white">
                    Preferred Location
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 z-10" />
                    <Select
                      value={formData.location}
                      onValueChange={(value) => setFormData({ ...formData, location: value })}
                    >
                      <SelectTrigger className="pl-11 bg-white/5 border-white/10 text-white focus:border-orange-500 h-12">
                        <SelectValue placeholder="Select a location" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-white/10">
                        <SelectItem value="downtown" className="text-white hover:bg-white/10">
                          Downtown - 123 Fitness Street
                        </SelectItem>
                        <SelectItem value="midtown" className="text-white hover:bg-white/10">
                          Midtown - 456 Gym Avenue
                        </SelectItem>
                        <SelectItem value="uptown" className="text-white hover:bg-white/10">
                          Uptown - 789 Health Boulevard
                        </SelectItem>
                        <SelectItem value="suburbs" className="text-white hover:bg-white/10">
                          Suburbs - 321 Wellness Road
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Plan Benefits */}
                {formData.membershipPlan && (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-3">
                    <h3 className="text-white">
                      {formData.membershipPlan === 'basic' && 'Basic Plan Benefits'}
                      {formData.membershipPlan === 'pro' && 'Pro Plan Benefits'}
                      {formData.membershipPlan === 'elite' && 'Elite Plan Benefits'}
                    </h3>
                    <ul className="space-y-2 text-white/70 text-sm">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                        Access to gym floor & equipment
                      </li>
                      {(formData.membershipPlan === 'pro' || formData.membershipPlan === 'elite') && (
                        <>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                            Unlimited group classes
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                            Sauna & spa access
                          </li>
                        </>
                      )}
                      {formData.membershipPlan === 'elite' && (
                        <>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                            4 Personal training sessions/month
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                            24/7 facility access
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                )}
              </>
            )}

            {/* Step 3: Account */}
            {currentStep === 3 && (
              <>
                {/* Authentication Method Selection */}
                <div className="space-y-4 pb-4 border-b border-white/10">
                  <Label className="text-white">Choose Authentication Method</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setUsePhoneAuth(false)}
                      className={`p-4 border rounded-lg transition-colors ${
                        !usePhoneAuth
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <Mail className="w-6 h-6 text-white mx-auto mb-2" />
                      <p className="text-white text-sm">Email</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUsePhoneAuth(true)}
                      className={`p-4 border rounded-lg transition-colors ${
                        usePhoneAuth
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <Phone className="w-6 h-6 text-white mx-auto mb-2" />
                      <p className="text-white text-sm">Phone</p>
                    </button>
                  </div>
                </div>

                {!usePhoneAuth ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-white">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a strong password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="pl-11 pr-11 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-orange-500 h-12"
                          required={!usePhoneAuth}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="text-white/40 text-xs">
                        Must be at least 8 characters with uppercase, lowercase, and numbers
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-white">
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <Input
                          id="confirmPassword"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Re-enter your password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className="pl-11 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-orange-500 h-12"
                          required={!usePhoneAuth}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="text-white/70 text-sm">
                      You will receive a verification code via SMS to <span className="text-white">{formData.phone}</span> to complete registration.
                    </p>
                  </div>
                )}

                {/* Terms and Conditions */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="terms"
                      checked={formData.termsAccepted}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, termsAccepted: checked as boolean })
                      }
                      className="border-white/20 mt-1"
                      required
                    />
                    <label htmlFor="terms" className="text-white/70 text-sm cursor-pointer">
                      I agree to the{' '}
                      <button type="button" className="text-orange-500 hover:text-orange-400">
                        Terms of Service
                      </button>{' '}
                      and{' '}
                      <button type="button" className="text-orange-500 hover:text-orange-400">
                        Privacy Policy
                      </button>
                    </label>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="marketing"
                      checked={formData.marketingAccepted}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, marketingAccepted: checked as boolean })
                      }
                      className="border-white/20 mt-1"
                    />
                    <label htmlFor="marketing" className="text-white/70 text-sm cursor-pointer">
                      I want to receive updates, promotions, and fitness tips via email
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white h-12"
              size="lg"
              disabled={loading}
            >
              {loading
                ? 'Processing...'
                : currentStep < 3
                ? 'Continue'
                : usePhoneAuth
                ? 'Send Verification Code'
                : 'Create Account & Start Free Trial'}
            </Button>
          </form>

          {/* Sign In Link */}
          {currentStep === 1 && (
            <div className="mt-8 text-center">
              <p className="text-white/60">
                Already have an account?{' '}
                <button
                  onClick={onSwitchToSignIn}
                  className="text-orange-500 hover:text-orange-400 transition-colors"
                >
                  Sign In
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1540205453279-389ebbc43b5b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb25hbCUyMHRyYWluZXIlMjBjb2FjaGluZ3xlbnwxfHx8fDE3NjI3MTMzNjl8MA&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Personal training"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-red-600/20" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              <span className="text-white/90 text-sm">7-Day Free Trial</span>
            </div>
            <h2 className="text-white text-4xl md:text-5xl mb-4">
              Join 5,000+ Members
            </h2>
            <p className="text-white/80 text-lg mb-8">
              Start your transformation today with expert guidance, premium facilities, and a supportive community.
            </p>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl text-white mb-1">50+</div>
                <div className="text-white/60 text-sm">Expert Trainers</div>
              </div>
              <div>
                <div className="text-3xl text-white mb-1">100+</div>
                <div className="text-white/60 text-sm">Classes Weekly</div>
              </div>
              <div>
                <div className="text-3xl text-white mb-1">4.9/5</div>
                <div className="text-white/60 text-sm">Member Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}