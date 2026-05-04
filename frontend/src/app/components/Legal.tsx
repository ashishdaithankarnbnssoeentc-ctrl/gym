import { ArrowLeft, Shield, Lock, Cookie, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

interface LegalProps {
  onBack: () => void;
  type: 'terms' | 'privacy' | 'cookies' | 'disclaimer';
}

export function Legal({ onBack, type }: LegalProps) {
  const getContent = () => {
    switch (type) {
      case 'terms':
        return <TermsOfService />;
      case 'privacy':
        return <PrivacyPolicy />;
      case 'cookies':
        return <CookiePolicy />;
      case 'disclaimer':
        return <Disclaimer />;
      default:
        return <TermsOfService />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'terms':
        return 'Terms of Service';
      case 'privacy':
        return 'Privacy Policy';
      case 'cookies':
        return 'Cookie Policy';
      case 'disclaimer':
        return 'Disclaimer';
      default:
        return 'Legal';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'terms':
        return <FileText className="w-6 h-6 text-orange-500" />;
      case 'privacy':
        return <Shield className="w-6 h-6 text-orange-500" />;
      case 'cookies':
        return <Cookie className="w-6 h-6 text-orange-500" />;
      case 'disclaimer':
        return <Lock className="w-6 h-6 text-orange-500" />;
      default:
        return <FileText className="w-6 h-6 text-orange-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={onBack}
              variant="ghost"
              size="sm"
              className="text-white hover:text-orange-500"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-12">
          <div className="flex items-center gap-3 mb-6">
            {getIcon()}
            <h1 className="text-white text-3xl md:text-4xl">{getTitle()}</h1>
          </div>
          <p className="text-white/60 mb-8">Last Updated: November 18, 2025</p>
          <Separator className="mb-8 bg-white/10" />
          {getContent()}
        </div>
      </div>
    </div>
  );
}

function TermsOfService() {
  return (
    <div className="prose prose-invert max-w-none">
      <div className="text-white/80 space-y-6">
        <section>
          <h2 className="text-white text-2xl mb-4">1. Agreement to Terms</h2>
          <p>
            By accessing and using Elite Fitness ("the Gym", "we", "us", "our"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">2. Membership Terms</h2>
          <p className="mb-3">
            <strong className="text-white">2.1 Membership Plans:</strong> We offer three membership tiers: Basic ($29/month), Pro ($59/month), and Elite ($99/month). Each plan includes different benefits and access levels.
          </p>
          <p className="mb-3">
            <strong className="text-white">2.2 Billing Cycle:</strong> Memberships are billed monthly on the date you initially signed up. You will receive a renewal reminder 2 days before your subscription renews.
          </p>
          <p className="mb-3">
            <strong className="text-white">2.3 Auto-Renewal:</strong> Your membership will automatically renew each month unless you cancel at least 24 hours before your renewal date.
          </p>
          <p>
            <strong className="text-white">2.4 Cancellation:</strong> You may cancel your membership at any time through your dashboard. Cancellations take effect at the end of your current billing cycle. No refunds for partial months.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">3. Facility Usage</h2>
          <p className="mb-3">
            <strong className="text-white">3.1 Hours of Operation:</strong> Facility hours vary by location. Elite members receive 24/7 access to select locations.
          </p>
          <p className="mb-3">
            <strong className="text-white">3.2 Guest Policy:</strong> Pro and Elite members may bring one guest per visit. Guests must sign a waiver and follow all facility rules.
          </p>
          <p className="mb-3">
            <strong className="text-white">3.3 Equipment Usage:</strong> Members must use equipment properly and follow posted instructions. Time limits may apply during peak hours.
          </p>
          <p>
            <strong className="text-white">3.4 Personal Belongings:</strong> The Gym is not responsible for lost, stolen, or damaged personal property. Use lockers and locks provided.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">4. Code of Conduct</h2>
          <p className="mb-3">Members agree to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Respect other members, staff, and property</li>
            <li>Wear appropriate athletic attire and closed-toe shoes</li>
            <li>Wipe down equipment after use</li>
            <li>Re-rack weights and return equipment to proper storage</li>
            <li>Refrain from loud or disruptive behavior</li>
            <li>Not engage in illegal activities or harassment</li>
            <li>Follow staff instructions at all times</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">5. Health & Safety</h2>
          <p className="mb-3">
            <strong className="text-white">5.1 Medical Clearance:</strong> You represent that you are physically fit to participate in physical activities. Consult your physician before beginning any exercise program.
          </p>
          <p className="mb-3">
            <strong className="text-white">5.2 Assumption of Risk:</strong> You acknowledge that physical exercise involves inherent risks including injury or death, and you assume all such risks.
          </p>
          <p className="mb-3">
            <strong className="text-white">5.3 Waiver of Liability:</strong> To the fullest extent permitted by law, you waive any claims against Elite Fitness for injuries sustained while using our facilities.
          </p>
          <p>
            <strong className="text-white">5.4 Emergency Procedures:</strong> In case of emergency, staff will provide first aid and contact emergency services as needed.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">6. Classes & Personal Training</h2>
          <p className="mb-3">
            <strong className="text-white">6.1 Class Registration:</strong> Classes may require advance registration. Cancellations must be made at least 3 hours before class start time.
          </p>
          <p className="mb-3">
            <strong className="text-white">6.2 Personal Training:</strong> Personal training sessions are sold separately and must be scheduled in advance. 24-hour cancellation notice required.
          </p>
          <p>
            <strong className="text-white">6.3 Late Arrivals:</strong> Late arrivals may not be admitted to classes for safety reasons.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">7. Payment Terms</h2>
          <p className="mb-3">
            <strong className="text-white">7.1 Payment Methods:</strong> We accept major credit cards and debit cards. Payment information must be kept current.
          </p>
          <p className="mb-3">
            <strong className="text-white">7.2 Failed Payments:</strong> If payment fails, your account will be suspended until payment is received. A $25 fee applies to failed payments.
          </p>
          <p className="mb-3">
            <strong className="text-white">7.3 Price Changes:</strong> We reserve the right to change membership prices with 30 days notice. Current members will be grandfathered for 90 days.
          </p>
          <p>
            <strong className="text-white">7.4 Refund Policy:</strong> No refunds except as required by law. Membership fees are non-refundable.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">8. Suspension & Termination</h2>
          <p className="mb-3">
            We reserve the right to suspend or terminate your membership for:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Violation of these Terms of Service</li>
            <li>Harassment or threatening behavior</li>
            <li>Damage to property</li>
            <li>Non-payment of fees</li>
            <li>Fraudulent activity</li>
          </ul>
          <p className="mt-3">
            Terminated memberships are not eligible for refunds.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">9. Intellectual Property</h2>
          <p>
            All content, logos, trademarks, and materials are property of Elite Fitness. You may not reproduce, distribute, or create derivative works without written permission.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">10. Limitation of Liability</h2>
          <p>
            Elite Fitness shall not be liable for any indirect, incidental, special, consequential or punitive damages resulting from your use of our facilities or services.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">11. Modifications to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Changes will be posted on our website and sent to your email. Continued use constitutes acceptance of modified terms.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">12. Contact Information</h2>
          <p className="mb-2">
            For questions about these Terms of Service, contact us at:
          </p>
          <p className="mb-1">Email: legal@elitefitness.com</p>
          <p className="mb-1">Phone: (555) 123-4567</p>
          <p>Address: 123 Fitness Street, NY 10001</p>
        </section>
      </div>
    </div>
  );
}

function PrivacyPolicy() {
  return (
    <div className="prose prose-invert max-w-none">
      <div className="text-white/80 space-y-6">
        <section>
          <h2 className="text-white text-2xl mb-4">1. Information We Collect</h2>
          <p className="mb-3">
            <strong className="text-white">1.1 Personal Information:</strong> When you register, we collect your name, email address, phone number, date of birth, and payment information.
          </p>
          <p className="mb-3">
            <strong className="text-white">1.2 Usage Data:</strong> We automatically collect information about your facility usage, class attendance, and interaction with our services.
          </p>
          <p className="mb-3">
            <strong className="text-white">1.3 Health Information:</strong> If you choose to share health data or fitness goals, this information is stored securely and used only to personalize your experience.
          </p>
          <p>
            <strong className="text-white">1.4 Technical Data:</strong> We collect IP addresses, browser types, device information, and cookies to improve our website and services.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">2. How We Use Your Information</h2>
          <p className="mb-3">We use your information to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Process membership registrations and payments</li>
            <li>Provide access to facilities and services</li>
            <li>Send renewal reminders and important updates</li>
            <li>Improve our services and customer experience</li>
            <li>Send marketing communications (with your consent)</li>
            <li>Comply with legal obligations</li>
            <li>Prevent fraud and ensure security</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">3. Information Sharing</h2>
          <p className="mb-3">
            <strong className="text-white">3.1 Third-Party Service Providers:</strong> We share data with payment processors, analytics providers, and other service providers who help operate our business.
          </p>
          <p className="mb-3">
            <strong className="text-white">3.2 Legal Requirements:</strong> We may disclose information when required by law or to protect our rights and safety.
          </p>
          <p>
            <strong className="text-white">3.3 No Selling:</strong> We do not sell your personal information to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">4. Data Security</h2>
          <p>
            We implement industry-standard security measures including encryption, secure servers, and access controls. However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your data.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">5. Your Rights</h2>
          <p className="mb-3">You have the right to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Access your personal information</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Opt-out of marketing communications</li>
            <li>Export your data</li>
            <li>Withdraw consent at any time</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">6. Data Retention</h2>
          <p>
            We retain your information for as long as your account is active or as needed to provide services. After account closure, we may retain certain data for legal, tax, or business purposes for up to 7 years.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">7. Children's Privacy</h2>
          <p>
            Our services are not intended for individuals under 18. We do not knowingly collect information from children. Minors must have parental consent and supervision.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">8. International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">9. Changes to Privacy Policy</h2>
          <p>
            We may update this policy from time to time. We will notify you of significant changes via email or website notice. Continued use after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">10. Contact Us</h2>
          <p className="mb-2">
            For privacy-related questions or to exercise your rights, contact:
          </p>
          <p className="mb-1">Privacy Officer: privacy@elitefitness.com</p>
          <p className="mb-1">Phone: (555) 123-4567</p>
          <p>Address: 123 Fitness Street, NY 10001</p>
        </section>
      </div>
    </div>
  );
}

function CookiePolicy() {
  return (
    <div className="prose prose-invert max-w-none">
      <div className="text-white/80 space-y-6">
        <section>
          <h2 className="text-white text-2xl mb-4">1. What Are Cookies</h2>
          <p>
            Cookies are small text files stored on your device when you visit our website. They help us provide a better user experience, remember your preferences, and analyze how you use our site.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">2. Types of Cookies We Use</h2>
          
          <div className="mb-4">
            <h3 className="text-white text-xl mb-2">2.1 Essential Cookies</h3>
            <p>
              Required for the website to function properly. These cookies enable core functionality such as security, authentication, and accessibility.
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Session management</li>
              <li>Security features</li>
              <li>Load balancing</li>
            </ul>
          </div>

          <div className="mb-4">
            <h3 className="text-white text-xl mb-2">2.2 Analytics Cookies</h3>
            <p>
              Help us understand how visitors use our website by collecting anonymous information about page visits, time spent, and user behavior.
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Google Analytics</li>
              <li>Page view tracking</li>
              <li>Scroll depth analysis</li>
            </ul>
          </div>

          <div className="mb-4">
            <h3 className="text-white text-xl mb-2">2.3 Functional Cookies</h3>
            <p>
              Allow us to remember your preferences and provide enhanced features.
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Language preferences</li>
              <li>Location settings</li>
              <li>User interface preferences</li>
            </ul>
          </div>

          <div>
            <h3 className="text-white text-xl mb-2">2.4 Marketing Cookies</h3>
            <p>
              Track your browsing habits to deliver personalized advertisements and measure campaign effectiveness.
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Advertising networks</li>
              <li>Social media pixels</li>
              <li>Retargeting campaigns</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">3. Third-Party Cookies</h2>
          <p className="mb-3">
            We use services from third-party providers that may set their own cookies:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong className="text-white">Google Analytics:</strong> Website analytics and reporting</li>
            <li><strong className="text-white">Firebase:</strong> Authentication and database services</li>
            <li><strong className="text-white">Payment Processors:</strong> Secure payment processing</li>
            <li><strong className="text-white">Social Media:</strong> Social sharing and login features</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">4. Managing Cookies</h2>
          <p className="mb-3">
            You can control and manage cookies in several ways:
          </p>
          
          <div className="mb-4">
            <h3 className="text-white text-xl mb-2">Browser Settings</h3>
            <p>
              Most browsers allow you to refuse cookies or delete existing ones. Check your browser's help section for instructions:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Chrome: Settings → Privacy and Security → Cookies</li>
              <li>Firefox: Options → Privacy & Security → Cookies</li>
              <li>Safari: Preferences → Privacy → Cookies</li>
              <li>Edge: Settings → Privacy → Cookies</li>
            </ul>
          </div>

          <div className="mb-4">
            <h3 className="text-white text-xl mb-2">Cookie Preference Center</h3>
            <p>
              Use our cookie preference center to customize which types of cookies you allow (excluding essential cookies).
            </p>
          </div>

          <div>
            <h3 className="text-white text-xl mb-2">Opt-Out Tools</h3>
            <p>
              Visit these sites to opt-out of targeted advertising:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Network Advertising Initiative: networkadvertising.org/choices</li>
              <li>Digital Advertising Alliance: optout.aboutads.info</li>
              <li>Google Analytics: tools.google.com/dlpage/gaoptout</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">5. Cookie Duration</h2>
          <p className="mb-3">
            <strong className="text-white">Session Cookies:</strong> Temporary cookies deleted when you close your browser.
          </p>
          <p>
            <strong className="text-white">Persistent Cookies:</strong> Remain on your device for a set period (typically 30 days to 2 years) or until you delete them.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">6. Impact of Disabling Cookies</h2>
          <p>
            Blocking or deleting cookies may affect your user experience:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>Some features may not work properly</li>
            <li>You may need to re-enter information</li>
            <li>Preferences won't be saved</li>
            <li>You may see less relevant content</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">7. Updates to Cookie Policy</h2>
          <p>
            We may update this Cookie Policy to reflect changes in technology or regulations. Check this page regularly for updates. Last updated: November 18, 2025.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">8. Contact Us</h2>
          <p className="mb-2">
            For questions about our use of cookies, contact:
          </p>
          <p className="mb-1">Email: privacy@elitefitness.com</p>
          <p className="mb-1">Phone: (555) 123-4567</p>
          <p>Address: 123 Fitness Street, NY 10001</p>
        </section>
      </div>
    </div>
  );
}

function Disclaimer() {
  return (
    <div className="prose prose-invert max-w-none">
      <div className="text-white/80 space-y-6">
        <section>
          <h2 className="text-white text-2xl mb-4">1. Disclaimer of Liability</h2>
          <p>
            Elite Fitness ("the Gym", "we", "us", "our") is not liable for any direct, indirect, incidental, special, exemplary, or consequential damages, including but not limited to, damages for loss of profits, loss of data, or other intangible losses, resulting from the use of our facilities, services, or any information provided on our website.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">2. No Warranty</h2>
          <p>
            We provide our facilities, services, and website "as is" and "as available" without any warranties of any kind, either express or implied, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that our facilities, services, or website will be uninterrupted, secure, or free from errors, viruses, or other harmful components.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">3. Limitation of Liability</h2>
          <p>
            In no event will Elite Fitness be liable for any damages arising from the use of our facilities, services, or website, including but not limited to, damages for loss of profits, loss of data, or other intangible losses, even if we have been advised of the possibility of such damages.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">4. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless Elite Fitness, its affiliates, officers, agents, and employees from and against any and all claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees, arising out of or in connection with your use of our facilities, services, or website, or your violation of these terms.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">5. Governing Law</h2>
          <p>
            These terms and any dispute arising out of or in connection with them shall be governed by and construed in accordance with the laws of the State of New York, without giving effect to any principle of conflicts of law.
          </p>
        </section>

        <section>
          <h2 className="text-white text-2xl mb-4">6. Contact Us</h2>
          <p className="mb-2">
            For questions about our disclaimer, contact:
          </p>
          <p className="mb-1">Email: legal@elitefitness.com</p>
          <p className="mb-1">Phone: (555) 123-4567</p>
          <p>Address: 123 Fitness Street, NY 10001</p>
        </section>
      </div>
    </div>
  );
}