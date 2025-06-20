import { useState, useEffect } from 'react';
import PostCard from './PostCard'; // Fixed import for PostCard component
import { formatTimestamp } from '@/lib/utils';

export default function Posts({ userId }) {
  const [posts, setPosts] = useState([]); // Initialize as empty array, not undefined
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPosts() {
      setLoading(true);
      setError(null);

      try {
        // Fetch posts based on userId if provided, otherwise fetch all posts
        const endpoint = userId ? `/api/posts?userId=${userId}` : '/api/posts';
        const response = await fetch(endpoint);

        if (!response.ok) {
          throw new Error(`Failed to fetch posts: ${response.status}`);
        }

        const data = await response.json();
        // Ensure posts is always an array, even if API returns null/undefined
        setPosts(Array.isArray(data.posts) ? data.posts : []);
      } catch (err) {
        console.error('Error loading posts:', err);
        setError('Error loading posts. Please try again later.');
        setPosts([]); // Reset to empty array on error
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
        <p>{error}</p>
        <button
          className="mt-2 text-sm underline"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  }

  // Safety check - ensure posts is an array before mapping
  if (!Array.isArray(posts) || posts.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <p className="text-gray-500">No posts to display.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard // Changed from Post to PostCard
          key={post.id}
          post={post}
          timestamp={formatTimestamp(post.createdAt)}
        />
      ))}
    </div>
  );
}
