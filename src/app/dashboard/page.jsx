// src/app/dashboard/page.jsx
"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useCallback, useRef } from "react";
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

// NEW: Comment and Reply Components (Moved outside HomePage for clarity)
const Comment = ({ comment, onReply, sessionUserId }) => {
  const isAuthor = comment.user.id === sessionUserId;
  const isReplyAuthor = reply => reply.user.id === sessionUserId;

  return (
    <div className="flex items-start space-x-3 mb-4">
      <img
        src={comment.user.imageUrl || `https://placehold.co/32x32/A78BFA/ffffff?text=${comment.user.name ? comment.user.name[0].toUpperCase() : 'U'}`}
        alt={`${comment.user.name}'s avatar`}
        className="w-8 h-8 rounded-full object-cover border border-gray-200 flex-shrink-0"
      />
      <div className="flex-1">
        <div className="bg-gray-100 rounded-xl px-4 py-2">
          <div className="flex items-baseline space-x-2">
            <span className="font-semibold text-gray-800 text-sm">{comment.user.name}</span>
            <span className="text-xs text-gray-500">{comment.timestamp}</span>
            {isAuthor && <span className="text-xs text-indigo-600 font-medium ml-auto">Author</span>}
          </div>
          <p className="text-gray-700 text-sm mt-1">{comment.text}</p>
        </div>
        <div className="flex items-center space-x-3 mt-1 pl-2">
          <button
            onClick={() => onReply(comment.id)}
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            Reply
          </button>
          {/* Add more actions like Like/Edit/Delete for comments if needed */}
        </div>

        {/* Replies Section */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="ml-8 mt-3 space-y-3 border-l-2 border-gray-200 pl-4">
            {comment.replies.map(reply => (
              <div key={reply.id} className="flex items-start space-x-3">
                <img
                  src={reply.user.imageUrl || `https://placehold.co/24x24/A78BFA/ffffff?text=${reply.user.name ? reply.user.name[0].toUpperCase() : 'U'}`}
                  alt={`${reply.user.name}'s avatar`}
                  className="w-6 h-6 rounded-full object-cover border border-gray-200 flex-shrink-0"
                />
                <div className="flex-1">
                  <div className="bg-gray-50 rounded-xl px-3 py-1.5">
                    <div className="flex items-baseline space-x-2">
                      <span className="font-semibold text-gray-800 text-xs">{reply.user.name}</span>
                      <span className="text-xs text-gray-500">{reply.timestamp}</span>
                      {isReplyAuthor(reply) && <span className="text-xs text-indigo-500 font-medium ml-auto">Author</span>}
                    </div>
                    <p className="text-gray-700 text-sm mt-0.5">{reply.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState(null); // Keep profile state to check if exists
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [posts, setPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState(null); // For errors related to posting

  // NEW: Commenting and Reply states
  const [activePostForComment, setActivePostForComment] = useState(null); // Which post is open for commenting
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [activePostForReply, setActivePostForReply] = useState(null);
  const [activeCommentForReply, setActiveCommentForReply] = useState(null);
  const [replyText, setReplyText] = useState("");


  // Helper to format timestamps (e.g., "5 hours ago", "Yesterday")
  const formatTimestamp = (dateString) => {
    const postDate = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.round((now - postDate) / 1000);
    const diffMinutes = Math.round(diffSeconds / 60);
    const diffHours = Math.round(diffMinutes / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return postDate.toLocaleDateString(); // Fallback for older posts
  };


  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/posts");
      if (!res.ok) {
        throw new Error(`Failed to fetch posts: ${res.statusText}`);
      }
      const data = await res.json();
      // Ensure posts have a 'comments' array and each comment has 'replies'
      const formattedPosts = data.posts.map(post => ({
        ...post,
        user: { // Ensure 'user' object structure matches expectation
          name: post.author.name,
          headline: post.author.profile?.headline || 'No headline', // Access profile headline if available
          imageUrl: post.author.imageUrl || `https://placehold.co/40x40/A78BFA/ffffff?text=${post.author.name ? post.author.name[0].toUpperCase() : 'U'}`,
          id: post.author.id, // Ensure user ID is available for checking comment/reply authorship
        },
        timestamp: formatTimestamp(post.createdAt), // Format timestamp here
        comments: (post.comments || []).map(comment => ({
          ...comment,
          user: { // Ensure comment user object structure
            name: comment.author.name,
            imageUrl: comment.author.imageUrl || `https://placehold.co/32x32/A78BFA/ffffff?text=${comment.author.name ? comment.author.name[0].toUpperCase() : 'U'}`,
            id: comment.author.id, // Ensure user ID is available
          },
          timestamp: formatTimestamp(comment.createdAt),
          replies: (comment.replies || []).map(reply => ({
            ...reply,
            user: { // Ensure reply user object structure
              name: reply.author.name,
              imageUrl: reply.author.imageUrl || `https://placehold.co/24x24/A78BFA/ffffff?text=${reply.author.name ? reply.author.name[0].toUpperCase() : 'U'}`,
              id: reply.author.id, // Ensure user ID is available
            },
            timestamp: formatTimestamp(reply.createdAt),
          }))
        }))
      }));
      setPosts(formattedPosts);
    } catch (err) {
      console.error("Failed to load posts:", err);
      // Set an error message if posts fail to load
      setPostError("Failed to load posts. Please try again.");
    }
  }, []);

  // 1. Fetch user profile on mount to check if it exists
  // 2. Fetch posts for the feed
  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    if (status === "authenticated") {
      const fetchInitialData = async () => {
        try {
          setLoadingInitialData(true);

          // Fetch user profile
          const profileRes = await fetch("/api/profile");
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            setProfile(profileData.profile);
            // Redirect to profile view if profile is not complete
            if (!profileData.profile || !profileData.profile.isProfileComplete) {
              router.push('/profile');
              return;
            }
          } else {
            // If no profile found or fetch fails, assume it needs to be created
            console.warn("No profile found for this user or failed to fetch, prompting to create.");
            setProfile(null);
            router.push('/profile');
            return;
          }

          // Fetch posts only if profile is complete
          await fetchPosts();

        } catch (err) {
          console.error("Failed to load initial data:", err);
          setPostError("Failed to load initial data. Please try again.");
        } finally {
          setLoadingInitialData(false);
        }
      };
      fetchInitialData();
    }
  }, [status, router, fetchPosts]);

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    setPostError(null); // Clear any previous post errors

    if (!newPostContent.trim()) {
      setPostError("Post content cannot be empty.");
      return;
    }

    if (!session?.user?.id) {
      setPostError("You must be logged in to create a post.");
      return;
    }

    setIsPosting(true);

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newPostContent }),
      });

      if (res.ok) {
        // Post created successfully, re-fetch posts to update the feed
        await fetchPosts();
        setNewPostContent(""); // Clear input
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create post.");
      }
    } catch (err) {
      console.error("Error submitting post:", err);
      setPostError(err.message || "Failed to post. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostTypeAction = (type) => {
    // Placeholder actions for different post types
    console.log(`You clicked to post a ${type}. (Functionality not implemented yet)`);
    // In a real application, this would open a modal for photo upload, video upload, or an article editor.
  };

  const handleLike = useCallback(async (postId) => {
    if (!session?.user?.id) {
      setPostError("You must be logged in to like a post.");
      return;
    }

    // Optimistically update the likes count
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId ? { ...post, likesCount: (post.likesCount || 0) + 1 } : post
      )
    );

    try {
      const res = await fetch('/api/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action: 'like' }),
      });

      if (!res.ok) {
        let errorReason = `Failed to like post: ${res.statusText || 'Unknown server response'}.`;
        try {
          const errorData = await res.json();
          errorReason = errorData.message || errorReason;
        } catch (jsonError) {
          // If JSON parsing fails, read as text to get raw error message
          const textError = await res.text();
          console.error("Failed to parse JSON error response for like:", jsonError, "Raw response:", textError);
          errorReason = `Failed to like post: ${res.statusText || 'Unknown server response'}. Raw: ${textError.substring(0, 100)}`;
        }
        throw new Error(errorReason);
      }
      // Re-fetch posts to ensure data consistency, especially if other users are liking
      await fetchPosts();
    } catch (err) {
      console.error("Error liking post:", err);
      setPostError(err.message || "Failed to like post. Please try again.");
      // Revert optimistic update on error if needed (more complex to implement correctly)
      await fetchPosts(); // Revert by re-fetching
    }
  }, [session?.user?.id, fetchPosts]);

  // NEW: Open comment input for a specific post
  const toggleCommentSection = (postId) => {
    setActivePostForComment(prevId => (prevId === postId ? null : postId));
    setCommentText(""); // Clear comment text when toggling
  };

  // NEW: Handle submitting a new comment on a post
  const handleAddComment = useCallback(async (postId) => {
    if (!session?.user?.id) {
      setPostError("You must be logged in to comment on a post.");
      return;
    }

    if (!commentText.trim()) {
      return; // Do nothing if comment is empty
    }

    setIsCommenting(true);
    setPostError(null);

    try {
      const res = await fetch('/api/comments', { // Assuming an API endpoint for comments
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, content: commentText }),
      });

      if (res.ok) {
        setCommentText(""); // Clear comment input
        setActivePostForComment(null); // Close comment input after successful post
        await fetchPosts(); // Re-fetch posts to display new comment
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to add comment.");
      }
    } catch (err) {
      console.error("Error adding comment:", err);
      setPostError(err.message || "Failed to add comment. Please try again.");
    } finally {
      setIsCommenting(false);
    }
  }, [session?.user?.id, commentText, fetchPosts]);

  // NEW: Open reply modal for a given post and comment
  const openReplyModal = (postId, commentId) => {
    setActivePostForReply(postId);
    setActiveCommentForReply(commentId);
    setReplyText("");
    setReplyModalVisible(true);
  };

  // NEW: Close reply modal and reset state
  const closeReplyModal = () => {
    setReplyModalVisible(false);
    setActivePostForReply(null);
    setActiveCommentForReply(null);
    setReplyText("");
  };

  // NEW: Submit reply and update posts state
  const handleReplySubmit = async () => {
    if (!replyText.trim() || !activePostForReply || !activeCommentForReply) return;

    if (!session?.user?.id) {
      setPostError("You must be logged in to reply to a comment.");
      return;
    }
    setPostError(null);

    try {
      const res = await fetch('/api/comments/reply', { // Assuming an API endpoint for replies
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: activePostForReply,
          commentId: activeCommentForReply,
          content: replyText,
        }),
      });

      if (res.ok) {
        closeReplyModal();
        await fetchPosts(); // Re-fetch posts to display new reply
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to add reply.");
      }
    } catch (err) {
      console.error("Error adding reply:", err);
      setPostError(err.message || "Failed to add reply. Please try again.");
    }
  };

  // Display loading state for session or initial data fetch
  if (status === "loading" || loadingInitialData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="flex items-center space-x-2 text-indigo-600">
          <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading your home feed...
        </div>
      </div>
    );
  }

  // If authenticated but profile is missing OR incomplete, prompt to create/complete one
  if (status === "authenticated" && (!profile || profile.isProfileComplete === false)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-10 max-w-md w-full text-center border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {profile ? "Complete Your Profile!" : "Profile Missing"}
          </h2>
          <p className="text-gray-600 mb-6">
            {profile
              ? "Please complete your professional profile to unlock the full Connectify experience."
              : "It looks like you haven't set up your professional profile yet. Please create one to get started."}
          </p>
          <button
            onClick={() => router.push("/edit-profile")}
            className="w-full sm:w-auto flex-shrink-0 flex justify-center py-2.5 px-6 border border-transparent rounded-lg shadow-sm text-base font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-300 ease-in-out"
          >
            {profile ? "Complete Profile" : "Create Profile"}
          </button>
        </div>
      </div>
    );
  }

  // Main Dashboard Content
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar session={session} router={router} />

      <main className="max-w-3xl mx-auto py-8 px-4">
        {/* Post Creation Section */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Create Post</h3>
          <div className="flex items-center space-x-3 mb-4">
            <img
              src={session?.user?.image || `https://placehold.co/40x40/A78BFA/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'}`}
              alt="Your avatar"
              className="w-10 h-10 rounded-full object-cover border border-gray-200"
            />
            <textarea
              className="flex-1 w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 placeholder-gray-500 resize-y min-h-[60px]"
              placeholder="What's on your mind?"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              rows="3"
            ></textarea>
          </div>
          {postError && <p className="text-red-600 text-sm mb-3">{postError}</p>}
          <div className="flex justify-end space-x-3 border-t border-gray-100 pt-3">
            {/* Placeholder for other post types like Photo, Video, Event */}
            <button
              type="button"
              className="flex items-center space-x-2 text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-full transition duration-150"
              onClick={() => handlePostTypeAction("photo")}
            >
              <i className="fas fa-image"></i> <span>Photo</span>
            </button>
            <button
              type="button"
              className="flex items-center space-x-2 text-green-600 hover:bg-green-50 px-4 py-2 rounded-full transition duration-150"
              onClick={() => handlePostTypeAction("video")}
            >
              <i className="fas fa-video"></i> <span>Video</span>
            </button>
            <button
              onClick={handlePostSubmit}
              disabled={isPosting}
              className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPosting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>

        {/* Posts Feed */}
        <div className="space-y-6">
          {posts.length > 0 ? (
            posts.map((post) => (
              <div key={post.id} className="bg-white rounded-lg shadow-md p-4 mb-6 border border-gray-200">
                {/* Post Header */}
                <div className="flex items-center mb-3">
                  <img
                    src={post.user.imageUrl}
                    alt={`${post.user.name}'s avatar`}
                    className="w-10 h-10 rounded-full object-cover border border-gray-200"
                  />
                  <div className="ml-3">
                    <p className="font-semibold text-gray-800">{post.user.name}</p>
                    <p className="text-sm text-gray-500">{post.user.headline}</p>
                    <p className="text-xs text-gray-400">{post.timestamp}</p>
                  </div>
                </div>

                {/* Post Content */}
                <div className="mb-4">
                  <p className="text-gray-700">{post.content}</p>
                  {/* Future: Add image/video rendering here */}
                </div>

                {/* Post Stats */}
                <div className="flex justify-between items-center text-sm text-gray-500 mb-3 border-b border-gray-100 pb-2">
                  <span>{post.likesCount || 0} Likes</span>
                  <span>{post.commentsCount || 0} Comments</span>
                </div>

                {/* Post Actions (Like, Comment, Share) */}
                <div className="flex justify-around items-center border-b border-gray-100 pb-2 mb-4">
                  <button
                    onClick={() => handleLike(post.id)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-indigo-600 transition duration-150 ease-in-out"
                  >
                    <i className="far fa-thumbs-up"></i>
                    <span>Like</span>
                  </button>
                  <button
                    onClick={() => toggleCommentSection(post.id)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-indigo-600 transition duration-150 ease-in-out"
                  >
                    <i className="far fa-comment"></i>
                    <span>Comment</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-indigo-600 transition duration-150 ease-in-out"
                    onClick={() => console.log("Share functionality not implemented.")}
                  >
                    <i className="far fa-share-square"></i>
                    <span>Share</span>
                  </button>
                </div>

                {/* Comment Input and Comments List */}
                {activePostForComment === post.id && (
                  <div className="mt-4">
                    {/* Current User's Comment Input */}
                    <div className="flex items-center space-x-3 mb-4">
                      <img
                        src={session?.user?.image || `https://placehold.co/32x32/A78BFA/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'}`}
                        alt="Your avatar"
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-200"
                      />
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') handleAddComment(post.id);
                          }}
                          className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-full bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-600 hover:text-indigo-800 transition duration-150 ease-in-out p-1 rounded-full"
                          aria-label="Post comment"
                        >
                          <i className="fas fa-paper-plane"></i>
                        </button>
                      </div>
                    </div>

                    {/* List of Comments */}
                    {post.comments && post.comments.length > 0 ? (
                      post.comments.map(comment => (
                        <Comment
                          key={comment.id}
                          comment={comment}
                          onReply={(commentId) => openReplyModal(post.id, commentId)}
                          sessionUserId={session?.user?.id}
                        />
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm text-center">No comments yet. Be the first to comment!</p>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-10">No posts yet. Start by creating one!</p>
          )}
        </div>
      </main>

      {/* Reply Modal */}
      {replyModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Reply to Comment</h3>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Write your reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows="3"
            ></textarea>
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeReplyModal}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleReplySubmit}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Reply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}