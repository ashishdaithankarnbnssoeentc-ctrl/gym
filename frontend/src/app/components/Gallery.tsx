import { ImageWithFallback } from './figma/ImageWithFallback';
import { useState } from 'react';
import { ImageLightbox } from './ImageLightbox';
import { Expand } from 'lucide-react';

const galleryImages = [
  {
    url: 'https://images.unsplash.com/photo-1758957646695-ec8bce3df462?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxneW0lMjBlcXVpcG1lbnQlMjBtb2Rlcm58ZW58MXx8fHwxNzYyNjg2Nzg4fDA&ixlib=rb-4.1.0&q=80&w=1080',
    alt: 'Modern gym equipment',
    span: 'md:col-span-2 md:row-span-2',
  },
  {
    url: 'https://images.unsplash.com/photo-1591291621164-2c6367723315?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHJlbmd0aCUyMHRyYWluaW5nJTIwd2VpZ2h0c3xlbnwxfHx8fDE3NjI3MjI1NzV8MA&ixlib=rb-4.1.0&q=80&w=1080',
    alt: 'Strength training area',
    span: '',
  },
  {
    url: 'https://images.unsplash.com/photo-1647780796058-66b174e97d5f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaXRuZXNzJTIwY2xhc3MlMjBwZW9wbGV8ZW58MXx8fHwxNzYyNzMxMjA1fDA&ixlib=rb-4.1.0&q=80&w=1080',
    alt: 'Group fitness class',
    span: '',
  },
  {
    url: 'https://images.unsplash.com/photo-1570456606214-1cddd2744fe2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxib3hpbmclMjBneW0lMjB0cmFpbmluZ3xlbnwxfHx8fDE3NjI3MDM2MjV8MA&ixlib=rb-4.1.0&q=80&w=1080',
    alt: 'Boxing training',
    span: 'md:row-span-2',
  },
  {
    url: 'https://images.unsplash.com/photo-1651077837628-52b3247550ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b2dhJTIwY2xhc3MlMjBzdHVkaW98ZW58MXx8fHwxNzYyNjg4Nzc1fDA&ixlib=rb-4.1.0&q=80&w=1080',
    alt: 'Yoga studio',
    span: '',
  },
  {
    url: 'https://images.unsplash.com/photo-1540205453279-389ebbc43b5b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb25hbCUyMHRyYWluZXIlMjBjb2FjaGluZ3xlbnwxfHx8fDE3NjI3MTMzNjl8MA&ixlib=rb-4.1.0&q=80&w=1080',
    alt: 'Personal training session',
    span: '',
  },
];

export function Gallery() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <section className="py-20 md:py-32 bg-black">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 mb-4">
            <span className="text-orange-500 text-sm">Facilities</span>
          </div>
          <h2 className="text-white text-4xl md:text-5xl lg:text-6xl mb-6">
            State-of-the-Art Facility
          </h2>
          <p className="text-white/60 text-lg">
            Experience premium equipment, spacious workout areas, and a motivating environment designed for your success.
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[200px] max-w-6xl mx-auto">
          {galleryImages.map((image, index) => (
            <button
              key={index}
              onClick={() => setLightboxIndex(index)}
              className={`group relative overflow-hidden rounded-2xl ${image.span} cursor-pointer`}
            >
              <ImageWithFallback
                src={image.url}
                alt={image.alt}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Expand Icon */}
              <div className="absolute top-4 right-4 w-10 h-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Expand className="w-5 h-5 text-white" />
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <p className="text-white text-lg">{image.alt}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={galleryImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </section>
  );
}