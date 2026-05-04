import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Emily Rodriguez',
    role: 'Marketing Executive',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    rating: 5,
    text: "Elite Fitness transformed my life. The trainers are incredibly knowledgeable and supportive. I've never felt stronger or more confident!",
  },
  {
    name: 'David Kim',
    role: 'Software Engineer',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    rating: 5,
    text: 'Best gym investment I\'ve ever made. The facilities are top-notch, and the community atmosphere keeps me motivated every single day.',
  },
  {
    name: 'Jessica Taylor',
    role: 'Entrepreneur',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    rating: 5,
    text: 'The personalized training programs and nutrition guidance helped me achieve goals I never thought possible. Highly recommend!',
  },
  {
    name: 'Michael Chen',
    role: 'Graphic Designer',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    rating: 5,
    text: 'From the moment I walked in, I felt welcomed. The variety of classes and equipment options make every workout exciting and effective.',
  },
];

export function Testimonials() {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-br from-gray-950 via-black to-gray-950">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 mb-4">
            <span className="text-orange-500 text-sm">Testimonials</span>
          </div>
          <h2 className="text-white text-4xl md:text-5xl lg:text-6xl mb-6">
            Stories of Transformation
          </h2>
          <p className="text-white/60 text-lg">
            Hear from our members about how Elite Fitness has helped them achieve their fitness goals.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-orange-500/50 transition-all duration-300"
            >
              {/* Quote Icon */}
              <div className="absolute top-8 right-8 opacity-10">
                <Quote className="w-16 h-16 text-orange-500" />
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-orange-500 fill-orange-500" />
                ))}
              </div>

              {/* Testimonial Text */}
              <p className="text-white/80 text-lg mb-8 relative z-10">
                "{testimonial.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full overflow-hidden">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="text-white">{testimonial.name}</div>
                  <div className="text-white/60 text-sm">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 pt-16 border-t border-white/10 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-4xl md:text-5xl text-white mb-2">4.9/5</div>
            <div className="text-white/60">Average Rating</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl text-white mb-2">2,500+</div>
            <div className="text-white/60">Happy Members</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl text-white mb-2">98%</div>
            <div className="text-white/60">Success Rate</div>
          </div>
        </div>
      </div>
    </section>
  );
}
