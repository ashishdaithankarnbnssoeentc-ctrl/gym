import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { Stats } from '../components/Stats';
import { Features } from '../components/Features';
import { About } from '../components/About';
import { Classes } from '../components/Classes';
import { Trainers } from '../components/Trainers';
import { Pricing } from '../components/Pricing';
import { Testimonials } from '../components/Testimonials';
import { VideoGallery } from '../components/VideoGallery';
import { Gallery } from '../components/Gallery';
import { FAQ } from '../components/FAQ';
import { Contact } from '../components/Contact';
import { CTASection } from '../components/CTASection';
import { Footer } from '../components/Footer';
import { useNavigate } from 'react-router';

/**
 * HomePage - Main landing page with all sections
 */
export function HomePage() {
  const navigate = useNavigate();

  const handleNavigate = (page: string) => {
    navigate(`/${page}`);
  };

  return (
    <div className="min-h-screen bg-black">
      <Header onNavigate={handleNavigate} />
      <Hero />
      <Stats />
      <Features />
      <About />
      <Classes />
      <Trainers />
      <Pricing />
      <Testimonials />
      <VideoGallery />
      <Gallery />
      <FAQ />
      <Contact />
      <CTASection />
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}
