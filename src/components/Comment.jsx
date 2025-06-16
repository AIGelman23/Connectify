// import { useState } from "react";

// const Comment = ({ comment, sessionUserId, postId, onInlineReply = () => {} }) => {
//   const [showReplyInput, setShowReplyInput] = useState(false);
//   const [replyContent, setReplyContent] = useState("");

//   const handlePostReply = async () => {
//     if (replyContent.trim()) {
//       await onInlineReply(comment.id, replyContent);
//       setReplyContent("");
//       setShowReplyInput(false);
//     }
//   };

//   return (
//     <div className="bg-gray-50 p-2 rounded my-2">
//       {/* Comment Header */}
//       <div className="flex items-center space-x-2">
//         <img
//           src={comment.user.imageUrl || "https://placehold.co/32x32"}
//           alt={comment.user.name}
//           className="w-6 h-6 rounded-full"
//         />
//         <span className="text-sm font-semibold">{comment.user.name}</span>
//         <span className="text-xs text-gray-500">{comment.timestamp}</span>
//       </div>
//       {/* Comment Content */}
//       <p className="text-sm text-gray-800 mt-1">{comment.content}</p>
//       {/* Reply Toggle */}
//       <button
//         onClick={() => setShowReplyInput((prev) => !prev)}
//         className="text-xs text-blue-600 mt-1"
//       >
//         Reply
//       </button>
//       {/* Reply Input */}
//       {showReplyInput && (
//         <div className="mt-2">
//           <input
//             type="text"
//             placeholder="Write a reply..."
//             value={replyContent}
//             onChange={(e) => setReplyContent(e.target.value)}
//             className="w-full p-1 border border-gray-300 rounded"
//           />
//           <button
//             onClick={handlePostReply}
//             className="text-xs bg-blue-600 text-white px-2 py-1 rounded mt-1"
//           >
//             Post Reply
//           </button>
//         </div>
//       )}
//       {/* Nested Replies */}
//       {comment.replies && comment.replies.length > 0 && (
//         <div className="ml-4 mt-2">
//           {comment.replies.map((reply) => (
//             <Comment
//               key={reply.id}
//               comment={reply}
//               sessionUserId={sessionUserId}
//               postId={postId}
//               onInlineReply={onInlineReply}
//             />
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default Comment;

// src/components/CommentComponents.jsx
"use client";

import React from 'react';
import { formatTimestamp } from '../lib/utils'; // Assuming you move formatTimestamp here

export const Reply = ({ reply, sessionUserId, onDeleteReply, postId }) => {
	const isAuthor = reply.user.id === sessionUserId;
	return (
		<div className="flex items-start space-x-3">
			<img
				src={reply.user.imageUrl}
				alt={`${reply.user.name}'s avatar`}
				className="w-6 h-6 rounded-full object-cover border border-gray-200 flex-shrink-0"
			/>
			<div className="flex-1">
				<div className="bg-gray-50 rounded-xl px-3 py-1.5">
					<div className="flex items-baseline space-x-2">
						<span className="font-semibold text-gray-800 text-xs">{reply.user.name}</span>
						<span className="text-xs text-gray-500">{formatTimestamp(reply.createdAt)}</span> {/* Use formatTimestamp */}
						{isAuthor && <span className="text-xs text-indigo-500 font-medium ml-auto">Author</span>}
					</div>
					<p className="text-gray-700 text-sm mt-0.5">{reply.content}</p>
				</div>
				{isAuthor && (
					<div className="flex items-center space-x-3 mt-1 pl-2">
						<button
							onClick={() => onDeleteReply(reply.id, postId)}
							className="text-xs font-medium text-red-600 hover:underline"
						>
							Delete
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

export const Comment = ({ comment, onReply, sessionUserId, onDeleteComment, postId }) => {
	const isAuthor = comment.user.id === sessionUserId;
	return (
		<div className="flex items-start space-x-3 mb-4">
			<img
				src={comment.user.imageUrl}
				alt={`${comment.user.name}'s avatar`}
				className="w-8 h-8 rounded-full object-cover border border-gray-200 flex-shrink-0"
			/>
			<div className="flex-1">
				<div className="bg-gray-100 rounded-xl px-4 py-2">
					<div className="flex items-baseline space-x-2">
						<span className="font-semibold text-gray-800 text-sm">{comment.user.name}</span>
						<span className="text-xs text-gray-500">{formatTimestamp(comment.createdAt)}</span> {/* Use formatTimestamp */}
						{isAuthor && <span className="text-xs text-indigo-600 font-medium ml-auto">Author</span>}
					</div>
					<p className="text-gray-700 text-sm mt-1">{comment.content}</p>
				</div>
				<div className="flex items-center space-x-3 mt-1 pl-2">
					<button
						onClick={() => onReply(comment.id)}
						className="text-xs font-medium text-indigo-600 hover:underline"
					>
						Reply
					</button>
					{isAuthor && (
						<button
							onClick={() => onDeleteComment(comment.id, postId)}
							className="text-xs font-medium text-red-600 hover:underline"
						>
							Delete
						</button>
					)}
				</div>
				{comment.replies && comment.replies.length > 0 && (
					<div className="ml-8 mt-3 space-y-3 border-l-2 border-gray-200 pl-4">
						{comment.replies.map(reply => (
							<Reply
								key={reply.id}
								reply={reply}
								sessionUserId={sessionUserId}
								onDeleteReply={onDeleteComment} // Replies also use onDeleteComment, as it handles both
								postId={postId}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
};