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
		<div ref={menuRef} className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-300 z-30 animate-fade-in-down">
			{/* Header */}
			<div className="flex justify-between items-center px-4 py-3 border-b border-gray-300">
				<h4 className="font-bold text-gray-800 text-lg">Notifications</h4>
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
					<p className="text-gray-500 text-sm p-6 text-center">
						No new notifications.
					</p>
				) : (
					notifications.map((notif) => (
						<div
							key={notif.id}
							className="flex justify-between items-center px-4 py-3 border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
						>
							<div>
								<p className={`text-sm ${notif.read ? "text-gray-600" : "text-gray-800 font-semibold"}`}>
									{notif.message}
								</p>
								<span className="text-xs text-gray-500">
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
								className="text-gray-400 hover:text-red-600 ml-3"
								title="Clear notification"
							>
								<i className="fas fa-times"></i>
							</button>
						</div>
					))
				)}
			</div>
			{/* Footer */}
			<div className="border-t border-gray-300 p-3 text-center">
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
	const baseClasses = `flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-[60px] h-12`;
	const activeClasses = isActive ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-100';

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
					<div className="relative">
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
					<button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
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
							className="flex items-center space-x-3 w-full p-3 hover:bg-gray-100 rounded-lg"
						>
							<i className="fas fa-home text-blue-600 w-5"></i>
							<span className="text-gray-800">Home</span>
						</button>

						<button
							onClick={() => { router.push('/network'); onClose(); }}
							className="flex items-center space-x-3 w-full p-3 hover:bg-gray-100 rounded-lg"
						>
							<i className="fas fa-users text-blue-600 w-5"></i>
							<span className="text-gray-800">My Network</span>
						</button>

						<button
							onClick={() => { router.push('/jobs'); onClose(); }}
							className="flex items-center space-x-3 w-full p-3 hover:bg-gray-100 rounded-lg"
						>
							<i className="fas fa-briefcase text-blue-600 w-5"></i>
							<span className="text-gray-800">Jobs</span>
						</button>

						<button
							onClick={() => { router.push('/messages'); onClose(); }}
							className="flex items-center space-x-3 w-full p-3 hover:bg-gray-100 rounded-lg"
						>
							<i className="fas fa-comment-dots text-blue-600 w-5"></i>
							<span className="text-gray-800">Messaging</span>
						</button>

						<button
							onClick={() => { router.push('/notifications'); onClose(); }}
							className="flex items-center justify-between w-full p-3 hover:bg-gray-100 rounded-lg"
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
							className="flex items-center space-x-3 w-full p-3 hover:bg-gray-100 rounded-lg"
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
	const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
	const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [notifications, setNotifications] = useState([]);
	const [currentPath, setCurrentPath] = useState('');
	const [searchText, setSearchText] = useState("");
	const [showSearchDropdown, setShowSearchDropdown] = useState(false);
	const profileMenuRef = useRef(null);
	const searchDropdownRef = useRef(null);

	const notificationCount = notifications.filter(notif => !notif.read).length;

	// Dummy suggestions for the dropdown
	const dummySuggestions = ["Alice Johnson", "Bob Smith", "Charlie Brown", "Dave Lee"];

	// Track current path for active states
	useEffect(() => {
		setCurrentPath(router.asPath || '/dashboard');
	}, [router.asPath]);

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
					// Assume backend returns { notifications: [...] }
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
		const intervalId = setInterval(fetchNotifications, 60000);
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
			<nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
				<div className="max-w-7xl mx-auto px-8 sm:px-10 lg:px-12">
					<div className="flex items-center justify-between h-16">
						{/* Left Section - Logo and Search */}
						<div className="flex items-center space-x-3 flex-1">
							{/* Mobile Menu Button */}
							<button
								onClick={() => setIsMobileMenuOpen(true)}
								className="md:hidden p-2 hover:bg-gray-100 rounded-full"
							>
								<i className="fas fa-bars text-gray-600 text-lg"></i>
							</button>

							{/* Logo */}
							<button
								onClick={() => router.push("/dashboard")}
								className="flex items-center text-blue-600 hover:text-blue-700 transition duration-150 ease-in-out"
							>
								<div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-2">
									<span className="text-white font-bold text-lg">C</span>
								</div>
								<span className="text-xl font-bold hidden sm:block">Connectify</span>
							</button>

							{/* Search Bar - Hidden on mobile */}
							<div className="hidden md:block w-[200px] mx-2">
								<div className="relative" ref={searchDropdownRef}>
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<i className="fas fa-search text-gray-400"></i>
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
										className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
									/>
									{showSearchDropdown && searchText && (
										<ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
											{dummySuggestions.filter(item =>
												item.toLowerCase().includes(searchText.toLowerCase())
											).map((suggestion, index) => (
												<li
													key={index}
													onMouseDown={() => {
														setSearchText(suggestion);
														setShowSearchDropdown(false);
													}}
													className="cursor-pointer px-3 py-2 hover:bg-gray-100"
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

						{/* Center Section - Navigation Links (Desktop) */}
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
								onMarkAllRead={handleMarkAllNotificationsRead} // Using new handler
								onClearNotification={handleClearNotification}   // Using new handler
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
									className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									<img
										src={
											session?.user?.image ||
											`https://placehold.co/32x32/1877F2/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'
											}`
										}
										alt="Profile"
										className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
										onError={(e) => {
											e.target.onerror = null;
											e.target.src = `https://placehold.co/32x32/1877F2/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'
												}`;
										}}
									/>
									<span className="hidden lg:block text-gray-700 font-medium text-sm">
										{session?.user?.name?.split(' ')[0] || 'User'}
									</span>
									<svg className="w-4 h-4 text-gray-500 hidden lg:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"></path>
									</svg>
								</button>

								{isProfileMenuOpen && (
									<div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-2xl border border-gray-200 z-20 animate-fade-in-down">
										<div className="p-4 border-b border-gray-100">
											<div className="flex items-center space-x-3">
												<img
													src={session?.user?.image || `https://placehold.co/48x48/1877F2/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'}`}
													alt="Profile"
													className="w-12 h-12 rounded-full object-cover border-2 border-blue-200"
												/>
												<div>
													<p className="font-bold text-gray-800">{session?.user?.name || 'User'}</p>
													<p className="text-sm text-gray-500 truncate">{session?.user?.email}</p>
												</div>
											</div>
										</div>

										<div className="py-2">
											<button
												onClick={() => {
													router.push("/edit-profile");
													setIsProfileMenuOpen(false);
												}}
												className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition duration-150 ease-in-out"
											>
												<i className="fas fa-user text-gray-500 w-4"></i>
												<span>View Profile</span>
											</button>

											<button
												onClick={handleSignOut}
												className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition duration-150 ease-in-out border-t border-gray-100 mt-2 pt-3"
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
						transform: translateY(-10px);
					}
					100% {
						opacity: 1;
						transform: translateY(0);
					}
				}
				.animate-fade-in-down {
					animation: fade-in-down 0.2s ease-out;
				}
			`}</style>
		</>
	);
}