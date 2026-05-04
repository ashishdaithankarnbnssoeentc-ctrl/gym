import { ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';

interface CTASectionProps {
  onJoinNow?: () => void;
}

export function CTASection({ onJoinNow }: CTASectionProps) {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-br from-orange-600 via-red-600 to-orange-700 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Heading */}
          <h2 className="text-white text-4xl md:text-5xl lg:text-6xl mb-6">
            Ready to Start Your Fitness Journey?
          </h2>
          <p className="text-white/90 text-lg md:text-xl mb-10">
            Join thousands of members who have transformed their lives. Get started today with our 7-day free trial.
          </p>

          {/* Benefits */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-10">
            <div className="flex items-center gap-2 text-white">
              <CheckCircle className="w-5 h-5" />
              <span>No Credit Card Required</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <CheckCircle className="w-5 h-5" />
              <span>Cancel Anytime</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <CheckCircle className="w-5 h-5" />
              <span>Free Consultation</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              className="bg-white text-orange-600 hover:bg-gray-100 px-8 py-6 text-lg group"
              onClick={onJoinNow}
            >
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <button
              className="h-10 rounded-md px-8 py-6 border border-white bg-transparent hover:bg-white/10 backdrop-blur-sm inline-flex items-center justify-center gap-2"
              style={{ color: 'white', fontSize: '18px', fontWeight: '500' }}
            >
              Schedule a Tour
            </button>
          </div>

          {/* Additional Info */}
          <p className="text-white/80 text-sm mt-8">
            Questions? Call us at (555) 123-4567 or{' '}
            <button className="underline hover:text-white">chat with us</button>
          </p>
        </div>
      </div>
    </section>
  );
}