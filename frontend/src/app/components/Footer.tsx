import { Dumbbell, Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface FooterProps {
  onNavigate?: (page: 'terms' | 'privacy' | 'cookies' | 'disclaimer') => void;
}

export function Footer({ onNavigate }: FooterProps = {}) {
  const footerLinks = {
    Company: ['About Us', 'Our Team', 'Careers', 'Press', 'Contact'],
    Classes: ['Strength Training', 'HIIT', 'Yoga', 'Boxing', 'View All'],
    Support: ['FAQ', 'Membership', 'Pricing', 'Locations', 'Contact Us'],
    Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Disclaimer'],
  };

  // Map links to section IDs for smooth scrolling
  const linkMapping: { [key: string]: string } = {
    'About Us': 'about',
    'Our Team': 'trainers',
    'Careers': 'home',
    'Press': 'home',
    'Contact': 'contact',
    'Strength Training': 'classes',
    'HIIT': 'classes',
    'Yoga': 'classes',
    'Boxing': 'classes',
    'View All': 'classes',
    'FAQ': 'faq',
    'Membership': 'pricing',
    'Pricing': 'pricing',
    'Locations': 'contact',
    'Contact Us': 'contact',
  };

  // Legal pages that show coming soon message
  const legalPages = ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Disclaimer'];

  const handleLinkClick = (link: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // Handle legal pages with navigation
    if (link === 'Privacy Policy' && onNavigate) {
      onNavigate('privacy');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    if (link === 'Terms of Service' && onNavigate) {
      onNavigate('terms');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    if (link === 'Cookie Policy' && onNavigate) {
      onNavigate('cookies');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    // Disclaimer shows a toast
    if (link === 'Disclaimer') {
      if (onNavigate) {
        onNavigate('disclaimer');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        toast.info('Disclaimer', {
          description: 'This page is coming soon. For questions, please contact us.',
          duration: 4000,
        });
      }
      return;
    }

    const sectionId = linkMapping[link];
    
    if (sectionId) {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        toast.success(`Navigating to ${link}`, {
          duration: 2000,
        });
      } else {
        toast.error('Section not found', {
          description: `Unable to find the ${link} section.`,
        });
      }
    } else {
      toast.error('Link not configured', {
        description: `The ${link} link is not yet configured.`,
      });
    }
  };

  return (
    <footer className="bg-black border-t border-white/10">
      <div className="container mx-auto px-4 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-12 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2 rounded-lg">
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-xl">ELITE FITNESS</span>
            </div>
            <p className="text-white/60 mb-6">
              Transform your body and mind with world-class training, premium facilities, and a community that inspires greatness.
            </p>
            
            {/* Social Links */}
            <div className="flex gap-3">
              <button 
                onClick={() => toast.info('Social Media', { description: 'Facebook page coming soon!' })}
                className="w-10 h-10 bg-white/10 hover:bg-orange-500 border border-white/10 rounded-lg flex items-center justify-center transition-colors"
              >
                <Facebook className="w-4 h-4 text-white" />
              </button>
              <button 
                onClick={() => toast.info('Social Media', { description: 'Instagram page coming soon!' })}
                className="w-10 h-10 bg-white/10 hover:bg-orange-500 border border-white/10 rounded-lg flex items-center justify-center transition-colors"
              >
                <Instagram className="w-4 h-4 text-white" />
              </button>
              <button 
                onClick={() => toast.info('Social Media', { description: 'Twitter page coming soon!' })}
                className="w-10 h-10 bg-white/10 hover:bg-orange-500 border border-white/10 rounded-lg flex items-center justify-center transition-colors"
              >
                <Twitter className="w-4 h-4 text-white" />
              </button>
              <button 
                onClick={() => toast.info('Social Media', { description: 'YouTube channel coming soon!' })}
                className="w-10 h-10 bg-white/10 hover:bg-orange-500 border border-white/10 rounded-lg flex items-center justify-center transition-colors"
              >
                <Youtube className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Links Sections */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-white mb-4">{title}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" onClick={(e) => handleLinkClick(link, e)} className="text-white/60 hover:text-orange-500 transition-colors text-sm">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8 border-t border-b border-white/10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <div className="text-white/60 text-sm mb-1">Location</div>
              <div className="text-white">123 Fitness Street, NY 10001</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <div className="text-white/60 text-sm mb-1">Phone</div>
              <div className="text-white">(555) 123-4567</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <div className="text-white/60 text-sm mb-1">Email</div>
              <div className="text-white">info@elitefitness.com</div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-8">
          <div className="text-center md:text-left">
            <p className="text-white/60 text-sm">
              © 2025 Elite Fitness LLC. All rights reserved.
            </p>
            <p className="text-white/40 text-xs mt-1">
              Website design, code, and content protected by copyright law. Unauthorized copying or use prohibited.
            </p>
          </div>
          <div className="flex gap-6">
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                if (onNavigate) onNavigate('privacy');
              }}
              className="text-white/60 hover:text-orange-500 transition-colors text-sm"
            >
              Privacy Policy
            </a>
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                if (onNavigate) onNavigate('terms');
              }}
              className="text-white/60 hover:text-orange-500 transition-colors text-sm"
            >
              Terms of Service
            </a>
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                toast.info('Sitemap', { description: 'Sitemap coming soon!' });
              }}
              className="text-white/60 hover:text-orange-500 transition-colors text-sm"
            >
              Sitemap
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}