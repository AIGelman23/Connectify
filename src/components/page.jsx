"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import CreatePostCard from '@/components/CreatePostCard';
import PostCard from '@/components/PostCard';
import { formatTimestamp } from '@/lib/utils';
import Link from 'next/link';
import EditGroupModal from '@/components/EditGroupModal';
import CreateEventModal from '@/components/CreateEventModal';

export default function GroupDetailsPage() {
  const { groupId } = useParams();
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('posts');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);

  // Fetch Group Details
  const { data: group, isLoading: isGroupLoading, error: groupError } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${groupId}`);
      if (!res.ok) throw new Error('Failed to fetch group details');
      return res.json();
    }
  });

  // Fetch Group Posts
  const { data: postsData, isLoading: isPostsLoading } = useQuery({
    queryKey: ['group-posts', groupId],
    queryFn: async () => {
      const res = await fetch(`/api/posts?groupId=${groupId}`);
      if (!res.ok) throw new Error('Failed to fetch group posts');
      return res.json();
    },
    enabled: !!groupId && activeTab === 'posts'
  });

  // Fetch Group Members
  const { data: members = [], isLoading: isMembersLoading } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${groupId}/members?status=APPROVED`);
      if (!res.ok) throw new Error('Failed to fetch group members');
      return res.json();
    },
    enabled: !!groupId && activeTab === 'members'
  });

  // Fetch Pending Requests
  const { data: pendingMembers = [], isLoading: isPendingLoading } = useQuery({
    queryKey: ['group-requests', groupId],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${groupId}/members?status=PENDING`);
      if (!res.ok) throw new Error('Failed to fetch requests');
      return res.json();
    },
    enabled: !!groupId && activeTab === 'requests' && group?.userRole === 'ADMIN'
  });

  // Fetch Group Events
  const { data: events = [], isLoading: isEventsLoading } = useQuery({
    queryKey: ['group-events', groupId],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${groupId}/events`);
      if (!res.ok) throw new Error('Failed to fetch group events');
      return res.json();
    },
    enabled: !!groupId && activeTab === 'events'
  });

  // Fetch Group Discussions
  const { data: discussionsData, isLoading: isDiscussionsLoading } = useQuery({
    queryKey: ['group-discussions', groupId],
    queryFn: async () => {
      const res = await fetch(`/api/posts?groupId=${groupId}&type=discussion`);
      if (!res.ok) throw new Error('Failed to fetch group discussions');
      return res.json();
    },
    enabled: !!groupId && activeTab === 'discussions'
  });

  const joinGroupMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, action: 'join' }),
      });
      if (!res.ok) throw new Error('Failed to join group');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['group', groupId]);
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId) => {
      const res = await fetch(`/api/groups/${groupId}/members?userId=${userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove member');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['group-members', groupId]);
      queryClient.invalidateQueries(['group', groupId]);
      queryClient.invalidateQueries(['group-requests', groupId]);
    }
  });

  const promoteMemberMutation = useMutation({
    mutationFn: async (userId) => {
      const res = await fetch(`/api/groups/${groupId}/members?userId=${userId}`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed to promote member');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['group-members', groupId]);
    }
  });

  const approveMemberMutation = useMutation({
    mutationFn: async (userId) => {
      const res = await fetch(`/api/groups/${groupId}/members?userId=${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      if (!res.ok) throw new Error('Failed to approve member');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['group-requests', groupId]);
      queryClient.invalidateQueries(['group-members', groupId]);
      queryClient.invalidateQueries(['group', groupId]);
    }
  });

  const updateGroupMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update group');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['group', groupId]);
      setShowEditModal(false);
    }
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData) => {
      const res = await fetch(`/api/groups/${groupId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
      if (!res.ok) throw new Error('Failed to create event');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['group-events', groupId]);
      setShowCreateEventModal(false);
    }
  });

  if (isGroupLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (groupError || !group) {
    return <div className="text-center py-12 text-red-500">Group not found.</div>;
  }

  const posts = postsData?.posts || [];
  const discussions = discussionsData?.posts || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Group Header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden mb-6">
        <div className="h-48 bg-gradient-to-r from-blue-500 to-indigo-600 relative">
          {group.coverImage && (
            <img src={group.coverImage} alt={group.name} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{group.name}</h1>
              <p className="text-gray-500 dark:text-slate-400 mb-4">
                {group.privacy} Group · {group.memberCount.toLocaleString()} members
              </p>
              <p className="text-gray-700 dark:text-slate-300">{group.description}</p>
            </div>
            <div>
              {!group.isMember ? (
                <button
                  onClick={() => joinGroupMutation.mutate()}
                  disabled={joinGroupMutation.isPending}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  {joinGroupMutation.isPending ? 'Joining...' : 'Join Group'}
                </button>
              ) : (
                <div className="flex gap-2 items-center">
                  {group.userRole === 'ADMIN' && (
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 font-medium rounded-lg transition-colors"
                    >
                      Edit Group
                    </button>
                  )}
                  <span className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-medium rounded-lg">
                    Member
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-700 mb-6">
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'posts'
            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
            }`}
        >
          Posts
        </button>
        <button
          onClick={() => setActiveTab('discussions')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'discussions'
            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
            }`}
        >
          Discussions
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'members'
            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
            }`}
        >
          Members
        </button>
        {group.userRole === 'ADMIN' && (
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'requests'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
              }`}
          >
            Requests
            {pendingMembers.length > 0 && <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingMembers.length}</span>}
          </button>
        )}
        <button
          onClick={() => setActiveTab('events')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'events'
            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
            }`}
        >
          Events
        </button>
      </div>

      {activeTab === 'posts' && (
        <>
          {/* Create Post (Only for members) */}
          {group.isMember && <CreatePostCard groupId={groupId} />}

          {/* Group Feed */}
          <div className="space-y-4">
            {isPostsLoading ? (
              <div className="text-center py-8 text-gray-500 dark:text-slate-400">Loading posts...</div>
            ) : posts.length > 0 ? (
              posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  sessionUserId={session?.user?.id}
                />
              ))
            ) : (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                <p className="text-gray-500 dark:text-slate-400">No posts yet. Be the first to post!</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'discussions' && (
        <>
          {/* Create Discussion (Only for members) */}
          {group.isMember && <CreatePostCard groupId={groupId} postType="discussion" placeholder="Start a discussion..." />}

          {/* Discussions Feed */}
          <div className="space-y-4">
            {isDiscussionsLoading ? (
              <div className="text-center py-8 text-gray-500 dark:text-slate-400">Loading discussions...</div>
            ) : discussions.length > 0 ? (
              discussions.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  sessionUserId={session?.user?.id}
                />
              ))
            ) : (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                <p className="text-gray-500 dark:text-slate-400">No discussions yet. Start a new topic!</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'members' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          {isMembersLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-slate-400">Loading members...</div>
          ) : members.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {members.map(member => (
                <div key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <Link href={`/profile/${member.id}`} className="flex items-center gap-3">
                    <img
                      src={member.imageUrl || `https://placehold.co/40x40/A78BFA/ffffff?text=${member.name ? member.name[0].toUpperCase() : 'U'}`}
                      alt={member.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{member.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">{member.role.toLowerCase()}</p>
                    </div>
                  </Link>
                  {group?.userRole === 'ADMIN' && member.id !== session?.user?.id && (
                    <div className="flex gap-2">
                      {member.role !== 'ADMIN' && (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to promote ${member.name} to admin?`)) {
                              promoteMemberMutation.mutate(member.id);
                            }
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          Promote
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to remove ${member.name} from the group?`)) {
                            removeMemberMutation.mutate(member.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-slate-400">No members found.</div>
          )}
        </div>
      )}

      {activeTab === 'requests' && group.userRole === 'ADMIN' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          {isPendingLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-slate-400">Loading requests...</div>
          ) : pendingMembers.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {pendingMembers.map(member => (
                <div key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <Link href={`/profile/${member.id}`} className="flex items-center gap-3">
                    <img
                      src={member.imageUrl || `https://placehold.co/40x40/A78BFA/ffffff?text=${member.name ? member.name[0].toUpperCase() : 'U'}`}
                      alt={member.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{member.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400">Requested to join</p>
                    </div>
                  </Link>
                  <div className="flex gap-2">
                    <button onClick={() => approveMemberMutation.mutate(member.id)} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">Approve</button>
                    <button onClick={() => removeMemberMutation.mutate(member.id)} className="px-4 py-1.5 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 text-sm font-medium rounded-lg transition-colors">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-slate-400">No pending requests.</div>
          )}
        </div>
      )}

      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Upcoming Events</h2>
            {group.isMember && (
              <button onClick={() => setShowCreateEventModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                Create Event
              </button>
            )}
          </div>
          {isEventsLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-slate-400">Loading events...</div>
          ) : events.length > 0 ? (
            <div className="grid gap-4">
              {events.map(event => (
                <div key={event.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">{event.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mb-1 mt-1">
                        <i className="fas fa-calendar-alt"></i>
                        <span>{new Date(event.startTime).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300 mb-2">
                        <i className="fas fa-map-marker-alt"></i>
                        <span>{event.location}</span>
                      </div>
                      <p className="text-gray-500 dark:text-slate-400 text-sm">{event.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
              No upcoming events.
            </div>
          )}
        </div>
      )}

      <EditGroupModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onUpdate={(data) => updateGroupMutation.mutate(data)}
        group={group}
      />
      <CreateEventModal
        isOpen={showCreateEventModal}
        onClose={() => setShowCreateEventModal(false)}
        onCreate={(data) => createEventMutation.mutate(data)}
      />
    </div>
  );
}