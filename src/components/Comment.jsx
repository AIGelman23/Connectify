import { useState } from "react";

const Comment = ({ comment, sessionUserId, postId, onInlineReply = () => {} }) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState("");

  const handlePostReply = async () => {
    if (replyContent.trim()) {
      await onInlineReply(comment.id, replyContent);
      setReplyContent("");
      setShowReplyInput(false);
    }
  };

  return (
    <div className="bg-gray-50 p-2 rounded my-2">
      {/* Comment Header */}
      <div className="flex items-center space-x-2">
        <img
          src={comment.user.imageUrl || "https://placehold.co/32x32"}
          alt={comment.user.name}
          className="w-6 h-6 rounded-full"
        />
        <span className="text-sm font-semibold">{comment.user.name}</span>
        <span className="text-xs text-gray-500">{comment.timestamp}</span>
      </div>
      {/* Comment Content */}
      <p className="text-sm text-gray-800 mt-1">{comment.content}</p>
      {/* Reply Toggle */}
      <button
        onClick={() => setShowReplyInput((prev) => !prev)}
        className="text-xs text-blue-600 mt-1"
      >
        Reply
      </button>
      {/* Reply Input */}
      {showReplyInput && (
        <div className="mt-2">
          <input
            type="text"
            placeholder="Write a reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="w-full p-1 border border-gray-300 rounded"
          />
          <button
            onClick={handlePostReply}
            className="text-xs bg-blue-600 text-white px-2 py-1 rounded mt-1"
          >
            Post Reply
          </button>
        </div>
      )}
      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-4 mt-2">
          {comment.replies.map((reply) => (
            <Comment
              key={reply.id}
              comment={reply}
              sessionUserId={sessionUserId}
              postId={postId}
              onInlineReply={onInlineReply}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Comment;