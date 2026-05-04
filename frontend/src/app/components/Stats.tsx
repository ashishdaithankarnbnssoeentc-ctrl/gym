import { motion, useInView, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useRef } from 'react';
import { Users, Dumbbell, Award, TrendingUp } from 'lucide-react';

interface StatItemProps {
  icon: React.ReactNode;
  value: number;
  suffix?: string;
  label: string;
  delay?: number;
}

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 50,
    stiffness: 100,
  });
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [motionValue, isInView, value]);

  useEffect(() => {
    return springValue.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = `${Math.floor(latest)}${suffix}`;
      }
    });
  }, [springValue, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

function StatItem({ icon, value, suffix, label, delay = 0 }: StatItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="text-center"
    >
      <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-orange-500/20 to-red-600/20 border border-orange-500/30">
        {icon}
      </div>
      <div className="text-white text-4xl md:text-5xl mb-2">
        <AnimatedCounter value={value} suffix={suffix} />
      </div>
      <p className="text-white/60">{label}</p>
    </motion.div>
  );
}

export function Stats() {
  return (
    <section className="py-20 bg-black border-y border-white/10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          <StatItem
            icon={<Users className="w-8 h-8 text-orange-500" />}
            value={5000}
            suffix="+"
            label="Active Members"
            delay={0}
          />
          <StatItem
            icon={<Dumbbell className="w-8 h-8 text-orange-500" />}
            value={150}
            suffix="+"
            label="Classes Weekly"
            delay={0.1}
          />
          <StatItem
            icon={<Award className="w-8 h-8 text-orange-500" />}
            value={50}
            suffix="+"
            label="Expert Trainers"
            delay={0.2}
          />
          <StatItem
            icon={<TrendingUp className="w-8 h-8 text-orange-500" />}
            value={98}
            suffix="%"
            label="Success Rate"
            delay={0.3}
          />
        </div>
      </div>
    </section>
  );
}
