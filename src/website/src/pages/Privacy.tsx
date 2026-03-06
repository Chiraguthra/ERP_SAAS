import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-50 via-white to-primary-50 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="container-custom section-padding relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Privacy Policy
            </h1>
            <p className="text-gray-600">
              Last updated: February 22, 2026
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto prose prose-lg prose-gray">
            <div className="bg-primary-50 rounded-xl p-6 mb-8 border border-primary-100">
              <p className="text-primary-800 text-sm m-0">
                At AppSire, we take your privacy seriously. This Privacy Policy explains how we collect, 
                use, disclose, and safeguard your information when you use our ERP platform and services.
              </p>
            </div>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              1. Information We Collect
            </h2>
            <p className="text-gray-600 mb-4">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li><strong>Account Information:</strong> Name, email address, phone number, company name, and job title when you register for an account.</li>
              <li><strong>Business Data:</strong> Financial records, customer information, inventory data, and other business information you input into our platform.</li>
              <li><strong>Payment Information:</strong> Billing address and payment method details (processed securely through our payment providers).</li>
              <li><strong>Communications:</strong> Information you provide when you contact our support team or participate in surveys.</li>
              <li><strong>Usage Data:</strong> Information about how you access and use our services, including log data, device information, and analytics.</li>
            </ul>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              2. How We Use Your Information
            </h2>
            <p className="text-gray-600 mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Provide, maintain, and improve our ERP platform and services</li>
              <li>Process transactions and send related information, including confirmations and invoices</li>
              <li>Send you technical notices, updates, security alerts, and support messages</li>
              <li>Respond to your comments, questions, and customer service requests</li>
              <li>Communicate with you about products, services, offers, and events</li>
              <li>Monitor and analyze trends, usage, and activities in connection with our services</li>
              <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
              <li>Personalize and improve your experience on our platform</li>
            </ul>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              3. Data Storage and Security
            </h2>
            <p className="text-gray-600 mb-4">
              We implement appropriate technical and organizational measures to protect your data:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li><strong>Encryption:</strong> All data is encrypted in transit (TLS 1.3) and at rest (AES-256)</li>
              <li><strong>Access Controls:</strong> Strict access controls and authentication mechanisms</li>
              <li><strong>Infrastructure:</strong> Our services are hosted on SOC 2 Type II certified cloud infrastructure</li>
              <li><strong>Monitoring:</strong> 24/7 security monitoring and incident response procedures</li>
              <li><strong>Backups:</strong> Regular automated backups with point-in-time recovery capabilities</li>
            </ul>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              4. Data Sharing and Disclosure
            </h2>
            <p className="text-gray-600 mb-4">
              We do not sell your personal information. We may share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li><strong>Service Providers:</strong> With third-party vendors who perform services on our behalf (payment processing, hosting, analytics)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to respond to legal process</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              <li><strong>With Your Consent:</strong> When you direct us to share your information with third parties</li>
            </ul>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              5. Your Rights and Choices
            </h2>
            <p className="text-gray-600 mb-4">
              You have certain rights regarding your personal information:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data (subject to legal retention requirements)</li>
              <li><strong>Export:</strong> Export your data in a portable format</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications at any time</li>
            </ul>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              6. Data Retention
            </h2>
            <p className="text-gray-600 mb-6">
              We retain your information for as long as your account is active or as needed to provide services. 
              After account termination, we retain certain information for legitimate business purposes and legal 
              compliance. You can request data deletion, and we will comply within 30 days unless retention is 
              required by law.
            </p>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              7. International Data Transfers
            </h2>
            <p className="text-gray-600 mb-6">
              Your information may be transferred to and processed in countries other than your country of residence. 
              We ensure appropriate safeguards are in place, including Standard Contractual Clauses approved by 
              relevant authorities, to protect your data during such transfers.
            </p>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              8. Cookies and Tracking Technologies
            </h2>
            <p className="text-gray-600 mb-4">
              We use cookies and similar tracking technologies to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Maintain your session and authentication status</li>
              <li>Remember your preferences and settings</li>
              <li>Analyze usage patterns and improve our services</li>
              <li>Provide personalized content and features</li>
            </ul>
            <p className="text-gray-600 mb-6">
              You can control cookie settings through your browser preferences.
            </p>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              9. Children's Privacy
            </h2>
            <p className="text-gray-600 mb-6">
              Our services are not directed to individuals under 18 years of age. We do not knowingly collect 
              personal information from children. If we become aware that a child has provided us with personal 
              information, we will take steps to delete such information.
            </p>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              10. Changes to This Policy
            </h2>
            <p className="text-gray-600 mb-6">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
              the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to 
              review this Privacy Policy periodically.
            </p>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              11. Contact Us
            </h2>
            <p className="text-gray-600 mb-4">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <p className="text-gray-700 m-0">
                <strong>AppSire Privacy Team</strong><br />
                Email: privacy@appsire.io<br />
                Address: 123 Business Ave, Suite 500, San Francisco, CA 94105<br />
                Phone: +1 (555) 123-4567
              </p>
            </div>

            <div className="border-t border-gray-200 pt-8 mt-12">
              <p className="text-sm text-gray-500">
                See also: <Link to="/terms" className="text-primary-600 hover:text-primary-700">Terms of Service</Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
