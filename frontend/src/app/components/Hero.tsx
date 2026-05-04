import { ArrowRight, Play } from 'lucide-react';
import { Button } from './ui/button';
import { useRef, useEffect, useState } from 'react';

interface HeroProps {
  onJoinNow?: () => void;
}

export function Hero({ onJoinNow }: HeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      // Force video to load and play
      video.load();
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Video autoplay prevented by browser - silent fail
        });
      }
    }
  }, []);

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Video with Overlay */}
      <div className="absolute inset-0 z-0">
        {/* GYM WEIGHTLIFTING Video Background */}
        {!videoError ? (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            poster="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80"
            onError={() => setVideoError(true)}
          >
            <source 
              src="https://cdn.pixabay.com/video/2024/01/12/196598-904451227_large.mp4" 
              type="video/mp4"
            />
            <source 
              src="https://assets.mixkit.co/videos/preview/mixkit-man-doing-weight-lifting-23566-large.mp4" 
              type="video/mp4"
            />
            <source 
              src="https://cdn.pixabay.com/video/2022/12/07/142446-779205929_large.mp4" 
              type="video/mp4"
            />
          </video>
        ) : (
          <div 
            className="w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: 'url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80)'
            }}
          />
        )}
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/60" />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 z-10 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <span className="text-white/90 text-sm">Premium Fitness Experience</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-white mb-6">
            <div className="text-5xl md:text-7xl lg:text-8xl mb-4">
              TRANSFORM
            </div>
            <div className="text-4xl md:text-6xl lg:text-7xl">
              YOUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">BODY</span>
            </div>
          </h1>

          {/* Subheading */}
          <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Experience world-class training, cutting-edge equipment, and a community that pushes you to achieve your ultimate fitness goals.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-8 py-6 text-lg group"
              onClick={onJoinNow}
            >
              Start Your Journey
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white/30 bg-transparent hover:bg-white/10 px-8 py-6 backdrop-blur-sm !text-white hover:!text-white"
              style={{ color: 'white' }}
            >
              <Play className="mr-2 w-5 h-5" style={{ color: 'white' }} />
              <span style={{ color: 'white', fontSize: '16px' }}>Watch Tour</span>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-20 pt-12 border-t border-white/10">
            <div>
              <div className="text-3xl md:text-4xl text-white mb-2">5000+</div>
              <div className="text-white/60">Active Members</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl text-white mb-2">50+</div>
              <div className="text-white/60">Expert Trainers</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl text-white mb-2">100+</div>
              <div className="text-white/60">Classes Weekly</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2">
          <div className="w-1.5 h-3 bg-white/60 rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
}