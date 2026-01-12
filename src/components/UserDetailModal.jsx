import React, { useState, useEffect } from 'react';

export default function UserDetailModal({ userId, onClose }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const fetchUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/users/${userId}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Failed to fetch user details');
        }
        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleBanToggle = async () => {
    if (!user) return;
    const newBanStatus = !user.isBanned;
    const confirmMessage = newBanStatus
      ? "Are you sure you want to BAN this user?"
      : "Are you sure you want to UNBAN this user?";

    if (!window.confirm(confirmMessage)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBanned: newBanStatus }),
      });

      if (!res.ok) throw new Error('Failed to update user status');

      setUser(prev => ({ ...prev, isBanned: newBanStatus }));
    } catch (err) {
      console.error(err);
      alert("Failed to update user status");
    }
  };

  // Helper to calculate badges based on user stats
  const getBadges = (u) => {
    const badges = [];

    // Role & Status Badges
    if (u.role === 'ADMIN') badges.push({ label: 'Admin', classes: 'bg-purple-100 text-purple-800', icon: 'fa-shield-alt' });
    if (u.isBanned) badges.push({ label: 'Banned', classes: 'bg-red-100 text-red-800', icon: 'fa-ban' });

    // Engagement Badges (Posts)
    const postCount = u._count?.posts || 0;
    if (postCount >= 50) badges.push({ label: 'Thought Leader', classes: 'bg-yellow-100 text-yellow-800', icon: 'fa-crown' });
    else if (postCount >= 10) badges.push({ label: 'Prolific', classes: 'bg-orange-100 text-orange-800', icon: 'fa-pen-nib' });
    else if (postCount >= 1) badges.push({ label: 'Contributor', classes: 'bg-blue-100 text-blue-800', icon: 'fa-pen' });

    // Engagement Badges (Comments)
    const commentCount = u._count?.comments || 0;
    if (commentCount >= 50) badges.push({ label: 'Community Pillar', classes: 'bg-pink-100 text-pink-800', icon: 'fa-heart' });
    else if (commentCount >= 10) badges.push({ label: 'Chatterbox', classes: 'bg-teal-100 text-teal-800', icon: 'fa-comments' });

    // Tenure Badge
    const daysJoined = Math.floor((new Date() - new Date(u.createdAt)) / (1000 * 60 * 60 * 24));
    if (daysJoined < 7) badges.push({ label: 'Newcomer', classes: 'bg-green-100 text-green-800', icon: 'fa-leaf' });
    else if (daysJoined > 365) badges.push({ label: 'Veteran', classes: 'bg-indigo-100 text-indigo-800', icon: 'fa-medal' });

    return badges;
  };

  if (!userId) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-gray-900">User Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <span className="sr-only">Close</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {loading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm text-center">
              {error}
            </div>
          )}

          {user && !loading && (
            <div className="space-y-6">
              <div className="flex flex-col items-center">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name}
                    className="h-24 w-24 rounded-full object-cover border-4 border-gray-100"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-bold border-4 border-gray-100">
                    {user.name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <h3 className="mt-3 text-xl font-semibold text-gray-900">
                  {user.name}
                </h3>
                <p className="text-gray-500">{user.email}</p>

                {/* Badges Section */}
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {getBadges(user).map((badge, index) => (
                    <span
                      key={index}
                      className={`px-2 py-1 text-xs font-semibold rounded-full flex items-center gap-1 ${badge.classes}`}
                      title={badge.label}
                    >
                      {badge.icon && <i className={`fas ${badge.icon}`}></i>}
                      {badge.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Joined
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      User ID
                    </dt>
                    <dd className="mt-1 text-xs text-gray-500 truncate" title={user.id}>
                      {user.id}
                    </dd>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Posts
                    </dt>
                    <dd className="mt-1 text-2xl font-semibold text-gray-900">
                      {user._count?.posts || 0}
                    </dd>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comments
                    </dt>
                    <dd className="mt-1 text-2xl font-semibold text-gray-900">
                      {user._count?.comments || 0}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>
        <div className="bg-gray-50 px-6 py-4 flex justify-end rounded-b-lg gap-2">
          {user && !loading && (
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${user.isBanned
                ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                }`}
              onClick={handleBanToggle}
            >
              {user.isBanned ? 'Unban User' : 'Ban User'}
            </button>
          )}
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}