// src/app/network/page.jsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";

// Modern UserCard with improved visuals
const UserCard = ({ user, type, onConnect, onAcceptOrReject }) => {
	return (
		<div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 flex flex-col items-center transition hover:shadow-xl hover:-translate-y-1 duration-150">
			<img
				src={user.imageUrl}
				alt={user.name}
				className="w-16 h-16 rounded-full object-cover border-4 border-indigo-100 shadow mb-3"
			/>
			<div className="flex flex-col items-center flex-1 w-full">
				<h3 className="text-lg font-semibold text-gray-900 truncate w-full text-center">{user.name}</h3>
				<p className="text-sm text-gray-500 truncate w-full text-center">{user.headline}</p>
			</div>
			<div className="flex flex-row gap-2 mt-4 w-full justify-center">
				{type === 'searchResult' && user.connectionStatus === 'CONNECTED' && (
					<span className="px-4 py-1.5 bg-green-100 text-green-700 font-medium rounded-full text-xs flex items-center gap-1">
						<i className="fas fa-check-circle"></i> Connected
					</span>
				)}
				{type === 'searchResult' && user.connectionStatus === 'SENT_PENDING' && (
					<span className="px-4 py-1.5 bg-yellow-100 text-yellow-700 font-medium rounded-full text-xs flex items-center gap-1">
						<i className="fas fa-clock"></i> Pending
					</span>
				)}
				{type === 'searchResult' && user.connectionStatus === 'RECEIVED_PENDING' && (
					<button onClick={() => onAcceptOrReject(user.requestId, 'accept')}
						className="px-4 py-1.5 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition text-xs">
						Accept Request
					</button>
				)}
				{type === 'searchResult' && user.connectionStatus === 'NOT_CONNECTED' && (
					<button onClick={() => onConnect(user.id)}
						className="px-4 py-1.5 bg-indigo-600 text-white font-medium rounded-full hover:bg-indigo-700 transition text-xs">
						Connect
					</button>
				)}

				{type === 'receivedRequest' && (
					<>
						<button
							onClick={() => onAcceptOrReject(user.requestId, 'accept')}
							className="px-4 py-1.5 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition text-xs"
						>
							Accept
						</button>
						<button
							onClick={() => onAcceptOrReject(user.requestId, 'reject')}
							className="px-4 py-1.5 bg-gray-200 text-gray-700 font-medium rounded-full hover:bg-gray-300 transition text-xs"
						>
							Ignore
						</button>
					</>
				)}

				{type === 'sentRequest' && (
					<span className="px-4 py-1.5 bg-yellow-100 text-yellow-700 font-medium rounded-full text-xs flex items-center gap-1">
						<i className="fas fa-clock"></i> Pending
					</span>
				)}

				{type === 'myConnection' && (
					<span className="px-4 py-1.5 bg-green-100 text-green-700 font-medium rounded-full text-xs flex items-center gap-1">
						<i className="fas fa-check-circle"></i> Connected
					</span>
				)}

				{type === 'suggestion' && (
					<button
						onClick={() => onConnect(user.id)}
						className="px-4 py-1.5 bg-indigo-600 text-white font-medium rounded-full hover:bg-indigo-700 transition text-xs"
					>
						Connect
					</button>
				)}
			</div>
		</div>
	);
};

// Helper component for rendering sections
const Section = ({ title, users, type, onConnect, onAcceptOrReject }) => {
	if (users.length === 0) return null; // Don't render section if no users

	return (
		<div className="mb-8 p-6 bg-white shadow-xl rounded-2xl border border-gray-200"> {/* Added padding and background for sections */}
			<h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">
				{title} ({users.length})
			</h2>
			<div className="space-y-4">
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
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
				<div className="flex items-center space-x-2 text-indigo-600">
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
			<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8 pt-4">
				<div className="max-w-7xl mx-auto">
					<h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8 text-center">
						<span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
							My Network
						</span>
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
						<div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-6 text-sm flex items-center shadow-sm animate-fade-in-down">
							<svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
							</svg>
							<span className="block">{successMessage}</span>
						</div>
					)}


					{/* Modern Facebook-like Layout */}
					<div className="grid grid-cols-1 md:grid-cols-4 gap-8">
						{/* Left Pane: Section Navigation */}
						<aside className="col-span-1">
							<div className="sticky top-24 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex flex-col space-y-1">
								{sectionData.map(section => (
									<button
										key={section.key}
										onClick={() => handleSectionChange(section.key)}
										className={`flex items-center px-4 py-3 rounded-xl transition font-semibold gap-3 text-base ${selectedSection === section.key
											? 'bg-indigo-600 text-white shadow'
											: 'hover:bg-indigo-50 text-gray-700'
											}`}
									>
										<i className={`${section.icon} text-lg ${selectedSection === section.key ? 'text-white' : 'text-indigo-500'}`}></i>
										<span className="flex-1">{section.title}</span>
										<span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${section.count > 0
											? selectedSection === section.key
												? 'bg-white text-indigo-600'
												: 'bg-indigo-100 text-indigo-600'
											: 'bg-gray-200 text-gray-400'
											}`}>
											{section.count}
										</span>
									</button>
								))}
							</div>
						</aside>

						{/* Right Pane: User Cards Grid */}
						<main className="col-span-1 md:col-span-3">
							{currentSearchQuery ? (
								<>
									<h2 className="text-xl font-semibold text-gray-700 mb-6 border-b pb-2">
										<span className="font-bold text-indigo-600">{users.length}</span> results found for "{currentSearchQuery}"
									</h2>
									{users.length === 0 && !loading && !error ? (
										<div className="text-center py-10 bg-white shadow-xl rounded-2xl border border-gray-100">
											<p className="text-gray-600 text-lg">No users found matching "{currentSearchQuery}".</p>
										</div>
									) : (
										<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
											{users.map((user) => (
												<UserCard key={user.id} user={user} type="searchResult" onConnect={handleConnect} onAcceptOrReject={handleAcceptOrRejectRequest} />
											))}
										</div>
									)}
								</>
							) : (
								<>
									{sectionData.find(s => s.key === selectedSection)?.users.length === 0 && (
										<div className="text-center py-10 bg-white shadow-xl rounded-2xl border border-gray-100">
											<p className="text-gray-600 text-lg">
												{selectedSection === 'received' && "No received requests."}
												{selectedSection === 'sent' && "No sent requests."}
												{selectedSection === 'connections' && "You have no connections yet."}
												{selectedSection === 'suggestions' && "No suggestions at the moment."}
											</p>
										</div>
									)}
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
										{sectionData.find(s => s.key === selectedSection)?.users.map((user) => (
											<UserCard
												key={user.id}
												user={user}
												type={sectionData.find(s => s.key === selectedSection)?.type}
												onConnect={handleConnect}
												onAcceptOrReject={handleAcceptOrRejectRequest}
											/>
										))}
									</div>
								</>
							)}
						</main>
					</div>
				</div>
			</div>
		</>
	);
}
