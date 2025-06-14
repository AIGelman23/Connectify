// src/components/FriendsListContainer.jsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { GET_FRIENDS } from '@/graphql/queries';
import FriendsList from './FriendsList';
import { useSession } from 'next-auth/react';

export default function FriendsListContainer() {
	const { data: session } = useSession();
	const currentUserId = session?.user?.id;
	const { loading, error, data } = useQuery(GET_FRIENDS, {
		skip: !currentUserId,
		variables: { currentUserId },
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

	if (loading) {
		return (
			<div className="flex justify-center items-center h-48">
				<p className="text-lg text-gray-600">Loading friends...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-center py-12">
				<p className="text-red-600 text-lg">Error loading friends: {error.message}</p>
				<p className="text-gray-500 text-sm mt-2">Please try again later.</p>
			</div>
		);
	}

	const formErrors = {};

	return (
		<FriendsList
			initialFriendsList={initialFriendsList}
			friendSearchTerm={friendSearchTerm}
			setFriendSearchTerm={setFriendSearchTerm}
			formErrors={formErrors}
			filteredFriends={filteredFriends}
		/>
	);
}