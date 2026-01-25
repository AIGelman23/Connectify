// src/components/profile/FriendsListContainer.jsx
"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';

// Modal component for viewing all users
function UsersModal({ isOpen, onClose, title, users, currentUserId, isOwnProfile, onAction, actionLoading, searchTerm, setSearchTerm }) {
	const router = useRouter();

	// Prevent body scroll when modal is open
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	}, [isOpen]);

	if (!isOpen) return null;

	const filteredUsers = searchTerm
		? users.filter(user =>
			user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.headline?.toLowerCase().includes(searchTerm.toLowerCase())
		)
		: users;

	return (
		<div className="fixed inset-0 z-[9999] overflow-hidden">
			{/* Backdrop - no blur */}
			<div
				className="fixed inset-0"
				onClick={onClose}
			/>

			{/* Modal container - centered */}
			<div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
				<div
					className="pointer-events-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md flex flex-col overflow-hidden"
					style={{ maxHeight: 'min(600px, calc(100vh - 40px))' }}
					onClick={(e) => e.stopPropagation()}
				>
					{/* Header */}
					<div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
						<h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
							{title}
						</h2>
						<button
							onClick={onClose}
							className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
						>
							<svg className="w-4 h-4 text-gray-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>

					{/* Search */}
					{users.length > 0 && (
						<div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800">
							<div className="relative">
								<svg
									className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
								</svg>
								<input
									type="text"
									placeholder="Search..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									autoFocus
									className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-100 dark:bg-slate-700 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
								/>
								{searchTerm && (
									<button
										onClick={() => setSearchTerm('')}
										className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600"
									>
										<svg className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								)}
							</div>
						</div>
					)}

					{/* User list */}
					<div className="flex-1 overflow-y-auto overscroll-contain bg-white dark:bg-slate-800">
						{filteredUsers.length > 0 ? (
							<div className="py-1">
								{filteredUsers.map(user => (
									<ModalUserCard
										key={user.id}
										user={user}
										currentUserId={currentUserId}
										isOwnProfile={isOwnProfile}
										onAction={onAction}
										actionLoading={actionLoading}
										onNavigate={() => {
											router.push(`/profile/${user.id}`);
											onClose();
										}}
									/>
								))}
							</div>
						) : (
							<div className="py-12 text-center">
								<svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
								</svg>
								<p className="text-gray-500 dark:text-slate-400 text-sm">
									{searchTerm ? `No results for "${searchTerm}"` : 'No users found'}
								</p>
							</div>
						)}
					</div>
				</div>
			</div >
		</div >
	);
}

// User card for modal
function ModalUserCard({ user, currentUserId, isOwnProfile, onAction, actionLoading, onNavigate }) {
	const [isHovered, setIsHovered] = useState(false);

	const getActionButton = () => {
		if (user.id === currentUserId) return null;

		const { connectionStatus, isFollowing } = user;

		if (connectionStatus === 'CONNECTED') {
			return (
				<button
					onClick={(e) => { e.stopPropagation(); onAction?.('disconnect', user); }}
					disabled={actionLoading}
					onMouseEnter={() => setIsHovered(true)}
					onMouseLeave={() => setIsHovered(false)}
					className={`ml-2 px-3 py-1.5 text-xs font-semibold rounded-md border transition-all ${isHovered
						? 'border-red-300 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
						: 'border-gray-300 bg-white text-gray-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200'
						}`}
				>
					{isHovered ? 'Remove' : 'Connected'}
				</button>
			);
		}

		if (connectionStatus === 'SENT_PENDING') {
			return (
				<span className="ml-2 px-3 py-1.5 text-xs font-medium text-gray-400 dark:text-slate-500">
					Pending
				</span>
			);
		}

		if (connectionStatus === 'RECEIVED_PENDING') {
			return (
				<div className="flex gap-2 ml-2">
					<button
						onClick={(e) => { e.stopPropagation(); onAction?.('accept', user); }}
						disabled={actionLoading}
						className="px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
					>
						Accept
					</button>
					<button
						onClick={(e) => { e.stopPropagation(); onAction?.('reject', user); }}
						disabled={actionLoading}
						className="px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition-colors"
					>
						Decline
					</button>
				</div>
			);
		}

		if (isFollowing !== undefined) {
			return (
				<button
					onClick={(e) => { e.stopPropagation(); onAction?.(isFollowing ? 'unfollow' : 'follow', user); }}
					disabled={actionLoading}
					onMouseEnter={() => setIsHovered(true)}
					onMouseLeave={() => setIsHovered(false)}
					className={`ml-2 px-3 py-1.5 text-xs font-semibold rounded-md border transition-all ${isFollowing
						? (isHovered
							? 'border-red-300 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
							: 'border-gray-300 bg-white text-gray-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200')
						: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:border-blue-700'
						}`}
				>
					{isFollowing ? (isHovered ? 'Unfollow' : 'Following') : 'Follow'}
				</button>
			);
		}

		return null;
	};

	return (
		<div
			className="flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
			onClick={onNavigate}
		>
			<img
				src={user.imageUrl || `https://placehold.co/44x44/4F46E5/ffffff?text=${user.name?.[0]?.toUpperCase() || 'U'}`}
				alt={user.name}
				className="w-11 h-11 rounded-full object-cover flex-shrink-0"
			/>
			<div className="flex-1 min-w-0 ml-3">
				<h4 className="font-semibold text-sm text-gray-900 dark:text-slate-100 truncate leading-tight">
					{user.name}
				</h4>
				<p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">
					{user.headline || 'Connectify User'}
				</p>
			</div>
			{isOwnProfile && getActionButton()}
		</div>
	);
}

export default function FriendsListContainer({ profileUserId }) {
	const router = useRouter();
	const params = useParams();
	const { data: session } = useSession();
	const currentUserId = session?.user?.id;

	const targetUserId = profileUserId || params?.id || currentUserId;
	const isOwnProfile = currentUserId === targetUserId;

	const [activeTab, setActiveTab] = useState('connections');
	const [loading, setLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState(false);
	const [error, setError] = useState(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [modalSearchTerm, setModalSearchTerm] = useState('');

	// Data states
	const [connections, setConnections] = useState([]);
	const [followers, setFollowers] = useState([]);
	const [following, setFollowing] = useState([]);
	const [pendingReceived, setPendingReceived] = useState([]);

	const [counts, setCounts] = useState({
		connections: 0,
		followers: 0,
		following: 0,
		pendingReceived: 0
	});

	useEffect(() => {
		if (!targetUserId) return;

		const fetchData = async () => {
			try {
				setLoading(true);
				setError(null);

				const [connectionsRes, followersRes, followingRes] = await Promise.all([
					fetch('/api/connections'),
					fetch(`/api/users/${targetUserId}/followers`),
					fetch(`/api/users/${targetUserId}/following`)
				]);

				if (!connectionsRes.ok || !followersRes.ok || !followingRes.ok) {
					throw new Error('Failed to load network data');
				}

				const [connectionsData, followersData, followingData] = await Promise.all([
					connectionsRes.json(),
					followersRes.json(),
					followingRes.json()
				]);

				const acceptedConnections = connectionsData.connections?.accepted || [];
				const received = connectionsData.connections?.received || [];

				const followingIds = new Set(followingData.following?.map(f => f.id) || []);
				const processedFollowers = (followersData.followers || []).map(f => ({
					...f,
					isFollowing: followingIds.has(f.id)
				}));

				const processedFollowing = (followingData.following || []).map(f => ({
					...f,
					isFollowing: true
				}));

				setConnections(acceptedConnections);
				setFollowers(processedFollowers);
				setFollowing(processedFollowing);
				setPendingReceived(received);

				setCounts({
					connections: acceptedConnections.length,
					followers: processedFollowers.length,
					following: processedFollowing.length,
					pendingReceived: received.length
				});
			} catch (err) {
				console.error('Error fetching network data:', err);
				setError(err.message);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [targetUserId]);

	const getCurrentData = () => {
		switch (activeTab) {
			case 'connections': return connections;
			case 'followers': return followers;
			case 'following': return following;
			case 'pending': return pendingReceived;
			default: return [];
		}
	};

	const currentData = getCurrentData();
	const previewUsers = currentData.slice(0, 9); // Show up to 9 avatars in grid

	const handleAction = async (action, user) => {
		setActionLoading(true);
		try {
			switch (action) {
				case 'connect':
					await fetch('/api/connections', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ receiverId: user.id })
					});
					break;
				case 'disconnect':
					await fetch('/api/connections', {
						method: 'DELETE',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ requestId: user.requestId })
					});
					setConnections(prev => prev.filter(c => c.id !== user.id));
					setCounts(prev => ({ ...prev, connections: prev.connections - 1 }));
					break;
				case 'accept':
					await fetch('/api/connections', {
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ requestId: user.requestId, action: 'accept' })
					});
					setPendingReceived(prev => prev.filter(p => p.id !== user.id));
					setConnections(prev => [...prev, { ...user, connectionStatus: 'CONNECTED' }]);
					setCounts(prev => ({
						...prev,
						pendingReceived: prev.pendingReceived - 1,
						connections: prev.connections + 1
					}));
					break;
				case 'reject':
					await fetch('/api/connections', {
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ requestId: user.requestId, action: 'reject' })
					});
					setPendingReceived(prev => prev.filter(p => p.id !== user.id));
					setCounts(prev => ({ ...prev, pendingReceived: prev.pendingReceived - 1 }));
					break;
				case 'follow':
					await fetch(`/api/users/${user.id}/follow`, { method: 'POST' });
					if (activeTab === 'followers') {
						setFollowers(prev => prev.map(f =>
							f.id === user.id ? { ...f, isFollowing: true } : f
						));
					}
					setFollowing(prev => [...prev, { ...user, isFollowing: true }]);
					setCounts(prev => ({ ...prev, following: prev.following + 1 }));
					break;
				case 'unfollow':
					await fetch(`/api/users/${user.id}/follow`, { method: 'DELETE' });
					if (activeTab === 'followers') {
						setFollowers(prev => prev.map(f =>
							f.id === user.id ? { ...f, isFollowing: false } : f
						));
					}
					setFollowing(prev => prev.filter(f => f.id !== user.id));
					setCounts(prev => ({ ...prev, following: prev.following - 1 }));
					break;
			}
		} catch (err) {
			console.error('Action error:', err);
		} finally {
			setActionLoading(false);
		}
	};

	const tabs = [
		{ id: 'connections', label: 'Connections', count: counts.connections },
		{ id: 'followers', label: 'Followers', count: counts.followers },
		{ id: 'following', label: 'Following', count: counts.following },
	];

	if (isOwnProfile && counts.pendingReceived > 0) {
		tabs.push({ id: 'pending', label: 'Requests', count: counts.pendingReceived });
	}

	const getTabTitle = () => {
		const tab = tabs.find(t => t.id === activeTab);
		return tab ? tab.label : '';
	};

	if (loading) {
		return (
			<div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
				<div className="animate-pulse">
					<div className="flex gap-2 mb-4">
						{[1, 2, 3].map(i => (
							<div key={i} className="h-8 bg-gray-200 dark:bg-slate-600 rounded-full w-24" />
						))}
					</div>
					<div className="flex gap-2">
						{[1, 2, 3, 4, 5, 6].map(i => (
							<div key={i} className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-600" />
						))}
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
				<p className="text-red-500 dark:text-red-400 text-center text-sm">{error}</p>
			</div>
		);
	}

	return (
		<>
			<div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
				{/* Compact tabs */}
				<div className="flex gap-1 mb-4 overflow-x-auto scrollbar-hide">
					{tabs.map(tab => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${activeTab === tab.id
								? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
								: 'text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700'
								}`}
						>
							{tab.label}
							<span className={`ml-1 text-xs ${activeTab === tab.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-slate-500'}`}>
								{tab.count}
							</span>
						</button>
					))}
				</div>

				{/* Avatar grid preview */}
				{previewUsers.length > 0 ? (
					<div className="flex items-center gap-2 flex-wrap">
						{previewUsers.map(user => (
							<div
								key={user.id}
								className="relative group cursor-pointer"
								onClick={() => router.push(`/profile/${user.id}`)}
								title={user.name}
							>
								<img
									src={user.imageUrl || `https://placehold.co/40x40/4F46E5/ffffff?text=${user.name?.[0]?.toUpperCase() || 'U'}`}
									alt={user.name}
									className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm hover:scale-110 transition-transform"
								/>
							</div>
						))}

						{/* See all button */}
						{currentData.length > 0 && (
							<button
								onClick={() => {
									setModalSearchTerm('');
									setModalOpen(true);
								}}
								className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-xs font-medium"
								title={`See all ${currentData.length} ${activeTab}`}
							>
								{currentData.length > 9 ? `+${currentData.length - 9}` : (
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
									</svg>
								)}
							</button>
						)}
					</div>
				) : (
					<p className="text-sm text-gray-500 dark:text-slate-400">
						{activeTab === 'connections' && 'No connections yet'}
						{activeTab === 'followers' && 'No followers yet'}
						{activeTab === 'following' && 'Not following anyone yet'}
						{activeTab === 'pending' && 'No pending requests'}
					</p>
				)}
			</div>

			{/* Modal for viewing all */}
			<UsersModal
				isOpen={modalOpen}
				onClose={() => setModalOpen(false)}
				title={getTabTitle()}
				users={currentData}
				currentUserId={currentUserId}
				isOwnProfile={isOwnProfile}
				onAction={handleAction}
				actionLoading={actionLoading}
				searchTerm={modalSearchTerm}
				setSearchTerm={setModalSearchTerm}
			/>
		</>
	);
}
