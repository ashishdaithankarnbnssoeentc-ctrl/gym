import { SearchModal } from './SearchModal';
import { FavoritesManager } from './FavoritesManager';
import { toast } from 'sonner';
import {
  Dumbbell,
  LogOut,
  Bell,
  Search,
  Heart,
  Flame,
  Activity,
  Zap,
  Award,
  Calendar,
  Users,
  Target,
  MapPin,
  Trophy,
  AlertCircle,
  ChevronRight,
  Play,
  PlayCircle,
  Clock,
  CreditCard,
  User,
  Settings,
  FileText
} from 'lucide-react';

interface DashboardProps {
  onSignOut: () => void;
  onNavigateHome?: () => void;
  onProposals?: () => void;
  userData: {
    firstName: string;
    lastName: string;
    email: string;
    membershipPlan: string;
    location: string;
    joinDate: string;
  };
}

export function Dashboard({ onSignOut, onNavigateHome, onProposals, userData }: DashboardProps) {
  const [daysUntilRenewal, setDaysUntilRenewal] = useState(0);
  const [nextBillingDate, setNextBillingDate] = useState('');
  const [playingVideo, setPlayingVideo] = useState<{ url: string; title: string; videoId?: string } | null>(null);
  const [showClassBooking, setShowClassBooking] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [localUserData, setLocalUserData] = useState(userData);
  const [selectedYouTubeVideo, setSelectedYouTubeVideo] = useState<string | null>(null);

  // Get 6 random YouTube videos for On-Demand section
  const onDemandVideos = getRandomVideos(6);
  
  useEffect(() => {
    const joinDate = new Date(userData.joinDate);
    const today = new Date();
    
    let nextBilling = new Date(joinDate);
    while (nextBilling <= today) {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    }
    
    setNextBillingDate(nextBilling.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }));

    const timeDiff = nextBilling.getTime() - today.getTime();
    const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    setDaysUntilRenewal(days);
  }, [userData.joinDate]);

  const getPlanPrice = (plan: string) => {
    switch (plan) {
      case 'basic': return '$29';
      case 'pro': return '$59';
      case 'elite': return '$99';
      default: return '$29';
    }
  };

  const getPlanName = (plan: string) => {
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  };

  const formatJoinDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Mock data for demonstration
  const upcomingClasses = [
    { id: 1, name: 'HIIT Intensity', trainer: 'Sarah Johnson', time: 'Today, 6:00 PM', duration: '45 min', spots: 3, image: 'https://images.unsplash.com/photo-1700784795176-7ff886439d79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxISUlUJTIwd29ya291dCUyMGludGVuc2V8ZW58MXx8fHwxNzYyODg2MzM3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
    { id: 2, name: 'Yoga Flow', trainer: 'Michael Chen', time: 'Tomorrow, 7:00 AM', duration: '60 min', spots: 8, image: 'https://images.unsplash.com/photo-1618425977996-bebc5afe88f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b2dhJTIwbWVkaXRhdGlvbiUyMHBlYWNlZnVsfGVufDF8fHx8MTc2Mjc4ODUxOXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
    { id: 3, name: 'Spin & Burn', trainer: 'Emma Davis', time: 'Tomorrow, 6:30 PM', duration: '50 min', spots: 2, image: 'https://images.unsplash.com/photo-1760031670160-4da44e9596d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcGluJTIwY3ljbGluZyUyMGNsYXNzfGVufDF8fHx8MTc2Mjg4NjMzN3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
  ];

  const weeklyStats = {
    workouts: 4,
    minutes: 180,
    calories: 850,
    streak: 3,
  };

  const monthlyGoal = {
    current: 12,
    target: 16,
  };

  const recentActivity = [
    { id: 1, type: 'Strength Training', date: 'Nov 9', duration: '45 min', calories: 320 },
    { id: 2, type: 'HIIT Class', date: 'Nov 8', duration: '40 min', calories: 410 },
    { id: 3, type: 'Yoga', date: 'Nov 7', duration: '60 min', calories: 180 },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Dumbbell className="w-8 h-8 text-orange-500" />
              <div>
                <h1 className="text-white text-xl">Member Portal</h1>
                <p className="text-white/60 text-sm">
                  Welcome back, {userData.firstName}!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {onNavigateHome && (
                <Button
                  onClick={onNavigateHome}
                  variant="ghost"
                  className="text-white hover:bg-white/10"
                >
                  <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
                  Back to Home
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={() => setShowSearchModal(true)}
                title="Search"
              >
                <Search className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={() => setShowFavoritesModal(true)}
                title="Favorites"
              >
                <Heart className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={() => {
                  toast.info('Notifications', {
                    description: 'You have no new notifications',
                  });
                }}
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
              </Button>
              <Button
                onClick={onSignOut}
                variant="ghost"
                className="text-white hover:bg-white/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Renewal Alert */}
        {daysUntilRenewal <= 2 && daysUntilRenewal > 0 && (
          <Alert className="mb-6 border-orange-500/50 bg-orange-500/10">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            <AlertTitle className="text-white">Subscription Renewal Reminder</AlertTitle>
            <AlertDescription className="text-white/70">
              Your subscription will renew in {daysUntilRenewal} day{daysUntilRenewal !== 1 ? 's' : ''} on {nextBillingDate}. 
              Your card will be charged {getPlanPrice(userData.membershipPlan)}/month.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-orange-500/20 to-red-600/20 border-orange-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Workouts This Week</p>
                  <h3 className="text-white text-3xl mt-1">{weeklyStats.workouts}</h3>
                </div>
                <Flame className="w-10 h-10 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Active Minutes</p>
                  <h3 className="text-white text-3xl mt-1">{weeklyStats.minutes}</h3>
                </div>
                <Activity className="w-10 h-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Calories Burned</p>
                  <h3 className="text-white text-3xl mt-1">{weeklyStats.calories}</h3>
                </div>
                <Zap className="w-10 h-10 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Day Streak</p>
                  <h3 className="text-white text-3xl mt-1">{weeklyStats.streak}</h3>
                </div>
                <Award className="w-10 h-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-orange-500 to-red-600 border-0 overflow-hidden relative cursor-pointer hover:scale-105 transition-transform">
                <CardContent className="pt-6 relative z-10">
                  <Calendar className="w-8 h-8 text-white mb-3" />
                  <h3 className="text-white text-xl mb-1">Book a Class</h3>
                  <p className="text-white/80 text-sm">100+ classes weekly</p>
                  <Button variant="secondary" size="sm" className="mt-4" onClick={() => setShowClassBooking(true)}>
                    View Schedule
                  </Button>
                </CardContent>
                <div className="absolute inset-0 bg-gradient-to-br from-orange-600/30 to-transparent" />
              </Card>

              <Card className="bg-gradient-to-br from-purple-600 to-blue-600 border-0 overflow-hidden relative cursor-pointer hover:scale-105 transition-transform">
                <CardContent className="pt-6 relative z-10">
                  <Users className="w-8 h-8 text-white mb-3" />
                  <h3 className="text-white text-xl mb-1">Personal Training</h3>
                  <p className="text-white/80 text-sm">1-on-1 sessions</p>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => {
                      toast.success('Personal Training', {
                        description: 'Book a 1-on-1 session with a certified trainer',
                      });
                    }}
                  >
                    Book Session
                  </Button>
                </CardContent>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-700/30 to-transparent" />
              </Card>
            </div>

            {/* Upcoming Classes */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Upcoming Classes</CardTitle>
                    <CardDescription className="text-white/60">
                      Your scheduled workouts
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    className="text-orange-500 hover:text-orange-400"
                    onClick={() => setShowClassBooking(true)}
                  >
                    View All
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingClasses.map((classItem) => (
                  <div
                    key={classItem.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <ImageWithFallback
                      src={classItem.image}
                      alt={classItem.name}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="text-white mb-1">{classItem.name}</h4>
                      <p className="text-white/60 text-sm mb-2">with {classItem.trainer}</p>
                      <div className="flex items-center gap-4 text-xs text-white/50">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {classItem.time}
                        </span>
                        <span>{classItem.duration}</span>
                        <Badge variant="secondary" className="text-xs">
                          {classItem.spots} spots left
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-white/10 hover:bg-white/20 text-white border-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.info(`${classItem.name}`, {
                          description: `${classItem.duration} with ${classItem.trainer} • ${classItem.spots} spots left`,
                        });
                      }}
                    >
                      View
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                          <Dumbbell className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                          <h5 className="text-white text-sm">{activity.type}</h5>
                          <p className="text-white/50 text-xs">{activity.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-sm">{activity.duration}</p>
                        <p className="text-white/50 text-xs">{activity.calories} cal</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* On-Demand Content */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <PlayCircle className="w-5 h-5" />
                  On-Demand Workouts
                </CardTitle>
                <CardDescription className="text-white/60">
                  Start your workout anytime - World-class creators, embedded with permission
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {onDemandVideos.map((video) => (
                    <div 
                      key={video.id} 
                      className="group"
                    >
                      {selectedYouTubeVideo === video.videoId ? (
                        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                          <YouTubeEmbed
                            videoId={video.videoId}
                            title={video.title}
                            creator={video.creator}
                            channelUrl={video.channelUrl}
                            videoUrl={video.videoUrl}
                            duration={video.duration}
                            category={video.category}
                            description={video.description}
                            showCredits={true}
                            className="text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2 text-white/70 hover:text-white"
                            onClick={() => setSelectedYouTubeVideo(null)}
                          >
                            Close
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="relative group cursor-pointer"
                          onClick={() => setSelectedYouTubeVideo(video.videoId)}
                        >
                          {/* Thumbnail */}
                          <div className="relative rounded-lg overflow-hidden">
                            <img
                              src={video.thumbnailUrl}
                              alt={video.title}
                              className="w-full h-32 object-cover"
                            />
                            {/* Dark overlay */}
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors" />
                            {/* Play button overlay */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-12 h-12 rounded-full bg-orange-500/90 flex items-center justify-center">
                                <PlayCircle className="w-8 h-8 text-white" fill="white" />
                              </div>
                            </div>
                            {/* Duration badge */}
                            <div className="absolute top-2 right-2">
                              <Badge className="bg-black/80 text-white text-xs">
                                {video.duration}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-white text-sm mt-2">{video.title}</p>
                          <p className="text-white/50 text-xs">by {video.creator}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Copyright Notice */}
                <p className="text-white/40 text-xs mt-6 pt-4 border-t border-white/10 text-center">
                  © Videos by their respective creators. Embedded with permission via YouTube.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Monthly Goal */}
            <Card className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border-green-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-500" />
                  Monthly Goal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white">Workouts Completed</span>
                    <span className="text-white">
                      {monthlyGoal.current}/{monthlyGoal.target}
                    </span>
                  </div>
                  <Progress 
                    value={(monthlyGoal.current / monthlyGoal.target) * 100} 
                    className="h-2"
                  />
                  <p className="text-white/60 text-sm">
                    {monthlyGoal.target - monthlyGoal.current} workouts to reach your goal!
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Membership Card */}
            <Card className="bg-gradient-to-br from-orange-500/10 to-red-600/10 border-orange-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Membership
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-white/70">Plan</span>
                  <Badge className="bg-gradient-to-r from-orange-500 to-red-600">
                    {getPlanName(userData.membershipPlan)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-white/70">Monthly Fee</span>
                  <span className="text-white">{getPlanPrice(userData.membershipPlan)}/mo</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-white/70">Member Since</span>
                  <span className="text-white text-sm">{formatJoinDate(userData.joinDate)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Next Billing</span>
                  <span className="text-white text-sm">{nextBillingDate}</span>
                </div>
                <Button
                  className="w-full bg-white/10 hover:bg-white/20 text-white border-0 mt-2"
                  onClick={() => {
                    toast.info('Manage Plan', {
                      description: 'Upgrade, downgrade, or cancel your membership',
                    });
                  }}
                >
                  Manage Plan
                </Button>
              </CardContent>
            </Card>

            {/* Account Info */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-orange-500 text-white">
                      {userData.firstName[0]}{userData.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white">{userData.firstName} {userData.lastName}</p>
                    <p className="text-white/60 text-sm">{userData.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 text-sm">
                  <span className="text-white/70 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location
                  </span>
                  <span className="text-white capitalize">{userData.location}</span>
                </div>
                <Separator className="bg-white/10" />
                <Button
                  className="w-full bg-white/10 hover:bg-white/20 text-white border-0"
                  onClick={() => setShowProfileEditor(true)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </CardContent>
            </Card>

            {/* Community Challenge */}
            <Card className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-500" />
                  Community Challenge
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center py-4">
                    <h4 className="text-white text-2xl">November Hustle</h4>
                    <p className="text-white/60 text-sm mt-1">Complete 20 workouts this month</p>
                  </div>
                  <div className="flex items-center justify-center gap-4 text-center">
                    <div>
                      <div className="text-2xl text-orange-500">#47</div>
                      <div className="text-white/60 text-xs">Your Rank</div>
                    </div>
                    <Separator orientation="vertical" className="h-12 bg-white/10" />
                    <div>
                      <div className="text-2xl text-white">326</div>
                      <div className="text-white/60 text-xs">Participants</div>
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                    onClick={() => {
                      toast.success('Community Challenge', {
                        description: 'You\'re ranked #47 out of 326 participants! Keep it up!',
                      });
                    }}
                  >
                    View Leaderboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Video Player Modal */}
      {playingVideo && (
        <VideoPlayer
          videoUrl={playingVideo.url}
          title={playingVideo.title}
          onClose={() => setPlayingVideo(null)}
        />
      )}

      {/* Class Booking Modal */}
      {showClassBooking && (
        <ClassBooking
          onClose={() => setShowClassBooking(false)}
          userEmail={localUserData.email}
          userName={`${localUserData.firstName} ${localUserData.lastName}`}
        />
      )}

      {/* Profile Editor Modal */}
      {showProfileEditor && (
        <ProfileEditor
          userData={localUserData}
          onClose={() => setShowProfileEditor(false)}
          onProfileUpdate={(updatedData) => setLocalUserData(updatedData)}
        />
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <SearchModal
          onClose={() => setShowSearchModal(false)}
        />
      )}

      {/* Favorites Manager Modal */}
      {showFavoritesModal && (
        <FavoritesManager
          onClose={() => setShowFavoritesModal(false)}
          userEmail={localUserData.email}
          onPlayVideo={(url, title) => setPlayingVideo({ url, title })}
        />
      )}
    </div>
  );
}