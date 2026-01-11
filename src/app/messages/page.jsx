"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import io from 'socket.io-client'; // Import socket.io-client
import Navbar from '../../components/NavBar';

export default function MessagingPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const [conversations, setConversations] = useState([]);
	const [filteredConversations, setFilteredConversations] = useState([]);
	const [selectedConversation, setSelectedConversation] = useState(null);
	const [messageInput, setMessageInput] = useState("");
	const [loadingConversations, setLoadingConversations] = useState(true);
	const [error, setError] = useState(null);
	const [searchTerm, setSearchTerm] = useState('');

	// New state for multi-selection
	const [selectedConversationIds, setSelectedConversationIds] = useState([]);
	// New state to track hidden potential conversations
	const [hiddenPotentialConversationIds, setHiddenPotentialConversationIds] = useState([]);


	// New Conversation Modal states
	const [isNewConversationModalOpen, setIsNewConversationModalOpen] = useState(false);
	const [selectedFriends, setSelectedFriends] = useState([]); // Friends selected for new convo
	const [newChatFriendSearchTerm, setNewChatFriendSearchTerm] = useState(''); // Search term for new chat friends
	const [newChatSearchableFriends, setNewChatSearchableFriends] = useState([]); // Search results for new chat friends
	const [newChatLoadingFriends, setNewChatLoadingFriends] = useState(false);
	const [newChatFriendsError, setNewChatFriendsError] = useState(null);
	const [isCreatingConversation, setIsCreatingConversation] = useState(false);

	// Participant management states
	const [editingParticipants, setEditingParticipants] = useState([]); // Temporary list for editing (those who WILL be in convo)
	// Removed stagedRemovedParticipants state as per user request.
	const [manageFriendSearchTerm, setManageFriendSearchTerm] = useState(''); // Search term for managing participants
	const [manageSearchableFriends, setManageSearchableFriends] = useState([]); // Search results for managing participants
	const [loadingManageFriends, setLoadingManageFriends] = useState(false);
	const [manageError, setManageError] = useState(null);
	const [isSavingParticipants, setIsSavingParticipants] = useState(false);

	// State for delete confirmation modal (now handles single or multiple)
	const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
	// conversationToDelete will now always store an array of conversation IDs (strings)
	const [conversationToDelete, setConversationToDelete] = useState([]);


	const messagesEndRef = useRef(null);
	const socketRef = useRef(null);
	const currentSelectedIdRef = useRef(null); // Ref to hold the ID of the conversation that was selected before a re-fetch

	const dummyUsers = {
		'user1': { name: 'Alice Johnson', imageUrl: 'https://placehold.co/40x40/ADD8E6/000000?text=AJ' },
		'user2': { name: 'Bob Williams', imageUrl: 'https://placehold.co/40x40/FFB6C1/000000?text=BW' },
		'user3': { name: 'Charlie Brown', imageUrl: 'https://placehold.co/40x40/FFD700/000000?text=CB' },
	};

	const getParticipantNameAndImage = useCallback((conversation) => {
		if (!session?.user?.id || !conversation?.participants) return { name: 'Unknown', imageUrl: '' };
		// For 2-person chats, find the other participant. For group chats, return a group name.
		const otherParticipants = conversation.participants.filter(p => p.id !== session.user.id);

		if (otherParticipants.length === 1) { // Two-person chat
			const otherParticipant = otherParticipants[0];
			return {
				name: otherParticipant?.name || 'Unknown User',
				imageUrl: otherParticipant?.image || dummyUsers[otherParticipant?.id]?.imageUrl || `https://placehold.co/40x40/A78BFA/ffffff?text=${otherParticipant?.name ? otherParticipant.name[0].toUpperCase() : 'U'}`
			};
		} else if (otherParticipants.length > 1) { // Group chat
			// Filter out null/undefined names before joining
			const names = otherParticipants.map(p => p.name).filter(Boolean).join(', ');
			return {
				name: `Group Chat (${otherParticipants.length + 1})`, // Include current user in count
				imageUrl: `https://placehold.co/40x40/8A2BE2/FFFFFF?text=GC`, // Generic group chat icon
				participantNames: names // Store names for tooltip or detailed view
			};
		} else { // Self-chat or error
			return { name: session.user.name || 'My Notes', imageUrl: session.user.image || `https://placehold.co/40x40/A78BFA/ffffff?text=${session.user.name ? session.user.name[0].toUpperCase() : 'U'}` };
		}
	}, [session?.user?.id, session?.user?.name, session?.user?.image, dummyUsers]);

	// Function to fetch conversations from the backend
	const fetchConversations = useCallback(async () => {
		try {
			setLoadingConversations(true);
			setError(null);

			const res = await fetch(`/api/conversations`);
			if (!res.ok) {
				throw new Error(`Failed to fetch conversations: ${res.statusText}`);
			}
			const data = await res.json();
			console.log('Fetched conversations from API:', data.conversations);

			const processedConversations = data.conversations.map(conv => ({
				...conv,
				messages: conv.messages || [],
				timestamp: conv.timestamp || new Date().toISOString()
			})).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

			const filteredForHidden = processedConversations.filter(conv =>
				!conv.isNewChat || !hiddenPotentialConversationIds.includes(conv?.id)
			);

			setConversations(processedConversations);
			setFilteredConversations(filteredForHidden);

			return processedConversations;

		} catch (err) {
			console.error("Error fetching conversations:", err);
			setError("Could not load conversations. Please try again.");
			return [];
		} finally {
			setLoadingConversations(false);
		}
	}, [hiddenPotentialConversationIds]);

	useEffect(() => {
		if (conversations.length > 0) {
			setSelectedConversation(prevSelected => {
				let newSelected = null;
				if (prevSelected) {
					// Try to find the previously selected conversation in the updated list
					newSelected = conversations.find(conv => conv.id === prevSelected.id);
				}

				if (!newSelected) {
					// If no previous selection, or if it's no longer in the list,
					// select the first existing conversation (not 'new chat')
					newSelected = conversations.find(conv => !conv.isNewChat) || conversations[0];
				}

				currentSelectedIdRef.current = newSelected?.id || null;
				return newSelected;
			});
		} else {
			setSelectedConversation(null); // No conversations, so deselect
		}
	}, [conversations]); // This effect depends on 'conversations'

	// Effect for initial data fetch and Socket.IO setup
	useEffect(() => {
		if (status === "loading") {
			setLoadingConversations(true); // Ensure loading indicator is shown while session is loading
			return;
		}
		if (status === "unauthenticated") {
			router.push("/auth/login");
			return;
		}

		// DEBUG: Log the full session object and status just before the critical check
		console.log("DEBUG (messages/page.jsx): useSession() values:");
		console.log("  Status:", status);
		console.log("  Session object:", session);
		console.log("  Session.user:", session?.user);
		console.log("  Session.jwt:", session?.jwt);


		// Now, status is "authenticated". Check for the required session properties.
		const currentUserId = session?.user?.id;
		const currentJwt = session?.jwt;

		if (!currentUserId || !currentJwt) {
			console.warn("DEBUG: Authenticated session data incomplete. Waiting for full session. userId:", currentUserId, "jwt present:", !!currentJwt);
			setError("Authentication data not fully loaded. Please wait..."); // More user-friendly message
			setLoadingConversations(true); // Keep showing loading while waiting for full data
			return; // Return and wait for next render cycle when data might be complete
		}

		let isMounted = true;

		const setupChat = async () => {
			try {
				await fetchConversations(); // Perform initial fetch of conversations, which now also sets selectedConversation

				if (!isMounted) return;

				// Initialize socket only if it's not already initialized
				if (!socketRef.current) {
					const socket = io(process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3001', {
						auth: { token: currentJwt }, // Use currentJwt for auth
						query: { userId: currentUserId },
						transports: ['websocket']
					});
					socketRef.current = socket;

					socket.on('connect', () => {
						console.log('Connected to Socket.IO server:', socket.id);
					});

					socket.on('disconnect', () => {
						console.log('Disconnected from Socket.IO server');
					});

					socket.on('newMessage', (message) => {
						console.log('New message received from socket:', message);

						// Only update deletion state if there are conversations to delete
						if (conversationToDelete && conversationToDelete.length > 0) {
							setConversations(prevConversations =>
								prevConversations.filter(conv => !conversationToDelete.includes(conv.id))
							);
							setFilteredConversations(prevFiltered =>
								prevFiltered.filter(conv => !conversationToDelete.includes(conv.id))
							);
							setSelectedConversation(prevSelected => {
								if (prevSelected && conversationToDelete.includes(prevSelected.id)) {
									return null;
								}
								return prevSelected;
							});
							setSelectedConversationIds([]); // Clear selections after deletion
						}

						// Process the incoming message normally
						setSelectedConversation(prevSelected => {
							if (prevSelected && prevSelected.id === message.conversationId) {
								const messageExists = prevSelected.messages.some(msg => msg.id === message.id);
								if (messageExists) {
									return prevSelected;
								}
								return {
									...prevSelected,
									messages: [...(prevSelected.messages || []), message],
									lastMessage: message.content,
									timestamp: message.createdAt, // Changed: use the message's original timestamp
									isNewChat: false // CRITICAL FIX: Ensure selected conversation is marked as not new
								};
							}
							return prevSelected;
						});


					});

					// NEW: Listen for 'userLeft' event to notify when someone leaves the chat
					socket.on('userLeft', (data) => {
						console.log('User left event received:', data);
						// data should include conversationId and userName
						setSelectedConversation(prevSelected => {
							if (prevSelected && prevSelected.id === data.conversationId) {
								const systemMessage = {
									id: 'system-' + Date.now(), // unique ID for system messages
									senderId: 'system',         // flag as system message
									content: `${data.userName} has left the chat.`,
									createdAt: new Date().toISOString()
								};
								return {
									...prevSelected,
									messages: [...(prevSelected.messages || []), systemMessage]
								};
							}
							return prevSelected;
						});
					});
				}
			} catch (err) {
				if (isMounted) {
					console.error("Error setting up chat or fetching conversations:", err);
					setError("Could not load conversations or connect to chat service.");
				}
			} finally {
				if (isMounted) {
					setLoadingConversations(false); // Ensure loading is turned off once initial data is fetched
				}
			}
		};

		setupChat();

		return () => {
			isMounted = false;
			if (socketRef.current && socketRef.current.connected) {
				socketRef.current.disconnect();
				socketRef.current = null;
			}
		};
	}, [status, router, session?.user?.id, session?.jwt, fetchConversations]); // Added fetchConversations to dependencies


	useEffect(() => {
		if (socketRef.current && socketRef.current.connected && conversations.length > 0) {
			conversations.filter(c => !c.isNewChat && !c.id.startsWith('potential-')).forEach(conv => {
				socketRef.current.emit('joinRoom', conv.id);
			});
		}
	}, [conversations]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [selectedConversation?.messages]);

	// Modify the scroll effect to auto-scroll when there are many messages.
	useEffect(() => {
		if (selectedConversation?.messages && selectedConversation.messages.length >= 5) {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [selectedConversation?.messages]);

	useEffect(() => {
		if (searchTerm) {
			const lowerCaseSearchTerm = searchTerm.toLowerCase();
			// Apply search term filtering to the already filtered conversations (by hidden status)
			const searchedAndFiltered = conversations.filter(conv => {
				const otherParticipant = conv.participants.find(p => p.id !== session.user.id);
				const matchesSearch = otherParticipant?.name.toLowerCase().includes(lowerCaseSearchTerm);
				const isHiddenPotential = conv.isNewChat && hiddenPotentialConversationIds.includes(conv.id);
				return matchesSearch && !isHiddenPotential;
			});
			setFilteredConversations(searchedAndFiltered);
		} else {
			// If no search term, just apply hidden potential filtering
			setFilteredConversations(conversations.filter(conv =>
				!conv.isNewChat || !hiddenPotentialConversationIds.includes(conv.id)
			));
		}
	}, [searchTerm, conversations, session?.user?.id, hiddenPotentialConversationIds]);


	const handleSendMessage = useCallback(async (e) => {
		e.preventDefault();
		if (messageInput.trim() === "" || !selectedConversation || !session?.user?.id) return;

		const currentUserId = session.user.id;
		let finalConversationId = selectedConversation.id;
		let conversationCreatedSuccessfully = false;

		// --- Step 1: If it's a new chat, create the conversation on the backend FIRST ---
		if (selectedConversation.isNewChat) {
			try {
				console.log("Attempting to create new conversation for new chat...");
				const otherParticipant = selectedConversation.participants.find(p => p.id !== currentUserId);
				const createConvRes = await fetch('/api/conversations', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ participantIds: [currentUserId, otherParticipant.id] }),
				});

				if (!createConvRes.ok) {
					const rawText = await createConvRes.text();
					let errorData;
					let errorMessage = 'Failed to create new conversation.';
					try {
						errorData = JSON.parse(rawText);
						errorMessage = errorData.message || errorMessage;
					} catch (jsonParseError) {
						errorMessage = `Failed to create new conversation: ${createConvRes.statusText || 'Unknown error'}. Raw response: ${rawText.substring(0, 200)}`;
						console.error("JSON parse error during new conversation creation:", jsonParseError, "Raw response:", rawText);
					}
					throw new Error(errorMessage);
				}

				const newConvData = await createConvRes.json();
				finalConversationId = newConvData.conversation.id; // Get the real ID
				conversationCreatedSuccessfully = true;

				console.log(`New conversation created with ID: ${finalConversationId}`);
				// If a new conversation is created, remove its ID from hiddenPotentialConversationIds
				setHiddenPotentialConversationIds(prev => prev.filter(id => id !== selectedConversation.id));

				// Update selectedConversation with the real backend data, ensuring messages are loaded
				// This is important so that subsequent messages are sent to the correct ID
				setSelectedConversation(newConvData.conversation);
				currentSelectedIdRef.current = newConvData.conversation.id;

				// Ensure the socket joins the room with the actual conversation ID
				if (socketRef.current && socketRef.current.connected) {
					socketRef.current.emit('joinRoom', finalConversationId);
					console.log(`Socket joined room: ${finalConversationId}`);
				}

				// Re-fetch all conversations to update the sidebar and ensure the new conversation is visible
				// This is done after setting selectedConversation to ensure the newly created conversation
				// is prioritized in the sidebar and accurately reflects its non-new status.
				await fetchConversations();


			} catch (err) {
				console.error("Error creating new conversation for message:", err);
				setError(err.message || "Failed to start new conversation.");
				return; // Stop message sending if conversation creation fails
			}
		}

		// --- Step 2: Construct and optimistically add the message ---
		const newMessage = {
			id: crypto.randomUUID(), // Generate a unique ID for the message
			conversationId: finalConversationId, // Use the real ID, whether new or existing
			senderId: currentUserId,
			content: messageInput.trim(),
			createdAt: new Date().toISOString(), // Timestamp for optimistic UI update
			// Include sender's name and image for optimistic UI
			sender: {
				id: currentUserId,
				name: session.user.name,
				image: session.user.image,
			}
		};

		// Optimistically update the UI with the new message
		setSelectedConversation(prevSelected => {
			if (!prevSelected) return prevSelected;
			return {
				...prevSelected,
				messages: [...(prevSelected.messages || []), newMessage],
				lastMessage: newMessage.content,
				timestamp: newMessage.createdAt,
				isNewChat: false // Mark as not new once a message is sent
			};
		});

		// Update the main conversations list optimistically as well
		setConversations(prevConversations => {
			const targetConvIndex = prevConversations.findIndex(conv => conv.id === finalConversationId);
			if (targetConvIndex > -1) {
				const targetConv = prevConversations[targetConvIndex];
				const updatedMessages = [...(targetConv.messages || []), newMessage];
				const updatedConv = {
					...targetConv,
					messages: updatedMessages,
					lastMessage: newMessage.content,
					timestamp: newMessage.createdAt,
					isNewChat: false
				};
				const newConversations = [...prevConversations];
				newConversations[targetConvIndex] = updatedConv;
				// Sort to bring the conversation with the new message to the top
				return newConversations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
			} else {
				// This case should ideally not happen if 'finalConversationId' is correctly set,
				// but as a fallback, if the conversation is not found, a re-fetch might be needed.
				console.warn(`Optimistic update failed: Conversation with ID ${finalConversationId} not found in state.`);
				return prevConversations; // Return current state, fetchConversations will resolve this
			}
		});

		// Scroll to the bottom of the chat
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); // Removed invalid characters
		setMessageInput(""); // Clear the input field

		// --- Step 3: Emit the message via Socket.IO ---
		if (socketRef.current && socketRef.current.connected) {
			console.log('Emitting message via socket:', newMessage);
			socketRef.current.emit('sendMessage', newMessage);
		} else {
			console.error("Socket not connected. Message not sent via WebSocket.");
			setError("Not connected to chat. Message might not be sent in real-time.");
		}
		// NEW: Persist the message via API so it is saved to the database
		try {
			await fetch('/api/messages', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newMessage),
			});
		} catch (err) {
			console.error("Failed to persist message:", err);
		}
	}, [messageInput, selectedConversation, session?.user?.id, session?.user?.name, session?.user?.image, fetchConversations, hiddenPotentialConversationIds]);

	// NEW/MODIFIED: openConfirmDeleteModal - sets IDs for deletion and opens the modal
	const openConfirmDeleteModal = useCallback((idsToDelete) => {
		if (idsToDelete && idsToDelete.length > 0) {
			console.log(idsToDelete);
			setConversationToDelete(idsToDelete);
			setIsConfirmDeleteModalOpen(true);
		} else {
			console.warn("Attempted to open delete modal with no conversation IDs.");
		}
	}, []);

	// NEW: closeConfirmDeleteModal - closes the modal and clears the stored IDs
	const closeConfirmDeleteModal = useCallback(() => {
		setIsConfirmDeleteModalOpen(false);
		setConversationToDelete([]); // Clear the IDs once the modal is closed
	}, []);

	// NEW: confirmDeleteAction - if no conversation is selected, exit without updating UI optimistically
	const confirmDeleteAction = useCallback(async () => {
		if (!session?.user?.id || conversationToDelete.length === 0) {
			console.warn("No conversations selected for deletion. Nothing to delete.");
			return; // Exit early without making any optimistic UI changes
		}

		setError(null);
		setLoadingConversations(true);
		try {
			const res = await fetch(`/api/conversations`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ conversationId: conversationToDelete }),
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || `Failed to delete conversations: ${res.statusText}`);
			}

			const data = await res.json();
			console.log('Delete API response:', data);
			await fetchConversations(); // Update UI once deletion is confirmed by backend
		} catch (err) {
			console.error("Error deleting conversations:", err);
			setError("Could not delete conversations. Please try again.");
			await fetchConversations();
		} finally {
			setLoadingConversations(false);
		}
	}, [session?.user?.id, conversationToDelete, closeConfirmDeleteModal, fetchConversations]);


	return (
		<div className="min-h-screen bg-gray-100 dark:bg-slate-900 font-sans antialiased text-gray-900 dark:text-slate-100 flex flex-col">
			<Navbar session={session} router={router} />

			<div className="flex flex-1 overflow-hidden">
				{/* Left Sidebar - Conversations List */}
				<aside className="w-80 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col shadow-sm">
					<div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
						<h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">Messages</h2>
						<div className="flex space-x-2">
							{selectedConversationIds.length > 0 && (
								<button
									onClick={() => openConfirmDeleteModal(selectedConversationIds)} // Pass the array of selected IDs
									className="p-2 rounded-full text-red-600 hover:bg-red-100 transition"
									title="Delete Selected Conversations"
									aria-label="Delete Selected Conversations"
								>
									<i className="fas fa-trash-alt"></i>
								</button>
							)}
							<button
								onClick={() => setIsNewConversationModalOpen(true)}
								className="p-2 rounded-full text-indigo-600 hover:bg-indigo-100 transition"
								title="Start New Conversation"
								aria-label="Start New Conversation"
							>
								<i className="fas fa-plus"></i>
							</button>
						</div>
					</div>
					<div className="p-4 border-b border-gray-200 dark:border-slate-700">
						<input
							type="text"
							placeholder="Search conversations..."
							className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>
					{loadingConversations ? (
						<div className="flex justify-center items-center h-full">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
						</div>
					) : error ? (
						<div className="p-4 text-center text-red-500">{error}</div>
					) : (
						<ul className="flex-1 overflow-y-auto custom-scrollbar">
							{filteredConversations.length === 0 ? (
								<li className="p-4 text-gray-500 text-center">No conversations found.</li>
							) : (
								filteredConversations.map((conversation) => {
									const { name, imageUrl, participantNames } = getParticipantNameAndImage(conversation);
									const isSelected = selectedConversation?.id === conversation.id;
									const isMultiSelected = selectedConversationIds.includes(conversation.id);
									const otherParticipants = conversation.participants?.filter(p => p.id !== session?.user?.id) || [];
									const isTwoPersonChat = otherParticipants.length === 1;
									const otherParticipantId = isTwoPersonChat ? otherParticipants[0]?.id : null;

									return (
										<li
											key={conversation.id}
											className={`flex items-center p-4 border-b border-gray-100 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-indigo-600' : ''}`}
											onClick={() => {
												if (!isMultiSelected) { // Only change selection if not in multi-select mode
													setSelectedConversation(conversation);
													setSelectedConversationIds([]); // Clear multi-selection on single click
												}
											}}
											onContextMenu={(e) => {
												e.preventDefault(); // Prevent default browser context menu
												// Toggle multi-selection on right click
												setSelectedConversationIds(prev =>
													prev.includes(conversation.id)
														? prev.filter(id => id !== conversation.id)
														: [...prev, conversation.id]
												);
											}}
											title={conversation.participants.length > 2 ? `Group: ${participantNames}` : ''}
										>
											<input
												type="checkbox"
												className="mr-3 h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
												checked={isMultiSelected}
												onChange={(e) => {
													e.stopPropagation(); // Prevent li onClick from firing
													setSelectedConversationIds(prev =>
														prev.includes(conversation.id)
															? prev.filter(id => id !== conversation.id)
															: [...prev, conversation.id]
													);
												}}
											/>
											<img
												src={imageUrl}
												alt={name}
												className={`w-10 h-10 rounded-full object-cover mr-3 flex-shrink-0 ${isTwoPersonChat ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all' : ''}`}
												onClick={(e) => {
													if (isTwoPersonChat && otherParticipantId) {
														e.stopPropagation();
														router.push(`/profile/${otherParticipantId}`);
													}
												}}
												onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/40x40/A78BFA/ffffff?text=${name[0].toUpperCase()}`; }}
											/>
											<div className="flex-1 overflow-hidden">
												<h3 className="font-semibold text-gray-800 dark:text-slate-100 truncate">{name}</h3>
												{conversation.lastMessage && (
													<p className="text-sm text-gray-500 dark:text-slate-400 truncate">{conversation.lastMessage}</p>
												)}
											</div>
											<span className="text-xs text-gray-400 dark:text-slate-500 ml-2 flex-shrink-0">
												{conversation.timestamp ? new Date(conversation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
											</span>
										</li>
									);
								})
							)}
						</ul>
					)}
				</aside>

				{/* Right Panel - Chat Window */}
				<main className="flex-1 flex flex-col bg-gray-50 dark:bg-slate-900">
					{!selectedConversation ? (
						<div className="flex-1 flex items-center justify-center text-gray-500 dark:text-slate-400 text-lg">
							Select a conversation to start chatting.
						</div>
					) : (
						<>
							{/* Chat Header */}
							<div className="sticky top-0 z-10 bg-white dark:bg-slate-800 p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between shadow-sm">
								{(() => {
									const headerOtherParticipants = selectedConversation.participants?.filter(p => p.id !== session?.user?.id) || [];
									const headerIsTwoPersonChat = headerOtherParticipants.length === 1;
									const headerOtherParticipantId = headerIsTwoPersonChat ? headerOtherParticipants[0]?.id : null;
									return (
										<div className="flex items-center">
											<img
												src={getParticipantNameAndImage(selectedConversation).imageUrl}
												alt={getParticipantNameAndImage(selectedConversation).name}
												className={`w-10 h-10 rounded-full object-cover mr-3 ${headerIsTwoPersonChat ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all' : ''}`}
												onClick={() => {
													if (headerIsTwoPersonChat && headerOtherParticipantId) {
														router.push(`/profile/${headerOtherParticipantId}`);
													}
												}}
												onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/40x40/A78BFA/ffffff?text=${getParticipantNameAndImage(selectedConversation).name[0].toUpperCase()}`; }}
											/>
											<div>
												<h3
													className={`font-bold text-gray-800 dark:text-slate-100 ${headerIsTwoPersonChat ? 'cursor-pointer hover:text-blue-600 hover:underline' : ''}`}
													onClick={() => {
														if (headerIsTwoPersonChat && headerOtherParticipantId) {
															router.push(`/profile/${headerOtherParticipantId}`);
														}
													}}
												>{getParticipantNameAndImage(selectedConversation).name}</h3>
										{selectedConversation.participants.length > 2 && (
											<p className="text-sm text-gray-500 dark:text-slate-400 truncate">
												{getParticipantNameAndImage(selectedConversation).participantNames}
											</p>
										)}
									</div>
								</div>
									);
								})()}
							</div>

							{/* Message List */}
							<div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col-reverse">
								<div ref={messagesEndRef} /> {/* Scroll to this element */}
								{selectedConversation.messages.slice().reverse().map((message) => (
									<div
										key={message.id}
										className={`flex mb-4 ${message.senderId === session.user.id ? 'justify-end' : 'justify-start'}`}
									>
										<div
											className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow ${message.senderId === session.user.id
												? 'bg-indigo-600 text-white rounded-br-none'
												: 'bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 rounded-bl-none'
												}`}
										>
											{message.senderId !== session.user.id && (
												<p className="font-semibold text-xs mb-1 text-gray-600 dark:text-slate-300">
													{message.sender?.name || 'Unknown'}
												</p>
											)}
											<p className="text-sm">{message.content}</p>
											<span className={`block text-right text-xs mt-1 ${message.senderId === session.user.id ? 'text-indigo-200' : 'text-gray-400 dark:text-slate-400'}`}>
												{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
											</span>
										</div>
									</div>
								))}
							</div>

							{/* Message Input */}
							<form onSubmit={handleSendMessage} className="bg-white dark:bg-slate-800 p-4 border-t border-gray-200 dark:border-slate-700 flex items-center shadow-md">
								<input
									type="text"
									placeholder="Type a message..."
									className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-full focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400"
									value={messageInput}
									onChange={(e) => setMessageInput(e.target.value)}
								/>
								<button
									type="submit"
									className="ml-3 px-5 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition duration-150 ease-in-out flex items-center justify-center"
									disabled={!messageInput.trim()}
								>
									<i className="fas fa-paper-plane mr-2"></i> Send
								</button>
							</form>
						</>
					)}
				</main>
			</div>

			{/* Confirmation Delete Modal */}
			{isConfirmDeleteModalOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 m-4 max-w-sm w-full animate-fade-in-up">
						<h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-4">Confirm Deletion</h3>
						<p className="text-gray-700 dark:text-slate-300 mb-6">
							Are you sure you want to delete {conversationToDelete.length > 1 ? `${conversationToDelete.length} conversations` : "this conversation"}? This action cannot be undone.
						</p>
						<div className="flex justify-end space-x-3">
							<button
								onClick={closeConfirmDeleteModal}
								className="px-4 py-2 rounded-lg text-gray-600 dark:text-slate-300 border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
							>
								Cancel
							</button>
							<button
								onClick={confirmDeleteAction}
								className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
							>
								Delete
							</button>
						</div>
					</div>
				</div>
			)}

			{/* New Conversation Modal */}
			{isNewConversationModalOpen && (
				<NewConversationModal
					isOpen={isNewConversationModalOpen}
					onClose={() => {
						setIsNewConversationModalOpen(false);
						setSelectedFriends([]); // Clear selected friends on close
						setNewChatFriendSearchTerm('');
						setNewChatSearchableFriends([]);
						setNewChatFriendsError(null);
					}}
					onStartConversation={async (friendIds) => {
						if (!session?.user?.id) return;
						setIsCreatingConversation(true);
						try {
							const res = await fetch('/api/conversations', {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify({ participantIds: [session.user.id, ...friendIds] }),
							});
							if (!res.ok) {
								const errorData = await res.json();
								throw new Error(errorData.message || 'Failed to create conversation');
							}
							await fetchConversations(); // Re-fetch all conversations to show the new one
							setIsNewConversationModalOpen(false);
							setSelectedFriends([]);
							setNewChatFriendSearchTerm('');
							setNewChatSearchableFriends([]);
							// Optionally select the new conversation
							const newConvData = await res.json();
							setSelectedConversation(newConvData.conversation);
						} catch (err) {
							console.error("Error creating new conversation:", err);
							setNewChatFriendsError(err.message || "Failed to create conversation.");
						} finally {
							setIsCreatingConversation(false);
						}
					}}
					selectedFriends={selectedFriends}
					setSelectedFriends={setSelectedFriends}
					newChatFriendSearchTerm={newChatFriendSearchTerm}
					setNewChatFriendSearchTerm={setNewChatFriendSearchTerm}
					newChatSearchableFriends={newChatSearchableFriends}
					setNewChatSearchableFriends={setNewChatSearchableFriends}
					newChatLoadingFriends={newChatLoadingFriends}
					setNewChatLoadingFriends={setNewChatLoadingFriends}
					newChatFriendsError={newChatFriendsError}
					setNewChatFriendsError={setNewChatFriendsError}
					currentUserId={session?.user?.id}
				/>
			)}

			{/* Confirm Delete Modal */}
			{isConfirmDeleteModalOpen && (
				<ConfirmDeleteModal
					isOpen={isConfirmDeleteModalOpen}
					onClose={() => setIsConfirmDeleteModalOpen(false)}
					onConfirm={async () => {
						try {
							for (const convId of conversationToDelete) {
								const res = await fetch(`/api/conversations/${convId}`, { method: 'DELETE' });
								if (!res.ok) {
									throw new Error(`Failed to delete conversation ${convId}: ${res.statusText}`);
								}
							}
							await fetchConversations(); // Re-fetch to update the list
							setSelectedConversation(null); // Deselect if deleted
							setSelectedConversationIds([]); // Clear multi-selection
							setIsConfirmDeleteModalOpen(false);
							setConversationToDelete([]); // Clear deleted IDs
						} catch (err) {
							console.error("Error deleting conversation(s):", err);
							setError(`Failed to delete conversation(s): ${err.message}`);
						}
					}}
					itemType={conversationToDelete.length > 1 ? "conversations" : "conversation"}
				/>
			)}
		</div>
	);
}

// --- Modals (NewConversationModal, ConfirmDeleteModal) ---
// These components are self-contained and assume the necessary data/props are passed to them.

function NewConversationModal({
	isOpen, onClose, onStartConversation,
	selectedFriends, setSelectedFriends,
	newChatFriendSearchTerm, setNewChatFriendSearchTerm,
	newChatSearchableFriends, setNewChatSearchableFriends,
	newChatLoadingFriends, setNewChatLoadingFriends,
	newChatFriendsError, setNewChatFriendsError,
	currentUserId,
}) {
	const debounceTimeoutRef = useRef(null);

	const fetchFriends = useCallback(async (search) => {
		if (!currentUserId || !search || search.trim().length < 2) {
			setNewChatSearchableFriends([]);
			return;
		}
		setNewChatLoadingFriends(true);
		setNewChatFriendsError(null);
		try {
			const res = await fetch(`/api/users/search?q=${encodeURIComponent(search)}`);
			if (!res.ok) throw new Error("Failed to search users.");
			const data = await res.json();
			// Only filter out the current user from the search results
			const filtered = data.users.filter(user => user.id !== currentUserId);
			setNewChatSearchableFriends(filtered);
		} catch (err) {
			setNewChatFriendsError(err.message || "Error searching for friends.");
		} finally {
			setNewChatLoadingFriends(false);
		}
	}, [currentUserId, setNewChatSearchableFriends, setNewChatLoadingFriends, setNewChatFriendsError]);

	const handleSearchChange = (e) => {
		const term = e.target.value;
		setNewChatFriendSearchTerm(term);
		if (debounceTimeoutRef.current) {
			clearTimeout(debounceTimeoutRef.current);
		}
		debounceTimeoutRef.current = setTimeout(() => {
			fetchFriends(term);
		}, 300); // Debounce search
	};

	const handleToggleFriend = (friend) => {
		setSelectedFriends(prev => {
			if (prev.some(f => f.id === friend.id)) {
				return prev.filter(f => f.id !== friend.id);
			} else {
				return [...prev, friend];
			}
		});
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
			<div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-lg p-6 animate-scale-in">
				<h3 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-4 border-b dark:border-slate-700 pb-2">Start New Conversation</h3>
				<div className="space-y-4">
					<div>
						<label htmlFor="friendSearch" className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Search for friends</label>
						<input
							type="text"
							id="friendSearch"
							className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
							placeholder="Search by name or email"
							value={newChatFriendSearchTerm}
							onChange={handleSearchChange}
						/>
						{newChatFriendsError && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{newChatFriendsError}</p>}
					</div>

					{newChatLoadingFriends ? (
						<div className="flex justify-center items-center py-4">
							<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
						</div>
					) : (
						<div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg p-2 custom-scrollbar">
							{newChatSearchableFriends.length === 0 && newChatFriendSearchTerm.length >= 2 ? (
								<p className="text-gray-500 dark:text-slate-400 text-sm text-center py-2">No matching users found.</p>
							) : newChatSearchableFriends.length === 0 && newChatFriendSearchTerm.length < 2 ? (
								<p className="text-gray-500 dark:text-slate-400 text-sm text-center py-2">Start typing to search for friends.</p>
							) : (
								newChatSearchableFriends.map(friend => {
									const isAlreadySelected = selectedFriends.some(f => f.id === friend.id);
									return (
										<div
											key={friend.id}
											className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-md cursor-pointer"
											onClick={() => handleToggleFriend(friend)}
										>
											<div className="flex items-center">
												<img
													src={friend.image || `https://placehold.co/40x40/A78BFA/ffffff?text=${friend.name ? friend.name[0].toUpperCase() : 'U'}`}
													alt={friend.name}
													className="w-8 h-8 rounded-full object-cover mr-3"
												/>
												<span className="font-semibold">{friend.name}</span>
											</div>
											<input
												type="checkbox"
												checked={isAlreadySelected}
												onChange={() => handleToggleFriend(friend)}
												className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
											/>
										</div>
									);
								})
							)}
						</div>
					)}

					<div>
						<p className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Selected Participants:</p>
						{selectedFriends.length === 0 ? (
							<p className="text-gray-500 dark:text-slate-400 text-sm">No participants selected.</p>
						) : (
							<div className="flex flex-wrap gap-2">
								{selectedFriends.map(friend => (
									<span key={friend.id} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
										{friend.name}
										<button
											type="button"
											onClick={() => handleToggleFriend(friend)}
											className="ml-2 -mr-1 text-indigo-600 hover:text-indigo-800 focus:outline-none"
										>
											<i className="fas fa-times-circle text-xs"></i>
										</button>
									</span>
								))}
							</div>
						)}
					</div>
				</div>
				<div className="flex justify-end space-x-3 mt-6">
					<button
						onClick={onClose}
						className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-100 transition duration-150 ease-in-out"
					>
						Cancel
					</button>
					<button
						onClick={() => onStartConversation(selectedFriends.map(f => f.id))}
						disabled={selectedFriends.length === 0 || newChatLoadingFriends}
						className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
					>
						Start Conversation
					</button>
				</div>
			</div>
		</div>
	);
}

function ConfirmDeleteModal({ isOpen, onClose, onConfirm, itemType = "item" }) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
			<div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-sm p-6 animate-scale-in">
				<h3 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4 border-b dark:border-slate-700 pb-2">Confirm Deletion</h3>
				<p className="text-gray-700 dark:text-slate-300 mb-6">
					Are you sure you want to delete the selected {itemType}? This action cannot be undone.
				</p>
				<div className="flex justify-end space-x-3">
					<button
						onClick={onClose}
						className="px-5 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-300 font-semibold hover:bg-gray-100 dark:hover:bg-slate-700 transition duration-150 ease-in-out"
					>
						Cancel
					</button>
					<button
						onClick={onConfirm}
						className="px-5 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition duration-150 ease-in-out"
					>
						Delete
					</button>
				</div>
			</div>
		</div>
	);
}
