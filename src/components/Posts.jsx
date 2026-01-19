import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import PostCard from './PostCard';
import { formatTimestamp } from '@/lib/utils';

export default function Posts({ userId, type }) {
  const { data: session } = useSession();
  const [selectedPost, setSelectedPost] = useState(null);

  // Use react-query to fetch posts - this allows PostCard's invalidateQueries to trigger refetch
  const { data: posts = [], isLoading, error, refetch } = useQuery({
    queryKey: ['posts', { userId, type }],
    queryFn: async () => {
      let endpoint = userId ? `/api/posts?userId=${userId}` : '/api/posts';
      if (type) {
        endpoint += (endpoint.includes('?') ? '&' : '?') + `type=${type}`;
      }

      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`Failed to fetch posts: ${response.status}`);
      }

      const data = await response.json();
      return Array.isArray(data.posts) ? data.posts : [];
    },
    staleTime: 1000 * 60, // 1 minute
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
        <p>Error loading posts. Please try again later.</p>
        <button
          className="mt-2 text-sm underline"
          onClick={() => refetch()}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!Array.isArray(posts) || posts.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-6 text-center">
        <p className="text-gray-500 dark:text-slate-400">No posts to display.</p>
      </div>
    );
  }

  if (type === 'photos' || type === 'videos') {
    return (
      <>
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {posts.map((post) => (
            <div
              key={post.id}
              className="relative aspect-square bg-gray-100 dark:bg-slate-700 overflow-hidden group rounded-md cursor-pointer"
              onClick={() => setSelectedPost(post)}
            >
              {type === 'photos' ? (
                <img
                  src={post.imageUrl}
                  alt="Post"
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
              ) : (
                <video
                  src={post.videoUrl}
                  className="w-full h-full object-cover"
                />
              )}
              {type === 'videos' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center pl-1 shadow-lg">
                    <i className="fas fa-play text-gray-900 text-sm"></i>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
            </div>
          ))}
        </div>

        {/* Modal for Full Post View */}
        {selectedPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedPost(null)}>
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <PostCard
                post={selectedPost}
                sessionUserId={session?.user?.id}
              />
            </div>
            <button
              className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl transition-colors"
              onClick={() => setSelectedPost(null)}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          sessionUserId={session?.user?.id}
          timestamp={formatTimestamp(post.createdAt)}
        />
      ))}
    </div>
  );
}
