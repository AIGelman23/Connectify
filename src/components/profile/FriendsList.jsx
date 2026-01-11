// src/components/FriendsList.jsx
import React from 'react';
import { useRouter } from 'next/navigation';

export default function FriendsList({
	initialFriendsList = [], // Used for total count, or can be removed if not needed
	friendSearchTerm,
	setFriendSearchTerm,
	formErrors = {},
	filteredFriends = [] // Add default here!
}) {
	const router = useRouter();

	return (
		<div>
			<div className="w-full max-w-4xl rounded-2xl shadow-md overflow-hidden">
				<div className="friends-list-header">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-bold flex items-center gap-2">
							<svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
								<path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.0 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
							</svg>
							Friends
							<span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
								{/* Use initialFriendsList.length for total count, or filteredFriends.length for current view count */}
								{initialFriendsList.length}
							</span>
						</h2>
						<button className="text-blue-600 hover:text-blue-700 font-medium text-sm hover:bg-blue-50 active:bg-blue-100 px-3 py-1 rounded-md transition-colors duration-150">
							See All
						</button>
					</div>
				</div>
				<div className="friends-search-container px-6 py-4">
					<div className="relative">
						<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
						<input
							type="text"
							placeholder="Search friends..."
							value={friendSearchTerm}
							onChange={(e) => setFriendSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-3 border rounded-lg text-sm focus:outline-none focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
						/>
					</div>
				</div>
				<div
					className="px-6 py-4 friends-list-section-bg"
				>
					<div className="relative">
						{/* Iterate over filteredFriends, which is now passed as a prop */}
						{filteredFriends.length > 0 ? (
							<div className="grid grid-cols-3 gap-2">
								{filteredFriends.map(friend => (
									<div key={friend.id} className="group cursor-pointer">
										<div
											className="rounded-2xl p-4 friends-list-card-bg hover:shadow-lg"
										>
											<div className="relative mb-3 flex justify-center">
												<div className="relative">
													{/* Make profile image clickable */}
													<img
														src={
															friend.profile?.profilePictureUrl ||
															friend.imageUrl ||
															`https://placehold.co/80x80/4F46E5/ffffff?text=${friend.name ? friend.name[0].toUpperCase() : 'U'}`
														}
														alt={friend.name}
														className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md group-hover:shadow-lg transition-shadow duration-300 cursor-pointer"
														onClick={() => router.push(`/profile/${friend.id}`)}
													/>
													{friend.isOnline && (
														<div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full"></div>
													)}
												</div>
											</div>
											<div className="text-center">
												<h3
													onClick={() => router.push(`/profile/${friend.id}`)}
													className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors cursor-pointer hover:underline"
												>
													{friend.name}
												</h3>
												<p className="text-xs mt-1">
													{/* Show mutual friends count if available */}
													{typeof friend.mutualFriendsCount === 'number'
														? `${friend.mutualFriendsCount} mutual friend${friend.mutualFriendsCount === 1 ? '' : 's'}`
														: 'Connection'}
												</p>
											</div>
											<div className="mt-3 flex gap-2">
												<button className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-medium py-2 px-3 rounded-md transition-colors duration-200 shadow-sm">
													Message
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-12">
								<div className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center">
									<svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
									</svg>
								</div>
								<h3 className="text-lg font-medium mb-2">No friends found</h3>
								<p className="text-sm">
									{friendSearchTerm ?
										`No connections match "${friendSearchTerm}". Try a different search term.` :
										"Start connecting with people to see them here."
									}
								</p>
								{!friendSearchTerm && (
									<button className="mt-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 shadow-sm">
										Find Connections
									</button>
								)}
							</div>
						)}
					</div>
				</div>
				{formErrors.friends && (
					<div className="px-6 pb-4">
						<div className="bg-red-50 border border-red-200 rounded-md p-3">
							<div className="flex">
								<svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
								</svg>
								<p className="ml-2 text-sm text-red-700">{formErrors.friends}</p>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}