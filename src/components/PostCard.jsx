// components/PostCard.jsx
"use client";

import { useState, useCallback } from "react";
// Import Comment component
import Comment from './Comment' // Assuming Comment component is in its own file

const PostCard = ({ post, session, sessionUserId, onLike, onAddComment, onReply, onInlineReply = () => { } }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState("");

  const handleToggleComments = () => {
    setShowComments(prev => !prev);
    setCommentInput(""); // Clear input when collapsing
  };

  const handlePostComment = async () => {
    if (commentInput.trim()) {
      await onAddComment(post.id, commentInput);
      setCommentInput("");
      setShowComments(true);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm mb-4 py-3 px-4">
      {/* Post Header */}
      <div className="flex items-center mb-2">
        <img
          src={post.user.imageUrl}
          alt={`${post.user.name}'s avatar`}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="ml-3">
          <p className="font-bold text-gray-800 text-base">{post.user.name}</p>
          <p className="text-xs text-gray-500">{post.user.headline} • {post.timestamp}</p>
        </div>
      </div>

      {/* Post Content */}
      <div className="mb-3">
        <p className="text-gray-800 text-base">{post.content}</p>
        {/* ...existing media rendering if any... */}
      </div>

      {/* Post Stats */}
      <div className="flex justify-between items-center text-xs text-gray-600 border-t border-b border-gray-200 py-2 mb-2">
        <span>{post.likesCount || 0} Likes</span>
        <span>{post.commentsCount || 0} Comments</span>
      </div>

      {/* Post Actions */}
      <div className="flex justify-around items-center mb-2">
        <button
          onClick={() => onLike(post.id)}
          className="flex items-center space-x-1 px-3 py-1 rounded hover:bg-blue-100 transition text-gray-700"
        >
          <i className="far fa-thumbs-up"></i>
          <span className="text-sm font-semibold">Like</span>
        </button>
        <button
          onClick={handleToggleComments}
          className="flex items-center space-x-1 px-3 py-1 rounded hover:bg-blue-100 transition text-gray-700"
        >
          <i className="far fa-comment"></i>
          <span className="text-sm font-semibold">Comment</span>
        </button>
        <button className="flex items-center space-x-1 px-3 py-1 rounded hover:bg-blue-100 transition text-gray-700">
          <i className="far fa-share-square"></i>
          <span className="text-sm font-semibold">Share</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-3 border-t pt-3">
          {/* Comment Input */}
          <div className="flex items-center space-x-3 mb-3">
            <img
              // Use the session for profile pic, with fallback if not present
              src={session?.user?.image || `https://placehold.co/32x32/A78BFA/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'}`}
              alt="Your avatar"
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Write a comment..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter') handlePostComment(); }}
                className="w-full pl-4 pr-10 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-300 text-sm"
              />
              <button
                onClick={handlePostComment}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800 transition p-1"
                aria-label="Post comment"
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>

          {/* Display Comments */}
          {post.comments && post.comments.length > 0 ? (
            post.comments.map(comment => (
              <Comment
                key={comment.id}
                comment={comment}
                sessionUserId={sessionUserId}
                postId={post.id} // NEW: Pass postId for nested replies
                onInlineReply={(commentId, replyText) => onInlineReply(post.id, commentId, replyText)}
              />
            ))
          ) : (
            <p className="text-center text-xs text-gray-500">No comments yet. Be the first to comment!</p>
          )}
        </div>
      )}
    </div>
  );
};

export default PostCard;