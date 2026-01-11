// src/components/FriendsListContainer.jsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { GET_FRIENDS } from '@/graphql/queries';
import FriendsList from './FriendsList';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function FriendsListContainer() {
	const router = useRouter();
	const { data: session } = useSession();
	const currentUserId = session?.user?.id;
	const { loading, error, data } = useQuery(GET_FRIENDS, {
		skip: !currentUserId,
		variables: { currentUserId },
		fetchPolicy: "network-only", // <-- Add this line to always fetch fresh data
	});

	const [friendSearchTerm, setFriendSearchTerm] = useState('');
	const [filteredFriends, setFilteredFriends] = useState([]);

	const initialFriendsList = data?.myConnections || [];
	// Memoize the initial friends list so its reference is stable
	const memoizedFriends = useMemo(() => initialFriendsList, [initialFriendsList]);

	// Update filteredFriends only when memoizedFriends or friendSearchTerm changes
	useEffect(() => {
		const newFiltered = memoizedFriends.filter(friend =>
			friend.name?.toLowerCase().includes(friendSearchTerm.toLowerCase())
		);
		// Only update state if newFiltered is different from current state
		setFilteredFriends(prev => {
			if (
				prev.length !== newFiltered.length ||
				prev.some((item, index) => item.id !== newFiltered[index]?.id)
			) {
				return newFiltered;
			}
			return prev;
		});
	}, [memoizedFriends, friendSearchTerm]);

	const navigateToProfile = (userId) => {
		router.push(`/profile/${userId}`);
	};

	const viewAllConnections = () => {
		router.push('/network?tab=connections');
	};

	if (loading) {
		return (
			<div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 mb-6">
				<h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-slate-100">Connections</h2>
				<div className="animate-pulse flex space-x-4 mb-2">
					<div className="rounded-full bg-gray-200 dark:bg-slate-600 h-12 w-12"></div>
					<div className="rounded-full bg-gray-200 dark:bg-slate-600 h-12 w-12"></div>
					<div className="rounded-full bg-gray-200 dark:bg-slate-600 h-12 w-12"></div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 mb-6">
				<h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-slate-100">Connections</h2>
				<p className="text-red-500 dark:text-red-400">{error.message}</p>
			</div>
		);
	}

	const formErrors = {};

	return (
		<div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 mb-6">
			<h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-slate-100">Connections</h2>

			{filteredFriends.length > 0 ? (
				<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
					{filteredFriends.map(friend => (
						<div key={friend.id} className="flex flex-col items-center">
							<div
								className="cursor-pointer transition-transform hover:scale-105 relative"
								onClick={() => navigateToProfile(friend.id)}
								title={`View ${friend.name}'s profile`}
							>
								<img
									src={
										friend.imageUrl ||
										`https://placehold.co/80x80/4F46E5/ffffff?text=${friend.name ? friend.name[0].toUpperCase() : 'U'}`
									}
									alt={friend.name}
									className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
								/>
								<div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-white"></div>
							</div>
							<span
								onClick={() => navigateToProfile(friend.id)}
								className="text-xs text-center text-gray-700 dark:text-slate-300 mt-1 truncate w-full cursor-pointer hover:text-blue-600 hover:underline"
							>
								{friend.name}
							</span>
						</div>
					))}
				</div>
			) : (
				<p className="text-gray-500 dark:text-slate-400 text-center">No connections yet</p>
			)}

			{filteredFriends.length > 0 && (
				<div className="text-center mt-4">
					<button
						onClick={viewAllConnections}
						className="text-sm text-blue-600 hover:text-blue-800 font-medium"
					>
						View all connections
					</button>
				</div>
			)}
		</div>
	);
}