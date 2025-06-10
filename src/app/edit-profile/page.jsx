"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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


// Helper function to format dates
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' }).format(new Date(dateString));
  } catch (e) {
    console.error("Error formatting date:", dateString, e);
    return dateString; // Return original if invalid
  }
};


// --- Modal Components moved outside EditProfilePage for proper scoping ---

function ExperienceModal({ isOpen, onClose, onSave, experienceToEdit }) {
  const [formData, setFormData] = useState({
    id: experienceToEdit?.id || '',
    title: experienceToEdit?.title || '',
    company: experienceToEdit?.company || '',
    location: experienceToEdit?.location || '',
    startDate: experienceToEdit?.startDate || '',
    endDate: experienceToEdit?.endDate || '',
    isCurrent: experienceToEdit?.isCurrent || false,
    description: experienceToEdit?.description || '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        id: experienceToEdit?.id || '',
        title: experienceToEdit?.title || '',
        company: experienceToEdit?.company || '',
        location: experienceToEdit?.location || '',
        startDate: experienceToEdit?.startDate || '',
        endDate: experienceToEdit?.endDate || '',
        isCurrent: experienceToEdit?.isCurrent || false,
        description: experienceToEdit?.description || '',
      });
      setErrors({});
    }
  }, [isOpen, experienceToEdit]);


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors(prev => ({ ...prev, [name]: '' })); // Clear error on change
  };

  const handleSave = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Job Title is required.';
    if (!formData.company.trim()) newErrors.company = 'Company is required.';
    if (!formData.startDate) newErrors.startDate = 'Start Date is required.';
    if (!formData.isCurrent && !formData.endDate) newErrors.endDate = 'End Date is required if not current.';
    if (newErrors.startDate && newErrors.endDate) {
      newErrors.dateRange = 'Invalid date range.';
    } else if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      newErrors.dateRange = 'Start date cannot be after end date.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-200 animate-scale-in">
        <h3 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">
          {experienceToEdit ? 'Edit Experience' : 'Add Experience'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Job Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Company</label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.company && <p className="text-red-500 text-xs mt-1">{errors.company}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                disabled={formData.isCurrent}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 ${formData.isCurrent ? 'bg-gray-100 opacity-70' : ''}`}
              />
              {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
            </div>
          </div>
          {errors.dateRange && <p className="text-red-500 text-xs mt-1 text-center">{errors.dateRange}</p>}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="isCurrent"
              checked={formData.isCurrent}
              onChange={handleChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">I currently work here</label>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description (Optional)</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
            ></textarea>
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-100 transition duration-150 ease-in-out"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-150 ease-in-out"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function EducationModal({ isOpen, onClose, onSave, educationToEdit }) {
  const [formData, setFormData] = useState({
    id: educationToEdit?.id || '',
    school: educationToEdit?.school || '', // Frontend uses 'school'
    degree: educationToEdit?.degree || '',
    fieldOfStudy: educationToEdit?.fieldOfStudy || '',
    startDate: educationToEdit?.startDate || '',
    endDate: educationToEdit?.endDate || '',
    description: educationToEdit?.description || '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        id: educationToEdit?.id || '',
        school: educationToEdit?.school || '',
        degree: educationToEdit?.degree || '',
        fieldOfStudy: educationToEdit?.fieldOfStudy || '',
        startDate: educationToEdit?.startDate || '',
        endDate: educationToEdit?.endDate || '',
        description: educationToEdit?.description || '',
      });
      setErrors({});
    }
  }, [isOpen, educationToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSave = () => {
    const newErrors = {};
    if (!formData.school.trim()) newErrors.school = 'School is required.';
    if (!formData.degree.trim()) newErrors.degree = 'Degree is required.';
    if (!formData.startDate) newErrors.startDate = 'Start Date is required.';
    if (!formData.endDate) newErrors.endDate = 'End Date is required.';
    if (newErrors.startDate && newErrors.endDate) {
      newErrors.dateRange = 'Invalid date range.';
    } else if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      newErrors.dateRange = 'Start date cannot be after end date.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-200 animate-scale-in">
        <h3 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">
          {educationToEdit ? 'Edit Education' : 'Add Education'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">School</label>
            <input
              type="text"
              name="school"
              value={formData.school}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.school && <p className="text-red-500 text-xs mt-1">{errors.school}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Degree</label>
            <input
              type="text"
              name="degree"
              value={formData.degree}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.degree && <p className="text-red-500 text-xs mt-1">{errors.degree}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Field of Study</label>
            <input
              type="text"
              name="fieldOfStudy"
              value={formData.fieldOfStudy}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
            </div>
          </div>
          {errors.dateRange && <p className="text-red-500 text-xs mt-1 text-center">{errors.dateRange}</p>}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description (Optional)</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
            ></textarea>
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-100 transition duration-150 ease-in-out"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-150 ease-in-out"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function SkillModal({ isOpen, onClose, onAdd, skillToEdit, onUpdate, MAX_SKILL_LENGTH }) {
  const [currentSkillInput, setCurrentSkillInput] = useState(skillToEdit?.name || '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCurrentSkillInput(skillToEdit?.name || '');
      setError('');
    }
  }, [isOpen, skillToEdit]);

  const handleSkillChange = (e) => {
    setCurrentSkillInput(e.target.value);
    setError('');
  };

  const handleSave = () => {
    const trimmedSkill = currentSkillInput.trim();
    if (!trimmedSkill) {
      setError('Skill cannot be empty.');
      return;
    }
    if (trimmedSkill.length > MAX_SKILL_LENGTH) {
      setError(`Skill cannot exceed ${MAX_SKILL_LENGTH} characters.`);
      return;
    }

    if (skillToEdit) {
      onUpdate(skillToEdit, trimmedSkill);
    } else {
      onAdd(trimmedSkill);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-200 animate-scale-in">
        <h3 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">
          {skillToEdit ? 'Edit Skill' : 'Add New Skill'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Skill Name</label>
            <input
              type="text"
              value={currentSkillInput}
              onChange={handleSkillChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g., JavaScript, Project Management"
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-100 transition duration-150 ease-in-out"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-150 ease-in-out"
          >
            {skillToEdit ? 'Update Skill' : 'Add Skill'}
          </button>
        </div>
      </div>
    </div>
  );
}

// New Resume Preview Modal Component
function ResumePreviewModal({ isOpen, onClose, resumeUrl }) {
  // Define PDF.js worker and core library paths
  const PDF_JS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const PDF_JS_LIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';

  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pageRendering, setPageRendering] = useState(false);
  const [pageNumPending, setPageNumPending] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');

  const canvasRef = useRef(null);
  const containerRef = useRef(null); // Ref for the parent container of the canvas


  // This useEffect will reliably trigger rendering when pdfDoc is loaded AND canvas is available
  useEffect(() => {
    console.log('DEBUG: Canvas/PDF sync effect triggered. pdfDoc:', !!pdfDoc, 'canvasRef.current:', !!canvasRef.current, 'pageNum:', pageNum);
    if (pdfDoc && canvasRef.current) {
      console.log('DEBUG: PDF document and canvas are both available. Initiating page render for page:', pageNum);
      queueRenderPage(pageNum);
    }
  }, [pdfDoc, pageNum, zoomLevel]); // Removed queueRenderPage from dependencies

  useEffect(() => {
    // Load PDF.js library dynamically
    const loadPdfJs = async () => {
      console.log('DEBUG: loadPdfJs called. isOpen:', isOpen, 'resumeUrl:', resumeUrl);
      if (typeof window === 'undefined' || !isOpen || !resumeUrl) {
        console.log('DEBUG: loadPdfJs - conditions not met for loading.');
        return;
      }

      if (!window.pdfjsLib) {
        console.log('DEBUG: PDF.js library not found, attempting to load.');
        setLoadingPdf(true);
        setPdfError('');
        try {
          const script = document.createElement('script');
          script.src = PDF_JS_LIB_URL;
          script.async = true;
          document.body.appendChild(script);

          await new Promise((resolve, reject) => {
            script.onload = () => {
              console.log('DEBUG: PDF.js script loaded successfully.');
              resolve();
            };
            script.onerror = (e) => {
              console.error('DEBUG: PDF.js script failed to load:', e);
              reject(e);
            };
          });

          // Set worker source only after pdfjsLib is confirmed available
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_JS_WORKER_URL;
          console.log('DEBUG: PDF.js worker source set.');

          // ADDED: Small delay to ensure PDF.js is fully initialized
          await new Promise(resolve => setTimeout(resolve, 100));
          console.log('DEBUG: Short delay after PDF.js load complete.');

        } catch (error) {
          console.error("Error loading PDF.js:", error);
          setPdfError("Failed to load PDF viewer. Please try again later.");
          setLoadingPdf(false);
          return;
        } finally {
          setLoadingPdf(false);
        }
      } else {
        console.log('DEBUG: PDF.js library already loaded.');
      }
      // Now that PDF.js is confirmed loaded, proceed to load the document
      await loadPdfDocument();
    };

    const loadPdfDocument = async () => {
      console.log('DEBUG: loadPdfDocument called. window.pdfjsLib:', !!window.pdfjsLib, 'resumeUrl:', resumeUrl);
      if (!window.pdfjsLib || !resumeUrl) {
        console.log('DEBUG: loadPdfDocument - conditions not met for loading document.');
        return;
      }

      setLoadingPdf(true);
      setPdfError('');
      setPdfDoc(null); // Clear previous PDF document
      setPageNum(1); // Reset to first page for new document

      try {
        console.log(`DEBUG: Attempting to get PDF document from proxy: /api/resume-proxy?url=${encodeURIComponent(resumeUrl)}`);
        const loadingTask = window.pdfjsLib.getDocument(`/api/resume-proxy?url=${encodeURIComponent(resumeUrl)}`);
        const pdf = await loadingTask.promise;
        console.log('DEBUG: PDF document loaded successfully.');
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setLoadingPdf(false);

        // Removed explicit setTimeout for initial page rendering.
        // The new useEffect hook (above) based on pdfDoc and canvasRef.current readiness now handles this.

      } catch (error) {
        console.error("Error loading PDF document:", error);
        setPdfError(`Failed to load PDF document: ${error.message}.`);
        setLoadingPdf(false);
      }
    };

    if (isOpen && resumeUrl) { // Only attempt to load if modal is open and URL exists
      loadPdfJs();
    } else if (!isOpen) { // Reset state when modal is closed
      setPdfDoc(null);
      setPageNum(1);
      setNumPages(0);
      setPageRendering(false);
      setPageNumPending(null);
      setPdfError('');
    }

  }, [isOpen, resumeUrl]);

  const renderPage = useCallback((num) => {
    console.log('DEBUG: renderPage called for page:', num, 'pdfDoc:', !!pdfDoc);
    if (!pdfDoc) {
      console.log('DEBUG: pdfDoc not available for rendering.');
      return;
    }

    setPageRendering(true);
    setPdfError('');

    pdfDoc.getPage(num).then((page) => {
      const canvas = canvasRef.current;
      const container = containerRef.current; // Get the container element
      console.log('DEBUG: Canvas ref current (inside renderPage):', canvas);
      console.log('DEBUG: Container ref current (inside renderPage):', container);

      if (!canvas || !container) {
        console.warn("Canvas or container element not available for rendering (renderPage).");
        setPageRendering(false);
        return;
      }

      const originalViewport = page.getViewport({ scale: zoomLevel });

      // Determine the maximum available space for the canvas
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      let renderScale = zoomLevel;

      // Calculate an additional scale to fit within the container if needed
      if (originalViewport.width > containerWidth || originalViewport.height > containerHeight) {
        const widthRatio = containerWidth / originalViewport.width;
        const heightRatio = containerHeight / originalViewport.height;
        renderScale = zoomLevel * Math.min(widthRatio, heightRatio); // Use the smaller ratio to fit both dimensions
      }

      const scaledViewport = page.getViewport({ scale: renderScale });
      const context = canvas.getContext('2d');

      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(scaledViewport.width * outputScale);
      canvas.height = Math.floor(scaledViewport.height * outputScale);

      canvas.style.width = Math.floor(scaledViewport.width) + 'px';
      canvas.style.height = Math.floor(scaledViewport.height) + 'px';

      console.log(`DEBUG: Rendering page ${num}. Canvas dimensions set to:`);
      console.log(`  canvas.width (internal pixels): ${canvas.width}`);
      console.log(`  canvas.height (internal pixels): ${canvas.height}`);
      console.log(`  canvas.style.width (CSS pixels): ${canvas.style.width}`);
      console.log(`  canvas.style.height (CSS pixels): ${canvas.style.height}`);
      console.log(`  originalViewport.width: ${originalViewport.width}`);
      console.log(`  originalViewport.height: ${originalViewport.height}`);
      console.log(`  scaledViewport.width: ${scaledViewport.width}`);
      console.log(`  scaledViewport.height: ${scaledViewport.height}`);
      console.log(`  zoomLevel: ${zoomLevel}`);
      console.log(`  renderScale (final): ${renderScale}`);
      console.log(`  outputScale: ${outputScale}`);
      console.log(`  containerWidth: ${containerWidth}`);
      console.log(`  containerHeight: ${containerHeight}`);


      context.clearRect(0, 0, canvas.width, canvas.height);
      context.scale(outputScale, outputScale);

      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport, // Use the scaledViewport for rendering
      };

      const renderTask = page.render(renderContext);
      renderTask.promise.then(() => {
        console.log(`DEBUG: Page ${num} rendering complete.`);
        setPageRendering(false);
        if (pageNumPending !== null && pageNumPending !== num) {
          console.log(`DEBUG: Found pending page ${pageNumPending}, queuing render.`);
          renderPage(pageNumPending);
          setPageNumPending(null);
        }
      }).catch(err => {
        console.error("Error rendering page:", err);
        setPdfError("Error rendering PDF page.");
        setPageRendering(false);
      });
    }).catch(err => {
      console.error("Error getting page:", err);
      setPdfError("Error accessing PDF page.");
      setPageRendering(false);
    });
  }, [pdfDoc, pageNumPending, zoomLevel]);

  const queueRenderPage = useCallback((num) => {
    console.log('DEBUG: queueRenderPage called for page:', num, 'pageRendering:', pageRendering);
    if (pageRendering) {
      setPageNumPending(num);
      console.log(`DEBUG: Page ${num} queued because another page is rendering.`);
    } else {
      renderPage(num);
      console.log(`DEBUG: Immediately rendering page ${num}.`);
    }
  }, [pageRendering, renderPage]);

  const onPrevPage = () => {
    if (pageNum <= 1) {
      return;
    }
    setPageNum(prev => prev - 1);
  };

  const onNextPage = () => {
    if (pageNum >= numPages) {
      return;
    }
    setPageNum(prev => prev + 1);
  };

  const onZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 3.0));
  };

  const onZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full h-full max-w-4xl max-h-screen flex flex-col animate-scale-in">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-800">Resume Preview</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition duration-150 ease-in-out p-2 rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        {/* MODIFIED: Added 'overflow-hidden' to the container div and attached containerRef */}
        <div ref={containerRef} className="flex-grow p-4 flex flex-col items-center justify-center relative min-h-[500px] overflow-hidden">
          {loadingPdf && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10 rounded-lg">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                <p className="mt-4 text-lg text-gray-700">Loading PDF...</p>
              </div>
            </div>
          )}
          {pdfError && !loadingPdf && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-100 text-red-700 p-4 rounded-lg z-10">
              <p className="text-center">{pdfError}</p>
            </div>
          )}
          {!loadingPdf && !pdfError && !pdfDoc && (
            <div className="text-center text-gray-500">
              <i className="fas fa-file-pdf text-6xl mb-4"></i>
              <p>No PDF document loaded or selected.</p>
            </div>
          )}

          <canvas ref={canvasRef} id="pdf-canvas" className="border border-gray-300 shadow-md rounded-lg bg-gray-200"></canvas>
        </div>

        {pdfDoc && (
          <div className="flex justify-center items-center p-4 border-t border-gray-200 bg-gray-50 space-x-2 rounded-b-lg">
            <button
              onClick={onPrevPage}
              disabled={pageNum <= 1 || pageRendering}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-1"
            >
              <i className="fas fa-chevron-left"></i>
              <span>Prev</span>
            </button>
            <span className="text-gray-700 font-semibold">
              Page {pageNum} / {numPages}
            </span>
            <button
              onClick={onNextPage}
              disabled={pageNum >= numPages || pageRendering}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-1"
            >
              <span>Next</span>
              <i className="fas fa-chevron-right"></i>
            </button>
            <button
              onClick={onZoomIn}
              disabled={pageRendering}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
              title="Zoom In"
            >
              <i className="fas fa-search-plus"></i>
            </button>
            <button
              onClick={onZoomOut}
              disabled={pageRendering}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
              title="Zoom Out"
            >
              <i className="fas fa-search-minus"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


export default function EditProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);


  // profileData stores the officially saved/fetched profile data
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    headline: '',
    summary: '',
    location: '',
    profilePicture: '',
    coverPhoto: '',
    resume: '',
    isProfileComplete: false,
    experience: [],
    education: [],
    skills: [],
  });

  // draftProfileData stores the data being actively edited (only populated in 'edit' mode)
  const [draftProfileData, setDraftProfileData] = useState(null);

  // States for new file uploads (raw File objects)
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [coverPhotoFile, setCoverPhotoFile] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);

  const [formErrors, setFormErrors] = useState({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // State to control overall view mode: 'view' (default) or 'edit'
  const [viewMode, setViewMode] = useState('view');

  // New state for resume preview modal
  const [isResumePreviewOpen, setIsResumePreviewOpen] = useState(false);
  const [currentResumeUrl, setCurrentResumeUrl] = useState('');

  // Constants for form validation
  const MAX_HEADLINE_LENGTH = 100;
  const MAX_SUMMARY_LENGTH = 500;
  const MAX_LOCATION_LENGTH = 100;
  const MAX_SKILL_LENGTH = 50;

  // States for modals (these operate on draftProfileData when in edit mode)
  const [isExperienceModalOpen, setIsExperienceModalOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState(null);
  const [isEducationModalOpen, setIsEducationModalOpen] = useState(false);
  const [editingEducation, setEditingEducation] = useState(null);
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [skillInput, setSkillInput] = useState('');


  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    if (status === "authenticated") {
      const fetchProfile = async () => {
        try {
          const res = await fetch('/api/edit-profile');
          if (res.ok) {
            let data;
            try {
              data = await res.json();
            } catch (jsonParseError) {
              const rawResponseText = await res.text();
              console.error("JSON parsing error:", jsonParseError);
              console.error("Raw backend response causing JSON error:", rawResponseText);
              throw new Error(`Failed to parse backend response as JSON: ${jsonParseError.message}. Raw response: "${rawResponseText.substring(0, 200)}..."`);
            }

            console.log("Fetched profile data from backend:", JSON.stringify(data.profile, null, 2));

            setProfileData(prev => ({
              ...prev,
              // Backend now sends `name`, `email`, `profilePicture`, `summary`, `experience`, `education`, `skills`
              // directly at the top level of `data.profile` after formatting.
              name: data.profile.name || session.user.name || '',
              email: data.profile.email || session.user.email || '',
              headline: data.profile.headline || '',
              summary: data.profile.summary || '', // Correctly use data.profile.summary
              location: data.profile.location || '',
              // MODIFIED: Prioritize data.profile.profilePictureUrl from backend
              profilePicture: data.profile.profilePictureUrl || session.user.image || '',
              coverPhoto: data.profile.coverPhotoUrl || '',
              resume: data.profile.resumeUrl || '',
              isProfileComplete: data.profile.isProfileComplete || false,
              experience: Array.isArray(data.profile.experience) ? data.profile.experience : [], // Correctly use data.profile.experience
              education: Array.isArray(data.profile.education) ? data.profile.education : [],   // Correctly use data.profile.education
              skills: Array.isArray(data.profile.skills) ? data.profile.skills : [],
            }));
            // ADDED: Log session user image after initial fetch
            console.log("EditProfilePage: session.user.image AFTER initial fetch:", session?.user?.image);
          } else {
            let errorData = { message: `Failed to fetch profile: ${res.statusText}` };
            try {
              const text = await res.text();
              console.error("Backend error raw response (non-ok status):", text);
              errorData = JSON.parse(text);
            } catch (jsonParseError) {
              console.error("Failed to parse non-OK error response as JSON:", jsonParseError);
              errorData.message = errorData.message + (text ? ` Raw: "${text.substring(0, 100)}..."` : '');
            }
            throw new Error(errorData.message || `Failed to fetch profile: ${res.statusText}`);
          }
        } catch (err) {
          console.error("Error fetching profile:", err);
          setFormErrors(prev => ({ ...prev, fetch: err.message || "Failed to load profile data." }));
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    }
  }, [status, router, session]);

  // ADDED: useEffect to monitor session.user.image changes in EditProfilePage
  useEffect(() => {
    console.log("EditProfilePage (useEffect): Current session.user.image is:", session?.user?.image);
  }, [session?.user?.image]);


  // Handler for text input changes, updates draftProfileData
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    if (draftProfileData) {
      setDraftProfileData(prev => ({ ...prev, [name]: value }));
    }
  }, [draftProfileData]);

  // Handler for file input changes, updates draftProfileData and file states
  const handleFileChange = useCallback((e, fileType) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (fileType === 'profilePicture') {
        setProfilePictureFile(file);
        setDraftProfileData(prev => ({ ...prev, profilePicture: URL.createObjectURL(file) }));
      } else if (fileType === 'coverPhoto') {
        setCoverPhotoFile(file);
        setDraftProfileData(prev => ({ ...prev, coverPhoto: URL.createObjectURL(file) }));
      } else if (fileType === 'resume') {
        setResumeFile(file);
        // For resume, update the draft with the file name for display, not a blob URL
        setDraftProfileData(prev => ({ ...prev, resume: file.name }));
      }
    }
  }, []);

  // Helper function to upload files to S3
  const uploadFileToS3 = useCallback(async (file, fileType) => {
    if (!file) return null;

    const formData = new FormData();
    formData.append(fileType, file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Server responded with non-OK status (${response.status}) for ${fileType} upload.`);
        console.error(`Raw server response for ${fileType}:`, errorText);

        let errorMessage = `File upload failed for ${fileType}: ${response.statusText}.`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (jsonParseError) {
          console.warn(`Raw response for ${fileType} was not JSON, attempting to extract message:`, jsonParseError);
          errorMessage = errorText;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data.urls[`${fileType}Url`];
    } catch (error) {
      console.error(`Error uploading ${fileType}:`, error);
      setFormErrors(prev => ({ ...prev, [`${fileType}Upload`]: `Failed to upload ${fileType}: ${error.message}` }));
      return null;
    }
  }, []);


  const validateForm = useCallback((dataToValidate) => {
    const errors = {};
    if (!dataToValidate.name || dataToValidate.name.trim().length < 2) {
      errors.name = 'Name is required and must be at least 2 characters.';
    }
    if (!dataToValidate.headline || dataToValidate.headline.length > MAX_HEADLINE_LENGTH) {
      errors.headline = `Headline is required and cannot exceed ${MAX_HEADLINE_LENGTH} characters.`;
    }
    if (dataToValidate.summary && dataToValidate.summary.length > MAX_SUMMARY_LENGTH) {
      errors.summary = `Summary cannot exceed ${MAX_SUMMARY_LENGTH} characters.`;
    }
    if (!dataToValidate.location || dataToValidate.location.length > MAX_LOCATION_LENGTH) {
      errors.location = `Location is required and cannot exceed ${MAX_LOCATION_LENGTH} characters.`
    }
    if (dataToValidate.experience.length === 0) {
      errors.experience = 'At least one experience entry is required.';
    }
    if (dataToValidate.education.length === 0) {
      errors.education = 'At least one education entry is required.';
    }
    if (dataToValidate.skills.length === 0) {
      errors.skills = 'At least one skill is required.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [MAX_HEADLINE_LENGTH, MAX_SUMMARY_LENGTH, MAX_LOCATION_LENGTH]);


  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!draftProfileData) return;

    if (!validateForm(draftProfileData)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setFormErrors({});
    setShowSuccessMessage(false);

    let finalProfilePictureUrl = draftProfileData.profilePicture;
    let finalCoverPhotoUrl = draftProfileData.coverPhoto;
    let finalResumeUrl = draftProfileData.resume; // Initialize with current draft resume value

    try {
      if (profilePictureFile) {
        finalProfilePictureUrl = await uploadFileToS3(profilePictureFile, 'profilePicture');
        if (finalProfilePictureUrl === null) {
          setLoading(false); return;
        }
      } else if (draftProfileData.profilePicture === '') { // Explicitly cleared by user
        finalProfilePictureUrl = '';
      } else if (!profilePictureFile && profileData.profilePicture) { // No new file, but there was an existing one
        finalProfilePictureUrl = profileData.profilePicture;
      }
      // If no file was ever set and none is uploaded, it remains empty, which is correct.


      if (coverPhotoFile) {
        finalCoverPhotoUrl = await uploadFileToS3(coverPhotoFile, 'coverPhoto');
        if (finalCoverPhotoUrl === null) {
          setLoading(false); return;
        }
      } else if (profileData.coverPhoto && draftProfileData.coverPhoto === '') {
        finalCoverPhotoUrl = '';
      } else if (!coverPhotoFile && profileData.coverPhoto) {
        finalCoverPhotoUrl = profileData.coverPhoto;
      }

      if (resumeFile) { // Only upload if a new file was selected
        finalResumeUrl = await uploadFileToS3(resumeFile, 'resume');
        if (finalResumeUrl === null) {
          setLoading(false); return;
        }
      } else if (profileData.resume && draftProfileData.resume === '') {
        // If resume was removed from draft, ensure final URL is empty
        finalResumeUrl = '';
      } else if (!resumeFile && profileData.resume) {
        // If no new file, but there was an existing one
        finalResumeUrl = profileData.resume;
      }
      // If no resume was ever set and none is uploaded, it remains empty, which is correct.

      const formData = new FormData();
      formData.append('name', draftProfileData.name);
      formData.append('headline', draftProfileData.headline);
      formData.append('summary', draftProfileData.summary);
      formData.append('location', draftProfileData.location);
      formData.append('isProfileComplete', true);


      formData.append('profilePictureUrl', finalProfilePictureUrl || '');
      formData.append('coverPhotoUrl', finalCoverPhotoUrl || '');
      formData.append('resumeUrl', finalResumeUrl || ''); // Use the resolved finalResumeUrl

      const skillsToSend = draftProfileData.skills.map(s => s.name);
      formData.append('skills', JSON.stringify(skillsToSend));
      formData.append('experience', JSON.stringify(draftProfileData.experience));
      formData.append('education', JSON.stringify(draftProfileData.education));


      const res = await fetch('/api/edit-profile', {
        method: 'PUT',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Profile saved successfully. Backend response profile:", JSON.stringify(data.profile, null, 2));

        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);

        setProfileData(prev => ({
          ...prev,
          // Update profileData using the newly formatted data from the backend
          name: data.profile.name || prev.name,
          email: data.profile.email || prev.email,
          headline: data.profile.headline || prev.headline,
          summary: data.profile.summary || prev.summary,
          location: data.profile.location || prev.location,
          profilePicture: data.profile.profilePictureUrl || prev.profilePicture, // Use profilePictureUrl from backend
          coverPhoto: data.profile.coverPhotoUrl || prev.coverPhoto, // Keep coverPhotoUrl mapping
          resume: data.profile.resumeUrl || prev.resume, // Keep resumeUrl mapping
          isProfileComplete: data.profile.isProfileComplete,
          experience: Array.isArray(data.profile.experience) ? data.profile.experience : [],
          education: Array.isArray(data.profile.education) ? data.profile.education : [],
          skills: Array.isArray(data.profile.skills) ? data.profile.skills : [],
        }));

        // MODIFIED: Call update without arguments to force a full session refresh
        console.log("EditProfilePage: Calling full session update.");
        await update();
        // Note: console.log(session?.user?.image) immediately after update() here might not reflect the change yet,
        // as `session` is a state and updates after the component re-renders.
        // The useEffect hook above will capture the change more reliably.


        if (!profileData.isProfileComplete) {
          router.push('/dashboard');
        }
        setDraftProfileData(null);
        setViewMode('view');
      } else {
        const errorData = await res.json();
        console.error("Failed to save profile:", errorData);
        setFormErrors(prev => ({ ...prev, submit: errorData.message || "Failed to save profile." }));
      }
    } catch (err) {
      console.error("Network error saving profile:", err);
      setFormErrors(prev => ({ ...prev, submit: "Network error. Please try again." }));
    } finally {
      setLoading(false);
    }
  }, [
    draftProfileData,
    profilePictureFile,
    coverPhotoFile,
    resumeFile,
    uploadFileToS3,
    validateForm,
    router,
    update,
    profileData.isProfileComplete,
    profileData.resume,
    profileData.profilePicture, // Added to dependencies for clarity
    profileData.coverPhoto, // Added to dependencies for clarity
  ]);


  // Logic for entering edit mode
  const enterEditMode = useCallback(() => {
    console.log("Entering edit mode. Current profileData BEFORE setting draft:", profileData);
    setDraftProfileData({
      ...profileData,
      // Ensure these are deep copies for editing
      experience: Array.isArray(profileData.experience) ? [...profileData.experience] : [],
      education: Array.isArray(profileData.education) ? [...profileData.education] : [],
      skills: Array.isArray(profileData.skills) ? profileData.skills.map(s => ({ ...s })) : [],
      // Ensure profilePicture, coverPhoto, resume are correctly taken from profileData
      profilePicture: profileData.profilePicture || '',
      coverPhoto: profileData.coverPhoto || '',
      resume: profileData.resume || '',
    });
    setProfilePictureFile(null);
    setCoverPhotoFile(null);
    setResumeFile(null);
    setFormErrors({});
    setViewMode('edit');
    console.log("viewMode set to 'edit'.");
  }, [profileData]);

  // Logic for canceling edit mode (still exists, but no button to trigger it)
  const cancelEditMode = useCallback(() => {
    setDraftProfileData(null);
    setProfilePictureFile(null);
    setCoverPhotoFile(null);
    setResumeFile(null);
    setFormErrors({});
    setViewMode('view');
  }, []);


  // --- Experience Modals ---
  const openExperienceModal = useCallback((exp = null) => {
    setEditingExperience(exp);
    setIsExperienceModalOpen(true);
    setFormErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.experience;
      return newErrors;
    });
  }, []);

  const closeExperienceModal = useCallback(() => {
    setIsExperienceModalOpen(false);
    setEditingExperience(null);
  }, []);

  const handleSaveExperience = useCallback((exp) => {
    setDraftProfileData(prev => {
      if (!prev) return prev;
      const newExperience = editingExperience
        ? prev.experience.map(e => (e.id === exp.id ? exp : e))
        : [...prev.experience, { ...exp, id: crypto.randomUUID() }];
      return { ...prev, experience: newExperience };
    });
    closeExperienceModal();
  }, [editingExperience, closeExperienceModal]);

  const handleDeleteExperience = useCallback((idToDelete) => {
    setDraftProfileData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        experience: prev.experience.filter(exp => exp.id !== idToDelete),
      };
    });
  }, []);

  // --- Education Modals ---
  const openEducationModal = useCallback((edu = null) => {
    setEditingEducation(edu);
    setIsEducationModalOpen(true);
    setFormErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.education;
      return newErrors;
    });
  }, []);

  const closeEducationModal = useCallback(() => {
    setIsEducationModalOpen(false);
    setEditingEducation(null);
  }, []);

  const handleSaveEducation = useCallback((edu) => {
    setDraftProfileData(prev => {
      if (!prev) return prev;
      const newEducation = editingEducation
        ? prev.education.map(e => (e.id === edu.id ? edu : e))
        : [...prev.education, { ...edu, id: crypto.randomUUID() }];
      return { ...prev, education: newEducation };
    });
    closeEducationModal();
  }, [editingEducation, closeEducationModal]);

  const handleDeleteEducation = useCallback((idToDelete) => {
    setDraftProfileData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        education: prev.education.filter(edu => edu.id !== idToDelete),
      };
    });
  }, []);

  // --- Skills Modals/Handling ---
  const openSkillModal = useCallback((skill = null) => {
    setEditingSkill(skill);
    setSkillInput(skill?.name || '');
    setIsSkillModalOpen(true);
    setFormErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.skills;
      return newErrors;
    });
  }, []);

  const closeSkillModal = useCallback(() => {
    setIsSkillModalOpen(false);
    setEditingSkill(null);
    setSkillInput('');
  }, []);

  const handleAddSkill = useCallback((e) => {
    e.preventDefault();
    const skillToAddName = skillInput.trim();
    if (draftProfileData && skillToAddName) {
      const skillExists = draftProfileData.skills.some(s => s.name === skillToAddName);

      if (!skillExists && skillToAddName.length <= MAX_SKILL_LENGTH) {
        setDraftProfileData(prev => ({
          ...prev,
          skills: [...prev.skills, { id: crypto.randomUUID(), name: skillToAddName, profileId: prev.id || null }],
        }));
        setSkillInput('');
        setFormErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.skillInput;
          return newErrors;
        });
      } else if (skillExists) {
        setFormErrors(prev => ({ ...prev, skillInput: "This skill already exists." }));
      } else if (skillToAddName.length > MAX_SKILL_LENGTH) {
        setFormErrors(prev => ({ ...prev, skillInput: `Skill cannot exceed ${MAX_SKILL_LENGTH} characters.` }));
      }
    }
  }, [skillInput, draftProfileData, MAX_SKILL_LENGTH]);


  const handleDeleteSkill = useCallback((skillToDeleteId) => {
    setDraftProfileData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        skills: prev.skills.filter(s => s.id !== skillToDeleteId),
      };
    });
  }, []);

  const handleUpdateSkill = useCallback((originalSkill, newSkillName) => {
    setDraftProfileData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        skills: prev.skills.map(s => s.id === originalSkill.id ? { ...s, name: newSkillName } : s)
      };
    });
  }, []);


  // Handler to remove profile picture (updates draftProfileData)
  const handleRemoveProfilePicture = useCallback(() => {
    setProfilePictureFile(null);
    setDraftProfileData(prev => ({ ...prev, profilePicture: '' }));
  }, []);

  // Handler to remove cover photo (updates draftProfileData)
  const handleRemoveCoverPhoto = useCallback(() => {
    setCoverPhotoFile(null);
    setDraftProfileData(prev => ({ ...prev, coverPhoto: '' }));
  }, []);

  // Handler to open resume preview modal
  const openResumePreview = useCallback((url) => {
    setCurrentResumeUrl(url);
    setIsResumePreviewOpen(true);
  }, []);

  // Handler to close resume preview modal
  const closeResumePreview = useCallback(() => {
    setIsResumePreviewOpen(false);
    setCurrentResumeUrl('');
  }, []);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
          <p className="mt-4 text-lg text-gray-700">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Determine which data to display/edit based on viewMode
  const currentProfileState = viewMode === 'view' ? profileData : draftProfileData;
  console.log("Before rendering - currentProfileState:", currentProfileState);
  if (!currentProfileState) {
    console.error("currentProfileState is null or undefined at render time, this should not happen.");
    return null;
  }
  console.log("currentProfileState.experience:", currentProfileState.experience);
  console.log("currentProfileState.education:", currentProfileState.education);
  console.log("currentProfileState.skills:", currentProfileState.skills);


  return (
    <div className="min-h-screen bg-gray-100 font-sans antialiased text-gray-900">
      {/* Navbar does not need notificationCount prop anymore as it manages its own notification state */}
      <Navbar key={`${session?.user?.image || 'default-navbar-key'}`} session={session} router={router} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Card Header (LinkedIn-like) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
          {/* Cover Photo */}
          <div className="relative w-full h-[230px] bg-gray-200 flex items-center justify-center group rounded-t-lg">
            {currentProfileState.coverPhoto ? (
              <img
                src={currentProfileState.coverPhoto}
                alt="Cover Photo"
                className="w-full h-full object-cover rounded-t-lg"
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/600x200/cccccc/333333?text=Cover+Photo+Error'; }}
              />
            ) : (
              <p className="text-gray-500">No cover photo</p>
            )}

            {/* Edit/Remove Cover Photo Controls (only in edit mode) */}
            {viewMode === 'edit' && (
              <>
                {/* Large clickable overlay for upload */}
                <label htmlFor="coverPhoto" className="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center text-white text-lg font-semibold cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                  <i className="fas fa-camera text-3xl mb-2"></i>
                  <span>Add/Change Cover Photo</span>
                  <input
                    type="file"
                    id="coverPhoto"
                    name="coverPhoto"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => handleFileChange(e, 'coverPhoto')}
                    className="hidden"
                  />
                </label>

                {/* Separate remove button */}
                {currentProfileState.coverPhoto && (
                  <button
                    type="button"
                    onClick={handleRemoveCoverPhoto}
                    className="absolute top-3 right-3 bg-red-600 text-white p-2 rounded-full shadow-md cursor-pointer hover:bg-red-700 transition z-10"
                    title="Remove Cover Photo"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Profile Picture and Basic Info */}
          <div className="relative px-6 pb-8 -mt-16">
            <div className="relative w-32 h-32 rounded-full border-4 border-white bg-gray-300 shadow-md flex items-center justify-center overflow-hidden">
              {currentProfileState.profilePicture ? (
                <img
                  src={currentProfileState.profilePicture}
                  alt="Profile Picture"
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/128x128/A78BFA/ffffff?text=${currentProfileState.name ? currentProfileState.name[0].toUpperCase() : 'U'}`; }}
                />
              ) : (
                <span className="text-white text-5xl font-bold">{currentProfileState.name ? currentProfileState.name[0].toUpperCase() : 'U'}</span>
              )}
              {/* Edit/Remove Profile Picture Controls (only in edit mode) */}
              {viewMode === 'edit' && (
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-full cursor-pointer opacity-0 hover:opacity-100 transition-opacity space-x-2">
                  <label htmlFor="profilePicture" className="text-white text-xl p-2 hover:bg-white hover:bg-opacity-20 rounded-full cursor-pointer">
                    <i className="fas fa-camera"></i> {/* Edit icon */}
                    <input
                      type="file"
                      id="profilePicture"
                      name="profilePicture"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleFileChange(e, 'profilePicture')}
                      className="hidden"
                    />
                  </label>
                  {currentProfileState.profilePicture && (
                    <button
                      type="button"
                      onClick={handleRemoveProfilePicture}
                      className="text-white text-xl p-2 hover:bg-white hover:bg-opacity-20 rounded-full cursor-pointer"
                      title="Remove Profile Picture"
                    >
                      <i className="fas fa-trash-alt"></i> {/* Remove icon */}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4">
              <h1 className="text-2xl font-bold text-gray-800">{currentProfileState.name}</h1>
              <p className="text-md text-gray-600">{currentProfileState.headline}</p>
              <p className="text-sm text-gray-500 flex items-center mt-1">
                <i className="fas fa-map-marker-alt text-xs mr-1 mt-px"></i>
                {currentProfileState.location}
              </p>
            </div>
            {/* Conditional Edit Profile Button */}
            {viewMode === 'view' ? (
              <button
                type="button"
                onClick={enterEditMode}
                className="absolute top-4 right-4 bg-indigo-600 text-white font-semibold py-1.5 px-4 rounded-full shadow-md hover:bg-indigo-700 transition duration-150 ease-in-out flex items-center space-x-2"
              >
                <i className="fas fa-pencil-alt text-sm"></i>
                <span>Edit Profile</span>
              </button>
            ) : (
              null
            )}
          </div>
        </div>

        {showSuccessMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-6 animate-fade-in">
            <strong className="font-bold">Success!</strong>
            <span className="block sm:inline ml-2">Your profile has been saved.</span>
          </div>
        )}

        {formErrors.submit && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6 animate-fade-in">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{formErrors.submit}</span>
          </div>
        )}

        {formErrors.fetch && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6 animate-fade-in">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{formErrors.fetch}</span>
          </div>
        )}

        {viewMode === 'view' ? (
          // --- View Mode Display ---
          <div className="space-y-6">
            {/* Basic Info View */}
            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">About</h2>
              <div className="space-y-3">
                <p className="text-gray-700"><strong className="font-semibold">Headline:</strong> {currentProfileState.headline || 'Not set'}</p>
                <p className="text-gray-700 whitespace-pre-wrap"><strong className="font-semibold">Summary:</strong> {currentProfileState.summary || 'Not set'}</p>
                <p className="text-gray-700"><strong className="font-semibold">Location:</strong> {currentProfileState.location || 'Not set'}</p>
                {currentProfileState.resume && (
                  <p className="text-gray-700 flex items-center">
                    <strong className="font-semibold mr-2">Resume:</strong>
                    {/* Changed to button to open modal */}
                    <button
                      type="button"
                      onClick={() => openResumePreview(currentProfileState.resume)}
                      className="text-indigo-600 hover:underline flex items-center px-2 py-1 rounded-md hover:bg-indigo-50 transition"
                    >
                      <i className="fas fa-file-alt mr-1"></i> View Document
                    </button>
                  </p>
                )}
              </div>
            </section>

            {/* Experience View */}
            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Experience</h2>
              <div className="space-y-4">
                {currentProfileState.experience?.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">No experience added.</p>
                ) : (
                  currentProfileState.experience?.map((exp) => (
                    <div key={exp.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-inner">
                      <p className="font-semibold text-gray-800">{exp.title}</p>
                      <p className="text-gray-600 text-sm">{exp.company}</p>
                      <p className="text-gray-500 text-xs">{exp.location}</p>
                      <p className="text-gray-500 text-xs">{formatDate(exp.startDate)} – {exp.isCurrent ? 'Present' : formatDate(exp.endDate)}</p>
                      {exp.description && <p className="text-gray-700 text-sm mt-1">{exp.description}</p>}
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Education View */}
            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Education</h2>
              <div className="space-y-4">
                {currentProfileState.education?.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">No education added.</p>
                ) : (
                  currentProfileState.education?.map((edu) => (
                    <div key={edu.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-inner">
                      <p className="font-semibold text-gray-800">{edu.school}</p>
                      <p className="text-gray-600 text-sm">{edu.degree}{edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}</p>
                      <p className="text-gray-500 text-xs">{formatDate(edu.startDate)} – {formatDate(edu.endDate)}</p>
                      {edu.description && <p className="text-gray-700 text-sm mt-1">{edu.description}</p>}
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Skills View */}
            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {currentProfileState.skills?.length === 0 ? (
                  <p className="text-gray-600 text-center py-4 w-full">No skills added yet.</p>
                ) : (
                  currentProfileState.skills?.map((skill, index) => (
                    <span key={skill.id} className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm">
                      {skill.name}
                    </span>
                  ))
                )}
              </div>
            </section>
          </div>
        ) : (
          // --- Edit Mode Display (wrapped in a form) ---
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info Edit */}
            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">About</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={currentProfileState.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                </div>
                <div>
                  <label htmlFor="headline" className="block text-sm font-semibold text-gray-700 mb-1">Headline</label>
                  <input
                    type="text"
                    id="headline"
                    name="headline"
                    value={currentProfileState.headline}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    maxLength={MAX_HEADLINE_LENGTH}
                  />
                  {formErrors.headline && <p className="text-red-500 text-xs mt-1">{formErrors.headline}</p>}
                </div>
                <div>
                  <label htmlFor="summary" className="block text-sm font-semibold text-gray-700 mb-1">Summary</label>
                  <textarea
                    id="summary"
                    name="summary"
                    value={currentProfileState.summary}
                    onChange={handleChange}
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
                    maxLength={MAX_SUMMARY_LENGTH}
                  ></textarea>
                  {formErrors.summary && <p className="text-red-500 text-xs mt-1">{formErrors.summary}</p>}
                </div>
                <div>
                  <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={currentProfileState.location}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    maxLength={MAX_LOCATION_LENGTH}
                  />
                  {formErrors.location && <p className="text-red-500 text-xs mt-1">{formErrors.location}</p>}
                </div>
                <div>
                  <label htmlFor="resume" className="block text-sm font-semibold text-gray-700 mb-1">Resume (PDF link)</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      id="resume"
                      name="resume"
                      value={currentProfileState.resume} // Use resume from draftProfileData which will show file name
                      onChange={handleChange} // Allow manual entry of URL or clear
                      className="flex-grow px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="e.g., https://yourdomain.com/your-resume.pdf or file name"
                    />
                    <label htmlFor="resumeFile" className="px-4 py-2 bg-indigo-500 text-white rounded-lg cursor-pointer hover:bg-indigo-600 transition">
                      Upload File
                      <input
                        type="file"
                        id="resumeFile"
                        name="resumeFile"
                        accept=".pdf"
                        onChange={(e) => handleFileChange(e, 'resume')}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {/* Display the actual link if it's an S3 URL, regardless of what's in the input field */}
                  {profileData.resume && !resumeFile && ( // Only show "Current" if a saved S3 URL exists AND no new file is pending
                    <p className="text-sm text-gray-500 mt-2">Current Saved: <a href={profileData.resume} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all">{profileData.resume}</a></p>
                  )}
                  {formErrors.resumeUpload && <p className="text-red-500 text-xs mt-1">{formErrors.resumeUpload}</p>}
                </div>
              </div>
            </section>

            {/* Experience Edit */}
            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Experience</h2>
                <button
                  type="button"
                  onClick={() => openExperienceModal()}
                  className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-150 ease-in-out flex items-center space-x-1"
                >
                  <i className="fas fa-plus-circle text-sm"></i>
                  <span>Add New</span>
                </button>
              </div>
              <div className="space-y-4">
                {currentProfileState.experience?.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">No experience added. Click "Add New" to get started.</p>
                ) : (
                  currentProfileState.experience?.map((exp) => (
                    <div key={exp.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-inner flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-800">{exp.title}</p>
                        <p className="text-gray-600 text-sm">{exp.company}</p>
                        <p className="text-gray-500 text-xs">{exp.location}</p>
                        <p className="text-gray-500 text-xs">{formatDate(exp.startDate)} – {exp.isCurrent ? 'Present' : formatDate(exp.endDate)}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => openExperienceModal(exp)}
                          className="text-indigo-600 hover:text-indigo-800 p-2 rounded-full hover:bg-indigo-50 transition"
                          title="Edit Experience"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExperience(exp.id)}
                          className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50 transition"
                          title="Delete Experience"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {formErrors.experience && <p className="text-red-500 text-xs mt-1">{formErrors.experience}</p>}
              <ExperienceModal
                isOpen={isExperienceModalOpen}
                onClose={closeExperienceModal}
                onSave={handleSaveExperience}
                experienceToEdit={editingExperience}
              />
            </section>

            {/* Education Edit */}
            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Education</h2>
                <button
                  type="button"
                  onClick={() => openEducationModal()}
                  className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-150 ease-in-out flex items-center space-x-1"
                >
                  <i className="fas fa-plus-circle text-sm"></i>
                  <span>Add New</span>
                </button>
              </div>
              <div className="space-y-4">
                {currentProfileState.education?.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">No education added. Click "Add New" to get started.</p>
                ) : (
                  currentProfileState.education?.map((edu) => (
                    <div key={edu.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-inner flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-800">{edu.school}</p>
                        <p className="text-gray-600 text-sm">{edu.degree}{edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}</p>
                        <p className="text-gray-500 text-xs">{formatDate(edu.startDate)} – {formatDate(edu.endDate)}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => openEducationModal(edu)}
                          className="text-indigo-600 hover:text-indigo-800 p-2 rounded-full hover:bg-indigo-50 transition"
                          title="Edit Education"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEducation(edu.id)}
                          className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50 transition"
                          title="Delete Education"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {formErrors.education && <p className="text-red-500 text-xs mt-1">{formErrors.education}</p>}
              <EducationModal
                isOpen={isEducationModalOpen}
                onClose={closeEducationModal}
                onSave={handleSaveEducation}
                educationToEdit={editingEducation}
              />
            </section>

            {/* Skills Edit */}
            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Skills</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {currentProfileState.skills?.length === 0 ? (
                  <p className="text-gray-600 text-center py-4 w-full">No skills added yet.</p>
                ) : (
                  currentProfileState.skills?.map((skill, index) => (
                    <span key={skill.id} className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm">
                      {skill.name}
                      <button
                        type="button"
                        onClick={() => openSkillModal(skill)}
                        className="ml-2 -mr-1 text-indigo-500 hover:text-indigo-700 focus:outline-none"
                        aria-label={`Edit ${skill.name}`}
                      >
                        <i className="fas fa-edit text-xs"></i>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSkill(skill.id)}
                        className="ml-1 -mr-1.5 text-red-500 hover:text-red-700 focus:outline-none"
                        aria-label={`Remove ${skill.name}`}
                      >
                        <i className="fas fa-times-circle text-xs"></i>
                      </button>
                    </span>
                  ))
                )}
              </div>
              <div className="mt-4">
                <label htmlFor="addSkillInput" className="block text-sm font-semibold text-gray-700 mb-1">Add New Skill</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    id="addSkillInput"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill(e);
                      }
                    }}
                    className="flex-grow px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g., Public Speaking"
                    maxLength={MAX_SKILL_LENGTH}
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
                  >
                    Add
                  </button>
                </div>
                {formErrors.skillInput && <p className="text-red-500 text-xs mt-1">{formErrors.skillInput}</p>}
              </div>
              {formErrors.skills && <p className="text-red-500 text-xs mt-1">{formErrors.skills}</p>}

              <SkillModal
                isOpen={isSkillModalOpen}
                onClose={closeSkillModal}
                onAdd={handleAddSkill}
                skillToEdit={editingSkill}
                onUpdate={handleUpdateSkill}
                MAX_SKILL_LENGTH={MAX_SKILL_LENGTH}
              />
            </section>

            {/* Save Button for Edit Mode */}
            <div className="sticky bottom-0 bg-gray-100 border-t border-gray-200 py-4 flex justify-end px-6 -mx-6 rounded-b-lg">
              <button
                type="submit"
                className="bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-full shadow-lg hover:bg-indigo-800 transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Resume Preview Modal */}
      <ResumePreviewModal
        isOpen={isResumePreviewOpen}
        onClose={closeResumePreview}
        resumeUrl={currentResumeUrl}
      />
    </div>
  );
}
