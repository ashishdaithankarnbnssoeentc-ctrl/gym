import { ScrollReveal } from './ScrollReveal';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';

const faqs = [
  {
    question: 'What membership plans do you offer?',
    answer: 'We offer three membership tiers: Basic ($29/month), Premium ($59/month), and Elite ($99/month). Each plan includes different levels of access to classes, personal training sessions, and premium amenities. Check our Pricing section for detailed benefits.',
  },
  {
    question: 'Can I pause or cancel my membership?',
    answer: 'Yes! You can pause your membership for up to 3 months per year or cancel anytime with 30 days notice. We believe in flexibility to fit your lifestyle and schedule.',
  },
  {
    question: 'Do you offer personal training?',
    answer: 'Absolutely! All our plans include some level of personal training. Premium and Elite members get dedicated one-on-one sessions with certified trainers who create customized workout plans tailored to your goals.',
  },
  {
    question: 'What are your operating hours?',
    answer: 'We\'re open 24/7 for Elite members, while Basic and Premium members have access from 5 AM to midnight daily. Our staffed hours with trainers available are 6 AM to 10 PM on weekdays and 7 AM to 8 PM on weekends.',
  },
  {
    question: 'Do I need to book classes in advance?',
    answer: 'For popular classes like yoga, HIIT, and spin, we recommend booking 24-48 hours in advance. However, walk-ins are welcome if space is available. Elite members get priority booking and guaranteed spots.',
  },
  {
    question: 'What should I bring for my first visit?',
    answer: 'Just bring comfortable workout clothes, athletic shoes, a water bottle, and a positive attitude! We provide complimentary towels, lockers, and basic toiletries. First-time visitors get a free fitness assessment with one of our trainers.',
  },
  {
    question: 'Are there shower and locker facilities?',
    answer: 'Yes! We have premium locker rooms with showers, steam rooms, and saunas. Premium and Elite members get access to luxury amenities including towel service, high-end toiletries, and hair styling tools.',
  },
  {
    question: 'Can I bring a guest?',
    answer: 'Premium members get 2 guest passes per month, and Elite members get unlimited guest access. Guests must be 18+ and sign a waiver. It\'s a great way to work out with friends and share the fitness journey!',
  },
];

export function FAQ() {
  return (
    <section id="faq" className="py-20 bg-gradient-to-b from-black to-zinc-900">
      <div className="container mx-auto px-4 max-w-4xl">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="text-white text-4xl md:text-5xl mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-white/60 text-lg">
              Everything you need to know about our gym and memberships
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white/5 border border-white/10 rounded-lg px-6 backdrop-blur-sm"
              >
                <AccordionTrigger className="text-white hover:text-orange-500 transition-colors text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-white/70">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollReveal>

        <ScrollReveal delay={0.4}>
          <div className="mt-12 text-center">
            <p className="text-white/60 mb-4">Still have questions?</p>
            <button 
              onClick={() => {
                const contactSection = document.getElementById('contact');
                if (contactSection) {
                  contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-8 py-3 rounded-lg transition-all transform hover:scale-105"
            >
              Contact Support
            </button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}