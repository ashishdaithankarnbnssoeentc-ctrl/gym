import { Check, Star } from 'lucide-react';
import { Button } from './ui/button';

const plans = [
  {
    name: 'Basic',
    price: '29',
    period: 'month',
    description: 'Perfect for getting started',
    features: [
      'Access to gym floor',
      'Standard equipment',
      'Locker room access',
      'Mobile app access',
      '1 guest pass per month',
    ],
    popular: false,
  },
  {
    name: 'Pro',
    price: '59',
    period: 'month',
    description: 'Most popular choice',
    features: [
      'Everything in Basic',
      'Unlimited group classes',
      'Sauna & spa access',
      'Free fitness assessment',
      'Nutrition consultation',
      '4 guest passes per month',
    ],
    popular: true,
  },
  {
    name: 'Elite',
    price: '99',
    period: 'month',
    description: 'Ultimate fitness experience',
    features: [
      'Everything in Pro',
      'Personal training sessions (4/mo)',
      'Priority class booking',
      '24/7 facility access',
      'Customized meal plans',
      'Free merchandise',
      'Unlimited guest passes',
    ],
    popular: false,
  },
];

interface PricingProps {
  onJoinNow?: () => void;
}

export function Pricing({ onJoinNow }: PricingProps) {
  return (
    <section id="pricing" className="py-20 md:py-32 bg-black">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 mb-4">
            <span className="text-orange-500 text-sm">Pricing Plans</span>
          </div>
          <h2 className="text-white text-4xl md:text-5xl lg:text-6xl mb-6">
            Choose Your Membership
          </h2>
          <p className="text-white/60 text-lg">
            Flexible plans designed to fit your lifestyle and fitness goals. No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white/5 rounded-2xl p-8 border transition-all duration-300 ${
                plan.popular
                  ? 'border-orange-500 bg-gradient-to-br from-orange-500/10 to-red-600/10 scale-105'
                  : 'border-white/10 hover:border-orange-500/50'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-full px-4 py-1.5 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-white fill-white" />
                    <span className="text-white text-sm">Most Popular</span>
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-8 mt-4">
                <h3 className="text-white text-2xl mb-2">{plan.name}</h3>
                <p className="text-white/60 text-sm mb-6">{plan.description}</p>
                <div className="flex items-end justify-center gap-1">
                  <span className="text-white text-5xl">${plan.price}</span>
                  <span className="text-white/60 text-lg mb-2">/{plan.period}</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-orange-500" />
                    </div>
                    <span className="text-white/80 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Button
                className={`w-full ${
                  plan.popular
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                }`}
                size="lg"
                onClick={onJoinNow}
              >
                Get Started
              </Button>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="text-center mt-12">
          <p className="text-white/60">
            All plans include a 7-day free trial. No credit card required.{' '}
            <button className="text-orange-500 hover:text-orange-400 underline">
              View detailed comparison
            </button>
          </p>
        </div>
      </div>
    </section>
  );
}
