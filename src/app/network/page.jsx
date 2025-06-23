// src/app/network/page.jsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";

// Modern UserCard with Facebook-like visuals
const UserCard = ({ user, type, onConnect, onAcceptOrReject }) => {
	return (
		<div className="bg-white rounded-xl shadow border border-gray-200 p-4 flex flex-row items-center gap-4 w-full max-w-full mx-auto hover:shadow-lg transition">
			<img
				src={user.imageUrl}
				alt={user.name}
				className="w-14 h-14 rounded-full object-cover border-2 border-blue-200"
			/>
			<div className="flex-1 min-w-0">
				<h3 className="text-base font-semibold text-gray-900 truncate">{user.name}</h3>
				<p className="text-xs text-gray-500 truncate">{user.headline}</p>
				<div className="flex flex-row gap-2 mt-2">
					{type === 'searchResult' && user.connectionStatus === 'CONNECTED' && (
						<span className="px-3 py-1 bg-green-100 text-green-700 font-medium rounded-full text-xs flex items-center gap-1">
							<i className="fas fa-check-circle"></i> Connected
						</span>
					)}
					{type === 'searchResult' && user.connectionStatus === 'SENT_PENDING' && (
						<span className="px-3 py-1 bg-yellow-100 text-yellow-700 font-medium rounded-full text-xs flex items-center gap-1">
							<i className="fas fa-clock"></i> Pending
						</span>
					)}
					{type === 'searchResult' && user.connectionStatus === 'RECEIVED_PENDING' && (
						<button onClick={() => onAcceptOrReject(user.requestId, 'accept')}
							className="px-3 py-1 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition text-xs">
							Accept
						</button>
					)}
					{type === 'searchResult' && user.connectionStatus === 'NOT_CONNECTED' && (
						<button onClick={() => onConnect(user.id)}
							className="px-3 py-1 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition text-xs">
							Add Friend
						</button>
					)}

					{type === 'receivedRequest' && (
						<>
							<button
								onClick={() => onAcceptOrReject(user.requestId, 'accept')}
								className="px-3 py-1 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition text-xs"
							>
								Confirm
							</button>
							<button
								onClick={() => onAcceptOrReject(user.requestId, 'reject')}
								className="px-3 py-1 bg-gray-200 text-gray-700 font-medium rounded-full hover:bg-gray-300 transition text-xs"
							>
								Delete
							</button>
						</>
					)}

					{type === 'sentRequest' && (
						<span className="px-3 py-1 bg-yellow-100 text-yellow-700 font-medium rounded-full text-xs flex items-center gap-1">
							<i className="fas fa-clock"></i> Pending
						</span>
					)}

					{type === 'myConnection' && (
						<span className="px-3 py-1 bg-green-100 text-green-700 font-medium rounded-full text-xs flex items-center gap-1">
							<i className="fas fa-check-circle"></i> Friends
						</span>
					)}

					{type === 'suggestion' && (
						<button
							onClick={() => onConnect(user.id)}
							className="px-3 py-1 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition text-xs"
						>
							Add Friend
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

// Facebook-like Section: Card with header and grid of UserCards
const Section = ({ title, users, type, onConnect, onAcceptOrReject }) => {
	if (users.length === 0) return null;
	return (
		<div className="mb-8 bg-white rounded-xl shadow border border-gray-200">
			<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
				<span className="text-lg font-semibold text-gray-800">{title}</span>
				<span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">{users.length}</span>
			</div>
			<div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
				{users.map((user) => (
					<UserCard key={user.id} user={user} type={type} onConnect={onConnect} onAcceptOrReject={onAcceptOrReject} />
				))}
			</div>
		</div>
	);
};


export default function MyNetworkPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const searchParams = useSearchParams();

	// Get tab from URL params, defaulting to 'received' if not specified
	const tabFromUrl = searchParams.get('tab');
	const [selectedSection, setSelectedSection] = useState(tabFromUrl || 'received');

	const [users, setUsers] = useState([]); // All users fetched from API
	const [receivedRequests, setReceivedRequests] = useState([]);
	const [sentRequests, setSentRequests] = useState([]);
	const [myConnections, setMyConnections] = useState([]);
	const [suggestions, setSuggestions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [successMessage, setSuccessMessage] = useState(null); // New state for success messages

	const currentSearchQuery = searchParams.get('q') || '';

	const fetchUsersAndCategorize = useCallback(async (query = '') => {
		try {
			setLoading(true);
			setError(null);

			const url = `/api/connections${query ? `?q=${encodeURIComponent(query)}` : ''}`;
			const res = await fetch(url);

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || `Failed to fetch users: ${res.statusText}`);
			}
			const data = await res.json();

			// Check if the API returned users data
			if (!data.users && !data.connections) {
				console.warn("API response missing users data:", data);
				setUsers([]);
				setReceivedRequests([]);
				setSentRequests([]);
				setMyConnections([]);
				setSuggestions([]);

				if (data.message && data.message.includes("mock data")) {
					setError(`Note: ${data.message}`);
				}
				return;
			}

			if (query) {
				// If there's a search query, show only search results
				setUsers(Array.isArray(data.users) ? data.users : []);
				setReceivedRequests([]);
				setSentRequests([]);
				setMyConnections([]);
				setSuggestions([]);
			} else {
				// If no search query, use the categorized data from the API
				if (data.connections) {
					// Use the pre-categorized connections if available
					setReceivedRequests(data.connections.received || []);
					setSentRequests(data.connections.sent || []);
					setMyConnections(data.connections.accepted || []);

					// For suggestions, filter out people who are already connected or have pending requests
					const allConnectedIds = [
						...(data.connections.accepted || []).map(u => u.id),
						...(data.connections.received || []).map(u => u.id),
						...(data.connections.sent || []).map(u => u.id)
					];

					const suggestionsArray = Array.isArray(data.users)
						? data.users.filter(u => !allConnectedIds.includes(u.id))
						: [];

					setSuggestions(suggestionsArray);
				} else {
					// Fallback to the old categorization if connections aren't pre-categorized
					const received = [];
					const sent = [];
					const connected = [];
					const suggest = [];

					if (Array.isArray(data.users)) {
						data.users.forEach(user => {
							if (user.connectionStatus === 'RECEIVED_PENDING') {
								received.push(user);
							} else if (user.connectionStatus === 'SENT_PENDING') {
								sent.push(user);
							} else if (user.connectionStatus === 'CONNECTED') {
								connected.push(user);
							} else { // NOT_CONNECTED
								suggest.push(user);
							}
						});
					}

					setReceivedRequests(received);
					setSentRequests(sent);
					setMyConnections(connected);
					setSuggestions(suggest);
				}

				setUsers([]); // Clear generic users state when categorized
			}
		} catch (err) {
			console.error("Failed to fetch users:", err);
			setError(err.message || "Failed to load network data. Please try again.");
			setUsers([]);
			setReceivedRequests([]);
			setSentRequests([]);
			setMyConnections([]);
			setSuggestions([]);
		} finally {
			setLoading(false);
		}
	}, []); // Dependencies for fetchUsersAndCategorize remain unchanged as it only depends on stable references.

	useEffect(() => {
		if (status === "loading") {
			return;
		}

		if (status === "unauthenticated") {
			router.push("/auth/login");
			return;
		}

		// Now, fetchUsersAndCategorize is called directly when authentication is ready
		// or when the search query changes in the URL.
		if (status === "authenticated") {
			fetchUsersAndCategorize(currentSearchQuery);
		}
	}, [status, router, fetchUsersAndCategorize, currentSearchQuery]); // Removed initialLoadPerformed


	const handleConnect = useCallback(async (userIdToConnect) => {
		if (!session?.user?.id) {
			setError("You must be logged in to send connection requests.");
			return;
		}

		// Optimistic update for SENT_PENDING (removed from here, will be handled by re-fetch)
		// setSuggestions(prevSuggestions => prevSuggestions.filter(user => user.id !== userIdToConnect));
		// setSentRequests(prevSent => {
		//   const userToMove = users.find(u => u.id === userIdToConnect) || suggestions.find(u => u.id === userIdToConnect);
		//   if (userToMove) {
		//     return [{ ...userToMove, connectionStatus: 'SENT_PENDING' }, ...prevSent];
		//   }
		//   return prevSent;
		// });

		try {
			const res = await fetch('/api/connections', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ receiverId: userIdToConnect }),
			});

			if (!res.ok) {
				const errorData = await res.json();
				console.error("Failed to send connection request:", errorData.message);
				setError(errorData.message || "Failed to send request.");
			} else {
				const data = await res.json();
				console.log('Connection request status:', data.status, data.message);
				setSuccessMessage('Connection request sent!'); // Set success message
				setTimeout(() => setSuccessMessage(null), 3000); // Clear after 3 seconds
			}
			// Always re-fetch to ensure data consistency after any action
			fetchUsersAndCategorize(currentSearchQuery);

		} catch (err) {
			console.error("Network error sending connection request:", err);
			setError("Network error. Please try again.");
			fetchUsersAndCategorize(currentSearchQuery);
		}
	}, [session?.user?.id, fetchUsersAndCategorize, currentSearchQuery]);


	const handleAcceptOrRejectRequest = useCallback(async (requestId, action) => {
		if (!session?.user?.id) {
			setError("You must be logged in to manage connection requests.");
			return;
		}

		try {
			const res = await fetch('/api/connections', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ requestId, action }),
			});

			if (!res.ok) {
				const errorData = await res.json();
				console.error(`Failed to ${action} request:`, errorData.message);
				setError(errorData.message || `Failed to ${action} request.`);
			} else {
				const data = await res.json();
				console.log(`Request ${action} status:`, data.status, data.message);
				setSuccessMessage(`Connection request ${action === 'accept' ? 'accepted' : 'rejected'}!`); // Set success message
				setTimeout(() => setSuccessMessage(null), 3000); // Clear after 3 seconds
			}
			// Always re-fetch to ensure data consistency after any action
			fetchUsersAndCategorize(currentSearchQuery);

		} catch (err) {
			console.error(`Network error ${action}ing request:`, err);
			setError("Network error. Please try again.");
			fetchUsersAndCategorize(currentSearchQuery);
		}
	}, [session?.user?.id, fetchUsersAndCategorize, currentSearchQuery]);


	useEffect(() => {
		// Update selected section when URL param changes
		if (tabFromUrl) {
			setSelectedSection(tabFromUrl);
		}
	}, [tabFromUrl]);

	// Update URL when user changes tab
	const handleSectionChange = (sectionKey) => {
		setSelectedSection(sectionKey);
		const newParams = new URLSearchParams(searchParams);
		newParams.set('tab', sectionKey);
		router.push(`/network?${newParams.toString()}`);
	};


	if (status === "loading" || loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F6FA] to-[#E5E6F0] p-4">
				<div className="flex items-center space-x-2 text-[#6C47FF]">
					<svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
						<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
						<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					Loading your network...
				</div>
			</div>
		);
	}

	if (status === "unauthenticated") {
		return null;
	}

	// Helper for section data
	const sectionData = [
		{
			key: 'received',
			title: 'Received Requests',
			icon: 'fas fa-user-plus',
			users: receivedRequests,
			type: 'receivedRequest',
			count: receivedRequests.length,
		},
		{
			key: 'sent',
			title: 'Sent Requests',
			icon: 'fas fa-paper-plane',
			users: sentRequests,
			type: 'sentRequest',
			count: sentRequests.length,
		},
		{
			key: 'connections',
			title: 'My Connections',
			icon: 'fas fa-user-friends',
			users: myConnections,
			type: 'myConnection',
			count: myConnections.length,
		},
		{
			key: 'suggestions',
			title: 'People You May Know',
			icon: 'fas fa-users',
			users: suggestions,
			type: 'suggestion',
			count: suggestions.length,
		},
	];

	return (
		<>
			<NavBar session={session} router={router} />
			<div className="min-h-screen bg-gray-100 px-2 sm:px-6 lg:px-12 pt-4 pb-safe">
				<div className="max-w-5xl mx-auto">
					<h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-700 mb-6 text-center tracking-tight">
						My Network
					</h1>

					{/* Error Message Display */}
					{error && (
						<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6 text-sm flex items-center shadow-sm animate-fade-in-down">
							<svg className="h-5 w-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586l-1.293-1.293z" clipRule="evenodd" />
							</svg>
							<span className="block">{error}</span>
						</div>
					)}

					{/* Success Message Display */}
					{successMessage && (
						<div className="bg-[#E6FFF6] border border-[#00D084] text-[#00D084] px-4 py-3 rounded-lg relative mb-6 text-sm flex items-center shadow-sm animate-fade-in-down">
							<svg className="h-5 w-5 text-[#00D084] mr-2" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
							</svg>
							<span className="block">{successMessage}</span>
						</div>
					)}

					<div className="flex flex-col md:flex-row gap-8">
						{/* Sidebar: Always visible, Facebook-like left nav */}
						<aside className="w-full md:w-64 flex-shrink-0 mb-4 md:mb-0">
							<div className="bg-white rounded-xl shadow border border-gray-200 p-4 flex flex-col space-y-1 w-full">
								{sectionData.map(section => (
									<button
										key={section.key}
										onClick={() => handleSectionChange(section.key)}
										className={`flex items-center px-4 py-3 rounded-lg transition font-semibold gap-3 text-base w-full
											${selectedSection === section.key
												? 'bg-blue-50 text-blue-700 border border-blue-200'
												: 'hover:bg-gray-100 text-gray-700'
											}`}
									>
										<i className={`${section.icon} text-lg ${selectedSection === section.key ? 'text-blue-600' : 'text-blue-400'}`}></i>
										<span className="flex-1 break-words text-left">{section.title}</span>
										<span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${section.count > 0
											? selectedSection === section.key
												? 'bg-blue-600 text-white'
												: 'bg-blue-100 text-blue-600'
											: 'bg-gray-200 text-gray-400'
											}`}>
											{section.count}
										</span>
									</button>
								))}
							</div>
						</aside>

						{/* Main content */}
						<main className="flex-1">
							{currentSearchQuery ? (
								<>
									<div className="mb-6 bg-white rounded-xl shadow border border-gray-200 px-6 py-4 flex items-center gap-2">
										<h2 className="text-lg font-semibold text-blue-700">
											{users.length} results found for "{currentSearchQuery}"
										</h2>
									</div>
									{users.length === 0 && !loading && !error ? (
										<div className="text-center py-8 bg-white shadow rounded-xl border border-gray-200">
											<p className="text-blue-600 text-base">No users found matching "{currentSearchQuery}".</p>
										</div>
									) : (
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											{users.map((user) => (
												<UserCard key={user.id} user={user} type="searchResult" onConnect={handleConnect} onAcceptOrReject={handleAcceptOrRejectRequest} />
											))}
										</div>
									)}
								</>
							) : (
								<>
									{sectionData.find(s => s.key === selectedSection)?.users.length === 0 && (
										<div className="text-center py-8 bg-white shadow rounded-xl border border-gray-200">
											<p className="text-blue-600 text-base">
												{selectedSection === 'received' && "No received requests."}
												{selectedSection === 'sent' && "No sent requests."}
												{selectedSection === 'connections' && "You have no connections yet."}
												{selectedSection === 'suggestions' && "No suggestions at the moment."}
											</p>
										</div>
									)}
									<Section
										title={sectionData.find(s => s.key === selectedSection)?.title}
										users={sectionData.find(s => s.key === selectedSection)?.users || []}
										type={sectionData.find(s => s.key === selectedSection)?.type}
										onConnect={handleConnect}
										onAcceptOrReject={handleAcceptOrRejectRequest}
									/>
								</>
							)}
						</main>
					</div>
				</div>
			</div>
		</>
	);
}
