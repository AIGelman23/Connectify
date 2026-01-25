"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/NavBar";

export default function TermsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: `By accessing or using Connectify ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service.

These Terms apply to all visitors, users, and others who access or use the Service. By using the Service, you represent that you are at least 18 years old or have reached the age of majority in your jurisdiction.`
    },
    {
      title: "2. Description of Service",
      content: `Connectify is a professional networking platform that enables users to:
• Create and maintain a professional profile
• Connect with other professionals
• Share content, posts, and updates
• Participate in groups and discussions
• Send and receive messages
• Discover job opportunities and events

We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time without prior notice.`
    },
    {
      title: "3. User Accounts",
      content: `To use certain features of the Service, you must register for an account. When you register, you agree to:
• Provide accurate, current, and complete information
• Maintain and promptly update your account information
• Maintain the security of your password and account
• Accept responsibility for all activities under your account
• Notify us immediately of any unauthorized use

You may not use another person's account without permission. We reserve the right to suspend or terminate accounts that violate these Terms.`
    },
    {
      title: "4. User Content",
      content: `You retain ownership of content you post on Connectify ("User Content"). By posting User Content, you grant us a non-exclusive, worldwide, royalty-free license to use, copy, modify, distribute, and display your content in connection with the Service.

You are solely responsible for your User Content and represent that:
• You own or have the right to post the content
• The content does not violate any third-party rights
• The content complies with applicable laws and these Terms

We may remove or disable access to any User Content that violates these Terms or is otherwise objectionable.`
    },
    {
      title: "5. Prohibited Conduct",
      content: `You agree not to:
• Post false, misleading, or fraudulent content
• Harass, bully, or intimidate other users
• Post content that is hateful, discriminatory, or violent
• Impersonate any person or entity
• Spam or send unsolicited messages
• Collect user information without consent
• Use automated systems to access the Service
• Interfere with or disrupt the Service
• Violate any applicable laws or regulations
• Attempt to gain unauthorized access to accounts or systems

Violation of these prohibitions may result in immediate account termination.`
    },
    {
      title: "6. Intellectual Property",
      content: `The Service and its original content (excluding User Content), features, and functionality are owned by Connectify and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.

Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent. You may not copy, modify, distribute, sell, or lease any part of our Service or software.`
    },
    {
      title: "7. Privacy",
      content: `Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your personal information. By using the Service, you agree to our Privacy Policy.

We implement industry-standard security measures to protect your data. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.`
    },
    {
      title: "8. Third-Party Links and Services",
      content: `The Service may contain links to third-party websites or services that are not owned or controlled by Connectify. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party websites or services.

You acknowledge and agree that Connectify shall not be responsible or liable for any damage or loss caused by your use of any third-party websites or services.`
    },
    {
      title: "9. Disclaimers",
      content: `THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.

We do not warrant that the Service will be uninterrupted, secure, or error-free. We do not guarantee the accuracy or completeness of any information on the Service.`
    },
    {
      title: "10. Limitation of Liability",
      content: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, CONNECTIFY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE.

Our total liability for any claims arising from your use of the Service shall not exceed the amount you paid us in the past twelve months, if any.`
    },
    {
      title: "11. Indemnification",
      content: `You agree to indemnify, defend, and hold harmless Connectify and its officers, directors, employees, agents, and affiliates from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:
• Your use of the Service
• Your violation of these Terms
• Your violation of any third-party rights
• Your User Content`
    },
    {
      title: "12. Termination",
      content: `We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms.

Upon termination, your right to use the Service will immediately cease. All provisions of these Terms which by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, and limitations of liability.`
    },
    {
      title: "13. Changes to Terms",
      content: `We reserve the right to modify these Terms at any time. We will provide notice of material changes by posting the updated Terms on the Service and updating the "Last Updated" date.

Your continued use of the Service after any changes constitutes your acceptance of the new Terms. If you do not agree to the modified Terms, you should stop using the Service.`
    },
    {
      title: "14. Governing Law",
      content: `These Terms shall be governed by and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law provisions.

Any disputes arising from these Terms or the Service shall be resolved exclusively in the state or federal courts located in San Francisco County, California.`
    },
    {
      title: "15. Contact Us",
      content: `If you have any questions about these Terms, please contact us at:

Connectify Inc.
Email: legal@connectify.com
Address: 123 Innovation Way, San Francisco, CA 94105

For general support inquiries, please visit our Help Center or email support@connectify.com.`
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar session={session} router={router} />

      {/* Hero */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-file-contract text-3xl"></i>
          </div>
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-slate-300">Last Updated: January 24, 2026</p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto py-12 px-4">
        {/* Introduction */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-slate-700 mb-8">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Welcome to Connectify! These Terms of Service govern your use of our platform and services.
            Please read these terms carefully before using our service. By accessing or using Connectify,
            you agree to be bound by these Terms and our Privacy Policy.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 mb-8 border border-blue-200 dark:border-blue-800">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4">Table of Contents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {sections.map((section, index) => (
              <a
                key={index}
                href={`#section-${index}`}
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                {section.title}
              </a>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section, index) => (
            <div
              key={index}
              id={`section-${index}`}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700"
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{section.title}</h2>
              <div className="text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                {section.content}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Links */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            By using Connectify, you acknowledge that you have read and understood these Terms.
          </p>
          <div className="flex justify-center gap-6">
            <a href="/privacy" className="text-blue-500 hover:underline">Privacy Policy</a>
            <a href="/help" className="text-blue-500 hover:underline">Help Center</a>
            <a href="mailto:legal@connectify.com" className="text-blue-500 hover:underline">Contact Legal</a>
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
