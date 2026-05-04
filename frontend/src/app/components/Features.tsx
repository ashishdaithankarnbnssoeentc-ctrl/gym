import { Dumbbell, Users, Trophy, Clock, Heart, Zap } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

const features = [
  {
    icon: Dumbbell,
    title: 'Premium Equipment',
    description: 'State-of-the-art machines and free weights from leading brands.',
  },
  {
    icon: Users,
    title: 'Expert Trainers',
    description: 'Certified professionals dedicated to your fitness journey.',
  },
  {
    icon: Trophy,
    title: 'Proven Results',
    description: 'Join thousands who have achieved their fitness goals with us.',
  },
  {
    icon: Clock,
    title: '24/7 Access',
    description: 'Train on your schedule with round-the-clock facility access.',
  },
  {
    icon: Heart,
    title: 'Community Support',
    description: 'Be part of a motivating community that celebrates your wins.',
  },
  {
    icon: Zap,
    title: 'High Energy',
    description: 'Dynamic atmosphere designed to keep you motivated and focused.',
  },
];

export function Features() {
  return (
    <section className="py-20 bg-gradient-to-b from-black to-zinc-900">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-white text-4xl md:text-5xl mb-4">
              Why Choose Elite Fitness
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Experience the perfect blend of cutting-edge facilities, expert guidance, and a supportive community.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <ScrollReveal key={index} delay={index * 0.1} direction="up">
                <div className="group relative bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-orange-500/50 transition-all duration-300 hover:transform hover:scale-105">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-600/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-white text-xl mb-3 group-hover:text-orange-500 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-white/60 group-hover:text-white/80 transition-colors">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}