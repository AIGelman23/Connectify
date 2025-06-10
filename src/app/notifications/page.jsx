// src/app/notifications/page.jsx
"use client";

import { useEffect, useState, useCallback } from "react"; // Added useCallback
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

// Navbar component (copied for consistency and self-containment)
function Navbar({ session, router }) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/login' }); // Redirect to login after sign out
  };

  return (
    // Font Awesome icons are expected to be installed and imported globally (e.g., in layout.jsx or globals.css)
    <nav className="bg-white shadow-md py-3 px-4 sm:px-6 lg:px-8 sticky top-0 z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
        {/* Logo/Home Link */}
        <div className="flex-shrink-0">
          <button onClick={() => router.push("/dashboard")} className="flex items-center text-indigo-600 hover:text-indigo-800 transition duration-150 ease-in-out">
            <svg className="w-8 h-8 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 16v4a2 2 0 01-2 2h-4a2 2 0 01-2-2v-4m4-2l-4-4m0 0l-4 4m4-4V4m0 0V3a1 1 0 011-1h2a1 1 0 011 1v1m-6 10h6"></path>
            </svg>
            <span className="text-xl font-bold">Connectify</span>
          </button>
        </div>

        {/* Search Bar (visible on larger screens) */}
        <div className="hidden md:block flex-grow max-w-sm mx-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="fas fa-search text-gray-400"></i>
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center space-x-6">
          <NavLink iconClass="fas fa-home" text="Home" href="/dashboard" router={router} />
          <NavLink iconClass="fas fa-users" text="My Network" href="/network" router={router} />
          <NavLink iconClass="fas fa-briefcase" text="Jobs" href="/jobs" router={router} />
          <NavLink iconClass="fas fa-comment-dots" text="Messaging" href="/messages" router={router} />
          <NavLink iconClass="fas fa-bell" text="Notifications" href="/notifications" router={router} />

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <img
                src={session?.user?.image || `https://placehold.co/32x32/A78BFA/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'}`}
                alt="User Avatar"
                className="w-8 h-8 rounded-full object-cover mr-4 border-2 border-indigo-300"
                onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/32x32/A78BFA/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'}` }}
              />
              <span className="hidden lg:block text-gray-700 font-semibold">{session?.user?.name?.split(' ')[0] || 'User'}</span>
              <svg className="w-4 h-4 text-gray-500 hidden lg:block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-1 border border-gray-200 z-10 animate-fade-in-down">
                <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                  <p className="font-bold">{session?.user?.name || 'Unnamed User'}</p>
                  <p className="text-gray-500 truncate">{session?.user?.email}</p>
                </div>
                <button
                  onClick={() => { router.push("/edit-profile"); setIsProfileMenuOpen(false); }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition duration-150 ease-in-out"
                >
                  View Profile
                </button>
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 hover:text-red-800 transition duration-150 ease-in-out border-t border-gray-100 mt-1 pt-2"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

// Helper component for navigation links (copied for consistency)
function NavLink({ iconClass, text, href, router }) {
  const isActive = router.pathname === href; // Simple active state check

  return (
    <button
      onClick={() => router.push(href)}
      className={`hidden sm:flex flex-col items-center p-2 rounded-lg ${isActive ? 'text-indigo-600 font-bold bg-indigo-50' : 'text-gray-600 hover:bg-gray-100'} transition duration-150 ease-in-out text-sm`}
    >
      <i className={`${iconClass} text-lg mb-1`}></i>
      <span>{text}</span>
    </button>
  );
}


export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper to format timestamps (e.g., "2 hours ago", "Yesterday")
  const formatTimestamp = useCallback((dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.round((now - date) / 1000);
    const diffMinutes = Math.round(diffSeconds / 60);
    const diffHours = Math.round(diffMinutes / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(); // Fallback for older posts
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors

      // In a real application, you would fetch from your backend:
      const res = await fetch('/api/notifications'); // Assuming this API route exists
      if (!res.ok) {
        throw new Error(`Failed to fetch notifications: ${res.statusText}`);
      }
      const data = await res.json();

      // Format timestamps for fetched notifications
      const formattedNotifications = data.notifications.map(notif => ({
        ...notif,
        timestamp: formatTimestamp(notif.createdAt || new Date().toISOString()), // Use createdAt if available, otherwise current time
      }));
      setNotifications(formattedNotifications);

    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("Failed to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [formatTimestamp]); // Dependency array for useCallback

  useEffect(() => {
    if (status === "loading") {
      return; // Still loading session, do nothing
    }

    if (status === "unauthenticated") {
      router.push("/auth/login"); // Redirect if not logged in
      return;
    }

    if (status === "authenticated") {
      fetchNotifications(); // Fetch notifications when authenticated
    }
  }, [status, router, fetchNotifications]); // Depend on session status, router, and fetchNotifications

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    // In a real app, you'd send an API call to mark as read on the backend
    // fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="flex items-center space-x-2 text-indigo-600">
          <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading notifications...
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    // This case is already handled by the redirect in useEffect
    return null;
  }

  return (
    <>
      <Navbar session={session} router={router} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8 pt-4"> {/* Added pt-4 to adjust for fixed navbar */}
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8 text-center">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Notifications
            </span>
          </h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6 text-sm flex items-center shadow-sm">
              <svg className="h-5 w-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586l-1.293-1.293z" clipRule="evenodd" />
              </svg>
              <span className="block">{error}</span>
            </div>
          )}

          {notifications.length === 0 && !loading && !error && (
            <div className="text-center py-10 bg-white shadow-xl rounded-2xl border border-gray-200">
              <p className="text-gray-600 text-lg">You have no new notifications.</p>
            </div>
          )}

          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white shadow-lg rounded-2xl p-4 flex items-start space-x-4 border border-gray-200 cursor-pointer transition duration-150 ease-in-out ${notification.read ? 'opacity-75' : 'hover:bg-indigo-50 border-indigo-200'
                  }`}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                {/* Notification Icon/Avatar */}
                <div className="flex-shrink-0">
                  {/* Display user image if type is 'connection_accepted' or 'post_like' or 'message' */}
                  {(notification.type === 'CONNECTION_ACCEPTED' || notification.type === 'POST_LIKE' || notification.type === 'MESSAGE') && notification.user?.imageUrl ? (
                    <img
                      src={notification.user.imageUrl}
                      alt={notification.user.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : notification.type === 'JOB_APPLICATION_VIEWED' && notification.job?.logo ? ( // Display job logo for job applications
                    <img
                      src={notification.job.logo}
                      alt={`${notification.job.company} Logo`}
                      className="w-10 h-10 rounded-lg object-cover border-2 border-gray-200"
                    />
                  ) : ( // Default icon for other types or if no specific image/logo
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-lg">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                      </svg>
                    </div>
                  )}
                </div>

                {/* Notification Content */}
                <div className="flex-grow">
                  <p className={`text-sm ${notification.read ? 'text-gray-600' : 'text-gray-800 font-semibold'}`}>
                    {/* Dynamic message based on notification type */}
                    {notification.type === 'CONNECTION_ACCEPTED' ? (
                      <>{notification.user?.name || 'Someone'} accepted your connection request.</>
                    ) : notification.type === 'JOB_APPLICATION_VIEWED' ? (
                      <>Your application for {notification.job?.title} at {notification.job?.company} has been viewed.</>
                    ) : notification.type === 'POST_LIKE' ? (
                      <>{notification.user?.name || 'Someone'} liked your recent post.</>
                    ) : notification.type === 'MESSAGE' ? (
                      <>{notification.user?.name || 'Someone'} sent you a new message.</>
                    ) : notification.type === 'EVENT_INVITE' && notification.event?.name ? (
                      <>You're invited to "{notification.event.name}".</>
                    ) : (
                      // Default message if type is unknown or incomplete
                      notification.message || 'New notification.'
                    )}
                  </p>
                  <span className="text-xs text-gray-500">{notification.timestamp}</span>
                </div>

                {/* Mark as Read Indicator */}
                {!notification.read && (
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-1"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
