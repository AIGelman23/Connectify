// src/schema.js
import gql from "graphql-tag";

export const typeDefs = gql`
  # ====================================================================
  # Enums: Mirroring your Prisma Enums
  # ====================================================================
  enum RequestStatus {
    PENDING
    ACCEPTED
    REJECTED
  }

  enum Role {
    USER
    ADMIN
  }

  enum NotificationType {
    CONNECTION_ACCEPTED
    POST_LIKE
    POST_COMMENT
    MESSAGE
    JOB_APPLICATION_VIEWED
    EVENT_INVITE
    # Add other notification types as needed
  }

  # ====================================================================
  # Core Types: Mirroring your Prisma Models
  # IMPORTANT: Only expose fields you want clients to access.
  # Add other fields from your Prisma models as you implement them.
  # ====================================================================

  type User {
    id: ID!
    name: String
    email: String!
    profile: Profile
    sentConnectionRequests: [ConnectionRequest!]!
    receivedConnectionRequests: [ConnectionRequest!]!
    connections: [User!]!
    mutualFriends(targetUserId: ID!): [User!]!
    mutualFriendsCount(targetUserId: ID!): Int!
    posts: [Post!]!
    comments: [Comment!]!
    notificationsReceived: [Notification!]!
    notificationsSent: [Notification!]!
    createdAt: String!
    imageUrl: String # Add this line.  Make it nullable if it can be empty
    isOnline: Boolean # Add this line.  Choose Boolean or another appropriate type
  }

  type Profile {
    id: ID!
    userId: ID! # The ID of the associated user
    user: User! # Direct relation to the User object
    bio: String
    headline: String
    location: String
    resumeUrl: String
    isProfileComplete: Boolean!
    profilePictureUrl: String
    coverPhotoUrl: String
    experiences: [Experience!]!
    education: [Education!]!
    skills: [Skill!]!
    createdAt: String!
    updatedAt: String!
  }

  type ConnectionRequest {
    id: ID!
    sender: User!
    senderId: ID!
    receiver: User!
    receiverId: ID!
    status: RequestStatus!
    createdAt: String!
    updatedAt: String!
  }

  type Message {
    id: ID!
    conversation: Conversation!
    conversationId: ID!
    sender: User!
    senderId: ID!
    content: String!
    createdAt: String!
  }

  type Conversation {
    id: ID!
    participants: [User!]!
    messages: [Message!]!
    createdAt: String!
    updatedAt: String!
  }

  type Skill {
    id: ID!
    name: String!
    profile: Profile # Nullable as per your schema
    profileId: ID
  }

  type Education {
    id: ID!
    profile: Profile!
    profileId: ID!
    degree: String!
    institution: String!
    fieldOfStudy: String
    startDate: String! # Use String for DateTime from GraphQL perspective, format as needed
    endDate: String
    description: String
    createdAt: String!
    updatedAt: String!
  }

  type Experience {
    id: ID!
    profile: Profile!
    profileId: ID!
    title: String!
    company: String!
    location: String
    startDate: String!
    endDate: String
    description: String
    isCurrent: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type Post {
    id: ID!
    content: String!
    authorId: ID!
    author: User!
    likesCount: Int!
    commentsCount: Int!
    createdAt: String!
    updatedAt: String!
    comments: [Comment!]!
  }

  type Comment {
    id: ID!
    content: String!
    author: User!
    authorId: ID!
    post: Post!
    postId: ID!
    likesCount: Int!
    createdAt: String!
    parentCommentId: ID
    parentComment: Comment
    replies: [Comment!]!
  }

  type Notification {
    id: ID!
    recipient: User!
    recipientId: ID!
    type: NotificationType!
    message: String!
    read: Boolean!
    sender: User
    senderId: ID
    targetId: ID
    createdAt: String!
  }

  # ====================================================================
  # Query Type: Entry points for reading data
  # ====================================================================
  type Query {
    users: [User!]!
    user(id: ID!): User
    connectionRequestsSent(userId: ID!): [ConnectionRequest!]!
    connectionRequestsReceived(userId: ID!): [ConnectionRequest!]!
    myConnections(currentUserId: ID!): [User!]! # Accepts currentUserId as argument
    nearbyUsers(city: String, currentUserId: ID): [User!]!
    posts(city: String): [Post!]!
    post(id: ID!): Post
    comments: [Comment!]!
    comment(id: ID!): Comment
    notifications(recipientId: ID!): [Notification!]!
    profile(userId: ID!): Profile
  }

  # ====================================================================
  # Mutation Type: Entry points for writing/modifying data
  # ====================================================================
  type Mutation {
    # Connection Mutations
    sendConnectionRequest(senderId: ID!, receiverId: ID!): ConnectionRequest!
    acceptConnectionRequest(requestId: ID!): ConnectionRequest!
    rejectConnectionRequest(requestId: ID!): ConnectionRequest!

    # User/Profile Mutations (examples)
    updateUserProfile(
      userId: ID!
      bio: String
      headline: String
      location: String
      resumeUrl: String
      profilePictureUrl: String
      coverPhotoUrl: String
    ): Profile!

    # Created User Mutation
    createUser(name: String, email: String!, hashedPassword: String): User!

    # Post Mutations
    createPost(authorId: ID!, content: String!): Post!
    updatePost(id: ID!, content: String!): Post!
    deletePost(id: ID!): Post!

    # Comment Mutations
    createComment(
      authorId: ID!
      postId: ID!
      content: String!
      parentCommentId: ID
    ): Comment!
    updateComment(id: ID!, content: String!): Comment!
    deleteComment(id: ID!): Comment!

    # Notification Mutations
    markNotificationAsRead(id: ID!): Notification!
  }
`;
