// src/app/network/page.jsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

// --- Navbar and NavLink components (copied for consistency and self-containment) ---
// In a real app, you would likely centralize these in a components folder
function Navbar({ session, router }) {
	const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
	const [globalSearchQuery, setGlobalSearchQuery] = useState(''); // State for global search input

	const handleSignOut = async () => {
		await signOut({ callbackUrl: '/auth/login' });
	};

	const handleGlobalSearchSubmit = (e) => {
		e.preventDefault();
		// Redirect to the network page with the search query as a URL parameter
		if (globalSearchQuery.trim()) {
			router.push(`/network?q=${encodeURIComponent(globalSearchQuery.trim())}`);
		} else {
			router.push(`/network`); // Navigate to network page without query if search is empty
		}
	};

	return (
		<nav className="bg-white shadow-md py-3 px-4 sm:px-6 lg:px-8 sticky top-0 z-50 border-b border-gray-200">
			<div className="max-w-7xl mx-auto flex items-center justify-between h-16">
				{/* Logo/Home Link */}
				<div className="flex-shrink-0">
					<button onClick={() => router.push("/dashboard")} className="flex items-center text-indigo-600 hover:text-indigo-800 transition duration-150 ease-in-out">
						<svg className="w-8 h-8 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 16v4a2 2 0 01-2 2h-4a2 2 0 01-2-2v-4m4-2l-4-4m0 0l-4 4m4-4V4m0 0V3a1 1 0 011-1h2a1 1 0 011 1v1m-6 10h6"></path>
						</svg>
						<span className="text-xl font-bold">Connectify</span>
					</button>
				</div>

				{/* Search Bar - Now fully functional and part of the Navbar */}
				<form onSubmit={handleGlobalSearchSubmit} className="hidden md:block flex-grow max-w-sm mx-4">
					<div className="relative">
						<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<i className="fas fa-search text-gray-400"></i>
						</div>
						<input
							type="text"
							placeholder="Search people, jobs, posts..."
							className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
							value={globalSearchQuery}
							onChange={(e) => setGlobalSearchQuery(e.target.value)}
						/>
					</div>
				</form>

				{/* Navigation Links */}
				<div className="flex items-center space-x-6">
					<NavLink iconClass="fas fa-home" text="Home" href="/dashboard" router={router} />
					<NavLink iconClass="fas fa-users" text="My Network" href="/network" router={router} />
					<NavLink iconClass="fas fa-briefcase" text="Jobs" href="/jobs" router={router} />
					<NavLink iconClass="fas fa-comment-dots" text="Messaging" href="/messages" router={router} />
					<NavLink iconClass="fas fa-bell" text="Notifications" href="/notifications" router={router} />

					{/* User Profile Dropdown */}
					<div className="relative">
						<button
							onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
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
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
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

function NavLink({ iconClass, text, href, router }) {
	const isActive = router.pathname === href;

	return (
		<button
			onClick={() => router.push(href)}
			className={`hidden sm:flex flex-col items-center p-2 rounded-lg ${isActive ? 'text-indigo-600 font-bold bg-indigo-50' : 'text-gray-600 hover:bg-gray-100'} transition duration-150 ease-in-out text-sm`}
		>
			<i className={`${iconClass} text-lg mb-1`}></i>
			<span>{text}</span>
		</button>
	);
}
// --- End Navbar and NavLink components ---

// Component to render a single user card in the list (Moved outside MyNetworkPage)
const UserCard = ({ user, type, onConnect, onAcceptOrReject }) => {
	return (
		<div className="bg-white shadow-lg rounded-xl p-4 border border-gray-200 flex items-center justify-between">
			<div className="flex items-center flex-grow min-w-0">
				<img
					src={user.imageUrl}
					alt={user.name}
					className="w-12 h-12 rounded-full object-cover mr-4 border-2 border-indigo-300"
				/>
				<div className="flex-grow min-w-0">
					<h3 className="text-base font-semibold text-gray-900 truncate">{user.name}</h3>
					<p className="text-sm text-gray-600 truncate">{user.headline}</p>
				</div>
			</div>

			<div className="flex-shrink-0 ml-4">
				{type === 'searchResult' && user.connectionStatus === 'CONNECTED' && (
					<button className="px-4 py-1.5 bg-green-500 text-white font-medium rounded-full text-sm cursor-not-allowed opacity-80" disabled>Connected</button>
				)}
				{type === 'searchResult' && user.connectionStatus === 'SENT_PENDING' && (
					<button className="px-4 py-1.5 bg-yellow-500 text-white font-medium rounded-full text-sm cursor-not-allowed opacity-80" disabled>Pending</button>
				)}
				{type === 'searchResult' && user.connectionStatus === 'RECEIVED_PENDING' && (
					<button onClick={() => onAcceptOrReject(user.requestId, 'accept')}
						className="px-4 py-1.5 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition duration-150 ease-in-out shadow-sm transform hover:scale-105 text-sm">
						Accept Request
					</button>
				)}
				{type === 'searchResult' && user.connectionStatus === 'NOT_CONNECTED' && (
					<button onClick={() => onConnect(user.id)}
						className="px-4 py-1.5 bg-indigo-600 text-white font-medium rounded-full hover:bg-indigo-700 transition duration-150 ease-in-out shadow-sm transform hover:scale-105 text-sm">
						Connect
					</button>
				)}

				{type === 'receivedRequest' && (
					<>
						<button
							onClick={() => onAcceptOrReject(user.requestId, 'accept')}
							className="px-4 py-1.5 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition duration-150 ease-in-out shadow-sm transform hover:scale-105 text-sm mr-2"
						>
							Accept
						</button>
						<button
							onClick={() => onAcceptOrReject(user.requestId, 'reject')}
							className="px-4 py-1.5 bg-gray-300 text-gray-800 font-medium rounded-full hover:bg-gray-400 transition duration-150 ease-in-out shadow-sm transform hover:scale-105 text-sm"
						>
							Ignore
						</button>
					</>
				)}

				{type === 'sentRequest' && (
					<button
						className="px-4 py-1.5 bg-yellow-500 text-white font-medium rounded-full text-sm cursor-not-allowed opacity-80"
						disabled
					>
						Pending
					</button>
				)}

				{type === 'myConnection' && (
					<button
						className="px-4 py-1.5 bg-green-500 text-white font-medium rounded-full text-sm cursor-not-allowed opacity-80"
						disabled
					>
						Connected
					</button>
				)}

				{type === 'suggestion' && (
					<button
						onClick={() => onConnect(user.id)}
						className="px-4 py-1.5 bg-indigo-600 text-white font-medium rounded-full hover:bg-indigo-700 transition duration-150 ease-in-out shadow-sm transform hover:scale-105 text-sm"
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
	const [users, setUsers] = useState([]); // All users fetched from API
	const [receivedRequests, setReceivedRequests] = useState([]);
	const [sentRequests, setSentRequests] = useState([]);
	const [myConnections, setMyConnections] = useState([]);
	const [suggestions, setSuggestions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [successMessage, setSuccessMessage] = useState(null); // New state for success messages
	// Removed initialLoadPerformed, as it's no longer needed

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

			if (query) {
				// If there's a search query, show only search results
				setUsers(data.users);
				setReceivedRequests([]);
				setSentRequests([]);
				setMyConnections([]);
				setSuggestions([]);
			} else {
				// If no search query, categorize users into sections
				const received = [];
				const sent = [];
				const connected = [];
				const suggest = [];

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

				setReceivedRequests(received);
				setSentRequests(sent);
				setMyConnections(connected);
				setSuggestions(suggest);
				setUsers([]); // Clear generic users state when categorized
			}
		} catch (err) {
			console.error("Failed to fetch users:", err);
			setError(err.message || "Failed to load network data. Please try again.");
			setUsers([]); // Clear all lists on error
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

	return (
		<>
			<Navbar session={session} router={router} />
			<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8 pt-4">
				<div className="max-w-4xl mx-auto">
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


					{/* Search Results Section (visible only when currentSearchQuery is active) */}
					{currentSearchQuery ? (
						<>
							<h2 className="text-xl font-semibold text-gray-700 mb-6 border-b pb-2">
								<span className="font-bold text-indigo-600">{users.length}</span> results found for "{currentSearchQuery}"
							</h2>
							{users.length === 0 && !loading && !error ? (
								<div className="text-center py-10 bg-white shadow-xl rounded-2xl border border-gray-200">
									<p className="text-gray-600 text-lg">No users found matching "{currentSearchQuery}".</p>
								</div>
							) : (
								<div className="space-y-4">
									{users.map((user) => (
										<UserCard key={user.id} user={user} type="searchResult" onConnect={handleConnect} onAcceptOrReject={handleAcceptOrRejectRequest} />
									))}
								</div>
							)}
						</>
					) : (
						// Categorized Sections (visible when no search query)
						<>
							{/* Received Pending Requests */}
							<Section title="Received Requests" users={receivedRequests} type="receivedRequest" onConnect={handleConnect} onAcceptOrReject={handleAcceptOrRejectRequest} />

							{/* Sent Pending Requests */}
							<Section title="Sent Requests" users={sentRequests} type="sentRequest" onConnect={handleConnect} onAcceptOrReject={handleAcceptOrRejectRequest} />

							{/* My Connections */}
							<Section title="My Connections" users={myConnections} type="myConnection" onConnect={handleConnect} onAcceptOrReject={handleAcceptOrRejectRequest} />

							{/* People You May Know (Suggestions) */}
							<Section title="People You May Know" users={suggestions} type="suggestion" onConnect={handleConnect} onAcceptOrReject={handleAcceptOrRejectRequest} />

							{receivedRequests.length === 0 && sentRequests.length === 0 && myConnections.length === 0 && suggestions.length === 0 && !loading && !error && (
								<div className="text-center py-10 bg-white shadow-xl rounded-2xl border border-gray-200">
									<p className="text-gray-600 text-lg">Your network is empty. Start searching for people to connect with using the search bar above!</p>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</>
	);
}
