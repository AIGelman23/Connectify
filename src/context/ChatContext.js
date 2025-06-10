// src/context/ChatContext.js
"use client"; // This is crucial for client-side context

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import io from "socket.io-client";
import { useSession } from "next-auth/react"; // Use the real next-auth useSession
import { useRouter } from "next/navigation"; // Use the real next/navigation useRouter

// 1. Create the Context
export const ChatContext = createContext(null);

// 2. Create the Provider Component
export function ChatProvider({ children }) {
  const { data: session, status } = useSession(); // Access session here
  const router = useRouter(); // Access router here

  // These states will now live in the global context
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [error, setError] = useState(null);

  const socketRef = useRef(null); // Keep socket ref here for global management

  // Dummy users for participant display (if needed, otherwise remove)
  const dummyUsers = useRef({
    user1: {
      name: "Alice Johnson",
      imageUrl: "https://placehold.co/40x40/ADD8E6/000000?text=AJ",
    },
    user2: {
      name: "Bob Williams",
      imageUrl: "https://placehold.co/40x40/FFB6C1/000000?text=BW",
    },
    user3: {
      name: "Charlie Brown",
      imageUrl: "https://placehold.co/40x40/FFD700/000000?text=CB",
    },
  });

  // Helper for participant display
  const getParticipantNameAndImage = useCallback(
    (conversation) => {
      if (!session?.user?.id || !conversation?.participants)
        return { name: "Unknown", imageUrl: "" };
      const otherParticipants = conversation.participants.filter(
        (p) => p.id !== session.user.id
      );

      if (otherParticipants.length === 1) {
        // Two-person chat
        const otherParticipant = otherParticipants[0];
        return {
          name: otherParticipant?.name || "Unknown User",
          imageUrl:
            otherParticipant?.image ||
            dummyUsers.current[otherParticipant?.id]?.imageUrl ||
            `https://placehold.co/40x40/A78BFA/ffffff?text=${
              otherParticipant?.name
                ? otherParticipant.name[0].toUpperCase()
                : "U"
            }`,
        };
      } else if (otherParticipants.length > 1) {
        // Group chat
        const names = otherParticipants
          .map((p) => p.name)
          .filter(Boolean)
          .join(", ");
        return {
          name: `Group Chat (${otherParticipants.length + 1})`,
          imageUrl: `https://placehold.co/40x40/8A2BE2/FFFFFF?text=GC`,
          participantNames: names,
        };
      } else {
        // Self-chat or error
        return {
          name: session.user.name || "My Notes",
          imageUrl:
            session.user.image ||
            `https://placehold.co/40x40/A78BFA/ffffff?text=${
              session.user.name ? session.user.name[0].toUpperCase() : "U"
            }`,
        };
      }
    },
    [session?.user?.id, session?.user?.name, session?.user?.image]
  );

  // Function to fetch conversations from the backend
  const fetchConversations = useCallback(async () => {
    // Only attempt fetch if session is authenticated and user ID is available
    if (status !== "authenticated" || !session?.user?.id) {
      console.log(
        "ChatContext: Not authenticated or session user ID missing, skipping fetchConversations."
      );
      setConversations([]);
      setSelectedConversation(null); // Clear selected if not authenticated
      setLoadingConversations(false);
      return [];
    }

    setLoadingConversations(true);
    setError(null);

    try {
      // **IMPORTANT: Replace this with your actual API call to fetch conversations**
      // Example: const response = await fetch(`/api/conversations?userId=${session.user.id}`, {
      //   headers: { Authorization: `Bearer ${session.jwt}` }
      // });
      // if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      // const data = await response.json();
      // const fetchedConvs = data.conversations || [];

      // For now, using your mock data for demonstration
      const mockConversations = [
        {
          id: "conv1",
          participants: [
            {
              id: "mockUserId123",
              name: "Mock User",
              image: "https://placehold.co/40x40/ADD8E6/000000?text=MU",
            },
            {
              id: "user1",
              name: "Alice Johnson",
              image: "https://placehold.co/40x40/ADD8E6/000000?text=AJ",
            },
          ],
          messages: [
            {
              id: "msg1",
              senderId: "user1",
              content: "Hey there!",
              createdAt: new Date(Date.now() - 3600000).toISOString(),
            },
            {
              id: "msg2",
              senderId: "mockUserId123",
              content: "Hi Alice!",
              createdAt: new Date(Date.now() - 1800000).toISOString(),
            },
          ],
          lastMessage: "Hi Alice!",
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          isNewChat: false,
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          updatedAt: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: "conv2",
          participants: [
            {
              id: "mockUserId123",
              name: "Mock User",
              image: "https://placehold.co/40x40/ADD8E6/000000?text=MU",
            },
            {
              id: "user2",
              name: "Bob Williams",
              image: "https://placehold.co/40x40/FFB6C1/000000?text=BW",
            },
          ],
          messages: [
            {
              id: "msg3",
              senderId: "mockUserId123",
              content: "Hello Bob!",
              createdAt: new Date(Date.now() - 2400000).toISOString(),
            },
          ],
          lastMessage: "Hello Bob!",
          timestamp: new Date(Date.now() - 2400000).toISOString(),
          isNewChat: false,
          createdAt: new Date(Date.now() - 8000000).toISOString(),
          updatedAt: new Date(Date.now() - 2400000).toISOString(),
        },
        {
          id: "conv3",
          name: "Project Team",
          participants: [
            {
              id: "mockUserId123",
              name: "Mock User",
              image: "https://placehold.co/40x40/ADD8E6/000000?text=MU",
            },
            {
              id: "user1",
              name: "Alice Johnson",
              image: "https://placehold.co/40x40/ADD8E6/000000?text=AJ",
            },
            {
              id: "user2",
              name: "Bob Williams",
              image: "https://placehold.co/40x40/FFB6C1/000000?text=BW",
            },
            {
              id: "user3",
              name: "Charlie Brown",
              image: "https://placehold.co/40x40/FFD700/000000?text=CB",
            },
          ],
          messages: [
            {
              id: "msg4",
              senderId: "user3",
              content: "Team, update on the project.",
              createdAt: new Date(Date.now() - 600000).toISOString(),
            },
            {
              id: "msg5",
              senderId: "mockUserId123",
              content: "Got it!",
              createdAt: new Date(Date.now() - 300000).toISOString(),
            },
          ],
          lastMessage: "Got it!",
          timestamp: new Date(Date.now() - 300000).toISOString(),
          isNewChat: false,
          createdAt: new Date(Date.now() - 10000000).toISOString(),
          updatedAt: new Date(Date.now() - 300000).toISOString(),
        },
      ];

      const processedConversations = mockConversations.sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      });

      setConversations(processedConversations);
      return processedConversations;
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setError("Could not load conversations. Please try again.");
      return [];
    } finally {
      setLoadingConversations(false);
    }
  }, [session?.user?.id, status]); // Depend on session details

  // Effect to manage selected conversation after conversations state updates
  useEffect(() => {
    if (conversations.length > 0) {
      setSelectedConversation((prevSelected) => {
        let newSelected = null;
        if (prevSelected) {
          // Try to find the previously selected conversation in the updated list
          newSelected = conversations.find(
            (conv) => conv.id === prevSelected.id
          );
        }

        if (!newSelected) {
          // If no previous selection, or if it's no longer in the list,
          // select the first existing conversation (not 'new chat')
          // If there are no existing chats, select the first one overall.
          newSelected =
            conversations.find((conv) => !conv.isNewChat) || conversations[0];
        }
        return newSelected;
      });
    } else {
      setSelectedConversation(null); // No conversations, so deselect
    }
  }, [conversations]);

  // Effect for initial data fetch and Socket.IO setup
  useEffect(() => {
    // Only proceed if session is authenticated and user data is available
    if (status !== "authenticated" || !session?.user?.id || !session?.jwt) {
      console.warn(
        "ChatContext: Session not fully loaded or unauthenticated. Waiting..."
      );
      // If unauthenticated, redirect to login via router from context
      if (status === "unauthenticated") {
        router.push("/auth/login");
      }
      setLoadingConversations(true); // Keep loading true while waiting for full session
      return;
    }

    const currentUserId = session.user.id;
    const currentJwt = session.jwt;

    let isMounted = true; // Flag to prevent state updates on unmounted component

    const setupChat = async () => {
      // Fetch conversations first
      const fetchedConvs = await fetchConversations();

      if (!isMounted) return;

      // Initialize socket only if it's not already initialized
      if (!socketRef.current) {
        const socket = io(
          process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:3001",
          {
            auth: { token: currentJwt }, // Use currentJwt for auth
            query: { userId: currentUserId },
            transports: ["websocket"],
          }
        );
        socketRef.current = socket;

        socket.on("connect", () => {
          console.log("Connected to Socket.IO server:", socket.id);
          // After successful connection, join rooms for all existing conversations
          fetchedConvs
            .filter((c) => !c.isNewChat && !c.id.startsWith("potential-"))
            .forEach((conv) => {
              socket.emit("joinRoom", conv.id);
            });
        });

        socket.on("disconnect", () => {
          console.log("Disconnected from Socket.IO server");
        });

        socket.on("newMessage", (message) => {
          console.log("New message received from socket:", message);
          if (!isMounted) return; // Ensure component is still mounted

          setConversations((prevConversations) => {
            const conversationIndex = prevConversations.findIndex(
              (conv) => conv.id === message.conversationId
            );

            if (conversationIndex > -1) {
              const updatedConversations = [...prevConversations];
              const targetConv = { ...updatedConversations[conversationIndex] };

              const messageExistsInConv = targetConv.messages?.some(
                (msg) => msg.id === message.id
              );

              if (!messageExistsInConv) {
                targetConv.messages = [...(targetConv.messages || []), message];
              }

              targetConv.lastMessage = message.content;
              targetConv.timestamp = message.createdAt;

              // Move the updated conversation to the top
              updatedConversations.splice(conversationIndex, 1);
              updatedConversations.unshift(targetConv); // Add to the beginning

              return updatedConversations;
            } else {
              // If conversation does not exist locally (e.g., new convo started by someone else),
              // it means we need to re-fetch to get the full conversation data.
              console.warn(
                `Conversation ${message.conversationId} not found locally for new message. Re-fetching conversations.`
              );
              fetchConversations(); // Re-fetch all conversations to include the new one
              return prevConversations; // Return current state while re-fetch is in progress
            }
          });

          setSelectedConversation((prevSelected) => {
            if (!prevSelected || prevSelected.id !== message.conversationId)
              return prevSelected;

            const messageExists = prevSelected.messages?.some(
              (msg) => msg.id === message.id
            );

            if (messageExists) {
              // If a message with this ID already exists, it means our optimistic update is now confirmed by the server.
              return {
                ...prevSelected,
                lastMessage: message.content,
                timestamp: message.createdAt,
              };
            } else {
              // This is a new message (either from another user, or a new message from current user
              // whose optimistic update did NOT match the incoming ID, or a message that was missed).
              return {
                ...prevSelected,
                messages: [...(prevSelected.messages || []), message],
                lastMessage: message.content,
                timestamp: message.createdAt,
              };
            }
          });
        });

        socket.on("conversationUpdate", (updatedConvData) => {
          console.log(
            "Conversation update received from socket:",
            updatedConvData
          );
          if (!isMounted) return;

          setConversations((prevConversations) => {
            const index = prevConversations.findIndex(
              (c) => c.id === updatedConvData.id
            );
            if (index > -1) {
              // Update existing conversation
              const newConvs = [...prevConversations];
              newConvs[index] = {
                ...newConvs[index],
                ...updatedConvData,
                isNewChat: false,
              };
              return newConvs;
            } else {
              // Add new conversation if it doesn't exist (e.g., created by another user)
              return [
                { ...updatedConvData, isNewChat: false },
                ...prevConversations,
              ];
            }
          });

          // If the updated conversation is the currently selected one, update it as well
          setSelectedConversation((prevSelected) => {
            if (prevSelected && prevSelected.id === updatedConvData.id) {
              return { ...prevSelected, ...updatedConvData, isNewChat: false };
            }
            return prevSelected;
          });

          // Also re-join rooms if participants changed (important for group chats)
          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit("joinRoom", updatedConvData.id);
          }
        });

        socket.on("conversationDeleted", (deletedConversationIds) => {
          console.log(
            "Conversation(s) deleted from socket:",
            deletedConversationIds
          );
          if (!isMounted) return;

          const convIdsToDelete = Array.isArray(deletedConversationIds)
            ? deletedConversationIds
            : [deletedConversationIds];

          setConversations((prevConversations) =>
            prevConversations.filter(
              (conv) => !convIdsToDelete.includes(conv.id)
            )
          );

          setSelectedConversation((prevSelected) => {
            if (prevSelected && convIdsToDelete.includes(prevSelected.id)) {
              return null; // Deselect if the current one was deleted
            }
            return prevSelected;
          });
        });
      }
    };

    setupChat();

    // Cleanup function for Socket.IO on ChatProvider unmount
    return () => {
      isMounted = false; // Set flag to prevent state updates after unmount
      if (socketRef.current) {
        console.log("Disconnecting socket on ChatProvider unmount.");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [status, session?.user?.id, session?.jwt, fetchConversations, router]); // Dependencies for the useEffect

  // Value provided by the context to consuming components
  const contextValue = {
    conversations,
    setConversations, // Allow components to update conversations if necessary (e.g., creating a new one)
    selectedConversation,
    setSelectedConversation,
    loadingConversations,
    error,
    fetchConversations, // Allow components to trigger a re-fetch
    getParticipantNameAndImage, // Provide the helper
    socket: socketRef.current, // Provide the socket instance (will be null until connected)
  };

  return (
    <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
  );
}

// 3. Create a custom hook to easily consume the context
export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
