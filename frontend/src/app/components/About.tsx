import { ScrollReveal } from './ScrollReveal';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Target, Heart, Zap, Users, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';

const values = [
  {
    icon: <Target className="w-8 h-8" />,
    title: 'Goal-Driven',
    description: 'We help you set and achieve realistic fitness goals with personalized plans.',
  },
  {
    icon: <Heart className="w-8 h-8" />,
    title: 'Community First',
    description: 'Build lasting connections in a supportive, inclusive environment.',
  },
  {
    icon: <Zap className="w-8 h-8" />,
    title: 'Innovation',
    description: 'Cutting-edge equipment and training methods backed by science.',
  },
  {
    icon: <Users className="w-8 h-8" />,
    title: 'Expert Guidance',
    description: 'Certified trainers dedicated to your success and wellbeing.',
  },
];

export function About() {
  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section id="about" className="py-20 bg-black">
      <div className="container mx-auto px-4">
        {/* Story Section */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
          <ScrollReveal direction="left">
            <div>
              <h2 className="text-white text-4xl md:text-5xl mb-6">Our Story</h2>
              <p className="text-white/70 text-lg mb-4">
                Founded in 2015, Elite Fitness was born from a simple belief: everyone deserves access to world-class fitness facilities and expert guidance, regardless of their starting point.
              </p>
              <p className="text-white/70 text-lg mb-4">
                What started as a single location with 20 members has grown into a thriving community of over 5,000 active members across multiple locations. But our core mission remains unchanged.
              </p>
              <p className="text-white/70 text-lg">
                We're not just about building muscles—we're about building confidence, discipline, and a lifestyle that empowers you to be your best self.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right" delay={0.2}>
            <div className="relative h-[400px] rounded-lg overflow-hidden">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800"
                alt="Gym interior"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          </ScrollReveal>
        </div>

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-12 mb-20">
          <ScrollReveal direction="up" delay={0.1}>
            <div className="bg-gradient-to-br from-orange-500/10 to-red-600/10 border border-orange-500/20 rounded-lg p-8">
              <h3 className="text-white text-3xl mb-4">Our Mission</h3>
              <p className="text-white/70 text-lg">
                To provide an inclusive, motivating environment where individuals of all fitness levels can transform their lives through health and wellness.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.2}>
            <div className="bg-gradient-to-br from-orange-500/10 to-red-600/10 border border-orange-500/20 rounded-lg p-8">
              <h3 className="text-white text-3xl mb-4">Our Vision</h3>
              <p className="text-white/70 text-lg">
                To be the leading fitness community that inspires lasting lifestyle changes and makes premium fitness accessible to everyone.
              </p>
            </div>
          </ScrollReveal>
        </div>

        {/* Core Values */}
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="text-white text-4xl md:text-5xl mb-4">Core Values</h2>
            <p className="text-white/60 text-lg">
              The principles that guide everything we do
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {values.map((value, index) => (
            <ScrollReveal key={index} delay={index * 0.1} direction="up">
              <div className="text-center p-6 rounded-lg bg-white/5 border border-white/10 hover:border-orange-500/50 transition-all hover:transform hover:scale-105">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-orange-500/20 to-red-600/20 text-orange-500">
                  {value.icon}
                </div>
                <h3 className="text-white text-xl mb-3">{value.title}</h3>
                <p className="text-white/60">{value.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Call to Action */}
        <ScrollReveal delay={0.5}>
          <div className="text-center mt-12">
            <Button 
              onClick={() => scrollToSection('pricing')}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-8 py-3"
              size="lg"
            >
              Join Our Community <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}