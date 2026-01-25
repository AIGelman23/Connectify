"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/NavBar";

export default function PrivacyPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const sections = [
    {
      title: "1. Information We Collect",
      icon: "fas fa-database",
      content: `We collect information you provide directly to us, including:

**Account Information**
• Name, email address, and password
• Profile information (photo, headline, bio, work history, education)
• Contact information and preferences

**Content You Create**
• Posts, comments, and messages
• Photos, videos, and other media
• Group and event participation

**Usage Information**
• Log data (IP address, browser type, pages visited)
• Device information (hardware model, operating system)
• Location data (with your consent)
• Cookies and similar technologies

**Information from Others**
• Contacts you import or sync
• Information from linked services
• Referrals from other users`
    },
    {
      title: "2. How We Use Your Information",
      icon: "fas fa-cogs",
      content: `We use the information we collect to:

**Provide and Improve Our Services**
• Create and maintain your account
• Enable connections and communications
• Personalize your experience and content feed
• Develop new features and services

**Safety and Security**
• Verify accounts and prevent fraud
• Detect and prevent abuse or violations
• Enforce our Terms of Service
• Protect the rights and safety of users

**Communications**
• Send service-related notifications
• Respond to your inquiries and support requests
• Send marketing communications (with your consent)

**Analytics and Research**
• Understand how users interact with our platform
• Measure the effectiveness of features
• Conduct research to improve our services`
    },
    {
      title: "3. Information Sharing",
      icon: "fas fa-share-alt",
      content: `We may share your information in the following circumstances:

**With Your Consent**
• When you explicitly agree to share information
• When you use features that involve sharing

**With Other Users**
• Profile information visible based on your privacy settings
• Posts and content you share publicly or with connections
• Messages you send to other users

**With Service Providers**
• Third parties who perform services on our behalf
• Cloud hosting and data storage providers
• Analytics and advertising partners

**For Legal Reasons**
• To comply with legal obligations
• To respond to lawful requests from authorities
• To protect our rights and prevent fraud

**Business Transfers**
• In connection with mergers, acquisitions, or sales
• Your information may be transferred as a business asset`
    },
    {
      title: "4. Your Privacy Controls",
      icon: "fas fa-sliders-h",
      content: `You have control over your information:

**Profile Visibility**
• Choose who can see your profile (Everyone, Connections, Private)
• Control visibility of specific profile sections
• Manage your activity broadcasts

**Post Privacy**
• Set default visibility for new posts
• Choose audience for individual posts
• Control who can comment on your posts

**Communication Preferences**
• Manage email notification settings
• Control push notifications
• Set message permissions

**Data Access**
• Download a copy of your data
• View and edit your information
• Delete specific content or your entire account

**Activity Status**
• Control whether others can see when you're online
• Manage your online visibility`
    },
    {
      title: "5. Data Security",
      icon: "fas fa-shield-alt",
      content: `We take security seriously and implement measures to protect your data:

**Technical Safeguards**
• Encryption of data in transit and at rest
• Secure socket layer (SSL) technology
• Regular security audits and testing
• Access controls and authentication

**Organizational Measures**
• Employee training on data protection
• Limited access to personal information
• Incident response procedures
• Regular policy reviews

**Your Responsibilities**
• Keep your password secure and confidential
• Enable two-factor authentication
• Report suspicious activity immediately
• Log out from shared devices

While we strive to protect your information, no method of transmission over the Internet is 100% secure.`
    },
    {
      title: "6. Cookies and Tracking",
      icon: "fas fa-cookie-bite",
      content: `We use cookies and similar technologies for:

**Essential Cookies**
• Authentication and security
• Remembering your preferences
• Maintaining your session

**Analytics Cookies**
• Understanding how you use our platform
• Measuring feature performance
• Improving user experience

**Advertising Cookies**
• Delivering relevant advertisements
• Measuring ad effectiveness
• Frequency capping

**Managing Cookies**
You can control cookies through your browser settings. Note that disabling certain cookies may affect functionality.

We also use:
• Pixels and beacons
• Local storage
• Device identifiers`
    },
    {
      title: "7. Data Retention",
      icon: "fas fa-clock",
      content: `We retain your information for as long as necessary to:

**Active Accounts**
• Provide our services
• Comply with legal obligations
• Resolve disputes
• Enforce our agreements

**Deleted Accounts**
• Account data is deleted within 30 days
• Some information may be retained for legal purposes
• Backup copies may persist for a limited time
• Aggregated, anonymized data may be retained indefinitely

**Content Retention**
• Posts remain until you delete them
• Messages are retained for both parties
• Shared content may persist in others' accounts`
    },
    {
      title: "8. International Data Transfers",
      icon: "fas fa-globe",
      content: `Your information may be transferred to and processed in countries other than your own:

**Transfer Mechanisms**
• Standard Contractual Clauses
• Adequacy decisions
• Your consent where required

**Data Location**
• Our servers are primarily located in the United States
• We use cloud services with global infrastructure
• Data may be processed in multiple jurisdictions

We ensure appropriate safeguards are in place for international transfers in compliance with applicable data protection laws.`
    },
    {
      title: "9. Children's Privacy",
      icon: "fas fa-child",
      content: `Connectify is not intended for children under 16:

• We do not knowingly collect information from children under 16
• If we learn we have collected such information, we will delete it
• Parents or guardians who believe their child has provided us information should contact us immediately

If you are under 16, please do not use our services or provide any personal information.`
    },
    {
      title: "10. Your Rights",
      icon: "fas fa-user-shield",
      content: `Depending on your location, you may have the following rights:

**Access and Portability**
• Request a copy of your personal data
• Receive data in a portable format

**Correction and Deletion**
• Correct inaccurate information
• Request deletion of your data

**Restriction and Objection**
• Restrict certain processing
• Object to processing based on legitimate interests

**Withdraw Consent**
• Withdraw consent at any time
• This won't affect prior processing

**Lodge Complaints**
• Contact your local data protection authority

To exercise these rights, go to Settings or contact privacy@connectify.com.`
    },
    {
      title: "11. Changes to This Policy",
      icon: "fas fa-edit",
      content: `We may update this Privacy Policy from time to time:

• We will notify you of material changes
• The "Last Updated" date will be revised
• Continued use constitutes acceptance of changes

We encourage you to review this policy periodically. If you disagree with any changes, you should stop using our services.`
    },
    {
      title: "12. Contact Us",
      icon: "fas fa-envelope",
      content: `If you have questions about this Privacy Policy or our practices:

**Privacy Team**
Email: privacy@connectify.com

**Data Protection Officer**
Email: dpo@connectify.com

**Mailing Address**
Connectify Inc.
Privacy Department
123 Innovation Way
San Francisco, CA 94105
United States

We aim to respond to all inquiries within 30 days.`
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar session={session} router={router} />

      {/* Hero */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-user-shield text-3xl"></i>
          </div>
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-green-100">Last Updated: January 24, 2026</p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto py-12 px-4">
        {/* Introduction */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-slate-700 mb-8">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            At Connectify, we are committed to protecting your privacy and ensuring the security of your personal information.
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
            Please read this policy carefully to understand our practices regarding your personal data.
          </p>
        </div>

        {/* Quick Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 mb-8 border border-blue-200 dark:border-blue-800">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <i className="fas fa-bolt text-blue-500"></i>
            Privacy at a Glance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <i className="fas fa-check-circle text-green-500 mt-1"></i>
              <span className="text-gray-600 dark:text-gray-300">You control your profile visibility and post privacy</span>
            </div>
            <div className="flex items-start gap-3">
              <i className="fas fa-check-circle text-green-500 mt-1"></i>
              <span className="text-gray-600 dark:text-gray-300">We use encryption to protect your data</span>
            </div>
            <div className="flex items-start gap-3">
              <i className="fas fa-check-circle text-green-500 mt-1"></i>
              <span className="text-gray-600 dark:text-gray-300">You can download or delete your data anytime</span>
            </div>
            <div className="flex items-start gap-3">
              <i className="fas fa-check-circle text-green-500 mt-1"></i>
              <span className="text-gray-600 dark:text-gray-300">We never sell your personal information</span>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section, index) => (
            <div
              key={index}
              id={`section-${index}`}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center gap-4">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <i className={`${section.icon} text-green-600 dark:text-green-400`}></i>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{section.title}</h2>
              </div>
              <div className="p-6 text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed prose dark:prose-invert max-w-none">
                {section.content.split('**').map((part, i) =>
                  i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Links */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Your privacy matters to us. If you have any questions, please don't hesitate to reach out.
          </p>
          <div className="flex justify-center gap-6">
            <a href="/terms" className="text-blue-500 hover:underline">Terms of Service</a>
            <a href="/help" className="text-blue-500 hover:underline">Help Center</a>
            <a href="mailto:privacy@connectify.com" className="text-blue-500 hover:underline">Contact Privacy Team</a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 dark:text-gray-400">
          <p>© 2026 Connectify Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
