// src/app/notifications/page.jsx
"use client";

import { useEffect, useState, useCallback } from "react"; // Added useCallback
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from '../../components/NavBar';


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

  const clearNotification = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Failed to clear notification');
      }
      // Re-fetch notifications from backend
      fetchNotifications();
    } catch (error) {
      console.error("Error clearing notification:", error);
    }
  }, [fetchNotifications]);

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

                {/* New Clear Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearNotification(notification.id);
                  }}
                  className="text-gray-400 hover:text-red-600"
                  title="Clear notification"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
