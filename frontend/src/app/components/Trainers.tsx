import { Instagram, Linkedin } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';

const trainers = [
  {
    name: 'Marcus Johnson',
    role: 'Head Strength Coach',
    specialty: 'Strength & Conditioning',
    image: 'https://images.unsplash.com/photo-1540205453279-389ebbc43b5b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb25hbCUyMHRyYWluZXIlMjBjb2FjaGluZ3xlbnwxfHx8fDE3NjI3MTMzNjl8MA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    name: 'Sarah Chen',
    role: 'HIIT Specialist',
    specialty: 'HIIT & Cardio',
    image: 'https://images.unsplash.com/photo-1761619187897-a38e2fb9b230?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaXRuZXNzJTIwdHJhbnNmb3JtYXRpb258ZW58MXx8fHwxNzYyNjc3MzQwfDA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    name: 'Alex Rivera',
    role: 'Yoga Instructor',
    specialty: 'Yoga & Wellness',
    image: 'https://images.unsplash.com/photo-1651077837628-52b3247550ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b2dhJTIwY2xhc3MlMjBzdHVkaW98ZW58MXx8fHwxNzYyNjg4Nzc1fDA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    name: 'Jordan Blake',
    role: 'Boxing Coach',
    specialty: 'Boxing & Combat',
    image: 'https://images.unsplash.com/photo-1570456606214-1cddd2744fe2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxib3hpbmclMjBneW0lMjB0cmFpbmluZ3xlbnwxfHx8fDE3NjI3MDM2MjV8MA&ixlib=rb-4.1.0&q=80&w=1080',
  },
];

export function Trainers() {
  return (
    <section id="trainers" className="py-20 md:py-32 bg-gradient-to-br from-gray-950 via-black to-gray-950">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 mb-4">
            <span className="text-orange-500 text-sm">Our Team</span>
          </div>
          <h2 className="text-white text-4xl md:text-5xl lg:text-6xl mb-6">
            Meet Your Expert Trainers
          </h2>
          <p className="text-white/60 text-lg">
            Our certified professionals are passionate about helping you achieve your fitness goals with personalized guidance and support.
          </p>
        </div>

        {/* Trainers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {trainers.map((trainer, index) => (
            <div
              key={index}
              className="group relative bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-orange-500/50 transition-all duration-300"
            >
              {/* Image */}
              <div className="relative h-80 overflow-hidden">
                <ImageWithFallback
                  src={trainer.image}
                  alt={trainer.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                
                {/* Social Links */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => toast.info('Connect with ' + trainer.name, { 
                      description: 'Instagram profile coming soon! Follow @elitefitness for updates.' 
                    })}
                    className="w-10 h-10 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                  >
                    <Instagram className="w-4 h-4 text-white" />
                  </button>
                  <button 
                    onClick={() => toast.info('Connect with ' + trainer.name, { 
                      description: 'LinkedIn profile coming soon! Connect with our trainers.' 
                    })}
                    className="w-10 h-10 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                  >
                    <Linkedin className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="inline-block bg-orange-500/20 backdrop-blur-sm border border-orange-500/30 rounded-full px-3 py-1 mb-3">
                    <span className="text-orange-400 text-xs">{trainer.specialty}</span>
                  </div>
                  <h3 className="text-white text-xl mb-1">{trainer.name}</h3>
                  <p className="text-white/60 text-sm">{trainer.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}