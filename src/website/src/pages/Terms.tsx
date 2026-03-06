import { Link } from 'react-router-dom'

export default function Terms() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-50 via-white to-primary-50 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="container-custom section-padding relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Terms of Service
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
                Please read these Terms of Service carefully before using AppSire ERP. By accessing or using 
                our services, you agree to be bound by these terms. If you disagree with any part of these 
                terms, you may not access our services.
              </p>
            </div>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-600 mb-6">
              By creating an account or using AppSire ERP ("Service"), you agree to these Terms of Service 
              ("Terms"), our Privacy Policy, and any additional terms applicable to specific features. 
              These Terms constitute a legally binding agreement between you (or the entity you represent) 
              and AppSire Inc. ("AppSire," "we," "us," or "our").
            </p>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              2. Description of Service
            </h2>
            <p className="text-gray-600 mb-4">
              AppSire ERP is a cloud-based enterprise resource planning platform that provides:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Financial management and accounting tools</li>
              <li>Sales and customer relationship management</li>
              <li>Inventory and warehouse management</li>
              <li>Procurement and vendor management</li>
              <li>Reporting and analytics capabilities</li>
              <li>Multi-organization and multi-branch support</li>
            </ul>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              3. Account Registration
            </h2>
            <p className="text-gray-600 mb-4">
              To use our Service, you must:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Be at least 18 years old or have legal authority to enter into this agreement</li>
              <li>Provide accurate, complete, and current registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly notify us of any unauthorized access to your account</li>
              <li>Accept responsibility for all activities that occur under your account</li>
            </ul>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              4. Subscription and Payment
            </h2>
            <h3 className="font-semibold text-gray-900 mt-6 mb-3">4.1 Subscription Plans</h3>
            <p className="text-gray-600 mb-4">
              We offer various subscription plans with different features and pricing. Details of each plan 
              are available on our pricing page. We reserve the right to modify plans and pricing with 
              reasonable notice.
            </p>

            <h3 className="font-semibold text-gray-900 mt-6 mb-3">4.2 Billing</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Subscription fees are billed in advance on a monthly or annual basis</li>
              <li>All fees are non-refundable except as required by law or as stated in these Terms</li>
              <li>You authorize us to charge your payment method for all applicable fees</li>
              <li>Failure to pay may result in suspension or termination of your account</li>
            </ul>

            <h3 className="font-semibold text-gray-900 mt-6 mb-3">4.3 Free Trial</h3>
            <p className="text-gray-600 mb-6">
              We may offer a free trial period. At the end of the trial, your account will be automatically 
              converted to a paid subscription unless you cancel before the trial ends.
            </p>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              5. Your Data
            </h2>
            <h3 className="font-semibold text-gray-900 mt-6 mb-3">5.1 Ownership</h3>
            <p className="text-gray-600 mb-4">
              You retain all rights to the data you input into our Service ("Your Data"). We do not claim 
              ownership of Your Data.
            </p>

            <h3 className="font-semibold text-gray-900 mt-6 mb-3">5.2 License to Us</h3>
            <p className="text-gray-600 mb-4">
              You grant us a limited license to process Your Data solely for the purpose of providing and 
              improving our Service.
            </p>

            <h3 className="font-semibold text-gray-900 mt-6 mb-3">5.3 Data Security</h3>
            <p className="text-gray-600 mb-6">
              We implement industry-standard security measures to protect Your Data. However, no method of 
              transmission or storage is 100% secure. You are responsible for maintaining the confidentiality 
              of your account credentials.
            </p>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              6. Acceptable Use
            </h2>
            <p className="text-gray-600 mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Use the Service for any illegal purpose or in violation of any applicable laws</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
              <li>Use automated means to access the Service without our permission</li>
              <li>Share account credentials with unauthorized users</li>
              <li>Upload malicious code or content</li>
              <li>Violate the intellectual property rights of others</li>
            </ul>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              7. Intellectual Property
            </h2>
            <p className="text-gray-600 mb-6">
              The Service, including all content, features, and functionality, is owned by AppSire and 
              protected by intellectual property laws. You may not copy, modify, distribute, sell, or 
              lease any part of our Service without our written permission.
            </p>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              8. Service Level Agreement
            </h2>
            <p className="text-gray-600 mb-4">
              For paid subscriptions, we commit to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>99.9% uptime availability (excluding scheduled maintenance)</li>
              <li>Regular backups of Your Data</li>
              <li>Reasonable support response times based on your plan</li>
            </ul>
            <p className="text-gray-600 mb-6">
              Service credits may be available for downtime exceeding our SLA commitments. Contact support 
              for details.
            </p>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              9. Limitation of Liability
            </h2>
            <p className="text-gray-600 mb-6">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, APPSIRE SHALL NOT BE LIABLE FOR ANY INDIRECT, 
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, 
              WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER 
              INTANGIBLE LOSSES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNTS PAID BY YOU TO APPSIRE 
              DURING THE TWELVE (12) MONTHS PRIOR TO THE CLAIM.
            </p>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              10. Disclaimer of Warranties
            </h2>
            <p className="text-gray-600 mb-6">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER 
              EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, 
              FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE 
              WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
            </p>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              11. Termination
            </h2>
            <h3 className="font-semibold text-gray-900 mt-6 mb-3">11.1 By You</h3>
            <p className="text-gray-600 mb-4">
              You may cancel your subscription at any time through your account settings. Cancellation 
              takes effect at the end of your current billing period.
            </p>

            <h3 className="font-semibold text-gray-900 mt-6 mb-3">11.2 By Us</h3>
            <p className="text-gray-600 mb-4">
              We may suspend or terminate your account if you:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Violate these Terms</li>
              <li>Fail to pay applicable fees</li>
              <li>Engage in fraudulent or illegal activity</li>
            </ul>

            <h3 className="font-semibold text-gray-900 mt-6 mb-3">11.3 Effect of Termination</h3>
            <p className="text-gray-600 mb-6">
              Upon termination, your access to the Service will cease. You may export Your Data for 30 days 
              after termination. After this period, Your Data may be deleted.
            </p>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              12. Dispute Resolution
            </h2>
            <p className="text-gray-600 mb-6">
              Any disputes arising from these Terms or the Service shall be resolved through binding 
              arbitration in accordance with the rules of the American Arbitration Association. The 
              arbitration shall take place in San Francisco, California. You agree to waive any right 
              to participate in a class action lawsuit.
            </p>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              13. Changes to Terms
            </h2>
            <p className="text-gray-600 mb-6">
              We may modify these Terms at any time. We will provide notice of material changes via email 
              or through the Service. Your continued use of the Service after changes constitutes acceptance 
              of the modified Terms.
            </p>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              14. General Provisions
            </h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li><strong>Governing Law:</strong> These Terms are governed by the laws of the State of California</li>
              <li><strong>Entire Agreement:</strong> These Terms constitute the entire agreement between you and AppSire</li>
              <li><strong>Severability:</strong> If any provision is found unenforceable, the remaining provisions remain in effect</li>
              <li><strong>Waiver:</strong> Failure to enforce any right does not constitute a waiver of that right</li>
              <li><strong>Assignment:</strong> You may not assign these Terms without our consent</li>
            </ul>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-8 mb-4">
              15. Contact Information
            </h2>
            <p className="text-gray-600 mb-4">
              For questions about these Terms, please contact us:
            </p>
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <p className="text-gray-700 m-0">
                <strong>AppSire Legal Team</strong><br />
                Email: legal@appsire.io<br />
                Address: 123 Business Ave, Suite 500, San Francisco, CA 94105<br />
                Phone: +1 (555) 123-4567
              </p>
            </div>

            <div className="border-t border-gray-200 pt-8 mt-12">
              <p className="text-sm text-gray-500">
                See also: <Link to="/privacy" className="text-primary-600 hover:text-primary-700">Privacy Policy</Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
