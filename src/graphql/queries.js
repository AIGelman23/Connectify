// src/graphql/queries.js
import { gql } from '@apollo/client';

export const GET_FRIENDS = gql`
  query GetFriends($currentUserId: ID!) {
    myConnections(currentUserId: $currentUserId) {
      id
      name
      imageUrl
      isOnline
      mutualFriendsCount(targetUserId: $currentUserId)
      profile {
        profilePictureUrl
      }
    }
  }
`;