import { ArrowRight, Play, Target, Zap, Trophy, Heart, X, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useState } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { scrollToSection } from '../utils/scroll';

// Real transformation stories
const motivationalStories = [
  {
    id: 1,
    name: "Sarah Mitchell",
    age: 34,
    achievement: "Lost 65 lbs in 8 months",
    before: "Working mom drowning in exhaustion, unable to play with her kids",
    after: "Runs 5Ks with her children, completed her first Tough Mudder",
    quote: "I walked in thinking I'd quit after a week. Eight months later, I'm the strongest version of myself I've ever been. My kids say I'm their superhero now.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400"
  },
  {
    id: 2,
    name: "Marcus Johnson",
    age: 42,
    achievement: "From prediabetic to marathon runner",
    before: "Doctor warned him he was on track for Type 2 diabetes",
    after: "Reversed prediabetes, ran Boston Marathon, lost 80 lbs",
    quote: "The day my doctor told me 'whatever you're doing, keep doing it' was the day I knew this gym saved my life. I didn't just lose weight—I gained years.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"
  },
  {
    id: 3,
    name: "Jennifer Lee",
    age: 29,
    achievement: "Overcame anxiety and depression through fitness",
    before: "Battling severe anxiety, avoided leaving her apartment",
    after: "Teaches boxing classes, became a certified trainer",
    quote: "I came here broken. The community didn't just accept me—they rebuilt me. Now I help others do the same. This place is therapy with a heartbeat.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400"
  },
  {
    id: 4,
    name: "David Chen",
    age: 56,
    achievement: "Retired athlete rediscovered his fire",
    before: "Former college athlete who let 20 years of desk work steal his identity",
    after: "Deadlifts 405 lbs at 56, mentors young athletes",
    quote: "I thought my glory days were behind me. Turns out, I was just getting started. Age is just a number when you've got the right people in your corner.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400"
  },
  {
    id: 5,
    name: "Alicia Rodriguez",
    age: 38,
    achievement: "Cancer survivor who rebuilt her strength",
    before: "Post-chemotherapy, struggling to walk up stairs",
    after: "Completed Ironman triathlon, became cancer fitness advocate",
    quote: "Cancer tried to take everything. This gym gave me the tools to take it all back—and then some. I'm not just surviving anymore. I'm thriving.",
    image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400"
  },
  {
    id: 6,
    name: "Ryan Thompson",
    age: 27,
    achievement: "Former addict found purpose in fitness",
    before: "Battling substance abuse, lost job and relationships",
    after: "2 years sober, personal training certification, rebuilt his life",
    quote: "Every rep is a promise to myself that I'm done with who I used to be. This gym didn't just change my body—it saved my soul.",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400"
  }
];

const classes = [
  {
    title: 'HIIT Training',
    description: 'High-intensity interval training to torch calories and build endurance.',
    duration: '45 min',
    level: 'Intermediate',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1080',
    videoUrl: 'https://cdn.pixabay.com/video/2023/05/05/161304-824712512_large.mp4',
  },
  {
    title: 'Strength & Power',
    description: 'Build muscle and strength with compound lifts and progressive overload.',
    duration: '60 min',
    level: 'All Levels',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1080',
    videoUrl: 'https://cdn.pixabay.com/video/2024/01/12/196598-904451227_large.mp4',
  },
  {
    title: 'Boxing Fitness',
    description: 'Learn boxing techniques while getting an intense full-body workout.',
    duration: '50 min',
    level: 'Intermediate',
    image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1080',
    videoUrl: 'https://cdn.pixabay.com/video/2022/05/19/117930-711756826_large.mp4',
  },
  {
    title: 'CrossFit WOD',
    description: 'Workout of the day with functional movements at high intensity.',
    duration: '45 min',
    level: 'Advanced',
    image: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1080',
    videoUrl: 'https://cdn.pixabay.com/video/2022/12/07/142446-779205929_large.mp4',
  },
];

export function Classes() {
  const [playingVideo, setPlayingVideo] = useState<{ url: string; title: string } | null>(null);
  const [showStories, setShowStories] = useState(false);

  return (
    <section id="classes" className="py-20 md:py-32 bg-black">
      <div className="container mx-auto px-4">
        {/* Hero Story Section */}
        <div className="text-center max-w-5xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-6 py-2.5 mb-6">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <span className="text-orange-400 font-semibold text-sm tracking-widest">THE TRANSFORMATION BEGINS NOW</span>
          </div>

          <h2 className="text-white text-4xl md:text-5xl lg:text-7xl mb-8 leading-tight">
            From Ordinary to
            <span className="block mt-2 bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 bg-clip-text text-transparent">
              Extraordinary
            </span>
          </h2>

          <div className="space-y-4 max-w-3xl mx-auto">
            <p className="text-white/80 text-xl leading-relaxed">
              Six months ago, you couldn't imagine being here. Six months from now,
              <span className="text-orange-400 font-semibold"> you won't recognize yourself.</span>
            </p>
            <p className="text-white/60 leading-relaxed">
              This isn't just about fitness. It's about reclaiming your power, rewriting your story,
              and proving to yourself that you're capable of anything.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
              <span>No Shortcuts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
              <span>No Excuses</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
              <span>Just Real Results</span>
            </div>
          </div>
        </div>

        {/* Transformation Paths */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16 max-w-7xl mx-auto">

          {/* Path 1: The Iron Legacy */}
          <div
            onClick={() => scrollToSection('contact')}
            className="group relative bg-zinc-900/90 backdrop-blur-sm rounded-3xl p-8 md:p-10 border border-orange-500/20 hover:border-orange-500/50 transition-all duration-250 hover:shadow-2xl hover:shadow-orange-500/20 cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-orange-500/5 to-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-250 rounded-3xl"></div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-105 transition-transform duration-250">
                  <Target className="w-7 h-7 text-white" />
                </div>
                <div className="bg-orange-500/20 border border-orange-400/30 rounded-full px-4 py-1.5 text-orange-400 text-xs font-bold">
                  MOST CHOSEN
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <h3 className="text-white text-3xl md:text-4xl font-bold group-hover:text-orange-400 transition-colors duration-250">
                  The Iron Legacy
                </h3>
                <p className="text-orange-400 text-lg font-semibold">
                  Forge Strength. Build Character.
                </p>
                <div className="h-1 w-16 bg-gradient-to-r from-orange-500 to-transparent rounded-full"></div>
              </div>

              <p className="text-white/70 leading-relaxed mb-8">
                Remember the feeling of being overlooked? That ends now. Every rep, every set, every drop of sweat is a declaration:
                <span className="text-orange-400 font-semibold"> I am becoming unbreakable.</span> This is where boys become warriors and warriors become legends.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full flex-shrink-0"></div>
                  <div>
                    <div className="text-white font-medium mb-0.5">Progressive Overload Mastery</div>
                    <div className="text-white/50 text-sm">Science-backed strength programs that guarantee growth</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full flex-shrink-0"></div>
                  <div>
                    <div className="text-white font-medium mb-0.5">Personalized Nutrition Blueprint</div>
                    <div className="text-white/50 text-sm">Fuel your muscles, accelerate recovery, maximize gains</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full flex-shrink-0"></div>
                  <div>
                    <div className="text-white font-medium mb-0.5">Victory Tracking System</div>
                    <div className="text-white/50 text-sm">Watch yourself break records you set yesterday</div>
                  </div>
                </div>
              </div>

              <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white py-6 rounded-xl shadow-lg shadow-orange-500/25 group-hover:shadow-xl group-hover:shadow-orange-500/40 transition-all duration-250 font-semibold">
                Start Your Legacy
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-250" />
              </Button>
            </div>
          </div>

          {/* Path 2: The Phoenix Rise */}
          <div
            onClick={() => scrollToSection('contact')}
            className="group relative bg-zinc-900/90 backdrop-blur-sm rounded-3xl p-8 md:p-10 border border-blue-500/20 hover:border-blue-500/50 transition-all duration-250 hover:shadow-2xl hover:shadow-blue-500/20 cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-blue-500/5 to-cyan-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-250 rounded-3xl"></div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform duration-300">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <div className="bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-1.5 text-blue-400 text-xs font-bold">
                  RAPID CHANGE
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <h3 className="text-white text-3xl md:text-4xl font-bold group-hover:text-blue-400 transition-colors duration-300">
                  The Phoenix Rise
                </h3>
                <p className="text-blue-400 text-lg font-semibold">
                  Burn Through Limits. Emerge Transformed.
                </p>
                <div className="h-1 w-16 bg-gradient-to-r from-blue-500 to-transparent rounded-full"></div>
              </div>

              <p className="text-white/70 leading-relaxed mb-8">
                Tired of hiding behind baggy clothes and missed opportunities? Your phoenix moment is here.
                <span className="text-blue-400 font-semibold"> Burn away the old you.</span> Rise from the ashes stronger, leaner, and more confident than you ever thought possible.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <div>
                    <div className="text-white font-medium mb-0.5">Metabolic Ignition Workouts</div>
                    <div className="text-white/50 text-sm">HIIT protocols that turn your body into a fat-burning machine</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <div>
                    <div className="text-white font-medium mb-0.5">Energy Optimization System</div>
                    <div className="text-white/50 text-sm">Feel lighter, move faster, live better every single day</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <div>
                    <div className="text-white font-medium mb-0.5">Sustainable Habits Framework</div>
                    <div className="text-white/50 text-sm">Results that last a lifetime, not just a season</div>
                  </div>
                </div>
              </div>

              <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white py-6 rounded-xl shadow-lg shadow-blue-500/25 group-hover:shadow-xl group-hover:shadow-blue-500/40 transition-all duration-250 font-semibold">
                Ignite Your Transformation
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-250" />
              </Button>
            </div>
          </div>

          {/* Path 3: The Champion's Code */}
          <div
            onClick={() => scrollToSection('contact')}
            className="group relative bg-zinc-900/90 backdrop-blur-sm rounded-3xl p-8 md:p-10 border border-purple-500/20 hover:border-purple-500/50 transition-all duration-250 hover:shadow-2xl hover:shadow-purple-500/20 cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-purple-500/5 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-250 rounded-3xl"></div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-105 transition-transform duration-300">
                  <Trophy className="w-7 h-7 text-white" />
                </div>
                <div className="bg-purple-500/20 border border-purple-400/30 rounded-full px-4 py-1.5 text-purple-400 text-xs font-bold">
                  ELITE LEVEL
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <h3 className="text-white text-3xl md:text-4xl font-bold group-hover:text-purple-400 transition-colors duration-300">
                  The Champion's Code
                </h3>
                <p className="text-purple-400 text-lg font-semibold">
                  Outlast. Outwork. Outperform.
                </p>
                <div className="h-1 w-16 bg-gradient-to-r from-purple-500 to-transparent rounded-full"></div>
              </div>

              <p className="text-white/70 leading-relaxed mb-8">
                Good isn't enough when greatness is possible. This is for the relentless. The obsessed. Those who see the podium in their sleep.
                <span className="text-purple-400 font-semibold"> Victory isn't given—it's earned.</span> And you're ready to pay the price.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 bg-purple-500 rounded-full flex-shrink-0"></div>
                  <div>
                    <div className="text-white font-medium mb-0.5">Elite Performance Programming</div>
                    <div className="text-white/50 text-sm">Sport-specific training that separates champions from competitors</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 bg-purple-500 rounded-full flex-shrink-0"></div>
                  <div>
                    <div className="text-white font-medium mb-0.5">Explosive Power Development</div>
                    <div className="text-white/50 text-sm">Unlock speed, agility, and raw athleticism you didn't know you had</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 bg-purple-500 rounded-full flex-shrink-0"></div>
                  <div>
                    <div className="text-white font-medium mb-0.5">Recovery & Resilience Protocol</div>
                    <div className="text-white/50 text-sm">Train harder, recover faster, compete longer</div>
                  </div>
                </div>
              </div>

              <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white py-6 rounded-xl shadow-lg shadow-purple-500/25 group-hover:shadow-xl group-hover:shadow-purple-500/40 transition-all duration-250 font-semibold">
                Train Like Champions
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-250" />
              </Button>
            </div>
          </div>

          {/* Path 4: The Forever Strong */}
          <div
            onClick={() => scrollToSection('contact')}
            className="group relative bg-zinc-900/90 backdrop-blur-sm rounded-3xl p-8 md:p-10 border border-green-500/20 hover:border-green-500/50 transition-all duration-250 hover:shadow-2xl hover:shadow-green-500/20 cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 via-green-500/5 to-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-250 rounded-3xl"></div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:scale-105 transition-transform duration-300">
                  <Heart className="w-7 h-7 text-white" />
                </div>
                <div className="bg-green-500/20 border border-green-400/30 rounded-full px-4 py-1.5 text-green-400 text-xs font-bold">
                  LONG-TERM
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <h3 className="text-white text-3xl md:text-4xl font-bold group-hover:text-green-400 transition-colors duration-300">
                  The Forever Strong
                </h3>
                <p className="text-green-400 text-lg font-semibold">
                  Age Backwards. Live Fully.
                </p>
                <div className="h-1 w-16 bg-gradient-to-r from-green-500 to-transparent rounded-full"></div>
              </div>

              <p className="text-white/70 leading-relaxed mb-8">
                What if your best years are still ahead? Imagine waking up pain-free, moving with ease, and having the energy to chase every dream.
                <span className="text-green-400 font-semibold"> This is longevity with power.</span> Build a body that doesn't just survive—it thrives.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></div>
                  <div>
                    <div className="text-white font-medium mb-0.5">Mobility & Flexibility Mastery</div>
                    <div className="text-white/50 text-sm">Move like you're 20, regardless of your age</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></div>
                  <div>
                    <div className="text-white font-medium mb-0.5">Stress-Free Living Blueprint</div>
                    <div className="text-white/50 text-sm">Balance mind, body, and spirit for complete wellness</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></div>
                  <div>
                    <div className="text-white font-medium mb-0.5">Longevity Optimization</div>
                    <div className="text-white/50 text-sm">Add years to your life and life to your years</div>
                  </div>
                </div>
              </div>

              <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-6 rounded-xl shadow-lg shadow-green-500/25 group-hover:shadow-xl group-hover:shadow-green-500/40 transition-all duration-250 font-semibold">
                Choose Lifelong Vitality
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-250" />
              </Button>
            </div>
          </div>

        </div>

        {/* Impact Stats - Storytelling */}
        <div className="max-w-7xl mx-auto">
          <div
            onClick={() => setShowStories(true)}
            className="relative bg-zinc-900/90 backdrop-blur-sm rounded-3xl p-10 md:p-16 border border-white/10 overflow-hidden cursor-pointer group/stats hover:border-orange-500/30 transition-all duration-250"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-red-500/5 group-hover/stats:from-orange-500/10 group-hover/stats:to-red-500/10 transition-all duration-250"></div>

            <div className="relative z-10">
              <div className="text-center mb-12">
                <h3 className="text-white text-3xl md:text-4xl mb-4 leading-tight">
                  You're Not Joining a Gym.
                  <span className="block mt-2 bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
                    You're Joining a Revolution.
                  </span>
                </h3>
                <p className="text-white/60 max-w-2xl mx-auto">
                  Thousands have walked through doubt and emerged victorious. Your chapter starts today.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2 text-orange-500 text-sm font-medium group-hover/stats:text-orange-400 transition-colors">
                  <Sparkles className="w-4 h-4" />
                  <span>Click to read real transformation stories</span>
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-8 md:gap-12">
                <div className="text-center group">
                  <div className="text-6xl md:text-7xl font-black bg-gradient-to-br from-orange-400 via-orange-500 to-red-600 bg-clip-text text-transparent mb-4 group-hover:scale-105 transition-transform duration-250">
                    850+
                  </div>
                  <div className="text-white text-xl font-semibold mb-2">Stories Rewritten</div>
                  <div className="text-white/50 text-sm max-w-xs mx-auto">
                    From "I can't" to "I did it." These aren't clients—they're champions in the making.
                  </div>
                </div>

                <div className="text-center group">
                  <div className="text-6xl md:text-7xl font-black bg-gradient-to-br from-orange-400 via-orange-500 to-red-600 bg-clip-text text-transparent mb-4 group-hover:scale-105 transition-transform duration-250">
                    24/7
                  </div>
                  <div className="text-white text-xl font-semibold mb-2">Relentless Support</div>
                  <div className="text-white/50 text-sm max-w-xs mx-auto">
                    Midnight doubts? We're there. Early morning grind? We're with you. Always.
                  </div>
                </div>

                <div className="text-center group">
                  <div className="text-6xl md:text-7xl font-black bg-gradient-to-br from-orange-400 via-orange-500 to-red-600 bg-clip-text text-transparent mb-4 group-hover:scale-105 transition-transform duration-250">
                    100%
                  </div>
                  <div className="text-white text-xl font-semibold mb-2">Commitment Promise</div>
                  <div className="text-white/50 text-sm max-w-xs mx-auto">
                    You bring the dedication. We bring the blueprint. Together, we guarantee transformation.
                  </div>
                </div>
              </div>

              <div className="mt-12 text-center">
                <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-6 py-3">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 border-2 border-black"></div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 border-2 border-black"></div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 border-2 border-black"></div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 border-2 border-black"></div>
                  </div>
                  <span className="text-white/70 text-sm">Join 850+ members transforming their lives right now</span>
                </div>
              </div>
            </div>
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

      {/* Motivational Stories Modal */}
      {showStories && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-250">
          <div className="relative w-full max-w-6xl max-h-[90vh] bg-zinc-900 rounded-3xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm border-b border-white/10 px-6 md:px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    Real People. Real Transformations.
                  </h2>
                  <p className="text-white/60 text-sm md:text-base">
                    These are the stories that prove what's possible when you commit.
                  </p>
                </div>
                <button
                  onClick={() => setShowStories(false)}
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors ml-4"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Stories Grid */}
            <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6 md:p-8">
              <div className="grid md:grid-cols-2 gap-6">
                {motivationalStories.map((story) => (
                  <div
                    key={story.id}
                    className="relative bg-zinc-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/5 hover:border-orange-500/30 transition-all duration-250 group"
                  >
                    {/* Profile */}
                    <div className="flex items-start gap-4 mb-4">
                      <img
                        src={story.image}
                        alt={story.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-orange-500/50"
                      />
                      <div className="flex-1">
                        <h3 className="text-white text-lg font-bold mb-1">{story.name}</h3>
                        <p className="text-orange-500 text-sm font-medium mb-1">{story.achievement}</p>
                        <p className="text-white/40 text-xs">Age {story.age}</p>
                      </div>
                    </div>

                    {/* Journey */}
                    <div className="space-y-3 mb-4">
                      <div>
                        <div className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">
                          Before
                        </div>
                        <p className="text-white/70 text-sm">{story.before}</p>
                      </div>
                      <div className="h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent"></div>
                      <div>
                        <div className="text-orange-500 text-xs font-semibold uppercase tracking-wider mb-1">
                          After
                        </div>
                        <p className="text-white text-sm font-medium">{story.after}</p>
                      </div>
                    </div>

                    {/* Quote */}
                    <div className="relative bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="absolute -top-2 -left-2 text-4xl text-orange-500/30">"</div>
                      <p className="text-white/80 text-sm italic leading-relaxed pl-4">
                        {story.quote}
                      </p>
                    </div>

                    {/* Accent */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-250"></div>
                  </div>
                ))}
              </div>

              {/* Call to Action */}
              <div className="mt-8 text-center p-8 bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10 rounded-2xl border border-orange-500/20">
                <h3 className="text-white text-2xl font-bold mb-3">
                  Your Story Starts Now
                </h3>
                <p className="text-white/70 mb-6 max-w-2xl mx-auto">
                  Every champion was once a beginner who refused to give up. Join our community and become the next transformation story.
                </p>
                <Button
                  onClick={() => {
                    setShowStories(false);
                    scrollToSection('contact');
                  }}
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold px-8 py-6 text-lg"
                >
                  Start Your Transformation
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}