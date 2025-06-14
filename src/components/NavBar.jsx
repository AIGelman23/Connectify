// src/components/Navbar.jsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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
					notifications.map((notif) => (
						<div
							key={notif.id}
							className="flex flex-col px-4 py-3 cursor-pointer"
						>
							<div className="flex justify-between items-center">
								<div>
									<p className={`text-sm ${notif.read ? "text-gray-600" : "text-gray-800 font-semibold"}`}>
										{notif.type === "CONNECTION_REQUEST"
											? <>
												{notif.user?.name || "Someone"} sent you a connection request.
											</>
											: notif.message}
									</p>
									<span className="text-xs">
										{notif.createdAt
											? new Date(notif.createdAt).toLocaleString("en-US", {
												month: "short",
												day: "numeric",
												hour: "numeric",
												minute: "numeric",
											})
											: ""}
									</span>
								</div>
								<button
									onClick={(e) => {
										e.stopPropagation();
										onClearNotification(notif.id);
									}}
									className="hover:text-red-600 ml-3"
									title="Clear notification"
								>
									<i className="fas fa-times"></i>
								</button>
							</div>
							{/* --- Accept/Ignore buttons for connection requests --- */}
							{notif.type === "CONNECTION_REQUEST" && (
								<div className="flex gap-2 mt-2">
									<button
										className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
										onClick={async (e) => {
											e.stopPropagation();
											await fetch('/api/connections', {
												method: 'PUT',
												headers: { 'Content-Type': 'application/json' },
												body: JSON.stringify({ requestId: notif.targetId, action: 'accept' }),
											});
											onClearNotification(notif.id);
										}}
									>
										Accept
									</button>
									<button
										className="px-3 py-1 rounded hover:bg-gray-400 text-xs"
										onClick={async (e) => {
											e.stopPropagation();
											await fetch('/api/connections', {
												method: 'PUT',
												headers: { 'Content-Type': 'application/json' },
												body: JSON.stringify({ requestId: notif.targetId, action: 'reject' }),
											});
											onClearNotification(notif.id);
										}}
									>
										Ignore
									</button>
								</div>
							)}
						</div>
					))
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

// --- Mobile Menu Component ---
function MobileMenu({ isOpen, onClose, session, router, handleSignOut, notifications, notificationCount, handleMarkAllNotificationsRead }) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 md:hidden">
			<div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
			<div className="fixed top-0 left-0 w-80 h-full bg-white shadow-xl">
				<div className="flex items-center justify-between p-4 border-b border-gray-200">
					<h2 className="text-lg font-bold text-gray-800">Menu</h2>
					<button onClick={onClose} className="p-2 rounded-full">
						<i className="fas fa-times text-gray-600"></i>
					</button>
				</div>

				<div className="p-4">
					<div className="flex items-center space-x-3 mb-6">
						<img
							src={session?.user?.image || `https://placehold.co/48x48/1877F2/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'}`}
							alt="User Avatar"
							className="w-12 h-12 rounded-full object-cover border-2 border-blue-200"
						/>
						<div>
							<p className="font-semibold text-gray-800">{session?.user?.name || 'User'}</p>
							<p className="text-sm text-gray-500">{session?.user?.email}</p>
						</div>
					</div>

					<div className="space-y-2">
						<button
							onClick={() => { router.push('/dashboard'); onClose(); }}
							className="flex items-center space-x-3 w-full p-3 rounded-lg"
						>
							<i className="fas fa-home text-blue-600 w-5"></i>
							<span className="text-gray-800">Home</span>
						</button>

						<button
							onClick={() => { router.push('/network'); onClose(); }}
							className="flex items-center space-x-3 w-full p-3 rounded-lg"
						>
							<i className="fas fa-users text-blue-600 w-5"></i>
							<span className="text-gray-800">My Network</span>
						</button>

						<button
							onClick={() => { router.push('/jobs'); onClose(); }}
							className="flex items-center space-x-3 w-full p-3 rounded-lg"
						>
							<i className="fas fa-briefcase text-blue-600 w-5"></i>
							<span className="text-gray-800">Jobs</span>
						</button>

						<button
							onClick={() => { router.push('/messages'); onClose(); }}
							className="flex items-center space-x-3 w-full p-3 rounded-lg"
						>
							<i className="fas fa-comment-dots text-blue-600 w-5"></i>
							<span className="text-gray-800">Messaging</span>
						</button>

						<button
							onClick={() => { router.push('/notifications'); onClose(); }}
							className="flex items-center justify-between w-full p-3 rounded-lg"
						>
							<div className="flex items-center space-x-3">
								<i className="fas fa-bell text-blue-600 w-5"></i>
								<span className="text-gray-800">Notifications</span>
							</div>
							{notificationCount > 0 && (
								<span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
									{notificationCount}
								</span>
							)}
						</button>
					</div>

					<div className="border-t border-gray-200 mt-6 pt-6 space-y-2">
						<button
							onClick={() => { router.push('/edit-profile'); onClose(); }}
							className="flex items-center space-x-3 w-full p-3 rounded-lg"
						>
							<i className="fas fa-user text-gray-600 w-5"></i>
							<span className="text-gray-800">View Profile</span>
						</button>

						<button
							onClick={() => { handleSignOut(); onClose(); }}
							className="flex items-center space-x-3 w-full p-3 hover:bg-red-50 rounded-lg text-red-600"
						>
							<i className="fas fa-sign-out-alt w-5"></i>
							<span>Sign Out</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

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
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [notifications, setNotifications] = useState([]);
	const [currentPath, setCurrentPath] = useState('');

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
	const profileMenuRef = useRef(null);
	const searchDropdownRef = useRef(null);

	const notificationCount = notifications.filter(notif => !notif.read).length;

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

	// Fetch notifications
	useEffect(() => {
		const fetchNotifications = async () => {
			if (session?.user?.id) {
				try {
					const res = await fetch('/api/notifications');
					if (!res.ok) throw new Error("Failed to fetch notifications");
					const data = await res.json();
					setNotifications(data.notifications);
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
		await signOut({ callbackUrl: '/auth/login' });
	};

	// Handler to clear a notification by calling DELETE API
	const handleClearNotification = useCallback(async (notifId) => {
		try {
			const res = await fetch(`/api/notifications?id=${notifId}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to clear notification');
			// Remove it from local state
			setNotifications((prev) => prev.filter(n => n.id !== notifId));
		} catch (error) {
			console.error("Error clearing notification:", error);
		}
	}, []);

	// Handler to mark all notifications as read by calling PATCH API
	const handleMarkAllNotificationsRead = useCallback(async () => {
		try {
			const res = await fetch('/api/notifications', { method: 'PATCH' });
			if (!res.ok) throw new Error('Failed to mark all notifications as read');
			setNotifications((prev) => prev.map(n => ({ ...n, read: true })));
		} catch (error) {
			console.error("Error marking notifications as read:", error);
		}
	}, []);

	const toggleNotificationMenu = useCallback(() => {
		setIsNotificationMenuOpen(prev => !prev);
		setIsProfileMenuOpen(false);
	}, []);

	return (
		<>
			<nav className="navbar-root shadow-sm border-b sticky top-0 z-40">
				<div className="navbar-container max-w-7xl mx-auto px-8 sm:px-10 lg:px-12">
					<div className="navbar-row flex items-center justify-between h-16">
						<div className="navbar-left flex items-center space-x-3 flex-1">
							<button
								onClick={() => setIsMobileMenuOpen(true)}
								className="navbar-mobile-btn md:hidden p-2 rounded-full"
							>
								<i className="fas fa-bars navbar-mobile-icon text-lg"></i>
							</button>
							<button
								onClick={() => router.push("/dashboard")}
								className="navbar-logo flex items-center transition duration-150 ease-in-out"
							>
								<div className="navbar-logo-circle w-8 h-8 rounded-full flex items-center justify-center mr-2">
									<span className="navbar-logo-text font-bold text-lg">C</span>
								</div>
								<span className="navbar-logo-title text-xl font-bold hidden sm:block">Connectify</span>
							</button>
							<div className="navbar-search hidden md:block w-[200px] mx-2">
								<div className="relative" ref={searchDropdownRef}>
									<div className="navbar-search-icon absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<i className="fas fa-search"></i>
									</div>
									<input
										type="text"
										placeholder="Search Connectify"
										value={searchText}
										onChange={(e) => {
											setSearchText(e.target.value);
											setShowSearchDropdown(true);
										}}
										onFocus={() => setShowSearchDropdown(true)}
										className="navbar-search-input block w-full pl-10 pr-3 py-2 rounded-full text-sm"
									/>
									{showSearchDropdown && searchText && (
										<ul className="navbar-search-dropdown absolute z-10 mt-1 w-full rounded-md shadow-lg">
											{dummySuggestions.filter(item =>
												item.toLowerCase().includes(searchText.toLowerCase())
											).map((suggestion, index) => (
												<li
													key={index}
													onMouseDown={() => {
														setSearchText(suggestion);
														setShowSearchDropdown(false);
													}}
													className="cursor-pointer px-3 py-2"
												>
													{suggestion}
												</li>
											))}
											{dummySuggestions.filter(item =>
												item.toLowerCase().includes(searchText.toLowerCase())
											).length === 0 && (
													<li className="cursor-pointer px-3 py-2 text-gray-500">No results</li>
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
											`https://placehold.co/32x32/1877F2/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'
											}`
										}
										alt="Profile"
										className="w-8 h-8 rounded-full object-cover"
										onError={(e) => {
											e.target.onerror = null;
											e.target.src = `https://placehold.co/32x32/1877F2/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'
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
													src={session?.user?.image || `https://placehold.co/48x48/1877F2/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'}`}
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
													router.push("/edit-profile");
													setIsProfileMenuOpen(false);
												}}
												className="profile-dropdown-btn flex items-center space-x-3 w-full px-4 py-3 text-sm"
											>
												<i className="fas fa-user profile-dropdown-btn-icon w-4"></i>
												<span>View Profile</span>
											</button>
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

				{/* Mobile Search Bar */}
				<div className="md:hidden px-4 pb-3">
					<div className="relative">
						<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<i className="fas fa-search text-gray-400"></i>
						</div>
						<input
							type="text"
							placeholder="Search Connectify"
							className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full bg-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white sm:text-sm"
						/>
					</div>
				</div>
			</nav>

			{/* Mobile Menu */}
			<MobileMenu
				isOpen={isMobileMenuOpen}
				onClose={() => setIsMobileMenuOpen(false)}
				session={session}
				router={router}
				handleSignOut={handleSignOut}
				notifications={notifications}
				notificationCount={notificationCount}
				handleMarkAllNotificationsRead={handleMarkAllNotificationsRead}
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