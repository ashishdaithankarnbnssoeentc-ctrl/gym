import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
}

export function SEO({
  title = 'Elite Fitness - Premium Gym & Fitness Center',
  description = 'Transform your fitness journey at Elite Fitness. World-class facilities, expert trainers, yoga classes, and personalized training programs. Join 5000+ members today!',
  keywords = 'gym, fitness, workout, personal training, yoga, HIIT, strength training, cardio, wellness, health club, fitness center',
  image = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200',
  url = 'https://elitefitness.com',
  type = 'website',
}: SEOProps) {
  useEffect(() => {
    // Update title
    document.title = title;

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.content = content;
    };

    // Standard meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);
    updateMetaTag('author', 'Elite Fitness');
    updateMetaTag('robots', 'index, follow');
    updateMetaTag('viewport', 'width=device-width, initial-scale=1.0');

    // Open Graph tags
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:image', image, true);
    updateMetaTag('og:url', url, true);
    updateMetaTag('og:type', type, true);
    updateMetaTag('og:site_name', 'Elite Fitness', true);

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', image);

    // Additional SEO tags
    updateMetaTag('theme-color', '#f97316');
    updateMetaTag('apple-mobile-web-app-capable', 'yes');
    updateMetaTag('apple-mobile-web-app-status-bar-style', 'black-translucent');

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    // Schema.org JSON-LD
    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'HealthAndBeautyBusiness',
      name: 'Elite Fitness',
      description: description,
      url: url,
      logo: image,
      image: image,
      priceRange: '$29 - $99',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '123 Fitness Avenue',
        addressLocality: 'New York',
        addressRegion: 'NY',
        postalCode: '10001',
        addressCountry: 'US',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 40.7128,
        longitude: -74.0060,
      },
      openingHours: 'Mo-Fr 05:00-24:00, Sa-Su 06:00-22:00',
      telephone: '+1-555-123-4567',
      email: 'info@elitefitness.com',
      sameAs: [
        'https://facebook.com/elitefitness',
        'https://instagram.com/elitefitness',
        'https://twitter.com/elitefitness',
      ],
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Membership Plans',
        itemListElement: [
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: 'Basic Membership',
              description: 'Access to gym facilities and basic classes',
            },
            price: '29.00',
            priceCurrency: 'USD',
          },
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: 'Premium Membership',
              description: 'Full access with personal training sessions',
            },
            price: '59.00',
            priceCurrency: 'USD',
          },
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: 'Elite Membership',
              description: 'VIP access with unlimited personal training',
            },
            price: '99.00',
            priceCurrency: 'USD',
          },
        ],
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        reviewCount: '1250',
      },
    });

    const existingSchema = document.querySelector('script[type="application/ld+json"]');
    if (existingSchema) {
      existingSchema.remove();
    }
    document.head.appendChild(schemaScript);

    return () => {
      if (schemaScript.parentNode) {
        schemaScript.parentNode.removeChild(schemaScript);
      }
    };
  }, [title, description, keywords, image, url, type]);

  return null;
}
