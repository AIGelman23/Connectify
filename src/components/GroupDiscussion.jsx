"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Comment } from "./Comment";
import { formatTimestamp } from "@/lib/utils";

const parseMarkdown = (text) => {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^> (.*$)/gm, "<blockquote class=\"border-l-4 border-gray-300 dark:border-slate-600 pl-4 italic my-2\">$1</blockquote>")
    .replace(/^- (.*$)/gm, "<li class=\"ml-4 list-disc\">$1</li>");
};

// Helper to upload file with progress tracking
const uploadFile = (file, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        onProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch (e) {
          reject(new Error('Failed to parse response'));
        }
      } else {
        reject(new Error('Upload failed'));
      }
    };

    xhr.onerror = () => reject(new Error('Upload failed'));

    const formData = new FormData();
    formData.append('file', file);
    xhr.send(formData);
  });
};

// Create Discussion Modal
function CreateDiscussionModal({ isOpen, onClose, onSubmit, isSubmitting, existingTitles = [] }) {
  const MAX_TITLE_LENGTH = 100;
  const MAX_BODY_LENGTH = 2000;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  // Media state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileType, setFileType] = useState("image"); // "image" or "video"
  const fileInputRef = useRef(null);

  // Poll state
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollDuration, setPollDuration] = useState(1);

  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setBody("");
      setError("");
      setSelectedFiles([]);
      setShowPollCreator(false);
      setPollOptions(["", ""]);
      setPollDuration(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      type: file.type,
      uploading: true,
      progress: 0,
      url: null,
      error: false
    }));

    if (fileType === 'video') {
      setSelectedFiles([newFiles[0]]);
      startUpload(newFiles[0]);
    } else {
      setSelectedFiles(prev => [...prev, ...newFiles]);
      newFiles.forEach(f => startUpload(f));
    }
  };

  const startUpload = (fileObj) => {
    uploadFile(fileObj.file, (progress) => {
      setSelectedFiles(prev => prev.map(item =>
        item.id === fileObj.id ? { ...item, progress } : item
      ));
    }).then(data => {
      setSelectedFiles(prev => prev.map(item =>
        item.id === fileObj.id ? { ...item, uploading: false, url: data.url } : item
      ));
    }).catch(err => {
      setSelectedFiles(prev => prev.map(item =>
        item.id === fileObj.id ? { ...item, uploading: false, error: true } : item
      ));
    });
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const openFileSelector = (type) => {
    setFileType(type);
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const handlePollOptionChange = (index, value) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const addPollOption = () => {
    if (pollOptions.length < 4) setPollOptions([...pollOptions, ""]);
  };

  const removePollOption = (index) => {
    if (pollOptions.length > 2) setPollOptions(pollOptions.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (existingTitles.some(t => t.toLowerCase() === title.trim().toLowerCase())) {
      setError("A discussion with this title already exists in this group.");
      return;
    }

    // Check if any files are still uploading
    if (selectedFiles.some(f => f.uploading)) {
      setError("Please wait for all files to finish uploading.");
      return;
    }

    const uploadedUrls = selectedFiles.map(f => f.url).filter(Boolean);
    const isVideo = selectedFiles[0]?.type?.startsWith('video');
    const validPollOptions = showPollCreator ? pollOptions.filter(o => o.trim()) : [];

    onSubmit({
      title: title.trim(),
      body: body.trim(),
      imageUrl: !isVideo && uploadedUrls[0] ? uploadedUrls[0] : null,
      imageUrls: !isVideo ? uploadedUrls : [],
      videoUrl: isVideo ? uploadedUrls[0] : null,
      pollOptions: validPollOptions,
      pollDuration: validPollOptions.length >= 2 ? pollDuration : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Start a Discussion</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (error) setError("");
                }}
                className={`w-full px-4 py-3 text-lg font-semibold bg-gray-50 dark:bg-slate-900 border ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20'} rounded-xl focus:outline-none focus:ring-2 transition-all text-gray-900 dark:text-white placeholder-gray-400`}
                maxLength={MAX_TITLE_LENGTH}
                required
                autoFocus
              />
              {error && (
                <p className="mt-1 text-xs text-red-500">{error}</p>
              )}
              {title.length > 0 && (
                <div className="flex justify-end mt-1">
                  <span className={`text-xs ${title.length >= MAX_TITLE_LENGTH ? 'text-red-500' : 'text-gray-400 dark:text-slate-500'}`}>
                    {title.length}/{MAX_TITLE_LENGTH}
                  </span>
                </div>
              )}
            </div>

            <div>
              <textarea
                placeholder="What's on your mind?"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white placeholder-gray-400 resize-none min-h-[120px]"
                rows={4}
                maxLength={MAX_BODY_LENGTH}
              />
              {body.length > 0 && (
                <div className="flex justify-end mt-1">
                  <span className={`text-xs ${body.length >= MAX_BODY_LENGTH ? 'text-red-500' : 'text-gray-400 dark:text-slate-500'}`}>
                    {body.length}/{MAX_BODY_LENGTH}
                  </span>
                </div>
              )}
            </div>

            {/* Media Preview */}
            {selectedFiles.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {selectedFiles.map((fileObj, index) => (
                  <div key={fileObj.id} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 group">
                    {fileObj.type.startsWith("video") ? (
                      <video src={fileObj.preview} className="w-full h-full object-cover" />
                    ) : (
                      <img src={fileObj.preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                    )}
                    {fileObj.uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className="text-white text-sm font-medium">{fileObj.progress}%</div>
                      </div>
                    )}
                    {fileObj.error && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-500/50">
                        <i className="fas fa-exclamation-triangle text-white text-xl"></i>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <i className="fas fa-times text-xs"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Poll Creator */}
            {showPollCreator && (
              <div className="space-y-2 p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Poll Options</span>
                  <button type="button" onClick={() => setShowPollCreator(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                {pollOptions.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handlePollOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    />
                    {pollOptions.length > 2 && (
                      <button type="button" onClick={() => removePollOption(index)} className="text-red-500 hover:text-red-700 p-1">
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 4 && (
                  <button type="button" onClick={addPollOption} className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                    <i className="fas fa-plus"></i> Add Option
                  </button>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <label className="text-xs text-gray-500 dark:text-slate-400">Duration:</label>
                  <select
                    value={pollDuration}
                    onChange={(e) => setPollDuration(Number(e.target.value))}
                    className="text-xs border border-gray-200 dark:border-slate-600 rounded-md p-1 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    <option value={1}>1 Day</option>
                    <option value={3}>3 Days</option>
                    <option value={7}>1 Week</option>
                  </select>
                </div>
              </div>
            )}

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept={fileType === "image" ? "image/*" : "video/*"}
              multiple={fileType === "image"}
              className="hidden"
            />

            {/* Add to your post */}
            <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-3 flex items-center justify-between shadow-sm bg-white dark:bg-slate-800">
              <span className="text-sm font-semibold text-gray-700 dark:text-slate-200 pl-2">Add to your post</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => openFileSelector("image")}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-green-500 transition-colors"
                  title="Photo"
                >
                  <i className="fas fa-image text-lg"></i>
                </button>
                <button
                  type="button"
                  onClick={() => openFileSelector("video")}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-blue-500 transition-colors"
                  title="Video"
                >
                  <i className="fas fa-video text-lg"></i>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPollCreator(!showPollCreator)}
                  className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-orange-500 transition-colors ${showPollCreator ? 'bg-orange-100 dark:bg-orange-900/30' : ''}`}
                  title="Poll"
                >
                  <i className="fas fa-poll text-lg"></i>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim() || isSubmitting || selectedFiles.some(f => f.uploading)}
                className="px-5 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <i className="fas fa-spinner fa-spin"></i> Posting...
                  </span>
                ) : "Post"}
              </button>
            </div>
          </form>
        </div>
      </div>
      <style jsx>{`
        @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .animate-fade-in {
            animation: fade-in 0.2s ease-out;
        }
        @keyframes scale-in {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
            animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

// Comment Section Component
function CommentSection({ discussionId, groupId }) {
  const { data: session } = useSession();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [discussionId]);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/discussions/${discussionId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error("Failed to fetch comments", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async (content, parentId = null) => {
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/discussions/${discussionId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parentId: parentId || null }),
      });

      if (res.ok) {
        // Refetch all comments to get proper nested structure
        await fetchComments();
        setNewComment("");
      }
    } catch (error) {
      console.error("Failed to post comment", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handlePostComment(newComment);
  };

  // Helper to format comments for the Comment component
  const getFormattedComment = (c) => {
    const replies = comments
      .filter((r) => r.parentId === c.id)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((r) => getFormattedComment(r));

    return {
      ...c,
      user: {
        id: c.author?.id,
        name: c.author?.name,
        imageUrl: c.author?.image || "/default-avatar.png",
      },
      content: c.content,
      likesCount: 0,
      likedByCurrentUser: false,
      replies: replies,
      createdAt: c.createdAt,
    };
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
      <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
        <img src={session?.user?.image || "/default-avatar.png"} alt="User" className="w-8 h-8 rounded-full" />
        <div className="flex-1">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white"
          />
        </div>
        <button type="submit" disabled={!newComment.trim() || submitting} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50">
          Post
        </button>
      </form>
      {loading ? (
        <div className="text-center py-4"><i className="fas fa-spinner fa-spin text-gray-400 dark:text-slate-500"></i></div>
      ) : (
        <div className="space-y-4">
          {comments
            .filter((c) => !c.parentId)
            .map((comment) => (
              <Comment
                key={comment.id}
                comment={getFormattedComment(comment)}
                onReply={(commentId, text, nestedParentId) => handlePostComment(text, nestedParentId || commentId)}
                onLike={() => { }}
                sessionUserId={session?.user?.id}
                currentUser={{
                  ...session?.user,
                  imageUrl: session?.user?.image || "/default-avatar.png",
                }}
                postId={discussionId}
              />
            ))}
        </div>
      )}
    </div>
  );
}

// Poll Component for Discussions
function DiscussionPoll({ discussionId, groupId, pollOptions: initialOptions, userPollVote: initialVote, expiresAt }) {
  const [pollOptions, setPollOptions] = useState(initialOptions || []);
  const [userVote, setUserVote] = useState(initialVote);
  const [isVoting, setIsVoting] = useState(false);

  const totalVotes = pollOptions.reduce((sum, opt) => sum + (opt.count || 0), 0);
  const isExpired = expiresAt && new Date() > new Date(expiresAt);

  const handleVote = async (optionId) => {
    if (isVoting || isExpired) return;
    setIsVoting(true);

    try {
      const res = await fetch(`/api/groups/${groupId}/discussions/${discussionId}/poll-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId }),
      });

      if (res.ok) {
        const data = await res.json();
        setPollOptions(data.pollOptions);
        setUserVote(data.userPollVote);
      }
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleRetractVote = async () => {
    if (isVoting || isExpired) return;
    setIsVoting(true);

    try {
      const res = await fetch(`/api/groups/${groupId}/discussions/${discussionId}/poll-vote`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const data = await res.json();
        setPollOptions(data.pollOptions);
        setUserVote(null);
      }
    } catch (error) {
      console.error('Error retracting vote:', error);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="mb-3 p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
      {pollOptions.map((option) => {
        const percentage = totalVotes > 0 ? Math.round((option.count / totalVotes) * 100) : 0;
        const isSelected = userVote === option.id;

        return (
          <button
            key={option.id}
            onClick={() => !userVote && handleVote(option.id)}
            disabled={isVoting || isExpired || !!userVote}
            className={`w-full mb-2 last:mb-0 relative overflow-hidden rounded-lg border transition-all ${isSelected
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-700'
              } ${!userVote && !isExpired ? 'cursor-pointer' : 'cursor-default'}`}
          >
            {/* Progress bar background */}
            {userVote && (
              <div
                className={`absolute inset-0 ${isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-slate-800'}`}
                style={{ width: `${percentage}%` }}
              />
            )}
            <div className="relative flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                {isSelected && <i className="fas fa-check-circle text-blue-500 text-sm"></i>}
                <span className={`text-sm font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-slate-200'}`}>
                  {option.text}
                </span>
              </div>
              {userVote && (
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                  {percentage}%
                </span>
              )}
            </div>
          </button>
        );
      })}

      <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-slate-400">
        <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
        {isExpired ? (
          <span className="text-red-500">Poll ended</span>
        ) : userVote ? (
          <button onClick={handleRetractVote} className="text-blue-600 hover:underline">
            Retract vote
          </button>
        ) : expiresAt ? (
          <span>Ends {new Date(expiresAt).toLocaleDateString()}</span>
        ) : null}
      </div>
    </div>
  );
}

// Discussion Thread Card
function DiscussionCard({ discussion, onVote, onDelete, onPin, currentUserId, groupId }) {
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isSaved, setIsSaved] = useState(discussion.isSaved || false);
  const isAuthor = discussion.author?.id === currentUserId;

  // Simplified like logic for FB style (using upvotes as likes)
  const isLiked = discussion.userVote === 'up';
  const likesCount = (discussion.upvotes || 0);

  const handleLike = () => {
    onVote(discussion.id, "up");
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const handleShare = () => {
    const url = `${window.location.origin}/groups/${groupId}?discussion=${discussion.id}`;
    navigator.clipboard.writeText(url);
    alert("Link copied to clipboard!");
  };

  const handleSave = async () => {
    const newStatus = !isSaved;
    setIsSaved(newStatus);
    try {
      const method = newStatus ? "POST" : "DELETE";
      await fetch(`/api/groups/${groupId}/discussions/${discussion.id}/save`, { method });
    } catch (err) {
      setIsSaved(!newStatus);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 mb-4">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <img
              src={discussion.author?.image || "/default-avatar.png"}
              alt={discussion.author?.name}
              className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-slate-600"
            />
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                {discussion.author?.name}
              </h4>
              <div className="flex items-center text-xs text-gray-500 dark:text-slate-400 gap-1 mt-0.5">
                <span>{formatTimeAgo(discussion.createdAt)}</span>
                {discussion.isPinned && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded text-[10px] font-medium">
                      <i className="fas fa-thumbtack transform rotate-45"></i> Pinned
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center">
            <button onClick={() => onPin(discussion.id)} className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${discussion.isPinned ? 'text-blue-600' : 'text-gray-500 dark:text-slate-400'}`} title={discussion.isPinned ? "Unpin" : "Pin"}>
              <i className="fas fa-thumbtack"></i>
            </button>
            {isAuthor && (
              <button onClick={() => onDelete(discussion.id)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                <i className="fas fa-trash-alt"></i>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="mb-3">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 leading-snug">
            {discussion.title}
          </h3>
          {discussion.body && (
            <div className="text-gray-800 dark:text-slate-200 text-sm leading-relaxed">
              {discussion.body.length > 300 ? (
                !expanded ? (
                  <>
                    <div
                      className="whitespace-pre-wrap break-words"
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(discussion.body.slice(0, 300) + "...") }}
                    />
                    <button
                      onClick={() => setExpanded(true)}
                      className="text-blue-600 dark:text-blue-400 font-medium mt-1 hover:underline"
                    >
                      Read more
                    </button>
                  </>
                ) : (
                  <>
                    <div
                      className="whitespace-pre-wrap break-words"
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(discussion.body) }}
                    />
                    <button
                      onClick={() => setExpanded(false)}
                      className="text-blue-600 dark:text-blue-400 font-medium mt-1 hover:underline"
                    >
                      Show less
                    </button>
                  </>
                )
              ) : (
                <div
                  className="whitespace-pre-wrap break-words"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(discussion.body) }}
                />
              )}
            </div>
          )}
        </div>

        {/* Media Display */}
        {(discussion.imageUrl || discussion.imageUrls?.length > 0 || discussion.videoUrl) && (
          <div className="mb-3 -mx-4">
            {discussion.videoUrl ? (
              <video src={discussion.videoUrl} controls className="w-full max-h-96 object-contain bg-black" />
            ) : discussion.imageUrls?.length > 1 ? (
              <div className={`grid gap-0.5 ${discussion.imageUrls.length === 2 ? 'grid-cols-2' : discussion.imageUrls.length === 3 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                {discussion.imageUrls.slice(0, 4).map((url, idx) => (
                  <div key={idx} className={`relative ${discussion.imageUrls.length === 3 && idx === 0 ? 'col-span-2' : ''}`}>
                    <img src={url} alt="" className={`w-full object-cover ${discussion.imageUrls.length === 3 && idx === 0 ? 'h-48' : 'h-36'}`} />
                    {idx === 3 && discussion.imageUrls.length > 4 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">+{discussion.imageUrls.length - 4}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <img src={discussion.imageUrl || discussion.imageUrls?.[0]} alt="" className="w-full max-h-96 object-contain" />
            )}
          </div>
        )}

        {/* Poll Display */}
        {discussion.pollOptions?.length > 0 && (
          <DiscussionPoll
            discussionId={discussion.id}
            groupId={groupId}
            pollOptions={discussion.pollOptions}
            userPollVote={discussion.userPollVote}
            expiresAt={discussion.expiresAt}
          />
        )}

        {/* Stats Bar */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 py-2 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-1">
            {likesCount > 0 && (
              <>
                <div className="bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px]">
                  <i className="fas fa-thumbs-up"></i>
                </div>
                <span>{likesCount}</span>
              </>
            )}
          </div>
          <div className="flex gap-3">
            <span>{discussion.commentsCount || 0} comments</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={handleLike}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors font-medium text-sm ${isLiked ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
          >
            <i className={`${isLiked ? 'fas' : 'far'} fa-thumbs-up`}></i>
            Like
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors font-medium text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            <i className="far fa-comment-alt"></i>
            Comment
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors font-medium text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            <i className="far fa-share-square"></i>
            Share
          </button>
        </div>

        {showComments && (
          <CommentSection discussionId={discussion.id} groupId={groupId} />
        )}
      </div>
    </div>
  );
}

// Main Component
export default function GroupDiscussion({ groupId, groupName }) {
  const { data: session } = useSession();
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState("new"); // "new", "top", "hot"
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Fetch discussions
  const fetchDiscussions = async (pageNum = 1) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setIsFetchingMore(true);
    }

    try {
      const queryParams = new URLSearchParams({
        sort: sortBy,
        page: pageNum,
        limit: 5,
      });
      if (searchQuery) {
        queryParams.append("search", searchQuery);
      }

      const res = await fetch(`/api/groups/${groupId}/discussions?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const newDiscussions = data.discussions || [];

        if (newDiscussions.length < 5) setHasMore(false);
        else setHasMore(true);

        if (pageNum === 1) {
          const sortedDiscussions = newDiscussions.sort((a, b) => {
            if (a.isPinned === b.isPinned) return 0;
            return a.isPinned ? -1 : 1;
          });
          setDiscussions(sortedDiscussions);
        } else {
          setDiscussions((prev) => [...prev, ...newDiscussions]);
        }
        setPage(pageNum);
      }
    } catch (err) {
      console.error("Error fetching discussions:", err);
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  };

  // Create discussion
  const handleCreateDiscussion = async ({ title, body, imageUrl, imageUrls, videoUrl, pollOptions, pollDuration }) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/discussions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, imageUrl, imageUrls, videoUrl, pollOptions, pollDuration }),
      });
      if (res.ok) {
        const data = await res.json();
        setDiscussions((prev) => [data.discussion, ...prev]);
        setShowCreateModal(false);
      } else {
        const data = await res.json();
        alert(data.message || "Failed to create discussion");
      }
    } catch (err) {
      console.error("Error creating discussion:", err);
      alert("Failed to create discussion");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Vote on discussion
  const handleVote = async (discussionId, voteType) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/discussions/${discussionId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteType }),
      });
      if (res.ok) {
        const data = await res.json();
        setDiscussions((prev) =>
          prev.map((d) =>
            d.id === discussionId
              ? { ...d, upvotes: data.upvotes, downvotes: data.downvotes, userVote: data.userVote }
              : d
          )
        );
      }
    } catch (err) {
      console.error("Error voting:", err);
    }
  };

  // Delete discussion
  const handleDelete = async (discussionId) => {
    if (!confirm("Are you sure you want to delete this discussion?")) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/discussions/${discussionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDiscussions((prev) => prev.filter((d) => d.id !== discussionId));
      }
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  // Pin discussion
  const handlePin = async (discussionId) => {
    setDiscussions((prev) => {
      const updated = prev.map((d) =>
        d.id === discussionId ? { ...d, isPinned: !d.isPinned } : d
      );
      return updated.sort((a, b) => {
        if (a.isPinned === b.isPinned) return 0;
        return a.isPinned ? -1 : 1;
      });
    });

    try {
      await fetch(`/api/groups/${groupId}/discussions/${discussionId}/pin`, {
        method: "POST",
      });
    } catch (err) {
      console.error("Error pinning:", err);
      fetchDiscussions();
    }
  };

  // Initial fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDiscussions(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [groupId, sortBy, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Create Discussion Trigger */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 mb-4">
        <div className="flex items-center gap-3">
          <img
            src={session?.user?.image || "/default-avatar.png"}
            alt="Your avatar"
            className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-slate-600"
          />
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 text-left px-4 py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-full text-gray-500 dark:text-slate-400 transition-colors text-sm sm:text-base"
          >
            Write something...
          </button>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 px-2">
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium">
            <i className="fas fa-video text-red-500"></i> Live Video
          </button>
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium">
            <i className="fas fa-image text-green-500"></i> Photo/Video
          </button>
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium">
            <i className="fas fa-poll text-orange-500"></i> Poll
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        {/* Search Bar */}
        <div className="relative flex-1 w-full sm:w-auto">
          <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500"></i>
          <input
            type="text"
            placeholder="Search discussions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-slate-400">Sort by:</span>
          {["new", "top", "hot"].map((option) => (
            <button
              key={option}
              onClick={() => {
                setSortBy(option);
              }}
              className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${sortBy === option
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                }`}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Discussions List */}
      {loading ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-8 text-center">
          <i className="fas fa-spinner fa-spin text-2xl text-gray-400 dark:text-slate-500"></i>
          <p className="mt-2 text-gray-500 dark:text-slate-400">Loading discussions...</p>
        </div>
      ) : discussions.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
            <i className="fas fa-comments text-2xl text-gray-400 dark:text-slate-500"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Discussions Yet
          </h3>
          <p className="text-gray-500 dark:text-slate-400 mb-4">
            Be the first to start a discussion in this group!
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Start Discussion
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {discussions.map((discussion) => (
            <DiscussionCard
              key={discussion.id}
              discussion={discussion}
              onVote={handleVote}
              onDelete={handleDelete}
              onPin={handlePin}
              currentUserId={session?.user?.id}
              groupId={groupId}
            />
          ))}
        </div>
      )}

      {/* Load More */}
      {!loading && hasMore && discussions.length > 0 && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => fetchDiscussions(page + 1)}
            disabled={isFetchingMore}
            className="px-6 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {isFetchingMore ? (
              <span className="flex items-center gap-2">
                <i className="fas fa-spinner fa-spin"></i> Loading...
              </span>
            ) : (
              "Load More"
            )}
          </button>
        </div>
      )}

      {/* Create Modal */}
      <CreateDiscussionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateDiscussion}
        isSubmitting={isSubmitting}
        existingTitles={discussions.map(d => d.title)}
      />
    </div>
  );
}
