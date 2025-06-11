import React from "react";

// FriendCard renders one friend; adjust styling as desired.
const FriendCard = ({ friend, onConnect }) => (
  <div className="bg-white shadow rounded-lg p-4 border border-gray-200 flex items-center justify-between">
    <div className="flex items-center">
      <img
        src={friend.imageUrl}
        alt={friend.name}
        className="w-12 h-12 rounded-full object-cover mr-4 border-2 border-indigo-300"
      />
      <div>
        <h3 className="text-base font-semibold text-gray-900 truncate">{friend.name}</h3>
        <p className="text-sm text-gray-600 truncate">{friend.headline}</p>
      </div>
    </div>
    {onConnect && (
      <button
        onClick={() => onConnect(friend.id)}
        className="px-4 py-1.5 bg-indigo-600 text-white font-medium rounded-full hover:bg-indigo-700 transition text-sm"
      >
        Connect
      </button>
    )}
  </div>
);

export default function FriendsList({ acceptedFriends, suggestedFriends, onConnect }) {
  return (
    <div className="space-y-8">
      {acceptedFriends?.length > 0 && (
        <div className="bg-white shadow rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">
            Friends ({acceptedFriends.length})
          </h2>
          <div className="space-y-4">
            {acceptedFriends.map(friend => (
              <FriendCard key={friend.id} friend={friend} />
            ))}
          </div>
        </div>
      )}
      {suggestedFriends?.length > 0 && (
        <div className="bg-white shadow rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">
            People You May Know ({suggestedFriends.length})
          </h2>
          <div className="space-y-4">
            {suggestedFriends.map(friend => (
              <FriendCard key={friend.id} friend={friend} onConnect={onConnect} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
