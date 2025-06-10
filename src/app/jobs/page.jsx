// src/app/jobs/page.jsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

// --- NotificationMenu Component ---
// MODIFIED: Added 'router' as a prop to NotificationMenu
function NotificationMenu({ notifications, onMarkAllRead, onClose, router }) {
  const menuRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleViewAllNotifications = () => {
    onClose(); // Close the notification menu
    router.push('/notifications'); // Navigate to the notifications page
  };

  return (
    <div
      ref={menuRef}
      // Adjusted positioning: using left-1/2 and -translate-x-1/2 to center horizontally under the NavLink
      // Removed mt-2 to bring it closer to the bell icon/button
      className="absolute top-full left-1/2 transform -translate-x-1/2 w-72 bg-white rounded-lg shadow-xl py-1 border border-gray-200 z-20 animate-fade-in-down"
    >
      <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100">
        <h4 className="font-bold text-gray-800">Notifications</h4>
        <button
          onClick={onMarkAllRead}
          className="text-indigo-600 hover:underline text-sm"
        >
          Mark all as read
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-gray-500 text-sm p-4 text-center">No new notifications.</p>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`px-4 py-3 border-b border-gray-100 text-sm ${notif.read ? 'text-gray-500 bg-gray-50' : 'text-gray-700 hover:bg-indigo-50'}`}
            // You might want to add an onClick here for individual notification actions
            >
              <p className={`${notif.read ? 'font-normal' : 'font-semibold'}`}>{notif.message}</p>
              <span className="text-xs text-gray-400">{notif.timeAgo}</span>
            </div>
          ))
        )}
      </div>
      {notifications.length > 0 && (
        <div className="border-t border-gray-100 pt-2 pb-1 text-center">
          <button onClick={handleViewAllNotifications} className="text-indigo-600 hover:underline text-sm">
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}

// --- Navbar and NavLink components ---
function Navbar({ session, router }) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  // State to hold notifications fetched by the Navbar
  const [notifications, setNotifications] = useState([]);
  const notificationCount = notifications.filter(notif => !notif.read).length;

  useEffect(() => {
    console.log("Navbar: session.user.image received:", session?.user?.image);
    const computedSrc = `${session?.user?.image || `https://placehold.co/32x32/A78BFA/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'}`}${session?.user?.image ? `?cb=${Date.now()}` : ''}`;
    console.log("Navbar: Computed image src (including cache-buster):", computedSrc);
  }, [session?.user?.image, session?.user?.name]);

  // Fetch notifications effect moved to Navbar
  useEffect(() => {
    const fetchNotifications = async () => {
      if (session?.user?.id) {
        try {
          // TODO: Replace this with an actual API call to fetch notifications from your backend.
          // Example: const response = await fetch('/api/notifications');
          // const data = await response.json();
          // setNotifications(data.notifications);

          // For now, setting to an empty array to remove mock data.
          const fetchedNotifications = [];
          setNotifications(fetchedNotifications);
          console.log(`DEBUG: Fetched notification count for user ${session.user.id}: ${fetchedNotifications.filter(n => !n.read).length}`);
        } catch (error) {
          console.error("Error fetching notifications:", error);
          setNotifications([]);
        }
      } else {
        console.log(`DEBUG: Authenticated session data incomplete. Waiting for full session. userId: ${session?.user?.id} status: ${status}`);
        setNotifications([]); // Reset count if not authenticated or session data is not ready
      }
    };

    // Fetch on component mount and periodically (e.g., every 60 seconds)
    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 60000); // Poll every 60 seconds

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [session?.user?.id]); // Only re-run when session user ID changes

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/login' });
  };

  const handleMarkAllNotificationsRead = useCallback(() => {
    // TODO: In a real application, you would send an API request here
    // to mark notifications as read in your backend database.
    // Example: await fetch('/api/notifications/mark-all-read', { method: 'POST' });
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    console.log("DEBUG: All notifications marked as read in frontend state.");
  }, []);

  const toggleNotificationMenu = useCallback(() => {
    setIsNotificationMenuOpen(prev => !prev);
    setIsProfileMenuOpen(false); // Close profile menu if opening notifications
  }, []);

  return (
    <nav className="bg-white shadow-md py-3 px-4 sm:px-6 lg:px-8 sticky top-0 z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
        {/* Logo/Home Link */}
        <div className="flex-shrink-0">
          <button onClick={() => router.push("/dashboard")} className="flex items-center text-indigo-600 hover:text-indigo-800 transition duration-150 ease-in-out">
            <svg className="w-8 h-8 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              {/* Corrected SVG path for a home icon */}
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12L12 3l9 9M5 10v9a2 2 0 002 2h10a2 2 0 002-2v-9"></path>
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

          {/* NavLink for Notifications with Badge and Menu */}
          <NavLink
            iconClass="fas fa-bell"
            text="Notifications"
            onClick={toggleNotificationMenu} // Use onClick to toggle the menu
            isMenuTrigger={true} // Explicitly mark as a menu trigger
            router={router}
            notificationCount={notificationCount} // Pass notification count for badge
            isNotificationMenuOpen={isNotificationMenuOpen} // Pass menu open state
            notifications={notifications} // Pass the notifications array
            onMarkAllRead={handleMarkAllNotificationsRead} // Pass handler to mark all as read
            onNotificationMenuClose={() => setIsNotificationMenuOpen(false)} // Pass handler to close menu
          />

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setIsProfileMenuOpen(!isProfileMenuOpen); setIsNotificationMenuOpen(false); }} // Close notification menu if opening profile
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"></path>
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

// MODIFIED: NavLink now conditionally renders as a button or a div based on isMenuTrigger prop.
// It also explicitly handles rendering of the badge and menu when isMenuTrigger is true.
function NavLink({ iconClass, text, href, router, children, onClick, isMenuTrigger, notificationCount, isNotificationMenuOpen, notifications, onMarkAllRead, onNotificationMenuClose }) {
  const isActive = router.pathname === href;
  // Removed bg-indigo-50 from commonClasses to remove blue highlight when active
  const commonClasses = `relative hidden sm:flex flex-col items-center p-2 rounded-lg ${isActive && !isMenuTrigger ? 'text-indigo-600 font-bold' : 'text-gray-600 hover:bg-gray-100'} transition duration-150 ease-in-out text-sm`;

  if (isMenuTrigger) {
    // When acting as a menu trigger, the outer element should be a div.
    // The onClick handler for toggling the menu is placed on this div.
    return (
      <div
        onClick={onClick} // This onClick will be toggleNotificationMenu from Navbar
        className={`${commonClasses} cursor-pointer`} // Add cursor pointer and ensure focusable
        tabIndex={0} // Make div focusable for keyboard navigation
        role="button" // Indicate it acts like a button for accessibility readers
        aria-expanded={isNotificationMenuOpen ? "true" : "false"} // aria-expanded based on menu open state
      >
        <i className={`${iconClass} text-lg mb-1`}></i>
        <span>{text}</span>
        {notificationCount > 0 && (
          // Adjusted top and right positioning to better place the badge over the bell icon.
          <span className="absolute left-[50px] top-[5px] inline-flex items-center justify-center h-4 w-4 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
            {notificationCount}
          </span>
        )}
        {isNotificationMenuOpen && (
          <NotificationMenu
            notifications={notifications}
            onMarkAllRead={onMarkAllRead}
            onClose={onNotificationMenuClose}
            router={router} // PASSED: router prop to NotificationMenu
          />
        )}
        {/* The 'children' prop is not used in this branch, as badge and menu are rendered explicitly */}
      </div>
    );
  } else {
    // Default behavior: simple navigation link (button)
    return (
      <button
        onClick={onClick || (() => router.push(href))}
        className={commonClasses}
      >
        <i className={`${iconClass} text-lg mb-1`}></i>
        <span>{text}</span>
        {children} {/* Children (e.g., badge on other links if any) still work here */}
      </button>
    );
  }
}
// --- End Navbar and NavLink components ---

export default function JobsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jobListings, setJobListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (status === "loading") {
      return; // Still loading session, do nothing
    }

    if (status === "unauthenticated") {
      router.push("/auth/login"); // Redirect if not logged in
      return;
    }

    if (status === "authenticated") {
      const fetchJobs = async () => {
        try {
          setLoading(true);
          // In a real application, you would fetch from your backend, e.g.:
          // const res = await fetch('/api/jobs');
          // const data = await res.json();
          // setJobListings(data.jobs);

          // Simulated data:
          const simulatedJobs = [
            {
              id: 'job1',
              title: 'Senior Software Engineer',
              company: 'Tech Solutions Inc.',
              location: 'Remote',
              description: 'We are seeking a highly skilled Senior Software Engineer to join our dynamic team...',
              posted: '2 days ago',
              salary: '$120,000 - $150,000',
              logo: 'https://placehold.co/60x60/4A90E2/FFFFFF?text=TS',
            },
            {
              id: 'job2',
              title: 'Product Manager',
              company: 'Innovate Innovations',
              location: 'New York, NY',
              description: 'Innovate Innovations is looking for a driven Product Manager to lead our new product line...',
              posted: '5 days ago',
              salary: '$100,000 - $130,000',
              logo: 'https://placehold.co/60x60/50C878/FFFFFF?text=II',
            },
            {
              id: 'job3',
              title: 'Data Scientist',
              company: 'Analytics Hub',
              location: 'San Francisco, CA',
              description: 'Join Analytics Hub as a Data Scientist to work on cutting-edge data analysis projects...',
              posted: '1 week ago',
              salary: '$110,000 - $140,000',
              logo: 'https://placehold.co/60x60/DA70D6/FFFFFF?text=AH',
            },
            {
              id: 'job4',
              title: 'UX Designer',
              company: 'Creative Studio',
              location: 'Remote',
              description: 'We need a talented UX Designer to craft intuitive and engaging user experiences...',
              posted: '3 days ago',
              salary: '$90,000 - $110,000',
              logo: 'https://placehold.co/60x60/FF7F50/FFFFFF?text=CS',
            },
            {
              id: 'job5',
              title: 'Marketing Specialist',
              company: 'Growth Strategies Ltd.',
              location: 'London, UK',
              description: 'Seeking an innovative Marketing Specialist to develop and execute marketing campaigns...',
              posted: '4 days ago',
              salary: '£40,000 - £55,000',
              logo: 'https://placehold.co/60x60/6A5ACD/FFFFFF?text=GS',
            },
          ];
          setJobListings(simulatedJobs);

        } catch (err) {
          console.error("Failed to fetch jobs:", err);
          setError("Failed to load job listings. Please try again.");
        } finally {
          setLoading(false);
        }
      };
      fetchJobs();
    }
  }, [status, router]); // Depend on session status and router

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="flex items-center space-x-2 text-indigo-600">
          <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading job listings...
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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8 text-center">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Job Listings
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

          {jobListings.length === 0 && !loading && !error && (
            <div className="text-center py-10 bg-white shadow-xl rounded-2xl border border-gray-200">
              <p className="text-gray-600 text-lg">No job listings found at the moment.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {jobListings.map((job) => (
              <div key={job.id} className="bg-white shadow-lg rounded-2xl p-6 border border-gray-200 flex flex-col">
                <div className="flex items-center mb-4">
                  <img
                    src={job.logo}
                    alt={`${job.company} Logo`}
                    className="w-12 h-12 rounded-lg object-cover mr-4 border border-gray-200"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{job.title}</h3>
                    <p className="text-md text-gray-700">{job.company}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2 flex items-center">
                  <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  {job.location}
                </p>
                {job.salary && (
                  <p className="text-sm text-gray-600 mb-4 flex items-center">
                    <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2V8z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 13h10a3 3 0 003-3V6a3 3 0 00-3-3H7a3 3 0 00-3 3v4a3 3 0 003 3z"></path>
                    </svg>
                    {job.salary}
                  </p>
                )}
                <p className="text-gray-700 text-sm mb-4 line-clamp-3">{job.description}</p>
                <div className="mt-auto flex justify-between items-center text-xs text-gray-500">
                  <span>Posted: {job.posted}</span>
                  <button className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-150 ease-in-out shadow-md transform hover:scale-105">
                    Apply Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
