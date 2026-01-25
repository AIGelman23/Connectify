"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/NavBar";

const faqs = [
  {
    category: "Getting Started",
    icon: "fas fa-rocket",
    color: "from-blue-500 to-cyan-500",
    questions: [
      {
        q: "How do I create an account?",
        a: "Click the 'Sign Up' button on the homepage, enter your email, create a password, and fill out your profile information. You'll receive a verification email to confirm your account."
      },
      {
        q: "How do I complete my profile?",
        a: "Go to your profile page and click 'Edit Profile'. Add your profile picture, headline, bio, work experience, education, and skills to make your profile stand out."
      },
      {
        q: "How do I find people to connect with?",
        a: "Use the search bar to find people by name, company, or job title. You can also visit the Network page to see suggested connections and people you may know."
      }
    ]
  },
  {
    category: "Connections & Networking",
    icon: "fas fa-users",
    color: "from-green-500 to-emerald-500",
    questions: [
      {
        q: "How do I send a connection request?",
        a: "Visit someone's profile and click the 'Connect' button. You can add a personal note to introduce yourself. The person will receive a notification and can accept or decline your request."
      },
      {
        q: "What's the difference between following and connecting?",
        a: "Connections are mutual relationships where both parties agree to connect. Following is one-way - you can follow anyone to see their public posts without them following you back."
      },
      {
        q: "How do I remove a connection?",
        a: "Go to your Network page, find the connection you want to remove, click the three dots menu, and select 'Remove Connection'."
      }
    ]
  },
  {
    category: "Posts & Content",
    icon: "fas fa-pen-fancy",
    color: "from-purple-500 to-pink-500",
    questions: [
      {
        q: "How do I create a post?",
        a: "From your feed or profile, click on the 'Start a post' area. You can add text, images, videos, polls, or GIFs. Choose your visibility settings and click 'Post'."
      },
      {
        q: "What are the post visibility options?",
        a: "Public posts are visible to everyone. Friends Only posts are visible to your connections. Private posts are only visible to you. You can also share with specific friends."
      },
      {
        q: "How do I edit or delete a post?",
        a: "Click the three dots menu on your post and select 'Edit' or 'Delete'. Note that deleted posts cannot be recovered."
      }
    ]
  },
  {
    category: "Messages",
    icon: "fas fa-envelope",
    color: "from-yellow-500 to-orange-500",
    questions: [
      {
        q: "How do I send a message?",
        a: "Click the Messages icon in the navigation bar, then click 'New Message'. Search for the person you want to message and start typing."
      },
      {
        q: "Can I send messages to people I'm not connected with?",
        a: "This depends on their privacy settings. Some users allow messages from anyone, while others only accept messages from connections."
      },
      {
        q: "How do I delete a conversation?",
        a: "Open the conversation, click the settings icon, and select 'Delete Conversation'. This will remove the conversation from your inbox."
      }
    ]
  },
  {
    category: "Privacy & Security",
    icon: "fas fa-shield-alt",
    color: "from-red-500 to-rose-500",
    questions: [
      {
        q: "How do I change my privacy settings?",
        a: "Go to Settings > Privacy. Here you can control who can see your profile, send you messages, and view your activity status."
      },
      {
        q: "How do I block someone?",
        a: "Visit the person's profile, click the three dots menu, and select 'Block'. Blocked users cannot view your profile or contact you."
      },
      {
        q: "How do I enable two-factor authentication?",
        a: "Go to Settings > Account > Two-Factor Authentication. Follow the prompts to set up 2FA using your phone or authenticator app."
      }
    ]
  },
  {
    category: "Groups & Events",
    icon: "fas fa-calendar-alt",
    color: "from-indigo-500 to-purple-500",
    questions: [
      {
        q: "How do I create a group?",
        a: "Go to the Groups page and click 'Create Group'. Add a name, description, cover image, and choose whether the group is public or private."
      },
      {
        q: "How do I join a group?",
        a: "Search for groups or browse recommendations. Click 'Join' on any group. For private groups, your request will need to be approved by an admin."
      },
      {
        q: "How do I create an event?",
        a: "Go to Events and click 'Create Event'. Add event details like title, date, time, location (virtual or physical), and description."
      }
    ]
  }
];

function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 dark:border-slate-700 last:border-0">
      <button
        className="w-full py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 px-4 rounded-lg transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-medium text-gray-900 dark:text-white pr-4">{question}</span>
        <i className={`fas fa-chevron-down text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-gray-600 dark:text-gray-300">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);

  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar session={session} router={router} />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">How can we help you?</h1>
          <p className="text-blue-100 mb-8">Search our help center or browse categories below</p>

          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 rounded-full text-gray-900 dark:text-white bg-white dark:bg-slate-800 placeholder-gray-500 dark:placeholder-gray-400 shadow-lg focus:outline-none focus:ring-4 focus:ring-white/30"
            />
            <i className="fas fa-search absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400"></i>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto py-12 px-4">
        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {faqs.map((category, index) => (
            <button
              key={index}
              onClick={() => setActiveCategory(activeCategory === index ? null : index)}
              className={`p-4 rounded-xl border transition-all ${activeCategory === index
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-blue-300'
                }`}
            >
              <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                <i className={`${category.icon} text-white text-lg`}></i>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{category.category}</span>
            </button>
          ))}
        </div>

        {/* FAQ Sections */}
        <div className="space-y-8">
          {(searchQuery ? filteredFaqs : (activeCategory !== null ? [faqs[activeCategory]] : faqs)).map((category, index) => (
            <div key={index} className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className={`p-6 bg-gradient-to-r ${category.color}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <i className={`${category.icon} text-white`}></i>
                  </div>
                  <h2 className="text-xl font-bold text-white">{category.category}</h2>
                </div>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-slate-700">
                {category.questions.map((item, qIndex) => (
                  <FAQItem key={qIndex} question={item.q} answer={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <div className="mt-12 bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Still need help?</h2>
          <p className="text-gray-300 mb-6">Our support team is here to assist you</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:support@connectify.com"
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2"
            >
              <i className="fas fa-envelope"></i>
              Email Support
            </a>
            <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2">
              <i className="fas fa-comments"></i>
              Live Chat
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 dark:text-gray-400">
          <p>© 2026 Connectify Inc. All rights reserved.</p>
          <div className="flex justify-center gap-6 mt-4">
            <a href="/terms" className="hover:text-blue-500">Terms of Service</a>
            <a href="/privacy" className="hover:text-blue-500">Privacy Policy</a>
            <a href="/help" className="hover:text-blue-500">Help Center</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
