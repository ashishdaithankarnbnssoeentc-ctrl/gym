import React, { useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Stats } from './components/Stats';
import { Features } from './components/Features';
import { About } from './components/About';
import { Classes } from './components/Classes';
import { Trainers } from './components/Trainers';
import { Pricing } from './components/Pricing';
import { Testimonials } from './components/Testimonials';
import { VideoGallery } from './components/VideoGallery';
import { Gallery } from './components/Gallery';
import { FAQ } from './components/FAQ';
import { Contact } from './components/Contact';
import { CTASection } from './components/CTASection';
import { Footer } from './components/Footer';
import { SignIn } from './components/SignIn';
import { JoinNow } from './components/JoinNow';
import { Dashboard } from './components/Dashboard';
import { Legal } from './components/Legal';
import { SearchModal } from './components/SearchModal';
import { FavoritesManager } from './components/FavoritesManager';
import { SEO } from './components/SEO';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Analytics, usePageTracking, useScrollTracking } from './components/Analytics';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProposalsDashboard } from './components/ProposalsDashboard';
import { initMonitoring, Sentry, setUserContext, clearUserContext } from './lib/monitoring';
import { registerServiceWorker } from './utils/registerServiceWorker';
import { FEATURES } from './config/features';
import { initAutoRollback } from './lib/autoRollback';
import { requestNotificationPermission } from './lib/alerting';
import { logVersionInfo } from './config/version';
import { uiAnalytics } from './lib/analytics';

type Page = 'home' | 'signin' | 'joinnow' | 'dashboard' | 'proposals' | 'terms' | 'privacy' | 'cookies' | 'disclaimer';

function AppContent() {
  const [currentPage, setCurrentPage] = React.useState<Page>('home');
  const [showSearch, setShowSearch] = React.useState(false);
  const [showFavorites, setShowFavorites] = React.useState(false);
  const { user, userData, loading, signOut: firebaseSignOut } = useAuth();

  // Track page views and scroll depth
  usePageTracking();
  useScrollTracking();

  // Initialize all production systems on mount
  useEffect(() => {
    // Log version info (helpful for debugging)
    logVersionInfo();

    // Initialize monitoring
    if (FEATURES.MONITORING) {
      initMonitoring();
    }

    // Initialize auto-rollback system
    initAutoRollback();

    // Register service worker
    registerServiceWorker();

    // Request notification permission for alerts
    requestNotificationPermission();

    // Track page load complete
    const loadTime = performance.now();
    uiAnalytics.pageLoadComplete(loadTime);
  }, []);

  // Update Sentry user context when auth state changes
  useEffect(() => {
    if (user && userData) {
      setUserContext(user.uid, userData.email);
    } else {
      clearUserContext();
    }
  }, [user, userData]);

  const handleSignInSuccess = () => {
    setCurrentPage('dashboard');
  };

  const handleJoinSuccess = () => {
    setCurrentPage('dashboard');
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut();
      setCurrentPage('home');
      toast.info('You have been signed out', {
        description: 'Come back soon!',
      });
    } catch (error) {
      toast.error('Error signing out', {
        description: 'Please try again.',
      });
    }
  };

  // Show loading state with subtle skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-white/60 text-sm">Loading your experience...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated and on dashboard page, show dashboard
  if (user && userData && currentPage === 'dashboard') {
    return (
      <>
        <Dashboard
          onSignOut={handleSignOut}
          userData={userData}
          onNavigateHome={() => setCurrentPage('home')}
          onProposals={() => setCurrentPage('proposals')}
        />
        <Toaster />
      </>
    );
  }

  // Render different pages based on state
  if (currentPage === 'signin') {
    return (
      <>
        <SignIn
          onBack={() => setCurrentPage('home')}
          onSwitchToJoin={() => setCurrentPage('joinnow')}
          onSignInSuccess={handleSignInSuccess}
        />
        <Toaster />
      </>
    );
  }

  if (currentPage === 'joinnow') {
    return (
      <>
        <JoinNow
          onBack={() => setCurrentPage('home')}
          onSwitchToSignIn={() => setCurrentPage('signin')}
          onJoinSuccess={handleJoinSuccess}
        />
        <Toaster />
      </>
    );
  }


  // Proposals page (requires authentication)
  if (currentPage === 'proposals') {
    if (!user) {
      setCurrentPage('signin');
      return null;
    }

    return (
      <>
        <Header
          onSignIn={() => setCurrentPage('signin')}
          onJoinNow={() => setCurrentPage('joinnow')}
          onDashboard={() => setCurrentPage('dashboard')}
          onBackHome={() => setCurrentPage('home')}
          onSignOut={handleSignOut}
          onToggleSearch={() => setShowSearch(!showSearch)}
          onToggleFavorites={() => setShowFavorites(!showFavorites)}
        />
        <ProposalsDashboard />
        <Toaster />
      </>
    );
  }

  // Legal pages
  if (currentPage === 'terms') {
    return (
      <>
        <Legal type="terms" onBack={() => setCurrentPage('home')} />
        <Toaster />
      </>
    );
  }

  if (currentPage === 'privacy') {
    return (
      <>
        <Legal type="privacy" onBack={() => setCurrentPage('home')} />
        <Toaster />
      </>
    );
  }

  if (currentPage === 'cookies') {
    return (
      <>
        <Legal type="cookies" onBack={() => setCurrentPage('home')} />
        <Toaster />
      </>
    );
  }

  if (currentPage === 'disclaimer') {
    return (
      <>
        <Legal type="disclaimer" onBack={() => setCurrentPage('home')} />
        <Toaster />
      </>
    );
  }

  // Home page
  return (
    <>
      <SEO />
      <Analytics trackingId="G-LNE3HD8V2X" />
      <div className="min-h-screen bg-black">
        <Header
          onSignIn={() => setCurrentPage('signin')}
          onJoinNow={() => setCurrentPage('joinnow')}
          onSearch={() => setShowSearch(true)}
        />
        <Hero onJoinNow={() => setCurrentPage('joinnow')} />
        <Stats />
        <Features />
        <About />
        <Classes />
        <Trainers />
        <Pricing onJoinNow={() => setCurrentPage('joinnow')} />
        <Testimonials />
        <VideoGallery />
        <Gallery />
        <FAQ />
        <Contact />
        <CTASection onJoinNow={() => setCurrentPage('joinnow')} />
        <Footer onNavigate={(page) => setCurrentPage(page)} />
      </div>

      {/* Search Modal */}
      {showSearch && (
        <SearchModal
          onClose={() => setShowSearch(false)}
          onResultClick={(type, id) => {
            // Handle search result click
            setShowSearch(false);
            toast.info('Feature Coming Soon', {
              description: `Navigate to ${type}: ${id}`
            });
          }}
        />
      )}

      {/* Favorites Modal */}
      {showFavorites && userData && (
        <FavoritesManager
          onClose={() => setShowFavorites(false)}
          userEmail={userData.email}
        />
      )}

      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-zinc-900 rounded-2xl p-8 border border-red-500/20">
            <h1 className="text-white text-2xl mb-4">Something went wrong</h1>
            <p className="text-white/70 mb-6">We've been notified and will fix this soon.</p>
            <button
              onClick={resetError}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    >
      <ErrorBoundary>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ErrorBoundary>
    </Sentry.ErrorBoundary>
  );
}