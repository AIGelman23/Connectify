// src/components/Navbar.jsx
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";
import Link from 'next/link';

export default function Navbar({ session, router }) {
	// --- Ensure FontAwesome CSS is loaded ---
	useEffect(() => {
		const id = "fontawesome-cdn";
		if (!document.getElementById(id)) {
			const link = document.createElement("link");
			link.id = id;
			link.rel = "stylesheet";
			link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css";
			link.crossOrigin = "anonymous";
			document.head.appendChild(link);
		}
	}, []);

	const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
	const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
	const [notifications, setNotifications] = useState([]); // Initialize as empty array
	const [currentPath, setCurrentPath] = useState('');
	const [unreadCount, setUnreadCount] = useState(0);
	const [notificationsOpen, setNotificationsOpen] = useState(false);

	// Add this line to define the missing ref
	const profileMenuRef = useRef(null);
	const notificationRef = useRef(null);

	// Track current path for active states
	useEffect(() => {
		// Use router.pathname if available, fallback to window.location.pathname
		let path = '/dashboard';
		if (router && typeof router.pathname === 'string') {
			path = router.pathname;
		} else if (typeof window !== "undefined" && window.location?.pathname) {
			path = window.location.pathname;
		}
		setCurrentPath(path);
	}, [router?.pathname]);

	const [searchText, setSearchText] = useState("");
	const [showSearchDropdown, setShowSearchDropdown] = useState(false);
	const [friendResults, setFriendResults] = useState([]);
	const searchDropdownRef = useRef(null);

	// Fetch friends as user types
	const { data: sessionData } = useSession();
	useEffect(() => {
		if (!searchText.trim() || !sessionData?.user?.id) {
			setFriendResults([]);
			return;
		}
		const fetchFriends = async () => {
			try {
				const res = await fetch(`/api/friends?userId=${sessionData.user.id}`);
				const data = await res.json();
				const filtered = (data.friends || []).filter(f =>
					(f.name || "").toLowerCase().includes(searchText.toLowerCase())
				);
				setFriendResults(filtered);
			} catch {
				setFriendResults([]);
			}
		};
		fetchFriends();
	}, [searchText, sessionData?.user?.id]);

	// Add safety check for notifications before calling filter
	const notificationCount = Array.isArray(notifications) ? notifications.filter(notif => notif && !notif.read).length : 0;

	// Dummy suggestions for the dropdown
	const dummySuggestions = ["Alice Johnson", "Bob Smith", "Charlie Brown", "Dave Lee"];

	useEffect(() => {
		function handleClickOutside(event) {
			if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
				setIsProfileMenuOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Close the dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(e) {
			if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target)) {
				setShowSearchDropdown(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Close notification dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event) {
			if (notificationRef.current && !notificationRef.current.contains(event.target)) {
				setNotificationsOpen(false);
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// Fetch notifications
	useEffect(() => {
		const fetchNotifications = async () => {
			if (session?.user?.id) {
				try {
					const res = await fetch('/api/notifications');
					if (!res.ok) throw new Error("Failed to fetch notifications");
					const data = await res.json();
					setNotifications(Array.isArray(data.notifications) ? data.notifications : []);

					// Calculate unread count
					const unreadNotifications = (data.notifications || []).filter(n => !n.read);
					setUnreadCount(unreadNotifications.length);
				} catch (error) {
					console.error("Error fetching notifications:", error);
					setNotifications([]);
				}
			} else {
				setNotifications([]);
			}
		};
		fetchNotifications();
		const intervalId = setInterval(fetchNotifications, 10000); // 10 seconds for faster feedback
		return () => clearInterval(intervalId);
	}, [session?.user?.id]);

	const handleSignOut = async () => {
		// Unsubscribe from Pusher Beams to stop receiving notifications
		try {
			const { Client } = await import("@pusher/push-notifications-web");
			const beamsClient = new Client({
				instanceId: process.env.NEXT_PUBLIC_PUSHER_BEAMS_INSTANCE_ID || "9ddc93ef-b40a-4905-adbe-ffad4efce457",
			});
			await beamsClient.stop();
		} catch (error) {
			console.error("Failed to stop Pusher Beams:", error);
		}

		await signOut({ callbackUrl: '/auth/login' });
	};

	// Handler to clear a notification by calling DELETE API
	const handleClearNotification = useCallback(async (notifId) => {
		if (!notifId) return;

		try {
			const res = await fetch(`/api/notifications?id=${notifId}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to clear notification');
			// Remove it from local state
			setNotifications((prev) => Array.isArray(prev) ? prev.filter(n => n && n.id !== notifId) : []);
		} catch (error) {
			console.error("Error clearing notification:", error);
		}
	}, []);

	// Handler to mark all notifications as read by calling PATCH API
	const handleMarkAllNotificationsRead = useCallback(async () => {
		try {
			const res = await fetch('/api/notifications', { method: 'PATCH' });
			if (!res.ok) throw new Error('Failed to mark all notifications as read');
			setNotifications((prev) => Array.isArray(prev) ? prev.map(n => ({ ...n, read: true })) : []);
			setUnreadCount(0);
		} catch (error) {
			console.error("Error marking notifications as read:", error);
		}
	}, []);

	const toggleNotificationMenu = useCallback(() => {
		setIsNotificationMenuOpen(prev => !prev);
		setIsProfileMenuOpen(false);
	}, []);

	// Fetch notifications function
	const fetchNotifications = useCallback(async () => {
		if (!session?.user?.id) return;

		try {
			const res = await fetch('/api/notifications');
			if (res.ok) {
				const data = await res.json();
				setNotifications(data.notifications || []);

				// Calculate unread count
				const unreadNotifications = (data.notifications || []).filter(n => !n.read);
				setUnreadCount(unreadNotifications.length);
			}
		} catch (error) {
			console.error("Error fetching notifications:", error);
		}
	}, [session?.user?.id]);

	// Load notifications when component mounts and periodically
	useEffect(() => {
		fetchNotifications();

		// Set up polling for new notifications
		const intervalId = setInterval(() => {
			fetchNotifications();
		}, 30000); // Check every 30 seconds

		return () => clearInterval(intervalId);
	}, [fetchNotifications]);

	// Mark notifications as read
	const markNotificationsAsRead = useCallback(async () => {
		if (unreadCount > 0) {
			try {
				const res = await fetch('/api/notifications', {
					method: 'PATCH',
				});

				if (res.ok) {
					setNotifications(prev => prev.map(n => ({ ...n, read: true })));
					setUnreadCount(0);
				}
			} catch (error) {
				console.error("Error marking notifications as read:", error);
			}
		}
	}, [unreadCount]);

	// Handle notification action (e.g., accepting friend request)
	const handleNotificationAction = useCallback(async (notification, action) => {
		if (notification.type === 'CONNECTION_REQUEST' && notification.targetId) {
			try {
				const res = await fetch('/api/connections', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						requestId: notification.targetId,
						action: action // 'accept' or 'reject'
					}),
				});

				if (res.ok) {
					// Clear the notification after handling
					const deleteRes = await fetch(`/api/notifications?id=${notification.id}`, {
						method: 'DELETE'
					});

					// Refresh notifications after taking action
					fetchNotifications();
				}
			} catch (error) {
				console.error(`Error ${action}ing connection request:`, error);
			}
		}
	}, [fetchNotifications]);

	// Format timestamp for notifications
	const formatTimestamp = (dateString) => {
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
		return date.toLocaleDateString();
	};

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event) {
			if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
				setIsProfileMenuOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Close the dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(e) {
			if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target)) {
				setShowSearchDropdown(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Close notification dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event) {
			if (notificationRef.current && !notificationRef.current.contains(event.target)) {
				setNotificationsOpen(false);
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	return (
		<>
			<nav className="navbar-root shadow-sm border-b sticky top-0 z-40">
				<div className="navbar-container max-w-7xl mx-auto px-8 sm:px-10 lg:px-12">
					<div className="navbar-row flex items-center justify-between h-16">
						<div className="navbar-left flex items-center space-x-3 flex-1">
							<button
								onClick={() => router.push("/dashboard")}
								className="navbar-logo flex items-center transition duration-150 ease-in-out"
							>
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="navbar-logo-circle w-8 h-8 mr-2">
									<rect width="16" height="16" fill="#2563eb" rx="8" />
									<text x="50%" y="50%" fontSize="9" fill="white" textAnchor="middle" dominantBaseline="central">C</text>
								</svg>
								<span className="navbar-logo-title text-xl font-bold hidden sm:block">ConnectifAI</span>
							</button>
							<div className="navbar-search hidden md:block w-[200px] mx-2">
								<div className="relative" ref={searchDropdownRef}>
									<div className="navbar-search-icon absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<i className="fas fa-search"></i>
									</div>
									<input
										type="text"
										placeholder="Search friends..."
										value={searchText}
										onChange={(e) => {
											setSearchText(e.target.value);
											setShowSearchDropdown(true);
										}}
										onFocus={() => setShowSearchDropdown(true)}
										className="navbar-search-input block w-full pl-10 pr-3 py-2 rounded-full text-sm"
									/>
									{showSearchDropdown && searchText && (
										<ul className="navbar-search-dropdown absolute z-10 mt-1 w-full rounded-md shadow-lg bg-white border border-gray-200 max-h-64 overflow-y-auto">
											{friendResults.length > 0 ? (
												friendResults.map(friend => (
													<li
														key={friend.id}
														onMouseDown={() => {
															setSearchText("");
															setShowSearchDropdown(false);
															router.push(`/profile/${friend.id}`);
														}}
														className="cursor-pointer px-3 py-2 flex items-center hover:bg-blue-50"
													>
														<img
															src={
																friend.profile?.profilePictureUrl ||
																friend.imageUrl ||
																`https://placehold.co/32x32/1877F2/ffffff?text=${friend.name ? friend.name[0].toUpperCase() : 'U'}`
															}
															alt={friend.name}
															className="w-7 h-7 rounded-full object-cover mr-2"
														/>
														<span className="font-medium">{friend.name}</span>
													</li>
												))
											) : (
												<li className="cursor-pointer px-3 py-2 text-gray-500">No friends found</li>
											)}
										</ul>
									)}
								</div>
							</div>
						</div>
						<div className="hidden md:flex items-center space-x-4 flex-1 justify-center pl-8">
							<NavLink iconClass="fas fa-home" text="Home" href="/dashboard" router={router} isActive={currentPath === '/dashboard'} />
							<NavLink iconClass="fas fa-users" text="Network" href="/network" router={router} isActive={currentPath === '/network'} />
							<NavLink iconClass="fas fa-briefcase" text="Jobs" href="/jobs" router={router} isActive={currentPath === '/jobs'} />
							<NavLink iconClass="fas fa-comment-dots" text="Messages" href="/messages" router={router} isActive={currentPath === '/messages'} />
							<NavLink
								iconClass="fas fa-bell"
								text="Notifications"
								onClick={toggleNotificationMenu}
								isMenuTrigger={true}
								router={router}
								notificationCount={notificationCount}
								isNotificationMenuOpen={isNotificationMenuOpen}
								notifications={notifications}
								onMarkAllRead={handleMarkAllNotificationsRead}
								onClearNotification={handleClearNotification}
								onNotificationMenuClose={() => setIsNotificationMenuOpen(false)}
								isActive={isNotificationMenuOpen}
							/>
						</div>

						{/* Right Section - Profile Menu */}
						<div className="flex items-center justify-end flex-1">
							<div className="relative" ref={profileMenuRef}>
								<button
									onClick={() => {
										setIsProfileMenuOpen(!isProfileMenuOpen);
										setIsNotificationMenuOpen(false);
									}}
									className="flex items-center space-x-2 p-1 rounded-full transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									<img
										src={
											session?.user?.image ||
											`https://placehold.co/40x40/1877F2/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'
											}`
										}
										alt="Profile"
										className="w-10 h-10 rounded-full object-cover border border-gray-200"
										onError={(e) => {
											e.target.onerror = null;
											e.target.src = `https://placehold.co/40x40/1877F2/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'
												}`;
										}}
									/>
									<span className="hidden lg:block font-medium text-sm">
										{session?.user?.name?.split(' ')[0] || 'User'}
									</span>
									<svg className="w-4 h-4 text-gray-500 hidden lg:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"></path>
									</svg>
								</button>

								{isProfileMenuOpen && (
									<div className="profile-dropdown absolute right-0 mt-2 w-64 z-20 animate-fade-in-down">
										<div className="profile-dropdown-header p-4 border-b">
											<div className="profile-dropdown-user flex items-center space-x-3">
												<img
													src={
														session?.user?.image ||
														`https://placehold.co/48x48/1877F2/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'}`
													}
													alt="Profile"
													className="profile-dropdown-avatar w-12 h-12 rounded-full object-cover"
												/>
												<div>
													<p className="profile-dropdown-name font-bold">{session?.user?.name || 'User'}</p>
													<p className="profile-dropdown-email text-sm truncate">{session?.user?.email}</p>
												</div>
											</div>
										</div>
										<div className="profile-dropdown-actions py-2">
											<button
												onClick={() => {
													router.push("/profile");
													setIsProfileMenuOpen(false);
												}}
												className="profile-dropdown-btn flex items-center space-x-3 w-full px-4 py-3 text-sm"
											>
												<i className="fas fa-user profile-dropdown-btn-icon w-4"></i>
												<span>View Profile</span>
											</button>
											{session?.user?.role === 'ADMIN' && (
												<button
													onClick={() => {
														router.push("/admin");
														setIsProfileMenuOpen(false);
													}}
													className="profile-dropdown-btn flex items-center space-x-3 w-full px-4 py-3 text-sm"
												>
													<i className="fas fa-shield-alt profile-dropdown-btn-icon w-4"></i>
													<span>Admin Dashboard</span>
												</button>
											)}
											<button
												onClick={() => {
													router.push("/settings");
													setIsProfileMenuOpen(false);
												}}
												className="profile-dropdown-btn flex items-center space-x-3 w-full px-4 py-3 text-sm"
											>
												<i className="fas fa-cog profile-dropdown-btn-icon w-4"></i>
												<span>Settings</span>
											</button>
											<button
												onClick={handleSignOut}
												className="profile-dropdown-btn profile-dropdown-signout flex items-center space-x-3 w-full px-4 py-3 text-sm border-t mt-2 pt-3"
											>
												<i className="fas fa-sign-out-alt w-4"></i>
												<span>Sign Out</span>
											</button>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>

			</nav>

			{/* Mobile Bottom Navigation */}
			<MobileBottomNav
				router={router}
				currentPath={currentPath}
				notificationCount={notificationCount}
			/>

			{/* Add required CSS for animations */}
			<style jsx>{`
				@keyframes fade-in-down {
					0% {
						opacity: 0;
						transform: translateY(-5px);
					}
					100% {
						opacity: 1;
						transform: translateY(0);
					}
				}
				.animate-fade-in-down {
					animation: fade-in-down 0.3s ease-out;
				}
			`}</style>
		</>
	);
}


// --- NotificationMenu Component ---
function NotificationMenu({ notifications, onMarkAllRead, onClearNotification, onClose, router }) {
	const menuRef = useRef(null);

	useEffect(() => {
		function handleClickOutside(e) {
			if (menuRef.current && !menuRef.current.contains(e.target)) {
				onClose();
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [onClose]);

	// Group notifications by date
	const groupedNotifications = useMemo(() => {
		if (!Array.isArray(notifications)) return {};

		return notifications.reduce((groups, notif) => {
			if (!notif) return groups;

			const date = new Date(notif.createdAt || Date.now());
			const today = new Date();
			const yesterday = new Date(today);
			yesterday.setDate(yesterday.getDate() - 1);

			let groupKey = 'older';
			if (date.toDateString() === today.toDateString()) {
				groupKey = 'today';
			} else if (date.toDateString() === yesterday.toDateString()) {
				groupKey = 'yesterday';
			} else if (today.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
				groupKey = 'thisWeek';
			}

			if (!groups[groupKey]) {
				groups[groupKey] = [];
			}

			groups[groupKey].push(notif);
			return groups;
		}, {});
	}, [notifications]);

	const formatTimeAgo = (dateString) => {
		const date = new Date(dateString || Date.now());
		const now = new Date();
		const diffSeconds = Math.floor((now - date) / 1000);

		if (diffSeconds < 60) return 'just now';
		if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
		if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;

		return date.toLocaleString("en-US", {
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "numeric",
		});
	};

	return (
		<div ref={menuRef} className="notifications-dropdown-container absolute top-full right-0 mt-2 w-80 rounded-lg shadow-lg z-30 animate-fade-in-down">
			{/* Header */}
			<div className="flex justify-between items-center px-4 py-3">
				<h4 className="font-bold text-lg">Notifications</h4>
				<button
					onClick={onMarkAllRead}
					className="text-blue-600 hover:underline text-sm font-medium"
				>
					Mark all as read
				</button>
			</div>
			{/* List */}
			<div className="max-h-80 overflow-y-auto">
				{notifications.length === 0 ? (
					<p className="text-sm p-6 text-center">
						No new notifications.
					</p>
				) : (
					<>
						{groupedNotifications.today && groupedNotifications.today.length > 0 && (
							<div className="border-b border-gray-100">
								<div className="px-4 py-2 bg-gray-50">
									<span className="text-xs font-medium text-gray-500">TODAY</span>
								</div>
								{groupedNotifications.today.map((notif) => (
									<NotificationItem
										key={notif.id}
										notification={notif}
										onClearNotification={onClearNotification}
										formatTimeAgo={formatTimeAgo}
										router={router}
										onClose={onClose}
									/>
								))}
							</div>
						)}

						{groupedNotifications.yesterday && groupedNotifications.yesterday.length > 0 && (
							<div className="border-b border-gray-100">
								<div className="px-4 py-2 bg-gray-50">
									<span className="text-xs font-medium text-gray-500">YESTERDAY</span>
								</div>
								{groupedNotifications.yesterday.map((notif) => (
									<NotificationItem
										key={notif.id}
										notification={notif}
										onClearNotification={onClearNotification}
										formatTimeAgo={formatTimeAgo}
										router={router}
										onClose={onClose}
									/>
								))}
							</div>
						)}

						{groupedNotifications.thisWeek && groupedNotifications.thisWeek.length > 0 && (
							<div className="border-b border-gray-100">
								<div className="px-4 py-2 bg-gray-50">
									<span className="text-xs font-medium text-gray-500">THIS WEEK</span>
								</div>
								{groupedNotifications.thisWeek.map((notif) => (
									<NotificationItem
										key={notif.id}
										notification={notif}
										onClearNotification={onClearNotification}
										formatTimeAgo={formatTimeAgo}
										router={router}
										onClose={onClose}
									/>
								))}
							</div>
						)}

						{groupedNotifications.older && groupedNotifications.older.length > 0 && (
							<div>
								<div className="px-4 py-2 bg-gray-50">
									<span className="text-xs font-medium text-gray-500">OLDER</span>
								</div>
								{groupedNotifications.older.map((notif) => (
									<NotificationItem
										key={notif.id}
										notification={notif}
										onClearNotification={onClearNotification}
										formatTimeAgo={formatTimeAgo}
										router={router}
										onClose={onClose}
									/>
								))}
							</div>
						)}
					</>
				)}
			</div>
			{/* Footer */}
			<div className="p-3 text-center">
				<button
					onClick={() => {
						onClose();
						router.push('/notifications');
					}}
					className="text-blue-600 hover:underline text-sm font-medium"
				>
					View all notifications
				</button>
			</div>
		</div>
	);
}

// --- NotificationItem Component ---
function NotificationItem({ notification, onClearNotification, formatTimeAgo, router, onClose }) {
	if (!notification) return null;

	// Handle click to navigate to the relevant content
	const handleNotificationClick = () => {
		// Don't navigate for connection requests (they have action buttons)
		if (notification.type === "CONNECTION_REQUEST") return;

		// Navigate based on notification type
		if (notification.targetId) {
			// For post-related notifications (POST_COMMENT, POST_TAG, POST_LIKE, etc.)
			// Navigate to dashboard with a query param to highlight/scroll to the post
			if (notification.type === "POST_COMMENT" || notification.type === "POST_TAG" || notification.type === "POST_LIKE") {
				onClose();
				router.push(`/dashboard?postId=${notification.targetId}`);
			}
		} else if (notification.senderId) {
			// For notifications without targetId but with senderId, navigate to sender's profile
			onClose();
			router.push(`/profile/${notification.senderId}`);
		}
	};

	const isClickable = notification.type !== "CONNECTION_REQUEST" && (notification.targetId || notification.senderId);

	return (
		<div
			className={`flex flex-col px-4 py-3 hover:bg-gray-50 ${notification.read ? '' : 'bg-blue-50'} ${isClickable ? 'cursor-pointer' : ''}`}
			onClick={isClickable ? handleNotificationClick : undefined}
		>
			<div className="flex justify-between items-start">
				<div className="flex-1">
					<p className={`text-sm ${notification.read ? "text-gray-600" : "text-gray-800 font-semibold"}`}>
						{notification.message}
					</p>
					<span className="text-xs text-gray-500">
						{formatTimeAgo(notification.createdAt)}
					</span>

					{/* Connection request actions */}
					{notification.type === "CONNECTION_REQUEST" && notification.targetId && (
						<ConnectionRequestActions
							notificationId={notification.id}
							targetId={notification.targetId}
							onClearNotification={onClearNotification}
						/>
					)}
				</div>
				<button
					onClick={(e) => {
						e.stopPropagation();
						onClearNotification(notification.id);
					}}
					className="text-gray-400 hover:text-red-600 ml-3"
					title="Clear notification"
				>
					<i className="fas fa-times"></i>
				</button>
			</div>
		</div>
	);
}

// --- Handle Connection Request Component ---
// Add this new component for handling connection requests
function ConnectionRequestActions({ notificationId, targetId, onClearNotification }) {
	const [isProcessing, setIsProcessing] = useState(false);

	const handleConnectionAction = async (action) => {
		if (isProcessing) return;

		try {
			setIsProcessing(true);
			const res = await fetch('/api/connections', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					requestId: targetId,
					action
				}),
			});

			if (res.ok) {
				// Clear the notification after successful action
				onClearNotification(notificationId);
			} else {
				console.error("Failed to process connection request");
			}
		} catch (error) {
			console.error(`Error handling ${action} action:`, error);
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<div className="flex gap-2 mt-2">
			<button
				className={`px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
				onClick={() => handleConnectionAction('accept')}
				disabled={isProcessing}
			>
				{isProcessing ? 'Processing...' : 'Accept'}
			</button>
			<button
				className={`px-3 py-1 rounded hover:bg-gray-400 text-xs ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
				onClick={() => handleConnectionAction('reject')}
				disabled={isProcessing}
			>
				{isProcessing ? 'Processing...' : 'Ignore'}
			</button>
		</div>
	);
}

// --- NavLink Component ---
function NavLink({ iconClass, text, href, router, children, onClick, isMenuTrigger, notificationCount, isNotificationMenuOpen, notifications, onMarkAllRead, onNotificationMenuClose, isActive, onClearNotification }) {
	const baseClasses = `navbar-navlink transition-all duration-200`;
	const activeClasses = isActive ? 'navbar-navlink-active' : '';

	if (isMenuTrigger) {
		return (
			<div className="relative">
				<div
					onClick={onClick}
					className={`${baseClasses} ${activeClasses} cursor-pointer`}
					tabIndex={0}
					role="button"
					aria-expanded={isNotificationMenuOpen ? "true" : "false"}
				>
					<div className="relative md:flex items-center space-x-4 flex-1 justify-center">
						<i className={`${iconClass} text-xl`}></i>
						{notificationCount > 0 && (
							<span className="absolute -top-2 -right-2 inline-flex items-center justify-center h-5 w-5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
								{notificationCount > 9 ? '9+' : notificationCount}
							</span>
						)}
					</div>
					<span className="text-xs mt-1 hidden sm:block">{text}</span>
				</div>
				{isNotificationMenuOpen && (
					<NotificationMenu
						notifications={notifications}
						onMarkAllRead={onMarkAllRead}
						onClearNotification={onClearNotification}
						onClose={onNotificationMenuClose}
						router={router}
					/>
				)}
			</div>
		);
	} else {
		return (
			<button
				onClick={onClick || (() => router.push(href))}
				className={`${baseClasses} ${activeClasses}`}
			>
				<i className={`${iconClass} text-xl`}></i>
				<span className="text-xs mt-1 hidden sm:block">{text}</span>
				{children}
			</button>
		);
	}
}

// --- Mobile Bottom Navigation Component ---
function MobileBottomNav({ router, currentPath, notificationCount }) {
	const navItems = [
		{ icon: 'fas fa-home', href: '/dashboard', label: 'Home' },
		{ icon: 'fas fa-users', href: '/network', label: 'Network' },
		{ icon: 'fas fa-briefcase', href: '/jobs', label: 'Jobs' },
		{ icon: 'fas fa-comment-dots', href: '/messages', label: 'Messages' },
		{ icon: 'fas fa-bell', href: '/notifications', label: 'Notifications', badge: notificationCount },
	];

	return (
		<nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 md:hidden shadow-lg safe-area-bottom">
			<div className="flex items-center justify-around h-14">
				{navItems.map((item) => {
					const isActive = currentPath === item.href ||
						(item.href === '/dashboard' && currentPath === '/');

					return (
						<button
							key={item.href}
							onClick={() => router.push(item.href)}
							className={`mobile-nav-item flex flex-col items-center justify-center flex-1 h-full relative transition-colors ${isActive ? 'active' : ''}`}
							aria-label={item.label}
						>
							<div className="relative">
								<i className={`${item.icon} text-xl`}></i>
								{item.badge > 0 && (
									<span className="absolute -top-2 -right-2 inline-flex items-center justify-center h-4 w-4 text-[10px] font-bold leading-none text-white bg-red-500 rounded-full">
										{item.badge > 9 ? '9+' : item.badge}
									</span>
								)}
							</div>
							{isActive && (
								<div className="active-indicator absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 rounded-full"></div>
							)}
						</button>
					);
				})}
			</div>

			{/* Safe area padding for devices with home indicator */}
			<style jsx>{`
				.safe-area-bottom {
					padding-bottom: env(safe-area-inset-bottom, 0px);
				}

				/* Mobile Nav Styles */
				.mobile-bottom-nav {
					background-color: #ffffff;
					border-top: 1px solid #e5e7eb; /* gray-200 */
				}
				:global(.dark) .mobile-bottom-nav {
					background-color: #1e293b; /* slate-800 */
					border-top-color: #334155; /* slate-700 */
				}
				.mobile-nav-item {
					color: #6b7280; /* gray-500 */
				}
				:global(.dark) .mobile-nav-item {
					color: #94a3b8; /* gray-400 */
				}
				.mobile-nav-item:hover {
					color: #0f172a; /* slate-900 */
				}
				:global(.dark) .mobile-nav-item:hover {
					color: #f8fafc; /* slate-50 */
				}
				.mobile-nav-item.active {
					color: #2563eb; /* blue-600 */
				}
				:global(.dark) .mobile-nav-item.active {
					color: #60a5fa; /* blue-400 */
				}
				.active-indicator {
					background-color: #2563eb; /* blue-600 */
				}
				:global(.dark) .active-indicator {
					background-color: #60a5fa; /* blue-400 */
				}
			`}</style>
		</nav>
	);
}
